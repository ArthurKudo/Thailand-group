import { Redis } from '@upstash/redis';

const hasKv = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

const redis = hasKv
  ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })
  : null;

const memoryStore = globalThis.__thailandiaMemoryStore || (globalThis.__thailandiaMemoryStore = new Map());

export async function getState(key) {
  if (redis) {
    return await redis.get(key);
  }
  return memoryStore.has(key) ? memoryStore.get(key) : null;
}

export async function setState(key, value) {
  if (redis) {
    await redis.set(key, value);
    return;
  }
  memoryStore.set(key, value);
}
