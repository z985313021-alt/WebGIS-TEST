// Redis 连接：验证码与会话共享存储（生产部署用单实例或 Redis Labs）
// 未配置 Redis 时自动降级为内存 Map，保证开发环境可运行
import Ioredis from 'ioredis';

/** @type {Ioredis | null} */
let redis = null;
let memoryFallback = null;   // 降级存储
let usingFallback = false;

function createRedis() {
  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = Number(process.env.REDIS_PORT || 6379);
  const pass = process.env.REDIS_PASS || undefined;
  const db = Number(process.env.REDIS_DB || 0);

  const client = new Ioredis({ host, port, password: pass, db, lazyConnect: true, maxRetriesPerRequest: 1 });

  client.on('error', (err) => {
    // 只在首次连接失败时打印一次，避免刷屏
    if (!usingFallback) {
      console.error('[redis] 连接失败，降级为内存存储:', err.message);
      usingFallback = true;
      memoryFallback = new Map();
    }
  });

  return client;
}

export async function initRedis() {
  redis = createRedis();
  try {
    await redis.connect();
    usingFallback = false;
    console.log(`[redis] 已连接 ${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`);
  } catch (e) {
    usingFallback = true;
    memoryFallback = new Map();
    console.error('[redis] 启动失败，使用内存降级:', e.message);
  }
  return !usingFallback;
}

export function isRedisReady() {
  return !usingFallback && redis?.status === 'ready';
}

/** 带 TTL 的写（毫秒） */
export async function setex(key, ttlMs, value) {
  if (usingFallback || !redis) {
    if (!memoryFallback) memoryFallback = new Map();
    memoryFallback.set(key, { value, exp: Date.now() + ttlMs });
    return;
  }
  await redis.set(key, value, 'PX', ttlMs);
}

export async function get(key) {
  if (usingFallback || !redis) {
    const e = memoryFallback?.get(key);
    if (!e) return null;
    if (e.exp < Date.now()) { memoryFallback.delete(key); return null; }
    return e.value;
  }
  return redis.get(key);
}

export async function del(key) {
  if (usingFallback || !redis) { memoryFallback?.delete(key); return; }
  await redis.del(key);
}

/** 清理过期（内存降级时调用，Redis 自带 TTL） */
export function cleanup() {
  if (!memoryFallback) return;
  const now = Date.now();
  for (const [k, v] of memoryFallback) if (v.exp < now) memoryFallback.delete(k);
}
