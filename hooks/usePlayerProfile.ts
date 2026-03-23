"use client";

import { useEffect, useMemo, useState } from "react";
import type { PlayerProfile } from "@/types/game";

const STORAGE_KEY = "guess_duel_player_profile_v1";

function safeParse(json: string | null) {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function usePlayerProfile() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);

  const derived = useMemo(() => {
    return {
      nickname: profile?.nickname ?? "",
      avatar: profile?.avatar ?? "",
      playerId: profile?.playerId ?? "",
      isReady: !!profile?.nickname && !!profile?.avatar && !!profile?.playerId,
    };
  }, [profile]);

  useEffect(() => {
    const existing = safeParse(localStorage.getItem(STORAGE_KEY));
    if (existing?.playerId && existing?.nickname && existing?.avatar) {
      setProfile(existing as PlayerProfile);
      return;
    }

    const playerId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

    const base: PlayerProfile = {
      playerId,
      nickname: "",
      avatar: "",
    };
    setProfile(base);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(base));
  }, []);

  const update = (patch: Partial<PlayerProfile>) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return { profile, derived, update, setProfile };
}

