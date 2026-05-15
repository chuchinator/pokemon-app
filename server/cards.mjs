import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const LEGACY_FILE = path.join(DATA_DIR, 'cards.json');
const CARDS_DIR = path.join(DATA_DIR, 'cards');

export function sanitizeCards(data) {
  if (!Array.isArray(data)) return [];
  return data.filter((c) => c && typeof c === 'object' && c.id && c.name);
}

function cardsPath(userId) {
  if (userId === '_legacy') return LEGACY_FILE;
  return path.join(CARDS_DIR, `${userId}.json`);
}

export async function readCards(userId) {
  const file = cardsPath(userId);
  try {
    const raw = await fs.readFile(file, 'utf8');
    return sanitizeCards(JSON.parse(raw));
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

export async function writeCards(userId, cards) {
  const file = cardsPath(userId);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const safe = sanitizeCards(cards);
  await fs.writeFile(file, JSON.stringify(safe, null, 2), 'utf8');
  return safe;
}
