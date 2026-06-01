const express = require('express');
const https = require('https');
const fs = require('fs');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = "dollarskill123";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "dollarskill999";
const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY || "";
const JSONBIN_BIN_ID = process.env.JSONBIN_BIN_ID || "";
const DATA_FILE = '/tmp/leads.json';

function loadLocal() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const d = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (d && Object.keys(d.leads || {}).length > 0) return d;
    }
  } catch (e) { console.error('Load local error:', e); }
  return null;
}

function saveLocal() {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify({ leads, conversations })); }
  catch (e) { console.error('Save local error:', e); }
}

function saveCloud() {
  if (!JSONBIN_API_KEY || !JSONBIN_BIN_ID) { console.log('No JSONBin config'); return; }
  try {
    const body = JSON.stringify({ leads, conversations });
    const options = {
      hostname: 'api.jsonbin.io', path: `/v3/b/${JSONBIN_BIN_ID}`, method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_API_KEY, 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(options, res => {
      let d = ''; res.on('data', chunk => d += chunk);
      res.on('end', () => console.log('Cloud saved:', d.substring(0, 50)));
    });
    req.on('error', e => console.error('Cloud save error:', e.message));
    req.write(body); req.end();
  } catch (e) { console.error('Cloud save error:', e); }
}

async function loadCloud() {
  if (!JSONBIN_API_KEY || !JSONBIN_BIN_ID) return null;
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.jsonbin.io', path: `/v3/b/${JSONBIN_BIN_ID}/latest`, method: 'GET',
      headers: { 'X-Master-Key': JSONBIN_API_KEY }
    };
    const req = https.request(options, res => {
      let d = ''; res.on('data', chunk => d += chunk);
      res.on('end', () => {
        try { const p = JSON.parse(d); console.log('Cloud load:', d.substring(0, 80)); resolve(p.record || null); }
        catch (e) { console.error('Cloud parse error:', e); resolve(null); }
      });
    });
    req.on('error', e => { console.error('Cloud load error:', e.message); resolve(null); });
    req.end();
  });
}

function saveData() { saveLocal(); saveCloud(); }

const SEED_LEADS = {
  '2349015724123': { stage: 'done_followup', bought: false, seeded: true },
  '2349018047060': { stage: 'done_followup', bought: false, seeded: true },
  '2348059980894': { stage: 'done_followup', bought: false, seeded: true },
};

let leads = {};
let conversations = {};
let lastSeen = {}; // tracks last seen message count per phone

async function init() {
  const local = loadLocal();
  if (local) {
    Object.assign(leads, local.leads);
    Object.assign(conversations, local.conversations);
    if (local.lastSeen) Object.assign(lastSeen, local.lastSeen);
    console.log('Loaded from local:', Object.keys(leads).length, 'leads');
  } else {
    console.log('Local empty, trying cloud...');
    const cloud = await loadCloud();
    if (cloud && Object.keys(cloud.leads || {}).length > 0) {
      Object.assign(leads, cloud.leads);
      Object.assign(conversations, cloud.conversations);
      if (cloud.lastSeen) Object.assign(lastSeen, cloud.lastSeen);
      console.log('Restored from cloud:', Object.keys(leads).length, 'leads');
      saveLocal();
    } else {
      console.log('No saved data, starting fresh with seed leads');
    }
  }
  for (const [phone, data] of Object.entries(SEED_LEADS)) {
    if (!leads[phone]) {
      leads[phone] = data;
      if (!conversations[phone]) conversations[phone] = [{ from: 'bot', text: '[Old lead, restored]', time: new Date().toISOString() }];
    }
  }
  // Mark all existing cooled off leads as read so no blue dots on fresh start
  for (const phone of Object.keys(leads)) {
    if (leads[phone]?.stage === 'done_followup') {
      const msgs = conversations[phone] || [];
      const customerMsgs = msgs.filter(m => m.from === 'customer');
      if (!lastSeen[phone + '_customer']) {
        lastSeen[phone + '_customer'] = customerMsgs.length;
      }
    }
  }
  saveData();
  console.log('Init complete:', Object.keys(leads).length, 'leads total');
}

function saveDataFull() {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify({ leads, conversations, lastSeen })); } catch (e) {}
  saveCloud();
}

const REVIEW_VIDEO_URL = 'https://res.cloudinary.com/dpknwoywz/video/upload/v1780173788/video_2026-05-30_15-12-27_t9aoqf.mp4';
const REVIEW_PIC1_URL = 'https://res.cloudinary.com/dpknwoywz/image/upload/v1780173251/photo_2026-05-30_15-07-57_yznnlq.jpg';
const REVIEW_PIC2_URL = 'https://res.cloudinary.com/dpknwoywz/image/upload/v1780173238/photo_2026-05-30_15-10-04_m6fkek.jpg';
const VOICE_NOTE_URL = 'https://res.cloudinary.com/dpknwoywz/video/upload/v1780175029/voicenote.m4a_myqyex.m4a';
const PRICE_VN_URL = 'https://res.cloudinary.com/dpknwoywz/video/upload/v1780247025/Vaurie_second_vn_kz13gy.m4a';
const OBJECTION_URL = 'https://res.cloudinary.com/dpknwoywz/image/upload/v1780176996/photo_2026-05-30_15-09-09_lnzooq.jpg';
const TESTIMONIAL_48HR_URL = 'https://res.cloudinary.com/dpknwoywz/video/upload/v1780176890/copy_AE270DFE-4121-4D3C-A869-DB0D674F4DDE_dsly51.mov';
const YOUTUBE_URL = 'https://youtu.be/aGwB50peA6g?si=v9ejB0Mbd_NdzdGD';
const AFFILIATE_URL = 'https://app.expertnaire.com/product/8646634117/8478632445';

