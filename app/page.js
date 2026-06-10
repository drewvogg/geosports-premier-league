"use client";

import { useState, useEffect, useCallback } from "react";
import { INITIAL } from "@/lib/initialDataClient";

const PREMIER_CUTOFF = 850;

function computeStats(scores) {
  const valid = scores.filter((s) => s !== null && s !== undefined);
  if (valid.length === 0) return { games: 0, total: 0, avg: 0, best: 0, worst: 0 };
  const total = valid.reduce((a, b) => a + b, 0);
  return {
    games: valid.length,
    total,
    avg: Math.round((total / valid.length) * 10) / 10,
    best: Math.max(...valid),
    worst: Math.min(...valid),
  };
}

function buildLeaderboard(season) {
  const rows = Object.entries(season.players).map(([name, scores]) => ({ name, scores, ...computeStats(scores) }));
  rows.sort((a, b) => b.avg - a.avg);
  rows.forEach((r, i) => (r.rank = i + 1));
  return {
    premier: rows.filter((r) => r.avg >= PREMIER_CUTOFF && r.games > 0),
    champ: rows.filter((r) => r.avg < PREMIER_CUTOFF || r.games === 0),
    rounds: season.rounds,
  };
}

/**
 * Reorders a season's rounds chronologically (keeping every player's score
 * array in lockstep). Undated legacy rounds stay first in their original
 * order; dated rounds sort by date; ties keep insertion order.
 */
function sortSeason(season) {
  const idx = season.rounds.map((_, i) => i);
  idx.sort((a, b) => {
    const da = season.rounds[a].date;
    const db = season.rounds[b].date;
    if (da === db) return a - b;
    if (da === null) return -1;
    if (db === null) return 1;
    return da < db ? -1 : da > db ? 1 : a - b;
  });
  const players = {};
  Object.entries(season.players).forEach(([n, arr]) => { players[n] = idx.map((i) => arr[i]); });
  return { ...season, rounds: idx.map((i) => season.rounds[i]), players };
}

function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const medals = { 1: "\u{1F947}", 2: "\u{1F948}", 3: "\u{1F949}" };

