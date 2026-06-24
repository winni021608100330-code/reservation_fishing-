import { getStore } from "@netlify/blobs";
import { DEFAULT_WATCH } from "./lib/boats.mjs";

const CORS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "cache-control": "no-store",
};

// GET  /.netlify/functions/watch              → 현재 감시일 반환
// GET  /.netlify/functions/watch?set=2026-09-06 → 감시일 변경
export default async (req) => {
  const store = getStore("jjukkumi");
  const url = new URL(req.url);
  const set = url.searchParams.get("set");

  if (set && /^\d{4}-\d{2}-\d{2}$/.test(set)) {
    await store.setJSON("watchDate", { ymd: set });
    // 날짜가 바뀌면 직전 상태를 비워서, 새 날짜 기준으로 알림이 정상 동작하게 함
    try { await store.delete("state"); } catch (e) {}
    return new Response(JSON.stringify({ ok: true, ymd: set }), { headers: CORS });
  }

  const w = (await store.get("watchDate", { type: "json" })) || DEFAULT_WATCH;
  return new Response(JSON.stringify(w), { headers: CORS });
};
