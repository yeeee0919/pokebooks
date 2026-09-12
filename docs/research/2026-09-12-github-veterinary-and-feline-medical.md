# GitHub 上的動物醫療專案（特別是貓）

- **研究日期：** 2026-09-12
- **範圍：** GitHub 上與獸醫臨床、診所系統、寵物健康追蹤、貓科疾病相關的開源專案。以各 repo README、GitHub 搜尋結果為準。
- **免責：** 星數、授權、功能以當日 GitHub 為準，之後會變。這些專案**都不是獸醫診斷替代品**。
- **本 repo 慣例：** 外部產業研究放 `docs/research/`，不寫入 `CONTEXT.md` 或 ADR。

---

## 結論（先看這段）

GitHub 上**有**動物醫療生態，但分成兩層，而且貓專科很薄：

1. **診所系統（PIMS / EHR）**：給獸醫診所管預約、病歷、帳務。最大的是 [Yosemite Crew](https://github.com/YosemiteCrew/Yosemite-Crew)（當日 **2,020** 星）。貓只是其中一種病患物種，不是貓科專科產品。
2. **貓科臨床／飼主工具**：數量少、星數低。最值得看的是 [VetClaw](https://github.com/OpenVet-Projects/VetClaw) 的 `feline-medicine` skill，以及 FIP（貓傳染性腹膜炎）追蹤／診斷研究。

**不要被星數騙：** [spring-projects/spring-petclinic](https://github.com/spring-projects/spring-petclinic) 有 **9,510** 星，但它是 Spring 教學範例，不是真的動物醫院軟體。搜 `feline` 前幾名幾乎是 Neovim 套件、音樂 App、程式語言，跟貓科醫學無關。搜 `cat disease` / `cat health` 會大量撞到 **cattle**（牛）疾病專案。

給「對貓醫療有興趣」的人，優先順序：

| 順位 | 專案 | 星數（當日） | 貓專科？ | 類型 | 適不適合認真看 |
|------|------|-------------|----------|------|----------------|
| 1 | [OpenVet-Projects/VetClaw](https://github.com/OpenVet-Projects/VetClaw) | 35 | 有（`feline-medicine`） | Agent skill 庫（臨床／用藥安全） | **最接近「貓科臨床知識」的開源專案** |
| 2 | [nina1012/FIP-CatCare](https://github.com/nina1012/FIP-CatCare) | 10 | 是（FIP 治療追蹤） | 飼主 Web App | **最完整的貓專科 App**；demo 有功能缺口 |
| 3 | [ddunbar84/Dunbar_FIP_*_ML](https://github.com/ddunbar84/Dunbar_FIP_Effusive_ML) | 1–2 | 是（FIP 診斷 ML） | 論文配套 R 程式 | 有同儕審查論文背書，不是產品 |
| 4 | [YosemiteCrew/Yosemite-Crew](https://github.com/YosemiteCrew/Yosemite-Crew) | 2,020 | 否（犬貓馬皆可） | 診所 PIMS | **GitHub 上最大的真・動物醫療系統** |
| 5 | [evangauer/openvpm](https://github.com/evangauer/openvpm) | 29 | 否 | 現代 API-first PIMS | 比 Yosemite 小、更新很勤 |
| 6 | [Vetdatahub/VetDataHub](https://github.com/Vetdatahub/VetDataHub) | 49 / 網站 86 | 否 | 獸醫資料集 | 做研究／訓練模型時有用 |

**不建議當主力：** 0 星的貓病「專家系統／AI 診斷」（`FeliniAI`、`vet-vision`、`cat-disease-diagnosis`、`howl-vision`、`pawcheck-public`）。題材對，但沒有社群、沒有臨床驗證訊號。

---

## 1. 貓專科 — 真的跟貓醫學有關的

### 1.1 VetClaw — 獸醫 AI skill 庫，含 feline-medicine

來源：[README](https://github.com/OpenVet-Projects/VetClaw/blob/main/README.md)、[repo 頁](https://github.com/OpenVet-Projects/VetClaw)（35 stars，MIT，2026-09-10 更新）。

- **是什麼：** 給 OpenClaw／相容 agent 用的 51 個獸醫 skill。作者自稱：人類醫學有 869+ skill，獸醫幾乎沒有對等開源庫。
- **為什麼跟貓特別有關：** 獨立 skill [`feline-medicine`](https://github.com/OpenVet-Projects/VetClaw/tree/main/skills/species/feline-medicine)。README 與 skill 描述涵蓋：
  - 貓肝臟缺少 UDP-GT → 對 acetaminophen、permethrin、NSAID 極敏感
  - 診療壓力高血糖 vs 糖尿病
  - CKD（IRIS 分期）、甲狀腺機能亢進、FLUTD、糖尿病、FIV／FeLV
  - 專性肉食、隱病行為
- **安全示範（README 原文情境）：** 「可以給貓吃 acetaminophen 止痛嗎？」→ 應載入 `lethal-variance-detection`，標成對貓致死。
- **其它對貓也有用的 skill：** `veterinary-clinical-guidelines`（含 AAFP）、`toxicology-calculator`、`nsaid-safety`、openFDA Animal SDK（可查 species=Cat）。
- **怎麼裝：** `git clone` 後把 `skills/` 拷到 `~/.openclaw/workspace/skills/`，或 `npx skills add https://github.com/OpenVet-Projects/VetClaw --skill feline-medicine`。
- **誠實評價：** 不是 App，是給 agent 用的推理模板。星數 35、2026 年還在更新，是 GitHub 上「貓科臨床知識結構化」最完整的一份。作者明文：**不能替代執業獸醫**。

### 1.2 FIP CatCare — 貓傳染性腹膜炎治療追蹤

來源：[README](https://github.com/nina1012/FIP-CatCare/blob/main/README.md)、[repo](https://github.com/nina1012/FIP-CatCare)（10 stars，MIT）、demo [fip-cat-care.vercel.app](https://fip-cat-care.vercel.app)。

- **是什麼：** 給 FIP 陽性貓飼主的 Web App：用藥排程、每日健康日誌、抽血報告上傳、提醒。
- **為什麼值得看：** FIP 是貓科特有、曾經幾乎必死、現在靠抗病毒藥可治；劑量依體重與病型（濕／乾／眼／神經）計算。這是 GitHub 上少數「只做貓、只做一個真疾病」的產品向專案。
- **限制：** README 寫 production 部分功能因資料庫未推齊而不可用；測試帳 `test@user.com` / `password` 唯讀。最後更新 2026-04。
- **同題材、更小：**
  - [alxhdd/fip-tracker](https://github.com/alxhdd/fip-tracker)（0 星）— React + Node + SQLite，EN/PL
  - [davyay/FIP-Treatment-Companion](https://github.com/davyay/FIP-Treatment-Companion)（1 星）— Java 桌面追蹤

### 1.3 Dunbar FIP 機器學習（有論文）

來源：

- [ddunbar84/Dunbar_FIP_Effusive_ML](https://github.com/ddunbar84/Dunbar_FIP_Effusive_ML)（1 星，GPL-3.0）— 濕性 FIP；README 寫 719 筆疑似病例、準確率 96.51%、AUC 96.48%
- [ddunbar84/Dunbar_FIP_NonEffusive_ML](https://github.com/ddunbar84/Dunbar_FIP_NonEffusive_ML)（2 星）— 乾性 FIP；ensemble 準確率 97.5%

這是**研究程式碼**（R Markdown），不是給飼主用的 App。在「貓醫療 + GitHub」裡，這是少數有正式論文標題背書的。

### 1.4 其它貓相關（星數低，僅列存檔）

| 專案 | 星數 | 做什麼 | 備註 |
|------|------|--------|------|
| [Scratchydisk/vet-vision](https://github.com/Scratchydisk/vet-vision) | 0 | 照片評估貓牙齦炎 0–4 級（Ollama 本地 VLM） | 作者自稱非獸醫、POC |
| [Chupacharcos/FeliniAI](https://github.com/Chupacharcos/FeliniAI) | 0 | 貓過敏 4 類（跳蚤／食物／環境／接觸） | 8,000 筆**合成**資料；F1 0.97 不可直接當臨床證據 |
| [nizarfadlan/cat-disease-diagnosis](https://github.com/nizarfadlan/cat-disease-diagnosis) | 0 | PHP Dempster-Shafer 專家系統 | 學生／示範專案 |
| [ikchain/howl-vision](https://github.com/ikchain/howl-vision) | 0 | 離線獸醫 PWA；含 4 類貓皮膚病模型 | README 寫 feline dermatology 90.1% acc |
| [kekelele19851224-lgtm/pawcheck-public](https://github.com/kekelele19851224-lgtm/pawcheck-public) | 0 | 犬貓照片篩檢（含貓尿／牙齦／BCS） | 行銷站 [pawcheck.online](https://www.pawcheck.online)；不是完整開源產品 |
| [jenninexus/senior-pet-care](https://github.com/jenninexus/senior-pet-care) | 0 | 高齡貓 CKD＋甲亢列印日誌模板 | 為一隻 18 歲貓 Alice 做的；MIT |
| [gonzagramaglia/fitty](https://github.com/gonzagramaglia/fitty) | 2 | 照片估貓 BCS | HACKTHEKITTY 2026 hackathon |

**店面 App（多數不在 GitHub 或沒開源）：** Hydracat、Feline CKD Care / FeliVitals、RenalPaw — 都是貓 CKD 追蹤，偏商業／閉源。

---

## 2. 一般動物醫療 — 診所系統與資料

### 2.1 Yosemite Crew — GitHub 上最大的真動物醫療系統

來源：[README](https://github.com/YosemiteCrew/Yosemite-Crew/blob/main/README.md)、[官網](https://www.yosemitecrew.com/)（**2,020** stars，2026-09-12 仍在更新）。

- **是什麼：** 「動物健康作業系統」。核心是免費、可自架的 PIMS（診所資訊系統），另有飼主 App、桌面殼、開發者平台。
- **技術重點：** FHIR R4 API、offline-first、涵蓋犬／貓／馬。官網寫診所、寄宿、美容共用同一套預約／病歷／庫存。
- **誠實評價：** 這是搜 `veterinary` 時唯一星數破千、而且**真的在做動物醫療**的專案。不是貓專科，但若要「現在 GitHub 上最成熟的動物醫療軟體」，就是它。

### 2.2 較小的現代 PIMS / EHR

| 專案 | 星數 | 授權 | 重點 |
|------|------|------|------|
| [evangauer/openvpm](https://github.com/evangauer/openvpm) | 29 | AGPL-3.0 | API-first、自架、內建 AI agent、REST + webhook。README 點名 OpenVPMS 偏舊、缺現代開源 PIMS |
| [Soulstone-Health-LLC/openvetra](https://github.com/Soulstone-Health-LLC/openvetra) | 0 | AGPL-3.0 | 自架 EHR：預約、病歷、帳務、飼主入口。React 19 + Express + MongoDB |
| [oldauntie/ababu](https://github.com/oldauntie/ababu) | 26 | AGPL-3.0 | 問題導向、跨平台獸醫診所軟體 |
| [geosem42/PetCare](https://github.com/geosem42/PetCare) | 26 | MIT | Laravel + Inertia + Vue 診所 PMS |
| [pjborowiecki/ARKA-Veterinary-Clinic-Page-and-Appointment-Booking-System](https://github.com/pjborowiecki/ARKA-Veterinary-Clinic-Page-and-Appointment-Booking-System) | 163 | MIT | 診所官網＋預約＋後台；比較像接案作品，不是完整病歷系統 |

### 2.3 OpenVPMS — 老牌，但不在 GitHub 主戰場

來源：[openvpms.org](https://www.openvpms.org/)、[Bitbucket](https://bitbucket.org/OpenVPMS/openvpms)、GitHub fork [CharltonIT/openvpms](https://github.com/CharltonIT/openvpms)（7 星）。

歷史最長的開源獸醫診所系統（Java）。診所實際使用需**年訂閱**。主碼在 Bitbucket，GitHub 只是舊 fork。

### 2.4 研究／資料／編碼

| 專案 | 星數 | 做什麼 |
|------|------|--------|
| [Vetdatahub/VetDataHub_Website](https://github.com/Vetdatahub/VetDataHub_Website) | 86 | 獸醫資料集入口網站 |
| [Vetdatahub/VetDataHub](https://github.com/Vetdatahub/VetDataHub) | 49 | 資料集本體 |
| [yuhui-zh15/VetTag](https://github.com/yuhui-zh15/VetTag) | 33 | 大規模語言模型做獸醫診斷編碼（論文配套） |
| [kvinicki/Veterinary-image-datasets](https://github.com/kvinicki/Veterinary-image-datasets) | 24 | 獸醫影像資料集清單 |
| [omkar-foss/awesome-animal-care](https://github.com/omkar-foss/awesome-animal-care) | 19 | 犬貓魚馬等照護資源清單（不是軟體） |
| [h01t/VetQwen](https://github.com/h01t/VetQwen) | 0 | Qwen2.5-3B QLoRA，犬／貓／家畜鑑別診斷 |
| [zsefgh1428688450/pet](https://github.com/zsefgh1428688450/pet) | 0 | 瀏覽器內犬貓症狀決策樹（貓 12 個診斷） |

---

## 3. 搜尋時容易踩到的假陽性

- **Spring PetClinic（9,510 星）及其 microservices／REST／Kotlin／React 變體：** Spring 官方教學，病患叫「pets」只是領域包裝。
- **`ardalis/ddd-vet-sample`（314 星）：** DDD 教學，用獸醫院當範例。
- **`feline` 關鍵字：** `famiu/feline.nvim`（1,049 星）是 Neovim statusline。
- **`cat disease` / `cat health`：** 大量 **cattle**（牛）疾病預測、IoT 監測。必須加 `feline` 或 `"cat "` 加疾病名（FIP、FLUTD、FeLV、FIV、CKD）。

---

## 4. 怎麼解讀這個生態

GitHub **不是**獸醫軟體的主戰場。真正診所在用的多半是閉源 PIMS（IDEXX、ezyVet、Provet Cloud 等）。開源這邊：

- **系統層**已被 Yosemite Crew 拉開差距。
- **貓科臨床知識層**幾乎只有 VetClaw 的 skill。
- **飼主工具層**最活躍的垂直是 **FIP 治療追蹤**（因為療程長、劑量敏感、需要日誌）。CKD 追蹤多半在 App Store，不在 GitHub。
- **AI 診斷層**很多，幾乎全是 0 星 POC；FeliniAI 用合成資料報 F1 0.97，不能當成可用產品。

若下一步是「自己做貓醫療工具」，最有訊號的切入點是：**FIP／CKD 這類長期追蹤**，或把 VetClaw 的 `feline-medicine` 接到現有 agent，而不是再做一個通用「貓病診斷專家系統」。