const STAGE_CONFIG = {
  'waiting_name':       { label: 'Asked: whats your name?',   color: '#3b82f6', text: '#fff' },
  'waiting_pain_point': { label: 'Sent: intro VN',            color: '#f59e0b', text: '#fff' },
  'waiting_permission': { label: 'Asked: tried before?',      color: '#f97316', text: '#fff' },
  'waiting_done':       { label: 'Sent: YouTube link',        color: '#ef4444', text: '#fff' },
  'waiting_plug_reply': { label: 'Asked: can plug in daily?', color: '#22c55e', text: '#fff' },
  'pitch_sent':         { label: 'Sent: price VN + link',     color: '#dc2626', text: '#fff' },
  'done_followup':      { label: 'Cooled Off',                color: '#6b7280', text: '#fff' },
};

const ALL_STAGES = ['waiting_name','waiting_pain_point','waiting_permission','waiting_done','waiting_plug_reply','pitch_sent','done_followup'];

function getStageDisplay(stage) {
  return STAGE_CONFIG[stage] || { label: stage || 'Unknown', color: '#d1d5db', text: '#111' };
}

const QUICK_REPLIES = [
  { label: 'Is this legit?', text: 'I could send you hundreds of reviews but you won\'t be able to see them all 🙂\u200d↔️🦅' },
  { label: 'How much? (early)', text: 'Just watch the breakdown first, it covers everything including what you get and what it costs. Here it is: https://sweet-growth-production-9b60.up.railway.app/watch' },
  { label: 'No money now', text: 'Totally understand. When you\'re ready the link is here. Price is still N50,000 for now.' },
  { label: 'Does it work?', text: 'I could send you hundreds of reviews but you won\'t be able to see them all 🙂\u200d↔️🦅' },
  { label: 'Do I have to pay?', text: 'Yes, it\'s a one-time N50,000 directly on the platform, no hidden fees, nothing extra. You pay once and you\'re in. Want me to send the link now?' },
  { label: 'I\'ll think about it', text: 'Okay that\'s totally fine, take your time. I just wanted to give you a heads-up that the early-bird pricing is tied to the first 100 spots, and it\'s jumping to N150k soon. I\'d hate for you to have to pay the higher fee if you decide to jump in later.' },
  { label: 'Installments?', text: 'The system is a one-time N50,000, no installments. But honestly that\'s the point, one payment, then it pays you back multiplied. When you\'re ready the link is here.' },
  { label: 'Tried before', text: 'Same thing I thought. That\'s exactly why I almost didn\'t share this. Just watch the first 5 minutes. https://sweet-growth-production-9b60.up.railway.app/watch' },
  { label: 'What is this about?', text: 'Just watch the first 5 minutes of this video, it explains everything better than I can. https://sweet-growth-production-9b60.up.railway.app/watch' },
  { label: 'Resend VSL', text: 'No worries at all! Here it is again: https://sweet-growth-production-9b60.up.railway.app/watch. Take your time with it, reply Done when you are finished 🦅' },
  { label: 'MSG 3: tried before?', text: 'Okay real talk, I was just going to send this to everyone who messaged but I actually care about helping every single person actually print dollars everyday, not just sending stuff. Have you tried making money online before or is this your first time exploring it?' },
  { label: 'MSG 4: send breakdown?', text: 'Oh okay okay this is perfect for you. I have a breakdown video of everything you need to know. Dan in our inner circle made it easy to grasp and the first 5 minutes alone will show you why this is different from probably everything you have tried before. Would you like me to send it?' },
  { label: 'MSG 5: VSL link', text: 'Take your time with it. https://sweet-growth-production-9b60.up.railway.app/watch. You reached out because you know your current situation needs a change. This breakdown is the bridge to that new era 🦅 Reply Done when you are finished and I will help you get set up.' },
  { label: 'MSG 6: kudos', text: 'Okayy okay that\'s good, kudos to you 🦅. That video is the exact system of how we are hitting these numbers every single month. Does it look like something you would comfortably plug into your daily routine or would it be a struggle for you?' },
  { label: 'MSG 8: affiliate link', text: 'Since we\'ve covered the mechanics, you can jump in here: ' + AFFILIATE_URL + '. Once you\'re in, take a look at the latest reviews from the community. See you there!' },
  { label: 'MSG 9: any questions?', text: 'Any questions before you get your big bag?' },
];

function sendRequest(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const options = {
      hostname: 'graph.facebook.com', path, method: 'POST',
      headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(options, (res) => {
      let d = ''; res.on('data', chunk => d += chunk);
      res.on('end', () => { console.log('API:', d); resolve(d); });
    });
    req.on('error', reject); req.write(body); req.end();
  });
}

function sendText(to, message) {
  if (!conversations[to]) conversations[to] = [];
  conversations[to].push({ from: 'bot', text: message, time: new Date().toISOString() });
  lastSeen[to] = (conversations[to] || []).length;
  saveDataFull();
  return sendRequest(`/v19.0/${PHONE_NUMBER_ID}/messages`, { messaging_product: 'whatsapp', to, type: 'text', text: { body: message } });
}

function sendAudio(to, url) {
  if (!conversations[to]) conversations[to] = [];
  conversations[to].push({ from: 'bot', text: '[Voice Note]', time: new Date().toISOString() });
  lastSeen[to] = (conversations[to] || []).length;
  saveDataFull();
  return sendRequest(`/v19.0/${PHONE_NUMBER_ID}/messages`, { messaging_product: 'whatsapp', to, type: 'audio', audio: { link: url } });
}

function sendImage(to, url) {
  if (!conversations[to]) conversations[to] = [];
  conversations[to].push({ from: 'bot', text: '[Image]', time: new Date().toISOString() });
  lastSeen[to] = (conversations[to] || []).length;
  saveDataFull();
  return sendRequest(`/v19.0/${PHONE_NUMBER_ID}/messages`, { messaging_product: 'whatsapp', to, type: 'image', image: { link: url } });
}

