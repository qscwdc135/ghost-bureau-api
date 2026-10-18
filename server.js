const express = require('express');
const app = express();

app.use(express.json());
app.use((_, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'content-type');
  next();
});

// ⚠️ Vercel 是 Serverless，下面这两个数组每次冷启动会清空
// 仅适合测试联机，真上线要接外部存储
const messages = [];
const onlineUsers = {};

app.get('/api/health', (_, res) => res.send('ok'));

app.post('/api/online', (req, res) => {
  const { id, nick } = req.body || {};
  if (id) onlineUsers[id] = { nick, last: Date.now() };
  res.json({ ok: true });
});

app.get('/api/online', (_, res) => {
  const list = Object.entries(onlineUsers)
    .filter(([, v]) => Date.now() - v.last < 30000)
    .map(([id, v]) => ({ id, nick: v.nick }));
  res.json(list);
});

app.post('/api/chat', (req, res) => {
  const { channel = 'normal', user = '匿名', text = '' } = req.body || {};
  if (!text.trim()) return res.status(400).json({ ok: false });
  messages.push({
    t: Date.now(),
    c: channel,
    user,
    text: String(text).slice(0, 120)
  });
  if (messages.length > 200) messages.shift();
  res.json({ ok: true });
});

app.get('/api/chat', (req, res) => {
  const ch = req.query.channel || 'normal';
  res.json(messages.filter(m => m.c === ch).slice(-50));
});

// Vercel 不支持 SSE 长连接，前端请用轮询代替 /api/stream
module.exports = app;
