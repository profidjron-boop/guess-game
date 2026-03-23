"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Category, LeaderboardRow } from "@/types/game";
import PlayerBadge from "@/components/PlayerBadge";

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-zinc-950 text-foreground">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-2xl font-black tracking-tight">Глобальные лидеры</div>
            <div className="text-sm text-zinc-400">Топ-20 по сумме очков. Фильтр по категории.</div>
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

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs uppercase text-zinc-400 bg-black/20">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Игрок</th>
                  <th className="px-4 py-3">Очки</th>
                  <th className="px-4 py-3">Средняя точность</th>
                  <th className="px-4 py-3">Лучшая точность</th>
                  <th className="px-4 py-3">Категория</th>
                  <th className="px-4 py-3">Дата</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-zinc-400">
                      Загрузка...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-red-300">
                      {error}
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-zinc-500">
                      Пока нет записей в leaderboard.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, idx) => (
                    <tr key={r.id} className="border-t border-white/5 hover:bg-white/5 transition">
                      <td className="px-4 py-3 text-sm font-semibold text-zinc-300">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <PlayerBadge nickname={r.nickname} avatar={r.avatar} compact />
                      </td>
                      <td className="px-4 py-3 text-sm font-black">{r.total_score}</td>
                      <td className="px-4 py-3 text-sm text-zinc-200">{r.avg_delta_ms} мс</td>
                      <td className="px-4 py-3 text-sm text-emerald-200">{r.best_delta_ms} мс</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={r.category === "sport" ? "text-sky-200" : "text-fuchsia-200"}>
                          {r.category === "sport" ? "Спорт" : "Киберспорт"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        {new Date(r.played_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

