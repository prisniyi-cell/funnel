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
const DATA_FILE = '/tmp/leads.json';

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) { console.error('Load error:', e); }
  return { leads: {}, conversations: {} };
}

function saveData() {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify({ leads, conversations })); }
  catch (e) { console.error('Save error:', e); }
}

const data = loadData();
const leads = data.leads;
const conversations = data.conversations;

const VOICE_NOTE_URL = 'https://res.cloudinary.com/dpknwoywz/video/upload/v1780175029/voicenote.m4a_myqyex.m4a';
const PRICE_VN_URL = 'https://res.cloudinary.com/dpknwoywz/video/upload/v1780247025/Vaurie_second_vn_kz13gy.m4a';
const OBJECTION_URL = 'https://res.cloudinary.com/dpknwoywz/image/upload/v1780176996/photo_2026-05-30_15-09-09_lnzooq.jpg';
const TESTIMONIAL_48HR_URL = 'https://res.cloudinary.com/dpknwoywz/video/upload/v1780176890/copy_AE270DFE-4121-4D3C-A869-DB0D674F4DDE_dsly51.mov';
const YOUTUBE_URL = 'https://youtu.be/aGwB50peA6g?si=v9ejB0Mbd_NdzdGD';
const AFFILIATE_URL = 'https://app.expertnaire.com/product/8646634117/8478632445';

// Stage config: label + color for admin panel
const STAGE_CONFIG = {
  'waiting_name':       { label: 'Just arrived',        color: '#3b82f6', text: '#fff' },
  'waiting_pain_point': { label: 'Got VN',              color: '#f59e0b', text: '#fff' },
  'waiting_permission': { label: 'Got pain point Q',    color: '#f97316', text: '#fff' },
  'waiting_done':       { label: '🔴 VSL sent — quiet', color: '#ef4444', text: '#fff' },
  'waiting_plug_reply': { label: '🟢 Said Done — HOT',  color: '#22c55e', text: '#fff' },
  'pitch_sent':         { label: '🔴 Pitch sent',        color: '#dc2626', text: '#fff' },
  'done_followup':      { label: 'Cooled Off',           color: '#6b7280', text: '#fff' },
};

function getStageDisplay(stage) {
  return STAGE_CONFIG[stage] || { label: stage || 'Unknown', color: '#d1d5db', text: '#111' };
}

