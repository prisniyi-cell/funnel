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
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ leads, conversations }));
  } catch (e) { console.error('Save error:', e); }
}

const data = loadData();
const leads = data.leads;
const conversations = data.conversations;

const VOICE_NOTE_URL = 'https://res.cloudinary.com/dpknwoywz/video/upload/v1780175029/voicenote.m4a_myqyex.m4a';
const PHOTO1_URL = 'https://res.cloudinary.com/dpknwoywz/image/upload/v1780173251/photo_2026-05-30_15-07-57_yznnlq.jpg';
const PHOTO2_URL = 'https://res.cloudinary.com/dpknwoywz/image/upload/v1780173238/photo_2026-05-30_15-10-04_m6fkek.jpg';
const PHOTO3_URL = 'https://res.cloudinary.com/dpknwoywz/image/upload/v1780173200/photo_2026-05-30_15-11-57_lxnwd6.jpg';
const VIDEO_URL = 'https://res.cloudinary.com/dpknwoywz/video/upload/v1780173788/video_2026-05-30_15-12-27_t9aoqf.mp4';
const OBJECTION_URL = 'https://res.cloudinary.com/dpknwoywz/image/upload/v1780176996/photo_2026-05-30_15-09-09_lnzooq.jpg';
const TESTIMONIAL_48HR_URL = 'https://res.cloudinary.com/dpknwoywz/video/upload/v1780176890/copy_AE270DFE-4121-4D3C-A869-DB0D674F4DDE_dsly51.mov';
const YOUTUBE_URL = 'https://youtu.be/fESbDk6ngWk';

function sendRequest(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const options = {
      hostname: 'graph.facebook.com',
      path: path,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, (res) => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => { console.log('API response:', d); resolve(d); });
    });
    req.on('error', (e) => { console.error('Request error:', e); reject(e); });
    req.write(body);
    req.end();
  });
}

function sendText(to, message) {
  console.log('Sending text to:', to);
  if (!conversations[to]) conversations[to] = [];
  conversations[to].push({ from: 'bot', text: message, time: new Date().toISOString() });
  saveData();
  return sendRequest(`/v19.0/${PHONE_NUMBER_ID}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: message }
  });
}

function sendImage(to, url) {
  if (!conversations[to]) conversations[to] = [];
  conversations[to].push({ from: 'bot', text: '[Image]', time: new Date().toISOString() });
  saveData();
  return sendRequest(`/v19.0/${PHONE_NUMBER_ID}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'image',
    image: { link: url }
  });
}

