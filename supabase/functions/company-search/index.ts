// Supabase Edge Function: company-search
// Proxies tianyancha.com search results by parsing server-rendered __NEXT_DATA__ JSON

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const BROWSER_HEADERS = {
  "User-Agent": UA,
  "Accept":
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
  "Sec-Ch-Ua":
    '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

interface CompanyResult {
  name: string;
  legalPerson: string;
  regStatus: string;
  regCapital: string;
  base: string;
  creditCode: string;
}

serve(async (req: Request) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers, status: 204 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const query = q.trim();

  if (!query || query.length < 2) {
    return new Response(
      JSON.stringify({ error: "query too short", results: [] }),
      { headers, status: 200 },
    );
  }

  try {
    const searchUrl =
      `https://www.tianyancha.com/search?key=${encodeURIComponent(query)}`;

    const resp = await fetch(searchUrl, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
    });

    if (!resp.ok) {
      return new Response(
        JSON.stringify({ error: `upstream error: ${resp.status}`, results: [] }),
        { headers, status: 200 },
      );
    }

    const html = await resp.text();

    // Extract __NEXT_DATA__ JSON
    const match = html.match(
      /<script\s+id="__NEXT_DATA__"[^>]*>\s*(\{[\s\S]*?\})\s*<\/script>/,
    );
    if (!match) {
      return new Response(
        JSON.stringify({ error: "no data found in page", results: [] }),
        { headers, status: 200 },
      );
    }

    const nextData = JSON.parse(match[1]);
    const listRes = nextData?.props?.pageProps?.listRes;
    if (!listRes?.data?.companyList) {
      return new Response(
        JSON.stringify({ error: "no company list", results: [] }),
        { headers, status: 200 },
      );
    }

    const companies: CompanyResult[] = listRes.data.companyList.map((c) => ({
      name: c.name?.replace(/<\/?em>/g, "") || "",
      legalPerson: c.legalPersonName || "",
      regStatus: c.regStatus || "",
      regCapital: c.regCapital || "",
      base: c.base || "",
      creditCode: c.creditCode || "",
    }));

    return new Response(
      JSON.stringify({ results: companies.slice(0, 10) }),
      { headers, status: 200 },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return new Response(
      JSON.stringify({ error: msg, results: [] }),
      { headers, status: 200 },
    );
  }
});