/**
 * Minimal personal sync API — one JSON file, one secret token.
 *
 *   POKEFOLIO_TOKEN=your-secret node server/index.mjs
 *
 * Optional: serve the built app from the same port (no CORS setup):
 *   STATIC_DIR=dist POKEFOLIO_TOKEN=your-secret node server/index.mjs
 */
import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'cards.json');
const PORT = Number(process.env.PORT) || 3456;
const TOKEN = process.env.POKEFOLIO_TOKEN || '';
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
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
  }
  const list = allowedOrigins();
  const match = origin && list.includes(origin) ? origin : null;
  const headers = {
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  if (match) headers['Access-Control-Allow-Origin'] = match;
  return headers;
}

function unauthorized(res, extra = {}) {
  res.writeHead(401, { 'Content-Type': 'application/json', ...extra });
  res.end(JSON.stringify({ error: 'Unauthorized' }));
}

function checkAuth(req, res, origin) {
  if (!TOKEN) {
    res.writeHead(503, {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    });
    res.end(JSON.stringify({ error: 'Server missing POKEFOLIO_TOKEN' }));
    return false;
  }
  const header = req.headers.authorization || '';
  const expected = `Bearer ${TOKEN}`;
  if (header !== expected) {
    unauthorized(res, corsHeaders(origin));
    return false;
  }
  return true;
}

function sanitizeCards(data) {
  if (!Array.isArray(data)) return [];
  return data.filter((c) => c && typeof c === 'object' && c.id && c.name);
}

async function readCards() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    return sanitizeCards(JSON.parse(raw));
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

async function writeCards(cards) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const safe = sanitizeCards(cards);
  await fs.writeFile(DATA_FILE, JSON.stringify(safe, null, 2), 'utf8');
  return safe;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : [];
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
        res.writeHead(200, {
          'Content-Type': 'text/html',
          ...corsHeaders(origin),
        });
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
  const headers = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (url.pathname === '/api/cards') {
    if (req.method === 'GET') {
      if (!checkAuth(req, res, origin)) return;
      try {
        const cards = await readCards();
        res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
        res.end(JSON.stringify(cards));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json', ...headers });
        res.end(JSON.stringify({ error: e.message }));
      }
      return;
    }

    if (req.method === 'PUT') {
      if (!checkAuth(req, res, origin)) return;
      try {
        const body = await readBody(req);
        const cards = await writeCards(body);
        res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
        res.end(JSON.stringify({ ok: true, count: cards.length }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...headers });
        res.end(JSON.stringify({ error: e.message }));
      }
      return;
    }
  }

  if (req.method === 'GET' && (await serveStatic(req, res, origin))) return;

  res.writeHead(404, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`PokéFolio sync API on http://localhost:${PORT}`);
  if (!TOKEN) {
    console.warn('Set POKEFOLIO_TOKEN before saving data.');
  }
  if (STATIC_DIR) {
    console.log(`Serving app from ${STATIC_DIR}`);
  }
  console.log(`Data file: ${DATA_FILE}`);
});
