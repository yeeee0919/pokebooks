# AI 自動化 YouTube Shorts：作法與收益（研究筆記）

- **研究日期：** 2026-09-02
- **範圍：** 官方 YPP／Shorts 分潤、官方上傳 API、合法自動化架構、以及範例頻道「生活沒煩惱」的公開數據與收益區間
- **免責：** 非財務建議、非法律意見。YouTube 不公布單一頻道實際收入；下列金額皆為假設推算。平台政策會改，以當時 Help 頁為準。
- **本 repo 慣例：** PokeLedger 沒有既有「外部產業研究」目錄；本筆記放在 `docs/research/`，不寫入 `CONTEXT.md` 或 ADR。

---

## 結論（先看這段）

1. **可以自動化的，是「自己有權使用的成片 → 用官方 API／Studio 排程上傳」**，不是「把別人的爆紅片抓下來配字幕再大量上架」。後者踩的是**版權**與 YPP 的 **reused content／inauthentic content**，即使有觀看量也可能 **$0 廣告分潤**，甚至被拒於 YPP 或整頻道撤銷變現。
2. Shorts **沒有固定「每千次觀看多少錢」**。官方模型是：Shorts Feed 廣告收入進池 → 扣音樂授權 → 依各國 **engaged views** 佔比分配 Creator Pool → 創作者拿分配額的 **45%**。
3. 用官方 Help 裡的**假設例子**反推，約 **每百萬合格 engaged views ≈ USD 405**（約 RPM USD 0.41）。這**不是**保證費率。
4. 範例頻道公開約 **10.28 億觀看、10.8 萬訂閱、727 支片、2024-08-01 加入**。若「幾乎全部觀看都合格、已開 Shorts 模組、且通過 reused 審查」，廣告分潤**數量級**可能在 **約數十萬美元累計**；若內容被視為未改造的轉載，廣告收益可能 **接近 0**。無法從公開頁確認該頻道是否已加入 YPP。

---

## 官方 monetization 現況

### 加入 YouTube Partner Program（YPP）

