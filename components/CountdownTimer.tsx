"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import clsx from "classnames";
import type { Round } from "@/types/game";
import { msToCountdown } from "@/lib/game/time";

type Props = {
  round: Round;
};

export default function CountdownTimer({ round }: Props) {
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
