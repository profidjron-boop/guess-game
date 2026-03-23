"use client";

import clsx from "classnames";

type Props = {
  nickname: string;
  avatar: string;
  compact?: boolean;
};

function isHexColor(s: string) {
  return /^#[0-9a-fA-F]{6}$/.test(s);
}

export default function PlayerBadge({ nickname, avatar, compact }: Props) {
  const isColor = isHexColor(avatar);
  return (
    <div className={clsx("flex items-center gap-2", compact && "gap-1")}>
      <div
        className={clsx(
          "h-9 w-9 rounded-xl border flex items-center justify-center",
          compact ? "h-7 w-7 rounded-lg" : ""
        )}
        style={
          isColor
            ? {
                background: `linear-gradient(135deg, ${avatar}, rgba(255,255,255,0.08))`,
              }
            : { background: "rgba(255,255,255,0.06)" }
        }
      >
        {!isColor ? <span className="text-lg leading-none">{avatar}</span> : null}
      </div>
      <div className={clsx("text-sm font-semibold", compact && "text-xs")}>{nickname}</div>
    </div>
  );
}

