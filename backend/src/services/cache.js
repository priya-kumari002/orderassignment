/**
 * Optional Redis cache-aside.
 * If REDIS_URL is unset or Redis is unreachable, all ops become no-ops
 * so the app still runs.
 */
let redis = null;
let enabled = false;

const SUMMARY_KEY = 'dashboard:summary';
const SUMMARY_TTL_SEC = 45;

async function init() {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.log('[cache] REDIS_URL not set — caching disabled');
    return;
  }
  try {
    const Redis = require('ioredis');
    redis = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
    await redis.connect();
    enabled = true;
    console.log('[cache] Redis connected');
  } catch (err) {
    console.warn('[cache] Redis unavailable, continuing without cache:', err.message);
    redis = null;
    enabled = false;
  }
}

async function getJson(key) {
  if (!enabled) return null;
  try {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function setJson(key, value, ttl = SUMMARY_TTL_SEC) {
  if (!enabled) return;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
  } catch (err) {
    console.warn('[cache] set failed', err.message);
  }
}

async function del(key) {
  if (!enabled) return;
  try {
    await redis.del(key);
  } catch (err) {
    console.warn('[cache] del failed', err.message);
  }
}

async function invalidateDashboard() {
  await del(SUMMARY_KEY);
}

module.exports = {
  init,
  getJson,
  setJson,
  del,
  invalidateDashboard,
  SUMMARY_KEY,
  SUMMARY_TTL_SEC,
  isEnabled: () => enabled,
};
