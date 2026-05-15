import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

export function getJwtSecret() {
  return process.env.JWT_SECRET || process.env.POKEFOLIO_TOKEN || '';
}

function b64url(data) {
  return Buffer.from(data).toString('base64url');
}

function fromB64url(str) {
  return Buffer.from(str, 'base64url').toString('utf8');
}

export function signToken(userId, email) {
  const secret = getJwtSecret();
  if (!secret) throw new Error('Server missing JWT_SECRET');
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(
    JSON.stringify({
      sub: userId,
      email,
      iat: now,
      exp: now + 30 * 24 * 60 * 60,
    }),
  );
  const sig = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${sig}`;
}

export function verifyToken(token) {
  const secret = getJwtSecret();
  if (!secret || !token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  try {
    const data = JSON.parse(fromB64url(payload));
    if (!data.sub || !data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return { userId: data.sub, email: data.email };
  } catch {
    return null;
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const attempt = crypto.scryptSync(password, salt, 64).toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(attempt, 'hex'));
  } catch {
    return false;
  }
}

async function readUsers() {
  try {
    const raw = await fs.readFile(USERS_FILE, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

async function writeUsers(users) {
  await fs.mkdir(path.dirname(USERS_FILE), { recursive: true });
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

export async function signup({ email, password }) {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes('@')) {
    throw new Error('Valid email required');
  }
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const users = await readUsers();
  if (users.some((u) => u.email === normalized)) {
    throw new Error('Email already registered');
  }

  const user = {
    id: crypto.randomUUID(),
    email: normalized,
    passwordHash: hashPassword(password),
    createdAt: Date.now(),
  };
  users.push(user);
  await writeUsers(users);

  const token = signToken(user.id, user.email);
  return { token, user: { id: user.id, email: user.email } };
}

export async function login({ email, password }) {
  const normalized = normalizeEmail(email);
  const users = await readUsers();
  const user = users.find((u) => u.email === normalized);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error('Invalid email or password');
  }
  const token = signToken(user.id, user.email);
  return { token, user: { id: user.id, email: user.email } };
}

export async function getUserById(userId) {
  const users = await readUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return null;
  return { id: user.id, email: user.email };
}

export function resolveAuth(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    const token = header.slice(7);
    const legacy = process.env.POKEFOLIO_TOKEN;
    if (legacy && token === legacy) {
      return { userId: '_legacy', email: 'legacy@local' };
    }
    const session = verifyToken(token);
    if (session) return session;
  }
  return null;
}
