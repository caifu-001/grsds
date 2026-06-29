// Supabase Edge Function: admin-proxy — 零导入纯内置
// 用 Deno.serve() 替代 std/http 导入，避免冷启动拉远程模块

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
      return new Response(JSON.stringify({ error: "Server config error: missing env vars" }), { headers: cors, status: 500 });
    }

    const body = await req.json();
    const { op, table, payload, query, filters } = body;

    const svcHeaders = {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
    };

    let result: { data: unknown; error: unknown | null } = { data: null, error: null };

    switch (op) {
      case "select": {
        let qs = query || "*";
        if (filters && filters.length) {
          const eqs: string[] = [];
          for (const f of filters) {
            if (f.op === "eq") eqs.push(`${f.col}=eq.${encodeURIComponent(String(f.val))}`);
            else if (f.op === "order") qs += `&order=${encodeURIComponent(f.val || f.col)}${f.opts ? "." + f.opts : ""}`;
            else if (f.op === "neq") eqs.push(`${f.col}=neq.${encodeURIComponent(String(f.val))}`);
            else if (f.op === "in") eqs.push(`${f.col}=in.(${encodeURIComponent(String(f.val))})`);
            else if (f.op === "is") eqs.push(`${f.col}=is.${encodeURIComponent(String(f.val))}`);
            else if (f.op === "ilike") eqs.push(`${f.col}=ilike.${encodeURIComponent(String(f.val))}`);
          }
          if (eqs.length) qs += "&" + eqs.join("&");
        }
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${qs}`, { headers: svcHeaders });
        const data = await r.json();
        result = { data, error: r.ok ? null : { message: await r.text() } };
        break;
      }

      case "insert": {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
          method: "POST",
          headers: { ...svcHeaders, Prefer: "return=representation" },
          body: JSON.stringify(payload),
        });
        const data = await r.json();
        result = { data, error: r.ok ? null : { message: await r.text() } };
        break;
      }

      case "update": {
        const f = filters?.[0];
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${f.col}=eq.${encodeURIComponent(String(f.val))}`, {
          method: "PATCH",
          headers: { ...svcHeaders, Prefer: "return=representation" },
          body: JSON.stringify(payload),
        });
        const data = await r.json();
        result = { data, error: r.ok ? null : { message: await r.text() } };
        break;
      }

      case "delete": {
        const f = filters?.[0];
        const path = f ? `/${table}?${f.col}=eq.${encodeURIComponent(String(f.val))}` : `/${table}`;
        const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, { method: "DELETE", headers: svcHeaders });
        const text = await r.text();
        result = { data: text ? JSON.parse(text) : null, error: r.ok ? null : { message: text } };
        break;
      }

      case "upsert": {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
          method: "POST",
          headers: { ...svcHeaders, Prefer: "resolution=merge-duplicates,return=representation" },
          body: JSON.stringify(payload),
        });
        const data = await r.json();
        result = { data, error: r.ok ? null : { message: await r.text() } };
        break;
      }

      case "rpc": {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${table}`, {
          method: "POST",
          headers: svcHeaders,
          body: JSON.stringify(payload || {}),
        });
        const data = await r.json();
        result = { data, error: r.ok ? null : { message: await r.text() } };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown op: ${op}` }), { headers: cors, status: 400 });
    }

    return new Response(JSON.stringify({ data: result.data ?? null, error: result.error ?? null }), { headers: cors, status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return new Response(JSON.stringify({ error: msg }), { headers: cors, status: 500 });
  }
});
