"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import clsx from "classnames";
import type { Round } from "@/types/game";
import { msToCountdown } from "@/lib/game/time";

type Props = {
  round: Round;
  /** compact = служебная полоска, не главный ориентир интерфейса (second-screen) */
  variant?: "compact" | "default";
};

export default function CountdownTimer({ round, variant = "compact" }: Props) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (round.status !== "running" || !round.started_at) return;
    const id = setInterval(() => setNowMs(Date.now()), 50);
    return () => clearInterval(id);
  }, [round.status, round.started_at]);

  const { remainingMs, progress } = useMemo(() => {
    if (!round.started_at) {
      return { remainingMs: round.duration_ms, progress: 0 };
    }
    const startedMs = new Date(round.started_at).getTime();
    const elapsed = nowMs - startedMs;
    const rem = round.duration_ms - elapsed;
    const clampedElapsed = Math.max(0, elapsed);
    const p = Math.min(1, Math.max(0, clampedElapsed / round.duration_ms));
    return { remainingMs: rem, progress: p };
  }, [nowMs, round.duration_ms, round.started_at]);

  const countdown = msToCountdown(Math.round(remainingMs));

  const urgency = progress > 0.75;

  if (variant === "compact") {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Окно приёма нажатий между игроками
            </div>
            <div className="text-xs text-zinc-400 mt-0.5">
              Это не таймер матча на эфире — ориентируйтесь на трансляцию.
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[11px] text-zinc-500">осталось</div>
            <div
              className={clsx(
                "text-sm font-bold tabular-nums",
                urgency ? "text-amber-200" : "text-zinc-300"
              )}
            >
              {countdown.seconds}.{String(countdown.tenths)} с
            </div>
          </div>
        </div>
        <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-zinc-500/80 to-zinc-400/60"
            style={{ width: `${progress * 100}%` }}
            initial={false}
            animate={{ width: `${progress * 100}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
      </div>
    );
  }

  // Legacy / dev: полный вид (если где-то понадобится)
  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-xs text-zinc-400">Внутренний таймер раунда</div>
          <div className={clsx("text-3xl font-black tracking-tight", urgency && "text-red-400")}>
            {countdown.seconds}.{String(countdown.tenths)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-zinc-400">Подсказка</div>
          <div
            className={clsx("text-sm font-semibold", urgency ? "text-red-300" : "text-emerald-200")}
          >
            Нажмите в момент события
          </div>
        </div>
      </div>

      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400"
          style={{ width: `${progress * 100}%` }}
          initial={false}
          animate={{ width: `${progress * 100}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}
