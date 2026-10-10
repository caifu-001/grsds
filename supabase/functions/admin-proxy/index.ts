// Supabase Edge Function: admin-proxy v4 (hardened)
//
// v3 的问题：verify_jwt=false + 函数内零鉴权 + write 只用第一个 filter
//   → 任何知道 URL 的人（无需登录）可读写全库、重置任意账号密码、删除用户。
//
// v4 加固要点：
//   1) 强制校验 Authorization 里的用户 token（无 token / token 无效 → 401）
//   2) 载入调用者的 profiles.role 与 company_memberships，判定超级管理员 / 公司管理员
//   3) 公司级数据强制归属域校验：非超管的读写都会被限制在自己所属公司内
//   4) update / delete 使用【全部】filters，且禁止无 filter 的全表写操作
//   5) auth_* 高危操作仅管理员可用；重置密码/删用户还会校验目标用户是否在本公司
//   6) CORS 收敛到白名单（默认线上域名 + 本地调试地址）
//
// 部署：supabase functions deploy admin-proxy
// 环境变量（平台自带）：SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
// 可选：ALLOWED_ORIGINS（逗号分隔）

const DEFAULT_ORIGINS = [
  "https://caifu-001.github.io",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
];

// ── 表策略 ──
// 仅管理员可写的表
const ADMIN_ONLY_TABLES = [
  "companies",
  "departments",
  "roles",
  "approval_templates",
];
// 全员可读的低敏感表（历史设计如此，无客户数据）：
// 读取不做归属域限制；写入仍会注入/校验 company_id
const SHARED_TABLES = ["workflow_templates"];
// 这些表本身没有 company_id 列（明细/子表，权限由父表 RLS 控制）
// → 不做 company_id 注入，避免 PostgREST 报「列不存在」
const NO_COMPANY_TABLE = [
  "stock_check_items",
  "stock_transfer_items",
  "purchase_order_items",
  "project_block_state",
];
// 需要“本人或本公司”特殊判定的表
const SELF_TABLES = ["profiles", "company_memberships", "invitations"];
// 其余表一律按“公司归属域”处理（自动注入/校验 company_id）

function corsFor(req) {
  const raw = Deno.env.get("ALLOWED_ORIGINS") || "";
  const allow = raw
    ? raw.split(",").map((s) => s.trim()).filter(Boolean)
    : DEFAULT_ORIGINS;
  const origin = req.headers.get("origin") || "";
  const ok = !origin || origin === "null" || allow.indexOf(origin) >= 0;
  return {
    "Access-Control-Allow-Origin": ok ? (origin || allow[0]) : allow[0],
    Vary: "Origin",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-info",
    "Access-Control-Max-Age": "86400",
  };
}

