import { BOATS, TARGET, fetchBoatStatus } from "./lib/boats.mjs";

// GET /.netlify/functions/status  →  현재 잔여석을 즉시 긁어 JSON 반환
export default async () => {
  const boats = await Promise.all(
    BOATS.map(async (b) => {
      try {
        const res = await fetchBoatStatus(b, TARGET);
        return { id:b.id, name:b.name, port:b.port, base:b.base, tel:b.tel, ...res };
      } catch (e) {
        return { id:b.id, name:b.name, port:b.port, base:b.base, tel:b.tel, state:"fail" };
      }
    })
  );

  return new Response(
    JSON.stringify({ target: TARGET, checkedAt: new Date().toISOString(), boats }),
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "access-control-allow-origin": "*",
        "cache-control": "no-store",
      },
    }
  );
};