function sendRequest(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const options = {
      hostname: 'graph.facebook.com', path, method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, (res) => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => { console.log('API:', d); resolve(d); });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

function sendText(to, message) {
  if (!conversations[to]) conversations[to] = [];
  conversations[to].push({ from: 'bot', text: message, time: new Date().toISOString() });
  saveData();
  return sendRequest(`/v19.0/${PHONE_NUMBER_ID}/messages`, {
    messaging_product: 'whatsapp', to, type: 'text', text: { body: message }
  });
}

function sendAudio(to, url) {
  if (!conversations[to]) conversations[to] = [];
  conversations[to].push({ from: 'bot', text: '[Voice Note]', time: new Date().toISOString() });
  saveData();
  return sendRequest(`/v19.0/${PHONE_NUMBER_ID}/messages`, {
    messaging_product: 'whatsapp', to, type: 'audio', audio: { link: url }
  });
}

function sendImage(to, url) {
  if (!conversations[to]) conversations[to] = [];
  conversations[to].push({ from: 'bot', text: '[Image]', time: new Date().toISOString() });
  saveData();
  return sendRequest(`/v19.0/${PHONE_NUMBER_ID}/messages`, {
    messaging_product: 'whatsapp', to, type: 'image', image: { link: url }
  });
}

function sendVideo(to, url) {
  if (!conversations[to]) conversations[to] = [];
  conversations[to].push({ from: 'bot', text: '[Video]', time: new Date().toISOString() });
  saveData();
  return sendRequest(`/v19.0/${PHONE_NUMBER_ID}/messages`, {
    messaging_product: 'whatsapp', to, type: 'video', video: { link: url }
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── ADMIN PANEL ───────────────────────────────────────────────────────────────

app.get('/admin', (req, res) => {
  const pass = req.query.pass;
  if (pass !== ADMIN_PASSWORD) {
    return res.send(`<html><body style="font-family:sans-serif;padding:20px;background:#f3f4f6">
      <div style="max-width:400px;margin:80px auto;background:#fff;padding:32px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
        <h2 style="margin:0 0 20px;font-size:20px">💰 Dollar Skill Admin</h2>
        <form action="/admin" method="get">
          <input type="password" name="pass" placeholder="Password" style="width:100%;padding:10px;font-size:16px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;margin-bottom:12px"/>
          <button type="submit" style="width:100%;padding:10px;background:#25d366;color:white;border:none;border-radius:6px;font-size:16px;cursor:pointer">Login</button>
        </form>
      </div>
    </body></html>`);
  }

  const phones = Object.keys(conversations);

  // Sort: pitch_sent and waiting_done first, then waiting_plug_reply, then rest
  const priority = ['pitch_sent', 'waiting_done', 'waiting_plug_reply'];
  phones.sort((a, b) => {
    const sa = leads[a]?.stage || '';
    const sb = leads[b]?.stage || '';
    const pa = priority.indexOf(sa) === -1 ? 99 : priority.indexOf(sa);
    const pb = priority.indexOf(sb) === -1 ? 99 : priority.indexOf(sb);
    return pa - pb;
  });

  let html = `<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f3f4f6;margin:0;padding:16px}
    .header{background:#25d366;color:white;padding:16px 20px;border-radius:12px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center}
    .header h2{margin:0;font-size:18px}
    .header span{font-size:13px;opacity:0.9}
    .card{background:#fff;border-radius:12px;padding:16px;margin-bottom:14px;box-shadow:0 1px 4px rgba(0,0,0,0.08)}
    .stage-badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;margin-bottom:10px}
    .phone{font-size:15px;font-weight:700;margin-bottom:4px;color:#111}
    .msgs{background:#f9f9f9;padding:10px;border-radius:8px;max-height:180px;overflow-y:auto;margin-bottom:10px;font-size:13px}
    .msg-bot{text-align:right;margin-bottom:6px}
    .msg-customer{text-align:left;margin-bottom:6px}
    .bubble{display:inline-block;padding:6px 10px;border-radius:10px;max-width:80%;word-break:break-word}
    .bubble-bot{background:#dcf8c6;border:1px solid #c3e6ad}
    .bubble-customer{background:#fff;border:1px solid #ddd}
    .time{font-size:9px;color:#999;margin-top:2px}
    .reply-row{display:flex;gap:8px}
    .reply-input{flex:1;padding:8px;font-size:14px;border:1px solid #ddd;border-radius:8px}
    .reply-btn{padding:8px 16px;background:#25d366;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer;white-space:nowrap}
    .stats{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}
    .stat{background:#fff;border-radius:10px;padding:12px 16px;flex:1;min-width:80px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,0.08)}
    .stat-num{font-size:22px;font-weight:700;color:#111}
    .stat-label{font-size:11px;color:#6b7280;margin-top:2px}
  </style></head>
  <body>
  <div class="header">
    <h2>💰 Dollar Skill</h2>
    <span>${phones.length} conversations</span>
  </div>`;

  // Stats bar
  const stageCounts = {};
  phones.forEach(p => {
    const s = leads[p]?.stage || 'done_followup';
    stageCounts[s] = (stageCounts[s] || 0) + 1;
  });

  html += `<div class="stats">
    <div class="stat"><div class="stat-num" style="color:#dc2626">${(stageCounts['pitch_sent'] || 0) + (stageCounts['waiting_done'] || 0)}</div><div class="stat-label">🔴 Need attention</div></div>
    <div class="stat"><div class="stat-num" style="color:#22c55e">${stageCounts['waiting_plug_reply'] || 0}</div><div class="stat-label">🟢 HOT leads</div></div>
    <div class="stat"><div class="stat-num">${phones.length}</div><div class="stat-label">Total</div></div>
  </div>`;

  if (!phones.length) html += '<p style="color:grey;text-align:center;padding:40px 0">No conversations yet.</p>';

  phones.forEach(phone => {
    const msgs = conversations[phone] || [];
    const stage = leads[phone]?.stage || 'done_followup';
    const stageInfo = getStageDisplay(stage);

    html += `<div class="card">
      <div class="phone">+${phone}</div>
      <span class="stage-badge" style="background:${stageInfo.color};color:${stageInfo.text}">${stageInfo.label}</span>
      <div class="msgs">
        ${msgs.map(m => `
          <div class="msg-${m.from}">
            <span class="bubble bubble-${m.from}">${m.text}</span>
            <div class="time">${new Date(m.time).toLocaleTimeString()}</div>
          </div>`).join('')}
      </div>
      <form action="/admin/reply" method="post">
        <input type="hidden" name="pass" value="${pass}"/>
        <input type="hidden" name="phone" value="${phone}"/>
        <div class="reply-row">
          <input type="text" name="message" placeholder="Type reply..." class="reply-input"/>
          <button type="submit" class="reply-btn">Send</button>
        </div>
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

    // ── NEW LEAD ──
    if (!leads[phone]) {
      leads[phone] = { stage: 'waiting_name', bought: false };
      saveData();
      await delay(15000);
      await sendText(phone, "Heyy, welcome to the inner circle🦅. You're here so it means you're serious. Let's get into it, what's your name?");
      return;
    }

    // ── WAITING NAME ──
    if (leads[phone].stage === 'waiting_name') {
      leads[phone].stage = 'waiting_pain_point';
      saveData();
      await delay(20000);
      await sendAudio(phone, VOICE_NOTE_URL);
      await delay(15000);
      await sendText(phone, "Okay real talk, I was just going to send this to everyone who messaged but I actually care about helping every single person actually print dollars everyday, not just sending. Have you tried making money online before or is this your first time exploring it?");
      return;
    }

    // ── WAITING PAIN POINT ──
    if (leads[phone].stage === 'waiting_pain_point') {
      leads[phone].stage = 'waiting_permission';
      saveData();
      await delay(20000);
      await sendText(phone, "Okay this update is for exactly where you are. I have a full 45-minute breakdown and there's a specific part in it that shows why this is different from probably everything you've tried before. Would you like me to send it?");
      return;
    }

    // ── WAITING PERMISSION ──
    if (leads[phone].stage === 'waiting_permission') {
      const positive = ["yes","yh","yeah","yep","ok","okay","sure","go on","definitely","absolutely","of course","why not","lets go","let's go","sounds good","send","please","gladly","for sure","do it","oya","yes please"];
      if (positive.some(w => text.includes(w))) {
        leads[phone].stage = 'waiting_done';
        saveData();
        await delay(20000);
        await sendText(phone, "Take your time with it. " + YOUTUBE_URL + ". You reached out because you know your current situation needs a change. This breakdown is the bridge to that new era 🦅 Reply 'Done' when you're finished and I'll help you get set up.");

        // ── 6HR NUDGE for VSL ghosters ──
        await delay(21600000); // 6 hours
        if (leads[phone] && leads[phone].stage === 'waiting_done') {
          await sendText(phone, "You disappeared on me 😭 everything good?");
        }
      }
      return;
    }

    // ── WAITING DONE ──
    if (leads[phone].stage === 'waiting_done') {
      if (text.includes('done')) {
        leads[phone].stage = 'waiting_plug_reply';
        saveData();
        await delay(20000);
        await sendText(phone, "Kudos to you 🦅. That video is the exact system of how we're hitting these numbers every single month. Does it look like something you would comfortably plug into your daily routine or would it be a struggle for you?");
      }
      return;
    }

    // ── WAITING PLUG REPLY ──
    if (leads[phone].stage === 'waiting_plug_reply') {
      leads[phone].stage = 'pitch_sent';
      saveData();
      await delay(25000);
      await sendAudio(phone, PRICE_VN_URL);
      await delay(10000);
      await sendText(phone, "Since we've covered the mechanics, you can jump in here: " + AFFILIATE_URL + ". Once you're in, take a look at the latest reviews from the community. See you there!");
      await delay(10000);
      await sendText(phone, "Any questions before you get your big bag?");

      // ── 24HR FOLLOW-UP ──
      await delay(86400000);
      if (leads[phone] && !leads[phone].bought) {
        await sendText(phone, "Someone just asked me if this works if you've never made money online before. Thought you'd want to see what I showed them my boss.");
        await sendImage(phone, OBJECTION_URL);
      }

      // ── 48HR FOLLOW-UP ──
      await delay(86400000);
      if (leads[phone] && !leads[phone].bought) {
        await sendVideo(phone, TESTIMONIAL_48HR_URL);
      }

      // ── MARK COOLED OFF ──
      if (leads[phone]) {
        leads[phone].stage = 'done_followup';
        saveData();
      }
      return;
    }

  } catch (err) { console.error('Error:', err.message); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
