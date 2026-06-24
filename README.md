# 🐙 인천 쭈꾸미 자리 감시기 (Netlify)

선상24 계열 낚싯배의 **9/6 잔여석을 서버에서 직접 읽어** 대시보드에 표시하고,
**마감 → 자리남으로 바뀌면 알림**을 보내는 미니 서비스입니다. 프록시 불필요.

대상(자동): 챌린저호 · 팀에프 · 명낚시 (선상24 계열, 잔여석이 텍스트라 파싱 가능)
직접 확인: 인천제일바다낚시(좌석이 이미지) · 우리바다 · 칸피싱

---

## 구성

```
netlify-jjukkumi/
├─ netlify.toml                     배포 설정
├─ package.json                     @netlify/blobs 의존성
├─ public/index.html                대시보드 (status 함수 호출)
└─ netlify/functions/
   ├─ lib/boats.mjs                 선박 목록 + 날짜 + 파서 (공통)
   ├─ status.mjs                    호출 시 즉시 잔여석 JSON 반환
   └─ check-seats.mjs               5분마다 자동 체크 + 자리 뜨면 알림
```

---

## 배포 (3분)

### 방법 A — Netlify CLI
```bash
cd netlify-jjukkumi
npm install
npx netlify deploy --prod        # 처음이면 사이트 생성 마법사가 뜸
```

### 방법 B — Git 연결
GitHub에 올리고 Netlify에서 "Add new site → Import"만 하면 끝.
`netlify.toml`에 publish/functions가 지정돼 있어 추가 설정 불필요.

배포되면:
- 대시보드: `https<your-site>.netlify.app/`
- 스케줄 함수: `check-seats.mjs`의 `export const config = { schedule }` 를
  Netlify가 자동 인식해 5분마다 실행 (별도 등록 X)

---

## 알림 켜기 (선택)

`check-seats`가 **자리 뜸**을 감지하면 알림을 보냅니다.
폰으로 바로 받는 건 **텔레그램 봇**이 제일 깔끔합니다(무료).

### 텔레그램 봇 만들기 (5분)

1. **봇 생성** — 텔레그램에서 **@BotFather** 검색 → `/newbot` →
   봇 이름과 사용자명(끝이 `bot`) 입력 → **토큰** 발급됨
   (`123456789:AAH...` 형태). 이게 `TELEGRAM_BOT_TOKEN`.

2. **내 chat id 알아내기**
   - 방금 만든 봇을 열어서 아무 메시지나 한 번 보냅니다(`안녕` 등). ← 이걸 먼저 해야 함
   - 브라우저에서 아래 주소 열기 (토큰 자리에 본인 토큰):
     ```
     https://api.telegram.org/bot<토큰>/getUpdates
     ```
   - 응답 JSON에서 `"chat":{"id": 숫자 ...}` 의 그 숫자가 `TELEGRAM_CHAT_ID`.
   - (간단 대안: 텔레그램에서 **@userinfobot** 에게 말 걸면 id를 알려줌)

3. **Netlify 환경변수 등록** — Site settings → **Environment variables**:
   ```
   TELEGRAM_BOT_TOKEN = 123456789:AAH...
   TELEGRAM_CHAT_ID   = 위에서 찾은 숫자
   ```

4. **재배포**. 끝. 9/6에 자리가 뜨면 봇이 메시지를 쏩니다.

> 첫 실행은 알림이 안 갑니다(직전 상태가 없어서). 이후 **마감→자리남** 전환 때만 울립니다.
> 잘 되는지 바로 보려면, `lib/boats.mjs`의 `needle`을 지금 자리가 있는 날짜(예: 9월7일)로
> 잠깐 바꿔 배포 → 두 번째 폴링부터 알림이 오는지 확인하고 다시 9월6일로 되돌리면 됩니다.

### (대안) 범용 웹훅 — Discord / Slack / 카카오워크 / Make
환경변수 `NOTIFY_WEBHOOK` 에 웹훅 URL을 넣으면 텔레그램과 **동시에** 보냅니다.

### 한국 문자(SMS)로 받고 싶다면 — 솔라피(Solapi) 예시
`check-seats.mjs`의 `notify()` 안 주석을 풀고, 아래 함수를 추가하세요.
환경변수 `SOLAPI_KEY`, `SOLAPI_SECRET`, `SMS_FROM`(발신번호), `SMS_TO`(수신번호) 필요.

```js
import crypto from "node:crypto";
async function sendSolapiSMS(text){
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString("hex");
  const sig = crypto.createHmac("sha256", process.env.SOLAPI_SECRET)
    .update(date + salt).digest("hex");
  await fetch("https://api.solapi.com/messages/v4/send", {
    method:"POST",
    headers:{
      "content-type":"application/json",
      Authorization:`HMAC-SHA256 apiKey=${process.env.SOLAPI_KEY}, date=${date}, salt=${salt}, signature=${sig}`,
    },
    body: JSON.stringify({ message:{ to:process.env.SMS_TO, from:process.env.SMS_FROM, text } }),
  });
}
```

(이메일이 편하면 Resend·SendGrid 등으로 같은 자리에 한 줄 fetch 붙이면 됩니다.)

---

## 날짜·선박 바꾸기

`netlify/functions/lib/boats.mjs` 상단만 수정:

```js
export const TARGET = { label:"9월 6일(일)", needle:"9월6일", ym:"202609" };
```
- 다른 날짜: `needle`("9월13일")과 `ym`(해당 월)만 맞추면 됩니다.
- 배 추가: 선상24 계열이면 `BOATS`에 `{ id, name, port, base, tel }` 한 줄 추가.
  `base`는 그 배의 선상24 주소(예: `https://xxx.sunsang24.com`).

`public/index.html` 상단 `YM`도 같은 값으로 맞춰주세요.

---

## 로컬 테스트
```bash
npx netlify dev
# http://localhost:8888  → 대시보드
# http://localhost:8888/.netlify/functions/status  → JSON 확인
```

---

## 알아둘 점
- **팀에프 페이지엔 배가 2척**이라, 파서는 그날 첫 상태 한 건만 읽습니다(보수적). 정확히는 캘린더 직접 확인.
- 5분 간격은 상대 서버에 부담 안 주는 선. 더 자주는 권하지 않습니다.
- 사이트 구조가 바뀌면 파서(`parseSeat`)를 손봐야 할 수 있어요. "남은자리 N명 / 예약마감" 텍스트 기준입니다.
- 잔여석은 실시간으로 바뀌니, 알림 받으면 **바로 전화**가 안전합니다(특히 9/6은 1자리 단위로 사라짐).
