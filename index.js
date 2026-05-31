const express = require('express');
const https = require('https');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = "dollarskill123";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "dollarskill999";

const leads = {};
const conversations = {};

// Assets
const VOICE_NOTE_URL = 'https://res.cloudinary.com/dpknwoywz/video/upload/v1780175029/voicenote.m4a_myqyex.m4a';
const PHOTO1_URL = 'https://res.cloudinary.com/dpknwoywz/image/upload/v1780173251/photo_2026-05-30_15-07-57_yznnlq.jpg';
const PHOTO2_URL = 'https://res.cloudinary.com/dpknwoywz/image/upload/v1780173238/photo_2026-05-30_15-10-04_m6fkek.jpg';
const PHOTO3_URL = 'https://res.cloudinary.com/dpknwoywz/image/upload/v1780173200/photo_2026-05-30_15-11-57_lxnwd6.jpg';
const VIDEO_45MIN_URL = 'https://res.cloudinary.com/dpknwoywz/video/upload/v1780173788/video_2026-05-30_15-12-27_t9aoqf.mp4';
const OBJECTION_URL = 'https://res.cloudinary.com/dpknwoywz/image/upload/v1780176996/photo_2026-05-30_15-09-09_lnzooq.jpg';
const TESTIMONIAL_URL = 'https://res.cloudinary.com/dpknwoywz/video/upload/v1780176890/copy_AE270DFE-4121-4D3C-A869-DB0D674F4DDE_dsly51.mov';

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
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

function sendText(to, message) {
    if (!conversations[to]) conversations[to] = [];
    conversations[to].push({ from: 'bot', text: message, time: new Date().toISOString() });
    return sendRequest(`/v19.0/${PHONE_NUMBER_ID}/messages`, { messaging_product: 'whatsapp', to, type: 'text', text: { body: message } });
}

function sendImage(to, url) {
    if (!conversations[to]) conversations[to] = [];
    conversations[to].push({ from: 'bot', text: '[Image]', time: new Date().toISOString() });
    return sendRequest(`/v19.0/${PHONE_NUMBER_ID}/messages`, { messaging_product: 'whatsapp', to, type: 'image', image: { link: url } });
}

function sendVideo(to, url) {
    if (!conversations[to]) conversations[to] = [];
    conversations[to].push({ from: 'bot', text: '[Video]', time: new Date().toISOString() });
    return sendRequest(`/v19.0/${PHONE_NUMBER_ID}/messages`, { messaging_product: 'whatsapp', to, type: 'video', video: { link: url } });
}

function sendAudio(to, url) {
    if (!conversations[to]) conversations[to] = [];
    conversations[to].push({ from: 'bot', text: '[Voice Note]', time: new Date().toISOString() });
    return sendRequest(`/v19.0/${PHONE_NUMBER_ID}/messages`, { messaging_product: 'whatsapp', to, type: 'audio', audio: { link: url } });
}

async function runWarmup(phone) {
    await sendAudio(phone, VOICE_NOTE_URL);
    await new Promise(r => setTimeout(r, 5000));
    await sendImage(phone, PHOTO1_URL);
    await sendImage(phone, PHOTO2_URL);
    await sendImage(phone, PHOTO3_URL);
    await sendText(phone, "I’ve put together a 45-minute breakdown that shows the exact system I used to get these results. It’s pretty detailed—should I send that over to you now?");
    leads[phone].stage = 'waiting_for_permission';
}

app.post('/webhook', async (req, res) => {
    res.sendStatus(200);
    const message = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return;
    const phone = message.from;
    const text = (message.text?.body || '').toLowerCase();

    if (!conversations[phone]) conversations[phone] = [];
    conversations[phone].push({ from: 'customer', text, time: new Date().toISOString() });

    if (!leads[phone]) {
        leads[phone] = { stage: 'welcomed' };
        await sendText(phone, "Heyy, welcome to the inner circle🦅. Let's get into it, what's your name?");
    } else if (leads[phone].stage === 'welcomed') {
        runWarmup(phone);
    } else if (leads[phone].stage === 'waiting_for_permission') {
        const positive = ["yes", "yeah", "sure", "ok", "okay", "please", "send", "go ahead"];
        if (positive.some(w => text.includes(w))) {
            leads[phone].stage = 'sent_video';
            await sendVideo(phone, VIDEO_45MIN_URL);
            await sendText(phone, "Take your time with this. Reply 'DONE' once you've finished watching so I can show you how to get your account set up.");
        }
    } else if (leads[phone].stage === 'sent_video' && text.includes('done')) {
        leads[phone].stage = 'ready_to_close';
        await sendText(phone, "Great! Here is the link to get your account set up before the price moves to N150,000:\nhttps://app.expertnaire.com/product/8646634117/8478632445");
    }
});

app.get('/webhook', (req, res) => {
    if (req.query['hub.verify_token'] === VERIFY_TOKEN) res.send(req.query['hub.challenge']);
    else res.sendStatus(403);
});

app.listen(process.env.PORT || 3000);
