/**
 * PokéFolio API — per-user auth + card storage on your Mac.
 *
 *   JWT_SECRET=... npm run sync:server
 */
import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getJwtSecret, getUserById, login, resolveAuth, signup } from './auth.mjs';
import { readCards, writeCards } from './cards.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3456;
const STATIC_DIR = process.env.STATIC_DIR
  ? path.resolve(process.env.STATIC_DIR)
  : null;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

function allowedOrigins() {
  return CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
}

function corsHeaders(origin) {
  if (CORS_ORIGIN === '*') {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
  }
  const list = allowedOrigins();
  const match = origin && list.includes(origin) ? origin : null;
  const headers = {
    'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  if (match) headers['Access-Control-Allow-Origin'] = match;
  return headers;
}

function json(res, status, body, origin) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...corsHeaders(origin) });
  res.end(JSON.stringify(body));
}

function unauthorized(res, origin, message = 'Unauthorized') {
  json(res, 401, { error: message }, origin);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

async function serveStatic(req, res, origin) {
  if (!STATIC_DIR) return false;
  let urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.normalize(path.join(STATIC_DIR, urlPath));
  if (!filePath.startsWith(STATIC_DIR)) {
    res.writeHead(403, corsHeaders(origin));
    res.end('Forbidden');
    return true;
  }
  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) return false;
    const body = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      ...corsHeaders(origin),
    });
    res.end(body);
    return true;
  } catch {
    if (!urlPath.endsWith('.html') && !path.extname(urlPath)) {
      const index = path.join(STATIC_DIR, 'index.html');
      try {
        const body = await fs.readFile(index);
        res.writeHead(200, { 'Content-Type': 'text/html', ...corsHeaders(origin) });
        res.end(body);
        return true;
      } catch {
        /* fall through */
      }
    }
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '';

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(origin));
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/api/health' && req.method === 'GET') {
    json(res, 200, { ok: true, auth: Boolean(getJwtSecret()) }, origin);
    return;
  }

  if (url.pathname === '/api/auth/signup' && req.method === 'POST') {
    try {
      if (!getJwtSecret()) {
        json(res, 503, { error: 'Server missing JWT_SECRET' }, origin);
        return;
      }
      const body = await readBody(req);
      const result = await signup(body);
      json(res, 201, result, origin);
    } catch (e) {
      json(res, 400, { error: e.message }, origin);
    }
    return;
  }

  if (url.pathname === '/api/auth/login' && req.method === 'POST') {
    try {
      if (!getJwtSecret()) {
        json(res, 503, { error: 'Server missing JWT_SECRET' }, origin);
        return;
      }
      const body = await readBody(req);
      const result = await login(body);
      json(res, 200, result, origin);
    } catch (e) {
      json(res, 401, { error: e.message }, origin);
    }
    return;
  }

  if (url.pathname === '/api/auth/me' && req.method === 'GET') {
    const auth = resolveAuth(req);
    if (!auth) {
      unauthorized(res, origin);
      return;
    }
    if (auth.userId === '_legacy') {
      json(res, 200, { user: { id: auth.userId, email: auth.email } }, origin);
      return;
    }
    const user = await getUserById(auth.userId);
    if (!user) {
      unauthorized(res, origin, 'User not found');
      return;
    }
    json(res, 200, { user }, origin);
    return;
  }

  if (url.pathname === '/api/cards') {
    const auth = resolveAuth(req);
    if (!auth) {
      unauthorized(res, origin);
      return;
    }

    if (req.method === 'GET') {
      try {
        const cards = await readCards(auth.userId);
        json(res, 200, cards, origin);
      } catch (e) {
        json(res, 500, { error: e.message }, origin);
      }
      return;
    }

    if (req.method === 'PUT') {
      try {
        const body = await readBody(req);
        const cards = await writeCards(auth.userId, body);
        json(res, 200, { ok: true, count: cards.length }, origin);
      } catch (e) {
        json(res, 400, { error: e.message }, origin);
      }
      return;
    }
  }

  if (req.method === 'GET' && (await serveStatic(req, res, origin))) return;

  json(res, 404, { error: 'Not found' }, origin);
});

server.listen(PORT, () => {
  console.log(`PokéFolio API on http://localhost:${PORT}`);
  if (!getJwtSecret()) {
    console.warn('Set JWT_SECRET (or POKEFOLIO_TOKEN) for auth.');
  }
  if (STATIC_DIR) console.log(`Serving app from ${STATIC_DIR}`);
  console.log(`Users: server/data/users.json`);
  console.log(`Cards: server/data/cards/<user-id>.json`);
});