官方門檻（研究當日仍有效的「廣告分潤」路徑）見 [YPP overview & eligibility](https://support.google.com/youtube/answer/72851)：

- 遵守 [頻道變現政策](https://support.google.com/youtube/answer/1311392)
- 居住在 YPP 可用國家／地區
- 無有效社群規範處分、開啟兩步驟驗證、具備進階功能
- 連結 AdSense for YouTube
- **廣告／Premium 分潤：** 1,000 訂閱，且下列擇一：
  - 過去 12 個月 **4,000** 小時合格長片觀看；或
  - 過去 90 天 **1,000 萬** 次合格 Shorts 觀看（Shorts Feed）
- Shorts 觀看**不計入** 4,000 小時門檻。

較早可開的粉絲贊助類功能（會員、Super Thanks 等）門檻較低：500 訂閱 + 90 天內 3 支公開片 + 3,000 小時或 90 天 300 萬 Shorts 觀看。見 [Choose how you want to monetize](https://support.google.com/youtube/answer/94522)、[How to earn money on YouTube](https://support.google.com/youtube/answer/72857)。

達標**不會自動入會**；還要人工／系統審查是否符合政策。見同一 YPP 頁。

### 2027-02-01 起（已公告、尚未生效）

[Changes to the YouTube Partner Program](https://support.google.com/youtube/answer/12843009)：

- **新申請者**廣告／Premium 門檻改為：1,000 訂閱 + **8,000** 小時或 90 天 **2,000 萬** Shorts 觀看。**已在 YPP 者不受此門檻影響。**
- 要從 Shorts Creator Pool **當月領錢**，須維持過去 90 天 **1,000 萬** 合格 Shorts 觀看（未達標不會踢出 YPP，也不影響長片收益）。
- 須在 2027-01-31 前於 Studio 接受更新條款，否則 2027-02-01 起對應模組停發，之後補接受可恢復。

### Shorts 廣告怎麼算錢

來源：[YouTube Shorts monetization policies](https://support.google.com/youtube/answer/12504220)、[Partner earnings overview](https://support.google.com/youtube/answer/72902)。

1. 每月把 Shorts Feed「影片之間」的廣告收入加總。
2. 依 engaged views 與是否使用音樂，切出 **Creator Pool**（有音樂時，部分收入先給音樂權利人；官方例子：1 軌音樂則相關收入一半進 Creator Pool）。
3. 依創作者在**各國**佔 monetizing 創作者合格 engaged views 的比例分配。
4. 創作者拿分配額的 **45%**（官方寫明：不論該支 Short 有沒有音樂，**分成比例**都是 45%）。
5. YouTube Premium 的 Shorts 部分：官方為分配給 monetizing 創作者之淨額的 **45%**（另有一部分 Premium 收入用於音樂授權）。
6. **接受 Shorts Monetization Module 當天起**的觀看才計入；之前累積觀看不算。
7. 只有已接受該模組的 YPP 夥伴能分 Shorts 廣告／Premium。Feed 上看到廣告 ≠ 你有錢拿。

**官方假設例子（同一 Help 頁，非保證 RPM）：**

- 某國當月 1 億合格 engaged views，Shorts Feed 廣告 USD 100,000；20% Shorts 使用 1 軌音樂 → Creator Pool USD 90,000。
- 你的 Short 有 100 萬 engaged views → 分到 1% = USD 900 → ×45% = **USD 405**。
- 反推：**USD 0.405 / 千次合格 engaged views**（僅在該假設的廣告密度與音樂結構下成立）。

YouTube **沒有**公布全球平均 Shorts RPM。第三方「Shorts RPM $0.0x」文章不是官方數字，本筆記不當作事實。

**Shorts Fund → 現行廣告分潤（官方時程）：** [Made on YouTube: Rewarding Creative Entrepreneurs](https://blog.youtube/news-and-events/supporting-the-next-wave-of-creative-entrepreneurs/)（2022-09-20）宣布以暫時性 Shorts Fund 過渡到分潤；「early 2023」起 YPP 夥伴可分 Shorts Feed 廣告池，創作者拿分配額的 45%。現行 Help 頁即此模型，不再依 Fund 發固定獎金。

### 哪些 Shorts 觀看不算錢（官方明文）

[Shorts monetization policies](https://support.google.com/youtube/answer/12504220) 以 **eligible engaged views** 計價。可能不合格的例子包括：

- **非原創 Shorts**：未剪輯的電影／電視片段、從 YouTube 或其他平台**原樣重傳**他人內容、沒有加入原創內容的合輯
- 機器人／造假觀看
- 不符合廣告適齡／廣告友善指引的內容

超過 1 分鐘且被 Content ID 主張的 Shorts：**封鎖且不可變現**。Content ID 比對與權利人可選 block／monetize／track，見 [How Content ID works](https://support.google.com/youtube/answer/2797370)。

第三方畫面／remix：音樂會影響 **Creator Pool 怎麼切**；官方目前寫明，分配給上傳者時，仍按其 Short 的 engaged views 計（音樂不另外扣創作者的 view 佔比）。其他類第三方內容的分潤模型「仍在早期」。有第三方權利人時，觀看可能在上傳者與權利人之間拆分。

### 對「AI 大量產片」特別相關的政策

[YouTube channel monetization policies](https://support.google.com/youtube/answer/1311392)（2025-07-15 更新：repetitious 改名 **inauthentic content**，並釐清含大量生產）：

- 變現內容應是**原創、真實**，不是為了刷觀看而大量生產。
- **不允許變現的例子**包括：模板化、各支片幾乎可互換、slideshow／捲動文字幾乎沒敘事；以及 **「AI 產生、用通用或無原創模板、給人大量生產印象、沒有創作者自己的觀點」**。
- **Reused content** 是頻道整體政策：把已在 YouTube 或其他網站的內容再包裝，卻沒有足夠原創旁白、實質改動或教育／娛樂價值。**即使已獲原作者同意，仍可能違反 reused content**（與版權／Content ID 是分開的一條）。

因此：配字幕、黃箭頭、旁白，**不保證**通過審查；審查看頻道主題、熱門片、新片、標題縮圖等。

變現政策之外，[Spam Policy](https://support.google.com/youtube/answer/2801973)（社群規範）另禁止：以自動化／AI **大量產出高度相似內容**、**原樣轉載**他站或他片、以及假互動／刷量。違規可導致內容移除、頻道處分或終止，不只是關變現。

---

## 合法自動化架構（高階，不含侵權操作）

目標流程應是：**你擁有或已取得商業授權的素材 → 製作成片 → 用官方通道上傳**。不要把「找爆款片 → 下載 → 加字卡 → 自動上架」當成產品設計。

```
題材／腳本（自己寫或 AI 當草稿，最終你負責）
        ↓
畫面（自攝、授權素材、原創動畫／生成但你有權使用）
        ↓
聲音（自己配音，或 TTS／音效之商業授權）
        ↓
剪輯成垂直、≤3 分鐘的成片
        ↓
披露義務（若符合「擬真合成／竄改」定義）
        ↓
YouTube Studio 或 YouTube Data API v3 videos.insert
        ↓
達標後申請 YPP → 接受 Shorts Monetization Module
```

### Shorts 格式（官方）

- [Get started creating YouTube Shorts](https://support.google.com/youtube/answer/10059070)：可用 App 拍攝或上傳直式片；上傳 Short 最高解析度註記為 1080p。
- [Understand three-minute YouTube Shorts](https://support.google.com/youtube/answer/15424877)：2024-10-15 起，正方形或直式、長度最多 3 分鐘會被歸類為 Shorts，並可走 Shorts Feed 分潤模型（該頁另有 2025-12-08 上傳日的補充句，細節以該 Help 為準）。

### 上傳：Studio（人工或半自動）

YouTube Studio／App 上傳、排程公開，是官方支援路徑。適合量不大、要人工過品質與授權的頻道。

### 上傳：YouTube Data API v3（程式化）

第一方文件：

- [`videos.insert`](https://developers.google.com/youtube/v3/docs/videos/insert)：`POST https://www.googleapis.com/upload/youtube/v3/videos`；需 OAuth（至少 `youtube.upload`）；最大 256GB；MIME `video/*` 或 `application/octet-stream`。
- [Upload a Video 指南](https://developers.google.com/youtube/v3/guides/uploading_a_video)、[Resumable Uploads](https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol)。
- 可寫入的欄位包括 `snippet.title`／`description`／`tags`、`status.privacyStatus`、`status.publishAt`（排程）、`status.selfDeclaredMadeForKids`、**`status.containsSyntheticMedia`**（擬真合成／竄改內容披露）。見 [Videos resource](https://developers.google.com/youtube/v3/docs/videos)；API 於 2024-10-30 起支援該欄位（[Revision history](https://developers.google.com/youtube/v3/revision_history)）。
- **2020-07-28 之後建立、未經審核的 API 專案：** 經 `videos.insert` 上傳的影片會被限制為 **private**，需通過 API 合規審核才能公開。見 `videos.insert` 頁頂註。
- **配額（官方 2026-06-01 更新）：** 預設每日 **100 次 `videos.insert`**（獨立桶，每次成本 1）、100 次 `search.list`、其餘端點合計 10,000 units。見 [Getting started](https://developers.google.com/youtube/v3/getting-started)、[Quota costs](https://developers.google.com/youtube/v3/determine_quota_cost)。每日配額於太平洋時間午夜重置。這表示「純 API 上傳」理論上限約每天 100 支，但品質、政策、審核才是真正瓶頸。

自動化編排（n8n、Make、自寫腳本）**不是** YouTube 官方產品；只能當排程膠水，且必須遵守 [YouTube API Services Terms](https://developers.google.com/youtube/terms/api-services-terms-of-service) 與 [Developer Policies](https://developers.google.com/youtube/terms/developer-policies)。後者明文禁止 scrape YouTube／Google 應用或使用抓來的資料，也禁止用 API 促成或推廣侵權。超過預設配額須通過 [合規審核](https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits)。

### 製作工具（廠商文件，非 YouTube 官方）

常見棧（僅說明產業現況，不構成推薦去轉載）：

- 剪輯：CapCut 等桌面／雲端剪輯
- TTS：各家語音 API（須核對**商業使用、YouTube 變現**條款）
- 字幕／翻譯：STT + 自己審稿（自動翻譯錯誤會直接變成政策／誤導風險）

AI 配音／生成畫面若構成「讓真人看起來說了沒說過的話、竄改真實事件、生成看起來像真實發生的場景」，應依 [Disclosing use of GenAI content](https://support.google.com/youtube/answer/14328491) 披露，並用 API 的 `containsSyntheticMedia`。一般「原創腳本 + 非冒充特定真人的 TTS」是否落入該定義，以官方 A/S 政策為準，不要自行假設「用了 AI 就一定要／一定不要標」。

### 刻意不提供的內容

本筆記**不**包含：下載他人影片的步驟、繞過 Content ID、洗觀看、多帳號規避審查、或「clip farm 工廠」操作手冊。那些與官方不合格觀看定義、版權、以及 inauthentic／reused 政策直接衝突。

---

## 範例頻道：生活沒煩惱

- 公開頁：[youtube.com/@生活沒煩惱/shorts](https://www.youtube.com/@%E7%94%9F%E6%B4%BB%E6%B2%92%E7%85%A9%E6%83%B1/shorts)
- **About 截圖（使用者 2026-09-02 提供，非 YouTube Analytics）：**
  - 加入：2024-08-01
  - 觀看：1,027,764,557
  - 訂閱：約 10.8 萬
  - 影片：727
  - 地點：香港
  - 自述腳本／配音／剪輯為本人製作，素材在標題或片中標註來源
- **從 Shorts 牆可見的風格（截圖）：** 直式、大字中文字幕、像素黃箭頭、常可見其他帳號浮水印；單支觀看量可見約 14 萬至 100 萬+。屬「無露臉、旁白＋他人畫面」類型。

### 公開數據可推出的量（非收益）

| 項目 | 約值 |
| --- | --- |
| 營運天數（2024-08-01 → 2026-09-02） | ~762 天（~25.1 個月） |
| 平均每支觀看 | ~141 萬 |
| 平均每日觀看 | ~135 萬 |
| 平均每月觀看 | ~4,090 萬 |
| 相對 YPP Shorts 門檻 | 10.8 萬訂閱 ≫ 1,000；若近 90 天仍維持類似流量，遠超 1,000 萬／90 天 |

**無法從公開頁知道：** 是否已入 YPP、何時接受 Shorts 模組、多少觀看是 engaged／合格、多少被 Content ID 吃掉、廣告友善狀態、觀眾國家組合。

### 潛在 YouTube 廣告／Premium 收益區間

下列全部假設「觀看 ≈ 合格 engaged views」。實際上 engaged／合格比例會低很多。

**A. 用官方假設 RPM USD 0.405（Help 例子）**

- 累計 10.278 億 × USD 0.405 / 1000 ≈ **USD 41.6 萬**（約新台幣 1,200–1,400 萬，視匯率）
- 若近月仍約 4,090 萬觀看／月：約 **USD 1.66 萬／月**

**B. 合格率打折（較接近現實的敏感度）**

| 假設 | 累計廣告分潤（約） | 說明 |
| --- | --- | --- |
| 官方例子費率 × 100% 觀看合格 | ~USD 42 萬 | 極樂觀，幾乎不可能 |
| 同上 × 50% 合格 | ~USD 21 萬 | 模組開通晚、音樂池、部分不合格 |
| 同上 × 20% 合格 | ~USD 8.3 萬 | 較保守 |
| 同上 × 5% 合格 | ~USD 2.1 萬 | 大量觀看在開模組前或被判定不合格 |
| Reused／inauthentic 未過審或未入 YPP | **~USD 0**（廣告） | 官方：不合格觀看不進你的分潤；未入 YPP 則 Feed 廣告歸平台／音樂 |

**C. 為何這個頻道特別可能落在「高觀看、低或零廣告」**

風格高度吻合官方點名的風險：他人影片＋字幕箭頭。即使標題標註來源：

- 仍可能構成 **reused content**（官方：有無授權都可能不合格）。
- 可能構成 **非原創 Shorts** → engaged views 不計價。
- 可能構成 **inauthentic／模板大量產**。
- 版權主張可導致下架、封鎖、或與權利人拆分。

因此較誠實的評估是：

- **觀看成績：** 極強（十億級、單支常破十萬）。
- **YouTube 廣告潛在：** 從「幾乎為 0」到「數十萬美元累計」都說得通；**中位數不應假設等於十億 × 0.405 RPM**。
- **若已穩定變現且多數片合格：** 用官方例子當上限參考，累計大概落在 **十萬至四十萬美元量級** 比「千萬美元」合理得多。
- **其他收入（無法估）：** 帶貨、聯盟、站外導流、品牌案。粉絲贊助需另達門檻且觀眾要真的付費；此類型 Shorts 通常不是 Super Thanks 主力。

香港列於官方 [YPP 可用國家／地區](https://support.google.com/youtube/answer/7101720)，居住地本身不構成障礙。中文娛樂向、觀眾未必在高 CPM 國家，即使合格，**實際有效費率也可能低於 Help 例子裡那個未指明的 Country A**。

---

## 風險摘要

| 風險 | 官方依據 | 對「想做類似頻道」的意義 |
| --- | --- | --- |
| 轉載／合輯無足夠原創 | Shorts 不合格觀看；reused content | 爆流量 ≠ 有錢 |
| AI 模板大量產 | inauthentic content（2025-07 更新明文寫 AI）；[Spam Policy](https://support.google.com/youtube/answer/2801973) | 「全自動工廠」可同時被關變現與依社群規範處分 |
| 版權／Content ID | 著作權政策；>1 分鐘 claimed Short 封鎖 | 自動化不能省略權利清理 |
| 未過 API 審核 | `videos.insert` 僅 private | 不能指望未審核專案公開量產 |
| 2027 門檻與每月 1,000 萬 Shorts | YPP changes | 新頻道更難靠 Shorts 進廣告分潤；進了也要維持流量 |
| 模組接受日前觀看 | Shorts monetization policies | 歷史觀看不能事後兌現 |

若要做**可變現**的自動化，比較站得住的方向是：原創或已授權畫面、每支有可辨識的觀點／腳本、人工抽樣審片、披露合成媒體、走官方上傳與 YPP，而不是複製「生活沒煩惱」的素材策略。

---

## 來源清單

### YouTube / Google 第一方

- [YouTube Shorts monetization policies](https://support.google.com/youtube/answer/12504220)
- [YouTube partner earnings overview](https://support.google.com/youtube/answer/72902)
- [YPP overview & eligibility](https://support.google.com/youtube/answer/72851)
- [Choose how you want to monetize](https://support.google.com/youtube/answer/94522)
- [How to earn money on YouTube](https://support.google.com/youtube/answer/72857)
- [Changes to the YouTube Partner Program](https://support.google.com/youtube/answer/12843009)
- [YouTube channel monetization policies](https://support.google.com/youtube/answer/1311392)（含 reused content、inauthentic content）
- [What kind of content can I monetize?](https://support.google.com/youtube/answer/2490020)
- [Get started creating YouTube Shorts](https://support.google.com/youtube/answer/10059070)
- [Understand three-minute YouTube Shorts](https://support.google.com/youtube/answer/15424877)
- [videos.insert](https://developers.google.com/youtube/v3/docs/videos/insert)
- [Videos resource](https://developers.google.com/youtube/v3/docs/videos)
- [Upload a Video](https://developers.google.com/youtube/v3/guides/uploading_a_video)
- [Resumable Uploads](https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol)
- [YouTube Data API getting started（quota）](https://developers.google.com/youtube/v3/getting-started)
- [Quota costs](https://developers.google.com/youtube/v3/determine_quota_cost)（Last updated 2026-06-01 UTC）
- [API revision history](https://developers.google.com/youtube/v3/revision_history)
- [Quota and Compliance Audits](https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits)
- [YouTube API Services – Developer Policies](https://developers.google.com/youtube/terms/developer-policies)（禁止 scrape、禁止以 API 促成侵權）
- [YouTube API Services Terms of Service](https://developers.google.com/youtube/terms/api-services-terms-of-service)
- [Spam Policy](https://support.google.com/youtube/answer/2801973)
- [How Content ID works](https://support.google.com/youtube/answer/2797370)
- [Disclosing use of GenAI content](https://support.google.com/youtube/answer/14328491)
- [YPP availability](https://support.google.com/youtube/answer/7101720)（含 Hong Kong）
- [Made on YouTube: Rewarding Creative Entrepreneurs](https://blog.youtube/news-and-events/supporting-the-next-wave-of-creative-entrepreneurs/)（2022-09-20：Shorts Fund → 45% 分潤）
- [New opportunities to earn and changes to the YouTube Partner Program](https://blog.youtube/news-and-events/youtube-partner-program-updates-2027-new-opportunities-earn/)（2026-08-10：2027 門檻與 Shorts 每月 1,000 萬觀看）

### 觀察資料（非官方收益）

- 使用者提供之頻道 About 截圖（2026-09-02）
- 頻道 Shorts 公開頁
