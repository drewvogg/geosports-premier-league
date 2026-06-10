import { Redis } from "@upstash/redis";

export const DATA_KEY = "geosports:data";

import { INITIAL } from "./initialDataClient";

export const INITIAL_DATA = INITIAL;

let redis = null;

/**
 * Works with either env-var naming scheme:
 * - UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (Upstash integration)
 * - KV_REST_API_URL / KV_REST_API_TOKEN (legacy Vercel KV naming)
 */
export function getRedis() {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Redis is not configured. Add the Upstash Redis integration on Vercel (or set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN)."
    );
  }
  redis = new Redis({ url, token });
  return redis;
}

/** Basic shape check so a bad write can't brick the board. */
export function isValidData(d) {
  if (!d || typeof d !== "object") return false;
  if (!Array.isArray(d.rounds) || !d.rounds.every((r) => typeof r === "string")) return false;
  if (!d.players || typeof d.players !== "object" || Array.isArray(d.players)) return false;
  const len = d.rounds.length;
  return Object.values(d.players).every(
    (scores) =>
      Array.isArray(scores) &&
      scores.length === len &&
      scores.every((s) => s === null || (typeof s === "number" && Number.isFinite(s)))
  );
}
