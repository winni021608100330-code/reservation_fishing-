import { getStore } from "@netlify/blobs";
import { BOATS, DEFAULT_WATCH, ymParts, fetchBoatStatus } from "./lib/boats.mjs";

// 5분마다 실행 (Netlify가 이 schedule을 읽어 자동 등록)
export const config = { schedule: "*/5 * * * *" };

export default async () => {
  const store = getStore("jjukkumi");
  const watch = (await store.get("watchDate", { type: "json" })) || DEFAULT_WATCH;
  const { ym, month, day, label } = ymParts(watch.ymd);

  const prev = (await store.get("state", { type: "json" })) || {};
  const now = {};
  const opened = [];

  for (const b of BOATS) {
    let res;
    try { res = await fetchBoatStatus(b, ym, month, day); }
    catch { res = { state: "fail" }; }

    now[b.id] = res.state === "open" ? { state:"open", seats:res.seats } : { state:res.state };

    const was = prev[b.id]?.state;
    // 직전이 '확실한 비-open'이었는데 지금 open → 새로 자리가 뜬 것
    if (res.state === "open" && was && was !== "open" && was !== "fail") {
      opened.push({ ...b, seats: res.seats });
    }
  }

  await store.setJSON("state", now);
  if (opened.length) await notify(opened, label, ym);

  return new Response("checked " + watch.ymd + " " + JSON.stringify(now));
};

async function notify(boats, label, ym) {
  const lines = boats.map(
    (b) => `• ${b.name} 남은자리 ${b.seats}명${b.tel ? " ☎ " + b.tel : ""}\n  ${b.base}/ship/schedule_fleet/${ym}`
  );
  const msg = `🐙 ${label} 쭈꾸미 자리 떴어요!\n${lines.join("\n")}`;

  // ── 알림 1: 텔레그램 봇 (추천) ──
  await sendTelegram(msg);

  // ── 알림 2: 범용 웹훅 (Discord / Slack / 카카오워크 / Make) ──
  const hook = process.env.NOTIFY_WEBHOOK;
  if (hook) {
    try {
      await fetch(hook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: msg, text: msg }),
      });
    } catch (e) { console.error("webhook fail:", e); }
  }

  console.log(msg);
}

async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    if (!r.ok) console.error("telegram fail:", r.status, await r.text());
  } catch (e) { console.error("telegram error:", e); }
}
