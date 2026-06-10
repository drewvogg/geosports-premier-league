import { Redis } from "@upstash/redis";
import { INITIAL } from "./initialDataClient";

export const DATA_KEY = "geosports:data";
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

function isValidScores(scores, len) {
  return (
    Array.isArray(scores) &&
    scores.length === len &&
    scores.every((s) => s === null || (typeof s === "number" && Number.isFinite(s)))
  );
}

function isValidSeason(s) {
  if (!s || typeof s !== "object") return false;
  if (typeof s.id !== "string" || !s.id) return false;
  if (typeof s.name !== "string" || !s.name) return false;
  if (!Array.isArray(s.rounds)) return false;
  const roundsOk = s.rounds.every(
    (r) =>
      r && typeof r === "object" &&
      typeof r.name === "string" &&
      (r.date === null || (typeof r.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.date)))
  );
  if (!roundsOk) return false;
  if (!s.players || typeof s.players !== "object" || Array.isArray(s.players)) return false;
  return Object.values(s.players).every((scores) => isValidScores(scores, s.rounds.length));
}

/** Validates the multi-season data shape so a bad write can't brick the board. */
export function isValidData(d) {
  if (!d || typeof d !== "object") return false;
  if (!Array.isArray(d.seasons) || d.seasons.length === 0) return false;
  if (!d.seasons.every(isValidSeason)) return false;
  const ids = d.seasons.map((s) => s.id);
  if (new Set(ids).size !== ids.length) return false;
  return typeof d.activeSeason === "string" && ids.includes(d.activeSeason);
}

/**
 * Migrates v1 data ({ rounds: ["R1",...], players: {...} }) to the
 * multi-season shape. Returns the input unchanged if already migrated.
 */
export function migrateData(d) {
  if (!d || typeof d !== "object") return null;
  if (Array.isArray(d.seasons)) return d; // already v2
  if (Array.isArray(d.rounds) && d.players && typeof d.players === "object") {
    return {
      activeSeason: "season-1",
      seasons: [
        {
          id: "season-1",
          name: "Season 1",
          rounds: d.rounds.map((name) => ({ name: String(name), date: null })),
          players: d.players,
        },
      ],
    };
  }
  return null;
}
