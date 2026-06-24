import { BOATS, DEFAULT_WATCH, ymParts, fetchBoatStatus } from "./lib/boats.mjs";

// GET /.netlify/functions/status?date=2026-09-06
// 날짜 안 주면 기본 감시일 사용
export default async (req) => {
  const url = new URL(req.url);
  const date = url.searchParams.get("date") || DEFAULT_WATCH.ymd;
  const { ym, month, day, label } = ymParts(date);

  const boats = await Promise.all(
    BOATS.map(async (b) => {
      try {
        const res = await fetchBoatStatus(b, ym, month, day);
        return { id:b.id, name:b.name, port:b.port, base:b.base, tel:b.tel, ...res };
      } catch (e) {
        return { id:b.id, name:b.name, port:b.port, base:b.base, tel:b.tel, state:"fail" };
      }
    })
  );

  return new Response(
    JSON.stringify({ date, label, ym, checkedAt: new Date().toISOString(), boats }),
    { headers: {
        "content-type": "application/json; charset=utf-8",
        "access-control-allow-origin": "*",
        "cache-control": "no-store",
    } }
  );
};
