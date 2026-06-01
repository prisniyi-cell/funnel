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
