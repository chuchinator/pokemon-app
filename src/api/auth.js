import { SESSION_KEY } from '../constants';
import { getSyncUrl } from './syncConfig';

function wrapNetworkError(err) {
  if (err instanceof TypeError && (err.message || '').includes('fetch')) {
    return new Error(
      'Cannot reach your home server. Start npm run sync:tunnel on your Mac, then refresh.',
    );
  }
  return err;
}

export function hasSyncServer() {
  return Boolean(getSyncUrl());
}

function apiPath(path) {
  return `${getSyncUrl()}${path}`;
}

export function getSessionToken() {
  try {
    return localStorage.getItem(SESSION_KEY) || '';
  } catch {
    return '';
  }
}

export function setSessionToken(token) {
  localStorage.setItem(SESSION_KEY, token);
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(`${SESSION_KEY}_user`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  localStorage.setItem(`${SESSION_KEY}_user`, JSON.stringify(user));
}

export async function signup(email, password) {
  let res;
  try {
    res = await fetch(apiPath('/api/auth/signup'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch (e) {
    throw wrapNetworkError(e);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Signup failed');
  setSessionToken(data.token);
  setStoredUser(data.user);
  return data;
}

export async function login(email, password) {
  let res;
  try {
    res = await fetch(apiPath('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch (e) {
    throw wrapNetworkError(e);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Login failed');
  setSessionToken(data.token);
  setStoredUser(data.user);
  return data;
}

export function logout() {
  clearSession();
  localStorage.removeItem(`${SESSION_KEY}_user`);
}

export async function fetchMe() {
  const token = getSessionToken();
  if (!token) throw new Error('Not logged in');
  const res = await fetch(apiPath('/api/auth/me'), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Session expired');
  setStoredUser(data.user);
  return data.user;
}
