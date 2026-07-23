'use strict';
// ════════════════════════════════════════════════════════════════
//  PokeLedger — app.js
//  Data model: { products[], transactions[], expenses[], settings }
//  100% backward-compatible with pokeledger-backup-*.json
// ════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'pokeledger_v2';
const KOR_LIMIT   = 20000;
const MILEAGE_RATE = 0.23; // 2026 Dutch rate

// ── Default state ──────────────────────────────────────────────
const DEFAULT = {
  "products": [
    {
      "id": "9aeb3d33-54c4-4950-b75b-06f8908510ed",
      "name": "百變皮卡丘",
      "type": "單卡",
      "language": "其他",
      "marketPriceEUR": 200
    },
    {
      "id": "07413788-4efa-4b11-b10f-4563cfd5e533",
      "name": "五週年皮",
      "type": "單卡",
      "language": "繁體中文",
      "marketPriceEUR": 1500
    },
    {
      "id": "19d7a88f-9da4-4006-b2c6-4b26da846a07",
      "name": "梵谷皮卡丘",
      "type": "單卡",
      "language": "英文",
      "marketPriceEUR": 1000
    },
    {
      "name": "PSA 10 梵谷皮卡丘",
      "parentId": "19d7a88f-9da4-4006-b2c6-4b26da846a07",
      "type": "鑑定卡",
      "language": "英文",
      "marketPriceEUR": 3000,
      "id": "31d073c2-4577-4b76-8c57-69aa3574b0c8"
    },
    {
      "id": "b1b00c8b-d59e-41af-9a19-37063b108e5e",
      "name": "025皮卡丘",
      "type": "單卡",
      "language": "繁體中文",
      "marketPriceEUR": 450
    },
    {
      "id": "2de4c752-5a22-4eb5-a441-c25a1f7da658",
      "name": "台北皮卡丘",
      "type": "單卡",
      "language": "繁體中文",
      "marketPriceEUR": 140
    },
    {
      "id": "6dcab819-cd9c-4d5f-b685-f4cb32230003",
      "name": "五週年禮盒",
      "type": "卡盒",
      "language": "繁體中文",
      "marketPriceEUR": 1600
    },
    {
      "name": "博物館皮卡丘",
      "type": "單卡",
      "language": "英文",
      "marketPriceEUR": 25,
      "id": "7c27c685-47e7-4a79-b44a-8ef010c0ee81"
    },
    {
      "id": "a933feb0-67dd-4dd8-919f-7862446fd5ed",
      "name": "奇樹",
      "type": "單卡",
      "language": "日文",
      "marketPriceEUR": 10
    },
    {
      "id": "17dbfa15-4b4b-4239-8282-8cab718211c1",
      "name": "印尼皮(綠)",
      "type": "單卡",
      "language": "其他",
      "marketPriceEUR": 20
    },
    {
      "id": "aed7cba7-2263-4b79-a6e1-da755cb46972",
      "name": "印尼皮(紫)",
      "type": "單卡",
      "language": "其他",
      "marketPriceEUR": 20
    },
    {
      "id": "79fe37d3-4e27-49ba-aad2-d9f93ad0744b",
      "name": "印尼皮(藍)",
      "type": "單卡",
      "language": "其他",
      "marketPriceEUR": 18.3
    },
    {
      "id": "fef3d689-6de6-4873-b64b-b46e993c52fe",
      "name": "偵探皮",
      "type": "單卡",
      "language": "繁體中文",
      "marketPriceEUR": 150
    },
    {
      "name": "PSA 10 偵探皮",
      "parentId": "fef3d689-6de6-4873-b64b-b46e993c52fe",
      "type": "鑑定卡",
      "language": "繁體中文",
      "marketPriceEUR": 450,
      "id": "1cd915ab-1a62-4b0b-b7d0-b3efb351316c"
    },
    {
      "name": "BGS 9.5 偵探皮",
      "parentId": "fef3d689-6de6-4873-b64b-b46e993c52fe",
      "type": "鑑定卡",
      "language": "繁體中文",
      "marketPriceEUR": 250,
      "id": "3880deb5-fc60-4758-8f64-30169611fa7a"
    },
    {
      "name": "PSA 9 偵探皮",
      "parentId": "fef3d689-6de6-4873-b64b-b46e993c52fe",
      "type": "鑑定卡",
      "language": "繁體中文",
      "marketPriceEUR": 67.00588235294117,
      "id": "3ddb01ae-9fc0-4791-9c13-1b39cadf1f24"
    },
    {
      "id": "19e4c84f-3d9d-413f-8df1-201ea7f46f30",
      "name": "印尼皮(粉)",
      "type": "單卡",
      "language": "其他",
      "marketPriceEUR": 20
    },
    {
      "id": "9d4a1852-b314-4988-abff-69231460ad3b",
      "name": "紅包",
      "type": "單卡",
      "language": "繁體中文",
      "marketPriceEUR": 10
    },
    {
      "id": "d55b90d9-cdc5-4c50-8f5a-406558cb84df",
      "name": "金卡比(70*90)",
      "type": "畫作",
      "language": "繁體中文",
      "marketPriceEUR": 600
    },
    {
      "id": "5a05cb35-4936-4eed-9a26-20f6c8e18e29",
      "name": "麥當勞皮",
      "type": "單卡",
      "language": "日文",
      "marketPriceEUR": 25
    },
    {
      "id": "6c1ea19f-7742-48f5-baf0-d79ce0a13bbf",
      "name": "151大夢幻盒",
      "type": "卡盒",
      "language": "英文",
      "marketPriceEUR": 698
    },
    {
      "id": "caa221c2-8ff8-41aa-acfd-3949ae93b7ac",
      "name": "151小夢幻盒",
      "type": "卡盒",
      "language": "英文",
      "marketPriceEUR": 100
    },
    {
      "id": "04319b0a-d5cb-4f72-8ae8-3bb83030cfa6",
      "name": "151卡比盒",
      "type": "卡盒",
      "language": "英文",
      "marketPriceEUR": 1200
    },
    {
      "id": "4509dc9d-d94c-4368-8acf-2bec56640c38",
      "name": "日文烈焰盒子",
      "type": "卡盒",
      "language": "日文",
      "marketPriceEUR": 120
    },
    {
      "id": "c3bf05e0-5fab-401c-9107-b3b5bb85ac87",
      "name": "日文太晶伊布",
      "type": "卡盒",
      "language": "日文",
      "marketPriceEUR": 88
    },
    {
      "id": "fe714a86-4020-464c-8417-46bb59206423",
      "name": "151 日文 booster box",
      "type": "卡盒",
      "language": "日文",
      "marketPriceEUR": 230
    },
    {
      "id": "7751930d-72ab-4381-98e2-c9b4bb03665c",
      "name": "青眼白龍",
      "type": "單卡",
      "language": "日文",
      "marketPriceEUR": 120
    },
    {
      "id": "610df0ee-11be-4927-82f5-b781d71abe1c",
      "name": "中文伊布家族",
      "type": "卡盒",
      "language": "繁體中文",
      "marketPriceEUR": 99
    },
    {
      "id": "5ae7f787-6bd5-466d-94cb-b2d655d18230",
      "name": "紅比克",
      "type": "單卡",
      "language": "繁體中文",
      "marketPriceEUR": 280
    },
    {
      "id": "ecca7e50-4817-45a1-89f9-93ca19a9a65a",
      "name": "日文對戰夥伴",
      "type": "卡盒",
      "language": "日文",
      "marketPriceEUR": 50
    },
    {
      "id": "ac7f189c-27d8-4140-bef1-cd3dde66d42f",
      "name": "金皮卡丘(95*75)",
      "type": "畫作",
      "language": "繁體中文",
      "marketPriceEUR": 600
    },
    {
      "id": "b24b320a-e198-4ee2-9d50-36e8081fb699",
      "name": "金太陽花(90*70)",
      "type": "畫作",
      "language": "繁體中文",
      "marketPriceEUR": 600
    },
    {
      "id": "5afeec27-9489-4afb-90a7-2f907ec195ad",
      "name": "日文插畫皮",
      "type": "單卡",
      "language": "日文",
      "marketPriceEUR": 10
    },
    {
      "id": "2fe47209-7967-4113-919f-c86135b75365",
      "name": "Mega boost box",
      "type": "卡盒",
      "language": "英文",
      "marketPriceEUR": 35
    },
    {
      "id": "9a70b377-1d1c-44cf-9879-bee36a0f358c",
      "name": "日文超級嘉年華禮盒",
      "type": "卡盒",
      "language": "日文",
      "marketPriceEUR": 76
    },
    {
      "id": "89500b40-04b0-4c38-8f31-8de9ac7430ca",
      "name": "日文超級勇氣禮盒",
      "type": "卡盒",
      "language": "日文",
      "marketPriceEUR": 76
    },
    {
      "id": "cc2831fe-ef59-4c81-8bc7-5e3f882483cc",
      "name": "日文mega噴火龍盒子",
      "type": "卡盒",
      "language": "日文",
      "marketPriceEUR": 105
    },
    {
      "id": "e46f0f7e-f669-49ae-9364-ff57d2f30c24",
      "name": "日文 primmer mega box",
      "type": "卡盒",
      "language": "日文",
      "marketPriceEUR": 40
    },
    {
      "id": "af172af7-c0ba-4aad-aa04-398b57cb9cbb",
      "name": "日文戰鬥夥伴",
      "type": "卡盒",
      "language": "日文",
      "marketPriceEUR": 60
    },
    {
      "id": "06baedb9-dd5c-4b5d-94ce-1310a476c75c",
      "name": "日文mega快龍盒",
      "type": "卡盒",
      "language": "日文",
      "marketPriceEUR": 70
    },
    {
      "id": "9dd3b54e-1fd6-4f44-8f82-b09988f427ac",
      "name": "東北皮卡丘",
      "type": "卡盒",
      "language": "日文",
      "marketPriceEUR": 160
    },
    {
      "id": "f8fe4b50-1937-44d4-b5e8-78c8d6aaa70f",
      "name": "廣島暴鯉龍",
      "type": "卡盒",
      "language": "日文",
      "marketPriceEUR": 160
    },
    {
      "id": "1a386c35-3483-47c6-bbc1-45e66ad709dd",
      "name": "日文黑龍盒",
      "type": "卡盒",
      "language": "日文",
      "marketPriceEUR": 160
    },
    {
      "name": "遊戲王屠龍戰士",
      "type": "單卡",
      "language": "日文",
      "marketPriceEUR": 300,
      "id": "202bf6a7-c1de-4d1b-a2df-682cc8c09389"
    },
    {
      "name": "像素皮娃娃",
      "type": "周邊",
      "language": "英文",
      "marketPriceEUR": 30,
      "id": "82f24a15-f1fb-4291-af9a-562bc2c4605a"
    },
    {
      "name": "Switch 火紅",
      "type": "周邊",
      "language": "英文",
      "marketPriceEUR": 116,
      "id": "c4715583-a506-4406-b4e7-b77ec47c7b10"
    },
    {
      "name": "30週年皮卡丘娃娃",
      "type": "周邊",
      "language": "英文",
      "marketPriceEUR": 30,
      "id": "dfa6ec01-a48f-4915-bb30-d9384ef644bd"
    },
    {
      "name": "PSA 10 百變皮卡丘",
      "parentId": "9aeb3d33-54c4-4950-b75b-06f8908510ed",
      "type": "鑑定卡",
      "language": "其他",
      "marketPriceEUR": 350,
      "id": "28459e9c-44a1-4efa-b6a8-5a5a7bac3e0c"
    },
    {
      "name": "PSA 10 五週年皮",
      "parentId": "07413788-4efa-4b11-b10f-4563cfd5e533",
      "type": "鑑定卡",
      "language": "繁體中文",
      "marketPriceEUR": 4000,
      "id": "885d53eb-deee-471b-8280-72d2149a31f4"
    },
    {
      "name": "PSA 10 紅比克",
      "parentId": "5ae7f787-6bd5-466d-94cb-b2d655d18230",
      "type": "鑑定卡",
      "language": "繁體中文",
      "marketPriceEUR": 400,
      "id": "ba3e39ea-88fa-47e2-8b87-e0aced7a821e"
    },
    {
      "name": "BGS 10 百變皮卡丘",
      "parentId": "9aeb3d33-54c4-4950-b75b-06f8908510ed",
      "type": "鑑定卡",
      "language": "其他",
      "marketPriceEUR": 500,
      "id": "1f7f9227-d8ed-4692-8a1b-53870b25b936"
    },
    {
      "name": "BGS 10 印尼皮(紫)",
      "parentId": "aed7cba7-2263-4b79-a6e1-da755cb46972",
      "type": "鑑定卡",
      "language": "其他",
      "marketPriceEUR": 150,
      "id": "ce6afc29-af24-4e3c-a8b6-4055b532921b"
    },
    {
      "name": "BGS 10 印尼皮(粉)",
      "parentId": "19e4c84f-3d9d-413f-8df1-201ea7f46f30",
      "type": "鑑定卡",
      "language": "其他",
      "marketPriceEUR": 150,
      "id": "389c7ceb-db25-4827-b2ec-12f2eb56b992"
    },
    {
      "name": "BGS 9,5 印尼皮(粉)",
      "parentId": "19e4c84f-3d9d-413f-8df1-201ea7f46f30",
      "type": "鑑定卡",
      "language": "其他",
      "marketPriceEUR": 100,
      "id": "c8486986-76ba-4b88-967c-9405f368c4c7"
    },
    {
      "name": "BGS 9 印尼皮(粉)",
      "parentId": "19e4c84f-3d9d-413f-8df1-201ea7f46f30",
      "type": "鑑定卡",
      "language": "其他",
      "marketPriceEUR": 80,
      "id": "277f7891-8c41-4c22-a960-8b48fd10da7d"
    },
    {
      "name": "PSA 9 百變皮卡丘",
      "parentId": "9aeb3d33-54c4-4950-b75b-06f8908510ed",
      "type": "鑑定卡",
      "language": "其他",
      "marketPriceEUR": 200,
      "id": "1eb42cab-dac9-4698-b4b0-7754a78805a4"
    },
    {
      "name": "PSA 10 印尼皮(粉)",
      "parentId": "19e4c84f-3d9d-413f-8df1-201ea7f46f30",
      "type": "鑑定卡",
      "language": "其他",
      "marketPriceEUR": 120,
      "id": "d140bc87-af08-4df3-9980-c6ddf8ec98fb"
    },
    {
      "name": "PSA 9 印尼皮(粉)",
      "parentId": "19e4c84f-3d9d-413f-8df1-201ea7f46f30",
      "type": "鑑定卡",
      "language": "其他",
      "marketPriceEUR": 31,
      "id": "22e39af9-5ed7-4a26-9383-aa0bb8e88a38"
    },
    {
      "name": "PSA 10 印尼皮(藍)",
      "parentId": "79fe37d3-4e27-49ba-aad2-d9f93ad0744b",
      "type": "鑑定卡",
      "language": "其他",
      "marketPriceEUR": 120,
      "id": "d2ac6544-64bf-476f-a3b3-31d8abe096a3"
    },
    {
      "name": "PSA 9 印尼皮(藍)",
      "parentId": "79fe37d3-4e27-49ba-aad2-d9f93ad0744b",
      "type": "鑑定卡",
      "language": "其他",
      "marketPriceEUR": 33.15,
      "id": "87328a72-8a47-45c8-ab79-e5c979d3f358"
    },
    {
      "name": "PSA 10 印尼皮(紫)",
      "parentId": "aed7cba7-2263-4b79-a6e1-da755cb46972",
      "type": "鑑定卡",
      "language": "其他",
      "marketPriceEUR": 120,
      "id": "a5309ff3-03b6-4d43-b81b-943b420f3dd8"
    },
    {
      "name": "PSA 10 印尼皮(綠)",
      "parentId": "17dbfa15-4b4b-4239-8282-8cab718211c1",
      "type": "鑑定卡",
      "language": "其他",
      "marketPriceEUR": 120,
      "id": "4e646cff-271d-493b-b346-22dfc7f9c046"
    },
    {
      "name": "PSA 9 印尼皮(綠)",
      "parentId": "17dbfa15-4b4b-4239-8282-8cab718211c1",
      "type": "鑑定卡",
      "language": "其他",
      "marketPriceEUR": 36,
      "id": "908b8d6e-1c1d-4214-ac82-ea4325bb1910"
    },
    {
      "name": "PSA 9 紅比克",
      "parentId": "5ae7f787-6bd5-466d-94cb-b2d655d18230",
      "type": "鑑定卡",
      "language": "繁體中文",
      "marketPriceEUR": 280,
      "id": "6a1ca05f-01f0-4657-83dc-397b66fe4cfa"
    }
  ],
  "transactions":   [
    {
      "id": "96c51acd-2630-4b8f-bc34-2b113f0a80fc",
      "productId": "2de4c752-5a22-4eb5-a441-c25a1f7da658",
      "type": "SELL",
      "date": "2025-07-22",
      "quantity": 132,
      "pricePerUnitEUR": 23,
      "platform": "",
      "note": "歷史紀錄",
      "scope": "priv"
    },
    {
      "id": "fda7acb4-9597-4732-9f5b-f480d65e834a",
      "productId": "6dcab819-cd9c-4d5f-b685-f4cb32230003",
      "type": "SELL",
      "date": "2025-07-22",
      "quantity": 21,
      "pricePerUnitEUR": 223,
      "platform": "",
      "note": "歷史紀錄",
      "scope": "priv"
    },
    {
      "id": "a2a52c07-d11f-4f81-b50e-7dbe3d65c962",
      "productId": "07413788-4efa-4b11-b10f-4563cfd5e533",
      "type": "SELL",
      "date": "2025-07-22",
      "quantity": 39,
      "pricePerUnitEUR": 144,
      "platform": "",
      "note": "歷史紀錄",
      "scope": "priv"
    },
    {
      "id": "632b6c0f-05b2-41bf-a31a-c8c16dc933ad",
      "productId": "2de4c752-5a22-4eb5-a441-c25a1f7da658",
      "type": "SELL",
      "date": "2025-07-22",
      "quantity": 100,
      "pricePerUnitEUR": 0,
      "platform": "",
      "note": "雞巴人掉卡",
      "scope": "priv"
    },
    {
      "id": "cf22f8c9-ade7-45c5-9e54-f4bd0d33f45b",
      "productId": "19d7a88f-9da4-4006-b2c6-4b26da846a07",
      "type": "SELL",
      "date": "2025-07-23",
      "quantity": 230,
      "pricePerUnitEUR": 120,
      "platform": "",
      "note": "歷史紀錄",
      "scope": "priv"
    },
    {
      "id": "a8c8440c-b066-4e77-be8b-631cda8c7496",
      "productId": "9aeb3d33-54c4-4950-b75b-06f8908510ed",
      "type": "SELL",
      "date": "2025-07-23",
      "quantity": 17,
      "pricePerUnitEUR": 93.6,
      "platform": "",
      "note": "歷史紀錄",
      "scope": "priv"
    },
    {
      "id": "b5484d49-1ec6-429e-ade9-d1ae0721ec77",
      "productId": "a933feb0-67dd-4dd8-919f-7862446fd5ed",
      "type": "SELL",
      "date": "2025-07-23",
      "quantity": 15,
      "pricePerUnitEUR": 12,
      "platform": "",
      "note": "歷史紀錄",
      "scope": "priv"
    },
    {
      "id": "33b191dd-25dc-4989-ae6c-4b64a1992c50",
      "productId": "17dbfa15-4b4b-4239-8282-8cab718211c1",
      "type": "SELL",
      "date": "2025-07-23",
      "quantity": 154,
      "pricePerUnitEUR": 10.2,
      "platform": "",
      "note": "歷史紀錄",
      "scope": "priv"
    },
    {
      "id": "107b63b9-cd5a-4735-8f4a-fe28ca79b1ec",
      "productId": "aed7cba7-2263-4b79-a6e1-da755cb46972",
      "type": "SELL",
      "date": "2025-07-23",
      "quantity": 62,
      "pricePerUnitEUR": 10.5,
      "platform": "",
      "note": "歷史紀錄",
      "scope": "priv"
    },
    {
      "id": "7fe2e711-4060-4e27-bd72-5ca7714dd98e",
      "productId": "79fe37d3-4e27-49ba-aad2-d9f93ad0744b",
      "type": "SELL",
      "date": "2025-07-23",
      "quantity": 20,
      "pricePerUnitEUR": 10.3,
      "platform": "",
      "note": "歷史紀錄",
      "scope": "priv"
    },
    {
      "id": "4344470c-e1cd-4a9d-88b0-35dff3fb4873",
      "productId": "19e4c84f-3d9d-413f-8df1-201ea7f46f30",
      "type": "SELL",
      "date": "2025-07-23",
      "quantity": 20,
      "pricePerUnitEUR": 10.3,
      "platform": "",
      "note": "歷史紀錄",
      "scope": "priv"
    },
    {
      "id": "28ff81cd-ea04-41ed-8066-aa67b93a8707",
      "productId": "fef3d689-6de6-4873-b64b-b46e993c52fe",
      "type": "SELL",
      "date": "2025-07-23",
      "quantity": 15,
      "pricePerUnitEUR": 86.3,
      "platform": "",
      "note": "歷史紀錄",
      "scope": "priv"
    },
    {
      "id": "55d9cbad-4c12-41f9-acac-a164c4614514",
      "productId": "9d4a1852-b314-4988-abff-69231460ad3b",
      "type": "SELL",
      "date": "2025-07-23",
      "quantity": 30,
      "pricePerUnitEUR": 10,
      "platform": "",
      "note": "歷史紀錄",
      "scope": "priv"
    },
    {
      "id": "1571e67a-8aec-4677-ae0c-0a931ffee541",
      "productId": "17dbfa15-4b4b-4239-8282-8cab718211c1",
      "type": "SELL",
      "date": "2025-07-24",
      "quantity": 1,
      "pricePerUnitEUR": 15,
      "platform": "CM",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "1f844f00-9e9c-4869-a12c-bed3b094ddb3",
      "productId": "aed7cba7-2263-4b79-a6e1-da755cb46972",
      "type": "SELL",
      "date": "2025-07-24",
      "quantity": 4,
      "pricePerUnitEUR": 10,
      "platform": "CM",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "a22865e4-27b1-4885-a031-45f1b61292cf",
      "productId": "19e4c84f-3d9d-413f-8df1-201ea7f46f30",
      "type": "SELL",
      "date": "2025-07-24",
      "quantity": 4,
      "pricePerUnitEUR": 9,
      "platform": "CM",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "03a05ddf-cf0c-45df-8db8-38fbb066ba70",
      "productId": "79fe37d3-4e27-49ba-aad2-d9f93ad0744b",
      "type": "SELL",
      "date": "2025-07-24",
      "quantity": 3,
      "pricePerUnitEUR": 10,
      "platform": "CM",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "23fa4c30-a794-40ad-84ef-886550412a7f",
      "productId": "2de4c752-5a22-4eb5-a441-c25a1f7da658",
      "type": "SELL",
      "date": "2025-07-25",
      "quantity": 1,
      "pricePerUnitEUR": 65,
      "platform": "卡佩拉卡展",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "142ac0fb-e3c8-42d0-919f-aae62dd58a66",
      "productId": "9d4a1852-b314-4988-abff-69231460ad3b",
      "type": "SELL",
      "date": "2025-07-25",
      "quantity": 5,
      "pricePerUnitEUR": 8,
      "platform": "卡佩拉卡展",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "ba6ab16c-8b53-4be3-9811-90aae5ebc1f0",
      "productId": "9aeb3d33-54c4-4950-b75b-06f8908510ed",
      "type": "SELL",
      "date": "2025-07-25",
      "quantity": 1,
      "pricePerUnitEUR": 100,
      "platform": "卡佩拉卡展",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "e0b175d4-dfd8-48d8-8e28-c5f695d409c6",
      "productId": "2de4c752-5a22-4eb5-a441-c25a1f7da658",
      "type": "SELL",
      "date": "2025-07-25",
      "quantity": 11,
      "pricePerUnitEUR": 75,
      "platform": "卡佩拉卡展",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "d4feeeff-6b85-4ed3-8726-3193f4085a61",
      "productId": "9d4a1852-b314-4988-abff-69231460ad3b",
      "type": "SELL",
      "date": "2025-07-25",
      "quantity": 13,
      "pricePerUnitEUR": 10,
      "platform": "卡佩拉卡展",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "427f7063-6494-44eb-ad91-a459b6eda6c6",
      "productId": "fef3d689-6de6-4873-b64b-b46e993c52fe",
      "type": "SELL",
      "date": "2025-07-25",
      "quantity": 7,
      "pricePerUnitEUR": 90,
      "platform": "vinted",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "886753bf-85b8-4619-9c1d-3d5966242f05",
      "productId": "9aeb3d33-54c4-4950-b75b-06f8908510ed",
      "type": "SELL",
      "date": "2025-07-27",
      "quantity": 1,
      "pricePerUnitEUR": 120,
      "platform": "vinted",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "00d8027e-e7b3-4840-8e1e-aab038853b5e",
      "productId": "17dbfa15-4b4b-4239-8282-8cab718211c1",
      "type": "SELL",
      "date": "2025-07-29",
      "quantity": 1,
      "pricePerUnitEUR": 24,
      "platform": "CM",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "5e1e374f-4b4b-40a1-b7aa-fb012b286271",
      "productId": "9aeb3d33-54c4-4950-b75b-06f8908510ed",
      "type": "SELL",
      "date": "2025-08-02",
      "quantity": 1,
      "pricePerUnitEUR": 120,
      "platform": "Vinted",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "f3b56ff7-e479-4c43-b7f5-a51d91988c2f",
      "productId": "9aeb3d33-54c4-4950-b75b-06f8908510ed",
      "type": "SELL",
      "date": "2025-08-04",
      "quantity": 1,
      "pricePerUnitEUR": 120,
      "platform": "Mp",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "b5dd658a-4ae4-48d9-aa24-011abeb36130",
      "productId": "17dbfa15-4b4b-4239-8282-8cab718211c1",
      "type": "SELL",
      "date": "2025-08-05",
      "quantity": 1,
      "pricePerUnitEUR": 25,
      "platform": "Vinted",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "8cc36131-e156-4b39-a660-7bb29512f20f",
      "productId": "aed7cba7-2263-4b79-a6e1-da755cb46972",
      "type": "SELL",
      "date": "2025-08-05",
      "quantity": 1,
      "pricePerUnitEUR": 10,
      "platform": "Vinted",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "5f1d2e51-9ca2-4379-a9d8-d319bdf12d13",
      "productId": "79fe37d3-4e27-49ba-aad2-d9f93ad0744b",
      "type": "SELL",
      "date": "2025-08-05",
      "quantity": 1,
      "pricePerUnitEUR": 15,
      "platform": "Vinted",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "c518d102-6746-4faa-85fd-fea8219ae1fe",
      "productId": "19e4c84f-3d9d-413f-8df1-201ea7f46f30",
      "type": "SELL",
      "date": "2025-08-05",
      "quantity": 1,
      "pricePerUnitEUR": 10,
      "platform": "Vinted",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "8cbb877a-2f42-4120-b203-e8510015308e",
      "productId": "2de4c752-5a22-4eb5-a441-c25a1f7da658",
      "type": "SELL",
      "date": "2025-08-06",
      "quantity": 1,
      "pricePerUnitEUR": 90,
      "platform": "Vinted",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "431cef8e-63a4-4d52-ae68-c7db5514d578",
      "productId": "2de4c752-5a22-4eb5-a441-c25a1f7da658",
      "type": "SELL",
      "date": "2025-08-07",
      "quantity": 1,
      "pricePerUnitEUR": 85,
      "platform": "Vinted",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "2279f5f6-4ea7-407b-ae24-7a0104a7dec0",
      "productId": "2de4c752-5a22-4eb5-a441-c25a1f7da658",
      "type": "SELL",
      "date": "2025-08-07",
      "quantity": 1,
      "pricePerUnitEUR": 100,
      "platform": "vinted",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "94c5aeb5-7e63-4431-8bb3-0c30bf2dd88e",
      "productId": "9aeb3d33-54c4-4950-b75b-06f8908510ed",
      "type": "SELL",
      "date": "2025-08-08",
      "quantity": 1,
      "pricePerUnitEUR": 130,
      "platform": "cm",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "786c9f5d-fa63-4bbf-9b4d-98a75fdf2025",
      "productId": "2de4c752-5a22-4eb5-a441-c25a1f7da658",
      "type": "SELL",
      "date": "2025-08-09",
      "quantity": 1,
      "pricePerUnitEUR": 95,
      "platform": "Vinted",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "9e0c5e16-dad9-4103-a515-a954ac2bcffb",
      "productId": "2de4c752-5a22-4eb5-a441-c25a1f7da658",
      "type": "SELL",
      "date": "2025-08-09",
      "quantity": 1,
      "pricePerUnitEUR": 110,
      "platform": "Vinted",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "991c9f8d-7eb4-4d80-963b-9c2b1b1a813a",
      "productId": "2de4c752-5a22-4eb5-a441-c25a1f7da658",
      "type": "SELL",
      "date": "2025-08-10",
      "quantity": 1,
      "pricePerUnitEUR": 105,
      "platform": "Vinted",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "d75120b8-8f43-49ce-acfb-d5c3544b487b",
      "productId": "9aeb3d33-54c4-4950-b75b-06f8908510ed",
      "type": "SELL",
      "date": "2025-08-10",
      "quantity": 1,
      "pricePerUnitEUR": 120,
      "platform": "Vinted",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "2534c74b-9953-4ce8-a911-98f883eaf80e",
      "productId": "a933feb0-67dd-4dd8-919f-7862446fd5ed",
      "type": "SELL",
      "date": "2025-08-18",
      "quantity": 1,
      "pricePerUnitEUR": 14,
      "platform": "Vinted",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "83ae8f85-e2d2-4df7-96a7-508acd7c1e37",
      "productId": "2de4c752-5a22-4eb5-a441-c25a1f7da658",
      "type": "SELL",
      "date": "2025-08-19",
      "quantity": 1,
      "pricePerUnitEUR": 130,
      "platform": "CM",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "397dbce8-d4f8-422a-97a9-85f58e861a1f",
      "productId": "9aeb3d33-54c4-4950-b75b-06f8908510ed",
      "type": "SELL",
      "date": "2025-08-19",
      "quantity": 4,
      "pricePerUnitEUR": 130,
      "platform": "CM",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "d0ef59ef-72c9-4bf1-ac44-52197ff15b48",
      "productId": "17dbfa15-4b4b-4239-8282-8cab718211c1",
      "type": "SELL",
      "date": "2025-08-19",
      "quantity": 2,
      "pricePerUnitEUR": 25,
      "platform": "CM",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "41d24cc6-b1c9-43d4-8a43-7da23273d943",
      "productId": "aed7cba7-2263-4b79-a6e1-da755cb46972",
      "type": "SELL",
      "date": "2025-08-19",
      "quantity": 4,
      "pricePerUnitEUR": 12,
      "platform": "CM",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "be7fd583-35b6-4494-90ca-a964b3fee6f9",
      "productId": "79fe37d3-4e27-49ba-aad2-d9f93ad0744b",
      "type": "SELL",
      "date": "2025-08-19",
      "quantity": 2,
      "pricePerUnitEUR": 19,
      "platform": "CM",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "fc5d5450-ae6b-4298-a0e0-af09dc62e4fa",
      "productId": "19e4c84f-3d9d-413f-8df1-201ea7f46f30",
      "type": "SELL",
      "date": "2025-08-19",
      "quantity": 2,
      "pricePerUnitEUR": 10,
      "platform": "CM",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "18eefd36-6372-40c3-b222-f18491d0051e",
      "productId": "9d4a1852-b314-4988-abff-69231460ad3b",
      "type": "SELL",
      "date": "2025-08-19",
      "quantity": 1,
      "pricePerUnitEUR": 0,
      "platform": "CM",
      "note": "禮物",
      "scope": "priv"
    },
    {
      "id": "ee80083e-1d7d-4e3c-b369-8afc220b925e",
      "productId": "fef3d689-6de6-4873-b64b-b46e993c52fe",
      "type": "SELL",
      "date": "2025-08-19",
      "quantity": 1,
      "pricePerUnitEUR": 170,
      "platform": "CM",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "ddf007a4-5406-4ab0-877e-20e28354bbfc",
      "productId": "9aeb3d33-54c4-4950-b75b-06f8908510ed",
      "type": "SELL",
      "date": "2025-08-24",
      "quantity": 1,
      "pricePerUnitEUR": 140,
      "platform": "面交",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "cc8ea067-e606-4cb0-870b-e575e4b0edc4",
      "productId": "19e4c84f-3d9d-413f-8df1-201ea7f46f30",
      "type": "SELL",
      "date": "2025-09-14",
      "quantity": 1,
      "pricePerUnitEUR": 13,
      "platform": "CM",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "c1f0a2a4-b5ca-43ed-a09b-46bee49230f8",
      "productId": "17dbfa15-4b4b-4239-8282-8cab718211c1",
      "type": "SELL",
      "date": "2025-09-14",
      "quantity": 2,
      "pricePerUnitEUR": 29,
      "platform": "CM",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "c43b0644-f83c-4a7c-9ffe-c037244582df",
      "productId": "aed7cba7-2263-4b79-a6e1-da755cb46972",
      "type": "SELL",
      "date": "2025-09-14",
      "quantity": 3,
      "pricePerUnitEUR": 15,
      "platform": "CM",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "a6bbbc43-3416-4d2f-9ef7-11c27395a41f",
      "productId": "79fe37d3-4e27-49ba-aad2-d9f93ad0744b",
      "type": "SELL",
      "date": "2025-09-14",
      "quantity": 2,
      "pricePerUnitEUR": 19,
      "platform": "CM",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "3b084e21-4557-42a4-857f-23924cb6d295",
      "productId": "19e4c84f-3d9d-413f-8df1-201ea7f46f30",
      "type": "SELL",
      "date": "2025-09-14",
      "quantity": 2,
      "pricePerUnitEUR": 13,
      "platform": "CM",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "a48eaabe-08d1-4daa-a731-e74e4eb26d3d",
      "productId": "aed7cba7-2263-4b79-a6e1-da755cb46972",
      "type": "SELL",
      "date": "2025-09-14",
      "quantity": 3,
      "pricePerUnitEUR": 12,
      "platform": "CM",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "afe37bf9-3536-43ee-9bd4-64aa5dec701a",
      "productId": "79fe37d3-4e27-49ba-aad2-d9f93ad0744b",
      "type": "SELL",
      "date": "2025-09-14",
      "quantity": 1,
      "pricePerUnitEUR": 19,
      "platform": "CM",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "7ffcaea2-1c25-44a8-8bef-99a17263f48a",
      "productId": "19e4c84f-3d9d-413f-8df1-201ea7f46f30",
      "type": "SELL",
      "date": "2025-09-14",
      "quantity": 1,
      "pricePerUnitEUR": 10,
      "platform": "CM",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "aa20bf96-3926-488d-9cd5-a94016cb7f70",
      "productId": "aed7cba7-2263-4b79-a6e1-da755cb46972",
      "type": "SELL",
      "date": "2025-09-16",
      "quantity": 3,
      "pricePerUnitEUR": 16.5,
      "platform": "CM",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "10eed566-a965-4027-913c-6f78ea387ca3",
      "productId": "19e4c84f-3d9d-413f-8df1-201ea7f46f30",
      "type": "SELL",
      "date": "2025-09-16",
      "quantity": 5,
      "pricePerUnitEUR": 15,
      "platform": "CM",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "a1005fab-a67b-498f-a560-c03b7d4d19bb",
      "productId": "9aeb3d33-54c4-4950-b75b-06f8908510ed",
      "type": "SELL",
      "date": "2025-09-30",
      "quantity": 1,
      "pricePerUnitEUR": 120,
      "platform": "mp",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "bc102bb4-a3e8-443a-996f-8c75a2182e12",
      "productId": "a933feb0-67dd-4dd8-919f-7862446fd5ed",
      "type": "SELL",
      "date": "2025-09-28",
      "quantity": 1,
      "pricePerUnitEUR": 14,
      "platform": "Vinted",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "aaac91bc-635e-4d60-8da9-904ba5fa09b3",
      "productId": "17dbfa15-4b4b-4239-8282-8cab718211c1",
      "type": "SELL",
      "date": "2025-10-02",
      "quantity": 4,
      "pricePerUnitEUR": 35,
      "platform": "Vinted",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "a2616b14-d97d-43c3-9956-748cf7bd01dd",
      "productId": "aed7cba7-2263-4b79-a6e1-da755cb46972",
      "type": "SELL",
      "date": "2025-10-02",
      "quantity": 4,
      "pricePerUnitEUR": 25,
      "platform": "Vinted",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "c2ab9029-530b-4130-8faa-3929984d2bd1",
      "productId": "79fe37d3-4e27-49ba-aad2-d9f93ad0744b",
      "type": "SELL",
      "date": "2025-10-02",
      "quantity": 4,
      "pricePerUnitEUR": 30,
      "platform": "Vinted",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "0982acaa-e6c4-416c-b7a8-7deea7748cf7",
      "productId": "19e4c84f-3d9d-413f-8df1-201ea7f46f30",
      "type": "SELL",
      "date": "2025-10-02",
      "quantity": 4,
      "pricePerUnitEUR": 20,
      "platform": "Vinted",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "fd7923c7-b6b8-4b7f-908b-d9cefdcd5cc9",
      "productId": "9aeb3d33-54c4-4950-b75b-06f8908510ed",
      "type": "SELL",
      "date": "2025-10-06",
      "quantity": 1,
      "pricePerUnitEUR": 122,
      "platform": "Vinted",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "79b12b95-e5bf-4394-98cf-75ba38c7476f",
      "productId": "fef3d689-6de6-4873-b64b-b46e993c52fe",
      "type": "SELL",
      "date": "2025-10-14",
      "quantity": 1,
      "pricePerUnitEUR": 99,
      "platform": "CM",
      "note": "中文已拆",
      "scope": "priv"
    },
    {
      "id": "b8a28a6f-d29d-4c97-95b0-fd4f56196f8f",
      "productId": "9d4a1852-b314-4988-abff-69231460ad3b",
      "type": "SELL",
      "date": "2025-10-16",
      "quantity": 9,
      "pricePerUnitEUR": 20,
      "platform": "cm",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "9834b18a-08a4-45ec-ade3-74ad1ac6c468",
      "productId": "fef3d689-6de6-4873-b64b-b46e993c52fe",
      "type": "SELL",
      "date": "2025-10-19",
      "quantity": 1,
      "pricePerUnitEUR": 100,
      "platform": "cm",
      "note": "中文未拆",
      "scope": "priv"
    },
    {
      "id": "c44f30f7-2d8c-4125-a087-75ba2b2200a3",
      "productId": "fef3d689-6de6-4873-b64b-b46e993c52fe",
      "type": "SELL",
      "date": "2025-10-23",
      "quantity": 1,
      "pricePerUnitEUR": 0,
      "platform": "送ＣＣ",
      "note": "已開中文",
      "scope": "priv"
    },
    {
      "id": "aaae1bb1-6d25-4755-8702-d87f8d0736af",
      "productId": "5a05cb35-4936-4eed-9a26-20f6c8e18e29",
      "type": "SELL",
      "date": "2025-10-23",
      "quantity": 1,
      "pricePerUnitEUR": 0,
      "platform": "送ＣＣ",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "bdc6b403-562e-4337-aa25-7e8e3e1e98d8",
      "productId": "5a05cb35-4936-4eed-9a26-20f6c8e18e29",
      "type": "SELL",
      "date": "2025-10-28",
      "quantity": 1,
      "pricePerUnitEUR": 55,
      "platform": "Mp",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "2f601bbe-deac-4fed-95f6-aa1e646a0414",
      "productId": "9aeb3d33-54c4-4950-b75b-06f8908510ed",
      "type": "SELL",
      "date": "2025-10-25",
      "quantity": 1,
      "pricePerUnitEUR": 120,
      "platform": "Vinted",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "7497a79e-2013-4420-b984-8b7e4a44d8eb",
      "productId": "fef3d689-6de6-4873-b64b-b46e993c52fe",
      "type": "SELL",
      "date": "2025-10-25",
      "quantity": 1,
      "pricePerUnitEUR": 135,
      "platform": "Vinted",
      "note": "低能看錯可能想退",
      "scope": "priv"
    },
    {
      "id": "06ca3f63-01a1-40f5-9505-b1c6d89ab43a",
      "productId": "19e4c84f-3d9d-413f-8df1-201ea7f46f30",
      "type": "SELL",
      "date": "2025-10-03",
      "quantity": 5,
      "pricePerUnitEUR": 17.5,
      "platform": "CM",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "53fc19b7-532a-47c0-8ce6-da76088a9951",
      "productId": "aed7cba7-2263-4b79-a6e1-da755cb46972",
      "type": "SELL",
      "date": "2025-11-13",
      "quantity": 1,
      "pricePerUnitEUR": 19,
      "platform": "CM",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "6a2003f3-eaa0-4381-a453-946768dfe19b",
      "productId": "2de4c752-5a22-4eb5-a441-c25a1f7da658",
      "type": "SELL",
      "date": "2025-12-05",
      "quantity": 7,
      "pricePerUnitEUR": 96,
      "platform": "Breda",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "74101824-e838-4527-91ba-8b009df426bc",
      "productId": "9aeb3d33-54c4-4950-b75b-06f8908510ed",
      "type": "SELL",
      "date": "2025-12-05",
      "quantity": 16,
      "pricePerUnitEUR": 100,
      "platform": "Breda",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "9bfb5e97-f34b-419a-bab6-0e2c5672c433",
      "productId": "a933feb0-67dd-4dd8-919f-7862446fd5ed",
      "type": "SELL",
      "date": "2025-12-05",
      "quantity": 2,
      "pricePerUnitEUR": 8,
      "platform": "Breda",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "670d46d6-92a8-46ba-a2ab-e157914d285d",
      "productId": "9d4a1852-b314-4988-abff-69231460ad3b",
      "type": "SELL",
      "date": "2025-12-05",
      "quantity": 4,
      "pricePerUnitEUR": 10,
      "platform": "Breda",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "276919ef-f7fb-4afd-81e6-d705aa4395af",
      "productId": "fef3d689-6de6-4873-b64b-b46e993c52fe",
      "type": "SELL",
      "date": "2025-12-05",
      "quantity": 6,
      "pricePerUnitEUR": 95,
      "platform": "Breda",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "7622ccb6-7bf1-42f3-a68c-6566471097ae",
      "productId": "9aeb3d33-54c4-4950-b75b-06f8908510ed",
      "type": "SELL",
      "date": "2025-12-28",
      "quantity": 2,
      "pricePerUnitEUR": 84,
      "platform": "台灣卡展",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "a047cc19-46b3-4405-9273-af2f9840a4df",
      "productId": "19d7a88f-9da4-4006-b2c6-4b26da846a07",
      "type": "SELL",
      "date": "2026-01-01",
      "quantity": 1,
      "pricePerUnitEUR": 545,
      "platform": "社團",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "29fed7f1-19a0-41a1-9f95-40aeca3c99f3",
      "productId": "6c1ea19f-7742-48f5-baf0-d79ce0a13bbf",
      "type": "SELL",
      "date": "2026-01-23",
      "quantity": 1,
      "pricePerUnitEUR": 458.3333333,
      "platform": "",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "39e065d0-3eeb-4efa-a98b-db8a5cd232a9",
      "productId": "caa221c2-8ff8-41aa-acfd-3949ae93b7ac",
      "type": "SELL",
      "date": "2026-01-23",
      "quantity": 1,
      "pricePerUnitEUR": 83.33333333,
      "platform": "",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "d0268962-d733-477a-93c4-ef0cb1aadcc3",
      "productId": "04319b0a-d5cb-4f72-8ae8-3bb83030cfa6",
      "type": "SELL",
      "date": "2026-01-23",
      "quantity": 1,
      "pricePerUnitEUR": 708.3333333,
      "platform": "",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "fcb52781-1957-47a9-bee7-f7ee1da75293",
      "productId": "4509dc9d-d94c-4368-8acf-2bec56640c38",
      "type": "SELL",
      "date": "2026-01-22",
      "quantity": 2,
      "pricePerUnitEUR": 72,
      "platform": "",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "71d45e88-9119-46a1-bee1-df892d6e02ba",
      "productId": "c3bf05e0-5fab-401c-9107-b3b5bb85ac87",
      "type": "SELL",
      "date": "2026-01-22",
      "quantity": 2,
      "pricePerUnitEUR": 88,
      "platform": "",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "626fe2d6-8900-4b98-b9b7-4b7b7d3893ec",
      "productId": "2de4c752-5a22-4eb5-a441-c25a1f7da658",
      "type": "SELL",
      "date": "2026-02-21",
      "quantity": 2,
      "pricePerUnitEUR": 95,
      "platform": "",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "5e15ee67-8a10-4f85-89dd-cd84ef8fa28a",
      "productId": "9aeb3d33-54c4-4950-b75b-06f8908510ed",
      "type": "SELL",
      "date": "2026-02-21",
      "quantity": 11,
      "pricePerUnitEUR": 90,
      "platform": "",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "1814ea4f-1ad0-417b-b534-0c281e9dd000",
      "productId": "9d4a1852-b314-4988-abff-69231460ad3b",
      "type": "SELL",
      "date": "2026-02-21",
      "quantity": 1,
      "pricePerUnitEUR": 10,
      "platform": "",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "e2df9a5c-cc18-4084-8863-43650df5ced7",
      "productId": "b1b00c8b-d59e-41af-9a19-37063b108e5e",
      "type": "SELL",
      "date": "2026-02-21",
      "quantity": 5,
      "pricePerUnitEUR": 238,
      "platform": "",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "2be11066-d11e-43c3-aa9c-becd202b7656",
      "productId": "fef3d689-6de6-4873-b64b-b46e993c52fe",
      "type": "SELL",
      "date": "2026-02-21",
      "quantity": 5,
      "pricePerUnitEUR": 82.5,
      "platform": "",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "addfe9d4-ee31-435a-b219-d7f6eca8bd35",
      "productId": "b1b00c8b-d59e-41af-9a19-37063b108e5e",
      "type": "SELL",
      "date": "2026-03-07",
      "quantity": 2,
      "pricePerUnitEUR": 285,
      "platform": "CM",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "6f343da5-7786-4c98-ab70-bfff4c397bfc",
      "productId": "9aeb3d33-54c4-4950-b75b-06f8908510ed",
      "type": "SELL",
      "date": "2026-03-07",
      "quantity": 1,
      "pricePerUnitEUR": 120,
      "platform": "CM",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "6c2f9793-e0d3-49b4-ad71-3984b1775b71",
      "productId": "7751930d-72ab-4381-98e2-c9b4bb03665c",
      "type": "SELL",
      "date": "2026-03-07",
      "quantity": 3,
      "pricePerUnitEUR": 120,
      "platform": "CM",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "fb90868b-b15e-4bc0-9993-0d6c47effd21",
      "productId": "04319b0a-d5cb-4f72-8ae8-3bb83030cfa6",
      "type": "SELL",
      "date": "2026-03-07",
      "quantity": 1,
      "pricePerUnitEUR": 1100,
      "platform": "CM",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "98ac64cb-ff9e-4aef-903e-c325b59644bd",
      "productId": "b1b00c8b-d59e-41af-9a19-37063b108e5e",
      "type": "SELL",
      "date": "2026-03-13",
      "quantity": 1,
      "pricePerUnitEUR": 280,
      "platform": "Vinted",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "ee0be3e5-a082-416e-9414-580a9cbaabd8",
      "productId": "9aeb3d33-54c4-4950-b75b-06f8908510ed",
      "type": "SELL",
      "date": "2026-03-13",
      "quantity": 2,
      "pricePerUnitEUR": 110,
      "platform": "Marktplaat",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "b25ccaca-1939-4792-9f41-1bf661b73007",
      "productId": "610df0ee-11be-4927-82f5-b781d71abe1c",
      "type": "SELL",
      "date": "2026-03-14",
      "quantity": 1,
      "pricePerUnitEUR": 99,
      "platform": "CM",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "0aeb33ac-b64a-4918-b23d-7ffb0e2f4c74",
      "productId": "5ae7f787-6bd5-466d-94cb-b2d655d18230",
      "type": "SELL",
      "date": "2026-03-15",
      "quantity": 1,
      "pricePerUnitEUR": 190,
      "platform": "CM",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "f97dee41-0933-4caf-9abd-85db0a800fb7",
      "productId": "2de4c752-5a22-4eb5-a441-c25a1f7da658",
      "type": "BUY",
      "date": "2025-07-22",
      "quantity": 383,
      "pricePerUnitEUR": 11.45,
      "platform": "",
      "note": "歷史紀錄",
      "scope": "priv"
    },
    {
      "id": "c600deea-b39f-47b0-a8a2-1a92b63a6387",
      "productId": "19d7a88f-9da4-4006-b2c6-4b26da846a07",
      "type": "BUY",
      "date": "2025-07-24",
      "quantity": 253,
      "pricePerUnitEUR": 61,
      "platform": "",
      "note": "歷史紀錄",
      "scope": "priv"
    },
    {
      "id": "1f5dc066-d2af-4c3d-a47e-9bf2b5ef079a",
      "productId": "9aeb3d33-54c4-4950-b75b-06f8908510ed",
      "type": "BUY",
      "date": "2025-07-24",
      "quantity": 362,
      "pricePerUnitEUR": 32,
      "platform": "",
      "note": "歷史紀錄",
      "scope": "priv"
    },
    {
      "id": "059d3e73-7a6e-4ba5-a31c-ba4c4ade951c",
      "productId": "a933feb0-67dd-4dd8-919f-7862446fd5ed",
      "type": "BUY",
      "date": "2025-07-24",
      "quantity": 280,
      "pricePerUnitEUR": 12,
      "platform": "",
      "note": "歷史紀錄",
      "scope": "priv"
    },
    {
      "id": "1e00f37e-f48b-4e88-b74b-88055d78c5f7",
      "productId": "17dbfa15-4b4b-4239-8282-8cab718211c1",
      "type": "BUY",
      "date": "2025-07-24",
      "quantity": 230,
      "pricePerUnitEUR": 4,
      "platform": "",
      "note": "歷史紀錄",
      "scope": "priv"
    },
    {
      "id": "a6bb559e-0c9b-458c-b97b-9917eac416ab",
      "productId": "aed7cba7-2263-4b79-a6e1-da755cb46972",
      "type": "BUY",
      "date": "2025-07-24",
      "quantity": 250,
      "pricePerUnitEUR": 1.7,
      "platform": "",
      "note": "歷史紀錄",
      "scope": "priv"
    },
    {
      "id": "81aebfb1-38c3-4cdc-9d43-2c56cc1abf41",
      "productId": "79fe37d3-4e27-49ba-aad2-d9f93ad0744b",
      "type": "BUY",
      "date": "2025-07-24",
      "quantity": 130,
      "pricePerUnitEUR": 2.1,
      "platform": "",
      "note": "歷史紀錄",
      "scope": "priv"
    },
    {
      "id": "205b3f07-6527-40f6-a034-3b340f663f4b",
      "productId": "19e4c84f-3d9d-413f-8df1-201ea7f46f30",
      "type": "BUY",
      "date": "2025-07-24",
      "quantity": 360,
      "pricePerUnitEUR": 2,
      "platform": "",
      "note": "歷史紀錄",
      "scope": "priv"
    },
    {
      "id": "cae9405f-fd1b-488c-9070-d263efc59a6d",
      "productId": "07413788-4efa-4b11-b10f-4563cfd5e533",
      "type": "BUY",
      "date": "2025-07-24",
      "quantity": 47,
      "pricePerUnitEUR": 80,
      "platform": "",
      "note": "歷史紀錄",
      "scope": "priv"
    },
    {
      "id": "7d1b82c7-2b29-41bd-a404-5d757e1111a2",
      "productId": "fef3d689-6de6-4873-b64b-b46e993c52fe",
      "type": "BUY",
      "date": "2025-07-24",
      "quantity": 35,
      "pricePerUnitEUR": 8.6,
      "platform": "",
      "note": "歷史紀錄",
      "scope": "priv"
    },
    {
      "id": "7303c452-80fb-4715-9091-9bb57b3192fa",
      "productId": "5ae7f787-6bd5-466d-94cb-b2d655d18230",
      "type": "BUY",
      "date": "2025-07-24",
      "quantity": 44,
      "pricePerUnitEUR": 98,
      "platform": "",
      "note": "歷史紀錄",
      "scope": "priv"
    },
    {
      "id": "af2e73bd-0be3-4ecc-bd8f-6c262a464182",
      "productId": "9d4a1852-b314-4988-abff-69231460ad3b",
      "type": "BUY",
      "date": "2025-07-24",
      "quantity": 134,
      "pricePerUnitEUR": 2,
      "platform": "",
      "note": "歷史紀錄",
      "scope": "priv"
    },
    {
      "id": "89b78de9-23de-4998-9500-3a0497c8501a",
      "productId": "6dcab819-cd9c-4d5f-b685-f4cb32230003",
      "type": "BUY",
      "date": "2025-07-24",
      "quantity": 29,
      "pricePerUnitEUR": 90,
      "platform": "",
      "note": "歷史紀錄",
      "scope": "priv"
    },
    {
      "id": "cacddf46-81c2-4f0a-a207-fe840e46698f",
      "productId": "04319b0a-d5cb-4f72-8ae8-3bb83030cfa6",
      "type": "BUY",
      "date": "2025-07-24",
      "quantity": 7,
      "pricePerUnitEUR": 61,
      "platform": "",
      "note": "歷史紀錄",
      "scope": "priv"
    },
    {
      "id": "e4d87848-5d59-4197-af4e-aa8d6357403c",
      "productId": "caa221c2-8ff8-41aa-acfd-3949ae93b7ac",
      "type": "BUY",
      "date": "2025-07-24",
      "quantity": 7,
      "pricePerUnitEUR": 28.5,
      "platform": "",
      "note": "歷史紀錄",
      "scope": "priv"
    },
    {
      "id": "ad2a008f-e38d-4ec8-a34f-1be84ff5ed33",
      "productId": "6c1ea19f-7742-48f5-baf0-d79ce0a13bbf",
      "type": "BUY",
      "date": "2025-07-24",
      "quantity": 1,
      "pricePerUnitEUR": 120,
      "platform": "",
      "note": "歷史紀錄",
      "scope": "priv"
    },
    {
      "id": "cabcf5f9-17a5-4f9c-ad88-a178a7869979",
      "productId": "fe714a86-4020-464c-8417-46bb59206423",
      "type": "BUY",
      "date": "2025-07-24",
      "quantity": 4,
      "pricePerUnitEUR": 62,
      "platform": "",
      "note": "歷史紀錄",
      "scope": "priv"
    },
    {
      "id": "22640703-301f-43e3-899c-77a06e5647c3",
      "productId": "610df0ee-11be-4927-82f5-b781d71abe1c",
      "type": "BUY",
      "date": "2025-07-24",
      "quantity": 10,
      "pricePerUnitEUR": 40,
      "platform": "",
      "note": "歷史紀錄",
      "scope": "priv"
    },
    {
      "id": "484f2a3b-a175-4a9b-b0bb-265348e9bb35",
      "productId": "c3bf05e0-5fab-401c-9107-b3b5bb85ac87",
      "type": "BUY",
      "date": "2025-07-24",
      "quantity": 10,
      "pricePerUnitEUR": 40,
      "platform": "",
      "note": "歷史紀錄",
      "scope": "priv"
    },
    {
      "id": "194febbd-5ff1-45d1-94be-7f6d5ad42683",
      "productId": "ecca7e50-4817-45a1-89f9-93ca19a9a65a",
      "type": "BUY",
      "date": "2025-07-24",
      "quantity": 10,
      "pricePerUnitEUR": 114,
      "platform": "",
      "note": "歷史紀錄",
      "scope": "priv"
    },
    {
      "id": "fe2d2bc6-46a5-4929-980b-33b097ec3795",
      "productId": "ac7f189c-27d8-4140-bef1-cd3dde66d42f",
      "type": "BUY",
      "date": "2025-07-24",
      "quantity": 3,
      "pricePerUnitEUR": 550,
      "platform": "",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "2e89a9eb-1b7f-4061-b539-326684d24260",
      "productId": "b24b320a-e198-4ee2-9d50-36e8081fb699",
      "type": "BUY",
      "date": "2025-07-24",
      "quantity": 2,
      "pricePerUnitEUR": 517,
      "platform": "",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "8d2f363c-abef-4241-9483-78a2d964122e",
      "productId": "d55b90d9-cdc5-4c50-8f5a-406558cb84df",
      "type": "BUY",
      "date": "2025-07-24",
      "quantity": 2,
      "pricePerUnitEUR": 517,
      "platform": "",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "748f9d31-67b4-40f8-854a-cb106b8af39a",
      "productId": "9d4a1852-b314-4988-abff-69231460ad3b",
      "type": "BUY",
      "date": "2025-07-29",
      "quantity": 55,
      "pricePerUnitEUR": 2.3,
      "platform": "fb",
      "note": "Line Kid",
      "scope": "priv"
    },
    {
      "id": "fedbaad7-56b8-4790-a84e-6eccfab39ecc",
      "productId": "fef3d689-6de6-4873-b64b-b46e993c52fe",
      "type": "BUY",
      "date": "2025-07-29",
      "quantity": 3,
      "pricePerUnitEUR": 17,
      "platform": "fb",
      "note": "許博恩+蔡佳琪",
      "scope": "priv"
    },
    {
      "id": "446dbd78-b05d-4f7d-8884-cc632adc50bf",
      "productId": "9d4a1852-b314-4988-abff-69231460ad3b",
      "type": "BUY",
      "date": "2025-07-29",
      "quantity": 8,
      "pricePerUnitEUR": 1.8,
      "platform": "fb",
      "note": "金伯鈞",
      "scope": "priv"
    },
    {
      "id": "3c20de13-5785-4ac5-a939-fc7b4f82b094",
      "productId": "fef3d689-6de6-4873-b64b-b46e993c52fe",
      "type": "BUY",
      "date": "2025-08-11",
      "quantity": 14,
      "pricePerUnitEUR": 33,
      "platform": "",
      "note": "余泓慶",
      "scope": "priv"
    },
    {
      "id": "d55f7d37-b658-44eb-8d9e-412e9c3cfd71",
      "productId": "9d4a1852-b314-4988-abff-69231460ad3b",
      "type": "BUY",
      "date": "2025-08-18",
      "quantity": 31,
      "pricePerUnitEUR": 2,
      "platform": "",
      "note": "張博峻",
      "scope": "priv"
    },
    {
      "id": "4fad9294-27b3-45de-8944-4c1c65671b79",
      "productId": "5a05cb35-4936-4eed-9a26-20f6c8e18e29",
      "type": "BUY",
      "date": "2025-08-18",
      "quantity": 50,
      "pricePerUnitEUR": 7.5,
      "platform": "Joe Chou",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "67d3d9ff-5318-4e34-b430-4b326f8d41f8",
      "productId": "5a05cb35-4936-4eed-9a26-20f6c8e18e29",
      "type": "BUY",
      "date": "2025-08-18",
      "quantity": 2,
      "pricePerUnitEUR": 11.5,
      "platform": "小剛",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "630abe3e-f0f4-4807-96bf-eba0e8ed6304",
      "productId": "5a05cb35-4936-4eed-9a26-20f6c8e18e29",
      "type": "BUY",
      "date": "2025-09-07",
      "quantity": 200,
      "pricePerUnitEUR": 8.5,
      "platform": "雞哥",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "de2ce724-e7dd-4e44-b4aa-4c1f7660fd7c",
      "productId": "5afeec27-9489-4afb-90a7-2f907ec195ad",
      "type": "BUY",
      "date": "2025-04-30",
      "quantity": 100,
      "pricePerUnitEUR": 7,
      "platform": "屁貓爸",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "aa06d890-755b-477a-a020-d159ad453ce1",
      "productId": "5a05cb35-4936-4eed-9a26-20f6c8e18e29",
      "type": "BUY",
      "date": "2025-09-14",
      "quantity": 95,
      "pricePerUnitEUR": 8,
      "platform": "名古屋",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "c3fbeaed-aa10-460f-b489-16bb981679c9",
      "productId": "2fe47209-7967-4113-919f-c86135b75365",
      "type": "BUY",
      "date": "2025-10-30",
      "quantity": 2,
      "pricePerUnitEUR": 35,
      "platform": "",
      "note": "放在荷蘭",
      "scope": "priv"
    },
    {
      "id": "b734702e-b65c-4ef3-a13a-c0e7b1ed38ad",
      "productId": "fef3d689-6de6-4873-b64b-b46e993c52fe",
      "type": "BUY",
      "date": "2026-01-01",
      "quantity": 13,
      "pricePerUnitEUR": 35,
      "platform": "",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "cba34f35-be14-42cd-bec5-8a52117fa902",
      "productId": "fef3d689-6de6-4873-b64b-b46e993c52fe",
      "type": "BUY",
      "date": "2026-01-01",
      "quantity": 2,
      "pricePerUnitEUR": 36,
      "platform": "fb社團",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "22a36f4c-e35e-4f29-8570-8e5a4bbd76d1",
      "productId": "b1b00c8b-d59e-41af-9a19-37063b108e5e",
      "type": "BUY",
      "date": "2026-01-22",
      "quantity": 35,
      "pricePerUnitEUR": 72,
      "platform": "",
      "note": "fb收卡",
      "scope": "priv"
    },
    {
      "id": "49b6d90d-08b6-4c15-aab2-08ddadb55169",
      "productId": "9a70b377-1d1c-44cf-9879-bee36a0f358c",
      "type": "BUY",
      "date": "2026-01-24",
      "quantity": 2,
      "pricePerUnitEUR": 76,
      "platform": "PC",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "5263b385-2b77-4163-99f6-6eaabbd230e6",
      "productId": "89500b40-04b0-4c38-8f31-8de9ac7430ca",
      "type": "BUY",
      "date": "2026-01-24",
      "quantity": 2,
      "pricePerUnitEUR": 76,
      "platform": "PC",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "070e002d-bbef-408c-af26-32c91f835556",
      "productId": "cc2831fe-ef59-4c81-8bc7-5e3f882483cc",
      "type": "BUY",
      "date": "2026-01-24",
      "quantity": 4,
      "pricePerUnitEUR": 35,
      "platform": "PC",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "76c9c647-03a0-4c4e-9428-0d3a1c78977e",
      "productId": "e46f0f7e-f669-49ae-9364-ff57d2f30c24",
      "type": "BUY",
      "date": "2026-01-24",
      "quantity": 1,
      "pricePerUnitEUR": 40,
      "platform": "PC",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "650c0ac6-7c69-431a-8b19-9835b777a016",
      "productId": "c3bf05e0-5fab-401c-9107-b3b5bb85ac87",
      "type": "BUY",
      "date": "2026-01-24",
      "quantity": 3,
      "pricePerUnitEUR": 35,
      "platform": "PC",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "b33b58af-805c-4fe6-a57e-6f427ad705ad",
      "productId": "af172af7-c0ba-4aad-aa04-398b57cb9cbb",
      "type": "BUY",
      "date": "2026-01-24",
      "quantity": 16,
      "pricePerUnitEUR": 111,
      "platform": "",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "5adfebe0-4e7c-4761-91f1-fcebffe1f9e4",
      "productId": "06baedb9-dd5c-4b5d-94ce-1310a476c75c",
      "type": "BUY",
      "date": "2026-01-24",
      "quantity": 6,
      "pricePerUnitEUR": 35,
      "platform": "PC",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "1579600c-7315-469c-9564-45c6071e98d3",
      "productId": "9dd3b54e-1fd6-4f44-8f82-b09988f427ac",
      "type": "BUY",
      "date": "2026-01-24",
      "quantity": 4,
      "pricePerUnitEUR": 16,
      "platform": "PC",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "8d79e292-bf43-410d-8b73-ac2e8edf087a",
      "productId": "fef3d689-6de6-4873-b64b-b46e993c52fe",
      "type": "BUY",
      "date": "2026-02-03",
      "quantity": 18,
      "pricePerUnitEUR": 42,
      "platform": "蝦皮",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "32df80fa-4072-47ad-8927-a260addbb4d9",
      "productId": "9d4a1852-b314-4988-abff-69231460ad3b",
      "type": "BUY",
      "date": "2026-02-03",
      "quantity": 15,
      "pricePerUnitEUR": 2.5,
      "platform": "蝦皮",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "aa1a6cf5-3442-47bb-bc58-78f06be98c0e",
      "productId": "f8fe4b50-1937-44d4-b5e8-78c8d6aaa70f",
      "type": "BUY",
      "date": "2026-01-24",
      "quantity": 3,
      "pricePerUnitEUR": 16,
      "platform": "PC",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "afabc7b2-6f78-46dd-8486-a596231f6549",
      "productId": "1a386c35-3483-47c6-bbc1-45e66ad709dd",
      "type": "BUY",
      "date": "2026-01-24",
      "quantity": 1,
      "pricePerUnitEUR": 35,
      "platform": "PC",
      "note": "",
      "scope": "priv"
    },
    {
      "id": "64cade02-0f93-4b33-bfa2-ea95bfc7f3fc",
      "productId": "7751930d-72ab-4381-98e2-c9b4bb03665c",
      "type": "BUY",
      "date": "2024-01-07",
      "quantity": 7,
      "pricePerUnitEUR": 22,
      "platform": "日本郵局",
      "note": "",
      "scope": "priv"
    },
    {
      "productId": "d55b90d9-cdc5-4c50-8f5a-406558cb84df",
      "type": "SELL",
      "date": "2025-01-16",
      "quantity": 1,
      "pricePerUnitEUR": 2222,
      "platform": "小管家",
      "note": "",
      "id": "4a681fa3-2d9e-4108-83a2-b97c06d16109",
      "scope": "priv"
    },
    {
      "productId": "202bf6a7-c1de-4d1b-a2df-682cc8c09389",
      "type": "BUY",
      "date": "2024-01-17",
      "quantity": 1,
      "pricePerUnitEUR": 300,
      "platform": "",
      "note": "",
      "id": "a5c8187b-f6db-474d-9fe9-ce60fcec8452",
      "scope": "priv"
    },
    {
      "productId": "202bf6a7-c1de-4d1b-a2df-682cc8c09389",
      "type": "SELL",
      "date": "2026-03-17",
      "quantity": 1,
      "pricePerUnitEUR": 580,
      "platform": "CM",
      "note": "",
      "id": "cf386f2e-8010-45a2-b9c8-5d0825622f84",
      "scope": "priv"
    },
    {
      "productId": "7c27c685-47e7-4a79-b44a-8ef010c0ee81",
      "type": "BUY",
      "date": "2026-02-28",
      "quantity": 30,
      "pricePerUnitEUR": 20,
      "platform": "CM",
      "note": "",
      "id": "7089e6bd-31ba-4eb5-886a-521deee96de3",
      "scope": "priv"
    },
    {
      "productId": "7c27c685-47e7-4a79-b44a-8ef010c0ee81",
      "type": "BUY",
      "date": "2026-03-17",
      "quantity": 36,
      "pricePerUnitEUR": 22,
      "platform": "CM",
      "note": "",
      "id": "44c0ea99-3c1d-45d8-b4cd-42303acc8b21",
      "scope": "priv"
    },
    {
      "productId": "82f24a15-f1fb-4291-af9a-562bc2c4605a",
      "type": "BUY",
      "date": "2026-03-17",
      "quantity": 10,
      "pricePerUnitEUR": 30,
      "platform": "",
      "note": "",
      "id": "7e196528-867d-4815-af88-44d1b529430d",
      "scope": "priv"
    },
    {
      "productId": "c4715583-a506-4406-b4e7-b77ec47c7b10",
      "type": "BUY",
      "date": "2026-03-17",
      "quantity": 5,
      "pricePerUnitEUR": 115,
      "platform": "",
      "note": "",
      "id": "112a0174-ea8b-4df1-8a4b-d02a2cbde698",
      "scope": "priv"
    },
    {
      "productId": "7c27c685-47e7-4a79-b44a-8ef010c0ee81",
      "type": "BUY",
      "date": "2026-03-19",
      "quantity": 23,
      "pricePerUnitEUR": 23.17,
      "platform": "CM",
      "note": "RonzosRectangles ",
      "id": "ac301812-085c-43d4-9129-89578dd697b6",
      "scope": "priv"
    },
    {
      "productId": "7c27c685-47e7-4a79-b44a-8ef010c0ee81",
      "type": "BUY",
      "date": "2026-03-19",
      "quantity": 1,
      "pricePerUnitEUR": 19,
      "platform": "CM",
      "note": "Hall79w ",
      "id": "30c4b44a-0874-4cab-90e8-75d7a10ff425",
      "scope": "priv"
    },
    {
      "productId": "7c27c685-47e7-4a79-b44a-8ef010c0ee81",
      "type": "BUY",
      "date": "2026-03-21",
      "quantity": 22,
      "pricePerUnitEUR": 22.5,
      "platform": "CM",
      "note": "",
      "id": "8439ce7a-d29a-4275-a1e5-f01581a1d39b",
      "scope": "priv"
    },
    {
      "productId": "610df0ee-11be-4927-82f5-b781d71abe1c",
      "type": "SELL",
      "date": "2026-03-24",
      "quantity": 1,
      "pricePerUnitEUR": 99,
      "platform": "CM",
      "note": "",
      "id": "36e27e0a-abd0-42aa-a3bf-1c282294874e",
      "scope": "priv"
    },
    {
      "type": "GRADE",
      "productId": "9aeb3d33-54c4-4950-b75b-06f8908510ed",
      "targetProductId": "28459e9c-44a1-4efa-b6a8-5a5a7bac3e0c",
      "date": "2026-03-26",
      "quantity": 6,
      "pricePerUnitEUR": 32,
      "feePerUnitEUR": 17,
      "platform": "PSA",
      "gradingService": "PSA",
      "gradingScore": "10",
      "note": "送評鑑: PSA 10",
      "id": "e671c69a-b1b9-49e6-9bcf-335c34bfc853",
      "scope": "priv"
    },
    {
      "type": "GRADE",
      "productId": "07413788-4efa-4b11-b10f-4563cfd5e533",
      "targetProductId": "885d53eb-deee-471b-8280-72d2149a31f4",
      "date": "2026-03-26",
      "quantity": 1,
      "pricePerUnitEUR": 80,
      "feePerUnitEUR": 95,
      "platform": "PSA",
      "gradingService": "PSA",
      "gradingScore": "10",
      "note": "送評鑑: PSA 10",
      "id": "2bfba6d8-ff0b-4a8b-affa-5d3c6c8d6440",
      "scope": "priv"
    },
    {
      "type": "GRADE",
      "productId": "19d7a88f-9da4-4006-b2c6-4b26da846a07",
      "targetProductId": "31d073c2-4577-4b76-8c57-69aa3574b0c8",
      "date": "2026-03-26",
      "quantity": 1,
      "pricePerUnitEUR": 61,
      "feePerUnitEUR": 95,
      "platform": "PSA",
      "gradingService": "PSA",
      "gradingScore": "10",
      "note": "送評鑑: PSA 10",
      "id": "0fb4f8c5-17e7-41ca-91f1-021e47b8b009",
      "scope": "priv"
    },
    {
      "type": "GRADE",
      "productId": "5ae7f787-6bd5-466d-94cb-b2d655d18230",
      "targetProductId": "ba3e39ea-88fa-47e2-8b87-e0aced7a821e",
      "date": "2026-03-26",
      "quantity": 2,
      "pricePerUnitEUR": 98,
      "feePerUnitEUR": 17,
      "platform": "PSA",
      "gradingService": "PSA",
      "gradingScore": "10",
      "note": "送評鑑: PSA 10",
      "id": "d0e41ed8-4a8b-4346-b44d-ef2677677a97",
      "scope": "priv"
    },
    {
      "type": "GRADE",
      "productId": "fef3d689-6de6-4873-b64b-b46e993c52fe",
      "targetProductId": "1cd915ab-1a62-4b0b-b7d0-b3efb351316c",
      "date": "2026-03-26",
      "quantity": 1,
      "pricePerUnitEUR": 24.67058823529412,
      "feePerUnitEUR": 17,
      "platform": "PSA",
      "gradingService": "PSA",
      "gradingScore": "10",
      "note": "送評鑑: PSA 10",
      "id": "d0d468ae-68ea-4e15-99da-4a31e83b8e2d",
      "scope": "priv"
    },
    {
      "productId": "9aeb3d33-54c4-4950-b75b-06f8908510ed",
      "type": "SELL",
      "date": "2026-03-27",
      "quantity": 5,
      "pricePerUnitEUR": 120,
      "platform": "CM",
      "note": "",
      "id": "06664dd7-c75b-4d0c-a09a-f9facf845018",
      "scope": "priv"
    },
    {
      "productId": "b1b00c8b-d59e-41af-9a19-37063b108e5e",
      "type": "SELL",
      "date": "2026-04-09",
      "quantity": 3,
      "pricePerUnitEUR": 333,
      "platform": "",
      "note": "",
      "id": "f5694e0c-b1f2-427d-9b62-944ea25a4b2b",
      "scope": "priv"
    },
    {
      "type": "GRADE",
      "productId": "9aeb3d33-54c4-4950-b75b-06f8908510ed",
      "targetProductId": "1f7f9227-d8ed-4692-8a1b-53870b25b936",
      "date": "2026-04-10",
      "quantity": 1,
      "pricePerUnitEUR": 32,
      "feePerUnitEUR": 27,
      "platform": "BGS",
      "gradingService": "BGS",
      "gradingScore": "10",
      "note": "送評鑑: BGS 10",
      "id": "832cc838-55b9-4af7-a49f-5ca535a0bd7e",
      "scope": "priv"
    },
    {
      "type": "GRADE",
      "productId": "aed7cba7-2263-4b79-a6e1-da755cb46972",
      "targetProductId": "ce6afc29-af24-4e3c-a8b6-4055b532921b",
      "date": "2026-04-10",
      "quantity": 1,
      "pricePerUnitEUR": 1.7,
      "feePerUnitEUR": 27,
      "platform": "BGS",
      "gradingService": "BGS",
      "gradingScore": "10",
      "note": "送評鑑: BGS 10",
      "id": "6023b296-12fd-4057-a95b-fbbec94f1d4b",
      "scope": "priv"
    },
    {
      "type": "GRADE",
      "productId": "19e4c84f-3d9d-413f-8df1-201ea7f46f30",
      "targetProductId": "389c7ceb-db25-4827-b2ec-12f2eb56b992",
      "date": "2026-04-10",
      "quantity": 1,
      "pricePerUnitEUR": 2,
      "feePerUnitEUR": 27,
      "platform": "BGS",
      "gradingService": "BGS",
      "gradingScore": "10",
      "note": "送評鑑: BGS 10",
      "id": "079ce196-7d7b-4b08-a5ce-7fb699a497cc",
      "scope": "priv"
    },
    {
      "type": "GRADE",
      "productId": "19e4c84f-3d9d-413f-8df1-201ea7f46f30",
      "targetProductId": "c8486986-76ba-4b88-967c-9405f368c4c7",
      "date": "2026-04-10",
      "quantity": 6,
      "pricePerUnitEUR": 2,
      "feePerUnitEUR": 27,
      "platform": "BGS",
      "gradingService": "BGS",
      "gradingScore": "9,5",
      "note": "送評鑑: BGS 9,5",
      "id": "ea990ca5-df1b-4e8b-9497-ed6fd116d165",
      "scope": "priv"
    },
    {
      "type": "GRADE",
      "productId": "19e4c84f-3d9d-413f-8df1-201ea7f46f30",
      "targetProductId": "277f7891-8c41-4c22-a960-8b48fd10da7d",
      "date": "2026-04-10",
      "quantity": 1,
      "pricePerUnitEUR": 2,
      "feePerUnitEUR": 27,
      "platform": "BGS",
      "gradingService": "BGS",
      "gradingScore": "9",
      "note": "送評鑑: BGS 9",
      "id": "65cf8fdf-3102-4111-9428-ebb8ab363392",
      "scope": "priv"
    },
    {
      "type": "GRADE",
      "productId": "fef3d689-6de6-4873-b64b-b46e993c52fe",
      "targetProductId": "3880deb5-fc60-4758-8f64-30169611fa7a",
      "date": "2026-04-10",
      "quantity": 1,
      "pricePerUnitEUR": 24.67058823529412,
      "feePerUnitEUR": 27,
      "platform": "BGS",
      "gradingService": "BGS",
      "gradingScore": "9.5",
      "note": "送評鑑: BGS 9.5",
      "id": "62e6417f-8c07-408f-9f88-c2c5398b23c7",
      "scope": "priv"
    },
    {
      "productId": "2de4c752-5a22-4eb5-a441-c25a1f7da658",
      "type": "SELL",
      "date": "2026-04-14",
      "quantity": 1,
      "pricePerUnitEUR": 100,
      "platform": "Vinted",
      "note": "",
      "id": "d9d1216e-0106-4b15-844a-14120698a015",
      "scope": "priv"
    },
    {
      "productId": "b1b00c8b-d59e-41af-9a19-37063b108e5e",
      "type": "SELL",
      "date": "2026-06-19",
      "quantity": 1,
      "pricePerUnitEUR": 299,
      "platform": "Vinted",
      "note": "",
      "id": "0cb8df6a-0151-46e8-af41-8fbda5838fdd",
      "scope": "priv"
    },
    {
      "productId": "2de4c752-5a22-4eb5-a441-c25a1f7da658",
      "type": "SELL",
      "date": "2026-06-19",
      "quantity": 1,
      "pricePerUnitEUR": 100,
      "platform": "Vinted",
      "note": "",
      "id": "0df21eca-7e62-4aa5-9482-09a55a32867e",
      "scope": "priv"
    },
    {
      "productId": "17dbfa15-4b4b-4239-8282-8cab718211c1",
      "type": "SELL",
      "date": "2026-06-19",
      "quantity": 1,
      "pricePerUnitEUR": 30,
      "platform": "Vinted",
      "note": "",
      "id": "f6542670-2158-4436-8e9e-9ee5963e6ac6",
      "scope": "priv"
    },
    {
      "productId": "79fe37d3-4e27-49ba-aad2-d9f93ad0744b",
      "type": "SELL",
      "date": "2026-06-19",
      "quantity": 1,
      "pricePerUnitEUR": 29.97,
      "platform": "Vinted",
      "note": "",
      "id": "37ca76cf-f932-488b-a55f-1572d1a1f702",
      "scope": "priv"
    },
    {
      "productId": "aed7cba7-2263-4b79-a6e1-da755cb46972",
      "type": "SELL",
      "date": "2026-06-19",
      "quantity": 1,
      "pricePerUnitEUR": 30,
      "platform": "Vinted",
      "note": "",
      "id": "62b7dfb3-8115-4489-bc88-d29545f7d61f",
      "scope": "priv"
    },
    {
      "productId": "19e4c84f-3d9d-413f-8df1-201ea7f46f30",
      "type": "SELL",
      "date": "2026-06-19",
      "quantity": 1,
      "pricePerUnitEUR": 30,
      "platform": "Vinted",
      "note": "",
      "id": "9ac5bb32-6a38-4666-97a1-9666ad4a5cd8",
      "scope": "priv"
    },
    {
      "productId": "17dbfa15-4b4b-4239-8282-8cab718211c1",
      "type": "SELL",
      "date": "2026-06-19",
      "quantity": 1,
      "pricePerUnitEUR": 34,
      "platform": "Vinted",
      "note": "",
      "id": "56705019-e7ce-402c-a850-d147526ef4f8",
      "scope": "priv"
    },
    {
      "productId": "79fe37d3-4e27-49ba-aad2-d9f93ad0744b",
      "type": "SELL",
      "date": "2026-06-19",
      "quantity": 1,
      "pricePerUnitEUR": 34,
      "platform": "Vinted",
      "note": "",
      "id": "b6fcc256-6e36-45ad-9972-9573968eabbd",
      "scope": "priv"
    },
    {
      "productId": "aed7cba7-2263-4b79-a6e1-da755cb46972",
      "type": "SELL",
      "date": "2026-06-19",
      "quantity": 1,
      "pricePerUnitEUR": 33.97,
      "platform": "Vinted",
      "note": "",
      "id": "9a4e89b8-843b-4025-b3f9-4d8134262a17",
      "scope": "priv"
    },
    {
      "productId": "19e4c84f-3d9d-413f-8df1-201ea7f46f30",
      "type": "SELL",
      "date": "2026-06-19",
      "quantity": 1,
      "pricePerUnitEUR": 33.97,
      "platform": "Vinted",
      "note": "",
      "id": "ba9d99ea-5e86-49d1-b49f-368201f9a932",
      "scope": "priv"
    },
    {
      "productId": "2de4c752-5a22-4eb5-a441-c25a1f7da658",
      "type": "SELL",
      "date": "2026-06-19",
      "quantity": 1,
      "pricePerUnitEUR": 135,
      "platform": "Vinted",
      "note": "",
      "id": "1837918b-9039-49a4-80d8-6f4f3c12da10",
      "scope": "priv"
    },
    {
      "productId": "9aeb3d33-54c4-4950-b75b-06f8908510ed",
      "type": "SELL",
      "date": "2026-06-19",
      "quantity": 1,
      "pricePerUnitEUR": 215,
      "platform": "Vinted",
      "note": "",
      "id": "51e2c185-3866-4732-b6c2-ae06b6ab28d3",
      "scope": "priv"
    },
    {
      "productId": "fef3d689-6de6-4873-b64b-b46e993c52fe",
      "type": "SELL",
      "date": "2026-06-19",
      "quantity": 1,
      "pricePerUnitEUR": 130,
      "platform": "CM",
      "note": "",
      "id": "592c586d-eabf-48c2-a9db-4e3820cff26a",
      "scope": "priv"
    },
    {
      "productId": "5ae7f787-6bd5-466d-94cb-b2d655d18230",
      "type": "SELL",
      "date": "2026-06-19",
      "quantity": 1,
      "pricePerUnitEUR": 195,
      "platform": "CM",
      "note": "",
      "id": "cacf242e-4cd8-4ff2-9f0e-3af81edb449a",
      "scope": "priv"
    },
    {
      "productId": "6dcab819-cd9c-4d5f-b685-f4cb32230003",
      "type": "SELL",
      "date": "2026-06-19",
      "quantity": 3,
      "pricePerUnitEUR": 1499,
      "platform": "CM",
      "note": "",
      "id": "74ac287f-2f0e-4183-90cb-46a2caa95ae0",
      "scope": "priv"
    },
    {
      "productId": "5ae7f787-6bd5-466d-94cb-b2d655d18230",
      "type": "SELL",
      "date": "2026-06-19",
      "quantity": 1,
      "pricePerUnitEUR": 245,
      "platform": "CM",
      "note": "",
      "id": "aaea48f4-0394-4071-b985-1077cc1ba4f6",
      "scope": "priv"
    },
    {
      "type": "GRADE",
      "productId": "9aeb3d33-54c4-4950-b75b-06f8908510ed",
      "targetProductId": "28459e9c-44a1-4efa-b6a8-5a5a7bac3e0c",
      "date": "2026-06-19",
      "quantity": 36,
      "pricePerUnitEUR": 32,
      "feePerUnitEUR": 20,
      "platform": "PSA",
      "gradingService": "PSA",
      "gradingScore": "10",
      "note": "送評鑑: PSA 10",
      "id": "1f5c1bcf-9c4b-4f4d-94b5-8d29b558e1ee",
      "scope": "priv"
    },
    {
      "type": "GRADE",
      "productId": "9aeb3d33-54c4-4950-b75b-06f8908510ed",
      "targetProductId": "1eb42cab-dac9-4698-b4b0-7754a78805a4",
      "date": "2026-06-19",
      "quantity": 2,
      "pricePerUnitEUR": 32,
      "feePerUnitEUR": 20,
      "platform": "PSA",
      "gradingService": "PSA",
      "gradingScore": "9",
      "note": "送評鑑: PSA 9",
      "id": "00a682c9-3980-493c-afa2-129d7e5465b8",
      "scope": "priv"
    },
    {
      "type": "GRADE",
      "productId": "19e4c84f-3d9d-413f-8df1-201ea7f46f30",
      "targetProductId": "d140bc87-af08-4df3-9980-c6ddf8ec98fb",
      "date": "2026-06-19",
      "quantity": 20,
      "pricePerUnitEUR": 2,
      "feePerUnitEUR": 20,
      "platform": "PSA",
      "gradingService": "PSA",
      "gradingScore": "10",
      "note": "送評鑑: PSA 10",
      "id": "6e9f1016-dd07-406d-8f5f-321706d9fb94",
      "scope": "priv"
    },
    {
      "type": "GRADE",
      "productId": "19e4c84f-3d9d-413f-8df1-201ea7f46f30",
      "targetProductId": "22e39af9-5ed7-4a26-9383-aa0bb8e88a38",
      "date": "2026-06-19",
      "quantity": 1,
      "pricePerUnitEUR": 2,
      "feePerUnitEUR": 20,
      "platform": "PSA",
      "gradingService": "PSA",
      "gradingScore": "9",
      "note": "送評鑑: PSA 9",
      "id": "6dfd4ef3-d1ec-43be-a013-02f202d2ab4c",
      "scope": "priv"
    },
    {
      "type": "GRADE",
      "productId": "79fe37d3-4e27-49ba-aad2-d9f93ad0744b",
      "targetProductId": "d2ac6544-64bf-476f-a3b3-31d8abe096a3",
      "date": "2026-06-19",
      "quantity": 17,
      "pricePerUnitEUR": 2.1,
      "feePerUnitEUR": 20,
      "platform": "PSA",
      "gradingService": "PSA",
      "gradingScore": "10",
      "note": "送評鑑: PSA 10",
      "id": "78bf466f-9887-45aa-aa33-ba2f792418af",
      "scope": "priv"
    },
    {
      "type": "GRADE",
      "productId": "79fe37d3-4e27-49ba-aad2-d9f93ad0744b",
      "targetProductId": "87328a72-8a47-45c8-ab79-e5c979d3f358",
      "date": "2026-06-19",
      "quantity": 3,
      "pricePerUnitEUR": 2.1,
      "feePerUnitEUR": 20,
      "platform": "PSA",
      "gradingService": "PSA",
      "gradingScore": "9",
      "note": "送評鑑: PSA 9",
      "id": "f8103b0a-6193-4f9d-bf07-d342ffc14579",
      "scope": "priv"
    },
    {
      "type": "GRADE",
      "productId": "aed7cba7-2263-4b79-a6e1-da755cb46972",
      "targetProductId": "a5309ff3-03b6-4d43-b81b-943b420f3dd8",
      "date": "2026-06-19",
      "quantity": 7,
      "pricePerUnitEUR": 1.7,
      "feePerUnitEUR": 20,
      "platform": "PSA",
      "gradingService": "PSA",
      "gradingScore": "10",
      "note": "送評鑑: PSA 10",
      "id": "3cb5158a-a9fa-4f52-8150-bf86d7618f14",
      "scope": "priv"
    },
    {
      "type": "GRADE",
      "productId": "17dbfa15-4b4b-4239-8282-8cab718211c1",
      "targetProductId": "4e646cff-271d-493b-b346-22dfc7f9c046",
      "date": "2026-06-19",
      "quantity": 5,
      "pricePerUnitEUR": 4,
      "feePerUnitEUR": 20,
      "platform": "PSA",
      "gradingService": "PSA",
      "gradingScore": "10",
      "note": "送評鑑: PSA 10",
      "id": "557a81c0-aebe-40bb-9d9b-6de9e3b146e4",
      "scope": "priv"
    },
    {
      "type": "GRADE",
      "productId": "17dbfa15-4b4b-4239-8282-8cab718211c1",
      "targetProductId": "908b8d6e-1c1d-4214-ac82-ea4325bb1910",
      "date": "2026-06-19",
      "quantity": 5,
      "pricePerUnitEUR": 4,
      "feePerUnitEUR": 20,
      "platform": "PSA",
      "gradingService": "PSA",
      "gradingScore": "9",
      "note": "送評鑑: PSA 9",
      "id": "239fe303-5c9a-4081-bd83-e453300ecafb",
      "scope": "priv"
    },
    {
      "type": "GRADE",
      "productId": "fef3d689-6de6-4873-b64b-b46e993c52fe",
      "targetProductId": "1cd915ab-1a62-4b0b-b7d0-b3efb351316c",
      "date": "2026-06-19",
      "quantity": 9,
      "pricePerUnitEUR": 24.67058823529412,
      "feePerUnitEUR": 20,
      "platform": "PSA",
      "gradingService": "PSA",
      "gradingScore": "10",
      "note": "送評鑑: PSA 10",
      "id": "c1d10686-5351-48a3-96cf-a8ecae8a69a5",
      "scope": "priv"
    },
    {
      "type": "GRADE",
      "productId": "fef3d689-6de6-4873-b64b-b46e993c52fe",
      "targetProductId": "3ddb01ae-9fc0-4791-9c13-1b39cadf1f24",
      "date": "2026-06-19",
      "quantity": 1,
      "pricePerUnitEUR": 24.67058823529412,
      "feePerUnitEUR": 20,
      "platform": "PSA",
      "gradingService": "PSA",
      "gradingScore": "9",
      "note": "送評鑑: PSA 9",
      "id": "aa7e92df-bb6a-4d95-b540-336a1a4badc8",
      "scope": "priv"
    },
    {
      "type": "GRADE",
      "productId": "5ae7f787-6bd5-466d-94cb-b2d655d18230",
      "targetProductId": "ba3e39ea-88fa-47e2-8b87-e0aced7a821e",
      "date": "2026-06-19",
      "quantity": 6,
      "pricePerUnitEUR": 98,
      "feePerUnitEUR": 20,
      "platform": "PSA",
      "gradingService": "PSA",
      "gradingScore": "10",
      "note": "送評鑑: PSA 10",
      "id": "1fcf54ea-27c9-4f60-8395-a68ba57a4ca4",
      "scope": "priv"
    },
    {
      "type": "GRADE",
      "productId": "5ae7f787-6bd5-466d-94cb-b2d655d18230",
      "targetProductId": "6a1ca05f-01f0-4657-83dc-397b66fe4cfa",
      "date": "2026-06-19",
      "quantity": 1,
      "pricePerUnitEUR": 98,
      "feePerUnitEUR": 20,
      "platform": "PSA",
      "gradingService": "PSA",
      "gradingScore": "9",
      "note": "送評鑑: PSA 9",
      "id": "f0513982-41fc-4e09-9bcc-77439afad39f",
      "scope": "priv"
    },
    {
      "type": "GRADE",
      "productId": "19d7a88f-9da4-4006-b2c6-4b26da846a07",
      "targetProductId": "31d073c2-4577-4b76-8c57-69aa3574b0c8",
      "date": "2026-06-19",
      "quantity": 2,
      "pricePerUnitEUR": 61,
      "feePerUnitEUR": 100,
      "platform": "PSA",
      "gradingService": "PSA",
      "gradingScore": "10",
      "note": "送評鑑: PSA 10",
      "id": "df23363e-024f-4764-a300-4f913ce7a7f4",
      "scope": "priv"
    },
    {
      "type": "GRADE",
      "productId": "07413788-4efa-4b11-b10f-4563cfd5e533",
      "targetProductId": "885d53eb-deee-471b-8280-72d2149a31f4",
      "date": "2026-06-19",
      "quantity": 4,
      "pricePerUnitEUR": 80,
      "feePerUnitEUR": 55,
      "platform": "PSA",
      "gradingService": "PSA",
      "gradingScore": "10",
      "note": "送評鑑: PSA 10",
      "id": "b6d9b431-70a7-4a70-b6ee-e98621dc87f1",
      "scope": "priv"
    },
    {
      "productId": "9aeb3d33-54c4-4950-b75b-06f8908510ed",
      "type": "SELL",
      "date": "2026-06-21",
      "quantity": 1,
      "pricePerUnitEUR": 270,
      "platform": "vinted",
      "note": "",
      "id": "d1c5f835-f999-45fc-abc1-1abc7e5a9635",
      "scope": "priv"
    }
  ],
  "expenses": [],
  "settings": {
    "company": "",
    "kvk": "",
    "korStart": "",
    "fiscalYear": 2026
  }
};

