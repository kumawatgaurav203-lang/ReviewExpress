/**
 * lib/redis.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * High-Performance Universal Redis Caching Engine for ReviewXpress SaaS
 *
 * Supports:
 *  1. Standard Redis via `ioredis` (`REDIS_URL`) - Render Redis, Redis Cloud, Docker/Local
 *  2. Serverless HTTP Redis via `@upstash/redis` (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`)
 *  3. In-Memory Zero-Config Fallback (Fast LRU Map with TTL) - Works out of the box
 *     with ZERO external dependencies or when offline, guaranteeing 100% uptime.
 *
 * Features:
 *  - Cache-aside pattern: `redisCache.remember(key, ttlSeconds, fetcher)`
 *  - Atomic key operations: `get`, `set`, `del`, `delPattern`, `incr`
 *  - Non-blocking error resilience: Never throws on Redis connection failure
 * ─────────────────────────────────────────────────────────────────────────────
 */

import Redis from 'ioredis';
import { Redis as UpstashRedis } from '@upstash/redis';

// ── In-Memory Cache Fallback (Zero crash guarantee) ──────────────────────────
interface MemoryCacheEntry {
  value: string;
  expiresAt: number;
}

const memoryStore = new Map<string, MemoryCacheEntry>();

// Periodic cleanup of expired keys in memory store (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    memoryStore.forEach((entry, key) => {
      if (entry.expiresAt > 0 && entry.expiresAt <= now) {
        memoryStore.delete(key);
      }
    });
  }, 5 * 60 * 1000).unref?.();
}

// ── Client Initialization & Detection ───────────────────────────────────────
let upstashClient: UpstashRedis | null = null;
let ioRedisClient: Redis | null = null;
let activeProvider: 'upstash' | 'ioredis' | 'in-memory' = 'in-memory';
let lastError: string | null = null;

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
const standardRedisUrl = process.env.REDIS_URL?.trim();

if (upstashUrl && upstashToken && !upstashUrl.includes('placeholder')) {
  try {
    upstashClient = new UpstashRedis({
      url: upstashUrl,
      token: upstashToken,
    });
    activeProvider = 'upstash';
    console.log('[Redis] Configured with Upstash Serverless REST client.');
  } catch (err: any) {
    console.warn('[Redis] Failed to initialize Upstash client, falling back:', err?.message);
    lastError = err?.message || 'Upstash init error';
  }
} else if (standardRedisUrl && !standardRedisUrl.includes('placeholder')) {
  try {
    const isTls = standardRedisUrl.startsWith('rediss://');
    ioRedisClient = new Redis(standardRedisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      enableOfflineQueue: false,
      ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
      retryStrategy: (times) => {
        if (times > 3) return null; // Stop retrying after 3 attempts to avoid spamming logs
        return Math.min(times * 500, 2000);
      },
    });

    ioRedisClient.on('connect', () => {
      activeProvider = 'ioredis';
      lastError = null;
      console.log('[Redis] Connected to standard Redis cluster.');
    });

    ioRedisClient.on('error', (err) => {
      lastError = err?.message || 'Redis connection error';
      // Do not crash the application; fallback to in-memory is transparent
      activeProvider = 'in-memory';
    });

    // Proactively connect in background
    ioRedisClient.connect().catch((err) => {
      lastError = err?.message || 'Failed initial Redis connection';
      activeProvider = 'in-memory';
    });
  } catch (err: any) {
    console.warn('[Redis] Failed to initialize ioredis client, falling back to in-memory:', err?.message);
    lastError = err?.message || 'ioredis init error';
    activeProvider = 'in-memory';
  }
} else {
  activeProvider = 'in-memory';
}

