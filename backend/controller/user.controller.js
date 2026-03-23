const prisma = require("../client");
const { verifyToken } = require("../utils/jwt");

// ── Shared helper ─────────────────────────────────────────────────────────────
function getUserId(req) {
  const token = req.cookies?.access_token;
  if (!token) return null;
  try {
    const { userId } = verifyToken(token);
    return userId;
  } catch {
    return null;
  }
}

// ── GET /api/user/bootstrap ───────────────────────────────────────────────────
exports.bootstrap = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const handle = await prisma.codeforcesHandle.findFirst({
      where: { userId, isActive: true },
      select: { id: true },
    });

    res.json({ connected: Boolean(handle) });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// ── PATCH /api/user/profile ───────────────────────────────────────────────────
// Only email is editable — CF handle is the display name
exports.updateProfile = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Check email not already taken by another user
    const existing = await prisma.user.findFirst({
      where: { email, NOT: { id: userId } },
    });
    if (existing) {
      return res.status(400).json({ error: "Email already in use" });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { email },
      select: { id: true, email: true, createdAt: true },
    });

    res.json({ user: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

// ── DELETE /api/user/account ──────────────────────────────────────────────────
exports.deleteAccount = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { confirm } = req.body;

    if (confirm !== "DELETE") {
      return res.status(400).json({ error: "Send { confirm: 'DELETE' } to proceed" });
    }

    // Prisma cascades delete all related data:
    // CodeforcesHandles → Submissions, RatingChanges, Activity, SyncJobs etc.
    await prisma.user.delete({ where: { id: userId } });

    // Clear auth cookie
    res.clearCookie("access_token", {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
    });

    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete account" });
  }
};