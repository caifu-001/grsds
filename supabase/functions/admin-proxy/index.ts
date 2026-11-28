// Supabase Edge Function: admin-proxy v5 (multi-tenant hardened)
//
// v4 已做：强制 token 校验、角色载入、公司归属域校验、禁全表写、auth_* 管理员限定。
//
// v5 针对「租赁给多家公司商用」补齐的边界（见 sql/tenant_security_hardening.sql）：
//   1) 超管身份双重校验：profiles.role='super_admin' **且** 邮箱等于平台超管邮箱
//      → 光把 role 改成 super_admin 不再等于拿到超管权限
//   2) 注入式越权修复：query / filters.col 直接拼进 PostgREST URL，
//      原来可传 `*,contacts(*)` 做关系内联、或 `col:"id&or=(...)"` 改查询结构，
//      用 service_role 执行即跨租户读全库。现在只允许纯列名清单与纯标识符
//   3) 非超管写 profiles：禁止授予 super_admin，禁止改 company_id / active_company_id
//   4) 非超管写 companies：insert 强制 status='pending'；update 剥离审核字段
//      → 公司管理员无法自己把公司批成 approved
//   5) operation_logs：非超管查询强制 actor_role <> 'super_admin'，超管日志仅超管可见
//   6) write_op_log：用调用者真实身份覆盖前端传的 user_id / user_name / company_id，
//      日志不可冒名
//   7) rpc 白名单：只放行 write_op_log / batch_grant_resources，
//      堵住「用 service_role 调任意 SECURITY DEFINER 函数」
//   8) active_company_id 必须是自己已加入的公司，否则按第一个可用公司收敛
//
// 部署：supabase functions deploy admin-proxy --project-ref jyefbatmmbelrhhzsgva
// 环境变量：SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY（平台自带）
// 可选：ALLOWED_ORIGINS、SUPER_ADMIN_EMAIL（默认 767142066@qq.com）

const DEFAULT_ORIGINS = [
  "https://caifu-001.github.io",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
];

const SUPER_ADMIN_EMAIL = (Deno.env.get("SUPER_ADMIN_EMAIL") || "767142066@qq.com")
  .trim()
  .toLowerCase();

// 允许通过代理调用的 RPC（其余一律拒绝）
const ALLOWED_RPC = ["write_op_log", "batch_grant_resources"];

// ── 表策略 ──
const ADMIN_ONLY_TABLES = ["companies", "departments", "roles", "approval_templates"];
const SHARED_TABLES = ["workflow_templates"];
const NO_COMPANY_TABLE = [
  "stock_check_items",
  "stock_transfer_items",
  "purchase_order_items",
  "project_block_state",
];
const SELF_TABLES = ["profiles", "company_memberships", "invitations"];

// profiles 中「只有超管能改」的字段
const PROFILE_SUPER_ONLY = ["role", "role_id", "company_id", "active_company_id"];
// companies 中「只有超管能改」的字段
const COMPANY_SUPER_ONLY = ["status", "approved_by", "approved_at", "is_tenant", "created_by"];

const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SELECT_RE = /^[A-Za-z0-9_*,\s]+$/;

function corsFor(req: Request) {
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
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Max-Age": "86400",
  };
}