let DB = load();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT,
        ...parsed,
        settings: { ...DEFAULT.settings, ...(parsed.settings || {}) },
        expenses: parsed.expenses || [],
      };
    }
  } catch(e) {}
  return JSON.parse(JSON.stringify(DEFAULT));
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
  cloudAutoSave(); // fire-and-forget
}

// ── UID ────────────────────────────────────────────────────────
function uid() { return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2); }

// ── Formatting ─────────────────────────────────────────────────
function eur(n, dec=2) {
  const v = Number(n||0);
  return '€' + v.toLocaleString('nl-NL',{minimumFractionDigits:dec,maximumFractionDigits:dec});
}
function pct(n) { return Number(n||0).toFixed(1)+'%'; }
function today() { return new Date().toISOString().slice(0,10); }
function fiscalYear() { return Number(DB.settings.fiscalYear || 2026); }
function inYear(dateStr, yr) { return dateStr && dateStr.startsWith(String(yr)); }
function daysUntil(dateStr) { return Math.ceil((new Date(dateStr)-new Date())/86400000); }
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ══════════════════════════════════════════════════════════════
//  INVENTORY ENGINE
// ══════════════════════════════════════════════════════════════

/** Returns quantity in stock for a product, optionally filtered by scope ('biz'|'priv'|'all') */
function getQty(productId, scope = 'all') {
  let qty = 0;
  for (const t of DB.transactions) {
    const tScope = t.scope || 'biz'; // default to biz for legacy
    if (scope !== 'all' && tScope !== scope) continue;

    if (t.productId === productId) {
      if (t.type === 'BUY')   qty += t.quantity;
      if (t.type === 'SELL')  qty -= t.quantity;
      if (t.type === 'GRADE') qty -= t.quantity; // source card used up
    }
    if (t.type === 'GRADE' && t.targetProductId === productId) {
      qty += t.quantity; // graded card created
    }
  }
  return Math.max(0, qty);
}