function PlayerRow({ player, league, onSelect }) {
  const accent = league === "premier" ? "#FFD700" : "#4AE68A";
  const cardBg = league === "premier" ? "#111D35" : "#162119";
  const border = league === "premier" ? "rgba(255,215,0,0.1)" : "rgba(74,230,138,0.1)";
  const avBg = league === "premier" ? "rgba(255,215,0,0.15)" : "rgba(74,230,138,0.12)";
  const avBorder = league === "premier" ? "rgba(255,215,0,0.35)" : "rgba(74,230,138,0.3)";
  const rankColor = player.rank === 1 ? "#FFD700" : player.rank === 2 ? "#C0C0C0" : player.rank === 3 ? "#CD7F32" : "#556677";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(player)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(player); } }}
      style={{ display: "grid", gridTemplateColumns: "46px 1fr 55px 70px 60px 60px 70px", gap: "0.3rem", alignItems: "center", padding: "0.8rem 1rem", borderRadius: "12px", marginBottom: "0.35rem", background: cardBg, border: `1px solid ${border}`, transition: "transform 0.2s, box-shadow 0.2s", cursor: "pointer" }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 6px 25px ${border}`; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ textAlign: "center", fontSize: medals[player.rank] ? "1.4rem" : "1.3rem", fontFamily: "'Oswald',sans-serif", fontWeight: 700, color: rankColor }}>{medals[player.rank] || player.rank}</div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: avBg, border: `2px solid ${avBorder}`, color: accent, fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: "0.95rem", flexShrink: 0 }}>{player.name[0]}</div>
        <span style={{ fontFamily: "'Oswald',sans-serif", fontSize: "1.1rem", fontWeight: 600, letterSpacing: "0.03em" }}>{player.name}</span>
      </div>
      <div style={{ textAlign: "center", fontSize: "0.9rem", color: "#8899AA" }}>{player.games}</div>
      <div style={{ textAlign: "center", fontSize: "1.1rem", fontFamily: "'Oswald',sans-serif", fontWeight: 700, color: accent }}>{player.avg.toFixed(1)}</div>
      <div style={{ textAlign: "center", fontSize: "0.9rem", color: "#5BE8A0" }}>{player.games ? player.best : "—"}</div>
      <div style={{ textAlign: "center", fontSize: "0.85rem", color: "#FF4D6A" }}>{player.games ? player.worst : "—"}</div>
      <div style={{ textAlign: "center", fontSize: "0.9rem", color: "#8899AA" }}>{player.total.toLocaleString()}</div>
    </div>
  );
}

function LeagueSection({ title, badge, badgeGrad, desc, players, league, accentColor, onSelect }) {
  return (
    <div style={{ marginBottom: "2.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", paddingBottom: "0.6rem", borderBottom: `2px solid ${accentColor}`, marginBottom: "0.8rem" }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: badgeGrad, color: league === "premier" ? "#1A1000" : "#0A1A10", fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: "1.1rem", boxShadow: `0 0 18px ${accentColor}44` }}>{badge}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: "1.5rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: accentColor }}>{title}</div>
          <div style={{ fontSize: "0.8rem", color: "#556677", fontWeight: 300, letterSpacing: "0.04em" }}>{desc}</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "46px 1fr 55px 70px 60px 60px 70px", gap: "0.3rem", padding: "0 1rem 0.4rem", fontSize: "0.65rem", fontWeight: 600, color: "#556677", textTransform: "uppercase", letterSpacing: "0.15em" }}>
        <span>#</span><span>Player</span><span style={{ textAlign: "center" }}>Games</span><span style={{ textAlign: "center" }}>Avg</span><span style={{ textAlign: "center" }}>Best</span><span style={{ textAlign: "center" }}>Worst</span><span style={{ textAlign: "center" }}>Total</span>
      </div>
      {players.map((p) => <PlayerRow key={p.name} player={p} league={league} onSelect={onSelect} />)}
    </div>
  );
}

function SeasonBar({ seasons, activeId, viewId, onView }) {
  return (
    <div style={{ display: "flex", gap: "0.45rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "2rem" }}>
      {seasons.map((s) => {
        const isViewing = s.id === viewId;
        const isLive = s.id === activeId;
        return (
          <button
            key={s.id}
            onClick={() => onView(s.id)}
            style={{
              background: isViewing ? "rgba(255,215,0,0.12)" : "transparent",
              color: isViewing ? "#FFD700" : "#8899AA",
              border: `1px solid ${isViewing ? "rgba(255,215,0,0.4)" : "#22304A"}`,
              padding: "0.45rem 1rem",
              borderRadius: 999,
              fontFamily: "'Oswald',sans-serif",
              fontSize: "0.85rem",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
            }}
          >
            {s.name}
            {isLive && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4AE68A", boxShadow: "0 0 8px #4AE68A", display: "inline-block" }} />}
          </button>
        );
      })}
    </div>
  );
}

function PlayerProfileModal({ player, league, rounds, seasonName, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const accent = league === "premier" ? "#FFD700" : "#4AE68A";
  const avBg = league === "premier" ? "rgba(255,215,0,0.15)" : "rgba(74,230,138,0.12)";
  const avBorder = league === "premier" ? "rgba(255,215,0,0.35)" : "rgba(74,230,138,0.3)";
  const played = player.scores.filter((s) => s !== null && s !== undefined);
  const MAX_SCORE = 1000; // GeoSports daily max

  const stat = (label, value, color) => (
    <div style={{ textAlign: "center", flex: 1, minWidth: 70 }}>
      <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: "1.3rem", fontWeight: 700, color: color || "#F0F0F0" }}>{value}</div>
      <div style={{ fontSize: "0.65rem", color: "#556677", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600 }}>{label}</div>
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(2,6,14,0.8)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#0C1626", border: `1px solid ${avBorder}`, borderRadius: 16, padding: "1.5rem", width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto", boxShadow: `0 10px 60px rgba(0,0,0,0.6), 0 0 40px ${accent}11` }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.9rem", marginBottom: "1.1rem" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: avBg, border: `2px solid ${avBorder}`, color: accent, fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: "1.4rem", flexShrink: 0 }}>{player.name[0]}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: "1.5rem", fontWeight: 700, letterSpacing: "0.04em" }}>{player.name}</div>
            <div style={{ fontSize: "0.78rem", color: "#556677", textTransform: "uppercase", letterSpacing: "0.1em" }}>{medals[player.rank] || `#${player.rank}`} · {league === "premier" ? "Premier League" : "Championship League"} · {seasonName}</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "transparent", color: "#8899AA", border: "1px solid #334455", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: "1rem", lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ display: "flex", gap: "0.4rem", background: "#111D35", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "0.8rem 0.5rem", marginBottom: "1.2rem", flexWrap: "wrap" }}>
          {stat("Games", player.games)}
          {stat("Avg", player.games ? player.avg.toFixed(1) : "—", accent)}
          {stat("Best", player.games ? player.best : "—", "#5BE8A0")}
          {stat("Worst", player.games ? player.worst : "—", "#FF4D6A")}
          {stat("Total", player.total.toLocaleString())}
        </div>

        <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "#556677", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "0.5rem" }}>Reported scores — all {rounds.length} rounds</div>
        {rounds.length === 0 && <div style={{ color: "#556677", fontSize: "0.9rem", textAlign: "center", padding: "1rem 0" }}>No rounds played yet this season.</div>}
        {rounds.map((round, i) => {
          const score = player.scores[i];
          const isPlayed = score !== null && score !== undefined;
          const isBest = isPlayed && played.length > 0 && score === player.best;
          const isWorst = isPlayed && played.length > 1 && score === player.worst;
          const barColor = isBest ? "#5BE8A0" : isWorst ? "#FF4D6A" : accent;
          const dateLabel = fmtDate(round.date);
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "92px 1fr 64px", gap: "0.7rem", alignItems: "center", padding: "0.45rem 0.6rem", borderRadius: 8, marginBottom: "0.2rem", background: isPlayed ? "rgba(255,255,255,0.02)" : "transparent" }}>
              <span style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 600, fontSize: "0.85rem", color: "#8899AA", whiteSpace: "nowrap" }}>
                {round.name}{dateLabel && <span style={{ color: "#445566", fontWeight: 400, fontSize: "0.72rem" }}> · {dateLabel}</span>}
              </span>
              <div style={{ height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 4, overflow: "hidden" }}>
                {isPlayed && <div style={{ height: "100%", width: `${Math.max(2, Math.min(100, (score / MAX_SCORE) * 100))}%`, background: barColor, borderRadius: 4, opacity: 0.85 }} />}
              </div>
              <span style={{ textAlign: "right", fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: "0.95rem", color: isPlayed ? barColor : "#3A4A5C" }}>
                {isPlayed ? score : "DNP"}{isBest ? " ★" : ""}
              </span>
            </div>
          );
        })}
        {rounds.length > 0 && <div style={{ marginTop: "0.8rem", fontSize: "0.68rem", color: "#556677", textAlign: "center", letterSpacing: "0.06em" }}>DNP = did not play · ★ season best · bars scaled to {MAX_SCORE.toLocaleString()}-pt daily max</div>}
      </div>
    </div>
  );
}

