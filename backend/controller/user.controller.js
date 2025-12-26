const prisma = require("../client");
const { verifyToken } = require("../utils/jwt");

exports.bootstrap = async (req, res) => {
  try {
    // 1️⃣ Get token from cookie
    const token = req.cookies?.access_token;
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // 2️⃣ Verify token
    const { userId } = verifyToken(token);

    // 3️⃣ Check if user has an active Codeforces handle
    const handle = await prisma.codeforcesHandle.findFirst({
      where: {
        userId,
        isActive: true,
      },
      select: { id: true },
    });

    // 4️⃣ Respond with onboarding state
    res.json({
      connected: Boolean(handle),
    });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
