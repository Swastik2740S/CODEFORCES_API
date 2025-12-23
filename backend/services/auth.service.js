const prisma = require('../client');
const { hashPassword, comparePassword } = require('../utils/hash');
const { signToken } = require('../utils/jwt');

async function register(email, password) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('Email already registered');

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: { email, passwordHash }
  });

  const token = signToken({ userId: user.id });

  return { user, token };
}

async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    throw new Error('Invalid credentials');
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) throw new Error('Invalid credentials');

  const token = signToken({ userId: user.id });

  return { user, token };
}

module.exports = { register, login };
