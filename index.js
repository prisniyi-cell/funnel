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
headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_API_KEY, 'Conten
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
try { const p = JSON.parse(d); console.log('Cloud load:', d.substring(0, 80)); catch (e) { console.error('Cloud parse error:', e); resolve(null); }
resolv
});
});
req.on('error', e => { console.error('Cloud load error:', e.message); resolve(null); });
req.end();
});
}
function saveData() { saveLocal(); saveCloud(); }
const SEED_LEADS = {
'2348084700797': { stage: 'done_followup', bought: false, seeded: true },
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
if (!conversations[phone]) conversations[phone] = [{ from: 'bot', text: '[Old lead, res
}
}
saveData();
console.log('Init complete:', Object.keys(leads).length, 'leads total');
}
function saveDataFull() {
try { fs.writeFileSync(DATA_FILE, JSON.stringify({ leads, conversations, lastSeen })); } ca
saveCloud();
}
const VOICE_NOTE_URL = 'https://res.cloudinary.com/dpknwoywz/video/upload/v1780175029/voiceno
const PRICE_VN_URL = 'https://res.cloudinary.com/dpknwoywz/video/upload/v1780247025/Vaurie_se
const OBJECTION_URL = 'https://res.cloudinary.com/dpknwoywz/image/upload/v1780176996/photo_20
const TESTIMONIAL_48HR_URL = 'https://res.cloudinary.com/dpknwoywz/video/upload/v1780176890/c
const YOUTUBE_URL = 'https://youtu.be/aGwB50peA6g?si=v9ejB0Mbd_NdzdGD';
const AFFILIATE_URL = 'https://app.expertnaire.com/product/8646634117/8478632445';
const STAGE_CONFIG = {
'waiting_name': { label: 'Asked: whats your name?', color: '#3b82f6', 'waiting_pain_point': { label: 'Sent: intro VN', color: '#f59e0b', 'waiting_permission': { label: 'Asked: tried before?', color: '#f97316', 'waiting_done': { label: 'Sent: YouTube link', color: '#ef4444', 'waiting_plug_reply': { label: 'Asked: can plug in daily?', color: '#22c55e', 'pitch_sent': { label: 'Sent: price VN + link', color: '#dc2626', 'done_followup': { label: 'Cooled Off', color: '#6b7280', text: '#fff'
text: '#fff'
text: '#fff'
text: '#fff'
text: '#fff'
text: '#fff'
text: '#fff'
};
const ALL_STAGES = ['waiting_name','waiting_pain_point','waiting_permission','waiting_done','
function getStageDisplay(stage) {
return STAGE_CONFIG[stage] || { label: stage || 'Unknown', color: '#d1d5db', text: '#111' }
}
const QUICK_REPLIES = [
{ label: 'Is this legit?', text: '' },
{ label: 'How much? (early)', text: 'Just watch the breakdown first, it covers everything i
{ label: 'No money now', text: 'Totally understand. When you\'re ready the link is here. Pr
{ label: 'Does it work?', text: '' },
{ label: 'Do I have to pay?', text: 'Yes, it\'s a one-time N50,000 directly on the platform
{ label: 'I\'ll think about it', text: 'Okay that\'s totally fine, take your time. I just w
{ label: 'Installments?', text: 'The system is a one-time N50,000, no installments. But hon
{ label: 'Tried before', text: 'Same thing I thought. That\'s exactly why I almost didn\'t
{ label: 'What is this about?', text: 'Just watch the first 5 minutes of this video, it exp
{ label: 'Resend VSL', text: 'No worries at all! Here it is again: ' + YOUTUBE_URL + ', tak
{ label: 'MSG 3: tried before?', text: 'Okay real talk, I was just going to send this to ev
{ label: 'MSG 4: send breakdown?', text: 'I have a breakdown, the first 5 minutes alone wil
{ label: 'MSG 5: VSL link', text: 'Take your time with it. ' + YOUTUBE_URL + '. You reached
{ label: 'MSG 6: kudos', text: 'Kudos to you . That video is the exact system of how we\'
{ label: 'MSG 8: affiliate link', text: 'Since we\'ve covered the mechanics, you can { label: 'MSG 9: any questions?', text: 'Any questions before you get your big bag?' jump i
},
];
function sendRequest(path, data) {
return new Promise((resolve, reject) => {
const body = JSON.stringify(data);
const options = {
hostname: 'graph.facebook.com', path, method: 'POST',
headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json
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
return sendRequest(`/v19.0/${PHONE_NUMBER_ID}/messages`, { messaging_product: 'whatsapp', t
}
function sendAudio(to, url) {
if (!conversations[to]) conversations[to] = [];
conversations[to].push({ from: 'bot', text: '[Voice Note]', time: new Date().toISOString()
lastSeen[to] = (conversations[to] || []).length;
saveDataFull();
return sendRequest(`/v19.0/${PHONE_NUMBER_ID}/messages`, { messaging_product: 'whatsapp', t
}
function sendImage(to, url) {
if (!conversations[to]) conversations[to] = [];
conversations[to].push({ from: 'bot', text: '[Image]', time: new Date().toISOString() });
lastSeen[to] = (conversations[to] || []).length;
saveDataFull();
return sendRequest(`/v19.0/${PHONE_NUMBER_ID}/messages`, { messaging_product: 'whatsapp', t
}
function sendVideo(to, url) {
if (!conversations[to]) conversations[to] = [];
conversations[to].push({ from: 'bot', text: '[Video]', time: new Date().toISOString() });
lastSeen[to] = (conversations[to] || []).length;
saveDataFull();
return sendRequest(`/v19.0/${PHONE_NUMBER_ID}/messages`, { messaging_product: 'whatsapp', t
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
return res.send(`<html><body style="font-family:sans-serif;padding:20px;background:#f3f4f
<div style="max-width:400px;margin:80px auto;background:#fff;padding:32px;border-radius
<h2 style="margin:0 0 20px"> Dollar Skill Admin</h2>
<form action="/admin" method="get">
<input type="password" name="pass" placeholder="Password" style="width:100%;padding
<button type="submit" style="width:100%;padding:10px;background:#25d366;color:white
</form>
</div></body></html>`);
}
// Date filter
const now = Date.now();
const filterMs = filter === 'today' ? 86400000 : filter === '7' ? 7*86400000 : filter === '
let allPhones = Object.keys(conversations);
if (filterMs) {
allPhones = allPhones.filter(p => (now - getLastMessageTime(p)) <= filterMs);
}
// Split into active and cooled off
const activePhones = allPhones.filter(p => (leads[p]?.stage || 'done_followup') !== 'done_f
const cooledPhones = allPhones.filter(p => (leads[p]?.stage || 'done_followup') === 'done_f
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
allPhones.forEach(p => { const s = leads[p]?.stage||'done_followup'; stageCounts[s]=(stageC
const quickReplyJS = JSON.stringify(QUICK_REPLIES);
let html = `<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
*{box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f3f4f
.header{background:#25d366;color:white;padding:14px 16px;border-radius:12px;margin-bottom
.header h2{margin:0;font-size:17px}
.filters{display:flex;gap:6px;margin-bottom:12px;overflow-x:auto}
.filter-btn{padding:7px 14px;border-radius:20px;border:1.5px solid #ddd;background:#fff;f
.filter-btn.active{background:#25d366;color:white;border-color:#25d366}
.stats{display:flex;gap:8px;margin-bottom:12px}
.stat{background:#fff;border-radius:10px;padding:10px;flex:1;text-align:center;box-shadow
.stat-num{font-size:20px;font-weight:700} .stat-label{font-size:11px;color:#6b7280}
.section-title{font-size:13px;font-weight:600;color:#6b7280;margin:12px 0 6px;text-transf
.card{background:#fff;border-radius:12px;padding:14px;margin-bottom:10px;box-shadow:0 1px
.card-top{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.unread-dot{width:8px;height:8px;border-radius:50%;background:#87ceeb;flex-shrink:0}
.phone{font-size:14px;font-weight:700;color:#111;flex:1}
.name-display{font-size:13px;color:#6b7280;margin-bottom:4px}
.stage-badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font
.msgs{background:#f9f9f9;padding:10px;border-radius:8px;max-height:160px;overflow-y:auto;
.msg-bot{text-align:right;margin-bottom:5px} .msg-customer{text-align:left;margin-bottom:
.bubble{display:inline-block;padding:6px 10px;border-radius:10px;max-width:82%;word-break
.bubble-bot{background:#dcf8c6;border:1px solid #c3e6ad} .bubble-customer{background:#fff
.time{font-size:9px;color:#999;margin-top:2px}
.manage-btn{width:100%;padding:8px;background:#f3f4f6;border:1.5px solid #e5e7eb;border-r
.manage-panel{display:none;margin-top:10px;border-top:1px solid #eee;padding-top:10px}
.row{display:flex;gap:8px;margin-bottom:8px}
input[type=text],select{flex:1;padding:8px;font-size:14px;border:1.5px solid #ddd;border-
.btn-green{padding:8px 16px;background:#25d366;color:white;border:none;border-radius:8px;
.btn-purple{padding:8px 14px;background:#6366f1;color:white;border:none;border-radius:8px
.btn-orange{padding:6px 10px;background:#f59e0b;color:white;border:none;border-radius:8px
.btn-grey{padding:6px 10px;background:#6b7280;color:white;border:none;border-radius:8px;f
.quick-toggle{background:none;border:1.5px solid #ddd;border-radius:8px;width:100%;paddin
.quick-panel{display:none;background:#f9f9f9;border-radius:8px;padding:8px;margin-bottom:
.quick-btn{display:block;width:100%;text-align:left;padding:7px 10px;margin-bottom:5px;ba
.quick-btn:hover{background:#f0fdf4}
.media-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
.name-edit{display:flex;gap:6px;margin-bottom:8px}
.divider{border:none;border-top:1px solid #eee;margin:8px 0}
.cooled-header{display:flex;justify-content:space-between;align-items:center;cursor:point
.cooled-section{margin-top:4px}
.funnel-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;b
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
if (s.style.display === 'none') { s.style.display = 'block'; arrow.textContent = else { s.style.display = 'none'; arrow.textContent = '▼'; }
'▲'; }
function markRead(phone, pass) {
fetch('/admin/markread?pass=' + pass + '&phone=' + phone);
}
}
function markReadClient(phone, pass, cardId) {
fetch('/admin/markread?pass=' + pass + '&phone=' + phone);
const dot = document.querySelector('#card-' + cardId + ' .unread-dot');
if (dot) dot.style.display = 'none';
}
</script>
</head><body>`;
html += `<div class="header"><h2> Dollar Skill</h2><span>${allPhones.length} convos</span
// Filter buttons
html += `<div class="filters">
<a href="/admin?pass=${pass}&filter=today" class="filter-btn ${filter==='today'?'active':
<a href="/admin?pass=${pass}&filter=7" class="filter-btn ${filter==='7'?'active':''}">7 d
<a href="/admin?pass=${pass}&filter=30" class="filter-btn ${filter==='30'?'active':''}">3
<a href="/admin?pass=${pass}&filter=all" class="filter-btn ${filter==='all'?'active':''}"
</div>`;
// Stats
html += `<div class="stats">
<div class="stat"><div class="stat-num" style="color:#dc2626">${(stageCounts['pitch_sent'
<div class="stat"><div class="stat-num" style="color:#22c55e">${stageCounts['waiting_plug
<div class="stat"><div class="stat-num">${allPhones.length}</div><div class="stat-label">
</div>`;
// Funnel analytics
const allPhonesTotal = Object.keys(conversations);
const totalConvos = allPhonesTotal.length;
const gotVN = allPhonesTotal.filter(p => {
const s = leads[p]?.stage;
return ['waiting_pain_point','waiting_permission','waiting_done','waiting_plug_reply','pi
}).length;
const answeredPainPoint = allPhonesTotal.filter(p => {
const s = leads[p]?.stage;
return ['waiting_permission','waiting_done','waiting_plug_reply','pitch_sent','done_follo
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
html += '<button class="quick-toggle" onclick="toggleStats()" style="margin-bottom:12px">Fu
html += '<div id="stats-panel" style="display:none;background:#fff;border-radius:12px;paddi
html += '<div style="font-size:13px;font-weight:600;color:#6b7280;margin-bottom:10px;text-t
html += '<div class="funnel-row"><span>1. Total conversations</span><span class="funnel-num
html += '<div class="funnel-row"><span>2. Got intro VN</span><span class="funnel-num">' + g
html += '<div class="funnel-row"><span>3. Answered pain point</span><span class="funnel-num
html += '<div class="funnel-row"><span>4. Got VSL link</span><span class="funnel-num">' + g
html += '<div class="funnel-row"><span>5. Watched VSL (said Done)</span><span class="funnel
html += '<div class="funnel-row"><span>6. Got pitch</span><span class="funnel-num">' + gotP
html += '<div class="funnel-row" style="font-weight:700;color:#22c55e"><span>7. Bought</spa
html += '</div>';
function renderCard(phone) {
const msgs = [...(conversations[phone] || [])].reverse();
const stage = leads[phone]?.stage || 'done_followup';
const si = getStageDisplay(stage);
const unread = hasUnread(phone);
const name = leads[phone]?.name || '';
const cardId = phone.replace(/\D/g, '');
const opts = ALL_STAGES.map(s => `<option value="${s}" ${s===stage?'selected':''}>${STAGE
const qBtns = QUICK_REPLIES.map((q, i) => {
return `<button type="button" class="quick-btn" data-cardid="${cardId}" data-idx="${i}"
}).join('');
return `<div class="card" id="card-${cardId}">
<div class="card-top">
${unread ? `<div class="unread-dot" onclick="markReadClient('${phone}', '${pass}', '$
<div class="phone">+${phone}</div>
</div>
${name ? `<div class="name-display"> ${name}</div>` : ''}
<span class="stage-badge" style="background:${si.color};color:${si.text}">${si.label}</
<div class="msgs">${msgs.map(m=>`<div class="msg-${m.from}"><span class="bubble bubble-
<button class="manage-btn" onclick="toggleManage('${cardId}')">Manage</button>
<div class="manage-panel" id="manage-${cardId}">
<form action="/admin/reply" method="post">
<input type="hidden" name="pass" value="${pass}"/><input type="hidden" name="phone"
<div class="row"><input type="text" name="message" id="reply-${cardId}" placeholder
</form>
<button class="quick-toggle" onclick="toggleQuick('${cardId}')"> Quick replies</but
<div class="quick-panel" id="quick-${cardId}">${qBtns}</div>
<div class="media-row">
<form action="/admin/sendmedia" method="post" style="display:inline"><input type="h
<form action="/admin/sendmedia" method="post" style="display:inline"><input type="h
<form action="/admin/sendmedia" method="post" style="display:inline"><input type="h
<form action="/admin/sendmedia" method="post" style="display:inline"><input type="h
</div>
<div class="divider"></div>
<div class="name-edit">
<form action="/admin/setname" method="post" style="display:flex;gap:8px;flex:1">
<input type="hidden" name="pass" value="${pass}"/><input type="hidden" name="phon
<input type="text" name="name" placeholder="Set name..." value="${name}"/>
<button type="submit" class="btn-grey">Save</button>
</form>
</div>
<form action="/admin/setstage" method="post">
<input type="hidden" name="pass" value="${pass}"/><input type="hidden" name="phone"
<div class="row"><select name="stage">${opts}</select><button type="submit" class="
</form>
</div>
</div>`;
}
// Active section
if (activePhones.length) {
html += `<div class="section-title">Active (${activePhones.length})</div>`;
activePhones.forEach(phone => { html += renderCard(phone); });
} else {
html += '<p style="color:#9ca3af;text-align:center;padding:20px 0;font-size:14px">No acti
}
// Cooled Off section (collapsible)
const cooledUnread = cooledPhones.filter(p => hasUnread(p)).length;
html += `<div class="cooled-header" onclick="toggleCooled()">
<div class="section-title" style="margin:0">Cooled Off (${cooledPhones.length})${cooledUn
<span id="cooled-arrow" style="color:#6b7280;font-size:12px">▼</span>
</div>
<div class="cooled-section" id="cooled-body" style="display:none">`;
if (cooledPhones.length) {
cooledPhones.forEach(phone => { html += renderCard(phone); });
} else {
html += '<p style="color:#9ca3af;text-align:center;padding:16px 0;font-size:14px">No cool
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
conversations[phone].push({ from: 'bot', text: `[Stage set to: ${stage}]`, time: new Date
saveDataFull();
}
});
res.redirect(`/admin?pass=${pass}`);
app.post('/admin/setname', (req, res) => {
const { pass, phone, name } = req.body;
if (pass !== ADMIN_PASSWORD) return res.redirect('/admin');
if (phone && name) {
if (!leads[phone]) leads[phone] = { bought: false };
leads[phone].name = name;
saveDataFull();
}
});
res.redirect(`/admin?pass=${pass}`);
app.post('/admin/sendmedia', async (req, res) => {
const { pass, phone, media } = req.body;
if (pass !== ADMIN_PASSWORD) return res.redirect('/admin');
if (phone && media) {
if (media === 'intro_vn') await sendAudio(phone, VOICE_NOTE_URL);
else if (media === 'price_vn') await sendAudio(phone, PRICE_VN_URL);
else if (media === 'objection') await sendImage(phone, OBJECTION_URL);
else if (media === 'testimonial') await sendVideo(phone, TESTIMONIAL_48HR_URL);
markRead(phone);
}
});
res.redirect(`/admin?pass=${pass}`);
app.get('/', (req, res) => res.send('Funnel running'));
app.get('/watch', (req, res) => {
res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>The Dollar Skill</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sa
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
background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://ww
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
<div class="badge"> For serious people only</div>
<h1 class="headline">
The exact system Nigerians are using to<br/>
<span>print dollars daily</span>
</h1>
<p class="subline">Watch the full breakdown below. The part that changes everything is in
<div class="video-wrap">
<iframe
src="https://www.youtube.com/embed/aGwB50peA6g?si=v9ejB0Mbd_NdzdGD&rel=0&modestbrandi
allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-
allowfullscreen>
</iframe>
</div>
<div class="cta-wrap">
<a href="https://app.expertnaire.com/product/8646634117/8478632445" class="cta-btn" tar
I'm ready to start printing
</a>
<p class="cta-note">One-time payment &middot; Direct access &middot; Start today</p>
</div>
<div class="divider"></div>
<div class="proof">
<div class="proof-title">What people are saying</div>
<div class="proof-item">
<p>I was skeptical at first but within 48 hours of implementing what I learned <div class="proof-name">— Community member</div>
I made
for me
</div>
<div class="proof-item">
<p>Never thought I could earn in dollars from Nigeria. This changed everything <div class="proof-name">— Community member</div>
</div>
<div class="proof-item">
<p>The system is simple and it actually works. I was doing it wrong before. Now I kno
<div class="proof-name">— Community member</div>
</div>
</div>
</div>
</body>
</html>`);
});
app.get('/webhook', (req, res) => {
const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.que
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
conversations[phone].push({ from: 'customer', text: message.text?.body || '[media]', time
saveDataFull();
if (!leads[phone]) {
leads[phone] = { stage: 'waiting_name', bought: false }; saveDataFull();
await delay(15000);
await sendText(phone, "Heyy, welcome to the inner circle return;
. You're here so it means you
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
await sendText(phone, "Okay real talk, I was just going to send this to everyone return;
who me
}
if (leads[phone].stage === 'waiting_pain_point') {
leads[phone].stage = 'waiting_permission'; saveDataFull();
await delay(20000);
await sendText(phone, "I have a breakdown, the first 5 minutes alone will show you why
return;
}
if (leads[phone].stage === 'waiting_permission') {
const positive = ["yes","yh","yeah","yep","ok","okay","sure","go on","definitely","abso
if (positive.some(w => text.includes(w))) {
leads[phone].stage = 'waiting_done'; saveDataFull();
await delay(20000);
await sendText(phone, "Take your time with it. https://sweet-growth-production-9b60.u
await delay(21600000);
if (leads[phone] && leads[phone].stage === 'waiting_done') {
await sendText(phone, "You went ghost on me everything good? Did the link work?
}
}
return;
}
if (leads[phone].stage === 'waiting_done') {
if (text.includes('done')) {
leads[phone].stage = 'waiting_plug_reply'; saveDataFull();
await delay(20000);
await sendText(phone, "Kudos to you . That video is the exact system of how we're h
}
return;
}
if (leads[phone].stage === 'waiting_plug_reply') {
leads[phone].stage = 'pitch_sent'; saveDataFull();
await delay(25000);
await sendAudio(phone, PRICE_VN_URL);
await delay(10000);
await sendText(phone, "Since we've covered the mechanics, you can jump in here: " + AFF
await delay(10000);
await sendText(phone, "Any questions before you get your big bag?");
await delay(86400000);
if (leads[phone] && !leads[phone].bought) {
await sendText(phone, "Someone just asked me if this works if you've never made money
await sendImage(phone, OBJECTION_URL);
}
await delay(86400000);
if (leads[phone] && !leads[phone].bought) { await sendVideo(phone, TESTIMONIAL_48HR_URL
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
})
