const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
// FRONTEND_URL env var allows dynamic origin per environment.
// Supports multiple origins comma-separated: "http://localhost:3000,https://myapp.vercel.app"
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth',       require('./routes/auth.routes'));
app.use('/api/user',       require('./routes/user.routes'));
app.use('/api/codeforces', require('./routes/codeforces.routes'));
app.use('/api/dashboard',  require('./routes/dashboard.routes'));

module.exports = app;