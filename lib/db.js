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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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
    (r) => r && typeof r === "object" && typeof r.name === "string" && typeof r.date === "string" && DATE_RE.test(r.date)
  );
  if (!roundsOk) return false;
  // Business rule: at most one round per day within a season.
  const dates = s.rounds.map((r) => r.date);
  if (new Set(dates).size !== dates.length) return false;
  if (!s.players || typeof s.players !== "object" || Array.isArray(s.players)) return false;
  return Object.values(s.players).every((scores) => isValidScores(scores, s.rounds.length));
}

/** Validates the multi-season data shape so a bad write can't brick the board. */
export function isValidData(d) {
  return validateData(d) === null;
}

/** Like isValidData but returns a human-readable problem (or null if valid). */
export function validateData(d) {
  if (!d || typeof d !== "object") return "Data must be an object";
  if (!Array.isArray(d.seasons) || d.seasons.length === 0) return "At least one season is required";
  for (const s of d.seasons) {
    if (!isValidSeason(s)) {
      const dates = Array.isArray(s?.rounds) ? s.rounds.map((r) => r?.date) : [];
      if (dates.some((x) => typeof x !== "string" || !DATE_RE.test(x))) {
        return `Season "${s?.name || s?.id || "?"}": every round needs a valid date (YYYY-MM-DD)`;
      }
      if (new Set(dates).size !== dates.length) {
        return `Season "${s?.name || s?.id || "?"}": only one round per day is allowed`;
      }
      return `Season "${s?.name || s?.id || "?"}" is malformed`;
    }
  }
  const ids = d.seasons.map((s) => s.id);
  if (new Set(ids).size !== ids.length) return "Season ids must be unique";
  if (typeof d.activeSeason !== "string" || !ids.includes(d.activeSeason)) return "activeSeason must match a season id";
  return null;
}

function isoUTC(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Migrates stored data forward. Idempotent: returns the input object
 * unchanged (same reference) when nothing needs migrating, so callers can
 * use identity comparison to decide whether to persist.
 *
 * Step 1: v1 ({ rounds: ["R1",...], players }) -> multi-season shape.
 * Step 2: any round with a null date gets a sequential date starting
 *         2026-05-01 (skipping dates already used in that season).
 * Scores, player names, season structure are never modified.
 */
export function migrateData(d) {
  if (!d || typeof d !== "object") return null;
  let data = d;

  if (!Array.isArray(data.seasons)) {
    if (Array.isArray(data.rounds) && data.players && typeof data.players === "object") {
      data = {
        activeSeason: "season-1",
        seasons: [
          {
            id: "season-1",
            name: "Season 1",
            rounds: data.rounds.map((name) => ({ name: String(name), date: null })),
            players: data.players,
          },
        ],
      };
    } else {
      return null;
    }
  }

  const hasNullDates = data.seasons.some((s) => Array.isArray(s.rounds) && s.rounds.some((r) => r && r.date == null));
  if (hasNullDates) {
    data = JSON.parse(JSON.stringify(data));
    for (const s of data.seasons) {
      const used = new Set(s.rounds.map((r) => r.date).filter(Boolean));
      const cursor = new Date(Date.UTC(2026, 4, 1)); // 2026-05-01
      for (const r of s.rounds) {
        if (r.date == null) {
          let iso = isoUTC(cursor);
          while (used.has(iso)) {
            cursor.setUTCDate(cursor.getUTCDate() + 1);
            iso = isoUTC(cursor);
          }
          r.date = iso;
          used.add(iso);
          cursor.setUTCDate(cursor.getUTCDate() + 1);
        }
      }
    }
  }

  return data;
}
