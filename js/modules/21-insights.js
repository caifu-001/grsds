// ==========================================================================
// grsds · 21-insights.js — 数据分析（系统内实时分析页）
// 按纷享销客「五层循环增长」+ Salesforce 收入情报口径，14 个模块实时计算并展示：
//   01 核心结论 / 02 五层增长 / 03 销售漏斗 / 04 客户分层 / 05 数据质量 / 06 标讯市场 / 07 大厂对标
//   08 客户增长与来源 / 09 客户价值矩阵 / 10 复购与健康度 / 11 销售深度 / 12 线索运营 / 13 标讯竞争 / 14 数据资产健康
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
  var cols = 'id,status,review_status,assigned_to,converted_client_id,auto_fetched,last_follow_up,created_at,source,source_site,win_bidder,win_amount,project_name,contact_phone,contact_mobile,budget,publish_date,source_url,assigned_sales,industry,notes,tags';
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
  var yearMap = {};
  for (var yi = 0; yi < tenders.length; yi++) {
    var yy = String(tenders[yi].bidding_date || '').slice(0, 4);
    if (/^\d{4}$/.test(yy)) yearMap[yy] = (yearMap[yy] || 0) + 1;
  }
  out.tender = {
    total: tenders.length, withAmount: withAmt, amountSum: amtSum,
    year: Object.keys(yearMap).sort().map(function (k) { return [k, yearMap[k]]; }),
    topBidders: Object.keys(bidders).map(function (k) { return [k, bidders[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 10),
    topBuyers: Object.keys(buyers).map(function (k) { return [k, buyers[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 10)
  };
  out.segment = {
    dist: Object.keys(seg).map(function (k) { return [k, seg[k]]; }),
    top: vals.sort(function (a, b) { return b.n - a.n || b.amount - a.amount; }).slice(0, 10)
  };

  // ── 08 客户增长与来源 ──
  out.growth = {
    createdYear: insTally(clients, function (c) { return String(c.created_at || '').slice(0, 4) || '(空)'; })
      .sort(function (a, b) { return String(a[0]).localeCompare(String(b[0])); }),
    createdMonth: insMonth(clients, 'created_at', 18),
    source: insTally(clients, function (c) { return c.source; }).slice(0, 10),
    lifecycle: insTally(clients, function (c) { return c.lifecycle_stage; }).slice(0, 10),
    grade: insTally(clients, function (c) { return c.grade; }).slice(0, 10)
  };

  // ── 09 客户价值矩阵（项目频次 × 中标金额）──
  var matrix = { '高值高频': 0, '高值低频': 0, '低值高频': 0, '低值低频': 0 };
  var amtSorted = vals.map(function (v) { return v.amount; }).filter(function (a) { return a > 0; }).sort(function (a, b) { return a - b; });
  var amtHi = amtSorted.length ? amtSorted[Math.floor(amtSorted.length * 0.7)] : 0; // 前 30% 算高值
  if (amtHi <= 0) amtHi = 1;
  for (var mi = 0; mi < vals.length; mi++) {
    var mv = vals[mi];
    if (!mv.n) continue; // 无项目的客户不进入价值矩阵
    var hiVal = mv.amount >= amtHi, hiFreq = mv.n >= 3;
    matrix[hiVal ? (hiFreq ? '高值高频' : '高值低频') : (hiFreq ? '低值高频' : '低值低频')]++;
  }
  out.valueMatrix = {
    cells: Object.keys(matrix).map(function (k) { return [k, matrix[k]]; }),
    amtHi: amtHi,
    top: vals.slice().sort(function (a, b) { return b.amount - a.amount; }).slice(0, 10)
  };

  // ── 10 复购与健康度 ──
  var gaps = {}, dueThisYear = 0, overdue = 0, sleeping = 0;
  var thisYear = new Date().getFullYear();
  for (var hk in yearsByClient) {
    var ys = yearsByClient[hk].slice().sort();
    if (ys.length < 2) continue;
    for (var hi = 1; hi < ys.length; hi++) {
      var gap = Number(ys[hi]) - Number(ys[hi - 1]);
      if (gap > 0 && gap <= 10) gaps[gap] = (gaps[gap] || 0) + 1;
    }
  }
  var gapEntries = Object.keys(gaps).map(function (k) { return [k + ' 年', gaps[k], Number(k)]; })
    .sort(function (a, b) { return b[1] - a[1] || a[2] - b[2]; });
  var modeGap = gapEntries.length ? gapEntries[0][2] : 1;
  var activeCount = 0;
  for (var hk2 in byClient) {
    var hv = byClient[hk2];
    if (!hv.n) continue;
    activeCount++;
    if (!hv.lastYear) continue;
    var nextY = Number(hv.lastYear) + modeGap;
    if (nextY < thisYear) overdue++;
    else if (nextY === thisYear) dueThisYear++;
    if (Number(hv.lastYear) <= thisYear - 2) sleeping++;
  }
  out.health = {
    gaps: gapEntries.map(function (x) { return [x[0], x[1]]; }),
    modeGap: modeGap, dueThisYear: dueThisYear, overdue: overdue,
    sleeping: sleeping, activeCount: activeCount, thisYear: thisYear
  };

  // ── 11 销售深度 ──
  var bands = [[0, 1e4, '1 万以下'], [1e4, 5e4, '1–5 万'], [5e4, 1e5, '5–10 万'], [1e5, 5e5, '10–50 万'], [5e5, Infinity, '50 万以上']];
  var amountBands = bands.map(function (b) {
    var arr = orders.filter(function (o) { var a = o._amount || 0; return a >= b[0] && a < b[1]; });
    return [b[2], arr.length, insSum(arr.map(function (o) { return o._amount || 0; }))];
  });
  var openAges = openOrders.map(function (o) {
    var d = (Date.now() - new Date(o.created_at)) / DAY;
    return isFinite(d) && d >= 0 ? Math.round(d) : 0;
  }).sort(function (a, b) { return a - b; });
  out.salesDeep = {
    amountBands: amountBands,
    wonMonth: insMonth(won, 'won_date'),
    winWithReason: won.filter(function (o) { return o.notes; }).length,
    lostWithReason: lost.filter(function (o) { return o.notes; }).length,
    medianOpenAge: openAges.length ? openAges[Math.floor(openAges.length / 2)] : 0,
    maxOpenAge: openAges.length ? openAges[openAges.length - 1] : 0
  };

  // ── 12 线索运营 ──
  var assigned = L.filter(function (l) { return l.assigned_to; }).length;
  var aiLeads = L.filter(function (l) { return l.auto_fetched; }).length;
  var aiConv = converted.filter(function (l) { return l.auto_fetched; }).length;
  out.leadOps = {
    site: insTally(L, function (l) { return l.source_site || l.source; }).slice(0, 10),
    review: insTally(L, function (l) { return l.review_status; }).slice(0, 8),
    status: insTally(L, function (l) { return l.status; }).slice(0, 8),
    assigned: assigned, assignRate: insPct(assigned, L.length),
    aiLeads: aiLeads, aiConv: aiConv,
    aiConvRate: insPct(aiConv, aiLeads),
    manualConvRate: insPct(converted.length - aiConv, Math.max(1, L.length - aiLeads)),
    createdMonth: insMonth(L, 'created_at', 18),
    convBySource: insTally(converted, function (l) { return l.source_site || l.source; }).slice(0, 10)
  };

  // ── 13 标讯竞争 ──
  var PROV = ['北京', '天津', '上海', '重庆', '河北', '山西', '辽宁', '吉林', '黑龙江', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南', '湖北', '湖南', '广东', '广西', '海南', '四川', '贵州', '云南', '陕西', '甘肃', '青海', '宁夏', '新疆', '西藏', '内蒙古', '香港', '澳门', '台湾'];
  var regionMap = {};
  for (var rg = 0; rg < clients.length; rg++) {
    var addr = String(clients[rg].address || ''), reg = '(未知)';
    for (var rgi = 0; rgi < PROV.length; rgi++) if (addr.indexOf(PROV[rgi]) >= 0) { reg = PROV[rgi]; break; }
    regionMap[reg] = (regionMap[reg] || 0) + 1;
  }
  var bidEntries = Object.keys(bidders).map(function (k) { return [k, bidders[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
  var bidTotal = insSum(bidEntries.map(function (x) { return x[1]; }));
  var bidBands = [[0, 10, '10 万以下'], [10, 50, '10–50 万'], [50, 100, '50–100 万'], [100, 500, '100–500 万'], [500, Infinity, '500 万以上']];
  var tenderAmtBands = bidBands.map(function (b) {
    var n = 0;
    for (var tb = 0; tb < tenders.length; tb++) {
      var am = insNum(tenders[tb].bid_amount) / 1e4;
      if (am >= b[0] && am < b[1]) n++;
    }
    return [b[2], n];
  });
  out.competition = {
    region: Object.keys(regionMap).map(function (k) { return [k, regionMap[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 10),
    bidderCR5: insPct(insSum(bidEntries.slice(0, 5).map(function (x) { return x[1]; })), bidTotal),
    bidderCount: bidEntries.length,
    amountBands: tenderAmtBands,
    withBudget: tenders.filter(function (p) { return insNum(p.project_budget) > 0; }).length,
    withBidAmount: withAmt
  };

  // ── 14 数据资产健康 ──
  var nameMap = {};
  for (var nm = 0; nm < clients.length; nm++) {
    var nk = String(clients[nm].name || '').trim().toLowerCase();
    if (!nk) continue;
    (nameMap[nk] = nameMap[nk] || []).push(clients[nm].id);
  }
  var dupGroups = 0, dupRows = 0;
  for (var dk in nameMap) if (nameMap[dk].length > 1) { dupGroups++; dupRows += nameMap[dk].length; }
  var staleAt = Date.now() - 90 * DAY;
  var orderClientSet = {};
  for (var oc = 0; oc < orders.length; oc++) if (orders[oc].client_id) orderClientSet[orders[oc].client_id] = 1;
  var activatable = 0;
  for (var ak in byClient) if (byClient[ak].n > 0 && !orderClientSet[ak]) activatable++;
  out.assets = {
    dupGroups: dupGroups, dupRows: dupRows,
    stale: clients.filter(function (c) { var t = new Date(c.updated_at || c.created_at).getTime(); return isFinite(t) && t < staleAt; }).length,
    noPhone: clients.filter(function (c) { return !c.phone; }).length,
    noContact: clients.filter(function (c) { return !c.contact; }).length,
    noProject: clients.filter(function (c) { return !byClient[c.id] || !byClient[c.id].n; }).length,
    activatable: activatable,
    contactsCount: contacts.length,
    contactWithPosition: contacts.filter(function (c) { return c.position; }).length
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
    s += '<text x="3" y="' + (gy + 4) + '" class="ins-ax">' + (opt.fmt ? opt.fmt(Math.round(max * (4 - g) / 4)) : insComma(Math.round(max * (4 - g) / 4))) + '</text>';
  }
  if (series.length > 1) {
    var d = '';
    for (var k = 0; k < xs.length; k++) d += (k ? 'L' : 'M') + xs[k].toFixed(1) + ',' + ys[k].toFixed(1) + ' ';
    s += '<path d="' + d + 'L' + xs[xs.length - 1].toFixed(1) + ',' + (pad.t + ih) + ' L' + xs[0].toFixed(1) + ',' + (pad.t + ih) + ' Z" fill="url(#insGrad)" opacity=".55"/>';
    s += '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2.4" stroke-linejoin="round"/>';
  }
  for (var k2 = 0; k2 < xs.length; k2++) {
    s += '<circle cx="' + xs[k2].toFixed(1) + '" cy="' + ys[k2].toFixed(1) + '" r="2.8" fill="' + col + '"><title>' + insEsc(series[k2][0]) + ': ' + (opt.fmt ? opt.fmt(series[k2][1]) : insComma(series[k2][1])) + '</title></circle>';
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

// 章节导航：14 个模块一键跳转，长页面不用一路滚
var INS_NAV = ['核心结论', '五层增长', '销售漏斗', '客户分层', '数据质量', '标讯市场', '大厂对标', '客户增长', '价值矩阵', '复购健康', '销售深度', '线索运营', '竞争分析', '数据资产'];
function insGo(id) { var e = document.getElementById(id); if (e) e.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function insNav() {
  var s = '<div class="ins-nav">';
  for (var i = 0; i < INS_NAV.length; i++) {
    s += '<button class="ins-nav-chip" onclick="insGo(\'ins-sec-' + (i + 1) + '\')">' + (i + 1) + ' · ' + INS_NAV[i] + '</button>';
  }
  return s + '</div>';
}
function insMatrix(cells, amtHi) {
  var order = [['高值高频', '高频 × 高值', 'hot'], ['高值低频', '低频 × 高值', ''], ['低值高频', '高频 × 低值', ''], ['低值低频', '低频 × 低值', 'cold']];
  var m = {};
  for (var i = 0; i < cells.length; i++) m[cells[i][0]] = cells[i][1];
  var s = '<div class="ins-matrix">';
  for (var j = 0; j < order.length; j++) {
    s += '<div class="ins-mcell ' + order[j][2] + '"><b>' + insComma(m[order[j][0]] || 0) + '</b><span>' + order[j][1] + '</span></div>';
  }
  return s + '</div><div class="ins-note">高值 = 项目中标金额 ≥ ¥' + insMoney(amtHi) + '（前 30% 分位）；高频 = 项目数 ≥ 3。四象限合计＝有项目的客户数。</div>';
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
  s += insNav();

  // 01 核心结论
  s += '<div class="ins-sec" id="ins-sec-1"><h3>01 · 核心结论</h3><div class="ins-lead">采集能力很强，但销售过程几乎没有留下痕迹。</div><div class="ins-grid ins-g3">';
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
  s += '<div class="ins-sec" id="ins-sec-2"><h3>02 · 五层循环增长诊断</h3><div class="ins-lead">参照纷享销客「被看见 → 被识别 → 被跟进 → 被成交 → 被循环」定位链路断点。宽度按平方根缩放，真实数字以文字为准。</div>';
  s += '<div class="ins-card">' + insFunnel(F.layers) + '<div class="ins-note">断点定位：<b class="c-red">被跟进 = ' + F.layers[2].value + '</b> 导致后两层失去过程依据。</div></div></div>';

  // 03 销售漏斗
  s += '<div class="ins-sec" id="ins-sec-3"><h3>03 · 销售漏斗与业绩</h3><div class="ins-lead">口径对齐 Salesforce：赢单率 = Won/(Won+Lost)，销售周期 = 关闭日−创建日。</div><div class="ins-grid ins-g4">';
  s += insKpi('已赢单', '¥' + insMoney(S.wonAmount), S.won + ' 单 · 均单 ¥' + insMoney(S.avgDeal), 'c-grn');
  s += insKpi('平均销售周期', S.avgCycle == null ? '—' : S.avgCycle + ' 天', '基于 ' + S.won + ' 个赢单样本', 'c-pri');
  s += insKpi('在谈管道', '¥' + insMoney(S.openAmount), S.open + ' 单', 'c-pri');
  s += insKpi('输单原因记录', S.lostWithReason + '/' + S.lost, '失败复盘无从做起', 'c-red');
  s += '</div><div class="ins-grid ins-g2" style="margin-top:12px">';
  s += '<div class="ins-card"><h4>订单阶段分布</h4>' + insBars(S.stages, { color: '#60A5FA' }) + '</div>';
  s += '<div class="ins-card"><h4>在谈金额（按阶段）</h4>' + insBars(S.openByStage, { color: '#38BDF8', fmt: function (v) { return '¥' + insMoney(v); } }) + '</div>';
  s += '</div><div class="ins-card" style="margin-top:12px"><h4>订单创建趋势</h4>' + insLine(S.createdMonth, { color: '#A78BFA' }) + '</div></div>';

  // 04 客户分层
  s += '<div class="ins-sec" id="ins-sec-4"><h3>04 · 客户价值分层</h3><div class="ins-lead">订单样本不足做标准 RFM，改用「项目数 + 最近招标年 + 中标金额」代理分层。</div>';
  s += '<div class="ins-card">' + insSegBar(d.segment.dist) + '</div><div class="ins-grid ins-g2" style="margin-top:12px">';
  s += '<div class="ins-card"><h4>客户类型</h4>' + insBars(insTally((allClients || []).filter(function (c) { return !c.deleted_at; }), function (c) {
    var a = insParse(c.type); return a.length ? a[0] : '(空)';
  }).slice(0, 8), { color: '#A78BFA' }) + '</div>';
  s += '<div class="ins-card"><h4>客户来源</h4>' + insBars(insTally((allClients || []).filter(function (c) { return !c.deleted_at; }), function (c) { return c.source; }).slice(0, 8), { color: '#38BDF8' }) + '</div>';
  s += '</div><div class="ins-card" style="margin-top:12px"><h4>项目数最多的甲方（复购首选）</h4>' + insTable(['甲方客户', '项目数', '跨年数', '中标金额', '最近招标年'], d.segment.top.map(function (v) {
    return [insEsc(v.name), insComma(v.n), insComma(v.years.length), '¥' + insMoney(v.amount), insEsc(v.lastYear)];
  })) + '</div></div>';

  // 05 数据质量
  s += '<div class="ins-sec" id="ins-sec-5"><h3>05 · 数据质量诊断</h3><div class="ins-lead">字段完整度决定分析上限。红 &lt;10%，黄 10–60%，绿 ≥60%。</div><div class="ins-grid ins-g2">';
  s += '<div class="ins-card"><h4>客户表</h4>' + insCompleteRows(d.quality.clients) + '</div>';
  s += '<div class="ins-card"><h4>线索表</h4>' + insCompleteRows(d.quality.leads) + '</div></div>';
  s += '<div class="ins-warn"><b>口径限制</b><ul><li>标讯金额混合预算与中标价、单位不一，仅作市场规模参考。</li><li>赢单率分母含无原因的关闭单，真实业务赢单率可能不同。</li><li>客户分层反映商机活跃度，不是已成交价值。</li></ul></div></div>';

  // 06 标讯市场
  s += '<div class="ins-sec" id="ins-sec-6"><h3>06 · 标讯市场分析</h3><div class="ins-lead">' + insComma(T.total) + ' 条项目，' + insComma(T.withAmount) + ' 条有金额。</div>';
  s += '<div class="ins-card"><h4>招标年份分布</h4>' + insLine(T.year, { color: '#34D399' }) + '</div><div class="ins-grid ins-g2" style="margin-top:12px">';
  s += '<div class="ins-card"><h4>Top 甲方</h4>' + insBars(T.topBuyers, { color: '#38BDF8' }) + '</div>';
  s += '<div class="ins-card"><h4>Top 中标集成商</h4>' + insBars(T.topBidders, { color: '#A78BFA' }) + '</div></div></div>';

  // 07 大厂对标
  var gapRows = INS_GAPS.map(function (g) {
    var cls = g[3] === 'P0' ? 'p0' : g[3] === 'P1' ? 'p1' : 'p2';
    return [insEsc(g[0]), insEsc(g[1]), insEsc(g[2]), '<span class="ins-tag ' + cls + '">' + g[3] + '</span>'];
  });
  s += '<div class="ins-sec" id="ins-sec-7"><h3>07 · 对标大厂 CRM：差距与建议</h3><div class="ins-lead">参照 Salesforce / 纷享销客 / HubSpot 的分析能力，结合当前数据现状给出优先级。</div>';
  s += insTable(['大厂标准能力', '当前现状', '建议动作', '优先级'], gapRows) + '</div>';

  var G = d.growth, V = d.valueMatrix, HE = d.health, SD = d.salesDeep, LO = d.leadOps, CO = d.competition, AS = d.assets;

  // 08 客户增长与来源
  s += '<div class="ins-sec" id="ins-sec-8"><h3>08 · 客户增长与来源结构</h3><div class="ins-lead">识别客户积累节奏与来源集中度：一次性导入还是持续增长，决定后续运营策略。</div><div class="ins-grid ins-g4">';
  s += insKpi('客户总数', insComma(d.scale.clients), '联系人 ' + insComma(d.scale.contacts) + ' 人', 'c-pri');
  var peakYear = G.createdYear.slice().sort(function (a, b) { return b[1] - a[1]; })[0];
  s += insKpi('建库高峰年', insEsc(peakYear ? peakYear[0] : '—'), peakYear ? peakYear[1] + ' 家客户在该年创建' : '无数据', 'c-amb');
  s += insKpi('第一大来源', insEsc(G.source.length ? G.source[0][0] : '—'), G.source.length ? insPct(G.source[0][1], d.scale.clients) + '% 的客户来自此渠道' : '', 'c-amb');
  s += insKpi('无来源标注', insComma(G.source.filter(function (x) { return x[0] === '(空)'; })[0] ? G.source.filter(function (x) { return x[0] === '(空)'; })[0][1] : 0), '来源缺失无法做渠道 ROI', 'c-red');
  s += '</div><div class="ins-grid ins-g2" style="margin-top:12px">';
  s += '<div class="ins-card"><h4>客户创建趋势（近 18 个月）</h4>' + insLine(G.createdMonth, { color: '#38BDF8' }) + '</div>';
  s += '<div class="ins-card"><h4>客户来源分布</h4>' + insBars(G.source, { color: '#60A5FA' }) + '</div></div>';
  s += '<div class="ins-grid ins-g2" style="margin-top:12px">';
  s += '<div class="ins-card"><h4>生命周期阶段</h4>' + insBars(G.lifecycle, { color: '#34D399' }) + '</div>';
  s += '<div class="ins-card"><h4>客户分级</h4>' + insBars(G.grade, { color: '#A78BFA' }) + '</div></div></div>';

  // 09 客户价值矩阵
  s += '<div class="ins-sec" id="ins-sec-9"><h3>09 · 客户价值矩阵（频次 × 金额）</h3><div class="ins-lead">把项目频次和中标金额交叉，找出「高频高值」的重点客户与「低频高值」的一次性大单。</div>';
  s += '<div class="ins-card">' + insMatrix(V.cells, V.amtHi) + '</div>';
  s += '<div class="ins-card" style="margin-top:12px"><h4>中标金额 Top 10 客户</h4>' + insTable(['甲方客户', '项目数', '跨年数', '中标金额', '最近招标年'], V.top.map(function (v) {
    return [insEsc(v.name), insComma(v.n), insComma(v.years.length), '¥' + insMoney(v.amount), insEsc(v.lastYear)];
  })) + '</div></div>';

  // 10 复购与健康度
  s += '<div class="ins-sec" id="ins-sec-10"><h3>10 · 复购周期与客户健康度</h3><div class="ins-lead">用历史招标间隔推算下次到期时间，提前布局续做；识别长期无项目的沉睡客户。</div><div class="ins-grid ins-g4">';
  s += insKpi('最常见复购周期', HE.modeGap + ' 年', '基于跨年招标客户的年份间隔', 'c-pri');
  s += insKpi('今年应复购', insComma(HE.dueThisYear) + ' 家', '按「最近招标年 + ' + HE.modeGap + ' 年」推算', 'c-amb');
  s += insKpi('已逾期未复购', insComma(HE.overdue) + ' 家', '超过推算到期年仍无新项目', 'c-red');
  s += insKpi('沉睡客户', insComma(HE.sleeping) + ' 家', '最近项目在 ' + (HE.thisYear - 2) + ' 年及以前', 'c-red');
  s += '</div><div class="ins-card" style="margin-top:12px"><h4>复购间隔分布</h4>' + insBars(HE.gaps, { color: '#A78BFA' }) + '<div class="ins-note">活跃客户 ' + insComma(HE.activeCount) + ' 家；间隔为相邻两个招标年份之差，1 年表示连年招标。</div></div></div>';

  // 11 销售深度
  s += '<div class="ins-sec" id="ins-sec-11"><h3>11 · 销售深度与订单结构</h3><div class="ins-lead">订单金额分布、赢单节奏与在谈订单停留时长，判断管道质量和推进效率。</div><div class="ins-grid ins-g4">';
  s += insKpi('金额中位数·在谈', SD.medianOpenAge + ' 天', '在谈订单创建至今的中位停留', 'c-amb');
  s += insKpi('最长在谈', SD.maxOpenAge + ' 天', '需优先清理的陈旧管道', 'c-red');
  s += insKpi('赢单有复盘', SD.winWithReason + '/' + S.won, '赢单原因记录数', 'c-pri');
  s += insKpi('输单有复盘', SD.lostWithReason + '/' + S.lost, '输单原因记录数', 'c-red');
  s += '</div><div class="ins-grid ins-g2" style="margin-top:12px">';
  s += '<div class="ins-card"><h4>订单金额分档（笔数）</h4>' + insBars(SD.amountBands.map(function (x) { return [x[0], x[1]]; }), { color: '#38BDF8' }) + '</div>';
  s += '<div class="ins-card"><h4>赢单金额趋势</h4>' + insLine(SD.wonMonth, { color: '#34D399', fmt: function (v) { return '¥' + insMoney(v); } }) + '</div></div>';
  s += '<div class="ins-card" style="margin-top:12px"><h4>各档位金额合计</h4>' + insTable(['金额档位', '订单数', '金额合计'], SD.amountBands.map(function (x) {
    return [insEsc(x[0]), insComma(x[1]), '¥' + insMoney(x[2])];
  })) + '</div></div>';

  // 12 线索运营
  s += '<div class="ins-sec" id="ins-sec-12"><h3>12 · 线索来源与运营效率</h3><div class="ins-lead">对比 AI 采集与人工线索的转化效率，检查分配与跟进是否到位。</div><div class="ins-grid ins-g4">';
  s += insKpi('线索分配率', LO.assignRate + '%', LO.assigned + '/' + insComma(d.scale.leads) + ' 条有负责人', LO.assignRate < 10 ? 'c-red' : 'c-pri');
  s += insKpi('AI 线索占比', insPct(LO.aiLeads, d.scale.leads) + '%', insComma(LO.aiLeads) + ' 条自动采集', 'c-pri');
  s += insKpi('AI 线索转化率', LO.aiConvRate + '%', insComma(LO.aiConv) + ' 条 AI 线索已转客户', 'c-amb');
  s += insKpi('人工线索转化率', LO.manualConvRate + '%', '对比 AI 采集的转化质量', 'c-grn');
  s += '</div><div class="ins-grid ins-g2" style="margin-top:12px">';
  s += '<div class="ins-card"><h4>线索来源站点</h4>' + insBars(LO.site, { color: '#38BDF8' }) + '</div>';
  s += '<div class="ins-card"><h4>各来源转客户数</h4>' + insBars(LO.convBySource, { color: '#34D399' }) + '</div></div>';
  s += '<div class="ins-grid ins-g2" style="margin-top:12px">';
  s += '<div class="ins-card"><h4>审核状态</h4>' + insBars(LO.review, { color: '#60A5FA' }) + '</div>';
  s += '<div class="ins-card"><h4>线索创建趋势（近 18 个月）</h4>' + insLine(LO.createdMonth, { color: '#A78BFA' }) + '</div></div></div>';

  // 13 标讯竞争
  s += '<div class="ins-sec" id="ins-sec-13"><h3>13 · 标讯市场竞争格局</h3><div class="ins-lead">中标单位集中度、区域分布与金额结构，判断市场竞争强度和重点区域。</div><div class="ins-grid ins-g4">';
  s += insKpi('中标单位数', insComma(CO.bidderCount) + ' 家', '出现在项目中标名单中的单位', 'c-pri');
  s += insKpi('Top5 集中度', CO.bidderCR5 + '%', '前 5 家中标单位的项目占比', 'c-amb');
  s += insKpi('有预算标注', insComma(CO.withBudget) + ' 条', insPct(CO.withBudget, T.total) + '% 的项目有预算', 'c-pri');
  s += insKpi('有中标价', insComma(CO.withBidAmount) + ' 条', insPct(CO.withBidAmount, T.total) + '% 的项目有中标金额', 'c-grn');
  s += '</div><div class="ins-grid ins-g2" style="margin-top:12px">';
  s += '<div class="ins-card"><h4>客户区域分布（按地址）</h4>' + insBars(CO.region, { color: '#38BDF8' }) + '</div>';
  s += '<div class="ins-card"><h4>项目中标金额分档（万）</h4>' + insBars(CO.amountBands, { color: '#A78BFA' }) + '</div></div></div>';

  // 14 数据资产健康
  s += '<div class="ins-sec" id="ins-sec-14"><h3>14 · 数据资产健康与可激活存量</h3><div class="ins-lead">数据重复、陈旧与可触达性，直接决定上面 13 个模块的分析可信度。</div><div class="ins-grid ins-g4">';
  s += insKpi('疑似重名客户', insComma(AS.dupGroups) + ' 组', '涉及 ' + insComma(AS.dupRows) + ' 条客户记录', AS.dupGroups > 0 ? 'c-red' : 'c-grn');
  s += insKpi('90 天未更新', insComma(AS.stale) + ' 家', '长期无动态的客户档案', 'c-amb');
  s += insKpi('可激活存量', insComma(AS.activatable) + ' 家', '有标讯项目但还没有订单', 'c-pri');
  s += insKpi('无项目客户', insComma(AS.noProject) + ' 家', '占客户总数 ' + insPct(AS.noProject, d.scale.clients) + '%', 'c-amb');
  s += '</div><div class="ins-card" style="margin-top:12px"><h4>可触达性</h4>' + insTable(['指标', '数值', '占比'], [
    ['客户有电话', insComma(d.scale.clients - AS.noPhone), insPct(d.scale.clients - AS.noPhone, d.scale.clients) + '%'],
    ['客户有联系人', insComma(d.scale.clients - AS.noContact), insPct(d.scale.clients - AS.noContact, d.scale.clients) + '%'],
    ['联系人有职位', insComma(AS.contactWithPosition), insPct(AS.contactWithPosition, AS.contactsCount) + '%']
  ]) + '</div><div class="ins-warn"><b>行动建议</b><ul><li>优先合并 ' + insComma(AS.dupGroups) + ' 组重名客户，避免报价与跟进记录分裂。</li><li>从线索表回填客户电话/联系人：线索手机号完整度 ' + d.quality.leads['手机号'] + '%，而客户表为 0%。</li><li>' + insComma(AS.activatable) + ' 家有标讯无订单，是最直接的商机池，建议按复购到期年排序跟进。</li></ul></div></div>';

  box.innerHTML = s;
}

async function openInsights(force) {
  var d = await insightsLoad(!!force);
  if (d) insightsRender(d);
}
async function insightsRefresh() { await openInsights(true); }