/** Weighted Average Cost per unit for a product up to (and including) date */
function getWACC(productId, asOfDate, scope = 'all') {
  let totalCost = 0, totalQty = 0;
  const txns = DB.transactions
    .filter(t => t.date <= asOfDate && (scope === 'all' || (t.scope || 'biz') === scope))
    .sort((a,b) => a.date.localeCompare(b.date));

  for (const t of txns) {
    if (t.productId === productId && t.type === 'BUY') {
      totalCost += t.quantity * (t.pricePerUnitEUR || 0);
      totalQty  += t.quantity;
    }
    if (t.type === 'GRADE' && t.targetProductId === productId) {
      const srcWacc = getWACC(t.productId, t.date, scope);
      const gradeFee = t.feePerUnitEUR || 0;
      totalCost += t.quantity * (srcWacc + gradeFee);
      totalQty  += t.quantity;
    }
  }
  return totalQty > 0 ? totalCost / totalQty : 0;
}

/** Total inventory cost for a product */
function getInventoryCost(productId, scope = 'all') {
  return getWACC(productId, '9999-99-99', scope) * getQty(productId, scope);
}

/** COGS for a SELL transaction using WAC at time of sale */
function computeCogs(productId, date, qty, scope = 'all') {
  const wacc = getWACC(productId, date, scope);
  return wacc * qty;
}