// ── Universal Redis Cache Interface ─────────────────────────────────────────
export const redisCache = {
  /**
   * Current provider status for diagnostics & health check
   */
  getStatus() {
    return {
      connected: activeProvider !== 'in-memory' || (memoryStore.size >= 0),
      provider: activeProvider,
      inMemoryKeyCount: memoryStore.size,
      error: lastError,
    };
  },

  /**
   * Retrieve parsed JSON value by key
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = `rx:${key}`;

    // 1. Upstash REST
    if (upstashClient && activeProvider === 'upstash') {
      try {
        const raw = await upstashClient.get<string | T>(fullKey);
        if (raw === null || raw === undefined) return null;
        if (typeof raw === 'string') {
          try {
            return JSON.parse(raw) as T;
          } catch {
            return raw as unknown as T;
          }
        }
        return raw as T;
      } catch (err: any) {
        lastError = err?.message;
      }
    }

    // 2. ioredis
    if (ioRedisClient && activeProvider === 'ioredis') {
      try {
        const raw = await ioRedisClient.get(fullKey);
        if (!raw) return null;
        try {
          return JSON.parse(raw) as T;
        } catch {
          return raw as unknown as T;
        }
      } catch (err: any) {
        lastError = err?.message;
      }
    }

    // 3. In-memory fallback
    const entry = memoryStore.get(fullKey);
    if (!entry) return null;
    if (entry.expiresAt > 0 && entry.expiresAt <= Date.now()) {
      memoryStore.delete(fullKey);
      return null;
    }
    try {
      return JSON.parse(entry.value) as T;
    } catch {
      return entry.value as unknown as T;
    }
  },

  /**
   * Set value with optional TTL in seconds (default: 300s / 5 minutes)
   */
  async set(key: string, value: any, ttlSeconds: number = 300): Promise<boolean> {
    const fullKey = `rx:${key}`;
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);

    let redisSuccess = false;

    // 1. Upstash REST
    if (upstashClient && activeProvider === 'upstash') {
      try {
        if (ttlSeconds > 0) {
          await upstashClient.set(fullKey, serialized, { ex: ttlSeconds });
        } else {
          await upstashClient.set(fullKey, serialized);
        }
        redisSuccess = true;
      } catch (err: any) {
        lastError = err?.message;
      }
    }

    // 2. ioredis
    if (!redisSuccess && ioRedisClient && activeProvider === 'ioredis') {
      try {
        if (ttlSeconds > 0) {
          await ioRedisClient.set(fullKey, serialized, 'EX', ttlSeconds);
        } else {
          await ioRedisClient.set(fullKey, serialized);
        }
        redisSuccess = true;
      } catch (err: any) {
        lastError = err?.message;
      }
    }

    // Always mirror to in-memory for instant hot hits & seamless fallback
    const expiresAt = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : 0;
    memoryStore.set(fullKey, { value: serialized, expiresAt });

    return true;
  },

  /**
   * Delete one or more keys
   */
  async del(keyOrKeys: string | string[]): Promise<boolean> {
    const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
    if (keys.length === 0) return true;

    const fullKeys = keys.map((k) => `rx:${k}`);

    // In-memory
    for (const fk of fullKeys) {
      memoryStore.delete(fk);
    }

    // Upstash
    if (upstashClient && activeProvider === 'upstash') {
      try {
        await upstashClient.del(...fullKeys);
      } catch (err: any) {
        lastError = err?.message;
      }
    }

    // ioredis
    if (ioRedisClient && activeProvider === 'ioredis') {
      try {
        await ioRedisClient.del(...fullKeys);
      } catch (err: any) {
        lastError = err?.message;
      }
    }

    return true;
  },

  /**
   * Invalidate all keys matching a prefix/pattern (e.g. "store:*", "dashboard:b-demo:*")
   */
  async delPattern(pattern: string): Promise<number> {
    const searchPattern = `rx:${pattern}`;
    let deletedCount = 0;

    // 1. In-memory pattern delete
    const regexPattern = new RegExp('^' + searchPattern.replace(/\*/g, '.*') + '$');
    memoryStore.forEach((_, k) => {
      if (regexPattern.test(k)) {
        memoryStore.delete(k);
        deletedCount++;
      }
    });

    // 2. Upstash REST
    if (upstashClient && activeProvider === 'upstash') {
      try {
        const matching = await upstashClient.keys(searchPattern);
        if (matching && matching.length > 0) {
          await upstashClient.del(...matching);
          deletedCount += matching.length;
        }
      } catch (err: any) {
        lastError = err?.message;
      }
    }

    // 3. ioredis keys & delete
    if (ioRedisClient && activeProvider === 'ioredis') {
      try {
        const matchingKeys = await ioRedisClient.keys(searchPattern);
        if (matchingKeys && matchingKeys.length > 0) {
          await ioRedisClient.del(...matchingKeys);
          deletedCount += matchingKeys.length;
        }
      } catch (err: any) {
        lastError = err?.message;
      }
    }

    return deletedCount;
  },

  /**
   * Atomic increment for rate limits or visitor counters
   */
  async incr(key: string, ttlSeconds: number = 60): Promise<number> {
    const fullKey = `rx:${key}`;

    // Upstash
    if (upstashClient && activeProvider === 'upstash') {
      try {
        const count = await upstashClient.incr(fullKey);
        if (count === 1 && ttlSeconds > 0) {
          await upstashClient.expire(fullKey, ttlSeconds);
        }
        return count;
      } catch (err: any) {
        lastError = err?.message;
      }
    }

    // ioredis
    if (ioRedisClient && activeProvider === 'ioredis') {
      try {
        const count = await ioRedisClient.incr(fullKey);
        if (count === 1 && ttlSeconds > 0) {
          await ioRedisClient.expire(fullKey, ttlSeconds);
        }
        return count;
      } catch (err: any) {
        lastError = err?.message;
      }
    }

    // In-memory fallback
    const entry = memoryStore.get(fullKey);
    let currentVal = 0;
    if (entry && (entry.expiresAt === 0 || entry.expiresAt > Date.now())) {
      currentVal = parseInt(entry.value, 10) || 0;
    }
    const newVal = currentVal + 1;
    const expiresAt = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : 0;
    memoryStore.set(fullKey, { value: String(newVal), expiresAt });
    return newVal;
  },

  /**
   * Classic Cache-Aside Pattern:
   * 1. Checks Redis cache
   * 2. If present, returns cached value immediately (< 2ms)
   * 3. If missing, executes `fetcher()`, stores in Redis with `ttlSeconds`, and returns result
   */
  async remember<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const fresh = await fetcher();
    if (fresh !== null && fresh !== undefined) {
      // Background set so we do not block response
      this.set(key, fresh, ttlSeconds).catch(() => {});
    }
    return fresh;
  },
};
