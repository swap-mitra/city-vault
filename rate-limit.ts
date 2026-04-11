import { NextResponse } from "next/server";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  bucket: string;
  key: string;
  max: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

const globalForRateLimit = globalThis as typeof globalThis & {
  __cityVaultRateLimitStore?: Map<string, Map<string, RateLimitEntry>>;
};

const store = globalForRateLimit.__cityVaultRateLimitStore ?? new Map();
globalForRateLimit.__cityVaultRateLimitStore = store;

function getBucketStore(bucket: string) {
  let bucketStore = store.get(bucket);

  if (!bucketStore) {
    bucketStore = new Map<string, RateLimitEntry>();
    store.set(bucket, bucketStore);
  }

  return bucketStore;
}

export function getRequestIdentity(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();

  return forwardedFor || realIp || "unknown";
}

export function consumeRateLimit({ bucket, key, max, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const bucketStore = getBucketStore(bucket);
  const existing = bucketStore.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    bucketStore.set(key, { count: 1, resetAt });

    return {
      allowed: true,
      limit: max,
      remaining: Math.max(0, max - 1),
      resetAt,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  existing.count += 1;
  bucketStore.set(key, existing);

  const allowed = existing.count <= max;
  const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

  return {
    allowed,
    limit: max,
    remaining: allowed ? Math.max(0, max - existing.count) : 0,
    resetAt: existing.resetAt,
    retryAfterSeconds,
  };
}

export function createRateLimitResponse(result: RateLimitResult, message: string) {
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.floor(result.resetAt / 1000)),
      },
    }
  );
}

export function resetRateLimitStore() {
  store.clear();
}