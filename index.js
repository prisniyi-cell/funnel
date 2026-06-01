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
  { label: 'MSG 4: send breakdown?', text: 'I have a breakdown video of everything you need to know. Dan in our inner circle made it easy to grasp and the first 5 minutes alone will show you why this is different from probably everything you have tried before. Would you like me to send it?' },
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

  let html = `<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
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
          <form action="/admin/sendmedia" method="post" style="display:inline"><input type="hidden" name="pass" value="${pass}"/><input type="hidden" name="phone" value="${phone}"/><input type="hidden" name="media" value="review_vid"/><button type="submit" class="btn-orange">🎥 Review Vid</button></form>
          <form action="/admin/sendmedia" method="post" style="display:inline"><input type="hidden" name="pass" value="${pass}"/><input type="hidden" name="phone" value="${phone}"/><input type="hidden" name="media" value="review_pic1"/><button type="submit" class="btn-orange">📸 Review 1</button></form>
          <form action="/admin/sendmedia" method="post" style="display:inline"><input type="hidden" name="pass" value="${pass}"/><input type="hidden" name="phone" value="${phone}"/><input type="hidden" name="media" value="review_pic2"/><button type="submit" class="btn-orange">📸 Review 2</button></form>
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
      await sendText(phone, "I have a breakdown video of everything you need to know. Dan in our inner circle made it easy to grasp and the first 5 minutes alone will show you why this is different from probably everything you've tried before. Would you like me to send it?");
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
