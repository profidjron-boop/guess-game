"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  MATCH_CATEGORIES,
  MATCHES,
  categoryLabel,
  type MatchCategory,
} from "@/lib/matches/catalog";

function statusLabel(status: "live" | "upcoming" | "finished") {
  if (status === "live") return "LIVE";
  if (status === "upcoming") return "UPCOMING";
  return "FINISHED";
}

function statusClass(status: "live" | "upcoming" | "finished") {
  if (status === "live") return "border-emerald-400/40 bg-emerald-500/20 text-emerald-100";
  if (status === "upcoming") return "border-sky-400/40 bg-sky-500/20 text-sky-100";
  return "border-zinc-400/40 bg-zinc-500/20 text-zinc-100";
}

export default function MatchesScreen() {
  const [category, setCategory] = useState<"all" | MatchCategory>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MATCHES.filter((m) => {
      if (category !== "all" && m.category !== category) return false;
      if (!q) return true;
      return (
        m.title.toLowerCase().includes(q) ||
        m.homeTeam.toLowerCase().includes(q) ||
        m.awayTeam.toLowerCase().includes(q) ||
        m.league.toLowerCase().includes(q)
      );
    });
  }, [category, query]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-700 text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
              Матчи и события
            </h1>
            <p className="text-zinc-200 mt-1">
              Выберите матч, сторону и предсказывайте события в реальном эфире.
            </p>
          </div>
          <Link
            href="/leaderboard"
            className="px-4 py-2 rounded-xl border border-white/25 bg-white/15 hover:bg-white/25 font-semibold text-sm"
          >
            Глобальные лидеры
          </Link>
        </div>

        <div className="mt-5 rounded-2xl border border-white/20 bg-white/12 p-4">
          <div className="text-sm font-semibold text-white">Как играть</div>
          <ol className="mt-2 text-sm text-zinc-100 list-decimal pl-5 space-y-1">
            <li>Откройте матч и выберите команду, за которую болеете.</li>
            <li>Создайте комнату по матчу или войдите в существующую.</li>
            <li>Смотрите трансляцию и нажмите «СЕЙЧАС!» в момент целевого события.</li>
          </ol>
        </div>

        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по командам и турнирам"
            className="w-full md:max-w-md px-3 py-2.5 rounded-xl bg-white text-zinc-900 placeholder:text-zinc-500 border border-zinc-300 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-300/40"
          />
          <div className="flex flex-wrap gap-2">
            {MATCH_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={[
                  "px-3 py-2 rounded-xl border text-xs font-bold transition",
                  category === c.id
                    ? "border-white/35 bg-white/25 text-white"
                    : "border-white/20 bg-white/10 text-zinc-100 hover:bg-white/20",
                ].join(" ")}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((m) => (
            <div key={m.id} className="rounded-2xl border border-white/20 bg-white/12 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-zinc-300">
                    {categoryLabel(m.category)} • {m.league}
                  </div>
                  <div className="mt-1 text-xl font-black text-white">
                    {m.homeTeam} — {m.awayTeam}
                  </div>
                </div>
                <span
                  className={[
                    "text-[11px] px-2 py-1 rounded-full border font-black",
                    statusClass(m.status),
                  ].join(" ")}
                >
                  {statusLabel(m.status)}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-3 text-zinc-100">
                <div className="h-10 w-10 rounded-xl border border-white/25 bg-white/10 flex items-center justify-center text-lg">
                  {m.homeTeamLogo}
                </div>
                <div className="text-sm font-bold">vs</div>
                <div className="h-10 w-10 rounded-xl border border-white/25 bg-white/10 flex items-center justify-center text-lg">
                  {m.awayTeamLogo}
                </div>
                <div className="ml-auto text-xs text-zinc-300">
                  Событие:{" "}
                  <span className="font-semibold text-zinc-100">{m.modes[0]?.label ?? "—"}</span>
                </div>
              </div>

              <div className="mt-4">
                <Link
                  href={`/match/${m.slug}`}
                  className="inline-flex px-4 py-2.5 rounded-xl bg-emerald-500 text-black font-black hover:bg-emerald-400 transition"
                >
                  Открыть матч
                </Link>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-white/25 bg-white/10 p-5 text-zinc-100">
            Ничего не найдено. Попробуйте изменить фильтр или поисковый запрос.
          </div>
        ) : null}
      </div>
    </div>
  );
}
