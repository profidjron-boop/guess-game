"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "classnames";
import { supabase } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Guess, Participant, Round, Room, RoundTemplate } from "@/types/game";
import PlayerBadge from "@/components/PlayerBadge";
import CountdownTimer from "@/components/CountdownTimer";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { computeDeltaMs, computePressTimeMs, generateEventTimeMs, isRoundReadyForGuess } from "@/lib/game/time";

type GuessWithFlag = Guess & { hasGuess: true };
type NoGuess = { hasGuess: false };

type RoundResultsRow = {
  player: Participant;
  guess: GuessWithFlag | NoGuess;
};

function formatMs(ms: number | null | undefined) {
  if (ms == null) return "—";
  const sign = ms > 0 ? "+" : "";
  return `${sign}${ms} ms`;
}

export default function RoomScreen() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const roomCode = params.code ?? null;

  const { profile } = usePlayerProfile();
  const playerId = profile?.playerId ?? null;

  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshLockRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundStartLoopRef = useRef(false);

  const myParticipant = useMemo(() => {
    if (!playerId) return null;
    return participants.find((p) => p.player_id === playerId) ?? null;
  }, [participants, playerId]);

  const isHost = useMemo(() => {
    if (!room || !playerId) return false;
    return room.host_id === playerId;
  }, [room, playerId]);

  const refresh = async () => {
    if (!roomCode) return;
    setLoading(true);
    try {
      const { data: r, error: rErr } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", roomCode)
        .single();
      if (rErr || !r) throw rErr ?? new Error("Комната не найдена");
      setRoom(r as Room);

      const p = await supabase
        .from("participants")
        .select("*")
        .eq("room_id", (r as Room).id)
        .order("score", { ascending: false });
      setParticipants((p.data ?? []) as Participant[]);

      const ro = await supabase
        .from("rounds")
        .select("*")
        .eq("room_id", (r as Room).id)
        .order("round_number", { ascending: true });
      setRounds((ro.data ?? []) as Round[]);
    } finally {
      setLoading(false);
    }
  };

  const scheduleRefresh = () => {
    if (refreshLockRef.current) return;
    refreshLockRef.current = setTimeout(() => {
      refreshLockRef.current = null;
      refresh();
    }, 250);
  };

  // Initial + realtime
  useEffect(() => {
    let sub: RealtimeChannel | null = null;
    let mounted = true;

    const init = async () => {
      if (!roomCode) return;
      await refresh();

      const currentRoomId = await supabase
        .from("rooms")
        .select("id")
        .eq("code", roomCode)
        .single();

      if (!mounted) return;

      const roomId = currentRoomId.data?.id as string | undefined;
      if (!roomId) return;

      sub = supabase
        .channel(`guess-duel:room:${roomId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "rooms",
            filter: `id=eq.${roomId}`,
          },
          () => scheduleRefresh()
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "participants",
            filter: `room_id=eq.${roomId}`,
          },
          () => scheduleRefresh()
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "rounds",
            filter: `room_id=eq.${roomId}`,
          },
          () => scheduleRefresh()
        )
        .subscribe();
    };

    init();

    return () => {
      mounted = false;
      if (sub) supabase.removeChannel(sub);
      if (refreshLockRef.current) clearTimeout(refreshLockRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  const runningRound = useMemo(() => {
    return rounds.find((r) => r.status === "running") ?? null;
  }, [rounds]);

  const lastEndedRound = useMemo(() => {
    const ended = rounds.filter((r) => r.status === "ended");
    if (ended.length === 0) return null;
    ended.sort((a, b) => (b.round_number ?? 0) - (a.round_number ?? 0));
    return ended[0];
  }, [rounds]);

  const [myGuess, setMyGuess] = useState<Guess | null>(null);
  useEffect(() => {
    const loadMyGuess = async () => {
      if (!room || !runningRound || !playerId) {
        setMyGuess(null);
        return;
      }
      const { data } = await supabase
        .from("guesses")
        .select("*")
        .eq("round_id", runningRound.id)
        .eq("player_id", playerId)
        .maybeSingle();
      setMyGuess((data ?? null) as Guess | null);
    };
    loadMyGuess();
  }, [room?.id, runningRound?.id, playerId]);

  const [roundModal, setRoundModal] = useState<{ round: Round; key: string } | null>(null);
  const [roundResults, setRoundResults] = useState<RoundResultsRow[]>([]);

  useEffect(() => {
    if (!lastEndedRound) return;
    if (!room) return;
    const key = `${lastEndedRound.id}:${lastEndedRound.ended_at ?? ""}`;
    setRoundModal((prev) => {
      if (prev?.key === key) return prev;
      return { round: lastEndedRound, key };
    });
  }, [lastEndedRound, room]);

  // Hide results modal as soon as the next round becomes "running".
  useEffect(() => {
    if (!roundModal || !runningRound) return;
    if (runningRound.round_number > roundModal.round.round_number) {
      setRoundModal(null);
    }
  }, [runningRound?.round_number, roundModal]);

  useEffect(() => {
    const loadRoundResults = async () => {
      if (!roundModal) return;
      const r = roundModal.round;
      if (!r) return;
      const { data: guesses } = await supabase
        .from("guesses")
        .select("*")
        .eq("round_id", r.id);
      const byPlayer = new Map<string, Guess>();
      (guesses ?? []).forEach((g) => byPlayer.set((g as Guess).player_id, g as Guess));

      const rows: RoundResultsRow[] = participants.map((p) => {
        const g = byPlayer.get(p.player_id);
        if (g) {
          return { player: p, guess: { ...g, hasGuess: true } };
        }
        return { player: p, guess: { hasGuess: false } };
      });

      // Stable sort: winner first, then by abs delta, then by press time.
      rows.sort((a, b) => {
        const winnerA = a.guess.hasGuess && r.winner_player_id === a.player.player_id;
        const winnerB = b.guess.hasGuess && r.winner_player_id === b.player.player_id;
        if (winnerA && !winnerB) return -1;
        if (!winnerA && winnerB) return 1;
        const absA =
          a.guess.hasGuess && a.guess.delta_ms != null ? Math.abs(a.guess.delta_ms) : Number.POSITIVE_INFINITY;
        const absB =
          b.guess.hasGuess && b.guess.delta_ms != null ? Math.abs(b.guess.delta_ms) : Number.POSITIVE_INFINITY;
        if (absA !== absB) return absA - absB;
        const pressA = a.guess.hasGuess ? a.guess.press_time_ms ?? Number.POSITIVE_INFINITY : Number.POSITIVE_INFINITY;
        const pressB = b.guess.hasGuess ? b.guess.press_time_ms ?? Number.POSITIVE_INFINITY : Number.POSITIVE_INFINITY;
        return pressA - pressB;
      });

      setRoundResults(rows);
    };
    loadRoundResults();
  }, [roundModal, participants]);

  const toggleReady = async (next: boolean) => {
    if (!room || !playerId) return;
    const my = participants.find((p) => p.player_id === playerId);
    if (!my) return;
    await supabase
      .from("participants")
      .update({ ready: next })
      .eq("room_id", room.id)
      .eq("player_id", playerId);
  };

  const submitGuess = async () => {
    if (!room || !runningRound || !playerId) return;
    if (!isRoundReadyForGuess(runningRound)) return;
    if (myGuess) return; // already pressed

    try {
      const startedAtIso = runningRound.started_at!;
      const pressTimeMs = computePressTimeMs(startedAtIso, Date.now());
      const deltaMs = computeDeltaMs(pressTimeMs, runningRound.event_time_ms!);

      await supabase.from("guesses").insert({
        room_id: room.id,
        round_id: runningRound.id,
        player_id: playerId,
        press_time_ms: pressTimeMs,
        delta_ms: deltaMs,
      });
      scheduleRefresh();
      // optimistic local lock:
      setMyGuess({
        id: "optimistic",
        room_id: room.id,
        round_id: runningRound.id,
        player_id: playerId,
        press_time_ms: pressTimeMs,
        delta_ms: deltaMs,
        points: 0,
        created_at: new Date().toISOString(),
      });
    } catch {
      // ignore unique constraint errors (double click)
    }
  };

  const startGame = async () => {
    if (!room || !isHost || !playerId) return;
    if (room.status !== "waiting") return;
    if (roundStartLoopRef.current) return;
    roundStartLoopRef.current = true;

    try {
      const roomId = room.id;

      // Create rounds for this game
      const { data: templates } = await supabase
        .from("round_templates")
        .select("*")
        .order("round_number", { ascending: true });

      if (!templates || templates.length === 0) throw new Error("Не найдены round_templates.");

      // Ensure clean slate
      await supabase.from("guesses").delete().eq("room_id", roomId);
      await supabase.from("rounds").delete().eq("room_id", roomId);
      await supabase
        .from("participants")
        .update({ score: 0, streak: 0, max_streak: 0, ready: false })
        .eq("room_id", roomId);

      const templateList = templates as RoundTemplate[];
      const toInsert = templateList.map((t) => {
        const durationMs = t.duration_ms;
        return {
          room_id: roomId,
          round_number: t.round_number,
          title: t.title,
          category: t.category,
          duration_ms: durationMs,
          event_time_ms: generateEventTimeMs(durationMs),
          status: "pending",
        };
      });

      await supabase.from("rounds").insert(toInsert);

      await supabase
        .from("rooms")
        .update({ status: "playing", started_at: new Date().toISOString(), current_round: 1, total_rounds: 5 })
        .eq("id", roomId);

      // Load inserted round IDs
      const { data: insertedRounds } = await supabase
        .from("rounds")
        .select("*")
        .eq("room_id", roomId)
        .order("round_number", { ascending: true });

      if (!insertedRounds || insertedRounds.length === 0) throw new Error("Round insert failed.");

      const list = insertedRounds as Round[];
      const byNum = new Map(list.map((r) => [r.round_number, r]));

      for (let n = 1; n <= list.length; n++) {
        const r = byNum.get(n);
        if (!r) continue;

        await supabase
          .from("rounds")
          .update({ status: "running", started_at: new Date().toISOString() })
          .eq("id", r.id);

        await supabase.from("rooms").update({ current_round: n }).eq("id", roomId);
        scheduleRefresh();

        await new Promise((res) => setTimeout(res, r.duration_ms));

        // Finalize round server-side
        await supabase.rpc("apply_round_results", { p_room_id: roomId, p_round_id: r.id });
        scheduleRefresh();

        if (n === list.length) {
          await supabase.from("rooms").update({ status: "finished", current_round: list.length }).eq("id", roomId);
          await supabase.rpc("finalize_game", { p_room_id: roomId });
          scheduleRefresh();
        }
      }
    } finally {
      roundStartLoopRef.current = false;
    }
  };

  const resetAndNewGame = async () => {
    if (!room || !isHost) return;
    await supabase.from("guesses").delete().eq("room_id", room.id);
    await supabase.from("rounds").delete().eq("room_id", room.id);
    await supabase
      .from("participants")
      .update({ score: 0, streak: 0, max_streak: 0, ready: false })
      .eq("room_id", room.id);
    await supabase
      .from("rooms")
      .update({ status: "waiting", current_round: 0, started_at: null, total_rounds: 5 })
      .eq("id", room.id);
    roundStartLoopRef.current = false;
    await startGame();
  };

  const [finalStatsLoaded, setFinalStatsLoaded] = useState(false);
  const [playerAccuracies, setPlayerAccuracies] = useState<
    Record<string, { avgAbsDeltaMs: number; bestAbsDeltaMs: number; games: number }>
  >({});

  useEffect(() => {
    const loadFinalStats = async () => {
      if (!room || room.status !== "finished" || !finalStatsLoaded) return;
    };
    loadFinalStats();
  }, [room, finalStatsLoaded]);

  useEffect(() => {
    const loadStats = async () => {
      if (!room || room.status !== "finished") return;
      if (finalStatsLoaded) return;
      if (!participants.length) return;

      const { data: gs } = await supabase
        .from("guesses")
        .select("player_id,delta_ms")
        .eq("room_id", room.id);

      const next: Record<string, { sum: number; count: number; best: number }> = {};
      type GuessDeltaRow = { player_id: string; delta_ms: number };
      (gs ?? []).forEach((g) => {
        const row = g as GuessDeltaRow;
        const pid = row.player_id;
        const abs = Math.abs(row.delta_ms);
        if (!next[pid]) next[pid] = { sum: 0, count: 0, best: abs };
        next[pid].sum += abs;
        next[pid].count += 1;
        next[pid].best = Math.min(next[pid].best, abs);
      });

      const out: Record<string, { avgAbsDeltaMs: number; bestAbsDeltaMs: number; games: number }> = {};
      participants.forEach((p) => {
        const s = next[p.player_id];
        out[p.player_id] = {
          avgAbsDeltaMs: s ? Math.round(s.sum / Math.max(1, s.count)) : 0,
          bestAbsDeltaMs: s ? s.best : 0,
          games: 1,
        };
      });

      setPlayerAccuracies(out);
      setFinalStatsLoaded(true);
    };
    loadStats();
  }, [room?.status, room?.id, participants, finalStatsLoaded]);

  const sortedByScore = useMemo(() => {
    return [...participants].sort((a, b) => b.score - a.score);
  }, [participants]);

  const top3 = sortedByScore.slice(0, 3);

  // Invitation link (client)
  const inviteLink = useMemo(() => {
    if (typeof window === "undefined" || !roomCode) return "";
    return `${window.location.origin}/room/${roomCode}`;
  }, [roomCode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-400">
        Подключаемся...
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-400">
        Комната не найдена или вы не вошли.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-zinc-950 text-foreground">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-sm font-semibold"
            >
              Лобби
            </a>
            <div>
              <div className="text-lg font-black tracking-tight">Комната {room.code}</div>
              <div className="text-xs text-zinc-400">
                {room.status === "waiting" ? "Ожидание" : room.status === "playing" ? "Игра идёт" : "Результаты"}
              </div>
            </div>
          </div>

          <div className="text-right">
            {myParticipant ? (
              <PlayerBadge nickname={myParticipant.nickname} avatar={myParticipant.avatar} compact />
            ) : (
              <div className="text-xs text-zinc-500">Подключение...</div>
            )}
          </div>
        </div>

        {/* WAITING ROOM */}
        {room.status === "waiting" ? (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
              <div className="text-lg font-bold">Ожидание старта</div>

              <div className="mt-4 space-y-3">
                <div className="p-3 rounded-xl border border-white/10 bg-black/20">
                  <div className="text-xs text-zinc-400">Код комнаты</div>
                  <div className="text-2xl font-black tracking-tight">{room.code}</div>
                </div>

                <div className="p-3 rounded-xl border border-white/10 bg-black/20">
                  <div className="text-xs text-zinc-400">Приглашение</div>
                  <div className="text-sm font-semibold break-all">{inviteLink}</div>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(inviteLink)}
                    className="mt-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold"
                  >
                    Скопировать ссылку
                  </button>
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                {myParticipant ? (
                  <button
                    type="button"
                    onClick={() => toggleReady(!myParticipant.ready)}
                    className={clsx(
                      "w-full px-4 py-3 rounded-xl font-black transition",
                      myParticipant.ready ? "bg-emerald-500 text-black" : "bg-white/10 hover:bg-white/15 text-white"
                    )}
                  >
                    {myParticipant.ready ? "Готов" : "Я готов"}
                  </button>
                ) : (
                  <div className="text-sm text-zinc-400 self-center">Нужен профиль игрока.</div>
                )}
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={startGame}
                  disabled={!isHost || room.status !== "waiting"}
                  className={clsx(
                    "w-full px-4 py-3 rounded-xl font-black transition",
                    isHost ? "bg-emerald-500 text-black hover:bg-emerald-400" : "bg-white/10 text-zinc-300 cursor-not-allowed"
                  )}
                >
                  {isHost ? "Запустить игру" : "Ждём хоста"}
                </button>
                <div className="mt-2 text-xs text-zinc-500">
                  Раундов: {room.total_rounds}. Очки и прогресс считаются на сервере.
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
              <div className="flex items-center justify-between">
                <div className="text-lg font-bold">Участники</div>
                <div className="text-xs text-zinc-500">{participants.length} онлайн</div>
              </div>

              <div className="mt-4 space-y-3">
                {participants.map((p) => (
                  <div
                    key={p.id}
                    className={clsx(
                      "flex items-center justify-between gap-3 p-3 rounded-xl border border-white/10 bg-black/20",
                      p.player_id === room.host_id ? "border-emerald-400/30" : ""
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <PlayerBadge nickname={p.nickname} avatar={p.avatar} />
                      {p.player_id === room.host_id ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 font-semibold">
                          ХОСТ
                        </span>
                      ) : null}
                    </div>
                    <div
                      className={clsx(
                        "text-xs font-semibold px-3 py-2 rounded-xl border transition",
                        p.ready ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-200" : "border-white/10 bg-white/5 text-zinc-200"
                      )}
                    >
                      {p.ready ? "Готов" : "Ждёт"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* PLAYING */}
        {room.status === "playing" && runningRound && myParticipant ? (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs text-zinc-400">Текущий раунд</div>
                  <div className="text-3xl font-black tracking-tight">{runningRound.title}</div>
                  <div className="mt-1 text-sm text-zinc-400">
                    Раунд {runningRound.round_number} из {room.total_rounds} •{" "}
                    <span className={runningRound.category === "sport" ? "text-sky-200" : "text-fuchsia-200"}>
                      {runningRound.category === "sport" ? "Спорт" : "Киберспорт"}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-zinc-400">Текущий счёт</div>
                  <div className="text-2xl font-black">{myParticipant.score}</div>
                  <div className="text-xs text-zinc-500 mt-1">
                    Серия: <span className="text-emerald-200 font-semibold">{myParticipant.streak}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <CountdownTimer round={runningRound} />
              </div>

              <div className="mt-5">
                <div className="text-xs text-zinc-400 mb-2">Нужно нажать ровно в момент события</div>
                <AnimatePresence mode="wait">
                  <motion.button
                    type="button"
                    onClick={submitGuess}
                    disabled={!!myGuess || !isRoundReadyForGuess(runningRound)}
                    className={clsx(
                      "w-full rounded-3xl px-6 py-5 border transition",
                      myGuess
                        ? "border-emerald-400/30 bg-emerald-500/20 text-emerald-100 cursor-not-allowed"
                        : "border-white/15 bg-emerald-500 text-black hover:bg-emerald-400"
                    )}
                    initial={{ scale: 1 }}
                    whileHover={!myGuess ? { scale: 1.02 } : undefined}
                    whileTap={!myGuess ? { scale: 0.99 } : undefined}
                  >
                    <motion.div
                      key={myGuess ? "pressed" : "now"}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center justify-center gap-3"
                    >
                      <span className="text-3xl font-black tracking-tight">СЕЙЧАС!</span>
                      <span className="text-sm font-bold opacity-80">
                        {myGuess ? "зафиксировано" : "нажми"}
                      </span>
                    </motion.div>
                  </motion.button>
                </AnimatePresence>
              </div>

              <div className="mt-4 text-xs text-zinc-500">
                Кнопка блокируется после первого нажатия в раунде.
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
              <div className="text-lg font-bold">Турнирная таблица</div>
              <div className="text-xs text-zinc-500 mt-1">Очки обновляются realtime</div>

              <div className="mt-4 space-y-2">
                {participants.map((p, idx) => (
                  <div
                    key={p.id}
                    className={clsx(
                      "flex items-center justify-between gap-3 p-3 rounded-xl border border-white/10 bg-black/20",
                      p.player_id === room.host_id ? "border-emerald-400/25" : "",
                      idx < 3 ? "bg-white/7" : ""
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-black text-zinc-400 w-6">{idx + 1}</div>
                      <PlayerBadge nickname={p.nickname} avatar={p.avatar} />
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black">{p.score}</div>
                      <div className="text-[11px] text-zinc-500">x{p.streak >= 2 ? (p.streak >= 3 ? "2.0" : "1.5") : "1"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* ROUND RESULTS MODAL */}
        <AnimatePresence>
          {room.status === "playing" && roundModal && roundResults.length > 0 ? (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div
                className="absolute inset-0 bg-black/60"
                onClick={() => {
                  /* keep */
                }}
              />
              <motion.div
                className="relative w-full max-w-3xl rounded-3xl border border-white/10 bg-zinc-950/90 backdrop-blur p-4 md:p-6 overflow-hidden"
                initial={{ y: 12, scale: 0.98 }}
                animate={{ y: 0, scale: 1 }}
                exit={{ y: 8, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 200, damping: 18 }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-zinc-400">Результаты раунда</div>
                    <div className="text-2xl font-black tracking-tight">
                      {roundModal.round.title}
                    </div>
                    <div className="text-sm text-zinc-500 mt-1">
                      Момент события: <span className="text-emerald-200 font-semibold">{formatMs(roundModal.round.event_time_ms)}</span>
                      {" "}• Раунд {roundModal.round.round_number}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-zinc-400">Победитель</div>
                    <div className="text-sm font-black text-emerald-200">
                      {roundModal.round.winner_player_id
                        ? participants.find((p) => p.player_id === roundModal.round.winner_player_id)?.nickname ?? "—"
                        : "—"}
                    </div>
                  </div>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs uppercase text-zinc-400 bg-white/5">
                        <th className="px-3 py-3">Игрок</th>
                        <th className="px-3 py-3">Нажал</th>
                        <th className="px-3 py-3">Отклонение</th>
                        <th className="px-3 py-3">Очки</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roundResults.map((row) => {
                        const isWinner =
                          roundModal.round.winner_player_id &&
                          row.player.player_id === roundModal.round.winner_player_id;
                        const absDelta =
                          row.guess.hasGuess && row.guess.delta_ms != null ? Math.abs(row.guess.delta_ms) : null;

                        return (
                          <tr
                            key={row.player.id}
                            className={clsx(
                              "border-t border-white/5",
                              isWinner && "bg-emerald-500/10"
                            )}
                          >
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-3">
                                <PlayerBadge nickname={row.player.nickname} avatar={row.player.avatar} compact />
                                {isWinner ? (
                                  <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 font-black">
                                    WIN
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-sm text-zinc-200">
                              {row.guess.hasGuess ? formatMs(row.guess.press_time_ms) : "—"}
                            </td>
                            <td className="px-3 py-3 text-sm font-semibold">
                              {row.guess.hasGuess ? (
                                <span className={absDelta != null && absDelta <= 1000 ? "text-emerald-200" : "text-zinc-200"}>
                                  {formatMs(row.guess.delta_ms)}{" "}
                                  {absDelta != null ? <span className="text-zinc-500 font-semibold">({absDelta}мс)</span> : null}
                                </span>
                              ) : (
                                <span className="text-zinc-500">нет нажатия</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-sm font-black text-emerald-200">
                              {row.guess.hasGuess ? row.guess.points : 0}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-5 text-xs text-zinc-500">
                  Следующий раунд запустится автоматически после конца таймера.
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* FINAL */}
        {room.status === "finished" ? (
          <div className="mt-6">
            <motion.div
              className="rounded-3xl border border-white/10 bg-white/5 p-4 md:p-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs text-zinc-400">Игра завершена</div>
                  <div className="text-2xl font-black tracking-tight">Итоговый пьедестал</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-zinc-400">Ваша позиция</div>
                  <div className="text-2xl font-black">
                    {myParticipant
                      ? sortedByScore.findIndex((p) => p.player_id === myParticipant.player_id) + 1
                      : "—"}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {top3.map((p, idx) => {
                  const tier = idx === 0 ? "bg-emerald-500/20" : idx === 1 ? "bg-sky-500/20" : "bg-fuchsia-500/20";
                  const border =
                    idx === 0 ? "border-emerald-400/30" : idx === 1 ? "border-sky-400/30" : "border-fuchsia-400/30";
                  const stats = playerAccuracies[p.player_id];
                  return (
                    <motion.div
                      key={p.id}
                      className={clsx("rounded-2xl border p-4", tier, border)}
                      initial={{ opacity: 0, y: 14, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: idx * 0.08, type: "spring", stiffness: 220, damping: 18 }}
                    >
                      <div className="text-xs text-zinc-300 font-black">#{idx + 1}</div>
                      <div className="mt-3">
                        <PlayerBadge nickname={p.nickname} avatar={p.avatar} />
                      </div>
                      <div className="mt-4 text-3xl font-black">{p.score}</div>
                      <div className="mt-1 text-sm text-zinc-300">
                        Лучшая точность: <span className="text-emerald-200 font-semibold">{stats?.bestAbsDeltaMs ?? 0}мс</span>
                      </div>
                      <div className="mt-1 text-sm text-zinc-300">
                        Средняя точность:{" "}
                        <span className="text-sky-200 font-semibold">{stats?.avgAbsDeltaMs ?? 0}мс</span>
                      </div>
                      <div className="mt-1 text-sm text-zinc-300">
                        Серия: <span className="text-emerald-200 font-semibold">{p.max_streak}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs uppercase text-zinc-400 bg-black/20">
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Игрок</th>
                      <th className="px-4 py-3">Очки</th>
                      <th className="px-4 py-3">Средняя точность</th>
                      <th className="px-4 py-3">Лучшая точность</th>
                      <th className="px-4 py-3">Серия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedByScore.map((p, idx) => {
                      const stats = playerAccuracies[p.player_id];
                      return (
                        <tr key={p.id} className="border-t border-white/5 hover:bg-white/5 transition">
                          <td className="px-4 py-3 text-sm font-black text-zinc-300">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <PlayerBadge nickname={p.nickname} avatar={p.avatar} />
                          </td>
                          <td className="px-4 py-3 text-sm font-black">{p.score}</td>
                          <td className="px-4 py-3 text-sm text-zinc-200">{stats?.avgAbsDeltaMs ?? 0}мс</td>
                          <td className="px-4 py-3 text-sm text-emerald-200">{stats?.bestAbsDeltaMs ?? 0}мс</td>
                          <td className="px-4 py-3 text-sm text-zinc-200">{p.max_streak}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex flex-col md:flex-row gap-3">
                {isHost ? (
                  <button
                    type="button"
                    onClick={resetAndNewGame}
                    className="w-full md:w-auto px-6 py-3 rounded-2xl bg-emerald-500 text-black font-black hover:bg-emerald-400 transition"
                  >
                    Новая игра
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full md:w-auto px-6 py-3 rounded-2xl bg-white/10 text-zinc-400 font-black cursor-not-allowed transition"
                  >
                    Новая игра (только хост)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="w-full md:w-auto px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-black hover:bg-white/10 transition"
                >
                  Вернуться в лобби
                </button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

