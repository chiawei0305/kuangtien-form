/**
 * 光田醫院 — 會員資料登錄 Apps Script
 *
 * 部署方式：
 *   1. 在 Google Sheet 上方選單 → 擴充功能 → Apps Script
 *   2. 將本檔內容貼入 Code.gs，存檔
 *   3. 設定指令碼屬性（專案設定 → 指令碼屬性 → 加入屬性）：
 *        SUPER8_API_KEY   = 你的 Super 8 API Key
 *        SUPER8_ORG_ID    = 光田醫院的 Super 8 Organization ID
 *        SUPER8_TAG_NAME  = 要打的標籤名稱（例如：光田會員）
 *   4. 點「部署」→「新增部署作業」→ 類型選「網頁應用程式」
 *        執行身分：我　／　誰可以存取：所有人
 *   5. 部署後取得 /exec URL，貼到前端 app.js 的 APPS_SCRIPT_URL
 *
 * 注意：每次修改程式碼後要重新部署（新增版本），URL 才會生效。
 */

// ── 設定區 ─────────────────────────────────────────────
const SHEET_ID   = '1mj3wBCJfFkgd24BlK51t5012Q2EcVDNIyWY48_hiKd0';
const SHEET_NAME = '會員資料';   // 工作表名稱（找不到會自動建立）

const HEADERS = [
  '送出時間', '姓名', '電話', '生日', '電子信箱', '地址',
  'LINE userId', 'LINE 顯示名稱', 'Super 8 打標結果'
];

// Super 8 API
const SUPER8_BASE = 'https://api-service.luckycat.no8.io';
// ───────────────────────────────────────────────────────


/**
 * 接收前端 POST 請求 → 寫入 Sheet + Super 8 打標籤
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // 1. Super 8 打標籤（如果有 lineUserId）
    let tagResult = '無 LINE userId，略過';
    if (data.lineUserId) {
      tagResult = tagSuper8User_(data.lineUserId);
    }

    // 2. 寫入 Sheet
    const sheet = getOrCreateSheet_(SHEET_NAME);
    ensureHeaders_(sheet);

    sheet.appendRow([
      formatTimestamp_(data.timestamp),
      data.name         || '',
      data.phone        || '',
      data.birthday     || '',
      data.email        || '',
      data.address      || '',
      data.lineUserId   || '',
      data.lineUserName || '',
      tagResult
    ]);

    return jsonResponse_({ ok: true, tagResult });
  } catch (err) {
    console.error('doPost error:', err);
    return jsonResponse_({ ok: false, error: String(err) });
  }
}


/**
 * GET 健康檢查 — 在瀏覽器打開 /exec 可確認部署成功
 */
function doGet() {
  return jsonResponse_({
    ok: true,
    service: '光田醫院 — 會員資料登錄',
    time: new Date().toISOString()
  });
}


// ── Super 8 打標籤 ──────────────────────────────────────

/**
 * 呼叫 Super 8 API 給該 LINE 用戶打標籤
 * @return {string} 執行結果摘要（會寫到 Sheet 最後一欄方便對帳）
 */
function tagSuper8User_(lineUserId) {
  const props   = PropertiesService.getScriptProperties();
  const apiKey  = props.getProperty('SUPER8_API_KEY');
  const orgId   = props.getProperty('SUPER8_ORG_ID');
  const tagName = props.getProperty('SUPER8_TAG_NAME') || '光田會員';

  if (!apiKey || !orgId) {
    return 'ERROR: 指令碼屬性 SUPER8_API_KEY / SUPER8_ORG_ID 未設定';
  }

  const url = `${SUPER8_BASE}/v1/tags`;
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    payload: JSON.stringify({
      organization: orgId,
      customerId: lineUserId,
      tags: [tagName]
    }),
    muteHttpExceptions: true
  };

  const res  = UrlFetchApp.fetch(url, options);
  const code = res.getResponseCode();
  const body = res.getContentText();

  Logger.log(`Super8 tag [${lineUserId}]: ${code} ${body}`);
  return (code >= 200 && code < 300) ? `OK (${code})` : `FAIL ${code}: ${body}`;
}


// ── 工具函式 ────────────────────────────────────────────

function getOrCreateSheet_(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() > 0) return;
  sheet.appendRow(HEADERS);
  sheet.getRange(1, 1, 1, HEADERS.length)
       .setFontWeight('bold')
       .setBackground('#F2AEAB')
       .setFontColor('#ffffff');
  sheet.setFrozenRows(1);
}

function formatTimestamp_(iso) {
  const d = iso ? new Date(iso) : new Date();
  return Utilities.formatDate(d, 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}


// ── 測試函式（在 Apps Script 編輯器手動執行） ──────────

function testWrite() {
  doPost({
    postData: {
      contents: JSON.stringify({
        timestamp: new Date().toISOString(),
        name: '測試用戶',
        phone: '0912-345-678',
        birthday: '1990-01-01',
        email: 'test@example.com',
        address: '台中市沙鹿區沙田路117號',
        lineUserId: 'U_test_123',
        lineUserName: '測試'
      })
    }
  });
}

function testTag() {
  Logger.log(tagSuper8User_('U_test_123'));
}
