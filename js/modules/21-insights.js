// ==========================================================================
// grsds · 21-insights.js — 数据分析（系统内实时分析页）
// 按纷享销客「五层循环增长」+ Salesforce 收入情报口径，实时计算并展示：
//   核心结论 / 五层增长漏斗 / 销售漏斗 / 客户分层 / 数据质量 / 标讯市场 / 大厂对标
// 数据源：客户与联系人复用 04 的会话缓存；订单用 07 的 allOrders（金额已解密进 _amount）；
//         线索池单独分批读取并缓存。图表全部为前端生成的 SVG，不依赖 Chart.js。
// ==========================================================================
var _insCache = { at: 0, leads: null, sig: '' };
var INS_CACHE_TTL = 5 * 60 * 1000;
var _insBusy = false;
var _insData = null;

function insNum(v) { var n = parseFloat(String(v == null ? '' : v).replace(/[^\d.\-]/g, '')); return isFinite(n) ? n : 0; }
function insPct(a, b) { return b > 0 ? Math.round(a * 1000 / b) / 10 : 0; }
function insSum(arr) { var s = 0; for (var i = 0; i < arr.length; i++) s += arr[i] || 0; return s; }
function insUniq(arr) {
  var m = {}, out = [];
  for (var i = 0; i < arr.length; i++) { var k = arr[i]; if (k && !m[k]) { m[k] = 1; out.push(k); } }
  return out;
}
function insTally(arr, fn) {
  var m = {};
  for (var i = 0; i < arr.length; i++) {
    var k = fn(arr[i]); if (k === undefined || k === null || k === '') k = '(空)';
    k = String(k); m[k] = (m[k] || 0) + 1;
  }
  var out = []; for (var k2 in m) out.push([k2, m[k2]]);
  return out.sort(function (a, b) { return b[1] - a[1]; });
}
function insParse(s) { try { var v = JSON.parse(s || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function insEsc(v) { return typeof h === 'function' ? h(v) : String(v == null ? '' : v); }
function insMonth(arr, field, tail) {
  var m = {};
  for (var i = 0; i < arr.length; i++) {
    var k = String(arr[i][field] || '').slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(k)) m[k] = (m[k] || 0) + 1;
  }
  var out = []; for (var k in m) out.push([k, m[k]]);
  out.sort(function (a, b) { return a[0].localeCompare(b[0]); });
  return tail ? out.slice(-tail) : out;
}
function insMoney(v) {
  v = insNum(v);
  if (Math.abs(v) >= 1e8) return (v / 1e8).toFixed(2) + ' 亿';
  if (Math.abs(v) >= 1e4) return (v / 1e4).toFixed(1) + ' 万';
  return Math.round(v).toLocaleString('zh-CN');
}
function insComma(n) { return (n == null ? 0 : n).toLocaleString('zh-CN'); }

// 线索池只读必要字段，分批拉（PostgREST 单次上限 1000 行）
async function insightsFetchLeads() {
  var cols = 'id,status,review_status,assigned_to,converted_client_id,auto_fetched,last_follow_up,created_at,source,source_site,win_bidder,win_amount,project_name';
  var out = [], off = 0, size = 1000;
  for (;;) {
    var r = await sb.from('lead_pool').select(cols).eq('company_id', currentCompanyId).order('id').range(off, off + size - 1);
    if (r.error) throw r.error;
    var rows = r.data || [];
    out = out.concat(rows);
    if (rows.length < size) break;
    off += size;
  }
  return out;
}
function insightsSig() {
  var cl = allClients || [], or = allOrders || [];
  return cl.length + '/' + or.length + '/' + String(cl.length ? (cl[0].updated_at || cl[0].id || '') : '');
}

// force=true 时跳过缓存（点「刷新数据」）
async function insightsLoad(force) {
  if (_insBusy) return _insData;
  _insBusy = true;
  var box = document.getElementById('ins-body');
  try {
    // 客户/联系人/订单走 04 的缓存通道，切页秒开
    if (!allClients || !allClients.length) {
      if (typeof loadClients === 'function') await loadClients({ cache: true });
    }
    // 客户页可能还没访问过：订单必须在计算前就绪，否则「客户→订单」会误算成 0
    if ((!allOrders || !allOrders.length) && typeof loadOrders === 'function') {
      await loadOrders().catch(function (e) { console.warn('[insights] loadOrders failed:', e); });
    }
    var sig = insightsSig();
    if (!force && _insCache.leads && Date.now() - _insCache.at < INS_CACHE_TTL && _insCache.sig === sig) {
      return (_insData = insightsCompute(_insCache.leads));
    }
    if (box) box.innerHTML = '<div class="ins-loading">正在汇总分析数据…</div>';
    var leads = await insightsFetchLeads();
    _insCache = { at: Date.now(), leads: leads, sig: sig };
    return (_insData = insightsCompute(leads));
  } catch (e) {
    console.error('[insights] load failed:', e);
    if (box) box.innerHTML = '<div class="ins-loading" style="color:var(--danger,#F87171)">分析数据加载失败：' + insEsc(e && e.message || e) + '</div>';
    return null;
  } finally { _insBusy = false; }
}

function insightsCompute(leads) {
  var clients = (allClients || []).filter(function (c) { return c && !c.deleted_at; });
  var contacts = (allContacts || []).filter(function (c) { return !c && false ? false : !c.deleted_at; });
  var orders = allOrders || [];
  var L = leads || [];
  var out = { at: Date.now() };

  out.scale = { clients: clients.length, contacts: contacts.length, orders: orders.length, leads: L.length };

  // ── 五层循环增长 ──
  var qualified = L.filter(function (l) { return l.review_status === 'approved' || !l.review_status; });
  var converted = L.filter(function (l) { return l.converted_client_id; });
  var followed = L.filter(function (l) { return l.last_follow_up; });
  function isClosed(o) { return !!(o.won_date || /已关闭|已取消|赢单|输单/.test(o.stage || '')); }
  var closed = orders.filter(isClosed), won = orders.filter(function (o) { return !!o.won_date; });
  var lost = closed.filter(function (o) { return !o.won_date; });
  var openOrders = orders.filter(function (o) { return !isClosed(o); });
  var clientIds = insUniq(orders.map(function (o) { return o.client_id; }));
  var repeatOrders = clientIds.filter(function (id) { return orders.filter(function (o) { return o.client_id === id; }).length > 1; });

  var yearsByClient = {};
  for (var ci = 0; ci < clients.length; ci++) {
    var ps = insParse(clients[ci].projects);
    var ys = insUniq(ps.map(function (p) { return String(p.bidding_date || '').slice(0, 4); }).filter(Boolean));
    if (ys.length) yearsByClient[clients[ci].id] = ys;
  }
  var repeatProj = 0;
  for (var k in yearsByClient) if (yearsByClient[k].length > 1) repeatProj++;

  out.funnel = {
    layers: [
      { name: '被看见', value: L.length, unit: '条线索', note: insUniq(L.map(function (l) { return l.source; })).length + ' 个来源渠道，AI 采集 ' + insPct(L.filter(function (l) { return l.auto_fetched; }).length, L.length) + '%' },
      { name: '被识别', value: qualified.length, unit: '条审核通过', note: '审核通过率 ' + insPct(qualified.length, L.length) + '%' },
      { name: '被跟进', value: followed.length, unit: '条有跟进记录', note: '跟进覆盖率 ' + insPct(followed.length, L.length) + '%（大厂建议 ≥80%）' },
      { name: '被成交', value: won.length, unit: '单赢单', note: '赢单率 ' + insPct(won.length, closed.length) + '%（Won/(Won+Lost)）' },
      { name: '被循环', value: repeatProj, unit: '家跨年复购甲方', note: '跨年复购率 ' + insPct(repeatProj, Object.keys(yearsByClient).length) + '%' }
    ],
    leadToClient: insPct(converted.length, L.length),
    clientToOrder: insPct(clientIds.length, clients.length), clientToOrderN: clientIds.length,
    orderToWon: insPct(won.length, closed.length),
    repeatOrder: insPct(repeatOrders.length, clientIds.length),
    repeatProject: insPct(repeatProj, Object.keys(yearsByClient).length),
    followUpCoverage: insPct(followed.length, L.length)
  };

  // ── 销售 ──
  var wonAmt = insSum(won.map(function (o) { return o._amount || 0; }));
  var openAmt = insSum(openOrders.map(function (o) { return o._amount || 0; }));
  var lostAmt = insSum(lost.map(function (o) { return o._amount || 0; }));
  var DAY = 86400000;
  var cycles = [];
  for (var wi = 0; wi < won.length; wi++) {
    var d = (new Date(won[wi].won_date) - new Date(won[wi].created_at)) / DAY;
    if (isFinite(d) && d >= 0) cycles.push(Math.round(d));
  }
  out.sales = {
    won: won.length, lost: lost.length, open: openOrders.length, total: orders.length,
    winRate: insPct(won.length, closed.length),
    wonAmount: wonAmt, openAmount: openAmt, lostAmount: lostAmt,
    avgDeal: won.length ? wonAmt / won.length : 0,
    avgCycle: cycles.length ? Math.round(insSum(cycles) / cycles.length) : null,
    stages: insTally(orders, function (o) { return o.stage; }),
    openByStage: insTally(openOrders, function (o) { return o.stage; }).map(function (x) {
      return [x[0], insSum(openOrders.filter(function (o) { return String(o.stage || '(空)') === x[0]; }).map(function (o) { return o._amount || 0; }))];
    }),
    createdMonth: insMonth(orders, 'created_at'),
    wonMonth: insMonth(won, 'won_date'),
    lostWithReason: lost.filter(function (o) { return o.notes; }).length
  };

  // ── 字段完整度 ──
  function complete(arr, cols) {
    var o = {};
    for (var i = 0; i < cols.length; i++) {
      var key = cols[i][0], n = 0;
      for (var j = 0; j < arr.length; j++) {
        var v = arr[j][key];
        if (v !== null && v !== undefined && v !== '' && v !== '[]') n++;
      }
      o[cols[i][1]] = insPct(n, arr.length);
    }
    return o;
  }
  out.quality = {
    clients: complete(clients, [['type', '客户类型'], ['source', '来源'], ['industry', '行业'], ['scale', '规模'], ['grade', '客户分级'], ['lifecycle_stage', '生命周期'], ['credit_rating', '信用评级'], ['phone', '电话'], ['contact', '联系人'], ['address', '地址'], ['notes', '备注'], ['tags', '标签']]),
    leads: complete(L, [['contact_phone', '联系电话'], ['contact_mobile', '手机号'], ['budget', '预算'], ['publish_date', '发布日期'], ['source_url', '原始链接'], ['assigned_sales', '分配销售'], ['industry', '行业'], ['project_name', '项目名'], ['notes', '备注'], ['tags', '标签'], ['last_follow_up', '跟进记录']])
  };

  // ── 标讯 + 客户分层 ──
  var bidders = {}, buyers = {}, tenders = [], amtSum = 0, withAmt = 0;
  var byClient = {};
  for (var c2 = 0; c2 < clients.length; c2++) {
    var c = clients[c2], pj = insParse(c.projects);
    if (!byClient[c.id]) byClient[c.id] = { name: c.name, n: pj.length, years: [], amount: 0, lastYear: '' };
    for (var pi = 0; pi < pj.length; pi++) {
      var p = pj[pi] || {};
      tenders.push(p);
      var a = (typeof ordProjBidAmount === 'function') ? insNum(ordProjBidAmount(p)) : insNum(p.bid_amount);
      if (a > 0) { amtSum += a; withAmt++; }
      byClient[c.id].amount += a;
      var y = String(p.bidding_date || '').slice(0, 4);
      if (y) byClient[c.id].years.push(y);
      var bs = Array.isArray(p.bidder_companies) ? p.bidder_companies : (p.bidder_company ? [p.bidder_company] : []);
      for (var bi = 0; bi < bs.length; bi++) {
        var bn = typeof bs[bi] === 'string' ? bs[bi] : (bs[bi] && (bs[bi].name || bs[bi].company));
        if (bn) bidders[bn] = (bidders[bn] || 0) + 1;
      }
      if (c.name) buyers[c.name] = (buyers[c.name] || 0) + 1;
    }
    byClient[c.id].years = insUniq(byClient[c.id].years);
    byClient[c.id].lastYear = byClient[c.id].years.slice().sort().pop() || '';
  }
  var fresh = String(new Date().getFullYear() - 1);
  var seg = { '钻石客户': 0, '黄金客户': 0, '潜力客户': 0, '沉睡客户': 0 };
  var vals = [];
  for (var cid in byClient) {
    var v = byClient[cid];
    if (v.n >= 4 && v.lastYear >= fresh) seg['钻石客户']++;
    else if (v.n >= 2) seg['黄金客户']++;
    else if (v.n === 1 && v.lastYear >= fresh) seg['潜力客户']++;
    else seg['沉睡客户']++;
    vals.push(v);
  }
  out.tender = {
    total: tenders.length, withAmount: withAmt, amountSum: amtSum,
    year: insMonth(tenders, 'bidding_date').map(function (x) { return [x[0].slice(0, 4), x[1]]; }),
    topBidders: Object.keys(bidders).map(function (k) { return [k, bidders[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 10),
    topBuyers: Object.keys(buyers).map(function (k) { return [k, buyers[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 10)
  };
  out.segment = {
    dist: Object.keys(seg).map(function (k) { return [k, seg[k]]; }),
    top: vals.sort(function (a, b) { return b.n - a.n || b.amount - a.amount; }).slice(0, 10)
  };
  return out;
}

// ── SVG 渲染 ──
function insBars(items, opt) {
  opt = opt || {};
  var W = 500, rowH = 24, labelW = 108, H = items.length * rowH + 6;
  var max = 1; for (var i = 0; i < items.length; i++) max = Math.max(max, items[i][1]);
  var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMinYMin meet" class="ins-svg">';
  for (var i2 = 0; i2 < items.length; i2++) {
    var y = i2 * rowH + 3, bw = Math.max(2, (W - labelW - 62) * (items[i2][1] / max));
    s += '<text x="0" y="' + (y + 14) + '" class="ins-bl">' + insEsc(String(items[i2][0]).slice(0, 15)) + '</text>';
    s += '<rect x="' + labelW + '" y="' + (y + 2) + '" width="' + bw.toFixed(1) + '" height="16" rx="4" fill="' + (opt.color || '#38BDF8') + '" opacity="' + (0.88 - i2 * 0.025).toFixed(2) + '"/>';
    s += '<text x="' + (labelW + bw + 6).toFixed(1) + '" y="' + (y + 15) + '" class="ins-bv">' + insEsc(opt.fmt ? opt.fmt(items[i2][1]) : insComma(items[i2][1])) + '</text>';
  }
  return s + '</svg>';
}
function insLine(series, opt) {
  opt = opt || {};
  var W = 800, H = 210, pad = { l: 42, r: 14, t: 14, b: 28 };
  if (!series.length) return '<div class="ins-loading">暂无数据</div>';
  var max = 1; for (var i = 0; i < series.length; i++) max = Math.max(max, series[i][1]);
  var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  var xs = [], ys = [];
  for (var i2 = 0; i2 < series.length; i2++) {
    xs.push(pad.l + (series.length === 1 ? iw / 2 : i2 * iw / (series.length - 1)));
    ys.push(pad.t + ih - (series[i2][1] / max) * ih);
  }
  var col = opt.color || '#38BDF8';
  var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMinYMin meet" class="ins-svg">';
  for (var g = 0; g <= 4; g++) {
    var gy = pad.t + ih * g / 4;
    s += '<line x1="' + pad.l + '" y1="' + gy + '" x2="' + (W - pad.r) + '" y2="' + gy + '" stroke="rgba(255,255,255,.07)"/>';
    s += '<text x="3" y="' + (gy + 4) + '" class="ins-ax">' + insComma(Math.round(max * (4 - g) / 4)) + '</text>';
  }
  if (series.length > 1) {
    var d = '';
    for (var k = 0; k < xs.length; k++) d += (k ? 'L' : 'M') + xs[k].toFixed(1) + ',' + ys[k].toFixed(1) + ' ';
    s += '<path d="' + d + 'L' + xs[xs.length - 1].toFixed(1) + ',' + (pad.t + ih) + ' L' + xs[0].toFixed(1) + ',' + (pad.t + ih) + ' Z" fill="url(#insGrad)" opacity=".55"/>';
    s += '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2.4" stroke-linejoin="round"/>';
  }
  for (var k2 = 0; k2 < xs.length; k2++) {
    s += '<circle cx="' + xs[k2].toFixed(1) + '" cy="' + ys[k2].toFixed(1) + '" r="2.8" fill="' + col + '"><title>' + insEsc(series[k2][0]) + ': ' + insComma(series[k2][1]) + '</title></circle>';
  }
  var step = Math.max(1, Math.ceil(series.length / 9));
  for (var k3 = 0; k3 < series.length; k3++) {
    if (k3 % step === 0 || k3 === series.length - 1) s += '<text x="' + xs[k3].toFixed(1) + '" y="' + (H - 7) + '" text-anchor="middle" class="ins-ax">' + insEsc(String(series[k3][0]).slice(2)) + '</text>';
  }
  s += '<defs><linearGradient id="insGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + col + '" stop-opacity=".3"/><stop offset="1" stop-color="' + col + '" stop-opacity="0"/></linearGradient></defs>';
  return s + '</svg>';
}
function insFunnel(layers) {
  // 横向条形：每层一行，标签 / 条 / 数值 / 说明各占一列，避免梯形堆叠与文字重叠
  var W = 760, rowH = 60, labelW = 62, valW = 118, barW = 180;
  var cols = ['#38BDF8', '#60A5FA', '#A78BFA', '#F87171', '#34D399'];
  var max = 1; for (var mi = 0; mi < layers.length; mi++) max = Math.max(max, layers[mi].value);
  var s = '<div class="ins-funnel">';
  for (var i = 0; i < layers.length; i++) {
    var l = layers[i], col = l.value === 0 ? '#F87171' : cols[i];
    var w = Math.max(l.value ? 4 : 2, barW * (l.value / max));
    s += '<div class="ins-frow">';
    s += '<span class="ins-fname" style="color:' + col + '">' + insEsc(l.name) + '</span>';
    s += '<div class="ins-ftrack"><div class="ins-ffill" style="width:' + w.toFixed(1) + 'px;background:' + col + '"></div></div>';
    s += '<span class="ins-fval" style="color:' + col + '">' + insComma(l.value) + ' <small>' + insEsc(l.unit) + '</small></span>';
    s += '</div><div class="ins-fnote">' + insEsc(l.note) + '</div>';
  }
  return s + '</div>';
}
function insSegBar(dist) {
  var total = 0; for (var i = 0; i < dist.length; i++) total += dist[i][1];
  if (!total) total = 1;
  var cols = { '钻石客户': '#FBBF24', '黄金客户': '#38BDF8', '潜力客户': '#A78BFA', '沉睡客户': '#64748B' };
  var s = '<div class="ins-segbar">';
  for (var j = 0; j < dist.length; j++) {
    s += '<div style="width:' + (dist[j][1] / total * 100).toFixed(2) + '%;background:' + (cols[dist[j][0]] || '#64748B') + '" title="' + insEsc(dist[j][0]) + ' ' + insComma(dist[j][1]) + ' 家"></div>';
  }
  return s + '</div><div class="ins-legend">' + dist.map(function (x) {
    return '<span><i style="background:' + (cols[x[0]] || '#64748B') + '"></i>' + insEsc(x[0]) + ' ' + insComma(x[1]) + ' 家</span>';
  }).join('') + '</div>';
}
function insCompleteRows(obj) {
  var s = '';
  for (var k in obj) {
    var v = obj[k], cls = v < 10 ? 'bad' : v < 60 ? 'warn' : 'good';
    s += '<div class="ins-crow"><span class="ins-cl">' + insEsc(k) + '</span><div class="ins-track"><div class="ins-fill ' + cls + '" style="width:' + v + '%"></div></div><span class="ins-cv ' + cls + '">' + v + '%</span></div>';
  }
  return s;
}
function insTable(headers, rows) {
  var s = '<div class="ins-tw"><table><thead><tr>';
  for (var i = 0; i < headers.length; i++) s += '<th>' + insEsc(headers[i]) + '</th>';
  s += '</tr></thead><tbody>';
  for (var j = 0; j < rows.length; j++) {
    s += '<tr>';
    for (var k = 0; k < rows[j].length; k++) s += '<td' + (k === 0 ? ' class="tl"' : '') + '>' + rows[j][k] + '</td>';
    s += '</tr>';
  }
  return s + '</tbody></table></div>';
}
function insKpi(label, value, cap, cls) {
  return '<div class="ins-card ins-kpi"><h3>' + insEsc(label) + '</h3><div class="num ' + (cls || '') + '">' + value + '</div><div class="cap">' + insEsc(cap || '') + '</div></div>';
}

var INS_GAPS = [
  ['活动捕获（跟进记录自动留痕）', '0 条跟进记录', '加「跟进记录」字段并强制必填', 'P0'],
  ['客户联系人与可触达信息', '电话/联系人 0%', '从线索表回填客户电话，设必填校验', 'P0'],
  ['阶段标准化与阶段转化率', '阶段叫法混乱', '统一阶段枚举并记录进出时间', 'P0'],
  ['输单原因 Lost Reason', '关闭单无原因', '赢单/输单时必填原因', 'P1'],
  ['目标管理与管道覆盖率', '无目标表', '设月度目标，启用达成率', 'P1'],
  ['线索评分 Lead Scoring', '仅通过/拒绝', '按甲方类型、预算、复购打分', 'P1'],
  ['客户健康度 / 流失预警', '仅到期提醒', '用招标间隔做健康度评分', 'P2'],
  ['销售预测 Forecast', '样本不足', '积累 3–6 个月阶段数据再上', 'P2'],
  ['多人团队业绩对比', '当前 1 人', '随团队扩张启用', 'P2']
];

function insightsRender(d) {
  var box = document.getElementById('ins-body');
  if (!box || !d) return;
  var F = d.funnel, S = d.sales, T = d.tender;
  var s = '';

  s += '<div class="ins-head"><div class="ins-title"><i class="cp-dot"></i>数据分析 <span class="ins-en">INSIGHTS · LIVE</span></div>';
  s += '<div class="ins-tools"><span>数据快照 ' + insEsc(new Date(d.at).toLocaleString('zh-CN', { hour12: false })) + '</span><button class="btn btn-sm" onclick="insightsRefresh()">刷新数据</button></div></div>';

  // 01 核心结论
  s += '<div class="ins-sec"><h3>01 · 核心结论</h3><div class="ins-lead">采集能力很强，但销售过程几乎没有留下痕迹。</div><div class="ins-grid ins-g3">';
  s += insKpi('线索跟进覆盖率', insPct(F.followUpCoverage, 1) + '%', insComma(d.scale.leads) + ' 条线索，' + F.layers[2].value + ' 条有跟进记录', 'c-red');
  s += insKpi('线索 → 订单', F.clientToOrder + '%', insComma(F.leadToClient) + ' 个客户转出，仅 ' + F.clientToOrderN + ' 个有订单', 'c-red');
  s += insKpi('赢单率', S.winRate + '%', S.won + ' 赢 / ' + S.lost + ' 输', 'c-amb');
  s += insKpi('在谈管道金额', '¥' + insMoney(S.openAmount), S.open + ' 单进行中', 'c-pri');
  s += insKpi('跨年复购甲方', insComma(F.layers[4].value), F.repeatProject + '% 的甲方跨年招标', 'c-grn');
  s += insKpi('客户电话完整度', d.quality.clients['电话'] + '%', '无法触达，是跟进率为 0 的直接原因', 'c-red');
  s += '</div><div class="ins-grid ins-g2 ins-finds">';
  s += '<div class="ins-find red"><b>最大断点：被跟进层完全缺失</b><p>线索审核后直接转客户，全程无跟进记录。没有过程数据，赢单率、销售周期、预测都无从谈起。</p></div>';
  s += '<div class="ins-find amb"><b>第二断点：客户没有变成商机</b><p>' + insComma(F.leadToClient) + ' 个转出的客户只有 ' + F.clientToOrderN + ' 个进入订单。标讯聚合做得好，但没形成「看到项目 → 立项跟进」的动作。</p></div>';
  s += '<div class="ins-find grn"><b>隐藏金矿：复购信号很强</b><p>' + insComma(F.layers[4].value) + ' 家甲方跨年重复招标（' + F.repeatProject + '%），Top 甲方 ' + insComma(T.topBuyers.length ? T.topBuyers[0][1] : 0) + ' 次。</p></div>';
  s += '<div class="ins-find"><b>口径风险</b><p>' + S.lost + ' 个关闭单无输单原因；标讯金额 ¥' + insMoney(T.amountSum) + ' 混合预算与中标价，仅作市场规模参考。</p></div>';
  s += '</div></div>';

  // 02 五层增长
  s += '<div class="ins-sec"><h3>02 · 五层循环增长诊断</h3><div class="ins-lead">参照纷享销客「被看见 → 被识别 → 被跟进 → 被成交 → 被循环」定位链路断点。宽度按平方根缩放，真实数字以文字为准。</div>';
  s += '<div class="ins-card">' + insFunnel(F.layers) + '<div class="ins-note">断点定位：<b class="c-red">被跟进 = ' + F.layers[2].value + '</b> 导致后两层失去过程依据。</div></div></div>';

  // 03 销售漏斗
  s += '<div class="ins-sec"><h3>03 · 销售漏斗与业绩</h3><div class="ins-lead">口径对齐 Salesforce：赢单率 = Won/(Won+Lost)，销售周期 = 关闭日−创建日。</div><div class="ins-grid ins-g4">';
  s += insKpi('已赢单', '¥' + insMoney(S.wonAmount), S.won + ' 单 · 均单 ¥' + insMoney(S.avgDeal), 'c-grn');
  s += insKpi('平均销售周期', S.avgCycle == null ? '—' : S.avgCycle + ' 天', '基于 ' + S.won + ' 个赢单样本', 'c-pri');
  s += insKpi('在谈管道', '¥' + insMoney(S.openAmount), S.open + ' 单', 'c-pri');
  s += insKpi('输单原因记录', S.lostWithReason + '/' + S.lost, '失败复盘无从做起', 'c-red');
  s += '</div><div class="ins-grid ins-g2" style="margin-top:12px">';
  s += '<div class="ins-card"><h4>订单阶段分布</h4>' + insBars(S.stages, { color: '#60A5FA' }) + '</div>';
  s += '<div class="ins-card"><h4>在谈金额（按阶段）</h4>' + insBars(S.openByStage, { color: '#38BDF8', fmt: function (v) { return '¥' + insMoney(v); } }) + '</div>';
  s += '</div><div class="ins-card" style="margin-top:12px"><h4>订单创建趋势</h4>' + insLine(S.createdMonth, { color: '#A78BFA' }) + '</div></div>';

  // 04 客户分层
  s += '<div class="ins-sec"><h3>04 · 客户价值分层</h3><div class="ins-lead">订单样本不足做标准 RFM，改用「项目数 + 最近招标年 + 中标金额」代理分层。</div>';
  s += '<div class="ins-card">' + insSegBar(d.segment.dist) + '</div><div class="ins-grid ins-g2" style="margin-top:12px">';
  s += '<div class="ins-card"><h4>客户类型</h4>' + insBars(insTally((allClients || []).filter(function (c) { return !c.deleted_at; }), function (c) {
    var a = insParse(c.type); return a.length ? a[0] : '(空)';
  }).slice(0, 8), { color: '#A78BFA' }) + '</div>';
  s += '<div class="ins-card"><h4>客户来源</h4>' + insBars(insTally((allClients || []).filter(function (c) { return !c.deleted_at; }), function (c) { return c.source; }).slice(0, 8), { color: '#38BDF8' }) + '</div>';
  s += '</div><div class="ins-card" style="margin-top:12px"><h4>项目数最多的甲方（复购首选）</h4>' + insTable(['甲方客户', '项目数', '跨年数', '中标金额', '最近招标年'], d.segment.top.map(function (v) {
    return [insEsc(v.name), insComma(v.n), insComma(v.years.length), '¥' + insMoney(v.amount), insEsc(v.lastYear)];
  })) + '</div></div>';

  // 05 数据质量
  s += '<div class="ins-sec"><h3>05 · 数据质量诊断</h3><div class="ins-lead">字段完整度决定分析上限。红 &lt;10%，黄 10–60%，绿 ≥60%。</div><div class="ins-grid ins-g2">';
  s += '<div class="ins-card"><h4>客户表</h4>' + insCompleteRows(d.quality.clients) + '</div>';
  s += '<div class="ins-card"><h4>线索表</h4>' + insCompleteRows(d.quality.leads) + '</div></div>';
  s += '<div class="ins-warn"><b>口径限制</b><ul><li>标讯金额混合预算与中标价、单位不一，仅作市场规模参考。</li><li>赢单率分母含无原因的关闭单，真实业务赢单率可能不同。</li><li>客户分层反映商机活跃度，不是已成交价值。</li></ul></div></div>';

  // 06 标讯市场
  s += '<div class="ins-sec"><h3>06 · 标讯市场分析</h3><div class="ins-lead">' + insComma(T.total) + ' 条项目，' + insComma(T.withAmount) + ' 条有金额。</div>';
  s += '<div class="ins-card"><h4>招标年份分布</h4>' + insLine(T.year, { color: '#34D399' }) + '</div><div class="ins-grid ins-g2" style="margin-top:12px">';
  s += '<div class="ins-card"><h4>Top 甲方</h4>' + insBars(T.topBuyers, { color: '#38BDF8' }) + '</div>';
  s += '<div class="ins-card"><h4>Top 中标集成商</h4>' + insBars(T.topBidders, { color: '#A78BFA' }) + '</div></div></div>';

  // 07 大厂对标
  var gapRows = INS_GAPS.map(function (g) {
    var cls = g[3] === 'P0' ? 'p0' : g[3] === 'P1' ? 'p1' : 'p2';
    return [insEsc(g[0]), insEsc(g[1]), insEsc(g[2]), '<span class="ins-tag ' + cls + '">' + g[3] + '</span>'];
  });
  s += '<div class="ins-sec"><h3>07 · 对标大厂 CRM：差距与建议</h3><div class="ins-lead">参照 Salesforce / 纷享销客 / HubSpot 的分析能力，结合当前数据现状给出优先级。</div>';
  s += insTable(['大厂标准能力', '当前现状', '建议动作', '优先级'], gapRows) + '</div>';

  box.innerHTML = s;
}

async function openInsights(force) {
  var d = await insightsLoad(!!force);
  if (d) insightsRender(d);
}
async function insightsRefresh() { await openInsights(true); }
