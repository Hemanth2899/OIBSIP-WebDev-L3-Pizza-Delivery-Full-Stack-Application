require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const { startStockJob } = require('./jobs/stockJob');

for (const key of ['MONGO_URI', 'JWT_SECRET', 'CLIENT_URL']) {
  if (!process.env[key]) {
    console.error(`Missing ${key} in .env (copy .env.example to .env)`);
    process.exit(1);
  }
}

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json({ limit: '100kb' }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false });
app.use(['/api/auth', '/api/admin/login'], authLimiter);

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));

app.use((req, res) => res.status(404).json({ message: 'Not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({
    message: err.status ? err.message : 'Something went wrong on our side',
    ...(err.code ? { code: err.code } : {}),
  });
});

const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    startStockJob();
    app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
  })
  .catch((e) => {
    console.error('Could not connect to MongoDB:', e.message);
    process.exit(1);
  });
