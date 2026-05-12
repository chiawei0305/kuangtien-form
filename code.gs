/**
 * 光田醫院 × 幸福鱸魚 — 抽獎問卷 Apps Script
 *
 * 部署方式：
 *   1. 在 Google Sheet 上方選單 → 擴充功能 → Apps Script
 *   2. 將本檔內容貼入 Code.gs，存檔
 *   3. 設定指令碼屬性（專案設定 → 指令碼屬性 → 加入屬性）：
 *        SUPER8_API_KEY = Super 8 API Key
 *        SUPER8_ORG_ID  = Super 8 Organization ID
 *   4. 部署 → 新增部署作業 → 類型「網頁應用程式」
 *        執行身分：我 ／ 誰可以存取：所有人
 *   5. 部署後取得 /exec URL，貼到前端 app.js 的 APPS_SCRIPT_URL
 *
 * 注意：每次改完程式碼，需「管理部署作業 → 新版本」才會生效。
 */

// ── 設定區 ─────────────────────────────────────────────
const SHEET_ID   = '1mj3wBCJfFkgd24BlK51t5012Q2EcVDNIyWY48_hiKd0';
const SHEET_NAME = '會員資料';   // 工作表名稱（找不到會自動建立）

const HEADERS = [
  '送出時間', '姓名', '電話', '生日月份',
  'Q1 知道鱸魚', 'Q2 小孩年齡', 'Q3 健康狀況', 'Q4 過敏體質',
  'LINE userId', 'LINE 顯示名稱', '打標標籤', 'Super 8 結果'
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
    const tags = Array.isArray(data.tags) ? data.tags : [];

    // 1. Super 8 打標籤（如有 lineUserId 且有 tags）
    let tagResult = '略過';
    if (data.lineUserId && tags.length > 0) {
      tagResult = tagSuper8User_(data.lineUserId, tags);
    } else if (!data.lineUserId) {
      tagResult = '無 LINE userId';
    } else {
      tagResult = '無對應標籤';
    }

    // 2. 寫入 Sheet
    const sheet = getOrCreateSheet_(SHEET_NAME);
    ensureHeaders_(sheet);

    sheet.appendRow([
      formatTimestamp_(data.timestamp),
      data.name         || '',
      data.phone        || '',
      data.birthMonth   || '',
      data.q1           || '',
      data.q2           || '',
      data.q3           || '',
      data.q4           || '',
      data.lineUserId   || '',
      data.lineUserName || '',
      tags.join('、'),
      tagResult
    ]);

    return jsonResponse_({ ok: true, tagResult });
  } catch (err) {
    console.error('doPost error:', err);
    return jsonResponse_({ ok: false, error: String(err) });
  }
}


/**
 * GET 健康檢查
 */
function doGet() {
  return jsonResponse_({
    ok: true,
    service: '光田 × 幸福鱸魚 — 抽獎問卷',
    time: new Date().toISOString()
  });
}


// ── Super 8 打標籤 ──────────────────────────────────────

/**
 * @param {string} lineUserId
 * @param {string[]} tags
 * @return {string} 結果摘要
 */
function tagSuper8User_(lineUserId, tags) {
  const props  = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty('SUPER8_API_KEY');
  const orgId  = props.getProperty('SUPER8_ORG_ID');

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
      tags: tags
    }),
    muteHttpExceptions: true
  };

  const res  = UrlFetchApp.fetch(url, options);
  const code = res.getResponseCode();
  const body = res.getContentText();

  Logger.log(`Super8 tag [${lineUserId}] ${tags.join(',')}: ${code} ${body}`);
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


// ── 測試函式 ────────────────────────────────────────────

function testWrite() {
  doPost({
    postData: {
      contents: JSON.stringify({
        timestamp: new Date().toISOString(),
        name: '測試用戶',
        phone: '0912-345-678',
        birthMonth: '三月',
        q1: '知道',
        q2: '幼稚園',
        q3: '常感冒/免疫力差、腸胃敏感/易脹氣便祕',
        q4: '對海鮮或魚類過敏',
        tags: ['知道', '小孩幼稚園', '免疫', '腸胃道保養', '海鮮過敏', '三月生日'],
        lineUserId: 'U_test_123',
        lineUserName: '測試'
      })
    }
  });
}

function testTag() {
  Logger.log(tagSuper8User_('U_test_123', ['測試標籤']));
}