// ══════════════════════════════════════════════════════════════
//  KOR (ONLY BUSINESS TRANSACTIONS COUNT)
// ══════════════════════════════════════════════════════════════
function korRevenue(yr) {
  return DB.transactions
    .filter(t => t.type === 'SELL' && inYear(t.date, yr) && (t.scope || 'biz') === 'biz')
    .reduce((s, t) => s + t.quantity * (t.pricePerUnitEUR||0), 0);
}
function korPct(yr) { return Math.min(korRevenue(yr)/KOR_LIMIT*100, 100); }

// ══════════════════════════════════════════════════════════════
//  UPDATE MINI KOR PILL + TOP CHIP
// ══════════════════════════════════════════════════════════════
function updateKor() {
  const yr  = fiscalYear();
  const rev = korRevenue(yr);
  const p   = korPct(yr);
  q('korPillAmt').textContent  = eur(rev, 0);
  q('korPillPct').textContent  = pct(p);
  q('korPillBar').style.width  = p+'%';
  q('yrChip').textContent      = yr+' 稅年';
}

// ══════════════════════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════════════════════
const TAB_TITLES = {
  dashboard:    '儀表板',
  inventory:    '庫存管理',
  transactions: '交易記錄',
  expenses:     '費用記錄',
  reports:      '損益報表',
  calendar:     '報稅行事曆',
  settings:     '設定 & 備份',
};

