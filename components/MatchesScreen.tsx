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
  if (status === "upcoming") return "Скоро";
  return "Завершён";
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
    <div className="gd-page">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">Матчи</h1>
            <p className="text-zinc-200 mt-1">
              Выберите матч, сторону и предсказывайте события в реальном эфире.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/leaderboard" className="gd-btn-secondary text-sm">
              Глобальные лидеры
            </Link>
            <div className="h-10 w-10 rounded-full border border-white/20 bg-white/10 flex items-center justify-center">
              <span className="text-sm">🏅</span>
            </div>
          </div>
        </div>

        <div className="gd-card-soft mt-5">
          <div className="text-sm font-semibold text-white">Как играть</div>
          <ol className="mt-2 text-sm text-zinc-100 list-decimal pl-5 space-y-1">
            <li>Откройте матч и выберите команду, за которую болеете.</li>
            <li>Создайте комнату по матчу или войдите в существующую.</li>
            <li>Смотрите трансляцию и нажмите «СЕЙЧАС!» в момент целевого события.</li>
          </ol>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по командам"
            className="gd-input w-full md:max-w-md"
          />
          <div className="-mx-1 overflow-x-auto">
            <div className="flex gap-2 px-1 min-w-max">
              {MATCH_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={[
                    "h-9 px-3 rounded-full border text-xs font-bold transition whitespace-nowrap",
                    category === c.id
                      ? "border-blue-300/50 bg-blue-600/80 text-white"
                      : "border-white/20 bg-white/10 text-zinc-100 hover:bg-white/20",
                  ].join(" ")}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((m) => (
            <div
              key={m.id}
              className={[
                "gd-card min-h-[148px]",
                m.status === "live" ? "shadow-[0_18px_38px_rgba(239,68,68,0.18)]" : "",
              ].join(" ")}
            >
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
                <Link href={`/match/${m.slug}`} className="gd-btn-primary inline-flex">
                  Играть
                </Link>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="gd-card-soft mt-5 border-dashed">
            {MATCHES.length === 0 ? (
              <>
                <div className="font-semibold text-white">Сейчас нет доступных матчей</div>
                <div className="text-sm text-zinc-300 mt-1">
                  Проверьте позже или переключите категорию.
                </div>
              </>
            ) : (
              <>
                <div className="font-semibold text-white">Ничего не найдено</div>
                <div className="text-sm text-zinc-300 mt-1">
                  Попробуйте другое название команды или лиги.
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
