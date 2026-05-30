console.log('Node version:', process.version);
const express = require('express');
const app = express();
app.use(express.json());

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = "dollarskill123";

// Track conversation state
const leads = {};

async function sendText(to, message) {
  const res = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message }
    })
  });
  return res.json();
}

async function sendMedia(to, type, url, caption = '') {
  const body = {
    messaging_product: 'whatsapp',
    to,
    type,
    [type]: { link: url }
  };
  if (caption && type === 'image') body[type].caption = caption;
  const res = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  return res.json();
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runSequence(phone) {
  const VOICE_NOTE_URL = 'PLACEHOLDER_VOICE_NOTE_URL';
  const PHOTO1_URL = 'PLACEHOLDER_PHOTO1_URL';
  const PHOTO2_URL = 'PLACEHOLDER_PHOTO2_URL';
  const PHOTO3_URL = 'PLACEHOLDER_PHOTO3_URL';
  const VIDEO_URL = 'PLACEHOLDER_VIDEO_URL';
  const OBJECTION_SCREENSHOT_URL = 'PLACEHOLDER_OBJECTION_URL';
  const TESTIMONIAL_48HR_URL = 'PLACEHOLDER_TESTIMONIAL_URL';

  // Voice note immediately
  await sendMedia(phone, 'audio', VOICE_NOTE_URL);

  // Photo reviews
  await delay(15000);
  await sendMedia(phone, 'image', PHOTO1_URL);

  await delay(20000);
  await sendMedia(phone, 'image', PHOTO2_URL);

  await delay(20000);
  await sendMedia(phone, 'image', PHOTO3_URL);

  // Video review
  await delay(20000);
  await sendMedia(phone, 'video', VIDEO_URL);

  // YouTube message
  await delay(30000);
  await sendText(phone, "Daniel, who put me on, recorded a full breakdown of everything 👇🏾. The first 5 minutes alone will show you why this is completely different from every forex, crypto and annoying MLM thing you've seen before. https://youtu.be/fESbDk6ngWk");

  // Affiliate message
  await delay(120000);
  await sendText(phone, "AND I know what you're thinking, 'this won't work for me', 'I've tried a lot, wasting my time again would suck'. That's exactly what I thought too. Until I actually started. Now I'm just coming back from a trip like I told you 🙂‍↔️\n\nFor N50,000 with no hidden costs, you get the transparent print you need. Step by step processes with no fancy setup. Results within days to weeks if you implement. The kind of income that lets you travel, pay rent without thinking twice, take care of your family. An active community to ginger you to get your bag. And a 30-day money back guarantee. I will personally even apologise publicly for wasting your time if you implement everything 🙂‍↔️\n\nYou're the only one that can stop yourself.\n\nLike I said we don't want this to cast and 73 people already got inside. Price moves to N150,000 at 100.\nhttps://app.expertnaire.com/product/8646634117/8478632445");

  // Soft close
  await delay(20000);
  await sendText(phone, "Any questions before you get your big bag?");

  // Mark sequence done, schedule 24hr followup
  leads[phone].sequenceDone = true;
  leads[phone].sequenceTime = Date.now();

  // 24hr follow up
  await delay(86400000);
  if (!leads[phone].bought) {
    await sendText(phone, "Someone just asked me if this works if you've never made money online before. Thought you'd want to see what I told them my boss.");
    await sendMedia(phone, 'image', OBJECTION_SCREENSHOT_URL);
  }

  // 48hr follow up
  await delay(86400000);
  if (!leads[phone].bought) {
    await sendMedia(phone, 'image', TESTIMONIAL_48HR_URL);
  }

  // 72hr - stop completely
  delete leads[phone];
}

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
    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];
    if (!message) return;

    const phone = message.from;
    const text = message.text?.body?.trim();

    // New lead
    if (!leads[phone]) {
      leads[phone] = { stage: 'welcomed', bought: false };
      await sendText(phone, "Heyy, welcome to the inner circle🦅. You're here so it means you're serious. Let's get into it, what's your name?");
      return;
    }

    // They replied with name - trigger sequence
    if (leads[phone].stage === 'welcomed' && !leads[phone].sequenceStarted) {
      leads[phone].stage = 'sequence';
      leads[phone].sequenceStarted = true;
      runSequence(phone); // runs async, don't await
      return;
    }

    // Sequence already running - ignore messages
} catch (err) {
    console.error('Webhook error:', err.message, err.stack);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
