"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase/client";
import type { Category, LeaderboardRow } from "@/types/game";
import PlayerBadge from "@/components/PlayerBadge";

function formatMs(value: number | null | undefined) {
  if (value == null) return "—";
  return `${value} ms`;
}

function formatPlayedAt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function categoryLabel(category: Category) {
  return category === "sport" ? "Спорт" : "Киберспорт";
}

function isHexColor(s: string) {
  return /^#[0-9a-fA-F]{6}$/.test(s);
}

export default function LeaderboardScreen() {
  const [filter, setFilter] = useState<"all" | Category>("all");
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let q = supabase
          .from("leaderboard")
          .select("*")
          .order("total_score", { ascending: false })
          .order("played_at", { ascending: false })
          .limit(20);
        if (filter !== "all") {
          q = q.eq("category", filter);
        }
        const { data } = await q;
        if (!mounted) return;
        setRows((data ?? []) as LeaderboardRow[]);
      } catch (e: unknown) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Ошибка загрузки лидеров");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 6000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [filter]);

  const label = filter === "all" ? "Все" : filter === "sport" ? "Спорт" : "Киберспорт";
  const top3 = rows.slice(0, 3);

  return (
    <div className="min-h-screen bg-[radial-gradient(80%_50%_at_50%_0%,rgba(56,189,248,0.18),rgba(0,0,0,0))] bg-black text-foreground">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-2xl font-black tracking-tight">Глобальные лидеры</div>
            <div className="text-sm text-zinc-400">Top-20 по сумме очков и точности по всем сыгранным матчам.</div>
          </div>
          <a
            href="/"
            className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-sm font-semibold"
          >
            В лобби
          </a>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(["all", "sport", "cyber"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setFilter(v)}
              className={[
                "px-3 py-2 rounded-xl border transition text-sm font-semibold",
                filter === v
                  ? "border-white/30 bg-white/10 text-white"
                  : "border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10",
              ].join(" ")}
            >
              {v === "all" ? "Все" : v === "sport" ? "Спорт" : "Киберспорт"}
            </button>
          ))}
          <div className="ml-auto text-xs text-zinc-500 self-center">{label}</div>
        </div>

        {loading ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-zinc-400">Загрузка таблицы лидеров...</div>
            <div className="mt-3 grid grid-cols-1 gap-2">
              {[0, 1, 2].map((s) => (
                <div key={s} className="h-16 rounded-xl bg-white/5 border border-white/10 animate-pulse" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>
        ) : rows.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-center">
            <div className="text-lg font-bold">Пока нет результатов</div>
            <div className="mt-1 text-sm text-zinc-400">
              Сыграйте первую игру — и здесь появится топ игроков с точностью по миллисекундам.
            </div>
            <a
              href="/"
              className="inline-flex mt-4 px-4 py-2 rounded-xl bg-emerald-500 text-black font-black hover:bg-emerald-400 transition"
            >
              Вернуться в лобби
            </a>
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {top3.map((r, idx) => {
                const rank = idx + 1;
                const style =
                  rank === 1
                    ? "border-emerald-400/40 bg-emerald-500/15"
                    : rank === 2
                    ? "border-sky-400/40 bg-sky-500/15"
                    : "border-fuchsia-400/40 bg-fuchsia-500/15";
                return (
                  <motion.div
                    key={r.id}
                    className={`rounded-2xl border ${style} p-3`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                  >
                    <div className="text-[11px] font-black text-zinc-300">ТОП {rank}</div>
                    <div className="mt-2">
                      <PlayerBadge nickname={r.nickname} avatar={r.avatar} />
                    </div>
                    <div className="mt-2 text-xl font-black">{r.total_score}</div>
                    <div className="text-xs text-zinc-300">avg {formatMs(r.avg_delta_ms)} • best {formatMs(r.best_delta_ms)}</div>
                  </motion.div>
                );
              })}
            </div>

            {/* Mobile cards */}
            <div className="mt-4 md:hidden space-y-2.5">
              {rows.map((r, idx) => (
                <div key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-black text-zinc-400">RANK #{idx + 1}</div>
                    <span
                      className={[
                        "text-[11px] px-2 py-1 rounded-full border font-bold",
                        r.category === "sport"
                          ? "border-sky-400/40 bg-sky-500/15 text-sky-200"
                          : "border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-200",
                      ].join(" ")}
                    >
                      {categoryLabel(r.category)}
                    </span>
                  </div>
                  <div className="mt-2">
                    <PlayerBadge nickname={r.nickname} avatar={r.avatar} />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="text-zinc-400">
                      Общий счет: <span className="text-white font-black">{r.total_score}</span>
                    </div>
                    <div className="text-zinc-400">
                      Средняя точность: <span className="text-sky-200 font-semibold">{formatMs(r.avg_delta_ms)}</span>
                    </div>
                    <div className="text-zinc-400">
                      Лучшая точность: <span className="text-emerald-200 font-semibold">{formatMs(r.best_delta_ms)}</span>
                    </div>
                    <div className="text-zinc-400">
                      Сыграно: <span className="text-zinc-200 font-semibold">{formatPlayedAt(r.played_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="mt-4 hidden md:block rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs uppercase text-zinc-400 bg-black/20">
                      <th className="px-4 py-3">Ранг</th>
                      <th className="px-4 py-3">Никнейм</th>
                      <th className="px-4 py-3">Аватар</th>
                      <th className="px-4 py-3">Общий счет</th>
                      <th className="px-4 py-3">Средняя точность</th>
                      <th className="px-4 py-3">Лучшая точность</th>
                      <th className="px-4 py-3">Категория</th>
                      <th className="px-4 py-3">Сыграно</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => (
                      <tr
                        key={r.id}
                        className={[
                          "border-t border-white/5 hover:bg-white/5 transition",
                          idx === 0
                            ? "bg-emerald-500/10"
                            : idx === 1
                            ? "bg-sky-500/10"
                            : idx === 2
                            ? "bg-fuchsia-500/10"
                            : "",
                        ].join(" ")}
                      >
                        <td className="px-4 py-3 text-sm font-black text-zinc-200">#{idx + 1}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-zinc-100">{r.nickname}</td>
                        <td className="px-4 py-3">
                          <div
                            className="h-8 w-8 rounded-lg border border-white/15 flex items-center justify-center"
                            style={
                              isHexColor(r.avatar)
                                ? { background: `linear-gradient(135deg, ${r.avatar}, rgba(255,255,255,0.08))` }
                                : { background: "rgba(255,255,255,0.06)" }
                            }
                          >
                            {!isHexColor(r.avatar) ? <span className="text-sm">{r.avatar}</span> : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-black">{r.total_score}</td>
                        <td className="px-4 py-3 text-sm text-sky-200">{formatMs(r.avg_delta_ms)}</td>
                        <td className="px-4 py-3 text-sm text-emerald-200">{formatMs(r.best_delta_ms)}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={r.category === "sport" ? "text-sky-200" : "text-fuchsia-200"}>
                            {categoryLabel(r.category)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-400">{formatPlayedAt(r.played_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