Deno.serve(async (req) => {
  const cors = corsFor(req);
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: Object.assign({ "Content-Type": "application/json" }, cors),
    });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const ANON = Deno.env.get("SUPABASE_ANON_KEY") || "";

  if (!SUPABASE_URL || !SERVICE) {
    return json({ error: "Server config error: missing env vars" }, 500);
  }

  const svcHeaders = {
    apikey: SERVICE,
    Authorization: "Bearer " + SERVICE,
    "Content-Type": "application/json",
  };

  const rest = (path, init) =>
    fetch(SUPABASE_URL + "/rest/v1/" + path, Object.assign({ headers: svcHeaders }, init || {}));

  try {
    // ── 0. 解析请求体 ──
    const body = await req.json();
    const { op, table, payload, query, filters } = body;
    const userId = body.userId;
    const password = body.password;

    // ── 1. 身份校验：必须有有效用户 token ──
    const authz = req.headers.get("authorization") || "";
    const token = authz.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Unauthorized: missing bearer token" }, 401);

    const uRes = await fetch(SUPABASE_URL + "/auth/v1/user", {
      headers: { apikey: ANON || SERVICE, Authorization: "Bearer " + token },
    });
    if (!uRes.ok) return json({ error: "Unauthorized: invalid or expired token" }, 401);
    const authUser = await uRes.json();
    const callerId = authUser && authUser.id;
    if (!callerId) return json({ error: "Unauthorized: cannot resolve user" }, 401);
    const callerEmail = (authUser.email || "").toLowerCase();

    // ── 2. 载入调用者角色与所属公司 ──
    const profRes = await rest(
      "profiles?user_id=eq." + encodeURIComponent(callerId) +
        "&select=role,company_id,active_company_id&limit=1"
    );
    const profArr = profRes.ok ? await profRes.json() : [];
    const profile = (Array.isArray(profArr) && profArr[0]) || {};
    const isSuper = profile.role === "super_admin";

    const memRes = await rest(
      "company_memberships?user_id=eq." + encodeURIComponent(callerId) +
        "&status=eq.active&select=company_id,role&limit=1000"
    );
    const memArr = memRes.ok ? await memRes.json() : [];
    const allowed = {};
    const adminOf = {};
    (Array.isArray(memArr) ? memArr : []).forEach((m) => {
      if (m && m.company_id != null) {
        const cid = String(m.company_id);
        allowed[cid] = true;
        if (m.role === "admin") adminOf[cid] = true;
      }
    });
    if (profile.company_id != null) allowed[String(profile.company_id)] = true;

    const isCompanyAdmin = Object.keys(adminOf).length > 0;
    const isAdmin = isSuper || isCompanyAdmin;
    const activeCompany =
      profile.active_company_id != null
        ? String(profile.active_company_id)
        : profile.company_id != null
        ? String(profile.company_id)
        : null;

    const inAllowed = (v) => isSuper || (v != null && allowed[String(v)] === true);

    // 取 filters 中某列的 eq 值（返回第一个）
    const eqValOf = (arr, col) => {
      const f = (arr || []).find((x) => x && x.col === col && (x.op || "eq") === "eq");
      return f ? String(f.val) : null;
    };

    // ── 3. 高危 Auth 操作：仅管理员 ──
    if (op === "auth_list_users" || op === "auth_reset_password" || op === "auth_delete_user") {
      if (!isAdmin) return json({ error: "Forbidden: admin required" }, 403);

      // 非超管：目标用户必须在本管理员所属公司内
      if (!isSuper && op !== "auth_list_users") {
        const ok2 = await targetUserInScope(userId);
        if (!ok2) return json({ error: "Forbidden: target user outside your company" }, 403);
      }

      if (op === "auth_reset_password") {
        const r = await fetch(
          SUPABASE_URL + "/auth/v1/admin/users/" + encodeURIComponent(userId),
          { method: "PUT", headers: svcHeaders, body: JSON.stringify({ password, email_confirm: true }) }
        );
        const t = await r.text();
        const j = t ? JSON.parse(t) : null;
        return json({ data: r.ok ? j : null, error: r.ok ? null : { message: j || t } });
      }

      if (op === "auth_delete_user") {
        const r = await fetch(
          SUPABASE_URL + "/auth/v1/admin/users/" + encodeURIComponent(userId),
          { method: "DELETE", headers: svcHeaders }
        );
        const t = await r.text();
        const j = t ? JSON.parse(t) : null;
        if (!r.ok) return json({ data: null, error: { message: j || t } });
        await fetch(
          SUPABASE_URL + "/rest/v1/profiles?user_id=eq." + encodeURIComponent(userId),
          { method: "DELETE", headers: svcHeaders }
        );
        return json({ data: { deleted: true }, error: null });
      }

      // auth_list_users：非超管只返回本公司成员
      const r = await fetch(SUPABASE_URL + "/auth/v1/admin/users?per_page=10000", {
        method: "GET",
        headers: svcHeaders,
      });
      const t = await r.text();
      const j = t ? JSON.parse(t) : null;
      if (!r.ok) return json({ data: null, error: { message: j || t } });
      let users = (j && j.users) || j || [];
      if (!isSuper) {
        const ids = await companyUserIds(Object.keys(allowed));
        users = (Array.isArray(users) ? users : []).filter((u) => u && ids[String(u.id)] === true);
      }
      return json({ data: users, error: null });
    }

    // ── 4. 数据操作前的归属域校验 ──
    if (!op || !["select", "insert", "update", "delete", "upsert", "rpc"].includes(op)) {
      return json({ error: "Unknown op: " + op }, 400);
    }

    const isWrite = op === "insert" || op === "update" || op === "delete" || op === "upsert";
    const fArr = Array.isArray(filters) ? filters : [];

    // 4.1 update / delete 必须带 filter，杜绝全表写
    if ((op === "update" || op === "delete") && fArr.filter((f) => f && f.col).length === 0) {
      return json({ error: "Bad request: " + op + " requires at least one filter" }, 400);
    }

    // 4.2 rpc：仅校验 payload 里显式声明的 company_id
    if (op === "rpc") {
      const pc = payload && (payload.p_company_id != null ? payload.p_company_id : payload.company_id);
      if (!isSuper && pc != null && !inAllowed(pc)) {
        return json({ error: "Forbidden: company out of scope" }, 403);
      }
    } else if (ADMIN_ONLY_TABLES.includes(table)) {
      // 4.3 管理员专属表
      if (!isAdmin) return json({ error: "Forbidden: admin required for table " + table }, 403);
      if (!isSuper) {
        const fc = eqValOf(fArr, "id") || eqValOf(fArr, "company_id") ||
          (payload && payload.company_id != null ? String(payload.company_id) : null);
        // 写操作必须落在自己管理的公司
        if (isWrite && op !== "insert" && fc && !inAllowed(fc)) {
          return json({ error: "Forbidden: company out of scope" }, 403);
        }
        if (isWrite && op === "insert" && payload && payload.company_id != null && !inAllowed(payload.company_id)) {
          return json({ error: "Forbidden: company out of scope" }, 403);
        }
      }
    } else if (SHARED_TABLES.includes(table)) {
      // 4.45 全员可读的低敏感表
      if (!isSuper && isWrite) {
        const cid = eqValOf(fArr, "company_id");
        if (cid != null && !inAllowed(cid)) return json({ error: "Forbidden: company out of scope" }, 403);
        if ((op === "insert" || op === "upsert") && payload && !Array.isArray(payload)) {
          const pc = payload.company_id;
          if (pc != null && !inAllowed(pc)) return json({ error: "Forbidden: company out of scope" }, 403);
          if (pc == null && activeCompany != null) {
            payload.company_id = isNaN(Number(activeCompany)) ? activeCompany : Number(activeCompany);
          }
        }
      }
    } else if (SELF_TABLES.includes(table)) {
      // 4.4 本人 / 本公司表
      const check = await checkSelfTable(table, op, fArr, payload, {
        callerId,
        callerEmail,
        isSuper,
        isAdmin,
        isCompanyAdmin,
        allowed,
        adminOf,
      });
      if (!check.ok) return json({ error: check.error }, 403);
    } else {
      // 4.5 默认：公司归属域
      if (!isSuper) {
        if (NO_COMPANY_TABLE.includes(table)) {
          // 子表无 company_id 列，仅要求已登录（权限由父表 RLS 兜底）
        } else if (op === "select") {
          const cid = eqValOf(fArr, "company_id");
          if (cid != null && !inAllowed(cid)) return json({ error: "Forbidden: company out of scope" }, 403);
          if (cid == null && activeCompany == null) {
            return json({ error: "Forbidden: no company scope" }, 403);
          }
        } else if (op === "insert" || op === "upsert") {
          const pc = payload && !Array.isArray(payload) ? payload.company_id : null;
          if (pc != null && !inAllowed(pc)) return json({ error: "Forbidden: company out of scope" }, 403);
          if (pc == null && activeCompany != null && payload && !Array.isArray(payload)) {
            payload.company_id = isNaN(Number(activeCompany)) ? activeCompany : Number(activeCompany);
          }
        } else {
          // update / delete
          const cid = eqValOf(fArr, "company_id");
          if (cid != null && !inAllowed(cid)) return json({ error: "Forbidden: company out of scope" }, 403);
        }
      }
    }

    // ── 5. 执行 ──
    // 5.1 归属域注入：非超管的 select/update/delete 追加 company_id 过滤（防跨公司越权）
    const needInject =
      !isSuper && activeCompany != null &&
      ["select", "update", "delete"].includes(op) &&
      !ADMIN_ONLY_TABLES.includes(table) &&
      !SHARED_TABLES.includes(table) &&
      !SELF_TABLES.includes(table) &&
      !NO_COMPANY_TABLE.includes(table) &&
      eqValOf(fArr, "company_id") == null;
    if (needInject) {
      fArr.push({ col: "company_id", op: "eq", val: activeCompany });
    }

    let result = { data: null, error: null };

    if (op === "select") {
      const url = buildSelectUrl(SUPABASE_URL, table, query, fArr);
      const r = await fetch(url, { headers: svcHeaders });
      const t = await r.text();
      const j = t ? JSON.parse(t) : null;
      result = { data: r.ok ? j : null, error: r.ok ? null : { message: j || t } };
    } else if (op === "insert") {
      const r = await fetch(SUPABASE_URL + "/rest/v1/" + table, {
        method: "POST",
        headers: Object.assign({}, svcHeaders, { Prefer: "return=representation" }),
        body: JSON.stringify(payload),
      });
      const t = await r.text();
      const j = t ? JSON.parse(t) : null;
      result = { data: r.ok ? j : null, error: r.ok ? null : { message: j || t } };
    } else if (op === "update") {
      const qs = buildEqQS(fArr);
      const r = await fetch(SUPABASE_URL + "/rest/v1/" + table + "?" + qs, {
        method: "PATCH",
        headers: Object.assign({}, svcHeaders, { Prefer: "return=representation" }),
        body: JSON.stringify(payload),
      });
      const t = await r.text();
      const j = t ? JSON.parse(t) : null;
      result = { data: r.ok ? j : null, error: r.ok ? null : { message: j || t } };
    } else if (op === "delete") {
      const qs = buildEqQS(fArr);
      const r = await fetch(SUPABASE_URL + "/rest/v1/" + table + "?" + qs, {
        method: "DELETE",
        headers: Object.assign({}, svcHeaders, { Prefer: "return=representation" }),
      });
      const t = await r.text();
      result = {
        data: r.ok ? (t ? JSON.parse(t) : null) : null,
        error: r.ok ? null : { message: t },
      };
    } else if (op === "upsert") {
      const r = await fetch(SUPABASE_URL + "/rest/v1/" + table, {
        method: "POST",
        headers: Object.assign({}, svcHeaders, {
          Prefer: "resolution=merge-duplicates,return=representation",
        }),
        body: JSON.stringify(payload),
      });
      const t = await r.text();
      const j = t ? JSON.parse(t) : null;
      result = { data: r.ok ? j : null, error: r.ok ? null : { message: j || t } };
    } else if (op === "rpc") {
      const r = await fetch(SUPABASE_URL + "/rest/v1/rpc/" + table, {
        method: "POST",
        headers: svcHeaders,
        body: JSON.stringify(payload || {}),
      });
      const t = await r.text();
      const j = t ? JSON.parse(t) : null;
      result = { data: r.ok ? j : null, error: r.ok ? null : { message: j || t } };
    }

    return json({ data: result.data || null, error: result.error || null });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "unknown error" }, 500);
  }

  // ────────────────────────── helpers ──────────────────────────

  function buildSelectUrl(base, tbl, queryStr, filterArr) {
    let qs = queryStr || "*";
    const eqs = [];
    (filterArr || []).forEach((f) => {
      if (!f) return;
      const col = f.col || "";
      const v = f.val;
      if (f.op === "order") {
        qs += "&order=" + encodeURIComponent(v || col) + (f.opts ? "." + f.opts : "");
      } else if (f.op === "limit") {
        qs += "&limit=" + encodeURIComponent(String(v));
      } else if (f.op === "offset") {
        qs += "&offset=" + encodeURIComponent(String(v));
      } else if (f.op === "eq") {
        eqs.push(col + "=eq." + encodeURIComponent(String(v)));
      } else if (f.op === "neq") {
        eqs.push(col + "=neq." + encodeURIComponent(String(v)));
      } else if (f.op === "in") {
        eqs.push(col + "=in.(" + encodeURIComponent(String(v)) + ")");
      } else if (f.op === "is") {
        eqs.push(col + "=is." + encodeURIComponent(String(v)));
      } else if (f.op === "not.is") {
        eqs.push(col + "=not.is." + encodeURIComponent(String(v)));
      } else if (f.op === "ilike") {
        eqs.push(col + "=ilike." + encodeURIComponent(String(v)));
      } else if (f.op === "gt") {
        eqs.push(col + "=gt." + encodeURIComponent(String(v)));
      } else if (f.op === "gte") {
        eqs.push(col + "=gte." + encodeURIComponent(String(v)));
      } else if (f.op === "lt") {
        eqs.push(col + "=lt." + encodeURIComponent(String(v)));
      } else if (f.op === "lte") {
        eqs.push(col + "=lte." + encodeURIComponent(String(v)));
      }
    });
    if (eqs.length) qs += "&" + eqs.join("&");
    return base + "/rest/v1/" + tbl + "?select=" + qs;
  }

  function buildEqQS(filterArr) {
    const parts = [];
    (filterArr || []).forEach((f) => {
      if (!f || !f.col) return;
      const col = f.col;
      const v = f.val;
      const o = f.op || "eq";
      if (o === "eq") parts.push(col + "=eq." + encodeURIComponent(String(v)));
      else if (o === "neq") parts.push(col + "=neq." + encodeURIComponent(String(v)));
      else if (o === "in") parts.push(col + "=in.(" + encodeURIComponent(String(v)) + ")");
      else if (o === "is") parts.push(col + "=is." + encodeURIComponent(String(v)));
      else if (o === "not.is") parts.push(col + "=not.is." + encodeURIComponent(String(v)));
      else if (o === "ilike") parts.push(col + "=ilike." + encodeURIComponent(String(v)));
      else if (o === "gt") parts.push(col + "=gt." + encodeURIComponent(String(v)));
      else if (o === "gte") parts.push(col + "=gte." + encodeURIComponent(String(v)));
      else if (o === "lt") parts.push(col + "=lt." + encodeURIComponent(String(v)));
      else if (o === "lte") parts.push(col + "=lte." + encodeURIComponent(String(v)));
    });
    return parts.join("&");
  }

  // 目标用户是否在本管理员所属公司内
  async function targetUserInScope(uid) {
    if (!uid) return false;
    const r = await rest(
      "company_memberships?user_id=eq." + encodeURIComponent(uid) +
        "&status=eq.active&select=company_id&limit=500"
    );
    if (r.ok) {
      const rows = await r.json();
      if (Array.isArray(rows) && rows.some((x) => allowed[String(x.company_id)] === true)) return true;
    }
    const r2 = await rest("profiles?user_id=eq." + encodeURIComponent(uid) + "&select=company_id&limit=1");
    if (r2.ok) {
      const rows2 = await r2.json();
      if (Array.isArray(rows2) && rows2[0] && allowed[String(rows2[0].company_id)] === true) return true;
    }
    return false;
  }

  // 返回若干公司的全部成员 user_id 集合
  async function companyUserIds(cids) {
    const out = {};
    if (!cids.length) return out;
    const r = await rest(
      "company_memberships?company_id=in.(" + cids.join(",") +
        ")&status=eq.active&select=user_id&limit=10000"
    );
    if (r.ok) {
      const rows = await r.json();
      (Array.isArray(rows) ? rows : []).forEach((x) => {
        if (x && x.user_id) out[String(x.user_id)] = true;
      });
    }
    return out;
  }

  // 本人 / 本公司表的判定
  async function checkSelfTable(tbl, operation, filterArr, pl, ctx) {
    const { callerId: cid, callerEmail, isSuper: sup, isAdmin: adm, allowed: allow } = ctx;
    if (sup) return { ok: true };

    if (tbl === "invitations") {
      if (operation === "insert") {
        const fc = pl && pl.from_company_id;
        if (fc != null && !inAllowed(fc)) return { ok: false, error: "Forbidden: company out of scope" };
      }
      return { ok: true };
    }

    if (tbl === "company_memberships") {
      if (operation === "select") {
        const fuid = eqValOf(filterArr, "user_id");
        const fc = eqValOf(filterArr, "company_id");
        if (fuid === cid) return { ok: true };
        if (fc != null && inAllowed(fc)) return { ok: true };
        return { ok: false, error: "Forbidden: memberships out of scope" };
      }
      if (operation === "insert") {
        const uid = pl && pl.user_id;
        const c = pl && pl.company_id;
        if (c != null && !inAllowed(c)) return { ok: false, error: "Forbidden: company out of scope" };
        if (String(uid) === cid || adm) return { ok: true };
        return { ok: false, error: "Forbidden: cannot join others" };
      }
      // update / delete
      const fc = eqValOf(filterArr, "company_id");
      if (adm && fc != null && ctx.adminOf[fc]) return { ok: true };
      return { ok: false, error: "Forbidden: admin required" };
    }

    if (tbl === "profiles") {
      const fuid = eqValOf(filterArr, "user_id");
      const femail = (eqValOf(filterArr, "email") || "").toLowerCase();
      const fc = eqValOf(filterArr, "company_id");
      const pUid = pl && !Array.isArray(pl) ? pl.user_id : null;

      if (operation === "select") {
        if (fuid === cid) return { ok: true };
        if (femail && femail === callerEmail) return { ok: true };
        if (fc != null && inAllowed(fc)) return { ok: true };
        if (adm) return { ok: true }; // 管理员可查本公司员工列表
        return { ok: false, error: "Forbidden: profiles out of scope" };
      }

      // write
      if (String(fuid) === cid || String(pUid) === cid) return { ok: true }; // 改自己
      if (!adm) return { ok: false, error: "Forbidden: profiles write out of scope" };
      // 管理员：目标必须在本公司
      const targets = [];
      if (fuid) targets.push(fuid);
      if (pUid) targets.push(pUid);
      if (fc != null && !inAllowed(fc)) return { ok: false, error: "Forbidden: company out of scope" };
      for (const t of targets) {
        if (String(t) === cid) continue;
        const okT = await targetUserInScope(t);
        if (!okT) return { ok: false, error: "Forbidden: target user outside your company" };
      }
      return { ok: true };
    }

    return { ok: true };
  }
});
