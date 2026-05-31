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

// ─── STORAGE ───────────────────────────────────────────────────────────────────

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
      hostname: 'api.jsonbin.io',
      path: `/v3/b/${JSONBIN_BIN_ID}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_API_KEY, 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(options, res => {
      let d = '';
      res.on('data', chunk => d += chunk);
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
      hostname: 'api.jsonbin.io',
      path: `/v3/b/${JSONBIN_BIN_ID}/latest`,
      method: 'GET',
      headers: { 'X-Master-Key': JSONBIN_API_KEY }
    };
    const req = https.request(options, res => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(d);
          console.log('Cloud load response:', d.substring(0, 80));
          resolve(parsed.record || null);
        } catch (e) { console.error('Cloud parse error:', e); resolve(null); }
      });
    });
    req.on('error', e => { console.error('Cloud load error:', e.message); resolve(null); });
    req.end();
  });
}

function saveData() { saveLocal(); saveCloud(); }

// Seed known leads so they don't get welcome message again
const SEED_LEADS = {
  '2348084700797': { stage: 'done_followup', bought: false, seeded: true },
  '2349015724123': { stage: 'done_followup', bought: false, seeded: true },
  '2349018047060': { stage: 'done_followup', bought: false, seeded: true },
  '2348059980894': { stage: 'done_followup', bought: false, seeded: true },
};

let leads = {};
let conversations = {};

async function init() {
  const local = loadLocal();
  if (local) {
    Object.assign(leads, local.leads);
    Object.assign(conversations, local.conversations);
    console.log('Loaded from local:', Object.keys(leads).length, 'leads');
  } else {
    console.log('Local empty, trying cloud...');
    const cloud = await loadCloud();
    if (cloud && Object.keys(cloud.leads || {}).length > 0) {
      Object.assign(leads, cloud.leads);
      Object.assign(conversations, cloud.conversations);
      console.log('Restored from cloud:', Object.keys(leads).length, 'leads');
      saveLocal();
    } else {
      console.log('No saved data, starting fresh with seed leads');
    }
  }
  // Always apply seed leads if not already present
  for (const [phone, data] of Object.entries(SEED_LEADS)) {
    if (!leads[phone]) {
      leads[phone] = data;
      if (!conversations[phone]) conversations[phone] = [{ from: 'bot', text: '[Old lead — restored]', time: new Date().toISOString() }];
    }
  }
  saveData();
  console.log('Init complete:', Object.keys(leads).length, 'leads total');
}

// ─── MEDIA URLs ────────────────────────────────────────────────────────────────

const VOICE_NOTE_URL = 'https://res.cloudinary.com/dpknwoywz/video/upload/v1780175029/voicenote.m4a_myqyex.m4a';
const PRICE_VN_URL = 'https://res.cloudinary.com/dpknwoywz/video/upload/v1780247025/Vaurie_second_vn_kz13gy.m4a';
const OBJECTION_URL = 'https://res.cloudinary.com/dpknwoywz/image/upload/v1780176996/photo_2026-05-30_15-09-09_lnzooq.jpg';
const TESTIMONIAL_48HR_URL = 'https://res.cloudinary.com/dpknwoywz/video/upload/v1780176890/copy_AE270DFE-4121-4D3C-A869-DB0D674F4DDE_dsly51.mov';
const YOUTUBE_URL = 'https://youtu.be/aGwB50peA6g?si=v9ejB0Mbd_NdzdGD';
const AFFILIATE_URL = 'https://app.expertnaire.com/product/8646634117/8478632445';

// ─── STAGE CONFIG ──────────────────────────────────────────────────────────────

const STAGE_CONFIG = {
  'waiting_name':       { label: 'Just arrived',        color: '#3b82f6', text: '#fff' },
  'waiting_pain_point': { label: 'Got VN',              color: '#f59e0b', text: '#fff' },
  'waiting_permission': { label: 'Got pain point Q',    color: '#f97316', text: '#fff' },
  'waiting_done':       { label: '🔴 VSL sent — quiet', color: '#ef4444', text: '#fff' },
  'waiting_plug_reply': { label: '🟢 Said Done — HOT',  color: '#22c55e', text: '#fff' },
  'pitch_sent':         { label: '🔴 Pitch sent',        color: '#dc2626', text: '#fff' },
  'done_followup':      { label: 'Cooled Off',           color: '#6b7280', text: '#fff' },
};

const ALL_STAGES = ['waiting_name','waiting_pain_point','waiting_permission','waiting_done','waiting_plug_reply','pitch_sent','done_followup'];

function getStageDisplay(stage) {
  return STAGE_CONFIG[stage] || { label: stage || 'Unknown', color: '#d1d5db', text: '#111' };
}

// ─── WHATSAPP HELPERS ──────────────────────────────────────────────────────────

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
  saveData();
  return sendRequest(`/v19.0/${PHONE_NUMBER_ID}/messages`, { messaging_product: 'whatsapp', to, type: 'text', text: { body: message } });
}

function sendAudio(to, url) {
  if (!conversations[to]) conversations[to] = [];
  conversations[to].push({ from: 'bot', text: '[Voice Note]', time: new Date().toISOString() });
  saveData();
  return sendRequest(`/v19.0/${PHONE_NUMBER_ID}/messages`, { messaging_product: 'whatsapp', to, type: 'audio', audio: { link: url } });
}

function sendImage(to, url) {
  if (!conversations[to]) conversations[to] = [];
  conversations[to].push({ from: 'bot', text: '[Image]', time: new Date().toISOString() });
  saveData();
  return sendRequest(`/v19.0/${PHONE_NUMBER_ID}/messages`, { messaging_product: 'whatsapp', to, type: 'image', image: { link: url } });
}

function sendVideo(to, url) {
  if (!conversations[to]) conversations[to] = [];
  conversations[to].push({ from: 'bot', text: '[Video]', time: new Date().toISOString() });
  saveData();
  return sendRequest(`/v19.0/${PHONE_NUMBER_ID}/messages`, { messaging_product: 'whatsapp', to, type: 'video', video: { link: url } });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── ADMIN PANEL ───────────────────────────────────────────────────────────────

app.get('/admin', (req, res) => {
  const pass = req.query.pass;
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

  const phones = Object.keys(conversations);
  const priority = ['pitch_sent','waiting_done','waiting_plug_reply'];
  phones.sort((a, b) => {
    const pa = priority.indexOf(leads[a]?.stage||''); const pb = priority.indexOf(leads[b]?.stage||'');
    return (pa===-1?99:pa) - (pb===-1?99:pb);
  });

  const stageCounts = {};
  phones.forEach(p => { const s = leads[p]?.stage||'done_followup'; stageCounts[s]=(stageCounts[s]||0)+1; });

  let html = `<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f3f4f6;margin:0;padding:16px}
    .header{background:#25d366;color:white;padding:16px 20px;border-radius:12px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center}
    .header h2{margin:0;font-size:18px}
    .card{background:#fff;border-radius:12px;padding:16px;margin-bottom:14px;box-shadow:0 1px 4px rgba(0,0,0,0.08)}
    .stage-badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;margin-bottom:10px}
    .phone{font-size:15px;font-weight:700;margin-bottom:4px}
    .msgs{background:#f9f9f9;padding:10px;border-radius:8px;max-height:200px;overflow-y:auto;margin-bottom:10px;font-size:13px;display:flex;flex-direction:column-reverse}
    .msg-bot{text-align:right;margin-bottom:6px} .msg-customer{text-align:left;margin-bottom:6px}
    .bubble{display:inline-block;padding:6px 10px;border-radius:10px;max-width:80%;word-break:break-word}
    .bubble-bot{background:#dcf8c6;border:1px solid #c3e6ad} .bubble-customer{background:#fff;border:1px solid #ddd}
    .time{font-size:9px;color:#999;margin-top:2px}
    .row{display:flex;gap:8px;margin-bottom:8px}
    input[type=text],select{flex:1;padding:8px;font-size:14px;border:1px solid #ddd;border-radius:8px}
    .btn-green{padding:8px 16px;background:#25d366;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer}
    .btn-purple{padding:8px 14px;background:#6366f1;color:white;border:none;border-radius:8px;font-size:13px;cursor:pointer}
    .btn-media{padding:6px 10px;background:#f59e0b;color:white;border:none;border-radius:8px;font-size:12px;cursor:pointer}
    .stats{display:flex;gap:8px;margin-bottom:16px}
    .stat{background:#fff;border-radius:10px;padding:12px;flex:1;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,0.08)}
    .stat-num{font-size:22px;font-weight:700} .stat-label{font-size:11px;color:#6b7280}
    hr{border:none;border-top:1px solid #eee;margin:10px 0}
    .media-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
  </style></head><body>
  <div class="header"><h2>💰 Dollar Skill</h2><span>${phones.length} convos</span></div>
  <div class="stats">
    <div class="stat"><div class="stat-num" style="color:#dc2626">${(stageCounts['pitch_sent']||0)+(stageCounts['waiting_done']||0)}</div><div class="stat-label">🔴 Urgent</div></div>
    <div class="stat"><div class="stat-num" style="color:#22c55e">${stageCounts['waiting_plug_reply']||0}</div><div class="stat-label">🟢 HOT</div></div>
    <div class="stat"><div class="stat-num">${phones.length}</div><div class="stat-label">Total</div></div>
  </div>`;

  if (!phones.length) html += '<p style="color:grey;text-align:center;padding:40px 0">No conversations yet.</p>';

  phones.forEach(phone => {
    const msgs = [...(conversations[phone] || [])].reverse();
    const stage = leads[phone]?.stage || 'done_followup';
    const si = getStageDisplay(stage);
    const opts = ALL_STAGES.map(s => `<option value="${s}" ${s===stage?'selected':''}>${STAGE_CONFIG[s]?.label||s}</option>`).join('');

    html += `<div class="card">
      <div class="phone">+${phone}</div>
      <span class="stage-badge" style="background:${si.color};color:${si.text}">${si.label}</span>
      <div class="msgs">${msgs.map(m=>`<div class="msg-${m.from}"><span class="bubble bubble-${m.from}">${m.text}</span><div class="time">${new Date(m.time).toLocaleTimeString()}</div></div>`).join('')}</div>
      <form action="/admin/reply" method="post">
        <input type="hidden" name="pass" value="${pass}"/><input type="hidden" name="phone" value="${phone}"/>
        <div class="row"><input type="text" name="message" placeholder="Type reply..."/><button type="submit" class="btn-green">Send</button></div>
      </form>
      <div class="media-row">
        <form action="/admin/sendmedia" method="post" style="display:inline">
          <input type="hidden" name="pass" value="${pass}"/><input type="hidden" name="phone" value="${phone}"/><input type="hidden" name="media" value="intro_vn"/>
          <button type="submit" class="btn-media">🎙 Intro VN</button>
        </form>
        <form action="/admin/sendmedia" method="post" style="display:inline">
          <input type="hidden" name="pass" value="${pass}"/><input type="hidden" name="phone" value="${phone}"/><input type="hidden" name="media" value="price_vn"/>
          <button type="submit" class="btn-media">🎙 Price VN</button>
        </form>
        <form action="/admin/sendmedia" method="post" style="display:inline">
          <input type="hidden" name="pass" value="${pass}"/><input type="hidden" name="phone" value="${phone}"/><input type="hidden" name="media" value="objection"/>
          <button type="submit" class="btn-media">📸 Objection</button>
        </form>
        <form action="/admin/sendmedia" method="post" style="display:inline">
          <input type="hidden" name="pass" value="${pass}"/><input type="hidden" name="phone" value="${phone}"/><input type="hidden" name="media" value="testimonial"/>
          <button type="submit" class="btn-media">🎥 Testimonial</button>
        </form>
      </div>
      <hr/>
      <form action="/admin/setstage" method="post">
        <input type="hidden" name="pass" value="${pass}"/><input type="hidden" name="phone" value="${phone}"/>
        <div class="row"><select name="stage">${opts}</select><button type="submit" class="btn-purple">Set Stage</button></div>
      </form>
    </div>`;
  });

  html += '</body></html>';
  res.send(html);
});

app.post('/admin/reply', async (req, res) => {
  const { pass, phone, message } = req.body;
  if (pass !== ADMIN_PASSWORD) return res.redirect('/admin');
  if (phone && message) await sendText(phone, message);
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
    saveData();
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
  }
  res.redirect(`/admin?pass=${pass}`);
});

// ─── ROUTES ────────────────────────────────────────────────────────────────────

app.get('/', (req, res) => res.send('Funnel running'));

app.get('/webhook', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (mode && token === VERIFY_TOKEN) res.status(200).send(challenge);
  else res.sendStatus(403);
});

// ─── MAIN FUNNEL ───────────────────────────────────────────────────────────────

app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const message = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return;
    const phone = message.from;
    const text = (message.text?.body || '[media]').toLowerCase().trim();
    if (!conversations[phone]) conversations[phone] = [];
    conversations[phone].push({ from: 'customer', text: message.text?.body || '[media]', time: new Date().toISOString() });
    saveData();

    // NEW LEAD
    if (!leads[phone]) {
      leads[phone] = { stage: 'waiting_name', bought: false }; saveData();
      await delay(15000);
      await sendText(phone, "Heyy, welcome to the inner circle🦅. You're here so it means you're serious. Let's get into it, what's your name?");
      return;
    }

    // WAITING NAME — only fire once, ignore repeated messages
    if (leads[phone].stage === 'waiting_name') {
      // Check if this looks like a name (not a repeat trigger)
      if (text === 'hi' || text === 'hello' || text === 'hey') return; // ignore greetings, wait for actual name
      leads[phone].stage = 'waiting_pain_point'; saveData();
      await delay(20000);
      await sendAudio(phone, VOICE_NOTE_URL);
      await delay(15000);
      await sendText(phone, "Okay real talk, I was just going to send this to everyone who messaged but I actually care about helping every single person actually print dollars everyday, not just sending links. Have you tried making money online before or is this your first time exploring it?");
      return;
    }

    if (leads[phone].stage === 'waiting_pain_point') {
      leads[phone].stage = 'waiting_permission'; saveData();
      await delay(20000);
      await sendText(phone, "Okay this update is for exactly where you are. I have a full 45-minute breakdown — there's a specific part in it that shows why this is different from probably everything you've tried before. Would you like me to send it?");
      return;
    }

    if (leads[phone].stage === 'waiting_permission') {
      const positive = ["yes","yh","yeah","yep","ok","okay","sure","go on","definitely","absolutely","of course","why not","lets go","let's go","sounds good","send","please","gladly","for sure","do it","oya","yes please"];
      if (positive.some(w => text.includes(w))) {
        leads[phone].stage = 'waiting_done'; saveData();
        await delay(20000);
        await sendText(phone, "Take your time with it. " + YOUTUBE_URL + ". You reached out because you know your current situation needs a change. This breakdown is the bridge to that new era 🦅 Reply 'Done' when you're finished and I'll help you get set up.");
        await delay(21600000); // 6 hours
        if (leads[phone] && leads[phone].stage === 'waiting_done') {
          await sendText(phone, "You went ghost on me 👀 everything good? Did the link work? 👀");
        }
      }
      return;
    }

    if (leads[phone].stage === 'waiting_done') {
      if (text.includes('done')) {
        leads[phone].stage = 'waiting_plug_reply'; saveData();
        await delay(20000);
        await sendText(phone, "Kudos to you 🦅. That video is the exact system of how we're hitting these numbers every single month. Does it look like something you would comfortably plug into your daily routine or would it be a struggle for you?");
      }
      return;
    }

    if (leads[phone].stage === 'waiting_plug_reply') {
      leads[phone].stage = 'pitch_sent'; saveData();
      await delay(25000);
      await sendAudio(phone, PRICE_VN_URL);
      await delay(10000);
      await sendText(phone, "Since we've covered the mechanics, you can jump in here: " + AFFILIATE_URL + ". Once you're in, take a look at the latest reviews from the community. See you there!");
      await delay(10000);
      await sendText(phone, "Any questions before you get your big bag?");
      await delay(86400000);
      if (leads[phone] && !leads[phone].bought) {
        await sendText(phone, "Someone just asked me if this works if you've never made money online before. Thought you'd want to see what I showed them my boss.");
        await sendImage(phone, OBJECTION_URL);
      }
      await delay(86400000);
      if (leads[phone] && !leads[phone].bought) { await sendVideo(phone, TESTIMONIAL_48HR_URL); }
      if (leads[phone]) { leads[phone].stage = 'done_followup'; saveData(); }
      return;
    }

    // done_followup — bot stays silent, manual replies only
    if (leads[phone].stage === 'done_followup') return;

  } catch (err) { console.error('Error:', err.message); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  await init();
  console.log('Server running on port ' + PORT);
});
