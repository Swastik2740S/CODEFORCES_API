const authService = require('../services/auth.service');
const prisma = require("../client");
const { verifyToken } = require("../utils/jwt");

// ✅ Dynamic cookie options based on environment
// In production: sameSite "none" + secure true = allows cross-origin cookies (requires HTTPS)
// In development: sameSite "lax" + secure false = works on plain HTTP localhost
const isProd = process.env.NODE_ENV === "production";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: false,
};

exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.register(email, password);

    res.cookie('access_token', token, COOKIE_OPTIONS);
    res.status(201).json({ user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.login(email, password);

    res.cookie('access_token', token, COOKIE_OPTIONS);
    res.json({ user });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('access_token', COOKIE_OPTIONS);
  res.json({ message: 'Logged out' });
};

exports.me = async (req, res) => {
  try {
    const token = req.cookies?.access_token;

    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        createdAt: true,
        codeforcesHandles: {
          select: {
            handle: true,
            rating: true,
            maxRating: true,
            rank: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};