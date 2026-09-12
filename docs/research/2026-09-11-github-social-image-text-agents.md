# GitHub 上可產出社群圖文（FB 發文）的 agent／工具

- **研究日期：** 2026-09-11
- **範圍：** GitHub 上能產出 Facebook 發文用「圖 + 文」的 agent、Claude/Cursor skill、以及可排程發佈的開源工具。以各 repo README、官方文件為準。
- **免責：** 星數、授權、功能以當日 GitHub／官方頁為準，之後會變。Meta Graph API **只能發粉專（Page）**，不能發個人塗鴉牆。
- **本 repo 慣例：** 外部產業研究放 `docs/research/`，不寫入 `CONTEXT.md` 或 ADR。

---

## 結論（先看這段）

GitHub 上**幾乎沒有「一個 repo 就同時把圖文品質做到很好、又能一鍵發 FB」的成熟產品**。實務上要拆兩層：

1. **產內容（圖 + 文）**：用 Cursor / Claude skill 或輕量 Python agent。
2. **發出去（排程／發粉專）**：用 Postiz 這類排程器。

給「自己要在 FB 發圖文」的人，優先順序：

| 順位 | 專案 | 星數（當日） | 圖 | 文 | 發 FB | 適不適合你 |
|------|------|-------------|----|----|-------|------------|
| 1 | [indranilbanerjee/socialforge](https://github.com/indranilbanerjee/socialforge) | 38 | 有（Vertex / fal / Replicate） | 有（含 Facebook） | 否（產檔給人審） | **最像「產圖文的 agent」**，可裝進 Cursor |
| 2 | [rediumvex/social-media-caption-generator-claude](https://github.com/rediumvex/social-media-caption-generator-claude) | 119 | 無 | 有（FB Page + Group 分開寫） | 否 | **文案最好用的 Claude skill**；圖要另外產 |
| 3 | [gitroomhq/postiz-app](https://github.com/gitroomhq/postiz-app) + [gitroomhq/postiz-agent](https://github.com/gitroomhq/postiz-agent) | 35,709 / 458 | 有（MCP `generateImageTool`） | agent 可寫文 | 有（粉專） | **最成熟的發文／排程**；圖文品質不是賣點 |
| 4 | [Ninadnj/meta-social-agent](https://github.com/Ninadnj/meta-social-agent) | 0 | 有（HTML→PNG 品牌圖） | 有 | 有（粉專） | 流程完整、星數為 0；模板偏餐廳品牌 |
| 5 | [DataTalksClub/carousel-automation](https://github.com/DataTalksClub/carousel-automation) | 6 | 有（HTML/CSS 輪播圖） | 你自己填文 | 否 | 要「像 Canva 的輪播圖」而不是 AI 亂畫時很好 |

**不建議當主力：** GitHub 上大量 0 星「AI Social Media Post Generator」學生專案（例如 `vonderheiden/AI-Social-Media-Post-Generator`）。README 寫支援 Facebook，但沒有社群、沒有維護訊號。

**實務組合（最划算）：**

- 文：`social-media-caption-generator-claude`（或 Cursor 直接寫）
- 圖：SocialForge（品牌合成）**或** Postiz `generateImageTool`（快速 AI 圖）**或** HTML 模板渲染（看起來比較像正式貼文，不是 AI 風景圖）
- 發：Postiz（粉專 OAuth + 排程）

---

## 1. SocialForge — Cursor / Claude 上的產製引擎

來源：[README](https://github.com/indranilbanerjee/socialforge/blob/main/README.md)（raw，研究當日）。

- **是什麼：** 開源「社群月曆產製引擎」。20 個 skills、25 個 commands、5 個 agents（image compositor、carousel builder、copy adapter、quality reviewer、compliance checker）。
- **圖：** 預設 Google Cloud Vertex AI（Gemini Nano Banana 2 / Pro）；也可接 fal.ai、Replicate。原則是「品牌照片像素不變，AI 只做場景／背景」。也可 HTML/Playwright 渲 1080×1080 輪播。
- **文：** 一次產出 Instagram、TikTok、LinkedIn、Threads、X、**Facebook**、YouTube Shorts 的平台文案。
- **發文：** 不做自動發佈。流程是 `/generate-all` → 人審 gallery → 打包交付。另有 opt-in HTTP connector 含 Canva。
- **怎麼裝（Cursor 2.5+，README 原文）：**  
  `/add-plugin socialforge@https://github.com/indranilbanerjee/socialforge`
- **代價：** 生圖要 Vertex 服務帳號（或 fal/Replicate）。README 寫約 **USD 0.01–0.04 / 張**。沒跑 `/socialforge:setup` 就不會生圖（其它日曆／文案功能仍可用）。
- **授權：** MIT（README badge）。
- **誠實評價：** 功能描述最接近「社群圖文 agent」，而且明確支援 Cursor。星數只有 38，偏 agency／月曆產線，一個人發幾則 FB 會覺得重。但若要「不錯的圖 + 分平台文」，這是 GitHub 上最完整的一套。

---

## 2. Social Media Caption Generator — 只管文、FB 寫得細

來源：[README](https://raw.githubusercontent.com/rediumvex/social-media-caption-generator-claude/main/README.md)、[repo 頁](https://github.com/rediumvex/social-media-caption-generator-claude)（119 stars，MIT）。

- **是什麼：** Claude skill。作者自稱用在 [@theromanknox](https://www.instagram.com/theromanknox)（README 寫 300K+ followers）。
- **產出：** 7 種 caption，其中 Facebook **粉專／個人** 與 **社團** 分開：
  - Page：短文（README：40–80 字）、避開 trigger words
  - Group：社團語氣 + 討論提問
- **圖：** 沒有。可吃截圖當輸入，但輸出是文案。
- **安裝：** `git clone` 到 `~/.claude/skills`，指令 `/social-captions`。
- **誠實評價：** GitHub 上「FB 文案 skill」裡星數最高、說明最具體。若你只要貼文文字，先裝這個。圖要另找。

---

## 3. Postiz — 最成熟的「agent 發 FB」棧

來源：

- [gitroomhq/postiz-app](https://github.com/gitroomhq/postiz-app)（README：開源 self-host 排程器，AGPL-3.0；當日 **35,709** stars）
- [gitroomhq/postiz-agent](https://github.com/gitroomhq/postiz-agent)（當日 **458** stars；`npx skills add gitroomhq/postiz-agent`）
- 官方 MCP：[Tools](https://docs.postiz.com/mcp/tools)、[Examples：AI 生圖再發文](https://docs.postiz.com/mcp/examples)
- 官方 FB：[Providers / Facebook](https://docs.postiz.com/providers/facebook)、[API Facebook settings](https://docs.postiz.com/public-api/providers/facebook)

**官方明文有的能力：**

- MCP `generateImageTool`：用 prompt 生圖，回傳 `id` + `path`，再塞進 `schedulePostTool` 的 `attachments`。
- `schedulePostTool` 支援 Facebook；comment-based 平台（含 FB）第一則是貼文、其餘當留言。
- Facebook 整合是 **Pages**；要 `pages_manage_posts` 等權限。App 若停在 Development，非管理員會看不到圖。

**Cursor：** postiz-agent README 寫有 `.cursor-plugin/plugin.json`；技能驅動 `postiz` CLI（圖／影片必須走 CLI 上傳）。需 `npm install -g postiz` 並 `postiz auth:login`。

**誠實評價：** 這是 GitHub 上社群發文工具的「基礎設施」。AI 圖是通用文生圖，**不是**品牌排版／卡片風。適合「已經有文案、要排程發粉專」。不要指望它單獨寫出高轉換 FB 文。

---

## 4. Meta Social Agent — 小而完整的 FB/IG/Threads 管線

來源：[README](https://raw.githubusercontent.com/Ninadnj/meta-social-agent/main/README.md)、[repo 頁](https://github.com/Ninadnj/meta-social-agent)（0 stars）。

流程（README 原文）：

`plan post → write caption → render image (HTML→PNG via Playwright) → publish Facebook Page / Instagram / Threads`

- FB：本地檔上傳 `/{page}/photos`，再把 CDN URL 借給 IG／Threads（後兩者不能直接傳本地檔）。
- LLM 可關：沒有 `OPENAI_API_KEY` 就用模板引擎。`--dry-run` 可整條跑、不發文。
- 實作品牌是希臘餐廳 Lord of the Wings（希臘文 caption）；作者說換 `config.json` + `templates/` 就能換品牌。

**誠實評價：** 架構對「FB 粉專圖文」最對口（品牌 HTML 圖比亂生的 AI 風景更像貼文）。星數 0、等於個人專案，當參考實作可以，當長期依賴要自己 fork。

---

## 5. 輪播／海報型「圖」——看起來比較像社群貼文

AI 亂生的風景圖在 FB 往往不像「貼文」。比較像 Canva 的路線是 **HTML/CSS → Playwright PNG**：

| 專案 | 星數 | 做什麼 |
|------|------|--------|
| [indranilbanerjee/socialforge `render-carousels`](https://github.com/indranilbanerjee/socialforge/blob/main/skills/render-carousels/SKILL.md) | （同上 38） | 1080×1080 HTML→PNG，品牌色／字型 |
| [DataTalksClub/carousel-automation](https://github.com/DataTalksClub/carousel-automation) | 6 | JSON 填模板，渲 PNG + PDF |
| [tns-research/fog-agents](https://github.com/tns-research/fog-agents) `agents/carousel-builder` | 4 | Cursor/Claude 從主題做到 PDF/PNG；可選 fal `nano-banana-pro` |

來源：各 repo README／SKILL.md。

---

## 6. 排程但較少「agent 生圖文」

- [inovector/mixpost](https://github.com/inovector/mixpost)：3,686 stars。Buffer 替代、可 self-host、發 Facebook Pages。Lite 免費平台少；進階 AI 圖文在 Pro。**不是 content agent。**
- [pendpost/pendpost](https://github.com/pendpost/pendpost)：8 stars，MIT，MCP-native，agent 起草＋人審再發（含 Facebook）。偏排程／審批，不是生圖引擎。
- [Lee-unhn/daily-social-autopost](https://github.com/Lee-unhn/daily-social-autopost)：0 stars。本機 ComfyUI 生圖 + 發 IG／FB 粉專／Threads。主題綁 GitHub trending／科技新聞，不適合一般品牌貼文。

---

## 7. 明確不推當主力的類型

- `vonderheiden/AI-Social-Media-Post-Generator`（0 stars）：README 寫 OpenRouter 寫文 + Replicate SD3.5 生圖、含 Facebook。無採用訊號。
- `robort-gabriel/Carousel-Post-Generator-AI-Agent`（0 stars）：LangGraph + Gemini／DALL·E 做輪播。同理由。
- `kaveeshagim/ai-content-creator-agent`（1 star）：部落格 + 社群 caption + share banner；Facebook 不是一等公民。
- 只做 IG caption 的 Langflow 玩具（例如 `Swastika3647/AI-Instagram-Caption-Generator-`）：與 FB 圖文無關。

---

## 平台限制（官方／README 反覆出現）

1. **Facebook 發文 API = 粉專**，不是個人檔案。[daily-social-autopost README](https://github.com/Lee-unhn/daily-social-autopost) 與 [Postiz Facebook docs](https://docs.postiz.com/providers/facebook) 都指向 Page。
2. 若走 Graph API，App 必須 **Live**，否則別人看不到圖（Postiz 官方 troubleshooting）。
3. IG／Threads 發圖需要 **公開 URL**，不能只丟本機檔（meta-social-agent README 的 bridging 說明）。

---

## 建議你怎麼選

**情境 A — 人在 Cursor 裡產出「可以貼的圖 + FB 文」，自己手動貼**

1. 文：裝 [social-media-caption-generator-claude](https://github.com/rediumvex/social-media-caption-generator-claude)
2. 圖：裝 [SocialForge](https://github.com/indranilbanerjee/socialforge)（有品牌照片時）或用 HTML 輪播模板（要「卡片／清單風」時）

**情境 B — 要自動排程發粉專**

- 裝 [Postiz](https://github.com/gitroomhq/postiz-app) + [postiz-agent](https://github.com/gitroomhq/postiz-agent)
- 文仍建議用 caption skill 寫好再交給 Postiz；不要只靠 `generateImageTool` 當視覺。

**情境 C — 想看「最小可跑的 FB 圖文管線」原始碼**

- Fork [meta-social-agent](https://github.com/Ninadnj/meta-social-agent)，換成自己的 HTML 模板與品牌聲調。

---

## 主要來源

- https://github.com/indranilbanerjee/socialforge
- https://raw.githubusercontent.com/indranilbanerjee/socialforge/main/README.md
- https://github.com/indranilbanerjee/socialforge/blob/main/skills/render-carousels/SKILL.md
- https://github.com/rediumvex/social-media-caption-generator-claude
- https://raw.githubusercontent.com/rediumvex/social-media-caption-generator-claude/main/README.md
- https://github.com/gitroomhq/postiz-app
- https://github.com/gitroomhq/postiz-agent
- https://docs.postiz.com/mcp/tools
- https://docs.postiz.com/mcp/examples
- https://docs.postiz.com/providers/facebook
- https://raw.githubusercontent.com/Ninadnj/meta-social-agent/main/README.md
- https://github.com/inovector/mixpost
- https://github.com/pendpost/pendpost
- https://github.com/DataTalksClub/carousel-automation
- https://github.com/tns-research/fog-agents
