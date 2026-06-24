// ─────────────────────────────────────────────────────────────
//  타깃 날짜 / 대상 선박  ← 날짜 바꾸려면 여기만 수정
// ─────────────────────────────────────────────────────────────
export const TARGET = {
  label:  "9월 6일(일)",  // 알림 문구용
  needle: "9월6일",        // 페이지에서 찾을 날짜 텍스트 (공백/괄호 없이)
  ym:     "202609",        // 선상24 월 URL (YYYYMM)
};

// 선상24 계열만 자동 파싱 가능 (잔여석이 텍스트라서)
export const BOATS = [
  { id:"challenger", name:"챌린저호",       port:"연안부두", base:"https://challengerho.sunsang24.com", tel:"010-5102-9938" },
  { id:"teamf",      name:"팀에프(원·투호)", port:"연안부두", base:"https://teamf.sunsang24.com",       tel:"010-5102-9938" },
  { id:"myeong",     name:"명낚시",          port:"만석부두", base:"https://mfish.sunsang24.com",        tel:"" },
];

// ─────────────────────────────────────────────────────────────
//  파서: 특정 날짜 구간에서 "남은자리 N명" / "예약마감"만 신뢰
//  (모든 행에 깔린 범례 '예약대기·출조대기' 등은 무시)
// ─────────────────────────────────────────────────────────────
export function parseSeat(rawHtml, needle){
  const text = rawHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const start = text.indexOf(needle);
  if (start < 0) return { state:"unknown" };

  const after = text.slice(start + needle.length);
  const nextDay = after.search(/\d{1,2}\s*월\s*\d{1,2}\s*일/); // 다음 날짜 전까지
  const seg = nextDay > 0 ? after.slice(0, nextDay) : after.slice(0, 1500);

  const open = seg.match(/남은자리\s*(\d+)\s*명/);
  if (open) return { state:"open", seats: parseInt(open[1], 10) };
  if (/예약\s*마감/.test(seg) || /대기하기/.test(seg)) return { state:"full" };
  return { state:"unknown" };
}

export async function fetchBoatStatus(boat, target){
  const url = `${boat.base}/ship/schedule_fleet/${target.ym}`;
  const r = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; JjukkumiSeatWatcher/1.0)" },
  });
  if (!r.ok) throw new Error("http " + r.status);
  const html = await r.text();
  return parseSeat(html, target.needle);
}
