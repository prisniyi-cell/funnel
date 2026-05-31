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
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { console.log('API response:', data); resolve(data); });
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
  return sendRequest(`/v19.0/${PHONE_NUMBER_ID}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'image',
    image: { link: url }
  });
}

function sendAudio(to, url) {
  if (!conversations[