Deno.serve(async (req) => {
  const cors = corsFor(req);
  const json = (obj: unknown, status = 200) =>
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

  const rest = (path: string, init?: RequestInit) =>
    fetch(SUPABASE_URL + "/rest/v1/" + path, Object.assign({ headers: svcHeaders }, init || {}));

  try {
    // ── 0. 解析请求体 ──
    const body = await req.json();
    const { op, table, payload, query, filters } = body;
    const targetUserId = body.userId;
    const password = body.password;

    // ── 1. 身份校验 ──
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
    const callerEmail = String(authUser.email || "").trim().toLowerCase();

    // ── 2. 角色与所属公司 ──
    const profRes = await rest(
      "profiles?user_id=eq." + encodeURIComponent(callerId) +
        "&select=role,company_id,active_company_id&limit=1"
    );
    const profArr = profRes.ok ? await profRes.json() : [];
    const profile = (Array.isArray(profArr) && profArr[0]) || {};

    const superEmails = new Set([SUPER_ADMIN_EMAIL]);
    // 双校验：role 与邮箱必须同时满足
    const isSuper = profile.role === "super_admin" && superEmails.has(callerEmail);

    const memRes = await rest(
      "company_memberships?user_id=eq." + encodeURIComponent(callerId) +
        "&status=eq.active&select=company_id,role&limit=1000"
    );
    const memArr = memRes.ok ? await memRes.json() : [];
    const allowed: Record<string, boolean> = {};
    const adminOf: Record<string, boolean> = {};
    const memFirstCompany: string | null = (() => {
      const arr = Array.isArray(memArr) ? memArr : [];
      for (const m of arr) {
        if (m && m.company_id != null) return String(m.company_id);
      }
      return null;
    })();
    (Array.isArray(memArr) ? memArr : []).forEach((m: any) => {
      if (m && m.company_id != null) {
        const cid = String(m.company_id);
        allowed[cid] = true;
        if (m.role === "admin") adminOf[cid] = true;
      }
    });
    if (profile.company_id != null) allowed[String(profile.company_id)] = true;

    const isCompanyAdmin = Object.keys(adminOf).length > 0;
    const isAdmin = isSuper || isCompanyAdmin;

    // active_company_id 必须落在自己的公司集合里，否则收敛（防改档案换公司越权）
    let activeCompany: string | null = null;
    if (isSuper) {
      activeCompany = profile.active_company_id != null
        ? String(profile.active_company_id)
        : profile.company_id != null
        ? String(profile.company_id)
        : memFirstCompany;
    } else {
      const cand = [
        profile.active_company_id != null ? String(profile.active_company_id) : null,
        profile.company_id != null ? String(profile.company_id) : null,
        memFirstCompany,
      ];
      for (const c of cand) {
        if (c != null && allowed[c] === true) {
          activeCompany = c;
          break;
        }
      }
    }

    const inAllowed = (v: unknown) => isSuper || (v != null && allowed[String(v)] === true);

    const eqValOf = (arr: any[], col: string) => {
      const f = (arr || []).find((x) => x && x.col === col && (x.op || "eq") === "eq");
      return f ? String(f.val) : null;
    };

    // ── 3. 注入防护：query 只允许纯列清单；filters.col 只允许标识符 ──
    const sel = typeof query === "string" && query.trim() ? query.trim() : "*";
    if (!SELECT_RE.test(sel)) {
      return json({ error: "Bad request: unsafe select expression" }, 400);
    }
    const fArr: any[] = Array.isArray(filters) ? filters : [];
    for (const f of fArr) {
      if (!f || typeof f !== "object") return json({ error: "Bad request: invalid filter" }, 400);
      const col = f.col == null ? "" : String(f.col);
      if (col !== "" && !IDENT_RE.test(col)) {
        return json({ error: "Bad request: unsafe filter column" }, 400);
      }
    }
    const safeTable = typeof table === "string" ? table : "";
    if (op !== "rpc" && !IDENT_RE.test(safeTable)) {
      return json({ error: "Bad request: unsafe table name" }, 400);
    }

    // ── 4. 高危 Auth 操作：仅管理员 ──
    if (op === "auth_list_users" || op === "auth_reset_password" || op === "auth_delete_user") {
      if (!isAdmin) return json({ error: "Forbidden: admin required" }, 403);

      if (!isSuper && op !== "auth_list_users") {
        if (String(targetUserId) === String(callerId)) {
          // 允许改自己
        } else {
          const ok2 = await targetUserInScope(targetUserId);
          if (!ok2) return json({ error: "Forbidden: target user outside your company" }, 403);
        }
      }

      if (op === "auth_reset_password") {
        const r = await fetch(
          SUPABASE_URL + "/auth/v1/admin/users/" + encodeURIComponent(targetUserId),
          { method: "PUT", headers: svcHeaders, body: JSON.stringify({ password, email_confirm: true }) }
        );
        const t = await r.text();
        const j = t ? JSON.parse(t) : null;
        return json({ data: r.ok ? j : null, error: r.ok ? null : { message: j || t } });
      }

      if (op === "auth_delete_user") {
        if (String(targetUserId) === String(callerId)) {
          return json({ error: "Forbidden: cannot delete yourself" }, 403);
        }
        const r = await fetch(
          SUPABASE_URL + "/auth/v1/admin/users/" + encodeURIComponent(targetUserId),
          { method: "DELETE", headers: svcHeaders }
        );
        const t = await r.text();
        const j = t ? JSON.parse(t) : null;
        if (!r.ok) return json({ data: null, error: { message: j || t } });
        await fetch(
          SUPABASE_URL + "/rest/v1/profiles?user_id=eq." + encodeURIComponent(targetUserId),
          { method: "DELETE", headers: svcHeaders }
        );
        return json({ data: { deleted: true }, error: null });
      }

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
        const supers = await platformSuperIds();
        users = (Array.isArray(users) ? users : []).filter(
          (u: any) => u && ids[String(u.id)] === true && supers[String(u.id)] !== true
        );
      }
      return json({ data: users, error: null });
    }

    // ── 5. 操作合法性 ──
    if (!op || !["select", "insert", "update", "delete", "upsert", "rpc"].includes(op)) {
      return json({ error: "Unknown op: " + op }, 400);
    }

    const isWrite = op === "insert" || op === "update" || op === "delete" || op === "upsert";

    if ((op === "update" || op === "delete") && fArr.filter((f) => f && f.col).length === 0) {
      return json({ error: "Bad request: " + op + " requires at least one filter" }, 400);
    }

    // ── 6. RPC：白名单 + 身份覆盖 ──
    if (op === "rpc") {
      const fn = String(safeTable || "");
      if (!ALLOWED_RPC.includes(fn)) {
        return json({ error: "Forbidden: rpc not allowed: " + fn }, 403);
      }

      const pc = payload && (payload.p_company_id != null ? payload.p_company_id : payload.company_id);
      if (!isSuper && pc != null && !inAllowed(pc)) {
        return json({ error: "Forbidden: company out of scope" }, 403);
      }

      // 日志写入：身份一律以 token 解析结果为准，前端传的值不可信
      if (fn === "write_op_log" && payload && typeof payload === "object") {
        payload.p_user_id = callerId;
        payload.p_user_name = callerEmail;
        if (!isSuper) {
          if (activeCompany != null) {
            payload.p_company_id = isNaN(Number(activeCompany)) ? activeCompany : Number(activeCompany);
          }
        }
      }
    } else if (ADMIN_ONLY_TABLES.includes(safeTable)) {
      // ── 7. 管理员专属表 ──
      if (!isAdmin) return json({ error: "Forbidden: admin required for table " + safeTable }, 403);

      if (!isSuper) {
        if (isWrite && (op === "insert" || op === "upsert") && payload && !Array.isArray(payload)) {
          // 公司：只能提交待审核的入驻申请
          if (safeTable === "companies") {
            payload.status = "pending";
            payload.approved_by = null;
            payload.approved_at = null;
            payload.is_tenant = true;
            payload.created_by = callerId;
            payload.owner_user_id = callerId;
          }
          if (payload.company_id != null && !inAllowed(payload.company_id)) {
            return json({ error: "Forbidden: company out of scope" }, 403);
          }
          if (payload.company_id == null && activeCompany != null && safeTable !== "companies") {
            payload.company_id = isNaN(Number(activeCompany)) ? activeCompany : Number(activeCompany);
          }
        }

        if (isWrite && (op === "update" || op === "delete")) {
          const rid = eqValOf(fArr, "id");
          const fc = eqValOf(fArr, "company_id") ||
            (payload && payload.company_id != null ? String(payload.company_id) : null);

          if (safeTable === "companies") {
            // 只能改自己管理的公司；审核类字段一律剥离。
            // companies 的 id 就是 company_id：前端按 id 保存/删除本公司资料时
            // filters 里只有 id、没有 company_id，此时必须回查该行真实归属，
            // 否则公司管理员连「编辑自己公司」都会被误判成跨公司（403）。
            // 以「按 id 回查到的行」为唯一依据，不用 filters / payload 里的
            // company_id —— 那些是前端传的，可以伪造。
            const ownCompanyIds = Object.keys(adminOf);
            let scopeCid: string | null = null;
            if (rid != null) {
              const rr = await rest(
                "companies?id=eq." + encodeURIComponent(rid) + "&select=id&limit=1"
              );
              if (rr.ok) {
                const rows = await rr.json();
                scopeCid = Array.isArray(rows) && rows[0] && rows[0].id != null
                  ? String(rows[0].id) : null;
              }
            } else {
              scopeCid = fc; // 没有按 id 定位时（批量更新），才退回到显式范围
            }
            if (scopeCid == null || ownCompanyIds.indexOf(String(scopeCid)) < 0) {
              return json({ error: "Forbidden: company out of scope" }, 403);
            }
            if (payload && typeof payload === "object" && !Array.isArray(payload)) {
              for (const k of COMPANY_SUPER_ONLY) delete payload[k];
            }
          } else {
            // departments / roles / approval_templates：按行自身的 company_id 判定，
            // 不能用行 id（部门 id=25 与公司 id 没有可比性）
            let rowCompany = eqValOf(fArr, "company_id");
            if (rowCompany == null && rid != null) {
              const rr = await rest(
                safeTable + "?id=eq." + encodeURIComponent(rid) + "&select=company_id&limit=1"
              );
              if (rr.ok) {
                const rows = await rr.json();
                rowCompany = Array.isArray(rows) && rows[0] && rows[0].company_id != null
                  ? String(rows[0].company_id)
                  : null;
              }
            }
            if (rowCompany == null || !inAllowed(rowCompany)) {
              return json({ error: "Forbidden: company out of scope" }, 403);
            }
          }
        }
      }
    } else if (SHARED_TABLES.includes(safeTable)) {
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
    } else if (SELF_TABLES.includes(safeTable)) {
      const check = await checkSelfTable(safeTable, op, fArr, payload, {
        callerId,
        callerEmail,
        isSuper,
        isAdmin,
        isCompanyAdmin,
        allowed,
        adminOf,
        activeCompany,
      });
      if (!check.ok) return json({ error: check.error }, 403);
    } else {
      // ── 8. 默认：公司归属域 ──
      if (!isSuper) {
        if (NO_COMPANY_TABLE.includes(safeTable)) {
          // 子表无 company_id 列，权限由父表兜底（已知 P2 风险，见审计报告）
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
          const cid = eqValOf(fArr, "company_id");
          if (cid != null && !inAllowed(cid)) return json({ error: "Forbidden: company out of scope" }, 403);
        }
      }
    }

    // ── 9. 归属域注入 + 超管日志隔离 ──
    const needInject =
      op === "select" &&
      !isSuper &&
      activeCompany != null &&
      !ADMIN_ONLY_TABLES.includes(safeTable) &&
      !SHARED_TABLES.includes(safeTable) &&
      !SELF_TABLES.includes(safeTable) &&
      !NO_COMPANY_TABLE.includes(safeTable) &&
      eqValOf(fArr, "company_id") == null;

    if (needInject) {
      fArr.push({ col: "company_id", op: "eq", val: activeCompany });
    }

    // 超管日志：非超管永远查不到 actor_role = super_admin 的行
    if (safeTable === "operation_logs" && op === "select" && !isSuper) {
      fArr.push({ col: "actor_role", op: "neq", val: "super_admin" });
    }

    // 员工 / 成员列表：非超管不能看到平台超管
    if (safeTable === "profiles" && op === "select" && !isSuper) {
      fArr.push({ col: "role", op: "neq", val: "super_admin" });
    }

    // ── 10. 执行 ──
    let result: { data: any; error: any } = { data: null, error: null };

    if (op === "select") {
      const url = buildSelectUrl(SUPABASE_URL, safeTable, sel, fArr);
      const r = await fetch(url, { headers: svcHeaders });
      const t = await r.text();
      const j = t ? JSON.parse(t) : null;
      result = { data: r.ok ? j : null, error: r.ok ? null : { message: j || t } };
    } else if (op === "insert") {
      const r = await fetch(SUPABASE_URL + "/rest/v1/" + safeTable, {
        method: "POST",
        headers: Object.assign({}, svcHeaders, { Prefer: "return=representation" }),
        body: JSON.stringify(payload),
      });
      const t = await r.text();
      const j = t ? JSON.parse(t) : null;
      result = { data: r.ok ? j : null, error: r.ok ? null : { message: j || t } };
    } else if (op === "update") {
      const qs = buildEqQS(fArr);
      const r = await fetch(SUPABASE_URL + "/rest/v1/" + safeTable + "?" + qs, {
        method: "PATCH",
        headers: Object.assign({}, svcHeaders, { Prefer: "return=representation" }),
        body: JSON.stringify(payload),
      });
      const t = await r.text();
      const j = t ? JSON.parse(t) : null;
      result = { data: r.ok ? j : null, error: r.ok ? null : { message: j || t } };
    } else if (op === "delete") {
      const qs = buildEqQS(fArr);
      const r = await fetch(SUPABASE_URL + "/rest/v1/" + safeTable + "?" + qs, {
        method: "DELETE",
        headers: Object.assign({}, svcHeaders, { Prefer: "return=representation" }),
      });
      const t = await r.text();
      result = {
        data: r.ok ? (t ? JSON.parse(t) : null) : null,
        error: r.ok ? null : { message: t },
      };
    } else if (op === "upsert") {
      const r = await fetch(SUPABASE_URL + "/rest/v1/" + safeTable, {
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
      const r = await fetch(SUPABASE_URL + "/rest/v1/rpc/" + safeTable, {
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

  function buildSelectUrl(base: string, tbl: string, queryStr: string, filterArr: any[]) {
    let qs = queryStr || "*";
    const eqs: string[] = [];
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

  function buildEqQS(filterArr: any[]) {
    const parts: string[] = [];
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

  async function targetUserInScope(uid: unknown) {
    if (!uid) return false;
    const r = await rest(
      "company_memberships?user_id=eq." + encodeURIComponent(String(uid)) +
        "&status=eq.active&select=company_id&limit=500"
    );
    if (r.ok) {
      const rows = await r.json();
      if (Array.isArray(rows) && rows.some((x: any) => allowed[String(x.company_id)] === true)) return true;
    }
    const r2 = await rest("profiles?user_id=eq." + encodeURIComponent(String(uid)) + "&select=company_id&limit=1");
    if (r2.ok) {
      const rows2 = await r2.json();
      if (Array.isArray(rows2) && rows2[0] && allowed[String(rows2[0].company_id)] === true) return true;
    }
    return false;
  }

  async function companyUserIds(cids: string[]) {
    const out: Record<string, boolean> = {};
    if (!cids.length) return out;
    const r = await rest(
      "company_memberships?company_id=in.(" + cids.join(",") +
        ")&status=eq.active&select=user_id&limit=10000"
    );
    if (r.ok) {
      const rows = await r.json();
      (Array.isArray(rows) ? rows : []).forEach((x: any) => {
        if (x && x.user_id) out[String(x.user_id)] = true;
      });
    }
    return out;
  }

  // 平台超管 user_id 集合：非超管的一切列表/查询都要把它们剔掉
  async function platformSuperIds() {
    const out: Record<string, boolean> = {};
    const r = await rest("profiles?role=eq.super_admin&select=user_id&limit=100");
    if (r.ok) {
      const rows = await r.json();
      (Array.isArray(rows) ? rows : []).forEach((x: any) => {
        if (x && x.user_id) out[String(x.user_id)] = true;
      });
    }
    return out;
  }

  async function isPlatformSuperUser(uid: unknown) {    if (!uid) return false;
    const r = await rest(
      "profiles?user_id=eq." + encodeURIComponent(String(uid)) + "&select=role&limit=1"
    );
    if (!r.ok) return false;
    const rows = await r.json();
    if (!Array.isArray(rows) || !rows[0] || rows[0].role !== "super_admin") return false;
    // 邮箱还要对得上（超管唯一性）
    const a = await fetch(SUPABASE_URL + "/auth/v1/admin/users/" + encodeURIComponent(String(uid)), {
      headers: svcHeaders,
    });
    if (!a.ok) return false;
    const u: any = await a.json();
    return String(u && u.email ? u.email : "").trim().toLowerCase() === SUPER_ADMIN_EMAIL;
  }

  // 本人 / 本公司表的判定
  async function checkSelfTable(tbl: string, operation: string, filterArr: any[], pl: any, ctx: any) {
    const { callerId: cid, callerEmail: cemail, isSuper: sup, isAdmin: adm, allowed: allow } = ctx;
    if (sup) return { ok: true };

    if (tbl === "invitations") {
      if (operation === "insert") {
        const fc = pl && pl.from_company_id;
        if (fc != null && !inAllowed(fc)) return { ok: false, error: "Forbidden: company out of scope" };
        if (pl && !pl.invited_by) pl.invited_by = cid;
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
      // update / delete：只有该公司的管理员，且不能动平台超管的成员关系
      const fc = eqValOf(filterArr, "company_id");
      const fu = eqValOf(filterArr, "user_id");
      if (adm && fc != null && ctx.adminOf[fc]) {
        if (fu && (await isPlatformSuperUser(fu))) {
          return { ok: false, error: "Forbidden: cannot modify platform super admin" };
        }
        return { ok: true };
      }
      return { ok: false, error: "Forbidden: admin required" };
    }

    if (tbl === "profiles") {
      const fuid = eqValOf(filterArr, "user_id");
      const femail = (eqValOf(filterArr, "email") || "").toLowerCase();
      const fc = eqValOf(filterArr, "company_id");
      const pUid = pl && !Array.isArray(pl) ? pl.user_id : null;

      if (operation === "select") {
        if (fuid === cid) return { ok: true };
        if (femail && femail === cemail) return { ok: true };
        if (fc != null && inAllowed(fc)) return { ok: true };
        if (adm) {
          // 管理员可以查员工列表，但必须限定范围。原来这里直接放行，
          // 意味着漏写 company_id 过滤就会把全平台 6 个账号（含其它公司）带回去。
          const scoped =
            eqValOf(filterArr, "user_id") != null ||
            eqValOf(filterArr, "email") != null ||
            filterArr.some((f) => f && f.col === "company_id");
          if (scoped) return { ok: true };
          return { ok: false, error: "Forbidden: profiles select requires company scope" };
        }
        return { ok: false, error: "Forbidden: profiles out of scope" };
      }

      // 写：先剥离越权字段，再判断目标范围
      const isInsert = operation === "insert" || operation === "upsert";
      const isSelf = String(fuid) === cid || String(pUid) === cid;

      if (pl && typeof pl === "object" && !Array.isArray(pl)) {
        if (String(pl.role || "") === "super_admin") {
          return { ok: false, error: "Forbidden: cannot grant super admin" };
        }
        // role 只允许这几个值（super_admin 已在上面拦掉）
        if (pl.role && ["admin", "user", "member", "editor", "custom"].indexOf(String(pl.role)) < 0) {
          delete pl.role;
        }

        if (isSelf) {
          // 改自己：角色、部门、归属一律不可动（切公司只走 set_active_company）
          delete pl.role;
          delete pl.role_id;
          delete pl.status;
          delete pl.department_id;
          delete pl.company_id;
          delete pl.active_company_id;
        } else if (isInsert) {
          // 管理员为新同事建档：公司必须是自己管辖的公司
          if (pl.company_id != null && !inAllowed(pl.company_id)) {
            return { ok: false, error: "Forbidden: company out of scope" };
          }
          if (pl.company_id == null && ctx.activeCompany != null) {
            pl.company_id = isNaN(Number(ctx.activeCompany)) ? ctx.activeCompany : Number(ctx.activeCompany);
          }
          if (pl.active_company_id != null && !inAllowed(pl.active_company_id)) delete pl.active_company_id;
        } else {
          // 更新别人：归属公司/激活公司不可改；role_id 必须属于自己管辖的公司
          delete pl.company_id;
          delete pl.active_company_id;
          if (pl.role_id != null) {
            const rr = await rest(
              "roles?id=eq." + encodeURIComponent(String(pl.role_id)) + "&select=company_id&limit=1"
            );
            const rows = rr.ok ? await rr.json() : [];
            const rc = Array.isArray(rows) && rows[0] ? rows[0].company_id : null;
            if (rc == null || !inAllowed(rc)) delete pl.role_id;
          }
        }
      }

      if (isSelf) return { ok: true };
      if (!adm) return { ok: false, error: "Forbidden: profiles write out of scope" };

      const targets: string[] = [];
      if (fuid) targets.push(fuid);
      if (pUid) targets.push(pUid);
      if (!targets.length) return { ok: false, error: "Forbidden: missing target user" };

      if (fc != null && !inAllowed(fc)) return { ok: false, error: "Forbidden: company out of scope" };
      for (const t of targets) {
        if (String(t) === cid) continue;
        if (await isPlatformSuperUser(t)) {
          return { ok: false, error: "Forbidden: cannot modify platform super admin" };
        }
        // 已建档的用户必须在本公司；尚未建档的（刚 signUp 的新同事）放行，
        // 公司归属已在上面的 payload.company_id 校验过
        const pr = await rest(
          "profiles?user_id=eq." + encodeURIComponent(t) + "&select=user_id&limit=1"
        );
        const rows = pr.ok ? await pr.json() : [];
        const hasRow = Array.isArray(rows) && rows.length > 0;
        if (hasRow) {
          const okT = await targetUserInScope(t);
          if (!okT) return { ok: false, error: "Forbidden: target user outside your company" };
        }
      }
      return { ok: true };
    }

    return { ok: true };
  }
});
