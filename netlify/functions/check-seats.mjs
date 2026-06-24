import { getStore } from "@netlify/blobs";
import { BOATS, TARGET, fetchBoatStatus } from "./lib/boats.mjs";

// 5분마다 실행 (Netlify가 이 schedule을 읽어 자동 등록)
export const config = { schedule: "*/5 * * * *" };

export default async () => {
  const store = getStore("jjukkumi");
  const prev = (await store.get("state", { type: "json" })) || {};
  const now = {};
  const opened = [];

  for (const b of BOATS) {
    let res;
    try { res = await fetchBoatStatus(b, TARGET); }
    catch { res = { state: "fail" }; }

    now[b.id] = res.state === "open"
      ? { state: "open", seats: res.seats }
      : { state: res.state };

    const was = prev[b.id]?.state;
    // 직전이 '확실한 비-open'(full/unknown) 이었는데 지금 open → 새로 자리가 뜬 것
    if (res.state === "open" && was && was !== "open" && was !== "fail") {
      opened.push({ ...b, seats: res.seats });
    }
  }

  await store.setJSON("state", now);
  if (opened.length) await notify(opened);

  return new Response("checked " + new Date().toISOString() + " " + JSON.stringify(now));
};

async function notify(boats) {
  const lines = boats.map(
    (b) => `• ${b.name} 남은자리 ${b.seats}명${b.tel ? " ☎ " + b.tel : ""}\n  ${b.base}/ship/schedule_fleet/${TARGET.ym}`
  );
  const msg = `🐙 ${TARGET.label} 쭈꾸미 자리 떴어요!\n${lines.join("\n")}`;

  // ── 알림 방식 1: 텔레그램 봇 (추천) ──
  // BotFather로 봇 만들고, 환경변수 TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID 설정.
  await sendTelegram(msg);

  // ── 알림 방식 2: 범용 웹훅 (Discord / Slack / 카카오워크 / Make) ──
  // 환경변수 NOTIFY_WEBHOOK 에 웹훅 URL 넣으면 동작 (텔레그램과 동시에 써도 됨).
  const hook = process.env.NOTIFY_WEBHOOK;
  if (hook) {
    try {
      await fetch(hook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: msg, text: msg }), // Discord=content, Slack=text
      });
    } catch (e) {
      console.error("webhook fail:", e);
    }
  }

  // ── 알림 방식 3: 한국 문자(SMS) — 솔라피 ──  (README 참고, 주석 해제 후 사용)
  // await sendSolapiSMS(msg);

  console.log(msg);
}

async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return; // 설정 안 했으면 조용히 건너뜀

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true, // 링크 미리보기 끔 (여러 개라 깔끔하게)
      }),
    });
    if (!r.ok) console.error("telegram fail:", r.status, await r.text());
  } catch (e) {
    console.error("telegram error:", e);
  }
}
