// Supabase Edge Function: admin-proxy — 修复版
// 修复：错误响应 body 双重消费导致 500
// Deno.serve() 零外部依赖

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const cors = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { headers: cors, status: 405 });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return new Response(JSON.stringify({ error: "Server config error: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }), { headers: cors, status: 500 });
    }

    const body = await req.json();
    const { op, table, payload, query, filters } = body;

    const svcHeaders = {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
    };

    // 通用 fetch 包装：避免 body 双重消费
    async function svcFetch(url: string, init?: RequestInit) {
      const r = await fetch(url, init);
      if (!r.ok) {
        const text = await r.text();
        throw new Error(`Supabase ${r.status}: ${text}`);
      }
      const text = await r.text();
      return text ? JSON.parse(text) : null;
    }

    let result: { data: unknown; error: unknown | null } = { data: null, error: null };

    switch (op) {
      case "select": {
        let qs = query || "*";
        const eqs: string[] = [];
        if (filters && filters.length) {
          for (const f of filters) {
            if (f.op === "eq") eqs.push(`${f.col}=eq.${encodeURIComponent(String(f.val))}`);
            else if (f.op === "order") qs += `&order=${encodeURIComponent(f.val || f.col)}${f.opts ? "." + f.opts : ""}`;
            else if (f.op === "neq") eqs.push(`${f.col}=neq.${encodeURIComponent(String(f.val))}`);
            else if (f.op === "in") eqs.push(`${f.col}=in.(${encodeURIComponent(String(f.val))})`);
            else if (f.op === "is") eqs.push(`${f.col}=is.${encodeURIComponent(String(f.val))}`);
            else if (f.op === "ilike") eqs.push(`${f.col}=ilike.${encodeURIComponent(String(f.val))}`);
          }
        }
        if (eqs.length) qs += "&" + eqs.join("&");
        try {
          result = { data: await svcFetch(`${SUPABASE_URL}/rest/v1/${table}?select=${qs}`, { headers: svcHeaders }), error: null };
        } catch (e: unknown) {
          result = { data: null, error: { message: e instanceof Error ? e.message : "select failed" } };
        }
        break;
      }

      case "insert": {
        try {
          result = { data: await svcFetch(`${SUPABASE_URL}/rest/v1/${table}`, {
            method: "POST",
            headers: { ...svcHeaders, Prefer: "return=representation" },
            body: JSON.stringify(payload),
          }), error: null };
        } catch (e: unknown) {
          result = { data: null, error: { message: e instanceof Error ? e.message : "insert failed" } };
        }
        break;
      }

      case "update": {
        const f = filters?.[0];
        const url = f ? `${SUPABASE_URL}/rest/v1/${table}?${f.col}=eq.${encodeURIComponent(String(f.val))}` : `${SUPABASE_URL}/rest/v1/${table}`;
        try {
          result = { data: await svcFetch(url, {
            method: "PATCH",
            headers: { ...svcHeaders, Prefer: "return=representation" },
            body: JSON.stringify(payload),
          }), error: null };
        } catch (e: unknown) {
          result = { data: null, error: { message: e instanceof Error ? e.message : "update failed" } };
        }
        break;
      }

      case "delete": {
        const f = filters?.[0];
        const url = f ? `${SUPABASE_URL}/rest/v1/${table}?${f.col}=eq.${encodeURIComponent(String(f.val))}` : `${SUPABASE_URL}/rest/v1/${table}`;
        try {
          result = { data: await svcFetch(url, { method: "DELETE", headers: svcHeaders }), error: null };
        } catch (e: unknown) {
          result = { data: null, error: { message: e instanceof Error ? e.message : "delete failed" } };
        }
        break;
      }

      case "upsert": {
        try {
          result = { data: await svcFetch(`${SUPABASE_URL}/rest/v1/${table}`, {
            method: "POST",
            headers: { ...svcHeaders, Prefer: "resolution=merge-duplicates,return=representation" },
            body: JSON.stringify(payload),
          }), error: null };
        } catch (e: unknown) {
          result = { data: null, error: { message: e instanceof Error ? e.message : "upsert failed" } };
        }
        break;
      }

      case "rpc": {
        try {
          result = { data: await svcFetch(`${SUPABASE_URL}/rest/v1/rpc/${table}`, {
            method: "POST",
            headers: svcHeaders,
            body: JSON.stringify(payload || {}),
          }), error: null };
        } catch (e: unknown) {
          result = { data: null, error: { message: e instanceof Error ? e.message : "rpc failed" } };
        }
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown op: ${op}` }), { headers: cors, status: 400 });
    }

    return new Response(JSON.stringify({ data: result.data ?? null, error: result.error ?? null }), { headers: cors, status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown error";
    console.error("[admin-proxy] unhandled error:", msg);
    return new Response(JSON.stringify({ error: msg }), { headers: cors, status: 500 });
  }
});
