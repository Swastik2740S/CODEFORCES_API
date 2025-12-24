const prisma = require("../client");
const { verifyToken } = require("../utils/jwt");
const cfService = require("../services/codeforces.service");

exports.linkHandle = async (req, res) => {
  try {
    const token = req.cookies?.access_token;
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { userId } = verifyToken(token);
    const { handle } = req.body;

    if (!handle) {
      return res.status(400).json({ error: "Handle is required" });
    }

    // Check if handle already exists globally
    const existingHandle = await prisma.codeforcesHandle.findUnique({
      where: { handle },
    });

    if (existingHandle) {
      return res.status(409).json({ error: "Handle already linked" });
    }

    // Verify from Codeforces
    const cfUser = await cfService.getUserInfo(handle);

    // Deactivate old handles (Phase-1 behavior)
    await prisma.codeforcesHandle.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    // Create new active handle
    const newHandle = await prisma.codeforcesHandle.create({
      data: {
        handle: cfUser.handle,
        rating: cfUser.rating,
        maxRating: cfUser.maxRating,
        rank: cfUser.rank,
        maxRank: cfUser.maxRank,
        userId,
        isActive: true,
      },
    });

    res.status(201).json(newHandle);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

exports.getHandles = async (req, res) => {
  try {
    const token = req.cookies?.access_token;
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { userId } = verifyToken(token);

    const handles = await prisma.codeforcesHandle.findMany({
      where: { userId },
      select: {
        id: true,
        handle: true,
        rating: true,
        maxRating: true,
        rank: true,
        maxRank: true,
        isActive: true,
        lastSyncedAt: true,
      },
      orderBy: [
        { isActive: "desc" }, // active first
        { lastSyncedAt: "desc" },
      ],
    });

    const active = handles.find((h) => h.isActive) || null;
    const others = handles.filter((h) => !h.isActive);

    res.json({ active, others });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