function switchTab(tab) {
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l=>l.classList.remove('active'));
  const view = document.getElementById('view-'+tab);
  const link = document.querySelector(`.nav-link[data-tab="${tab}"]`);
  if (view) view.classList.add('active');
  if (link) link.classList.add('active');
  q('pageTitle').textContent = TAB_TITLES[tab]||tab;
  renderTab(tab);
}

function renderTab(tab) {
  switch(tab) {
    case 'dashboard':    renderDashboard();    break;
    case 'inventory':    renderInventory();    break;
    case 'transactions': renderTransactions(); break;
    case 'expenses':     renderExpenses();     break;
    case 'reports':      renderReports();      break;
    case 'calendar':     renderCalendar();     break;
    case 'settings':     renderSettings();     break;
  }
}

function q(id) { return document.getElementById(id); }
function currentTab() { return document.querySelector('.nav-link.active')?.dataset?.tab||'dashboard'; }

// ══════════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════════
function renderDashboard() {
  const yr  = fiscalYear();
  const rev = korRevenue(yr);
  const p   = korPct(yr);

  // KOR hero
  q('korBigVal').textContent     = eur(rev, 0);
  q('korTrackFill').style.width  = p+'%';
  q('korLeft').textContent       = eur(KOR_LIMIT - rev, 0);
  q('korSales').textContent      = DB.transactions.filter(t=>t.type==='SELL'&&inYear(t.date,yr)).length+' 筆';

  const dot = q('korDot'), cap = q('korCaption'), lbl = q('korStatLabel');
  if (p >= 100) {
    dot.style.background='var(--red)'; dot.style.boxShadow='0 0 6px var(--red)';
    cap.textContent='🚨 已超 KOR 上限！請立即諮詢會計師，下一筆銷售需開始收 BTW。'; lbl.textContent='🚨 超限';
  } else if (p >= 95) {
    dot.style.background='var(--red)'; dot.style.boxShadow='0 0 6px var(--red)';
    cap.textContent='🔴 剩餘空間不足 '+eur(KOR_LIMIT-rev,0)+'，下一筆銷售極可能超限！'; lbl.textContent='🔴 極危險';
  } else if (p >= 85) {
    dot.style.background='var(--orange)'; dot.style.boxShadow='0 0 6px var(--orange)';
    cap.textContent='⚠️ 已達 '+pct(p)+'，請謹慎控制剩餘銷售節奏。'; lbl.textContent='🟠 警告';
  } else if (p >= 70) {
    dot.style.background='var(--gold)'; dot.style.boxShadow='0 0 6px var(--gold)';
    cap.textContent='⚡ 已達 '+pct(p)+'，建議開始規劃下半年銷售步調。'; lbl.textContent='🟡 注意';
  } else {
    dot.style.background='var(--green)'; dot.style.boxShadow='0 0 6px var(--green)';
    cap.textContent='✅ 目前安全，還有 '+eur(KOR_LIMIT-rev,0)+' 空間。'; lbl.textContent='✅ 正常';
  }

  // Stats
  const allStock = DB.products.map(p=>({p, qty:getQty(p.id)}));
  const totalQty  = allStock.reduce((s,x)=>s+x.qty, 0);
  const totalCost = allStock.reduce((s,x)=>s+getInventoryCost(x.p.id), 0);

  const ySells = DB.transactions.filter(t=>t.type==='SELL'&&inYear(t.date,yr));
  const yRev   = ySells.reduce((s,t)=>s+t.quantity*(t.pricePerUnitEUR||0), 0);
  const yCogs  = ySells.reduce((s,t)=>s+(t.cogsPerUnit!=null ? t.cogsPerUnit*t.quantity : computeCogs(t.productId,t.date,t.quantity)), 0);
  const yFees  = ySells.reduce((s,t)=>s+(t.fee||0), 0);
  const yGP    = yRev - yCogs - yFees;
  const yGPM   = yRev>0 ? yGP/yRev*100 : 0;
  const yExp   = DB.expenses.filter(e=>inYear(e.date,yr)&&!e.isPrivate).reduce((s,e)=>s+(e.amountEur||0),0);

  q('dTotalQty').textContent   = totalQty+' 張';
  q('dTotalCost').textContent  = '帳面成本 '+eur(totalCost);
  q('dGP').textContent         = eur(yGP);
  q('dGPM').textContent        = '毛利率 '+pct(yGPM);
  q('dExp').textContent        = eur(yExp);
  q('dNet').textContent        = eur(yGP - yExp);
  q('dGP').style.color         = yGP >= 0 ? 'var(--green)' : 'var(--red)';
  q('dNet').style.color        = (yGP-yExp) >= 0 ? 'var(--green)' : 'var(--red)';

  // Recent
  const recent = [
    ...DB.transactions.map(t=>{
      const p = DB.products.find(p=>p.id===t.productId);
      const name = p?.name || '已刪除';
      const sign = t.type==='SELL' ? 1 : -1;
      const amt  = t.quantity * (t.pricePerUnitEUR||0);
      return { date:t.date, type:t.type, name, amt:sign*amt };
    }),
    ...DB.expenses.filter(e=>!e.isPrivate).map(e=>({ date:e.date, type:'EXPENSE', name:e.desc, amt:-e.amountEur })),
  ].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);

  q('dashRecent').innerHTML = recent.length ? recent.map(r=>`
    <div class="r-item">
      <div class="r-left">
        <span class="r-type">${txBadge(r.type)}</span>
        <span class="r-name">${esc(r.name)}</span>
      </div>
      <span class="r-amt ${r.amt<0?'neg':''}">${r.amt>=0?'':'-'}${eur(Math.abs(r.amt))}</span>
    </div>`).join('') : '<p class="empty-sm">尚無交易記錄</p>';

  // Deadlines
  const yr1 = yr, yr2 = yr+1;
  const deadlines = [
    { date:`${yr2}-05-01`, title:`${yr1} 所得稅申報`, desc:'Inkomstenbelasting 截止（可申請延期）' },
    { date:`${yr1}-12-31`, title:'KOR 年度核查', desc:`確認 ${yr1} 年度 KOR 資格，若接近上限請提前規劃` },
    { date:`${yr2}-01-31`, title:'KOR 延續確認', desc:'確認下一年度符合 KOR 資格（年營業額 < €20,000）' },
  ];
  q('dashDeadlines').innerHTML = deadlines.map(d=>{
    const days = daysUntil(d.date);
    const [,mo,day] = d.date.split('-');
    const cls = days<30?'urgent':days<90?'warn':'ok';
    const txt = days<0?'已過期':days<30?`緊急 ${days} 天`:`${days} 天後`;
    return `<div class="dl-item">
      <div class="dl-date">${d.date}</div>
      <div class="dl-title">${esc(d.title)}</div>
      <div class="dl-days ${days<30?'warn':''}">${txt}　${esc(d.desc)}</div>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════════
//  INVENTORY (FINANCIAL TREE-TABLE VIEW)
// ══════════════════════════════════════════════════════════════
let _invTypeFilter = '';
let _collapsedParents = new Set();

function calculateProductMetrics(productId, scopeF = 'all') {
  const p = DB.products.find(x => x.id === productId);
  if (!p) return null;

  // Filter transactions by product & scope
  const buyTxns  = DB.transactions.filter(t => (t.productId === productId || (t.type==='GRADE' && t.targetProductId===productId)) && t.type==='BUY' && (scopeF==='all' || (t.scope||'biz')===scopeF));
  const sellTxns = DB.transactions.filter(t => t.productId === productId && t.type==='SELL' && (scopeF==='all' || (t.scope||'biz')===scopeF));
  const gradeOut = DB.transactions.filter(t => t.productId === productId && t.type==='GRADE' && (scopeF==='all' || (t.scope||'biz')===scopeF));
  const gradeIn  = DB.transactions.filter(t => t.targetProductId === productId && t.type==='GRADE' && (scopeF==='all' || (t.scope||'biz')===scopeF));

  const totalBuyQty = buyTxns.reduce((s,t) => s + t.quantity, 0) + gradeIn.reduce((s,t) => s + t.quantity, 0);
  const totalSellQty = sellTxns.reduce((s,t) => s + t.quantity, 0);
  const totalGradeOutQty = gradeOut.reduce((s,t) => s + t.quantity, 0);

  const remainQty = getQty(productId, scopeF);
  const wacc = getWACC(productId, '9999-99-99', scopeF);
  const marketPrice = p.marketPriceEUR || 0;

  // Percent change = (Market - WACC) / WACC
  const priceChangePct = wacc > 0 && marketPrice > 0 ? ((marketPrice - wacc) / wacc * 100) : 0;

  // 總投入 = 剩餘庫存總成本
  const totalInvestment = wacc * remainQty;

  // 已實現利潤 = 銷售總收入 - 銷售總COGS - 銷售手續費
  const totalRev = sellTxns.reduce((s,t) => s + t.quantity * (t.pricePerUnitEUR||0), 0);
  const totalFees = sellTxns.reduce((s,t) => s + (t.fee||0), 0);
  const totalCogs = sellTxns.reduce((s,t) => s + (t.cogsPerUnit != null ? t.cogsPerUnit * t.quantity : computeCogs(t.productId, t.date, t.quantity, scopeF)), 0);
  const realizedProfit = totalRev - totalCogs - totalFees;

  // 回本進度: Net Invested = Total Cost of ALL Buys - Total Revenue from Sells
  // If Net Invested <= 0, 已回本! Otherwise, 剩餘需回本金額 / 市價 = 打平張數
  const grossSpent = buyTxns.reduce((s,t) => s + t.quantity * (t.pricePerUnitEUR||0), 0);
  const netInvested = grossSpent - (totalRev - totalFees);

  let breakEvenText = '';
  let breakEvenCls  = '';
  if (netInvested <= 0 && (totalSellQty > 0 || totalBuyQty > 0)) {
    breakEvenText = '✓ 已回本';
    breakEvenCls  = 'badge-payback';
  } else if (marketPrice > 0 && netInvested > 0) {
    const needQty = Math.ceil(netInvested / marketPrice);
    breakEvenText = `${eur(netInvested, 0)} (${needQty} 張)`;
    breakEvenCls  = 'badge-neg';
  } else {
    breakEvenText = eur(Math.max(0, netInvested), 0);
    breakEvenCls  = 'badge-flat';
  }

  // 現貨市值
  const totalMarketVal = remainQty * marketPrice;

  return {
    p, totalBuyQty, totalSellQty, remainQty, wacc, marketPrice,
    priceChangePct, totalInvestment, realizedProfit, breakEvenText, breakEvenCls, totalMarketVal
  };
}

let _invTypeFilters = { biz: '', priv: '' };

function renderInventoryPage(scopeF = 'biz') {
  const search  = (q(`invSearch-${scopeF}`)?.value || '').toLowerCase();
  const langF   = q(`invLangFilter-${scopeF}`)?.value || '';
  const statusF = q(`invStatusFilter-${scopeF}`)?.value || 'all';

  // Wire Pill buttons for this scope
  const pills = q(`invTypePills-${scopeF}`);
  if (pills) {
    pills.querySelectorAll('.pill-btn').forEach(btn => {
      btn.onclick = () => {
        pills.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _invTypeFilters[scopeF] = btn.dataset.type || '';
        renderInventoryPage(scopeF);
      };
    });
  }

  let products = DB.products;
  if (search)                  products = products.filter(p => p.name.toLowerCase().includes(search) || (p.notes||'').toLowerCase().includes(search));
  if (_invTypeFilters[scopeF]) products = products.filter(p => p.type === _invTypeFilters[scopeF]);
  if (langF)                   products = products.filter(p => p.language === langF);

  // Separate parent (raw cards / standalone) and children (graded cards)
  const parents = products.filter(p => !p.parentId);
  const childrenMap = new Map();
  products.filter(p => p.parentId).forEach(ch => {
    if (!childrenMap.has(ch.parentId)) childrenMap.set(ch.parentId, []);
    childrenMap.get(ch.parentId).push(ch);
  });

  // Calculate summary meta
  const allMetrics = products.map(p => calculateProductMetrics(p.id, scopeF)).filter(Boolean);
  const inStockCount = allMetrics.filter(m => m.remainQty > 0).length;
  const totalQtyAll  = allMetrics.reduce((s,m) => s + m.remainQty, 0);
  const totalCostAll = allMetrics.reduce((s,m) => s + m.totalInvestment, 0);
  const totalMktAll  = allMetrics.reduce((s,m) => s + m.totalMarketVal, 0);

  const scopeLabel = scopeF==='biz'?'🏢 商業帳戶':'👤 私人帳戶';
  q(`invMeta-${scopeF}`).innerHTML = `[${scopeLabel}] 在庫商品 <strong>${inStockCount}</strong> 種 · 共 <strong>${totalQtyAll}</strong> 張 · 總投入成本 <strong>${eur(totalCostAll)}</strong> · 現貨總市值 <strong>${eur(totalMktAll)}</strong>`;

  const wrap = q(`invTableWrap-${scopeF}`);
  if (!parents.length && !products.length) {
    wrap.innerHTML = `<div class="empty" style="padding:3rem">
      <div class="empty-ico">📦</div>
      <div class="empty-ttl">沒有符合條件的商品</div>
      <button class="btn-primary emptyAddProdBtn">＋ 新增商品</button>
    </div>`;
    wrap.querySelector('.emptyAddProdBtn')?.addEventListener('click', () => openModalProduct());
    return;
  }

  let rowsHtml = '';
  parents.forEach(p => {
    const m = calculateProductMetrics(p.id, scopeF);
    if (!m) return;
    if (statusF === 'instock' && m.remainQty === 0) return;

    const children = childrenMap.get(p.id) || [];
    const hasChildren = children.length > 0;
    const isCollapsed = _collapsedParents.has(p.id);

    const changeSign = m.priceChangePct >= 0 ? '+' : '';
    const changeCls  = m.priceChangePct >= 0 ? 'badge-pos' : 'badge-neg';
    const profitSign = m.realizedProfit > 0 ? '+' : '';
    const profitCls  = m.realizedProfit > 0 ? 'badge-pos' : m.realizedProfit < 0 ? 'badge-neg' : 'badge-flat';

    rowsHtml += `<tr class="parent-row" data-id="${p.id}">
      <td>
        <div class="tree-tree-cell">
          ${hasChildren ? `<span class="tree-toggle" data-toggle="${p.id}">${isCollapsed ? '►' : '▼'}</span>` : `<span class="tree-indent"></span>`}
          <span style="font-weight:700">${esc(p.name)}</span>
          <span class="type-badge ${esc(p.type)}">${esc(p.type)}</span>
        </div>
      </td>
      <td class="mono" style="text-align:right">${m.totalBuyQty || '—'}</td>
      <td class="mono" style="text-align:right">${m.totalSellQty || '—'}</td>
      <td class="mono" style="text-align:right;font-weight:800">${m.remainQty}</td>
      <td class="mono" style="text-align:right;color:var(--t2)">${m.wacc > 0 ? eur(m.wacc) : '—'}</td>
      <td class="mono" style="text-align:right;font-weight:700">${m.marketPrice > 0 ? eur(m.marketPrice) : '—'}</td>
      <td class="mono ${changeCls}" style="text-align:right">${m.wacc > 0 && m.marketPrice > 0 ? changeSign + m.priceChangePct.toFixed(1) + '%' : '—'}</td>
      <td class="mono" style="text-align:right">${m.totalInvestment > 0 ? eur(m.totalInvestment) : '€0'}</td>
      <td class="mono ${profitCls}" style="text-align:right">${m.realizedProfit !== 0 ? profitSign + eur(m.realizedProfit) : '€0'}</td>
      <td style="text-align:center" class="${m.breakEvenCls}">${m.breakEvenText}</td>
      <td class="mono" style="text-align:right;font-weight:800;color:var(--gold)">${m.totalMarketVal > 0 ? eur(m.totalMarketVal) : '€0'}</td>
    </tr>`;

    // Render children if not collapsed
    if (hasChildren && !isCollapsed) {
      children.forEach(ch => {
        const cm = calculateProductMetrics(ch.id, scopeF);
        if (!cm) return;
        const cChangeSign = cm.priceChangePct >= 0 ? '+' : '';
        const cChangeCls  = cm.priceChangePct >= 0 ? 'badge-pos' : 'badge-neg';
        const cProfitSign = cm.realizedProfit > 0 ? '+' : '';
        const cProfitCls  = cm.realizedProfit > 0 ? 'badge-pos' : cm.realizedProfit < 0 ? 'badge-neg' : 'badge-flat';

        rowsHtml += `<tr class="child-row" data-id="${ch.id}">
          <td style="padding-left:1.8rem">
            <div class="tree-tree-cell">
              <span style="color:var(--b2);margin-right:4px">└</span>
              <span style="font-weight:600">${esc(ch.name)}</span>
              <span class="type-badge ${esc(ch.type)}">${esc(ch.type)}</span>
            </div>
          </td>
          <td class="mono" style="text-align:right">${cm.totalBuyQty || '—'}</td>
          <td class="mono" style="text-align:right">${cm.totalSellQty || '—'}</td>
          <td class="mono" style="text-align:right;font-weight:800">${cm.remainQty}</td>
          <td class="mono" style="text-align:right;color:var(--t2)">${cm.wacc > 0 ? eur(cm.wacc) : '—'}</td>
          <td class="mono" style="text-align:right;font-weight:700">${cm.marketPrice > 0 ? eur(cm.marketPrice) : '—'}</td>
          <td class="mono ${cChangeCls}" style="text-align:right">${cm.wacc > 0 && cm.marketPrice > 0 ? cChangeSign + cm.priceChangePct.toFixed(1) + '%' : '—'}</td>
          <td class="mono" style="text-align:right">${cm.totalInvestment > 0 ? eur(cm.totalInvestment) : '€0'}</td>
          <td class="mono ${cProfitCls}" style="text-align:right">${cm.realizedProfit !== 0 ? cProfitSign + eur(cm.realizedProfit) : '€0'}</td>
          <td style="text-align:center" class="${cm.breakEvenCls}">${cm.breakEvenText}</td>
          <td class="mono" style="text-align:right;font-weight:800;color:var(--gold)">${cm.totalMarketVal > 0 ? eur(cm.totalMarketVal) : '€0'}</td>
        </tr>`;
      });
    }
  });

  wrap.innerHTML = `<table class="inv-table">
    <thead><tr>
      <th>項目名稱</th>
      <th style="text-align:right">購入</th>
      <th style="text-align:right">售出</th>
      <th style="text-align:right">剩餘</th>
      <th style="text-align:right">均進價</th>
      <th style="text-align:right">市值/張</th>
      <th style="text-align:right">漲跌幅</th>
      <th style="text-align:right">總投入</th>
      <th style="text-align:right">已實現利潤</th>
      <th style="text-align:center">回本進度</th>
      <th style="text-align:right">現貨市值</th>
    </tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>`;

  // Wire tree toggle
  wrap.querySelectorAll('.tree-toggle').forEach(t => {
    t.addEventListener('click', e => {
      e.stopPropagation();
      const pid = t.dataset.toggle;
      if (_collapsedParents.has(pid)) _collapsedParents.delete(pid);
      else _collapsedParents.add(pid);
      renderInventoryPage(scopeF);
    });
  });

  // Wire row click to open product detail modal/panel
  wrap.querySelectorAll('tr[data-id]').forEach(tr => {
    tr.addEventListener('click', () => openDetail(tr.dataset.id));
  });
}

// ══════════════════════════════════════════════════════════════
//  PRODUCT DETAIL PANEL
// ══════════════════════════════════════════════════════════════
function openDetail(productId) {
  const p   = DB.products.find(x=>x.id===productId);
  if (!p) return;
  const qty  = getQty(p.id);
  const wacc = getWACC(p.id, '9999-99-99');

  q('detailName').textContent = p.name;
  q('detailMeta').textContent = [p.type, p.language, p.notes].filter(Boolean).join(' · ');

  // Stats
  const sold = DB.transactions.filter(t=>t.type==='SELL'&&t.productId===productId).reduce((s,t)=>s+t.quantity,0);
  const rev  = DB.transactions.filter(t=>t.type==='SELL'&&t.productId===productId).reduce((s,t)=>s+t.quantity*(t.pricePerUnitEUR||0),0);
  q('detailStats').innerHTML = `
    <div class="ds-item"><div class="ds-label">在庫</div><div class="ds-val">${qty} 張</div></div>
    <div class="ds-item"><div class="ds-label">平均成本</div><div class="ds-val gold">${eur(wacc)}</div></div>
    <div class="ds-item"><div class="ds-label">市值</div><div class="ds-val">${p.marketPriceEUR?eur(p.marketPriceEUR):'—'}</div></div>
    <div class="ds-item"><div class="ds-label">累計賣出</div><div class="ds-val">${sold} 張</div></div>
    <div class="ds-item"><div class="ds-label">累計銷售額</div><div class="ds-val green">${eur(rev)}</div></div>
    <div class="ds-item"><div class="ds-label">帳面庫存值</div><div class="ds-val">${eur(wacc*qty)}</div></div>`;

  // Buttons
  q('detailBtnSell').onclick  = ()=>{ closeDetail(); openModalSell(productId); };
  q('detailBtnBuy').onclick   = ()=>{ closeDetail(); openModalBuy(productId); };
  q('detailBtnGrade').onclick = ()=>{ closeDetail(); openModalGrade(productId); };
  q('detailBtnEdit').onclick  = ()=>{ closeDetail(); openModalProduct(productId); };
  q('detailBtnSell').disabled = qty===0;

  // Tx history
  const txns = DB.transactions
    .filter(t => t.productId===productId || (t.type==='GRADE'&&t.targetProductId===productId))
    .sort((a,b)=>b.date.localeCompare(a.date));

  q('detailTxList').innerHTML = txns.length ? `
    <div class="tx-wrap" style="margin-top:.35rem">
    <table class="tx-table">
      <thead><tr><th>日期</th><th>類型</th><th>數量</th><th>單價</th><th>金額</th><th>平台</th></tr></thead>
      <tbody>${txns.map(t=>{
        const isSell = t.type==='SELL';
        const total  = t.quantity*(t.pricePerUnitEUR||0);
        return `<tr>
          <td class="mono">${t.date}</td>
          <td>${txBadge(t.type)}</td>
          <td class="mono">${t.quantity}</td>
          <td class="mono">${eur(t.pricePerUnitEUR||0)}</td>
          <td class="amount ${isSell?'sell':'buy'}">${isSell?'+':'-'}${eur(total)}</td>
          <td>${esc(t.platform||t.note||'—')}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>` : '<p class="empty-sm" style="margin-top:.5rem">尚無交易記錄</p>';

  // Show panel
  q('detailPanel').classList.add('open');
  q('detailBackdrop').classList.add('open');
}

function closeDetail() {
  q('detailPanel').classList.remove('open');
  q('detailBackdrop').classList.remove('open');
}

// ══════════════════════════════════════════════════════════════
//  TRANSACTIONS
// ══════════════════════════════════════════════════════════════
let _selectedTxIds = new Set();

function updateBulkButtons() {
  const cnt = _selectedTxIds.size;
  const btnEdit   = q('btnBulkEdit');
  const btnDelete = q('btnBulkDelete');
  const countEl   = q('bulkCount');
  if (countEl) countEl.textContent = cnt;
  if (btnEdit)   btnEdit.style.display   = cnt > 0 ? 'inline-flex' : 'none';
  if (btnDelete) btnDelete.style.display = cnt > 0 ? 'inline-flex' : 'none';
}

function renderTransactions() {
  _selectedTxIds.clear();
  updateBulkButtons();

  const yr   = q('txYearFilter')?.value||String(fiscalYear());
  const type = q('txTypeFilter')?.value||'';

  let allTxns = [...DB.transactions];
  if (yr !== 'all') allTxns = allTxns.filter(t=>inYear(t.date, yr));
  if (type) allTxns = allTxns.filter(t=>t.type===type);
  allTxns.sort((a,b)=>b.date.localeCompare(a.date));

  renderTxTableForScope('priv', allTxns.filter(t => (t.scope||'biz') === 'priv'));
  renderTxTableForScope('biz',  allTxns.filter(t => (t.scope||'biz') === 'biz'));
}

function renderTxTableForScope(scopeKey, txns) {
  const rev     = txns.filter(t=>t.type==='SELL').reduce((s,t)=>s+t.quantity*(t.pricePerUnitEUR||0),0);
  const buyCost = txns.filter(t=>t.type==='BUY').reduce((s,t)=>s+t.quantity*(t.pricePerUnitEUR||0),0);
  
  const sumEl = q(`txSummary-${scopeKey}`);
  if (sumEl) sumEl.innerHTML = `<strong>${txns.length}</strong> 筆 · 銷 <strong>${eur(rev)}</strong> · 進 <strong>${eur(buyCost)}</strong>`;

  const container = q(`txList-${scopeKey}`);
  if (!container) return;

  if (!txns.length) {
    container.innerHTML = `<div class="empty" style="padding:1.5rem"><div class="empty-ttl" style="font-size:.8rem">無交易紀錄</div></div>`;
    return;
  }

  container.innerHTML = `<div class="tx-wrap"><table class="tx-table" style="font-size:.73rem">
    <thead><tr>
      <th style="width:28px;text-align:center"><input type="checkbox" class="chk-select-all-scope" data-scope="${scopeKey}" title="全選"/></th>
      <th>日期</th><th>類型</th><th>商品</th>
      <th>數量</th><th>金額</th><th>COGS</th><th>毛利</th><th>操作</th>
    </tr></thead>
    <tbody>${txns.map(t=>{
      const p    = DB.products.find(x=>x.id===t.productId);
      const name = p?.name||'已刪除';
      const tot  = t.quantity*(t.pricePerUnitEUR||0);
      const isSell = t.type==='SELL';
      const cogs = isSell ? (t.cogsPerUnit!=null ? t.cogsPerUnit*t.quantity : computeCogs(t.productId,t.date,t.quantity, scopeKey)) : null;
      const fee  = isSell ? (t.fee||0) : null;
      const gp   = isSell ? tot - (cogs||0) - (fee||0) : null;
      const gpCls= gp!=null ? (gp>=0?'sell':'buy') : '';
      return `<tr>
        <td style="text-align:center"><input type="checkbox" class="chk-tx" data-id="${t.id}"/></td>
        <td class="mono">${t.date.slice(5)}</td>
        <td>${txBadge(t.type)}</td>
        <td style="font-weight:600;color:var(--t1);max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(name)}">${esc(name)}</td>
        <td class="mono">${t.quantity}</td>
        <td class="amount ${isSell?'sell':'buy'}">${isSell?'':'-'}${eur(tot)}</td>
        <td class="mono" style="color:var(--t3)">${cogs!=null?eur(cogs):'—'}</td>
        <td class="amount ${gpCls}">${gp!=null?eur(gp):'—'}</td>
        <td>
          <button class="link-btn btn-edit-tx" data-id="${t.id}" style="margin-right:.3rem">✏️</button>
          <button class="link-btn btn-del-tx" data-id="${t.id}" style="color:var(--red)">🗑️</button>
        </td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;

  // Select all checkbox for scope
  const chkAll = container.querySelector('.chk-select-all-scope');
  if (chkAll) {
    chkAll.addEventListener('change', ()=>{
      const isChecked = chkAll.checked;
      container.querySelectorAll('.chk-tx').forEach(chk => {
        chk.checked = isChecked;
        if (isChecked) _selectedTxIds.add(chk.dataset.id);
        else _selectedTxIds.delete(chk.dataset.id);
      });
      updateBulkButtons();
    });
  }

  // Item checkboxes
  container.querySelectorAll('.chk-tx').forEach(chk => {
    chk.addEventListener('change', ()=>{
      if (chk.checked) _selectedTxIds.add(chk.dataset.id);
      else _selectedTxIds.delete(chk.dataset.id);
      if (chkAll) chkAll.checked = container.querySelectorAll('.chk-tx:not(:checked)').length === 0;
      updateBulkButtons();
    });
  });

  container.querySelectorAll('.btn-edit-tx').forEach(btn=>{
    btn.addEventListener('click', ()=>editTransaction(btn.dataset.id));
  });
  container.querySelectorAll('.btn-del-tx').forEach(btn=>{
    btn.addEventListener('click', ()=>deleteTransaction(btn.dataset.id));
  });
}

// ══════════════════════════════════════════════════════════════
//  EXPENSES
// ══════════════════════════════════════════════════════════════
const CAT_LABELS = {
  packaging:'📦 包材/運費', platform_fee:'🖥️ 平台費', grading_fee:'🏅 評級費',
  mileage:'🚗 里程費', travel:'✈️ 出差費', accountant:'📊 會計師費', other:'其他',
};

function renderExpenses() {
  const catF = q('expCatFilter')?.value||'';
  let exps = [...DB.expenses].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  if (catF) exps = exps.filter(e=>e.category===catF);

  const bizTotal = exps.filter(e=>!e.isPrivate).reduce((s,e)=>s+(e.amountEur||0),0);
  q('expSummary').innerHTML = `<strong>${exps.length}</strong> 筆費用 · 業務費用合計 <strong>${eur(bizTotal)}</strong>`;

  if (!exps.length) {
    q('expList').innerHTML = `<div class="empty"><div class="empty-ico">💸</div><div class="empty-ttl">尚無費用記錄</div></div>`;
    return;
  }

  q('expList').innerHTML = `<div class="tx-wrap"><table class="tx-table">
    <thead><tr><th>日期</th><th>類別</th><th>說明</th><th>金額</th><th>用途</th><th>刪除</th></tr></thead>
    <tbody>${exps.map(e=>`<tr>
      <td class="mono">${e.date}</td>
      <td>${esc(CAT_LABELS[e.category]||e.category)}</td>
      <td>${esc(e.desc)}</td>
      <td class="amount ${e.isPrivate?'buy':''}">${eur(e.amountEur)}</td>
      <td style="font-size:.7rem">${e.isPrivate?'❌ 私人':'✅ 業務'}</td>
      <td><button class="link-btn del-exp" data-id="${e.id}">刪除</button></td>
    </tr>`).join('')}</tbody>
  </table></div>`;

  q('expList').querySelectorAll('.del-exp').forEach(btn=>{
    btn.addEventListener('click', ()=>confirm2('確認刪除這筆費用？', ()=>{
      DB.expenses = DB.expenses.filter(e=>e.id!==btn.dataset.id);
      save(); renderExpenses(); toast('費用已刪除','w');
    }));
  });
}

// ══════════════════════════════════════════════════════════════
//  REPORTS
// ══════════════════════════════════════════════════════════════
function renderReports() {
  const yr = Number(q('rptYear')?.value||fiscalYear());
  const ySells = DB.transactions.filter(t=>t.type==='SELL'&&inYear(t.date,yr));
  const yExp   = DB.expenses.filter(e=>inYear(e.date,yr)&&!e.isPrivate);

  const rev    = ySells.reduce((s,t)=>s+t.quantity*(t.pricePerUnitEUR||0),0);
  const cogs   = ySells.reduce((s,t)=>s+(t.cogsPerUnit!=null?t.cogsPerUnit*t.quantity:computeCogs(t.productId,t.date,t.quantity)),0);
  const fees   = ySells.reduce((s,t)=>s+(t.fee||0),0);
  const grossP = rev - cogs - fees;

  const expBycat = {};
  yExp.forEach(e=>{ expBycat[e.category]=(expBycat[e.category]||0)+(e.amountEur||0); });
  const totalExp = yExp.reduce((s,e)=>s+(e.amountEur||0),0);
  const opProfit = grossP - totalExp;

  const ZFA=1200, SFA=2123, MKB=0.127;
  const aft1   = Math.max(0, opProfit-ZFA);
  const aft2   = Math.max(0, aft1-SFA);
  const aft3   = aft2*(1-MKB);
  const taxEst = aft3*0.3697;

  const invCost = DB.products.reduce((s,p)=>s+getInventoryCost(p.id),0);
  const invQty  = DB.products.reduce((s,p)=>s+getQty(p.id),0);

  q('rptContent').innerHTML = `
  <div class="panel rpt-section">
    <div class="rpt-title">📊 損益表 Winst- en Verliesrekening · ${yr}</div>
    <div class="pl-row subtotal"><span>📈 營業額（Omzet）</span><span class="pl-val">${eur(rev)}</span></div>
    <div class="pl-row indent"><span>銷售筆數：${ySells.length} 筆</span></div>
    <div class="pl-row indent"><span>— 售出成本（COGS，加權平均）</span><span class="pl-val neg">-${eur(cogs)}</span></div>
    <div class="pl-row indent"><span>— 平台手續費</span><span class="pl-val neg">-${eur(fees)}</span></div>
    <div class="pl-row subtotal" style="margin-top:.25rem"><span>💰 毛利（Brutowinst）</span><span class="pl-val ${grossP>=0?'pos':'neg'}">${eur(grossP)}</span></div>
    <br/>
    <div class="pl-row subtotal"><span>💸 營業費用（Kosten）</span><span class="pl-val neg">-${eur(totalExp)}</span></div>
    ${Object.entries(expBycat).map(([c,a])=>`<div class="pl-row indent"><span>${esc(CAT_LABELS[c]||c)}</span><span class="pl-val neg">-${eur(a)}</span></div>`).join('')}
    <div class="pl-row grand"><span>🧾 稅前利潤（Winst vóór belasting）</span><span class="pl-val ${opProfit>=0?'pos':'neg'}">${eur(opProfit)}</span></div>
  </div>

  <div class="panel rpt-section">
    <div class="rpt-title">🧮 所得稅試算（僅供參考，請諮詢會計師）</div>
    <div class="pl-row"><span>稅前利潤</span><span class="pl-val">${eur(opProfit)}</span></div>
    <div class="pl-row indent"><span>— zelfstandigenaftrek（需≥1,225工時/年）</span><span class="pl-val pos">-${eur(ZFA)}</span></div>
    <div class="pl-row indent"><span>— startersaftrek（創業前5年適用）</span><span class="pl-val pos">-${eur(SFA)}</span></div>
    <div class="pl-row indent"><span>— MKB-winstvrijstelling 12.7%</span><span class="pl-val pos">-${eur(aft2*MKB)}</span></div>
    <div class="pl-row subtotal"><span>應稅所得（估算）</span><span class="pl-val">${eur(aft3)}</span></div>
    <div class="pl-row grand"><span>所得稅估算（Box 1 · 36.97%）</span><span class="pl-val neg">${eur(taxEst)}</span></div>
    <p style="font-size:.7rem;color:var(--t3);margin-top:.65rem">⚠️ 節稅資格（工時、startersaftrek年限）需個別確認。本試算僅為估算，請報稅前諮詢會計師。</p>
  </div>

  <div class="panel rpt-section">
    <div class="rpt-title">📦 期末庫存（Eindbalans 片段）</div>
    <div class="pl-row"><span>庫存資產（Voorraad，加權平均成本法）</span><span class="pl-val">${eur(invCost)}</span></div>
    <div class="pl-row"><span>在庫商品種數 / 總張數</span><span class="pl-val">${DB.products.filter(p=>getQty(p.id)>0).length} 種 / ${invQty} 張</span></div>
  </div>`;
}

// ══════════════════════════════════════════════════════════════
//  CALENDAR
// ══════════════════════════════════════════════════════════════
function renderCalendar() {
  const yr = fiscalYear();
  const events = [
    { date:`${yr+1}-05-01`, title:`${yr} 年所得稅申報`, desc:'每年 3 月 1 日起可在 MijnBelastingdienst 申報，截止 5 月 1 日（可申請延期至 9 月）。', },
    { date:`${yr}-12-31`, title:'KOR 年度上限核查',  desc:`確認 ${yr} 全年 KOR 營業額是否低於 €20,000。若接近上限，規劃 ${yr+1} 銷售節奏。`, },
    { date:`${yr+1}-01-31`, title:'KOR 延續資格確認', desc:'確認下一年度 KOR 資格。KOR 自動延續，但須主動監控年度營業額。', },
    { date:`${yr+1}-04-30`, title:'荷蘭公司年報（若適用）', desc:'Eenmanszaak 通常不需提交正式年報，但建議整理好帳本，以便被查稅時使用。', },
  ];
  q('calContent').innerHTML = `
    <p style="font-size:.77rem;color:var(--t2);margin-bottom:1rem">以下截止日為 ${yr} 稅年。法規可能變動，請以 belastingdienst.nl 官網為準。</p>
    ${events.map(e=>{
      const days = daysUntil(e.date);
      const [,mo,day] = e.date.split('-');
      const cls = days<0?'urgent':days<30?'urgent':days<90?'warn':'ok';
      const txt = days<0?'已過期':days<30?`緊急：${days} 天後`:days<90?`${days} 天後`:`${days} 天後`;
      return `<div class="cal-card">
        <div class="cal-date"><div class="cal-mo">${mo}月</div><div class="cal-day">${day}</div></div>
        <div class="cal-info"><div class="cal-ttl">${esc(e.title)}</div><div class="cal-desc">${esc(e.desc)}</div></div>
        <div class="cal-pill ${cls}">${esc(txt)}</div>
      </div>`;
    }).join('')}`;
}

// ══════════════════════════════════════════════════════════════
//  SETTINGS
// ══════════════════════════════════════════════════════════════
function renderSettings() {
  q('setCo').value       = DB.settings.company||'';
  q('setKvk').value      = DB.settings.kvk||'';
  q('setKorStart').value = DB.settings.korStart||'';
  q('setYear').value     = DB.settings.fiscalYear||2026;
  q('bkpNote').textContent = DB.settings.lastBackup
    ? '最後手動備份：'+new Date(DB.settings.lastBackup).toLocaleString('zh-TW')
    : '尚未手動備份';
  renderCloudStatus();
}

// ══════════════════════════════════════════════════════════════
//  MODAL — ADD/EDIT PRODUCT
// ══════════════════════════════════════════════════════════════
function openModalProduct(editId=null) {
  const isEdit = !!editId;
  const p = isEdit ? DB.products.find(x=>x.id===editId) : null;

  q('mProductTitle').textContent = isEdit ? '編輯商品' : '新增商品';
  q('pEditId').value   = editId||'';
  q('pName').value     = p?.name||'';
  q('pType').value     = p?.type||'單卡';
  q('pLang').value     = p?.language||'英文';
  q('pMarket').value   = p?.marketPriceEUR||'';
  q('pNotes').value    = p?.notes||'';

  // Parent dropdown
  const parentSel = q('pParent');
  parentSel.innerHTML = '<option value="">— 無（獨立商品）—</option>' +
    DB.products.filter(x=>x.id!==editId).map(x=>`<option value="${x.id}"${p?.parentId===x.id?' selected':''}>${esc(x.name)}</option>`).join('');

  // Initial buy hidden when editing
  const initSec = q('pInitialBuySection');
  if (initSec) initSec.style.display = isEdit ? 'none' : 'block';
  q('pBuyQty').value    = '';
  q('pBuyCost').value   = '';
  q('pBuyDate').value   = today();
  q('pBuyCurrency').value = 'EUR';
  q('pFxGroup').style.display = 'none';

  openModal('mProduct');
}

q('btnSaveProduct').addEventListener('click', ()=>{
  const name = q('pName').value.trim();
  if (!name) return toast('請輸入商品名稱','e');

  const editId = q('pEditId').value;
  const isEdit = !!editId;

  const productData = {
    id:             isEdit ? editId : uid(),
    name,
    type:           q('pType').value,
    language:       q('pLang').value,
    marketPriceEUR: parseFloat(q('pMarket').value)||0,
    parentId:       q('pParent').value||undefined,
    notes:          q('pNotes').value.trim()||undefined,
  };

  if (isEdit) {
    const idx = DB.products.findIndex(x=>x.id===editId);
    if (idx>=0) DB.products[idx] = productData;
  } else {
    DB.products.push(productData);

    // Initial BUY
    const qty  = parseInt(q('pBuyQty').value)||0;
    const cost = parseFloat(q('pBuyCost').value);
    if (qty>0 && !isNaN(cost)) {
      DB.transactions.push({
        id:             uid(),
        productId:      productData.id,
        type:           'BUY',
        date:           q('pBuyDate').value||today(),
        quantity:       qty,
        pricePerUnitEUR:cost,
        platform:       q('pBuySource').value||'',
        currency:       q('pBuyCurrency').value,
        note:           '初始庫存',
      });
    }
  }

  save();
  closeModal('mProduct');
  renderInventory();
  toast(isEdit?'商品已更新':'商品已新增','s');
});

// ══════════════════════════════════════════════════════════════
//  MODAL — RECORD BUY
// ══════════════════════════════════════════════════════════════
function setScopeValue(targetId, val) {
  const input = q(targetId);
  if (!input) return;
  input.value = val;
  const container = input.parentElement?.querySelector('.scope-btns');
  if (container) {
    container.querySelectorAll('.scope-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.scope === val);
    });
  }
}

function openModalBuy(presetProductId=null) {
  const sel = q('buyProductId');
  sel.innerHTML = '<option value="">— 選擇商品 —</option>' +
    DB.products.map(p=>`<option value="${p.id}"${p.id===presetProductId?' selected':''}>${esc(p.name)} (${p.type})</option>`).join('');
  q('buyQty').value    = '';
  q('buyCost').value   = '';
  q('buyDate').value   = today();
  q('buySource').value = 'nl_inperson';
  q('buyCurrency').value='EUR';
  setScopeValue('buyScope', 'biz');
  q('buyNote').value   = '';
  q('buyFxGroup').style.display='none';
  updateBuyHint();
  openModal('mBuy');
}

function updateBuyHint() {
  const src = q('buySource')?.value||'';
  const hints = {
    nl_inperson:'建議保留：Revolut 付款截圖、聊天談價記錄',
    tw_social:  '建議保留：LINE 對話截圖、台灣銀行轉帳記錄、匯率截圖',
    cardmarket: '建議保留：Cardmarket 訂單確認截圖',
    initial:    '建議保留：Cardmarket 市場趨勢截圖或 eBay Sold Price 截圖作為公平市值佐證',
  };
  q('buySourceHint').textContent = hints[src]||'';
  q('buySourceHint').style.display = hints[src]?'block':'none';
}

q('btnSaveBuy').addEventListener('click', ()=>{
  const editId = q('buyEditId').value;
  const productId = q('buyProductId').value;
  const qty  = parseInt(q('buyQty').value);
  const cost = parseFloat(q('buyCost').value);
  const date = q('buyDate').value;
  if (!productId) return toast('請選擇商品','e');
  if (!qty||qty<1) return toast('請輸入數量','e');
  if (isNaN(cost)||cost<0) return toast('請輸入成本','e');
  if (!date) return toast('請選擇日期','e');

  const scopeVal = q('buyScope').value || 'biz';

  if (editId) {
    const idx = DB.transactions.findIndex(t=>t.id===editId);
    if (idx>=0) {
      DB.transactions[idx] = {
        ...DB.transactions[idx],
        productId,
        date,
        quantity: qty,
        pricePerUnitEUR: cost,
        platform: q('buySource').value||'',
        currency: q('buyCurrency').value,
        scope: scopeVal === 'both' ? 'biz' : scopeVal,
        note: q('buyNote').value.trim(),
      };
    }
  } else {
    if (scopeVal === 'both') {
      // Split or create buy records for BOTH business and private
      DB.transactions.push({
        id:             uid(),
        productId,
        type:           'BUY',
        date,
        quantity:       qty,
        pricePerUnitEUR:cost,
        platform:       q('buySource').value||'',
        currency:       q('buyCurrency').value,
        scope:          'biz',
        note:           (q('buyNote').value.trim() + ' (商業＋私人同時進貨)').trim(),
      });
      DB.transactions.push({
        id:             uid(),
        productId,
        type:           'BUY',
        date,
        quantity:       qty,
        pricePerUnitEUR:cost,
        platform:       q('buySource').value||'',
        currency:       q('buyCurrency').value,
        scope:          'priv',
        note:           (q('buyNote').value.trim() + ' (商業＋私人同時進貨)').trim(),
      });
    } else {
      DB.transactions.push({
        id:             uid(),
        productId,
        type:           'BUY',
        date,
        quantity:       qty,
        pricePerUnitEUR:cost,
        platform:       q('buySource').value||'',
        currency:       q('buyCurrency').value,
        scope:          scopeVal,
        note:           q('buyNote').value.trim(),
      });
    }
  }

  save(); closeModal('mBuy');
  refreshCurrentView();
  toast(editId ? '進貨紀錄已更新' : `進貨 × ${qty} 張已記錄`, 's');
});

// ══════════════════════════════════════════════════════════════
//  MODAL — RECORD SELL
// ══════════════════════════════════════════════════════════════
function openModalSell(presetProductId=null, editTxId=null) {
  const editTx = editTxId ? DB.transactions.find(t=>t.id===editTxId) : null;
  q('sellEditId').value = editTxId||'';

  const sel = q('sellProductId');
  const inStock = DB.products.filter(p=>getQty(p.id)>0 || (editTx && p.id===editTx.productId));
  const targetPid = editTx ? editTx.productId : presetProductId;

  sel.innerHTML = '<option value="">— 選擇商品 —</option>' +
    inStock.map(p=>`<option value="${p.id}"${p.id===targetPid?' selected':''}>${esc(p.name)} (${p.type})</option>`).join('');

  q('sellQty').value    = editTx ? editTx.quantity : '1';
  q('sellPrice').value  = editTx ? editTx.pricePerUnitEUR : '';
  q('sellDate').value   = editTx ? editTx.date : today();
  q('sellPlatform').value= editTx ? (editTx.platform||'CM') : 'CM';
  q('sellFee').value    = editTx ? (editTx.fee||'') : '';
  setScopeValue('sellScope', editTx ? (editTx.scope||'biz') : 'biz');
  q('sellCountry').value= 'NL';
  q('sellNote').value   = editTx ? (editTx.note||'') : '';
  q('ossAlert').style.display='none';
  q('sellCostPreview').style.display='none';
  q('sellKorCheck').textContent='';
  updateProfitPreview();
  if (targetPid) updateSellCostPreview();
  openModal('mSell');
}

function updateSellCostPreview() {
  const productId = q('sellProductId').value;
  if (!productId) { q('sellCostPreview').style.display='none'; return; }
  const qty  = parseInt(q('sellQty').value)||1;
  const wacc = getWACC(productId, today());
  const avail= getQty(productId);
  q('sellCostPreview').style.display='block';
  q('sellCostPreview').innerHTML = `加權平均成本 <strong>${eur(wacc)}/張</strong>（FIFO WAC） · 在庫 <strong>${avail}</strong> 張`;
  updateProfitPreview();
  updateKorCheck();
}

function updateProfitPreview() {
  const productId = q('sellProductId').value;
  const qty   = parseInt(q('sellQty').value)||0;
  const price = parseFloat(q('sellPrice').value)||0;
  const fee   = parseFloat(q('sellFee').value)||0;
  const rev   = price * qty;
  const cogs  = productId&&qty ? computeCogs(productId, today(), qty) : 0;
  const gp    = rev - fee - cogs;
  q('pb-rev').textContent  = eur(rev);
  q('pb-fee').textContent  = eur(fee);
  q('pb-cogs').textContent = productId ? eur(cogs) : '—';
  q('pb-gp').textContent   = productId ? eur(gp) : '—';
  q('pb-gp').style.color   = gp>=0?'var(--green)':'var(--red)';
}

function updateKorCheck() {
  const price  = parseFloat(q('sellPrice').value)||0;
  const qty    = parseInt(q('sellQty').value)||1;
  const newRev = korRevenue(fiscalYear()) + price*qty;
  const el = q('sellKorCheck');
  if (!price) { el.className='kor-check'; el.textContent=''; return; }
  if (newRev > KOR_LIMIT) {
    el.className='kor-check danger';
    el.textContent=`🚨 此筆後年度 KOR 達 ${eur(newRev)}，超過上限 €20,000！請先諮詢會計師。`;
  } else if (newRev > KOR_LIMIT*0.9) {
    el.className='kor-check danger';
    el.textContent=`⚠️ 此筆後年度 KOR 達 ${eur(newRev)}（${pct(newRev/KOR_LIMIT*100)}），接近上限！`;
  } else {
    el.className='kor-check ok';
    el.textContent=`✅ 此筆後年度 KOR 達 ${eur(newRev)}（${pct(newRev/KOR_LIMIT*100)}），剩餘 ${eur(KOR_LIMIT-newRev)}。`;
  }
}

q('btnSaveSell').addEventListener('click', async ()=>{
  const productId = q('sellProductId').value;
  const qty   = parseInt(q('sellQty').value);
  const price = parseFloat(q('sellPrice').value);
  const date  = q('sellDate').value;
  if (!productId) return toast('請選擇商品','e');
  if (!qty||qty<1) return toast('請輸入數量','e');
  if (isNaN(price)||price<0) return toast('請輸入售價','e');
  if (!date) return toast('請選擇日期','e');

  const avail = getQty(productId);
  if (qty>avail) return toast(`庫存不足！目前在庫 ${avail} 張`,'e');

  const newRev = korRevenue(fiscalYear()) + price*qty;
  if (newRev > KOR_LIMIT) {
    const ok = await confirm2Async(`🚨 KOR 超限警告\n\n此筆銷售後年度營業額將達 ${eur(newRev)}，超過 €20,000 KOR 上限。\n\n請確認已諮詢會計師後再繼續。`, '仍要記錄');
    if (!ok) return;
  }

  const editId     = q('sellEditId').value;
  const scopeVal   = q('sellScope').value || 'biz';
  const fee        = parseFloat(q('sellFee').value)||0;

  if (editId) {
    const scope = scopeVal === 'both' ? 'biz' : scopeVal;
    const wacc  = getWACC(productId, date, scope);
    const idx   = DB.transactions.findIndex(t=>t.id===editId);
    if (idx>=0) {
      DB.transactions[idx] = {
        ...DB.transactions[idx],
        productId,
        date,
        quantity: qty,
        pricePerUnitEUR: price,
        fee,
        cogsPerUnit: wacc,
        scope,
        platform: q('sellPlatform').value||'',
        note: q('sellNote').value.trim(),
      };
    }
  } else {
    if (scopeVal === 'both') {
      const waccBiz  = getWACC(productId, date, 'biz');
      const waccPriv = getWACC(productId, date, 'priv');
      DB.transactions.push({
        id:             uid(),
        productId,
        type:           'SELL',
        date,
        quantity:       qty,
        pricePerUnitEUR:price,
        fee:            fee / 2,
        cogsPerUnit:    waccBiz,
        scope:          'biz',
        platform:       q('sellPlatform').value||'',
        note:           (q('sellNote').value.trim() + ' (商業＋私人同時銷售)').trim(),
      });
      DB.transactions.push({
        id:             uid(),
        productId,
        type:           'SELL',
        date,
        quantity:       qty,
        pricePerUnitEUR:price,
        fee:            fee / 2,
        cogsPerUnit:    waccPriv,
        scope:          'priv',
        platform:       q('sellPlatform').value||'',
        note:           (q('sellNote').value.trim() + ' (商業＋私人同時銷售)').trim(),
      });
    } else {
      const wacc = getWACC(productId, date, scopeVal);
      DB.transactions.push({
        id:             uid(),
        productId,
        type:           'SELL',
        date,
        quantity:       qty,
        pricePerUnitEUR:price,
        fee,
        cogsPerUnit:    wacc,
        scope:          scopeVal,
        platform:       q('sellPlatform').value||'',
        note:           q('sellNote').value.trim(),
      });
    }
  }

  save(); closeModal('mSell');
  updateKor();
  refreshCurrentView();
  toast(editId ? '銷售紀錄已更新' : `銷售 × ${qty} 已記錄`, 's');
});

// ── Transaction edit / delete helpers ─────────────────────────
function editTransaction(txId) {
  const tx = DB.transactions.find(t=>t.id===txId);
  if (!tx) return;
  if (tx.type==='BUY') {
    q('buyEditId').value = tx.id;
    const sel = q('buyProductId');
    sel.innerHTML = '<option value="">— 選擇商品 —</option>' +
      DB.products.map(p=>`<option value="${p.id}"${p.id===tx.productId?' selected':''}>${esc(p.name)} (${p.type})</option>`).join('');
    q('buyQty').value    = tx.quantity;
    q('buyCost').value   = tx.pricePerUnitEUR;
    q('buyDate').value   = tx.date;
    q('buySource').value = tx.platform||'';
    q('buyCurrency').value = tx.currency||'EUR';
    q('buyScope').value  = tx.scope||'biz';
    q('buyNote').value   = tx.note||'';
    q('buyFxGroup').style.display = tx.currency&&tx.currency!=='EUR'?'flex':'none';
    updateBuyHint();
    openModal('mBuy');
  } else if (tx.type==='SELL') {
    openModalSell(null, tx.id);
  } else {
    toast('送評紀錄暫不支援編輯，可直接刪除後重新記錄', 'w');
  }
}

function deleteTransaction(txId) {
  const tx = DB.transactions.find(t=>t.id===txId);
  if (!tx) return;
  const p = DB.products.find(x=>x.id===tx.productId);
  confirm2(`確認刪除 ${tx.date} ${p?.name||''} 的 ${txBadge(tx.type)} 紀錄？`, ()=>{
    DB.transactions = DB.transactions.filter(t=>t.id!==txId);
    save();
    updateKor();
    refreshCurrentView();
    toast('交易紀錄已刪除', 's');
  });
}

// ── Bulk Edit & Bulk Delete Handlers ─────────────────────────
function openBulkEditModal() {
  if (_selectedTxIds.size === 0) return toast('請先勾選欲編輯的交易', 'w');
  q('mBulkEditCount').textContent = _selectedTxIds.size;
  q('chkBulkDate').checked = false;
  q('chkBulkPlatform').checked = false;
  q('chkBulkPrice').checked = false;
  q('chkBulkFee').checked = false;
  q('chkBulkNote').checked = false;

  q('bulkInpDate').value = today();
  q('bulkInpPlatform').value = '';
  q('bulkInpPrice').value = '';
  q('bulkInpFee').value = '';
  q('bulkInpNote').value = '';
  openModal('mBulkEdit');
}

function applyBulkEdit() {
  const changeDate     = q('chkBulkDate').checked;
  const changePlatform = q('chkBulkPlatform').checked;
  const changePrice    = q('chkBulkPrice').checked;
  const changeFee      = q('chkBulkFee').checked;
  const changeNote     = q('chkBulkNote').checked;

  if (!changeDate && !changePlatform && !changePrice && !changeFee && !changeNote) {
    return toast('請至少勾選一個欲修改的欄位', 'w');
  }

  const newDate     = q('bulkInpDate').value;
  const newPlatform = q('bulkInpPlatform').value.trim();
  const newPrice    = parseFloat(q('bulkInpPrice').value);
  const newFee      = parseFloat(q('bulkInpFee').value);
  const newNote     = q('bulkInpNote').value.trim();

  if (changeDate && !newDate) return toast('請選擇日期', 'e');
  if (changePrice && (isNaN(newPrice) || newPrice < 0)) return toast('請輸入有效單價', 'e');
  if (changeFee && (isNaN(newFee) || newFee < 0)) return toast('請輸入有效手續費', 'e');

  let updatedCount = 0;
  DB.transactions.forEach(t => {
    if (_selectedTxIds.has(t.id)) {
      if (changeDate)     t.date = newDate;
      if (changePlatform) t.platform = newPlatform;
      if (changePrice)    t.pricePerUnitEUR = newPrice;
      if (changeFee && t.type === 'SELL') t.fee = newFee;
      if (changeNote)     t.note = newNote;
      updatedCount++;
    }
  });

  save();
  closeModal('mBulkEdit');
  updateKor();
  refreshCurrentView();
  toast(`成功批次修改 ${updatedCount} 筆交易紀錄！`, 's');
}

function bulkDeleteTransactions() {
  if (_selectedTxIds.size === 0) return toast('請先勾選欲刪除的交易', 'w');
  const count = _selectedTxIds.size;
  confirm2(`確認批次刪除已選取的 ${count} 筆交易紀錄？刪除後無法復原。`, ()=>{
    DB.transactions = DB.transactions.filter(t => !_selectedTxIds.has(t.id));
    save();
    updateKor();
    refreshCurrentView();
    toast(`已批次刪除 ${count} 筆交易`, 's');
  });
}

// ══════════════════════════════════════════════════════════════
//  MODAL — RECORD GRADE
// ══════════════════════════════════════════════════════════════
function openModalGrade(presetProductId=null) {
  const fromSel = q('gradeFrom');
  const toSel   = q('gradeTo');

  const withStock = DB.products.filter(p=>getQty(p.id)>0);
  fromSel.innerHTML = '<option value="">— 原始卡 —</option>' +
    withStock.map(p=>`<option value="${p.id}"${p.id===presetProductId?' selected':''}>${esc(p.name)} (在庫 ${getQty(p.id)} 張)</option>`).join('');

  // Graded variants = products with parentId
  const updateToSel = ()=>{
    const parentId = q('gradeFrom').value;
    const targets  = DB.products.filter(p=>p.parentId===parentId);
    toSel.innerHTML = '<option value="">— 評級後商品（需先新增鑑定卡）—</option>' +
      targets.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
  };
  fromSel.addEventListener('change', updateToSel);
  updateToSel();

  q('gradeQty').value     = '1';
  q('gradeFee').value     = '';
  q('gradeDate').value    = today();
  q('gradeService').value = 'PSA';
  q('gradeScore').value   = '';
  q('gradeNote').value    = '';
  openModal('mGrade');
}

q('btnSaveGrade').addEventListener('click', ()=>{
  const fromId  = q('gradeFrom').value;
  const toId    = q('gradeTo').value;
  const qty     = parseInt(q('gradeQty').value);
  const fee     = parseFloat(q('gradeFee').value)||0;
  const date    = q('gradeDate').value;
  const service = q('gradeService').value;
  const score   = q('gradeScore').value.trim();

  if (!fromId) return toast('請選擇原始卡','e');
  if (!toId)   return toast('請選擇評級後商品','e');
  if (!qty||qty<1) return toast('請輸入數量','e');
  if (!date)   return toast('請選擇日期','e');

  const avail = getQty(fromId);
  if (qty>avail) return toast(`庫存不足！原始卡在庫 ${avail} 張`,'e');

  DB.transactions.push({
    id:              uid(),
    productId:       fromId,
    targetProductId: toId,
    type:            'GRADE',
    date,
    quantity:        qty,
    pricePerUnitEUR: getWACC(fromId, date), // cost basis of raw card
    feePerUnitEUR:   fee,
    platform:        service,
    gradingService:  service,
    gradingScore:    score,
    note:            `送評鑑: ${service} ${score}`,
  });

  save(); closeModal('mGrade');
  refreshCurrentView();
  toast(`送評 × ${qty} 張已記錄（${service} ${score}）`,'s');
});

// ══════════════════════════════════════════════════════════════
//  MODAL — EXPENSE
// ══════════════════════════════════════════════════════════════
q('btnSaveExpense').addEventListener('click', ()=>{
  const date = q('expDate').value;
  const cat  = q('expCat').value;
  const amt  = parseFloat(q('expAmt').value);
  const desc = q('expDesc').value.trim();
  if (!date) return toast('請選擇日期','e');
  if (isNaN(amt)||amt<0) return toast('請輸入金額','e');
  if (!desc) return toast('請輸入說明','e');

  const isPrivate = document.querySelector('input[name="expPrivate"]:checked')?.value==='true';

  DB.expenses.push({ id:uid(), date, category:cat, amountEur:amt, desc, isPrivate });
  save(); closeModal('mExpense');
  renderExpenses();
  toast('費用已記錄','s');
});

// ══════════════════════════════════════════════════════════════
//  BACKUP / RESTORE
// ══════════════════════════════════════════════════════════════
function exportJson() {
  // Export in format compatible with original PokeLedger backups
  const exportData = {
    products:     DB.products,
    transactions: DB.transactions,
    expenses:     DB.expenses,
    settings:     DB.settings,
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {type:'application/json'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `pokeledger-backup-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  DB.settings.lastBackup = new Date().toISOString();
  save();
  renderSettings();
  toast('JSON 備份已匯出 ✓','s');
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = e=>{
    try {
      const parsed = JSON.parse(e.target.result);
      // Accept original PokeLedger format (products + transactions) or new format
      if (!Array.isArray(parsed.products)) throw new Error('格式錯誤：缺少 products');
      confirm2('匯入將覆蓋所有現有資料（交易、庫存、費用），確認繼續？', ()=>{
        DB.products     = parsed.products     || [];
        DB.transactions = parsed.transactions || [];
        DB.expenses     = parsed.expenses     || [];
        DB.settings     = { ...DEFAULT.settings, ...(parsed.settings||{}) };
        save();
        toast('資料匯入成功，重新整理中…','s');
        setTimeout(()=>location.reload(), 700);
      });
    } catch(err) {
      toast('JSON 格式錯誤：'+err.message,'e');
    }
  };
  reader.readAsText(file);
}

// ══════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════
function txBadge(type) {
  const labels = { BUY:'🛒 進貨', SELL:'💰 銷售', GRADE:'🏅 送評', EXPENSE:'💸 費用' };
  return `<span class="tx-badge ${type}">${labels[type]||type}</span>`;
}

function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

function refreshCurrentView() {
  renderTab(currentTab());
  updateKor();
}

let _confirmCb = null;
function confirm2(msg, onOk) {
  q('confirmTitle').textContent='確認操作';
  q('confirmMsg').textContent=msg;
  _confirmCb=onOk; openModal('mConfirm');
}
function confirm2Async(msg, okLabel='確認') {
  return new Promise(res=>{
    q('confirmTitle').textContent='確認操作';
    q('confirmMsg').textContent=msg;
    q('confirmOk').textContent=okLabel;
    _confirmCb=()=>res(true);
    q('confirmCancel').onclick=()=>{ closeModal('mConfirm'); res(false); };
    openModal('mConfirm');
  });
}

function toast(msg, type='s') {
  const icons = {s:'✅',e:'❌',w:'⚠️'};
  const el = document.createElement('div');
  el.className=`toast ${type}`;
  el.innerHTML=`<span>${icons[type]}</span><span>${esc(msg)}</span>`;
  q('toasts').appendChild(el);
  setTimeout(()=>el.remove(), 3400);
}

// ══════════════════════════════════════════════════════════════
//  EVENT WIRING
// ══════════════════════════════════════════════════════════════
function wireEvents() {
  // Nav
  document.querySelectorAll('.nav-link[data-tab]').forEach(l=>{
    l.addEventListener('click', ()=>switchTab(l.dataset.tab));
  });

  // Scope Button Groups toggle
  document.querySelectorAll('.scope-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const scope = btn.dataset.scope;
      const targetId = btn.dataset.target;
      setScopeValue(targetId, scope);
      if (targetId === 'sellScope') {
        updateProfitPreview();
        updateKorCheck();
      }
    });
  });

  // Close detail
  q('detailClose').addEventListener('click', closeDetail);
  q('detailBackdrop').addEventListener('click', closeDetail);

  // Modal closes
  document.querySelectorAll('[data-close]').forEach(btn=>{
    btn.addEventListener('click', ()=>closeModal(btn.dataset.close));
  });
  document.querySelectorAll('.modal-overlay').forEach(ov=>{
    ov.addEventListener('click', e=>{ if(e.target===ov) closeModal(ov.id); });
  });

  // Confirm dialog
  q('confirmOk').addEventListener('click', ()=>{ _confirmCb?.(); _confirmCb=null; closeModal('mConfirm'); });
  q('confirmCancel').addEventListener('click', ()=>{ _confirmCb=null; closeModal('mConfirm'); });

  // Business Inventory filters
  ['invSearch-biz','invLangFilter-biz','invStatusFilter-biz'].forEach(id=>{
    q(id)?.addEventListener('input', () => renderInventoryPage('biz'));
    q(id)?.addEventListener('change', () => renderInventoryPage('biz'));
  });

  // Private Inventory filters
  ['invSearch-priv','invLangFilter-priv','invStatusFilter-priv'].forEach(id=>{
    q(id)?.addEventListener('input', () => renderInventoryPage('priv'));
    q(id)?.addEventListener('change', () => renderInventoryPage('priv'));
  });

  // Add product buttons
  document.querySelectorAll('.btnAddProductBtn').forEach(btn => {
    btn.addEventListener('click', () => openModalProduct());
  });

  // Transactions
  q('btnAddSell').addEventListener('click', ()=>openModalSell());
  q('btnAddBuy').addEventListener('click', ()=>openModalBuy());
  ['txScopeFilter','txYearFilter','txTypeFilter'].forEach(id=>q(id)?.addEventListener('change', renderTransactions));

  // Expenses
  q('btnAddExpense').addEventListener('click', ()=>{
    q('expDate').value=today();
    q('expCat').value='packaging';
    q('expAmt').value='';
    q('expDesc').value='';
    q('mileageRow').style.display='none';
    document.querySelector('input[name="expPrivate"][value="false"]').checked=true;
    openModal('mExpense');
  });
  q('expCatFilter')?.addEventListener('change', renderExpenses);
  q('expCat').addEventListener('change', ()=>{
    const isMil = q('expCat').value==='mileage';
    q('mileageRow').style.display = isMil?'flex':'none';
  });
  q('expKm').addEventListener('input', ()=>{
    const km = parseFloat(q('expKm').value)||0;
    const amt= km*MILEAGE_RATE;
    q('expKmCalc').textContent=`€ ${amt.toFixed(2)}`;
    q('expAmt').value=amt.toFixed(2);
  });

  // Reports
  q('rptYear')?.addEventListener('change', renderReports);
  q('btnPrint')?.addEventListener('click', ()=>window.print());

  // Sell modal live updates
  q('sellProductId').addEventListener('change', updateSellCostPreview);
  q('sellQty').addEventListener('input', ()=>{ updateSellCostPreview(); updateKorCheck(); });
  q('sellPrice').addEventListener('input', ()=>{ updateProfitPreview(); updateKorCheck(); });
  q('sellFee').addEventListener('input', updateProfitPreview);
  q('sellCountry').addEventListener('change', ()=>{
    const v=q('sellCountry').value;
    q('ossAlert').style.display=(v!=='NL')?'block':'none';
  });

  // Buy modal
  q('buySource').addEventListener('change', updateBuyHint);
  q('buyCurrency').addEventListener('change', ()=>{
    q('buyFxGroup').style.display=q('buyCurrency').value!=='EUR'?'flex':'none';
  });

  // Product modal currency
  q('pBuyCurrency').addEventListener('change', ()=>{
    q('pFxGroup').style.display=q('pBuyCurrency').value!=='EUR'?'flex':'none';
  });

  // Grade modal link buttons
  q('btnAddSell').addEventListener('click', ()=>openModalSell());
  const detailTabBtns = document.querySelectorAll('[data-tab]');
  detailTabBtns.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      if (!btn.classList.contains('nav-link')) switchTab(btn.dataset.tab);
    });
  });

  // Bulk Edit / Delete buttons
  q('btnBulkEdit')?.addEventListener('click', openBulkEditModal);
  q('btnBulkDelete')?.addEventListener('click', bulkDeleteTransactions);
  q('btnApplyBulkEdit')?.addEventListener('click', applyBulkEdit);

  // Settings
  q('btnSaveSettings')?.addEventListener('click', ()=>{
    DB.settings.company     = q('setCo').value.trim();
    DB.settings.kvk         = q('setKvk').value.trim();
    DB.settings.korStart    = q('setKorStart').value;
    DB.settings.fiscalYear  = parseInt(q('setYear').value);
    save(); updateKor(); renderSettings();
    toast('設定已儲存','s');
  });

  q('btnExport')?.addEventListener('click', exportJson);
  q('btnQuickBackup')?.addEventListener('click', exportJson);
  q('btnLoadPresetProducts')?.addEventListener('click', ()=>{
    confirm2('確認載入 65+ 款預設商品目錄？這會將商品補齊至你的商品清單。', ()=>{
      DB.products = DEFAULT.products || [];
      save();
      refreshCurrentView();
      toast('預設商品清單已成功載入！', 's');
    });
  });
  q('importFile')?.addEventListener('change', e=>{
    if (e.target.files[0]) importJson(e.target.files[0]);
    e.target.value='';
  });
  q('btnClearAll')?.addEventListener('click', ()=>{
    confirm2('確認清除所有資料？此操作無法復原。請先備份！', ()=>{
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    });
  });
  // Cloud backup buttons
  q('btnPickFolder')?.addEventListener('click', pickBackupFolder);
  q('btnSyncNow')?.addEventListener('click', ()=>cloudAutoSave(true));
}

// ══════════════════════════════════════════════════════════════
//  CLOUD BACKUP  (File System Access API)
// ══════════════════════════════════════════════════════════════
const HANDLE_IDB   = 'PokeLedgerHandles';
const HANDLE_KEY   = 'backupDirHandle';
const CLOUD_FILE   = 'pokeledger-data.json';
let   _dirHandle   = null;   // FileSystemDirectoryHandle
let   _cloudSaving = false;

// ── Persist handle in IndexedDB ───────────────────────────────
function openHandleDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(HANDLE_IDB, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('handles');
    req.onsuccess = e => res(e.target.result);
    req.onerror   = () => rej(req.error);
  });
}
async function saveHandle(handle) {
  const db = await openHandleDB();
  return new Promise((res, rej) => {
    const tx = db.transaction('handles', 'readwrite');
    tx.objectStore('handles').put(handle, HANDLE_KEY);
    tx.oncomplete = () => res();
    tx.onerror    = () => rej(tx.error);
  });
}
async function loadHandle() {
  const db = await openHandleDB();
  return new Promise((res) => {
    const tx  = db.transaction('handles', 'readonly');
    const req = tx.objectStore('handles').get(HANDLE_KEY);
    req.onsuccess = () => res(req.result || null);
    req.onerror   = () => res(null);
  });
}
async function clearHandle() {
  const db = await openHandleDB();
  return new Promise((res) => {
    const tx = db.transaction('handles', 'readwrite');
    tx.objectStore('handles').delete(HANDLE_KEY);
    tx.oncomplete = () => res();
  });
}

// ── Permission helper ─────────────────────────────────────────
async function verifyPermission(handle, mode = 'readwrite') {
  const opts = { mode };
  if ((await handle.queryPermission(opts)) === 'granted') return true;
  if ((await handle.requestPermission(opts)) === 'granted') return true;
  return false;
}

// ── Pick folder ───────────────────────────────────────────────
async function pickBackupFolder() {
  if (!window.showDirectoryPicker) {
    toast('此瀏覽器不支援自動雲端備份，請改用 Chrome 或 Edge。', 'e');
    return;
  }
  try {
    const handle = await window.showDirectoryPicker({ id:'pokeledger', mode:'readwrite', startIn:'documents' });
    _dirHandle = handle;
    await saveHandle(handle);
    renderCloudStatus();
    await cloudAutoSave(true);
    toast('☁️ 雲端備份資料夾設定完成！之後每次儲存自動同步。', 's');
  } catch(e) {
    if (e.name !== 'AbortError') toast('無法存取資料夾：'+e.message, 'e');
  }
}

// ── Auto save ─────────────────────────────────────────────────
async function cloudAutoSave(manual = false) {
  if (!_dirHandle) return;
  if (_cloudSaving) return;
  _cloudSaving = true;
  setCloudDot('syncing');
  try {
    if (!(await verifyPermission(_dirHandle))) {
      setCloudDot('error');
      _cloudSaving = false;
      if (manual) toast('雲端備份：需要資料夾存取權限，請重新選擇資料夾。', 'w');
      return;
    }
    const fileHandle = await _dirHandle.getFileHandle(CLOUD_FILE, { create: true });
    const writable   = await fileHandle.createWritable();
    const payload    = JSON.stringify({
      products: DB.products, transactions: DB.transactions,
      expenses: DB.expenses, settings: DB.settings,
      _savedAt: new Date().toISOString(),
    }, null, 2);
    await writable.write(payload);
    await writable.close();
    DB.settings.cloudLastSync = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DB)); // update local without recursion
    setCloudDot('active');
    renderCloudStatus();
    if (manual) toast('☁️ 雲端同步完成 ✓', 's');
  } catch(e) {
    setCloudDot('error');
    if (manual) toast('雲端同步失敗：'+e.message, 'e');
    console.warn('[cloud] save failed', e);
  } finally {
    _cloudSaving = false;
  }
}

// ── Auto load on startup ──────────────────────────────────────
async function cloudAutoLoad() {
  // Only offer if no local data exists (fresh start or new browser)
  if (DB.products.length > 0) return; // already have local data
  const handle = await loadHandle();
  if (!handle) return;
  try {
    if (!(await verifyPermission(handle, 'read'))) return;
    const fileHandle = await handle.getFileHandle(CLOUD_FILE);
    const file       = await fileHandle.getFile();
    const text       = await file.text();
    const parsed     = JSON.parse(text);
    if (!Array.isArray(parsed.products)) return;
    // Offer to load
    const savedAt = parsed._savedAt ? new Date(parsed._savedAt).toLocaleString('zh-TW') : '（時間不明）';
    confirm2(
      `☁️ 偵測到雲端備份（${savedAt}），共 ${parsed.products.length} 種商品。\n要載入到本機嗎？`,
      () => {
        DB.products     = parsed.products     || [];
        DB.transactions = parsed.transactions || [];
        DB.expenses     = parsed.expenses     || [];
        DB.settings     = { ...DEFAULT.settings, ...(parsed.settings||{}) };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
        toast('雲端資料已載入！', 's');
        setTimeout(() => location.reload(), 600);
      }
    );
  } catch(e) {
    // Silently ignore — file might not exist yet
    console.info('[cloud] no backup file found or unreadable', e);
  }
}

// ── Render cloud status UI ────────────────────────────────────
function renderCloudStatus() {
  const iconEl   = q('csIcon');
  const folderEl = q('csFolder');
  const noteEl   = q('csNote');
  const dotEl    = q('csDot');
  const syncBtn  = q('btnSyncNow');
  if (!folderEl) return;

  if (!window.showDirectoryPicker) {
    folderEl.textContent = '此瀏覽器不支援（請改用 Chrome / Edge）';
    noteEl.textContent   = 'Safari 不支援 File System Access API';
    if (iconEl)  iconEl.textContent = '🚫';
    if (dotEl)   dotEl.className = 'cs-dot error';
    if (syncBtn) syncBtn.disabled = true;
    return;
  }

  if (_dirHandle) {
    folderEl.textContent = '📁 ' + _dirHandle.name;
    const sync = DB.settings.cloudLastSync;
    noteEl.textContent   = sync
      ? '最後同步：' + new Date(sync).toLocaleString('zh-TW')
      : '尚未同步';
    if (iconEl)  iconEl.textContent = '☁️';
    if (dotEl)   dotEl.className = 'cs-dot active';
    if (syncBtn) syncBtn.disabled = false;
  } else {
    folderEl.textContent = '尚未設定備份資料夾';
    noteEl.textContent   = '選擇一次，之後每次記帳自動儲存';
    if (iconEl)  iconEl.textContent = '☁️';
    if (dotEl)   dotEl.className = 'cs-dot';
    if (syncBtn) syncBtn.disabled = true;
  }
}

function setCloudDot(state) {
  const dot = q('csDot');
  if (dot) dot.className = 'cs-dot ' + state;
}

// ── Init cloud on startup ─────────────────────────────────────
async function initCloud() {
  if (!window.showDirectoryPicker) { renderCloudStatus(); return; }
  const handle = await loadHandle();
  if (handle) {
    _dirHandle = handle;
    renderCloudStatus();
    // Try auto-load if local is empty
    await cloudAutoLoad();
  }
}

// ══════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════
async function init() {
  wireEvents();
  updateKor();
  switchTab('dashboard');
  await initCloud();

  // First-time welcome
  if (!DB.products.length && !DB.settings.company) {
    setTimeout(()=>{
      toast('👋 歡迎！可匯入舊版 PokeLedger 備份 JSON，或手動新增商品開始記帳。','w');
    }, 800);
  }
}

init();
