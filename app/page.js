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

function buildLeaderboard(data) {
  const rows = Object.entries(data.players).map(([name, scores]) => ({ name, scores, ...computeStats(scores) }));
  rows.sort((a, b) => b.avg - a.avg);
  rows.forEach((r, i) => (r.rank = i + 1));
  return {
    premier: rows.filter((r) => r.avg >= PREMIER_CUTOFF && r.games > 0),
    champ: rows.filter((r) => r.avg < PREMIER_CUTOFF || r.games === 0),
    rounds: data.rounds,
  };
}

const medals = { 1: "\u{1F947}", 2: "\u{1F948}", 3: "\u{1F949}" };

function PlayerRow({ player, league }) {
  const accent = league === "premier" ? "#FFD700" : "#4AE68A";
  const cardBg = league === "premier" ? "#111D35" : "#162119";
  const border = league === "premier" ? "rgba(255,215,0,0.1)" : "rgba(74,230,138,0.1)";
  const avBg = league === "premier" ? "rgba(255,215,0,0.15)" : "rgba(74,230,138,0.12)";
  const avBorder = league === "premier" ? "rgba(255,215,0,0.35)" : "rgba(74,230,138,0.3)";
  const rankColor = player.rank === 1 ? "#FFD700" : player.rank === 2 ? "#C0C0C0" : player.rank === 3 ? "#CD7F32" : "#556677";
  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "46px 1fr 55px 70px 60px 60px 70px", gap: "0.3rem", alignItems: "center", padding: "0.8rem 1rem", borderRadius: "12px", marginBottom: "0.35rem", background: cardBg, border: `1px solid ${border}`, transition: "transform 0.2s, box-shadow 0.2s", cursor: "default" }}
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
      <div style={{ textAlign: "center", fontSize: "0.9rem", color: "#5BE8A0" }}>{player.best}</div>
      <div style={{ textAlign: "center", fontSize: "0.85rem", color: "#FF4D6A" }}>{player.worst}</div>
      <div style={{ textAlign: "center", fontSize: "0.9rem", color: "#8899AA" }}>{player.total.toLocaleString()}</div>
    </div>
  );
}

function LeagueSection({ title, badge, badgeGrad, desc, players, league, accentColor }) {
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
      {players.map((p) => <PlayerRow key={p.name} player={p} league={league} />)}
    </div>
  );
}

function AddScoresPanel({ data, onSave }) {
  const [open, setOpen] = useState(false);
  const [roundName, setRoundName] = useState("");
  const [scores, setScores] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setRoundName(`R${data.rounds.length + 1}`);
    const init = {};
    Object.keys(data.players).forEach((n) => (init[n] = ""));
    setScores(init);
  }, [data, open]);

  const handleSave = async () => {
    setSaving(true);
    const nd = JSON.parse(JSON.stringify(data));
    nd.rounds.push(roundName || `R${nd.rounds.length + 1}`);
    Object.keys(nd.players).forEach((name) => {
      const v = scores[name];
      const num = v && v.trim() !== "" ? parseInt(v, 10) : null;
      nd.players[name].push(isNaN(num) ? null : num);
    });
    const ok = await onSave(nd);
    setSaving(false);
    setMsg(ok ? "\u2705 Scores saved!" : "\u26A0\uFE0F Save failed — are you still logged in?");
    setTimeout(() => { setMsg(""); if (ok) setOpen(false); }, 1500);
  };

  const handleAddPlayer = () => {
    const name = prompt("Enter new player name:");
    if (!name || name.trim() === "") return;
    const t = name.trim();
    if (data.players[t]) { alert("Player already exists!"); return; }
    const nd = JSON.parse(JSON.stringify(data));
    nd.players[t] = new Array(nd.rounds.length).fill(null);
    onSave(nd);
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
      {Object.keys(data.players).sort().map((name) => (
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

function ResetButton({ onReset }) {
  const [confirm, setConfirm] = useState(false);
  if (confirm) {
    return (
      <div style={{ textAlign: "center", marginTop: "1rem" }}>
        <span style={{ color: "#FF4D6A", fontSize: "0.85rem", marginRight: "0.8rem" }}>Reset all data?</span>
        <button onClick={() => { onReset(); setConfirm(false); }} style={{ background: "#FF4D6A", color: "#fff", border: "none", padding: "0.35rem 1rem", borderRadius: 6, fontSize: "0.8rem", cursor: "pointer", fontWeight: 600, marginRight: "0.4rem" }}>Yes, reset</button>
        <button onClick={() => setConfirm(false)} style={{ background: "transparent", color: "#8899AA", border: "1px solid #334455", padding: "0.35rem 0.8rem", borderRadius: 6, fontSize: "0.8rem", cursor: "pointer" }}>Cancel</button>
      </div>
    );
  }
  return (
    <div style={{ textAlign: "center", marginTop: "1rem" }}>
      <button onClick={() => setConfirm(true)} style={{ background: "transparent", color: "#556677", border: "none", fontSize: "0.75rem", cursor: "pointer", textDecoration: "underline", fontWeight: 300 }}>Reset to original data</button>
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

  const saveData = async (nd) => {
    const prev = data;
    setData(nd); // optimistic
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

  const { premier, champ, rounds } = buildLeaderboard(data);
  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse 80% 50% at 20% 20%, rgba(255,215,0,0.03) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(74,230,138,0.02) 0%, transparent 70%), #060D18", color: "#F0F0F0", fontFamily: "'Barlow Condensed', sans-serif", padding: "2rem 1.5rem 3rem" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ fontSize: "2.8rem", marginBottom: "0.2rem", filter: "drop-shadow(0 0 20px rgba(255,215,0,0.4))" }}>🌍</div>
          <h1 style={{ fontFamily: "'Oswald',sans-serif", fontSize: "3rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", background: "linear-gradient(135deg, #FFD700, #FFA500, #FFD700)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", margin: 0 }}>GeoSports</h1>
          <p style={{ fontSize: "1rem", fontWeight: 300, color: "#8899AA", letterSpacing: "0.25em", textTransform: "uppercase", marginTop: "0.2rem" }}>Season Leaderboard — {rounds.length} Rounds</p>
        </div>
        {premier.length > 0 && <LeagueSection title="Premier League" badge="P" badgeGrad="linear-gradient(135deg, #FFD700, #FFA500)" desc={`Top tier — Average score ${PREMIER_CUTOFF}+`} players={premier} league="premier" accentColor="#FFD700" />}
        {champ.length > 0 && <LeagueSection title="Championship League" badge="C" badgeGrad="linear-gradient(135deg, #4AE68A, #2DBD6E)" desc="Grinding for promotion" players={champ} league="champ" accentColor="#4AE68A" />}
        {admin && <AddScoresPanel data={data} onSave={saveData} />}
        {admin && <ResetButton onReset={() => saveData(INITIAL)} />}
        <AdminBar admin={admin} onLogin={handleLogin} onLogout={handleLogout} />
        <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.72rem", color: "#556677", fontWeight: 300, letterSpacing: "0.1em" }}>{rounds.length} rounds played  ·  Ranked by average score  ·  Premier cutoff: {PREMIER_CUTOFF}+ avg</div>
      </div>
    </div>
  );
}