function sendAudio(to, url) {
  if (!conversations[to]) conversations[to] = [];
  conversations[to].push({ from: 'bot', text: '[Voice Note]', time: new Date().toISOString() });
  saveData();
  return sendRequest(`/v19.0/${PHONE_NUMBER_ID}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'audio',
    audio: { link: url }
  });
}

function sendVideo(to, url) {
  if (!conversations[to]) conversations[to] = [];
  conversations[to].push({ from: 'bot', text: '[Video]', time: new Date().toISOString() });
  saveData();
  return sendRequest(`/v19.0/${PHONE_NUMBER_ID}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'video',
    video: { link: url }
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendPitch(phone) {
  await sendText(phone, "You're already ahead of 90% of people trying to make money online. You have everything you need to start seeing results within days.\n\nAND I know what you're thinking, 'this won't work for me', 'I've tried a lot, wasting my time again would suck'. That's exactly what I thought too. Until I actually started. Now I'm just coming back from a trip like I told you 🙂‍↔️\n\nFor N50,000, you get the kind of income that lets you travel, pay rent without thinking twice, take care of your family without stress. Results within days to weeks if you implement. An active community to ginger you to get your bag. And a 30-day money back guarantee. I will personally apologise publicly for wasting your time if you implement everything and still don't change your income drastically 🙂‍↔️\n\nYou're the only one that can stop yourself.\n\nLike I said we don't want this to cast and 73 people already got inside. Price moves to N150,000 at 100.\nhttps://app.expertnaire.com/product/8646634117/8478632445");
  await delay(10000);
  await sendText(phone, "Any questions before you get your big bag?");
  if (leads[phone]) {
    leads[phone].sequenceDone = true;
    saveData();
  }
}

async function runSequence(phone) {
  await delay(20000);
  await sendText(phone, "Save my name as Vaurie 🦅 I usually reveal untapped hot updates every week.");
  await delay(10000);
  await sendAudio(phone, VOICE_NOTE_URL);

  await delay(20000);
  await sendImage(phone, PHOTO1_URL);
  await delay(20000);
  await sendImage(phone, PHOTO2_URL);
  await delay(20000);
  await sendImage(phone, PHOTO3_URL);
  await delay(20000);
  await sendVideo(phone, VIDEO_URL);

  await delay(20000);
  await sendText(phone, "Daniel and I recorded a quick video about exactly how this blueprint will be printing your lifestyle every single day showing you how it's set up 🙂‍↔️ The first 5 minutes alone will show you why this is completely different. Should I send it over to you now?");

  if (leads[phone]) {
    leads[phone].stage = 'waiting_for_permission';
    saveData();
  }

  // 25 min fallback
  await delay(1500000);

  if (leads[phone] && leads[phone].stage === 'waiting_for_permission') {
    leads[phone].stage = 'pitch_sent';
    saveData();
    await sendPitch(phone);
  }

  // 24hr follow up
  await delay(86400000);
  if (leads[phone] && !leads[phone].bought) {
    await sendText(phone, "Someone just asked me if this works if you've never made money online before. Thought you'd want to see what I showed them my boss.");
    await sendImage(phone, OBJECTION_URL);
  }

  // 48hr follow up
  await delay(86400000);
  if (leads[phone] && !leads[phone].bought) {
    await sendVideo(phone, TESTIMONIAL_48HR_URL);
  }

  delete leads[phone];
  saveData();
}

// Admin panel
app.get('/admin', (req, res) => {
  const pass = req.query.pass;
  if (pass !== ADMIN_PASSWORD) {
    return res.send(`
      <html><body style="font-family:sans-serif;padding:20px">
        <h2>Admin Login</h2>
        <form action="/admin" method="get">
          <input type="password" name="pass" placeholder="Password" style="padding:8px;font-size:16px"/>
          <button type="submit" style="padding:8px 16px;margin-left:8px">Login</button>
        </form>
      </body></html>
    `);
  }

  const phones = Object.keys(conversations);
  let html = `<html><body style="font-family:sans-serif;padding:20px;max-width:800px;margin:0 auto">
    <h2>💬 Dollar Skill Admin</h2>
    <p>${phones.length} active conversations</p>`;

  if (phones.length === 0) {
    html += '<p style="color:grey">No conversations yet.</p>';
  }

  phones.forEach(phone => {
    const msgs = conversations[phone] || [];
    const status = leads[phone] ? `Stage: ${leads[phone].stage}` : 'Sequence complete';
    html += `
      <div style="border:1px solid #ddd;border-radius:8px;padding:16px;margin-bottom:16px">
        <h3 style="margin:0 0 8px">📱 ${phone} <span style="font-size:12px;color:grey">${status}</span></h3>
        <div style="background:#f9f9f9;padding:12px;border-radius:4px;max-height:200px;overflow-y:auto;margin-bottom:12px">
          ${msgs.map(m => `
            <div style="margin-bottom:6px;text-align:${m.from === 'bot' ? 'right' : 'left'}">
              <span style="background:${m.from === 'bot' ? '#dcf8c6' : '#fff'};border:1px solid #ddd;padding:4px 8px;border-radius:8px;display:inline-block;max-width:80%;font-size:14px">
                ${m.text}
              </span>
              <div style="font-size:10px;color:grey">${new Date(m.time).toLocaleTimeString()}</div>
            </div>
          `).join('')}
        </div>
        <form action="/admin/reply" method="post" style="display:flex;gap:8px">
          <input type="hidden" name="pass" value="${pass}"/>
          <input type="hidden" name="phone" value="${phone}"/>
          <input type="text" name="message" placeholder="Type reply..." style="flex:1;padding:8px;font-size:14px;border:1px solid #ddd;border-radius:4px"/>
          <button type="submit" style="padding:8px 16px;background:#25d366;color:white;border:none;border-radius:4px;cursor:pointer">Send</button>
        </form>
      </div>`;
  });

  html += '</body></html>';
  res.send(html);
});

app.post('/admin/reply', async (req, res) => {
  const { pass, phone, message } = req.body;
  if (pass !== ADMIN_PASSWORD) return res.redirect('/admin');
  if (phone && message) {
    await sendText(phone, message);
  }
  res.redirect(`/admin?pass=${pass}`);
});

app.get('/', (req, res) => res.send('Funnel is running'));

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    console.log('Webhook received:', JSON.stringify(req.body));
    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];
    if (!message) return;

    const phone = message.from;
    const text = (message.text?.body || '[media]').toLowerCase().trim();
    console.log('Message from:', phone, text);

    if (!conversations[phone]) conversations[phone] = [];
    conversations[phone].push({ from: 'customer', text: message.text?.body || '[media]', time: new Date().toISOString() });
    saveData();

    // New lead
    if (!leads[phone]) {
      leads[phone] = { stage: 'welcomed', bought: false };
      saveData();
      await delay(15000);
      await sendText(phone, "Heyy, welcome to the inner circle🦅. You're here so it means you're serious. Let's get into it, what's your name?");
      return;
    }

    // Start sequence after name
    if (leads[phone].stage === 'welcomed' && !leads[phone].sequenceStarted) {
      leads[phone].stage = 'sequence';
      leads[phone].sequenceStarted = true;
      saveData();
      runSequence(phone);
      return;
    }

    // Positive triggers for "should I send it?"
    if (leads[phone].stage === 'waiting_for_permission') {
      const positive = ["yes", "yh", "yeah", "sure", "ok", "okay", "yep", "yup", "y", "send", "go ahead", "please", "definitely", "absolutely", "of course", "why not", "lets go", "let's go", "sounds good"];
      if (positive.some(w => text.includes(w))) {
        leads[phone].stage = 'video_sent';
        saveData();
        await delay(10000);
        await sendText(phone, "Okay take your time to digest it. Your journey starts here: " + YOUTUBE_URL + "\n\nReply 'Done' once you've finished watching so I can show you how to get set up 🦅");
      }
      return;
    }

    // After video - "done" in any case triggers next message
    if (leads[phone].stage === 'video_sent') {
      if (text.includes('done')) {
        leads[phone].stage = 'asked_about_video';
        saveData();
        await delay(20000);
        await sendText(phone, "That video breaks down exactly how we're hitting these numbers every single month. Does it look like something you would comfortably plug into your daily routine?");
      }
      return;
    }

    // Any reply fires pitch
    if (leads[phone].stage === 'asked_about_video') {
      leads[phone].stage = 'pitch_sent';
      saveData();
      await sendPitch(phone);
      return;
    }

  } catch (err) {
    console.error('Webhook error:', err.message, err.stack);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