function AddScoresPanel({ season, onSaveSeason }) {
  const [open, setOpen] = useState(false);
  const [roundName, setRoundName] = useState("");
  const [roundDate, setRoundDate] = useState(todayISO());
  const [scores, setScores] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setRoundName(`R${season.rounds.length + 1}`);
    setRoundDate(todayISO());
    const init = {};
    Object.keys(season.players).forEach((n) => (init[n] = ""));
    setScores(init);
  }, [season, open]);

  const handleSave = async () => {
    setSaving(true);
    const ns = JSON.parse(JSON.stringify(season));
    ns.rounds.push({ name: roundName || `R${ns.rounds.length + 1}`, date: roundDate || null });
    Object.keys(ns.players).forEach((name) => {
      const v = scores[name];
      const num = v && v.trim() !== "" ? parseInt(v, 10) : null;
      ns.players[name].push(isNaN(num) ? null : num);
    });
    const ok = await onSaveSeason(sortSeason(ns));
    setSaving(false);
    setMsg(ok ? "\u2705 Scores saved!" : "\u26A0\uFE0F Save failed — are you still logged in?");
    setTimeout(() => { setMsg(""); if (ok) setOpen(false); }, 1500);
  };

  const handleAddPlayer = () => {
    const name = prompt("Enter new player name:");
    if (!name || name.trim() === "") return;
    const t = name.trim();
    if (season.players[t]) { alert("Player already exists!"); return; }
    const ns = JSON.parse(JSON.stringify(season));
    ns.players[t] = new Array(ns.rounds.length).fill(null);
    onSaveSeason(ns);
  };

  if (!open) {
    return (
      <div style={{ display: "flex", gap: "0.6rem", justifyContent: "center", marginTop: "1.5rem", flexWrap: "wrap" }}>
        <button onClick={() => setOpen(true)} style={{ background: "linear-gradient(135deg, #FFD700, #FFA500)", color: "#1A1000", border: "none", padding: "0.7rem 1.8rem", borderRadius: 10, fontFamily: "'Oswald',sans-serif", fontSize: "1rem", fontWeight: 700, cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase", boxShadow: "0 0 20px rgba(255,215,0,0.25)", transition: "transform 0.15s" }} onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.04)")} onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}>+ Add Round Scores</button>
        <button onClick={handleAddPlayer} style={{ background: "transparent", color: "#4AE68A", border: "1px solid rgba(74,230,138,0.3)", padding: "0.7rem 1.5rem", borderRadius: 10, fontFamily: "'Oswald',sans-serif", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase", transition: "background 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(74,230,138,0.08)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>+ Add Player</button>
      </div>
    );
  }
  return (
    <div style={{ background: "#111D35", border: "1px solid rgba(255,215,0,0.15)", borderRadius: 14, padding: "1.5rem", marginTop: "1.5rem", maxWidth: 500, margin: "1.5rem auto 0" }}>
      <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: "1.2rem", fontWeight: 700, color: "#FFD700", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>Add Scores — {roundName}</div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "0.9rem" }}>
        <span style={{ width: 80, fontFamily: "'Oswald',sans-serif", fontWeight: 600, fontSize: "0.9rem", color: "#8899AA", textTransform: "uppercase", letterSpacing: "0.06em" }}>Date</span>
        <input type="date" value={roundDate} onChange={(e) => setRoundDate(e.target.value)} style={{ flex: 1, background: "#0A1628", border: "1px solid rgba(255,215,0,0.2)", borderRadius: 8, padding: "0.5rem 0.8rem", color: "#F0F0F0", fontFamily: "'Barlow Condensed',sans-serif", fontSize: "1rem", outline: "none", colorScheme: "dark" }} onFocus={(e) => (e.target.style.borderColor = "#FFD700")} onBlur={(e) => (e.target.style.borderColor = "rgba(255,215,0,0.2)")} />
      </div>
      {Object.keys(season.players).sort().map((name) => (
        <div key={name} style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "0.6rem" }}>
          <span style={{ width: 80, fontFamily: "'Oswald',sans-serif", fontWeight: 600, fontSize: "1rem", color: "#F0F0F0" }}>{name}</span>
          <input type="number" placeholder="—" value={scores[name] || ""} onChange={(e) => setScores((prev) => ({ ...prev, [name]: e.target.value }))} style={{ flex: 1, background: "#0A1628", border: "1px solid rgba(255,215,0,0.2)", borderRadius: 8, padding: "0.5rem 0.8rem", color: "#F0F0F0", fontFamily: "'Barlow Condensed',sans-serif", fontSize: "1rem", outline: "none" }} onFocus={(e) => (e.target.style.borderColor = "#FFD700")} onBlur={(e) => (e.target.style.borderColor = "rgba(255,215,0,0.2)")} />
        </div>
      ))}
      <div style={{ display: "flex", gap: "0.6rem", marginTop: "1rem" }}>
        <button onClick={handleSave} disabled={saving} style={{ flex: 1, background: "linear-gradient(135deg, #FFD700, #FFA500)", color: "#1A1000", border: "none", padding: "0.65rem", borderRadius: 8, fontFamily: "'Oswald',sans-serif", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.06em", opacity: saving ? 0.6 : 1 }}>{saving ? "Saving..." : "Save Scores"}</button>
        <button onClick={() => setOpen(false)} style={{ background: "transparent", color: "#8899AA", border: "1px solid #334455", padding: "0.65rem 1.2rem", borderRadius: 8, fontFamily: "'Oswald',sans-serif", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", textTransform: "uppercase" }}>Cancel</button>
      </div>
      {msg && <div style={{ textAlign: "center", marginTop: "0.6rem", color: msg.startsWith("\u2705") ? "#4AE68A" : "#FF4D6A", fontWeight: 600 }}>{msg}</div>}
    </div>
  );
}

function EditRoundPanel({ season, onSaveSeason }) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [scores, setScores] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const loadRound = useCallback((i, s) => {
    const r = s.rounds[i];
    if (!r) return;
    setIdx(i);
    setName(r.name);
    setDate(r.date || "");
    const init = {};
    Object.keys(s.players).forEach((n) => {
      const v = s.players[n][i];
      init[n] = v === null || v === undefined ? "" : String(v);
    });
    setScores(init);
  }, []);

  useEffect(() => {
    if (open) loadRound(Math.min(idx, Math.max(0, season.rounds.length - 1)), season);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, season]);

  if (season.rounds.length === 0) return null;

  if (!open) {
    return (
      <div style={{ textAlign: "center", marginTop: "0.7rem" }}>
        <button onClick={() => { setOpen(true); loadRound(season.rounds.length - 1, season); }} style={{ background: "transparent", color: "#8899AA", border: "1px solid #334455", padding: "0.55rem 1.4rem", borderRadius: 10, fontFamily: "'Oswald',sans-serif", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase" }}>✎ Edit Past Rounds</button>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    let ns = JSON.parse(JSON.stringify(season));
    ns.rounds[idx] = { name: name.trim() || ns.rounds[idx].name, date: date || null };
    Object.keys(ns.players).forEach((n) => {
      const v = scores[n];
      const num = v && v.trim() !== "" ? parseInt(v, 10) : null;
      ns.players[n][idx] = isNaN(num) ? null : num;
    });
    ns = sortSeason(ns);
    const ok = await onSaveSeason(ns);
    setSaving(false);
    setMsg(ok ? "\u2705 Round updated!" : "\u26A0\uFE0F Save failed — are you still logged in?");
    setTimeout(() => { setMsg(""); if (ok) setOpen(false); }, 1500);
  };

  const handleDelete = async () => {
    const r = season.rounds[idx];
    if (!window.confirm(`Delete ${r.name}${r.date ? ` (${fmtDate(r.date)})` : ""} and ALL its scores? This can't be undone.`)) return;
    const ns = JSON.parse(JSON.stringify(season));
    ns.rounds.splice(idx, 1);
    Object.keys(ns.players).forEach((n) => ns.players[n].splice(idx, 1));
    const ok = await onSaveSeason(ns);
    if (ok) setOpen(false);
    else { setMsg("\u26A0\uFE0F Delete failed"); setTimeout(() => setMsg(""), 1500); }
  };

  return (
    <div style={{ background: "#111D35", border: "1px solid rgba(136,153,170,0.2)", borderRadius: 14, padding: "1.5rem", marginTop: "1rem", maxWidth: 500, margin: "1rem auto 0" }}>
      <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: "1.2rem", fontWeight: 700, color: "#8899AA", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>Edit Round</div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "0.9rem" }}>
        <span style={{ width: 80, fontFamily: "'Oswald',sans-serif", fontWeight: 600, fontSize: "0.9rem", color: "#8899AA", textTransform: "uppercase", letterSpacing: "0.06em" }}>Round</span>
        <select value={idx} onChange={(e) => loadRound(parseInt(e.target.value, 10), season)} style={{ flex: 1, background: "#0A1628", border: "1px solid rgba(136,153,170,0.25)", borderRadius: 8, padding: "0.5rem 0.8rem", color: "#F0F0F0", fontFamily: "'Barlow Condensed',sans-serif", fontSize: "1rem", outline: "none" }}>
          {season.rounds.map((r, i) => (
            <option key={i} value={i}>{r.name}{r.date ? ` · ${fmtDate(r.date)}` : " · no date"}</option>
          ))}
        </select>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "0.9rem" }}>
        <span style={{ width: 80, fontFamily: "'Oswald',sans-serif", fontWeight: 600, fontSize: "0.9rem", color: "#8899AA", textTransform: "uppercase", letterSpacing: "0.06em" }}>Name</span>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1, background: "#0A1628", border: "1px solid rgba(136,153,170,0.25)", borderRadius: 8, padding: "0.5rem 0.8rem", color: "#F0F0F0", fontFamily: "'Barlow Condensed',sans-serif", fontSize: "1rem", outline: "none" }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "0.9rem" }}>
        <span style={{ width: 80, fontFamily: "'Oswald',sans-serif", fontWeight: 600, fontSize: "0.9rem", color: "#8899AA", textTransform: "uppercase", letterSpacing: "0.06em" }}>Date</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ flex: 1, background: "#0A1628", border: "1px solid rgba(136,153,170,0.25)", borderRadius: 8, padding: "0.5rem 0.8rem", color: "#F0F0F0", fontFamily: "'Barlow Condensed',sans-serif", fontSize: "1rem", outline: "none", colorScheme: "dark" }} />
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "0.9rem 0", paddingTop: "0.9rem" }}>
        {Object.keys(season.players).sort().map((n) => (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "0.6rem" }}>
            <span style={{ width: 80, fontFamily: "'Oswald',sans-serif", fontWeight: 600, fontSize: "1rem", color: "#F0F0F0" }}>{n}</span>
            <input type="number" placeholder="DNP" value={scores[n] || ""} onChange={(e) => setScores((prev) => ({ ...prev, [n]: e.target.value }))} style={{ flex: 1, background: "#0A1628", border: "1px solid rgba(136,153,170,0.25)", borderRadius: 8, padding: "0.5rem 0.8rem", color: "#F0F0F0", fontFamily: "'Barlow Condensed',sans-serif", fontSize: "1rem", outline: "none" }} onFocus={(e) => (e.target.style.borderColor = "#8899AA")} onBlur={(e) => (e.target.style.borderColor = "rgba(136,153,170,0.25)")} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "0.6rem", marginTop: "1rem" }}>
        <button onClick={handleSave} disabled={saving} style={{ flex: 1, background: "linear-gradient(135deg, #FFD700, #FFA500)", color: "#1A1000", border: "none", padding: "0.65rem", borderRadius: 8, fontFamily: "'Oswald',sans-serif", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.06em", opacity: saving ? 0.6 : 1 }}>{saving ? "Saving..." : "Save Changes"}</button>
        <button onClick={handleDelete} style={{ background: "transparent", color: "#FF4D6A", border: "1px solid rgba(255,77,106,0.35)", padding: "0.65rem 1rem", borderRadius: 8, fontFamily: "'Oswald',sans-serif", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", textTransform: "uppercase" }}>Delete</button>
        <button onClick={() => setOpen(false)} style={{ background: "transparent", color: "#8899AA", border: "1px solid #334455", padding: "0.65rem 1.2rem", borderRadius: 8, fontFamily: "'Oswald',sans-serif", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", textTransform: "uppercase" }}>Close</button>
      </div>
      <div style={{ marginTop: "0.7rem", fontSize: "0.7rem", color: "#556677", textAlign: "center" }}>Blank score = DNP · changing the date re-sorts rounds chronologically</div>
      {msg && <div style={{ textAlign: "center", marginTop: "0.6rem", color: msg.startsWith("\u2705") ? "#4AE68A" : "#FF4D6A", fontWeight: 600 }}>{msg}</div>}
    </div>
  );
}

function CommissionerTools({ data, onSave, onReset }) {
  const [confirmReset, setConfirmReset] = useState(false);

  const handleNewSeason = async () => {
    const n = data.seasons.length + 1;
    const name = prompt("Name for the new season:", `Season ${n}`);
    if (!name || name.trim() === "") return;
    const active = data.seasons.find((s) => s.id === data.activeSeason);
    const roster = {};
    Object.keys(active.players).forEach((p) => (roster[p] = []));
    const id = `season-${Date.now()}`;
    const nd = JSON.parse(JSON.stringify(data));
    nd.seasons.push({ id, name: name.trim(), rounds: [], players: roster });
    nd.activeSeason = id;
    await onSave(nd, id);
  };

  return (
    <div style={{ textAlign: "center", marginTop: "1.4rem" }}>
      <button onClick={handleNewSeason} style={{ background: "transparent", color: "#FFD700", border: "1px solid rgba(255,215,0,0.3)", padding: "0.5rem 1.2rem", borderRadius: 8, fontFamily: "'Oswald',sans-serif", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase" }}>⚑ Start New Season</button>
      <div style={{ marginTop: "0.9rem" }}>
        {confirmReset ? (
          <span>
            <span style={{ color: "#FF4D6A", fontSize: "0.85rem", marginRight: "0.8rem" }}>Reset ALL seasons &amp; scores?</span>
            <button onClick={() => { onReset(); setConfirmReset(false); }} style={{ background: "#FF4D6A", color: "#fff", border: "none", padding: "0.35rem 1rem", borderRadius: 6, fontSize: "0.8rem", cursor: "pointer", fontWeight: 600, marginRight: "0.4rem" }}>Yes, reset</button>
            <button onClick={() => setConfirmReset(false)} style={{ background: "transparent", color: "#8899AA", border: "1px solid #334455", padding: "0.35rem 0.8rem", borderRadius: 6, fontSize: "0.8rem", cursor: "pointer" }}>Cancel</button>
          </span>
        ) : (
          <button onClick={() => setConfirmReset(true)} style={{ background: "transparent", color: "#556677", border: "none", fontSize: "0.75rem", cursor: "pointer", textDecoration: "underline", fontWeight: 300 }}>Reset to original data</button>
        )}
      </div>
    </div>
  );
}

function AdminBar({ admin, onLogin, onLogout }) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setErr("");
    const ok = await onLogin(pw);
    setBusy(false);
    if (ok) { setOpen(false); setPw(""); }
    else setErr("Wrong password");
  };

  if (admin) {
    return (
      <div style={{ textAlign: "center", marginTop: "1.2rem", fontSize: "0.8rem", color: "#8899AA" }}>
        Logged in as commissioner{" "}
        <button onClick={onLogout} style={{ background: "transparent", color: "#FFD700", border: "none", cursor: "pointer", textDecoration: "underline", fontSize: "0.8rem" }}>Log out</button>
      </div>
    );
  }
  if (!open) {
    return (
      <div style={{ textAlign: "center", marginTop: "1.2rem" }}>
        <button onClick={() => setOpen(true)} style={{ background: "transparent", color: "#556677", border: "none", fontSize: "0.78rem", cursor: "pointer", textDecoration: "underline", fontWeight: 300 }}>Commissioner login</button>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", alignItems: "center", marginTop: "1.2rem", flexWrap: "wrap" }}>
      <input
        type="password"
        placeholder="Admin password"
        value={pw}
        autoFocus
        onChange={(e) => setPw(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        style={{ background: "#0A1628", border: "1px solid rgba(255,215,0,0.25)", borderRadius: 8, padding: "0.45rem 0.8rem", color: "#F0F0F0", fontFamily: "'Barlow Condensed',sans-serif", fontSize: "0.95rem", outline: "none", width: 180 }}
      />
      <button onClick={submit} disabled={busy} style={{ background: "linear-gradient(135deg, #FFD700, #FFA500)", color: "#1A1000", border: "none", padding: "0.45rem 1rem", borderRadius: 8, fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", textTransform: "uppercase", opacity: busy ? 0.6 : 1 }}>{busy ? "..." : "Log in"}</button>
      <button onClick={() => { setOpen(false); setErr(""); }} style={{ background: "transparent", color: "#8899AA", border: "1px solid #334455", padding: "0.45rem 0.8rem", borderRadius: 8, fontSize: "0.85rem", cursor: "pointer" }}>Cancel</button>
      {err && <span style={{ color: "#FF4D6A", fontSize: "0.85rem", width: "100%", textAlign: "center" }}>{err}</span>}
    </div>
  );
}

export default function GeoSportsLeaderboard() {
  const [data, setData] = useState(null);
  const [admin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewSeasonId, setViewSeasonId] = useState(null);
  const [selected, setSelected] = useState(null); // { player, league }

  const loadData = useCallback(async () => {
    try {
      const r = await fetch("/api/data", { cache: "no-store" });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Failed to load");
      setData(json.data);
      setAdmin(json.admin);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const saveData = async (nd, switchViewTo) => {
    const prev = data;
    setData(nd); // optimistic
    if (switchViewTo) setViewSeasonId(switchViewTo);
    try {
      const r = await fetch("/api/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nd),
      });
      if (!r.ok) throw new Error();
      return true;
    } catch {
      setData(prev); // roll back
      return false;
    }
  };

  const handleLogin = async (password) => {
    try {
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!r.ok) return false;
      setAdmin(true);
      return true;
    } catch {
      return false;
    }
  };

  const handleLogout = async () => {
    try { await fetch("/api/logout", { method: "POST" }); } catch {}
    setAdmin(false);
  };

  if (loading) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#060D18", color: "#FFD700", fontFamily: "'Oswald',sans-serif", fontSize: "1.5rem" }}>Loading leaderboard...</div>;
  }
  if (error) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#060D18", color: "#FF4D6A", fontFamily: "'Oswald',sans-serif", fontSize: "1.1rem", padding: "2rem", textAlign: "center" }}>{error}</div>;
  }
  if (!data) return null;

  const viewId = viewSeasonId && data.seasons.some((s) => s.id === viewSeasonId) ? viewSeasonId : data.activeSeason;
  const season = data.seasons.find((s) => s.id === viewId);
  const isLiveSeason = viewId === data.activeSeason;
  const { premier, champ, rounds } = buildLeaderboard(season);

  // Saving edits to the currently viewed season writes it back into the full dataset.
  const saveSeason = (ns) => {
    const nd = JSON.parse(JSON.stringify(data));
    nd.seasons = nd.seasons.map((s) => (s.id === ns.id ? ns : s));
    return saveData(nd);
  };

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse 80% 50% at 20% 20%, rgba(255,215,0,0.03) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(74,230,138,0.02) 0%, transparent 70%), #060D18", color: "#F0F0F0", fontFamily: "'Barlow Condensed', sans-serif", padding: "2rem 1.5rem 3rem" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "1.6rem" }}>
          <div style={{ fontSize: "2.8rem", marginBottom: "0.2rem", filter: "drop-shadow(0 0 20px rgba(255,215,0,0.4))" }}>🌍</div>
          <h1 style={{ fontFamily: "'Oswald',sans-serif", fontSize: "3rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", background: "linear-gradient(135deg, #FFD700, #FFA500, #FFD700)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", margin: 0 }}>GeoSports</h1>
          <p style={{ fontSize: "1rem", fontWeight: 300, color: "#8899AA", letterSpacing: "0.25em", textTransform: "uppercase", marginTop: "0.2rem" }}>{season.name} — {rounds.length} Round{rounds.length === 1 ? "" : "s"}{isLiveSeason ? "" : " (Archived)"}</p>
        </div>
        {data.seasons.length > 1 && <SeasonBar seasons={data.seasons} activeId={data.activeSeason} viewId={viewId} onView={setViewSeasonId} />}
        {rounds.length === 0 && (
          <div style={{ textAlign: "center", color: "#556677", padding: "2rem 0 1rem", fontSize: "1rem", letterSpacing: "0.05em" }}>
            Fresh season — no rounds yet. {admin ? "Add the first round below." : "Check back after the first round!"}
          </div>
        )}
        {premier.length > 0 && <LeagueSection title="Premier League" badge="P" badgeGrad="linear-gradient(135deg, #FFD700, #FFA500)" desc={`Top tier — Average score ${PREMIER_CUTOFF}+`} players={premier} league="premier" accentColor="#FFD700" onSelect={(p) => setSelected({ player: p, league: "premier" })} />}
        {champ.length > 0 && rounds.length > 0 && <LeagueSection title="Championship League" badge="C" badgeGrad="linear-gradient(135deg, #4AE68A, #2DBD6E)" desc="Grinding for promotion" players={champ} league="champ" accentColor="#4AE68A" onSelect={(p) => setSelected({ player: p, league: "champ" })} />}
        {selected && <PlayerProfileModal player={selected.player} league={selected.league} rounds={rounds} seasonName={season.name} onClose={() => setSelected(null)} />}
        {admin && isLiveSeason && <AddScoresPanel season={season} onSaveSeason={saveSeason} />}
        {admin && !isLiveSeason && <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.85rem", color: "#556677" }}>Viewing an archived season — you can still edit its past rounds below, but new rounds go to the live season.</div>}
        {admin && <EditRoundPanel season={season} onSaveSeason={saveSeason} />}
        {admin && <CommissionerTools data={data} onSave={saveData} onReset={() => saveData(INITIAL, "season-1")} />}
        <AdminBar admin={admin} onLogin={handleLogin} onLogout={handleLogout} />
        <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.72rem", color: "#556677", fontWeight: 300, letterSpacing: "0.1em" }}>{rounds.length} rounds played  ·  Ranked by average score  ·  Premier cutoff: {PREMIER_CUTOFF}+ avg</div>
      </div>
    </div>
  );
}
