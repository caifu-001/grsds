// Supabase Edge Function: admin-proxy
// 安全代理：所有需要 service_role 权限的操作统一走这个函数
// 前端不再暴露 SUPABASE_SERVICE_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers, status: 204 });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers,
      status: 405,
    });
  }

  try {
    // 解析请求
    const body = await req.json();
    const { op, table, method, payload, query, filters } = body;

    // 从 Authorization header 提取用户 JWT 验证身份
    const authHeader = req.headers.get("Authorization") || "";
    const userJWT = authHeader.replace("Bearer ", "");

    // 创建 service_role client
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });

    let result;

    switch (op) {
      // ========== Generic CRUD Proxy ==========
      case "select": {
        let q = sb.from(table).select(query || "*");
        if (filters) {
          for (const f of filters) {
            if (f.op === "eq") q = q.eq(f.col, f.val);
            else if (f.op === "neq") q = q.neq(f.col, f.val);
            else if (f.op === "in") q = q.in(f.col, f.val);
            else if (f.op === "is") q = q.is(f.col, f.val);
            else if (f.op === "ilike") q = q.ilike(f.col, f.val);
            else if (f.op === "order") q = q.order(f.col, f.opts);
          }
        }
        const selectRes = await q;
        result = { data: selectRes.data, error: selectRes.error };
        break;
      }

      case "insert":
        result = await sb.from(table).insert(payload).select(query || "*");
        break;

      case "update":
        result = await sb.from(table).update(payload)
          .eq(filters?.[0]?.col, filters?.[0]?.val).select(query || "*");
        break;

      case "delete":
        result = await sb.from(table).delete()
          .eq(filters?.[0]?.col, filters?.[0]?.val);
        break;

      case "upsert":
        result = await sb.from(table).upsert(payload, filters?.[0]?.opts || {})
          .select(query || "*");
        break;

      // ========== RPC Proxy ==========
      case "rpc":
        result = await sb.rpc(table, payload || {});
        break;

      // ========== Storage Proxy ==========
      case "storage_upload": {
        const { bucket, filePath, fileBuffer, contentType } = payload;
        const blob = new Blob(
          [Uint8Array.from(atob(fileBuffer), (c) => c.charCodeAt(0))],
          { type: contentType },
        );
        result = await sb.storage.from(bucket).upload(filePath, blob, {
          contentType,
          upsert: false,
        });
        break;
      }

      case "storage_remove":
        result = await sb.storage.from(payload.bucket).remove(payload.paths);
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown op: ${op}` }),
          { headers, status: 400 },
        );
    }

    return new Response(
      JSON.stringify({
        data: result?.data ?? null,
        error: result?.error ?? null,
      }),
      { headers, status: 200 },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { headers, status: 500 },
    );
  }
});