function sendVideo(to, url) {
  if (!conversations[to]) conversations[to] = [];
  conversations[to].push({ from: 'bot', text: '[Video]', time: new Date().toISOString() });
  lastSeen[to] = (conversations[to] || []).length;
  saveDataFull();
  return sendRequest(`/v19.0/${PHONE_NUMBER_ID}/messages`, { messaging_product: 'whatsapp', to, type: 'video', video: { link: url } });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function hasUnread(phone) {
  const msgs = conversations[phone] || [];
  const seen = lastSeen[phone] || 0;
  const customerMsgs = msgs.filter(m => m.from === 'customer');
  return customerMsgs.length > (lastSeen[phone + '_customer'] || 0);
}

function markRead(phone) {
  const msgs = conversations[phone] || [];
  const customerMsgs = msgs.filter(m => m.from === 'customer');
  lastSeen[phone + '_customer'] = customerMsgs.length;
  saveDataFull();
}

function getLastMessageTime(phone) {
  const msgs = conversations[phone] || [];
  if (!msgs.length) return 0;
  return new Date(msgs[msgs.length - 1].time).getTime();
}

app.get('/admin', (req, res) => {
  const pass = req.query.pass;
  const filter = req.query.filter || '7';

  if (pass !== ADMIN_PASSWORD) {
    return res.send(`<html><body style="font-family:sans-serif;padding:20px;background:#f3f4f6">
      <div style="max-width:400px;margin:80px auto;background:#fff;padding:32px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
        <h2 style="margin:0 0 20px">💰 Dollar Skill Admin</h2>
        <form action="/admin" method="get">
          <input type="password" name="pass" placeholder="Password" style="width:100%;padding:10px;font-size:16px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;margin-bottom:12px"/>
          <button type="submit" style="width:100%;padding:10px;background:#25d366;color:white;border:none;border-radius:6px;font-size:16px;cursor:pointer">Login</button>
        </form>
      </div></body></html>`);
  }

  // Date filter
  const now = Date.now();
  const filterMs = filter === 'today' ? 86400000 : filter === '7' ? 7*86400000 : filter === '30' ? 30*86400000 : null;

  let allPhones = Object.keys(conversations);
  if (filterMs) {
    allPhones = allPhones.filter(p => (now - getLastMessageTime(p)) <= filterMs);
  }

  // Split into active and cooled off
  const activePhones = allPhones.filter(p => (leads[p]?.stage || 'done_followup') !== 'done_followup');
  const cooledPhones = allPhones.filter(p => (leads[p]?.stage || 'done_followup') === 'done_followup');

  // Sort: unread first, then by last message time
  function lastMessageIsCustomer(phone) {
    const msgs = conversations[phone] || [];
    if (!msgs.length) return false;
    return msgs[msgs.length - 1].from === 'customer';
  }

  const sortPhones = (phones) => phones.sort((a, b) => {
    const au = lastMessageIsCustomer(a) ? 1 : 0;
    const bu = lastMessageIsCustomer(b) ? 1 : 0;
    if (au !== bu) return bu - au;
    const au2 = hasUnread(a) ? 1 : 0;
    const bu2 = hasUnread(b) ? 1 : 0;
    if (au2 !== bu2) return bu2 - au2;
    return getLastMessageTime(b) - getLastMessageTime(a);
  });

  sortPhones(activePhones);
  sortPhones(cooledPhones);

  const stageCounts = {};
  allPhones.forEach(p => { const s = leads[p]?.stage||'done_followup'; stageCounts[s]=(stageCounts[s]||0)+1; });

  const quickReplyJS = JSON.stringify(QUICK_REPLIES);

  let html = `<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Vaurie HQ">
  <meta name="theme-color" content="#f4a7b9">
  <link rel="apple-touch-icon" href="data:image/png;base64,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"><style>
    *{box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f3f4f6;margin:0;padding:12px;font-size:15px}
    .header{background:#25d366;color:white;padding:14px 16px;border-radius:12px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center}
    .header h2{margin:0;font-size:17px}
    .filters{display:flex;gap:6px;margin-bottom:12px;overflow-x:auto}
    .filter-btn{padding:7px 14px;border-radius:20px;border:1.5px solid #ddd;background:#fff;font-size:13px;cursor:pointer;white-space:nowrap;color:#555}
    .filter-btn.active{background:#25d366;color:white;border-color:#25d366}
    .stats{display:flex;gap:8px;margin-bottom:12px}
    .stat{background:#fff;border-radius:10px;padding:10px;flex:1;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.07)}
    .stat-num{font-size:20px;font-weight:700} .stat-label{font-size:11px;color:#6b7280}
    .section-title{font-size:13px;font-weight:600;color:#6b7280;margin:12px 0 6px;text-transform:uppercase;letter-spacing:0.5px}
    .card{background:#fff;border-radius:12px;padding:14px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,0.07);position:relative}
    .card-top{display:flex;align-items:center;gap:8px;margin-bottom:6px}
    .unread-dot{width:8px;height:8px;border-radius:50%;background:#87ceeb;flex-shrink:0}
    .phone{font-size:14px;font-weight:700;color:#111;flex:1}
    .name-display{font-size:13px;color:#6b7280;margin-bottom:4px}
    .stage-badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;margin-bottom:8px}
    .msgs{background:#f9f9f9;padding:10px;border-radius:8px;max-height:160px;overflow-y:auto;margin-bottom:10px;display:flex;flex-direction:column-reverse}
    .msg-bot{text-align:right;margin-bottom:5px} .msg-customer{text-align:left;margin-bottom:5px}
    .bubble{display:inline-block;padding:6px 10px;border-radius:10px;max-width:82%;word-break:break-word;font-size:13px}
    .bubble-bot{background:#dcf8c6;border:1px solid #c3e6ad} .bubble-customer{background:#fff;border:1px solid #ddd}
    .time{font-size:9px;color:#999;margin-top:2px}
    .manage-btn{width:100%;padding:8px;background:#f3f4f6;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;color:#374151;cursor:pointer;margin-bottom:0;text-align:center}
    .manage-panel{display:none;margin-top:10px;border-top:1px solid #eee;padding-top:10px}
    .row{display:flex;gap:8px;margin-bottom:8px}
    input[type=text],select{flex:1;padding:8px;font-size:14px;border:1.5px solid #ddd;border-radius:8px;background:#fff}
    .btn-green{padding:8px 16px;background:#25d366;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer;white-space:nowrap}
    .btn-purple{padding:8px 14px;background:#6366f1;color:white;border:none;border-radius:8px;font-size:13px;cursor:pointer;white-space:nowrap}
    .btn-orange{padding:6px 10px;background:#f59e0b;color:white;border:none;border-radius:8px;font-size:12px;cursor:pointer}
    .btn-grey{padding:6px 10px;background:#6b7280;color:white;border:none;border-radius:8px;font-size:12px;cursor:pointer}
    .quick-toggle{background:none;border:1.5px solid #ddd;border-radius:8px;width:100%;padding:7px;font-size:13px;color:#555;cursor:pointer;margin-bottom:6px;text-align:left}
    .quick-panel{display:none;background:#f9f9f9;border-radius:8px;padding:8px;margin-bottom:8px}
    .quick-btn{display:block;width:100%;text-align:left;padding:7px 10px;margin-bottom:5px;background:#fff;border:1px solid #ddd;border-radius:6px;font-size:13px;cursor:pointer;color:#111}
    .quick-btn:hover{background:#f0fdf4}
    .media-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
    .name-edit{display:flex;gap:6px;margin-bottom:8px}
    .divider{border:none;border-top:1px solid #eee;margin:8px 0}
    .cooled-header{display:flex;justify-content:space-between;align-items:center;cursor:pointer;padding:4px 0}
    .cooled-section{margin-top:4px}
    .funnel-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #f3f4f6;font-size:13px}
    .funnel-num{font-weight:700;color:#111;min-width:30px;text-align:center}
    .funnel-pct{color:#6b7280;min-width:40px;text-align:right}
  </style>
  <meta http-equiv="refresh" content="300">
  <script>
    const quickReplies = ${quickReplyJS};
    function toggleManage(id) {
      const p = document.getElementById('manage-' + id);
      p.style.display = p.style.display === 'none' ? 'block' : 'none';
    }
    function toggleQuick(id) {
      const p = document.getElementById('quick-' + id);
      p.style.display = p.style.display === 'none' ? 'block' : 'none';
    }
    function fillReply(id, text) {
      const input = document.getElementById('reply-' + id);
      if (input) { input.value = text; input.focus(); }
      const panel = document.getElementById('quick-' + id);
      if (panel) panel.style.display = 'none';
    }
    document.addEventListener('click', function(e) {
      if (e.target && e.target.classList.contains('quick-btn')) {
        const idx = e.target.getAttribute('data-idx');
        const cardId = e.target.getAttribute('data-cardid');
        if (idx !== null && cardId) {
          const q = quickReplies[parseInt(idx)];
          if (q) fillReply(cardId, q.text);
        }
      }
    });
    function toggleStats() {
      const p = document.getElementById('stats-panel');
      p.style.display = p.style.display === 'none' ? 'block' : 'none';
    }
    function toggleCooled() {
      const s = document.getElementById('cooled-body');
      const arrow = document.getElementById('cooled-arrow');
      if (s.style.display === 'none') { s.style.display = 'block'; arrow.textContent = '▲'; }
      else { s.style.display = 'none'; arrow.textContent = '▼'; }
    }
    function markRead(phone, pass) {
      fetch('/admin/markread?pass=' + pass + '&phone=' + phone);
    }
    function markReadClient(phone, pass, cardId) {
      fetch('/admin/markread?pass=' + pass + '&phone=' + phone);
      const dot = document.querySelector('#card-' + cardId + ' .unread-dot');
      if (dot) dot.style.display = 'none';
    }
  </script>
  </head><body>`;

  html += `<div class="header"><h2>💰 Dollar Skill</h2><span>${allPhones.length} convos</span></div>`;

  // Filter buttons
  html += `<div class="filters">
    <a href="/admin?pass=${pass}&filter=today" class="filter-btn ${filter==='today'?'active':''}">Today</a>
    <a href="/admin?pass=${pass}&filter=7" class="filter-btn ${filter==='7'?'active':''}">7 days</a>
    <a href="/admin?pass=${pass}&filter=30" class="filter-btn ${filter==='30'?'active':''}">30 days</a>
    <a href="/admin?pass=${pass}&filter=all" class="filter-btn ${filter==='all'?'active':''}">All time</a>
  </div>`;

  // Stats
  html += `<div class="stats">
    <div class="stat"><div class="stat-num" style="color:#dc2626">${(stageCounts['pitch_sent']||0)+(stageCounts['waiting_done']||0)}</div><div class="stat-label">🔴 Urgent</div></div>
    <div class="stat"><div class="stat-num" style="color:#22c55e">${stageCounts['waiting_plug_reply']||0}</div><div class="stat-label">🟢 HOT</div></div>
    <div class="stat"><div class="stat-num">${allPhones.length}</div><div class="stat-label">Total</div></div>
    <div class="stat"><div class="stat-num" style="color:#87ceeb">${Object.keys(conversations).filter(p => hasUnread(p)).length}</div><div class="stat-label">Unread</div></div>
  </div>`;

  // Funnel analytics
  const allPhonesTotal = Object.keys(conversations);
  const totalConvos = allPhonesTotal.length;
  const gotVN = allPhonesTotal.filter(p => {
    const s = leads[p]?.stage;
    return ['waiting_pain_point','waiting_permission','waiting_done','waiting_plug_reply','pitch_sent','done_followup'].includes(s);
  }).length;
  const answeredPainPoint = allPhonesTotal.filter(p => {
    const s = leads[p]?.stage;
    return ['waiting_permission','waiting_done','waiting_plug_reply','pitch_sent','done_followup'].includes(s);
  }).length;
  const gotVSL = allPhonesTotal.filter(p => {
    const s = leads[p]?.stage;
    return ['waiting_done','waiting_plug_reply','pitch_sent','done_followup'].includes(s);
  }).length;
  const watchedVSL = allPhonesTotal.filter(p => {
    const s = leads[p]?.stage;
    return ['waiting_plug_reply','pitch_sent','done_followup'].includes(s);
  }).length;
  const gotPitch = allPhonesTotal.filter(p => {
    const s = leads[p]?.stage;
    return ['pitch_sent','done_followup'].includes(s);
  }).length;
  const bought = allPhonesTotal.filter(p => leads[p]?.bought).length;

  function pct(a, b) { return b > 0 ? Math.round((a/b)*100) + '%' : '0%'; }

  html += '<button class="quick-toggle" onclick="toggleStats()" style="margin-bottom:12px">Funnel Stats</button>';
  html += '<div id="stats-panel" style="display:none;background:#fff;border-radius:12px;padding:14px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,0.07)">';
  html += '<div style="font-size:13px;font-weight:600;color:#6b7280;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px">Drop-off Map (All time)</div>';
  html += '<div class="funnel-row"><span>1. Total conversations</span><span class="funnel-num">' + totalConvos + '</span><span class="funnel-pct">100%</span></div>';
  html += '<div class="funnel-row"><span>2. Got intro VN</span><span class="funnel-num">' + gotVN + '</span><span class="funnel-pct">' + pct(gotVN, totalConvos) + '</span></div>';
  html += '<div class="funnel-row"><span>3. Answered pain point</span><span class="funnel-num">' + answeredPainPoint + '</span><span class="funnel-pct">' + pct(answeredPainPoint, totalConvos) + '</span></div>';
  html += '<div class="funnel-row"><span>4. Got VSL link</span><span class="funnel-num">' + gotVSL + '</span><span class="funnel-pct">' + pct(gotVSL, totalConvos) + '</span></div>';
  html += '<div class="funnel-row"><span>5. Watched VSL (said Done)</span><span class="funnel-num">' + watchedVSL + '</span><span class="funnel-pct">' + pct(watchedVSL, totalConvos) + '</span></div>';
  html += '<div class="funnel-row"><span>6. Got pitch</span><span class="funnel-num">' + gotPitch + '</span><span class="funnel-pct">' + pct(gotPitch, totalConvos) + '</span></div>';
  html += '<div class="funnel-row" style="font-weight:700;color:#22c55e"><span>7. Bought</span><span class="funnel-num">' + bought + '</span><span class="funnel-pct">' + pct(bought, totalConvos) + '</span></div>';
  html += '</div>';

  function renderCard(phone) {
    const msgs = [...(conversations[phone] || [])].reverse();
    const stage = leads[phone]?.stage || 'done_followup';
    const si = getStageDisplay(stage);
    const unread = hasUnread(phone);
    const name = leads[phone]?.name || '';
    const cardId = phone.replace(/\D/g, '');
    const opts = ALL_STAGES.map(s => `<option value="${s}" ${s===stage?'selected':''}>${STAGE_CONFIG[s]?.label||s}</option>`).join('');
    const qBtns = QUICK_REPLIES.map((q, i) => {
      return `<button type="button" class="quick-btn" data-cardid="${cardId}" data-idx="${i}">${q.label}</button>`;
    }).join('');

    return `<div class="card" id="card-${cardId}">
      <div class="card-top">
        ${unread ? `<div class="unread-dot" onclick="markReadClient('${phone}', '${pass}', '${cardId}')" style="cursor:pointer" title="Mark as read"></div>` : '<div style="width:8px"></div>'}
        <div class="phone">+${phone}</div>
      </div>
      ${name ? `<div class="name-display">👤 ${name}</div>` : ''}
      <span class="stage-badge" style="background:${si.color};color:${si.text}">${si.label}</span>
      <div class="msgs">${msgs.map(m=>`<div class="msg-${m.from}"><span class="bubble bubble-${m.from}">${m.text}</span><div class="time">${new Date(m.time).toLocaleTimeString()}</div></div>`).join('')}</div>
      <button class="manage-btn" onclick="toggleManage('${cardId}')">Manage</button>
      <div class="manage-panel" id="manage-${cardId}">
        <form action="/admin/reply" method="post">
          <input type="hidden" name="pass" value="${pass}"/><input type="hidden" name="phone" value="${phone}"/>
          <div class="row"><input type="text" name="message" id="reply-${cardId}" placeholder="Type reply..."/><button type="submit" class="btn-green">Send</button></div>
        </form>
        <button class="quick-toggle" onclick="toggleQuick('${cardId}')">💬 Quick replies</button>
        <div class="quick-panel" id="quick-${cardId}">${qBtns}</div>
        <div class="media-row">
          <form action="/admin/sendmedia" method="post" style="display:inline"><input type="hidden" name="pass" value="${pass}"/><input type="hidden" name="phone" value="${phone}"/><input type="hidden" name="media" value="intro_vn"/><button type="submit" class="btn-orange">🎙 Intro VN</button></form>
          <form action="/admin/sendmedia" method="post" style="display:inline"><input type="hidden" name="pass" value="${pass}"/><input type="hidden" name="phone" value="${phone}"/><input type="hidden" name="media" value="price_vn"/><button type="submit" class="btn-orange">🎙 Price VN</button></form>
          <form action="/admin/sendmedia" method="post" style="display:inline"><input type="hidden" name="pass" value="${pass}"/><input type="hidden" name="phone" value="${phone}"/><input type="hidden" name="media" value="objection"/><button type="submit" class="btn-orange">📸 Objection</button></form>
          <form action="/admin/sendmedia" method="post" style="display:inline"><input type="hidden" name="pass" value="${pass}"/><input type="hidden" name="phone" value="${phone}"/><input type="hidden" name="media" value="testimonial"/><button type="submit" class="btn-orange">🎥 Testimonial</button></form>
          <form action="/admin/sendmedia" method="post" style="display:inline"><input type="hidden" name="pass" value="${pass}"/><input type="hidden" name="phone" value="${phone}"/><input type="hidden" name="media" value="review_video"/><button type="submit" class="btn-orange">🎥 Review Vid</button></form>
          <form action="/admin/sendmedia" method="post" style="display:inline"><input type="hidden" name="pass" value="${pass}"/><input type="hidden" name="phone" value="${phone}"/><input type="hidden" name="media" value="collage"/><button type="submit" class="btn-orange">🖼 Collage</button></form>
          <form action="/admin/sendmedia" method="post" style="display:inline"><input type="hidden" name="pass" value="${pass}"/><input type="hidden" name="phone" value="${phone}"/><input type="hidden" name="media" value="review_pic1"/><button type="submit" class="btn-orange">📸 Review Pic 1</button></form>
          <form action="/admin/sendmedia" method="post" style="display:inline"><input type="hidden" name="pass" value="${pass}"/><input type="hidden" name="phone" value="${phone}"/><input type="hidden" name="media" value="review_pic2"/><button type="submit" class="btn-orange">📸 Review Pic 2</button></form>

        </div>
        <div class="divider"></div>
        <div class="name-edit">
          <form action="/admin/setname" method="post" style="display:flex;gap:8px;flex:1">
            <input type="hidden" name="pass" value="${pass}"/><input type="hidden" name="phone" value="${phone}"/>
            <input type="text" name="name" placeholder="Set name..." value="${name}"/>
            <button type="submit" class="btn-grey">Save</button>
          </form>
        </div>
        <form action="/admin/setstage" method="post">
          <input type="hidden" name="pass" value="${pass}"/><input type="hidden" name="phone" value="${phone}"/>
          <div class="row"><select name="stage">${opts}</select><button type="submit" class="btn-purple">Set Stage</button></div>
        </form>
      </div>
    </div>`;
  }

  // Active section
  if (activePhones.length) {
    html += `<div class="section-title">Active (${activePhones.length})</div>`;
    activePhones.forEach(phone => { html += renderCard(phone); });
  } else {
    html += '<p style="color:#9ca3af;text-align:center;padding:20px 0;font-size:14px">No active leads in this period.</p>';
  }

  // Cooled Off section (collapsible)
  const cooledUnread = cooledPhones.filter(p => hasUnread(p)).length;
  html += `<div class="cooled-header" onclick="toggleCooled()">
    <div class="section-title" style="margin:0">Cooled Off (${cooledPhones.length})${cooledUnread > 0 ? ` <span style="background:#87ceeb;color:#fff;border-radius:20px;padding:2px 8px;font-size:11px;margin-left:6px">${cooledUnread} new</span>` : ''}</div>
    <span id="cooled-arrow" style="color:#6b7280;font-size:12px">▼</span>
  </div>
  <div class="cooled-section" id="cooled-body" style="display:none">`;

  if (cooledPhones.length) {
    cooledPhones.forEach(phone => { html += renderCard(phone); });
  } else {
    html += '<p style="color:#9ca3af;text-align:center;padding:16px 0;font-size:14px">No cooled off leads yet.</p>';
  }

  html += '</div></body></html>';
  res.send(html);
});

app.get('/admin/markread', (req, res) => {
  const { pass, phone } = req.query;
  if (pass !== ADMIN_PASSWORD) return res.sendStatus(403);
  markRead(phone);
  res.sendStatus(200);
});

app.post('/admin/reply', async (req, res) => {
  const { pass, phone, message } = req.body;
  if (pass !== ADMIN_PASSWORD) return res.redirect('/admin');
  if (phone && message) { await sendText(phone, message); markRead(phone); }
  res.redirect(`/admin?pass=${pass}`);
});

app.post('/admin/setstage', (req, res) => {
  const { pass, phone, stage } = req.body;
  if (pass !== ADMIN_PASSWORD) return res.redirect('/admin');
  if (phone && stage) {
    if (!leads[phone]) leads[phone] = { bought: false };
    leads[phone].stage = stage;
    if (!conversations[phone]) conversations[phone] = [];
    conversations[phone].push({ from: 'bot', text: `[Stage set to: ${stage}]`, time: new Date().toISOString() });
    saveDataFull();
  }
  res.redirect(`/admin?pass=${pass}`);
});

app.post('/admin/setname', (req, res) => {
  const { pass, phone, name } = req.body;
  if (pass !== ADMIN_PASSWORD) return res.redirect('/admin');
  if (phone && name) {
    if (!leads[phone]) leads[phone] = { bought: false };
    leads[phone].name = name;
    saveDataFull();
  }
  res.redirect(`/admin?pass=${pass}`);
});

app.post('/admin/sendmedia', async (req, res) => {
  const { pass, phone, media } = req.body;
  if (pass !== ADMIN_PASSWORD) return res.redirect('/admin');
  if (phone && media) {
    if (media === 'intro_vn') await sendAudio(phone, VOICE_NOTE_URL);
    else if (media === 'price_vn') await sendAudio(phone, PRICE_VN_URL);
    else if (media === 'objection') await sendImage(phone, OBJECTION_URL);
    else if (media === 'testimonial') await sendVideo(phone, TESTIMONIAL_48HR_URL);
    else if (media === 'review_video') await sendVideo(phone, REVIEW_VIDEO_URL);
    else if (media === 'collage') await sendImage(phone, 'https://res.cloudinary.com/dpknwoywz/image/upload/v1780325806/copy_7250D24B-0EB4-4168-A773-6679AB8FC04B_y4mizn.jpg');
    else if (media === 'review_pic1') await sendImage(phone, REVIEW_PIC1_URL);
    else if (media === 'review_pic2') await sendImage(phone, REVIEW_PIC2_URL);
    else if (media === 'review_vid') await sendVideo(phone, REVIEW_VIDEO_URL);
    else if (media === 'review_pic1') await sendImage(phone, REVIEW_PIC1_URL);
    else if (media === 'review_pic2') await sendImage(phone, REVIEW_PIC2_URL);
    markRead(phone);
  }
  res.redirect(`/admin?pass=${pass}`);
});

app.get('/', (req, res) => res.send('Funnel running'));

app.get('/watch', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>The Dollar Skill</title>
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --gold: #C9A84C;
      --gold-light: #E8CC7A;
      --dark: #0A0A0A;
      --dark-2: #111111;
      --dark-3: #1A1A1A;
      --text: #F0EDE6;
      --text-muted: #888;
    }

    html, body {
      background: var(--dark);
      color: var(--text);
      font-family: 'DM Sans', sans-serif;
      min-height: 100vh;
      overflow-x: hidden;
    }

    /* Grain overlay */
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
      pointer-events: none;
      z-index: 0;
      opacity: 0.4;
    }

    .container {
      position: relative;
      z-index: 1;
      max-width: 780px;
      margin: 0 auto;
      padding: 40px 20px 60px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    /* Eagle badge */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(201,168,76,0.1);
      border: 1px solid rgba(201,168,76,0.3);
      border-radius: 100px;
      padding: 6px 16px;
      font-size: 12px;
      font-weight: 500;
      color: var(--gold);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 28px;
      animation: fadeUp 0.6s ease both;
    }

    .headline {
      font-family: 'Syne', sans-serif;
      font-size: clamp(26px, 6vw, 42px);
      font-weight: 800;
      line-height: 1.15;
      text-align: center;
      margin-bottom: 12px;
      animation: fadeUp 0.7s ease 0.1s both;
    }

    .headline span {
      background: linear-gradient(135deg, var(--gold) 0%, var(--gold-light) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .subline {
      font-size: 15px;
      color: var(--text-muted);
      text-align: center;
      margin-bottom: 36px;
      line-height: 1.6;
      max-width: 500px;
      animation: fadeUp 0.7s ease 0.2s both;
    }

    /* Video wrapper */
    .video-wrap {
      width: 100%;
      position: relative;
      border-radius: 16px;
      overflow: hidden;
      background: var(--dark-3);
      box-shadow: 0 0 0 1px rgba(201,168,76,0.15), 0 40px 80px rgba(0,0,0,0.6);
      animation: fadeUp 0.8s ease 0.3s both;
      margin-bottom: 36px;
    }

    .video-wrap::before {
      content: '';
      display: block;
      padding-top: 56.25%;
    }

    .video-wrap iframe {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      border: none;
    }

    /* Glow line under video */
    .video-wrap::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 10%;
      right: 10%;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--gold), transparent);
    }

    /* CTA */
    .cta-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      animation: fadeUp 0.8s ease 0.5s both;
      width: 100%;
      max-width: 420px;
    }

    .cta-btn {
      display: block;
      width: 100%;
      padding: 18px 32px;
      background: linear-gradient(135deg, #C9A84C 0%, #E8CC7A 50%, #C9A84C 100%);
      background-size: 200% 100%;
      color: #0A0A0A;
      font-family: 'Syne', sans-serif;
      font-size: 17px;
      font-weight: 700;
      text-align: center;
      text-decoration: none;
      border-radius: 12px;
      letter-spacing: 0.01em;
      transition: background-position 0.4s ease, transform 0.2s ease, box-shadow 0.2s ease;
      box-shadow: 0 8px 32px rgba(201,168,76,0.3);
      cursor: pointer;
      border: none;
    }

    .cta-btn:hover {
      background-position: 100% 0;
      transform: translateY(-2px);
      box-shadow: 0 12px 40px rgba(201,168,76,0.45);
    }

    .cta-btn:active {
      transform: translateY(0);
    }

    .cta-note {
      font-size: 12px;
      color: var(--text-muted);
      text-align: center;
    }

    /* Divider */
    .divider {
      width: 100%;
      max-width: 420px;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
      margin: 40px 0 32px;
    }

    /* Social proof */
    .proof {
      display: flex;
      flex-direction: column;
      gap: 14px;
      width: 100%;
      max-width: 520px;
      animation: fadeUp 0.8s ease 0.6s both;
    }

    .proof-item {
      background: var(--dark-2);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px;
      padding: 16px 18px;
      font-size: 14px;
      line-height: 1.6;
      color: #ccc;
      position: relative;
    }

    .proof-item::before {
      content: '"';
      font-family: 'Syne', sans-serif;
      font-size: 40px;
      color: var(--gold);
      opacity: 0.4;
      position: absolute;
      top: 8px;
      left: 14px;
      line-height: 1;
    }

    .proof-item p {
      padding-left: 24px;
    }

    .proof-name {
      margin-top: 8px;
      padding-left: 24px;
      font-size: 12px;
      color: var(--gold);
      font-weight: 500;
    }

    .proof-title {
      font-family: 'Syne', sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 16px;
      text-align: center;
    }

    .proof-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 2px solid rgba(201,168,76,0.3);
}
.proof-author {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  padding-left: 24px;
}
@keyframes fadeUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 480px) {
      .container { padding: 28px 16px 48px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">Your new era starts now 🦅</div>

    <h1 class="headline">
      The exact system Nigerians are using to<br/>
      <span>print dollars daily</span>
    </h1>

    <p class="subline">Watch the full breakdown below. The part that changes everything is in the first few minutes.</p>

    <div class="video-wrap">
      <video controls playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">
        <source src="https://res.cloudinary.com/dpknwoywz/video/upload/v1780326254/YTDown_YouTube_YOUTUBE-INCOME-GENERATOR-Make-Money-From_Media_aGwB50peA6g_002_720p_egaf6k.mp4" type="video/mp4"/>
      </video>
    </div>

    <div class="divider"></div>

    <div class="proof">
      <div class="proof-title">What people are saying</div>
      <div class="proof-item">
        <p>Never thought I could earn in dollars from Nigeria. This changed everything for me and my family.</p>
        <div class="proof-author">
          <img src="https://res.cloudinary.com/dpknwoywz/image/upload/w_200,h_200,c_fill,g_face/v1780321626/IMG_4131_w5aw6y.png" class="proof-avatar" alt="Funmi"/>
          <span class="proof-name" style="margin:0;padding:0">Funmi, 31</span>
        </div>
      </div>
      <div class="proof-item">
        <p>Omo I was skeptical at first but within 5 days of implementing what I learned I made my first dollar online. This is real.</p>
        <div class="proof-author">
          <img src="https://res.cloudinary.com/dpknwoywz/image/upload/w_200,h_200,c_fill,g_face/v1780321590/IMG_4130_dyxz2s.png" class="proof-avatar" alt="Daniel"/>
          <span class="proof-name" style="margin:0;padding:0">Daniel, 28</span>
        </div>
      </div>
      <div class="proof-item">
        <p>The system is simple and it actually works. I was doing it wrong before, I was frustrated with all other dollar income streams I had tried. But now I know exactly what to do every day.</p>
        <div class="proof-author">
          <img src="https://res.cloudinary.com/dpknwoywz/image/upload/w_200,h_200,c_fill,g_face/v1780321585/IMG_4128_gvxosk.png" class="proof-avatar" alt="Gumar"/>
          <span class="proof-name" style="margin:0;padding:0">Gumar, 24</span>
        </div>
      </div>
    </div>

  </div>
</body>
</html>`);
});

app.get('/webhook', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (mode && token === VERIFY_TOKEN) res.status(200).send(challenge);
  else res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const message = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return;
    const phone = message.from;
    const text = (message.text?.body || '[media]').toLowerCase().trim();
    if (!conversations[phone]) conversations[phone] = [];
    conversations[phone].push({ from: 'customer', text: message.text?.body || '[media]', time: new Date().toISOString() });
    saveDataFull();

    if (!leads[phone]) {
      leads[phone] = { stage: 'waiting_name', bought: false }; saveDataFull();
      await delay(15000);
      await sendText(phone, "Heyy, welcome to the inner circle🦅. You're here so it means you're serious. Let's get into it, what's your name?");
      return;
    }

    if (leads[phone].stage === 'waiting_name') {
      if (text === 'hi' || text === 'hello' || text === 'hey') return;
      // Auto-save name
      const name = message.text?.body || '';
      if (name && name.length < 30) leads[phone].name = name;
      leads[phone].stage = 'waiting_pain_point'; saveDataFull();
      await delay(20000);
      await sendAudio(phone, VOICE_NOTE_URL);
      await delay(15000);
      await sendText(phone, "Okay real talk, I was just going to send this to everyone who messaged but I actually care about helping every single person actually print dollars everyday, not just sending links. Have you tried making money online before or is this your first time exploring it?");
      return;
    }

    if (leads[phone].stage === 'waiting_pain_point') {
      leads[phone].stage = 'waiting_permission'; saveDataFull();
      await delay(20000);
      await sendText(phone, "Oh okay okay this is perfect for you. I have a breakdown video of everything you need to know. Dan in our inner circle made it easy to grasp and the first 5 minutes alone will show you why this is different from probably everything you have tried before. Would you like me to send it?");
      return;
    }

    if (leads[phone].stage === 'waiting_permission') {
      const positive = ["yes","yh","yeah","yep","ok","okay","sure","go on","definitely","absolutely","of course","why not","lets go","let's go","sounds good","send","please","gladly","for sure","do it","oya","yes please"];
      if (positive.some(w => text.includes(w))) {
        leads[phone].stage = 'waiting_done'; saveDataFull();
        await delay(20000);
        await sendText(phone, "Take your time with it. https://sweet-growth-production-9b60.up.railway.app/watch. You reached out because you know your current situation needs a change. This breakdown is the bridge to that new era 🦅 Reply Done when you are finished and I will help you get set up.");
        await delay(21600000);
        if (leads[phone] && leads[phone].stage === 'waiting_done') {
          await sendText(phone, "You went ghost on me 👀 everything good? Did the link work? 👀");
        }
      }
      return;
    }

    if (leads[phone].stage === 'waiting_done') {
      if (text.includes('done')) {
        leads[phone].stage = 'waiting_plug_reply'; saveDataFull();
        await delay(20000);
        await sendText(phone, "Okayy okay that's good, kudos to you 🦅. That video is the exact system of how we are hitting these numbers every single month. Does it look like something you would comfortably plug into your daily routine or would it be a struggle for you?");
      }
      return;
    }

    if (leads[phone].stage === 'waiting_plug_reply') {
      leads[phone].stage = 'pitch_sent'; saveDataFull();
      await delay(25000);
      await sendAudio(phone, PRICE_VN_URL);
      await delay(10000);
      await sendText(phone, "Since we've covered the mechanics, you can jump in here: " + AFFILIATE_URL + ". Once you're in, take a look at the latest reviews from the community. See you there!");
      await delay(10000);
      await sendImage(phone, "https://res.cloudinary.com/dpknwoywz/image/upload/v1780325806/copy_7250D24B-0EB4-4168-A773-6679AB8FC04B_y4mizn.jpg");
      await delay(10000);
      await sendText(phone, "Any questions before you get your big bag?");
      await delay(86400000);
      if (leads[phone] && !leads[phone].bought) {
        await sendText(phone, "Someone just asked me if this works if you have never made money online before. Thought you would want to see what I showed them.");
        await sendImage(phone, OBJECTION_URL);
      }
      await delay(86400000);
      if (leads[phone] && !leads[phone].bought) { await sendVideo(phone, TESTIMONIAL_48HR_URL); }
      if (leads[phone]) { leads[phone].stage = 'done_followup'; saveDataFull(); }
      return;
    }

    if (leads[phone].stage === 'done_followup') return;

  } catch (err) { console.error('Error:', err.message); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  await init();
  console.log('Server running on port ' + PORT);
});
