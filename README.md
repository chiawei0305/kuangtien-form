# 光田醫院 — 動動手30秒參加抽獎

LINE LIFF 內嵌的會員資料登錄表單。填完自動寫入 Google Sheet，並透過 Super 8 API 自動為 LINE 用戶打標籤。

## 技術架構

```
LIFF (Zeabur Static)       後台
index.html  ──POST──▶  Apps Script  ──▶  Google Sheet
                            └──────▶  Super 8 API (打標籤)
```

## 檔案結構

| 檔案 | 說明 |
|------|------|
| `index.html` | 表單頁面（純 HTML） |
| `styles.css` | 樣式（光田藍 `#005BAC` / `#00A3E0`） |
| `app.js` | LIFF 初始化、表單驗證、送出邏輯 |
| `code.gs` | Apps Script 後端（複製貼進 Sheet 的 Apps Script 編輯器） |

## 表單欄位

| 欄位 | 必填 | 備註 |
|------|------|------|
| 姓名 | ✅ | LIFF 自動帶入，唯讀 |
| 電話 | ✅ | 8–20 位數字／橫線／加號 |
| 生日 | ✅ | date picker |
| 電子信箱 | ✅ | email 格式驗證 |
| 地址 | — | 選填 |

## Apps Script 部署

1. 開啟 Google Sheet → **擴充功能 → Apps Script**
2. 把 `code.gs` 內容貼進 `Code.gs`
3. **專案設定 → 指令碼屬性** 新增三個屬性：
   - `SUPER8_API_KEY` — Super 8 後台的 API Key
   - `SUPER8_ORG_ID` — 光田組織 ID
   - `SUPER8_TAG_NAME` — 標籤名稱（預設 `光田會員`）
4. **部署 → 新增部署作業 → 網頁應用程式**
   - 執行身分：我
   - 誰可以存取：所有人
5. 把 `/exec` URL 貼到 `app.js` 的 `APPS_SCRIPT_URL`

## 前端部署（Zeabur）

```bash
git push origin main
```

Zeabur 偵測為靜態網站自動部署。

## LIFF 設定

LIFF URL 須指向 Zeabur 部署後的網域（在 LINE Developers 後台設定 Endpoint URL）。

## 本地測試

LIFF 需要 HTTPS，本地測試可用：

```bash
npx serve .
# 或
python3 -m http.server 8080
```

但 LINE 登入流程必須走部署後的 LIFF URL 才能正常運作。
