"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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
  const [busyAction, setBusyAction] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");

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
    setBusyAction("create");
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
      setBusyAction(null);
    }
  };

  const joinRoom = async (code: string) => {
    if (!profile) return;
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setError("Введите код комнаты");
      return;
    }
    setError(null);
    setBusy(true);
    setBusyAction("join");
    try {
      const { data: roomRow, error: roomErr } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", normalized)
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
      setBusyAction(null);
    }
  };

  const nicknameValue = profile?.nickname ?? "";
  const avatarValue = profile?.avatar ?? "";

  return (
    <div className="min-h-screen bg-[radial-gradient(80%_50%_at_50%_0%,rgba(16,185,129,0.2),rgba(0,0,0,0))] bg-black text-foreground">
      <div className="max-w-5xl mx-auto px-4 py-5 md:py-8">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-xl md:text-2xl font-black tracking-tight">Дуэль тайминга</div>
            <div className="text-xs md:text-sm text-zinc-400">
              Мультиплеерная дуэль точности по таймингу событий.
            </div>
          </div>
          <a
            href="/leaderboard"
            className="px-3 py-2 md:px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-300/30 transition text-xs md:text-sm font-semibold"
          >
            Лидеры
          </a>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-5 md:p-7"
        >
          <div className="max-w-2xl">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              Нажми вовремя. Забери первое место.
            </h1>
            <p className="mt-3 text-sm md:text-base text-zinc-300">
              Угадай миллисекундный момент события в раунде и обгони соперников в реальном времени.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2.5 md:gap-3">
            {[
              { title: "Мультиплеер в реальном времени", hint: "Общая сессия для всех игроков" },
              {
                title: "Подсчет точности до миллисекунд",
                hint: "Очки зависят от точности попадания",
              },
              { title: "Живой лидерборд", hint: "Таблица обновляется мгновенно" },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-black/25 px-3.5 py-3.5 md:px-4 md:py-4"
              >
                <div className="text-sm font-bold text-white">{item.title}</div>
                <div className="text-xs text-zinc-400 mt-1">{item.hint}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={createRoom}
              disabled={!canProceed || busy}
              className="w-full px-4 py-3.5 rounded-2xl bg-emerald-500 text-black font-black transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300/30 disabled:opacity-50 disabled:hover:bg-emerald-500"
            >
              {busy && busyAction === "create" ? "Создаём..." : "Создать комнату"}
            </button>
            <div className="flex gap-2.5">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Код комнаты"
                className="w-full px-3 py-3.5 rounded-2xl bg-black/50 text-white placeholder:text-zinc-500 border border-white/15 outline-none focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-300/20 caret-emerald-300"
              />
              <button
                type="button"
                onClick={() => joinRoom(joinCode)}
                disabled={!canProceed || busy}
                className="px-4 py-3.5 rounded-2xl border border-white/15 bg-white/10 hover:bg-white/15 text-white font-bold transition focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50"
              >
                {busy && busyAction === "join" ? "Входим..." : "Войти"}
              </button>
            </div>
          </div>
        </motion.div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.03 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5"
          >
            <div className="text-lg font-bold">Профиль игрока</div>
            <div className="mt-3 space-y-3.5">
              <label className="block">
                <div className="text-sm text-zinc-400 mb-1">Никнейм</div>
                <input
                  value={nicknameValue}
                  onChange={(e) => update({ nickname: e.target.value })}
                  placeholder="Например: Flash"
                  className="w-full px-3 py-2.5 rounded-xl bg-black/50 text-white placeholder:text-zinc-500 border border-white/15 outline-none focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-300/20 caret-emerald-300"
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
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.06 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5"
          >
            <div className="text-lg font-bold">Комнаты</div>
            <div className="mt-3">
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-zinc-400">Активные комнаты</div>
                <div className="text-xs text-zinc-500">
                  {loadingRooms ? "обновляю..." : "онлайн"}
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {rooms.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/15 bg-black/20 px-3 py-4 text-sm text-zinc-400">
                    Сейчас активных комнат нет. Создайте новую и пригласите игроков по коду.
                  </div>
                ) : (
                  rooms.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => joinRoom(r.code)}
                      disabled={!canProceed || busy}
                      className="w-full text-left px-3 py-2.5 rounded-xl border border-white/10 bg-black/20 hover:bg-white/5 hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10 transition"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-black tracking-tight">Код: {r.code}</div>
                          <div className="text-xs text-zinc-500">
                            Хост: {r.host_id.slice(0, 6)}…
                          </div>
                        </div>
                        <div className="text-xs text-zinc-400 font-semibold">Войти →</div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {error ? <div className="mt-3 text-sm text-red-300">{error}</div> : null}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
