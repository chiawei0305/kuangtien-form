const LIFF_ID         = '2006953631-gDydDLzs';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwxTovOwC3gSA5xMMSZJsdgnBUI9yl5ASe4j3LwHuPN3lOMtoh0PjlYEVEBP1DbKJQ/exec';

let lineProfile = null;

// ─── LIFF 初始化 ────────────────────────────────────────
async function initLiff() {
  try {
    await liff.init({ liffId: LIFF_ID });
    if (liff.isLoggedIn()) {
      lineProfile = await liff.getProfile();
      renderLineProfile(lineProfile);
    } else {
      liff.login();
      return;
    }
  } catch (err) {
    console.warn('LIFF init failed, fallback:', err);
    showManualNameField();
  }
  document.getElementById('liff-loading').classList.add('hidden');
}

function renderLineProfile(profile) {
  // 頂部用戶列（讓使用者知道已驗證）
  document.getElementById('top-name').textContent = profile.displayName;
  const topWrap = document.getElementById('top-avatar-wrap');
  if (profile.pictureUrl) {
    topWrap.innerHTML = `<img class="top-avatar" src="${profile.pictureUrl}" alt="avatar">`;
  }
  document.getElementById('top-user-bar').classList.add('show');
}

function showManualNameField() {
  // LIFF 失敗的 fallback — 沒什麼要做的，姓名欄位本來就可輸入
}

// ─── 提交 ───────────────────────────────────────────────
async function submitForm() {
  const name     = document.getElementById('f-name').value.trim();
  const phone    = document.getElementById('f-phone').value.trim();
  const birthday = document.getElementById('f-birthday').value.trim();
  const email    = document.getElementById('f-email').value.trim();
  const address  = document.getElementById('f-address').value.trim();

  const errEl = document.getElementById('form-error');
  const showErr = (msg) => { errEl.textContent = msg; errEl.style.display = 'block'; };

  if (!name)     return showErr('請填寫姓名');
  if (!phone)    return showErr('請填寫電話');
  if (!birthday) return showErr('請選擇生日');
  if (!email)    return showErr('請填寫電子信箱');

  if (!/^[0-9\-\+\s]{8,20}$/.test(phone)) {
    return showErr('電話格式不正確，請重新確認');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return showErr('電子信箱格式不正確，請重新確認');
  }

  errEl.style.display = 'none';

  const payload = {
    timestamp:   new Date().toISOString(),
    name,
    phone,
    birthday,
    email,
    address,
    lineUserId:  lineProfile?.userId      || '',
    lineUserName: lineProfile?.displayName || name,
  };

  document.getElementById('overlay').classList.add('show');
  document.getElementById('btn-submit').disabled = true;

  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.warn('Apps Script fetch error:', e);
  } finally {
    document.getElementById('overlay').classList.remove('show');
  }

  showThankYou(name);
}

// ─── 感謝頁 ─────────────────────────────────────────────
function showThankYou(name) {
  document.getElementById('form-section').style.display = 'none';
  document.getElementById('top-user-bar').style.display = 'none';

  const ty = document.getElementById('thank-you');
  document.getElementById('ty-name').textContent = name;
  ty.classList.add('show');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── 啟動 ───────────────────────────────────────────────
initLiff();
