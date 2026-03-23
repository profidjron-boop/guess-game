"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import AvatarPicker from "@/components/AvatarPicker";
import PlayerBadge from "@/components/PlayerBadge";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import type { Room } from "@/types/game";

function generateRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export default function LobbyScreen() {
  const router = useRouter();
  const { profile, derived, update } = usePlayerProfile();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingRooms(true);
      try {
        const { data } = await supabase
          .from("rooms")
          .select("*")
          .eq("status", "waiting")
          .order("created_at", { ascending: false })
          .limit(12);
        if (!mounted) return;
        setRooms((data ?? []) as Room[]);
      } finally {
        if (mounted) setLoadingRooms(false);
      }
    };
    load();
    const id = setInterval(load, 3500);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const canProceed = derived.isReady;

  const persistProfile = () => {
    // localStorage already updated by hook; nothing to do
  };

  const createRoom = async () => {
    if (!profile) return;
    setError(null);
    setBusy(true);
    try {
      await persistProfile();

      // Retry code a few times to avoid collision.
      let createdRoom: Room | null = null;
      for (let attempt = 0; attempt < 5 && !createdRoom; attempt++) {
        const code = generateRoomCode();
        const { data: roomRow, error: roomErr } = await supabase
          .from("rooms")
          .insert({
            code,
            status: "waiting",
            host_id: profile.playerId,
            current_round: 0,
            total_rounds: 5,
          })
          .select("*")
          .single();

        if (roomErr) continue;
        createdRoom = roomRow as Room;
        // Insert host as a participant.
        const { error: pErr } = await supabase.from("participants").upsert(
          {
            room_id: createdRoom.id,
            player_id: profile.playerId,
            nickname: profile.nickname,
            avatar: profile.avatar,
            connected: true,
            ready: false,
          },
          { onConflict: "room_id,player_id" }
        );
        if (pErr) throw pErr;
      }

      if (!createdRoom) throw new Error("Не удалось создать комнату. Попробуйте ещё раз.");

      router.push(`/room/${createdRoom.code}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Ошибка";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const joinRoom = async (code: string) => {
    if (!profile) return;
    setError(null);
    setBusy(true);
    try {
      const { data: roomRow, error: roomErr } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", code)
        .single();
      if (roomErr || !roomRow) throw roomErr ?? new Error("Комната не найдена");
      const room = roomRow as Room;

      const { error: pErr } = await supabase.from("participants").upsert(
        {
          room_id: room.id,
          player_id: profile.playerId,
          nickname: profile.nickname,
          avatar: profile.avatar,
          connected: true,
          ready: false,
        },
        { onConflict: "room_id,player_id" }
      );
      if (pErr) throw pErr;

      router.push(`/room/${room.code}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Ошибка входа в комнату";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const nicknameValue = profile?.nickname ?? "";
  const avatarValue = profile?.avatar ?? "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-zinc-950 text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-2xl font-black tracking-tight">Guess Duel</div>
            <div className="text-sm text-zinc-400">Угадай момент события. Считай точность. Побеждай.</div>
          </div>
          <a
            href="/leaderboard"
            className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-sm font-semibold"
          >
            Лидеры
          </a>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
            <div className="text-lg font-bold">Профиль игрока</div>
            <div className="mt-3 space-y-3">
              <label className="block">
                <div className="text-sm text-zinc-400 mb-1">Никнейм</div>
                <input
                  value={nicknameValue}
                  onChange={(e) => update({ nickname: e.target.value })}
                  placeholder="Например: Flash"
                  className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-white/25"
                />
              </label>

              <AvatarPicker value={avatarValue} onChange={(a) => update({ avatar: a })} />

              <div className="flex gap-3 items-center pt-2">
                {nicknameValue && avatarValue ? (
                  <PlayerBadge nickname={nicknameValue} avatar={avatarValue} compact />
                ) : (
                  <div className="text-sm text-zinc-500">Выберите ник и аватар.</div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
            <div className="text-lg font-bold">Комнаты</div>
            <div className="mt-3">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={createRoom}
                  disabled={!canProceed || busy}
                  className="w-full px-4 py-3 rounded-xl bg-emerald-500 text-black font-black transition hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500"
                >
                  Создать комнату
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-zinc-400">Активные комнаты</div>
                <div className="text-xs text-zinc-500">{loadingRooms ? "обновляю..." : "онлайн"}</div>
              </div>

              <div className="mt-3 space-y-2">
                {rooms.length === 0 ? (
                  <div className="text-sm text-zinc-500">Пока нет активных комнат. Создайте новую.</div>
                ) : (
                  rooms.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => joinRoom(r.code)}
                      disabled={!canProceed || busy}
                      className="w-full text-left px-3 py-2 rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 transition"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-black tracking-tight">Код: {r.code}</div>
                          <div className="text-xs text-zinc-500">Хост: {r.host_id.slice(0, 6)}…</div>
                        </div>
                        <div className="text-xs text-zinc-400 font-semibold">Войти →</div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {error ? <div className="mt-3 text-sm text-red-300">{error}</div> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

