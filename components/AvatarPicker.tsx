"use client";

import { useMemo } from "react";
import clsx from "classnames";

const EMOJIS = ["⚽️", "🏆", "🦊", "🐉", "🦁", "🐺", "👾", "🧠", "⚡️", "🥷", "🛡️", "💎"];
const COLORS = ["#60a5fa", "#34d399", "#fbbf24", "#fb7185", "#a78bfa", "#22c55e", "#f97316"];

type Props = {
  value: string;
  onChange: (next: string) => void;
};

function isHexColor(s: string) {
  return /^#[0-9a-fA-F]{6}$/.test(s);
}

export default function AvatarPicker({ value, onChange }: Props) {
  const selectedIsColor = useMemo(() => (value ? isHexColor(value) : false), [value]);

  return (
    <div className="space-y-3">
      <div className="text-sm text-zinc-400">Выберите аватар</div>

      <div className="flex gap-2 flex-wrap">
        {EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onChange(e)}
            className={clsx(
              "h-10 w-10 rounded-xl border transition",
              value === e
                ? "border-white/70 bg-white/10 scale-105"
                : "border-white/10 bg-white/5 hover:bg-white/10"
            )}
            aria-label={`avatar ${e}`}
          >
            <span className="text-lg leading-none">{e}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={clsx(
              "h-10 w-10 rounded-xl border transition",
              value === c
                ? "border-white/70 bg-white/10 scale-105"
                : "border-white/10 bg-white/5 hover:bg-white/10"
            )}
            aria-label={`avatar color ${c}`}
          >
            <span
              className={clsx("block h-full w-full rounded-xl", selectedIsColor && value === c ? "" : "")}
              style={{
                background: `linear-gradient(135deg, ${c}, rgba(255,255,255,0.08))`,
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

