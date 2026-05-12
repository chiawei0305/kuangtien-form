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
  }
  document.getElementById('liff-loading').classList.add('hidden');
}

function renderLineProfile(profile) {
  document.getElementById('top-name').textContent = profile.displayName;
  const topWrap = document.getElementById('top-avatar-wrap');
  if (profile.pictureUrl) {
    topWrap.innerHTML = `<img class="top-avatar" src="${profile.pictureUrl}" alt="avatar">`;
  }
  document.getElementById('top-user-bar').classList.add('show');
}

// ─── 蒐集問卷答案與標籤 ─────────────────────────────────
function collectSurvey() {
  const answers = {};
  const tags = [];

  // 單選題 Q1, Q2
  ['q1', 'q2'].forEach(name => {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    if (el) {
      answers[name] = el.value;
      if (el.dataset.tag) tags.push(el.dataset.tag);
    } else {
      answers[name] = '';
    }
  });

  // 多選題 Q3, Q4
  ['q3', 'q4'].forEach(name => {
    const els = document.querySelectorAll(`input[name="${name}"]:checked`);
    answers[name] = [...els].map(e => e.value).join('、');
    [...els].forEach(e => { if (e.dataset.tag) tags.push(e.dataset.tag); });
  });

  // 生日月份
  const bMonth = document.getElementById('f-birth-month').value;
  answers.birthMonth = bMonth;
  if (bMonth) tags.push(`${bMonth}生日`);

  return { answers, tags };
}

// ─── 提交 ───────────────────────────────────────────────
async function submitForm() {
  const name  = document.getElementById('f-name').value.trim();
  const phone = document.getElementById('f-phone').value.trim();
  const errEl = document.getElementById('form-error');
  const showErr = (msg) => { errEl.textContent = msg; errEl.style.display = 'block'; window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const { answers, tags } = collectSurvey();

  if (!answers.q1) return showErr('請完成 Q1：知道鱸魚如何幫助胸口悶之苦？');
  if (!answers.q2) return showErr('請完成 Q2：小孩的年齡');
  if (!answers.q3) return showErr('請完成 Q3：會在意孩子或自己是否有以下情形？');
  if (!answers.q4) return showErr('請完成 Q4：有沒有以下過敏或體質狀況？');
  if (!name)       return showErr('請填寫姓名');
  if (!phone)      return showErr('請填寫電話');
  if (!answers.birthMonth) return showErr('請選擇生日月份');

  if (!/^[0-9\-\+\s]{8,20}$/.test(phone)) {
    return showErr('電話格式不正確，請重新確認');
  }

  errEl.style.display = 'none';

  const payload = {
    timestamp:    new Date().toISOString(),
    name,
    phone,
    birthMonth:   answers.birthMonth,
    q1:           answers.q1,
    q2:           answers.q2,
    q3:           answers.q3,
    q4:           answers.q4,
    tags,
    lineUserId:   lineProfile?.userId      || '',
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
