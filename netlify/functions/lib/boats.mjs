// ─────────────────────────────────────────────────────────────
//  알림 기본 감시일 (대시보드에서 바꾸면 이 값은 무시되고 Blobs 값 사용)
// ─────────────────────────────────────────────────────────────
export const DEFAULT_WATCH = { ymd: "2026-09-06" };

// 선상24 계열만 자동 파싱 가능 (잔여석이 텍스트라서)
export const BOATS = [
  { id:"challenger", name:"챌린저호",        port:"연안부두", base:"https://challengerho.sunsang24.com", tel:"010-5102-9938" },
  { id:"teamf",      name:"팀에프(원·투호)",  port:"연안부두", base:"https://teamf.sunsang24.com",        tel:"010-5102-9938" },
  { id:"myeong",     name:"명낚시",           port:"만석부두", base:"https://mfish.sunsang24.com",         tel:"" },
];

// "2026-09-06" → { ym:"202609", month:9, day:6, label:"9월 6일(일)" }
export function ymParts(ymd){
  const [y, m, d] = ymd.split("-").map(Number);
  const ym = String(y) + String(m).padStart(2, "0");
  const dow = ["일","월","화","수","목","금","토"][new Date(y, m - 1, d).getDay()];
  return { y, ym, month: m, day: d, label: `${m}월 ${d}일(${dow})` };
}

// 특정 날짜 구간에서 "남은자리 N명" / "예약마감"만 신뢰
// 날짜는 "9월6일" "9월 6일" "9 월 06 일" 등 표기 흔들려도 매칭
export function parseSeat(rawHtml, month, day){
  const text = rawHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const re = new RegExp(month + "\\s*월\\s*0?" + day + "\\s*일");
  const m = text.match(re);
  if (!m) return { state: "unknown" };

  const after = text.slice(m.index + m[0].length);
  const nextDay = after.search(/\d{1,2}\s*월\s*\d{1,2}\s*일/); // 다음 날짜 전까지
  const seg = nextDay > 0 ? after.slice(0, nextDay) : after.slice(0, 1500);

  const open = seg.match(/남은자리\s*(\d+)\s*명/);
  if (open) return { state: "open", seats: parseInt(open[1], 10) };
  if (/예약\s*마감/.test(seg) || /대기하기/.test(seg)) return { state: "full" };
  return { state: "unknown" };
}

export async function fetchBoatStatus(boat, ym, month, day){
  const url = `${boat.base}/ship/schedule_fleet/${ym}`;
  const r = await fetch(url, {
    headers: {
      // 일반 브라우저로 위장 — 사이트가 다른 페이지를 주는 것 방지
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "accept-language": "ko-KR,ko;q=0.9",
    },
  });
  if (!r.ok) throw new Error("http " + r.status);
  const html = await r.text();
  return parseSeat(html, month, day);
}
