const authService = require('../services/auth.service');
const prisma = require("../client");
const { verifyToken } = require("../utils/jwt");
const bcrypt = require("bcryptjs");

const isProd = process.env.NODE_ENV === "production";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: isProd ? "none" : "lax",
  secure: isProd,
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

// ── PATCH /api/auth/change-password ──────────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const token = req.cookies?.access_token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const { userId } = verifyToken(token);
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "currentPassword and newPassword are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Prevent reusing same password
    const isSame = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSame) {
      return res.status(400).json({ error: "New password must differ from current" });
    }

    // Hash and save
    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to change password" });
  }
};