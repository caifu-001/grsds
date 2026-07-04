// Supabase Edge Function: admin-proxy v2
// Uses Deno.serve() with zero external dependencies

Deno.serve(async (req) => {
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

  const corsHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { headers: corsHeaders, status: 405 }
    );
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return new Response(
        JSON.stringify({ error: "Server config error: missing env vars" }),
        { headers: corsHeaders, status: 500 }
      );
    }

    const body = await req.json();
    const { op, table, payload, query, filters } = body;

    const svcHeaders = {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: "Bearer " + SUPABASE_SERVICE_KEY,
      "Content-Type": "application/json",
    };

    // Build URL with query params for select
    function buildSelectUrl(table, queryStr, filterArr) {
      var qs = queryStr || "*";
      var eqs = [];
      if (filterArr && filterArr.length) {
        for (var i = 0; i < filterArr.length; i++) {
          var f = filterArr[i];
          if (f.op === "eq") {
            eqs.push(f.col + "=eq." + encodeURIComponent(String(f.val)));
          } else if (f.op === "order") {
            qs += "&order=" + encodeURIComponent(f.val || f.col) + (f.opts ? "." + f.opts : "");
          } else if (f.op === "neq") {
            eqs.push(f.col + "=neq." + encodeURIComponent(String(f.val)));
          } else if (f.op === "in") {
            eqs.push(f.col + "=in.(" + encodeURIComponent(String(f.val)) + ")");
          } else if (f.op === "is") {
            eqs.push(f.col + "=is." + encodeURIComponent(String(f.val)));
          } else if (f.op === "ilike") {
            eqs.push(f.col + "=ilike." + encodeURIComponent(String(f.val)));
          }
        }
      }
      if (eqs.length) {
        qs += "&" + eqs.join("&");
      }
      return SUPABASE_URL + "/rest/v1/" + table + "?select=" + qs;
    }

    var result = { data: null, error: null };
    var r, respText, respJson;

    switch (op) {
      case "select":
        var selectUrl = buildSelectUrl(table, query, filters);
        r = await fetch(selectUrl, { headers: svcHeaders });
        respText = await r.text();
        respJson = respText ? JSON.parse(respText) : null;
        result = {
          data: r.ok ? respJson : null,
          error: r.ok ? null : { message: respJson || respText }
        };
        break;

      case "insert":
        r = await fetch(SUPABASE_URL + "/rest/v1/" + table, {
          method: "POST",
          headers: Object.assign({}, svcHeaders, { Prefer: "return=representation" }),
          body: JSON.stringify(payload),
        });
        respText = await r.text();
        respJson = respText ? JSON.parse(respText) : null;
        result = {
          data: r.ok ? respJson : null,
          error: r.ok ? null : { message: respJson || respText }
        };
        break;

      case "update":
        var f0 = filters && filters.length ? filters[0] : null;
        var updateUrl = SUPABASE_URL + "/rest/v1/" + table;
        if (f0) {
          updateUrl += "?" + f0.col + "=eq." + encodeURIComponent(String(f0.val));
        }
        r = await fetch(updateUrl, {
          method: "PATCH",
          headers: Object.assign({}, svcHeaders, { Prefer: "return=representation" }),
          body: JSON.stringify(payload),
        });
        respText = await r.text();
        respJson = respText ? JSON.parse(respText) : null;
        result = {
          data: r.ok ? respJson : null,
          error: r.ok ? null : { message: respJson || respText }
        };
        break;

      case "delete":
        var df0 = filters && filters.length ? filters[0] : null;
        var deleteUrl = SUPABASE_URL + "/rest/v1/" + table;
        if (df0) {
          deleteUrl += "?" + df0.col + "=eq." + encodeURIComponent(String(df0.val));
        }
        r = await fetch(deleteUrl, { method: "DELETE", headers: svcHeaders });
        respText = await r.text();
        result = {
          data: r.ok ? (respText ? JSON.parse(respText) : null) : null,
          error: r.ok ? null : { message: respText }
        };
        break;

      case "upsert":
        r = await fetch(SUPABASE_URL + "/rest/v1/" + table, {
          method: "POST",
          headers: Object.assign({}, svcHeaders, { Prefer: "resolution=merge-duplicates,return=representation" }),
          body: JSON.stringify(payload),
        });
        respText = await r.text();
        respJson = respText ? JSON.parse(respText) : null;
        result = {
          data: r.ok ? respJson : null,
          error: r.ok ? null : { message: respJson || respText }
        };
        break;

      case "rpc":
        r = await fetch(SUPABASE_URL + "/rest/v1/rpc/" + table, {
          method: "POST",
          headers: svcHeaders,
          body: JSON.stringify(payload || {}),
        });
        respText = await r.text();
        respJson = respText ? JSON.parse(respText) : null;
        result = {
          data: r.ok ? respJson : null,
          error: r.ok ? null : { message: respJson || respText }
        };
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Unknown op: " + op }),
          { headers: corsHeaders, status: 400 }
        );
    }

    return new Response(
      JSON.stringify({ data: result.data || null, error: result.error || null }),
      { headers: corsHeaders, status: 200 }
    );

  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown error" }),
      { headers: corsHeaders, status: 500 }
    );
  }
});
