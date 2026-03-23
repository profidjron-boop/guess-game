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
import { generateEventTimeMs, isRoundReadyForGuess } from "@/lib/game/time";

type GuessWithFlag = Guess & { hasGuess: true };
type NoGuess = { hasGuess: false };

type RoundResultsRow = {
  player: Participant;
  guess: GuessWithFlag | NoGuess;
};

type MyRoundHistoryRow = {
  round: Round;
  guess: Guess | null;
};

type PlayerMetrics = {
  avgAbsDeltaMs: number;
  bestAbsDeltaMs: number;
  earlyPresses: number;
  roundsWon: number;
  fastestTriggerMs: number | null;
};

function formatMs(ms: number | null | undefined) {
  if (ms == null) return "—";
  const sign = ms > 0 ? "+" : "";
  return `${sign}${ms} мс`;
}

type ResultTone = "perfect" | "great" | "close" | "poor" | "early";

function classifyResult(deltaMs: number | null | undefined): {
  label: string;
  tone: ResultTone;
} {
  if (deltaMs == null) return { label: "Момент пропущен", tone: "poor" };
  if (deltaMs < 0) return { label: "Слишком рано", tone: "early" };
  const abs = Math.abs(deltaMs);
  if (abs <= 500) return { label: "Идеальный тайминг", tone: "perfect" };
  if (abs <= 1000) return { label: "Отличное попадание", tone: "great" };
  if (abs <= 2000) return { label: "Близко", tone: "close" };
  if (abs <= 5000) return { label: "Близко", tone: "close" };
  return { label: "Момент пропущен", tone: "poor" };
}

function toneClasses(tone: ResultTone) {
  switch (tone) {
    case "perfect":
      return {
        pill: "bg-emerald-500/20 border-emerald-400/40 text-emerald-200",
        text: "text-emerald-200",
      };
    case "great":
      return {
        pill: "bg-sky-500/20 border-sky-400/40 text-sky-200",
        text: "text-sky-200",
      };
    case "close":
      return {
        pill: "bg-amber-500/20 border-amber-400/40 text-amber-200",
        text: "text-amber-200",
      };
    case "early":
      return {
        pill: "bg-rose-500/20 border-rose-400/40 text-rose-200",
        text: "text-rose-200",
      };
    default:
      return {
        pill: "bg-zinc-500/20 border-zinc-400/40 text-zinc-200",
        text: "text-zinc-300",
      };
  }
}

function connStatusLabel(status: "connected" | "reconnecting" | "disconnected") {
  if (status === "connected") return "подключено";
  if (status === "reconnecting") return "переподключение";
  return "отключено";
}

function categoryRuLabel(value: "sport" | "cyber" | null) {
  if (!value) return "Смешанная";
  return value === "sport" ? "Спорт" : "Киберспорт";
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
  const [connStatus, setConnStatus] = useState<"connected" | "reconnecting" | "disconnected">("reconnecting");
  const [startingGame, setStartingGame] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submittingGuess, setSubmittingGuess] = useState(false);

  const refreshLockRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundStartLoopRef = useRef(false);
  const refreshInFlightRef = useRef(false);
  const refreshQueuedRef = useRef(false);
  const submitLockRef = useRef(false);

  const myParticipant = useMemo(() => {
    if (!playerId) return null;
    return participants.find((p) => p.player_id === playerId) ?? null;
  }, [participants, playerId]);

  const isHost = useMemo(() => {
    if (!room || !playerId) return false;
    return room.host_id === playerId;
  }, [room, playerId]);

  const refresh = async (opts?: { silent?: boolean }) => {
    if (!roomCode) return;
    if (refreshInFlightRef.current) {
      refreshQueuedRef.current = true;
      return;
    }
    refreshInFlightRef.current = true;
    if (!opts?.silent && !room) setLoading(true);
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
      setConnStatus("connected");
    } finally {
      if (!opts?.silent && !room) setLoading(false);
      refreshInFlightRef.current = false;
      if (refreshQueuedRef.current) {
        refreshQueuedRef.current = false;
        refresh({ silent: true });
      }
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
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setConnStatus("connected");
            refresh({ silent: true });
            return;
          }
          if (status === "TIMED_OUT" || status === "CHANNEL_ERROR") {
            setConnStatus("reconnecting");
            return;
          }
          if (status === "CLOSED") {
            setConnStatus("disconnected");
          }
        });
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
    if (submitLockRef.current || submittingGuess) return;

    try {
      submitLockRef.current = true;
      setSubmittingGuess(true);
      setSubmitMessage(null);
      const { data, error } = await supabase.rpc("submit_guess_server", {
        p_room_id: room.id,
        p_round_id: runningRound.id,
        p_player_id: playerId,
      });
      if (error) throw error;

      scheduleRefresh();
      if (data) {
        setMyGuess(data as Guess);
      } else {
        // optimistic lock if RPC returned empty payload for any reason
        setMyGuess({
          id: "optimistic",
          room_id: room.id,
          round_id: runningRound.id,
          player_id: playerId,
          press_time_ms: 0,
          delta_ms: 0,
          points: 0,
          created_at: new Date().toISOString(),
        });
      }
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : String(e ?? "");
      const normalized = raw.toLowerCase();

      if (normalized.includes("already_guessed")) {
        setSubmitMessage("Нажатие уже зафиксировано для этого раунда.");
      } else if (normalized.includes("round_not_running")) {
        setSubmitMessage("Раунд уже завершен или еще не начался.");
      } else if (normalized.includes("too_late")) {
        setSubmitMessage("Слишком поздно: окно раунда закрыто.");
      } else if (normalized.includes("participant_not_in_room")) {
        setSubmitMessage("Игрок не найден в текущей комнате.");
      } else {
        setSubmitMessage("Не удалось отправить нажатие. Проверьте соединение и попробуйте снова.");
      }
    } finally {
      setSubmittingGuess(false);
      submitLockRef.current = false;
    }
  };

  const startGame = async () => {
    if (!room || !isHost || !playerId) return;
    if (room.status !== "waiting") return;
    if (roundStartLoopRef.current) return;
    roundStartLoopRef.current = true;
    setStartingGame(true);

    try {
      const roomId = room.id;
      // Acquire a lightweight "start lock" to reduce race between multiple host tabs.
      const { data: lockRows } = await supabase
        .from("rooms")
        .update({ current_round: -1 })
        .eq("id", roomId)
        .eq("status", "waiting")
        .eq("current_round", 0)
        .eq("host_id", playerId)
        .select("id");

      if (!lockRows || lockRows.length === 0) {
        await refresh({ silent: true });
        return;
      }

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
      setStartingGame(false);
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
  const [playerMetrics, setPlayerMetrics] = useState<Record<string, PlayerMetrics>>({});
  const [myRoundHistory, setMyRoundHistory] = useState<MyRoundHistoryRow[]>([]);
  const [copiedResult, setCopiedResult] = useState(false);

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
        .select("player_id,delta_ms,press_time_ms,round_id")
        .eq("room_id", room.id);

      const next: Record<string, { sum: number; count: number; best: number; early: number; fastest: number | null }> = {};
      type GuessStatsRow = { player_id: string; delta_ms: number; press_time_ms: number; round_id: string };
      (gs ?? []).forEach((g) => {
        const row = g as GuessStatsRow;
        const pid = row.player_id;
        const abs = Math.abs(row.delta_ms);
        if (!next[pid]) next[pid] = { sum: 0, count: 0, best: abs, early: 0, fastest: null };
        next[pid].sum += abs;
        next[pid].count += 1;
        next[pid].best = Math.min(next[pid].best, abs);
        if (row.delta_ms < 0) next[pid].early += 1;
        if (next[pid].fastest == null) next[pid].fastest = row.press_time_ms;
        else next[pid].fastest = Math.min(next[pid].fastest as number, row.press_time_ms);
      });

      const winsByPlayer: Record<string, number> = {};
      rounds.forEach((r) => {
        if (!r.winner_player_id) return;
        winsByPlayer[r.winner_player_id] = (winsByPlayer[r.winner_player_id] ?? 0) + 1;
      });

      const out: Record<string, PlayerMetrics> = {};
      participants.forEach((p) => {
        const s = next[p.player_id];
        out[p.player_id] = {
          avgAbsDeltaMs: s ? Math.round(s.sum / Math.max(1, s.count)) : 0,
          bestAbsDeltaMs: s ? s.best : 0,
          earlyPresses: s ? s.early : 0,
          roundsWon: winsByPlayer[p.player_id] ?? 0,
          fastestTriggerMs: s ? s.fastest : null,
        };
      });

      setPlayerMetrics(out);
      setFinalStatsLoaded(true);
    };
    loadStats();
  }, [room?.status, room?.id, participants, rounds, finalStatsLoaded]);

  useEffect(() => {
    const loadMyHistory = async () => {
      if (!room || room.status !== "finished" || !playerId) {
        setMyRoundHistory([]);
        return;
      }

      const { data: roundsData } = await supabase
        .from("rounds")
        .select("*")
        .eq("room_id", room.id)
        .order("round_number", { ascending: true });

      const orderedRounds = (roundsData ?? []) as Round[];
      if (!orderedRounds.length) {
        setMyRoundHistory([]);
        return;
      }

      const roundIds = orderedRounds.map((r) => r.id);
      const { data: myGuesses } = await supabase
        .from("guesses")
        .select("*")
        .eq("room_id", room.id)
        .eq("player_id", playerId)
        .in("round_id", roundIds);

      const guessMap = new Map<string, Guess>();
      ((myGuesses ?? []) as Guess[]).forEach((g) => guessMap.set(g.round_id, g));

      setMyRoundHistory(
        orderedRounds.map((round) => ({
          round,
          guess: guessMap.get(round.id) ?? null,
        }))
      );
    };

    loadMyHistory();
  }, [room?.id, room?.status, playerId]);

  const sortedByScore = useMemo(() => {
    return [...participants].sort((a, b) => b.score - a.score);
  }, [participants]);

  const top3 = sortedByScore.slice(0, 3);

  const myHistorySummary = useMemo(() => {
    const guessed = myRoundHistory.filter((x) => !!x.guess).map((x) => x.guess as Guess);
    const absDeltas = guessed.map((g) => Math.abs(g.delta_ms));
    const bestDelta = absDeltas.length ? Math.min(...absDeltas) : null;
    const avgDelta = absDeltas.length ? Math.round(absDeltas.reduce((a, b) => a + b, 0) / absDeltas.length) : null;
    return {
      bestDelta,
      avgDelta,
      earlyPresses: guessed.filter((g) => g.delta_ms < 0).length,
      roundsPlayed: myRoundHistory.length,
      guessedCount: guessed.length,
    };
  }, [myRoundHistory]);

  const myCategory = useMemo(() => {
    const categories = myRoundHistory.map((r) => r.round.category);
    if (!categories.length) return null;
    const sport = categories.filter((c) => c === "sport").length;
    const cyber = categories.filter((c) => c === "cyber").length;
    if (sport === cyber) return null;
    return sport > cyber ? "sport" : "cyber";
  }, [myRoundHistory]);

  const myPlace = useMemo(() => {
    if (!myParticipant) return null;
    const idx = sortedByScore.findIndex((p) => p.player_id === myParticipant.player_id);
    return idx >= 0 ? idx + 1 : null;
  }, [sortedByScore, myParticipant]);

  const shareSlogan = useMemo(() => {
    if (!myPlace) return "Максимальная точность тайминга";
    if (myPlace === 1) return "Самая острая реакция в комнате";
    if (myHistorySummary.bestDelta != null && myHistorySummary.bestDelta <= 500) return "Идеально поймал момент";
    return "Топовый тайминг";
  }, [myPlace, myHistorySummary.bestDelta]);

  const shareText = useMemo(() => {
    return [
      "Дуэль тайминга — мой результат",
      `Игрок: ${myParticipant?.nickname ?? "Игрок"}`,
      `Место: ${myPlace ?? "—"}`,
      `Счет: ${myParticipant?.score ?? 0}`,
      `Лучшая точность: ${myHistorySummary.bestDelta != null ? `${myHistorySummary.bestDelta}мс` : "—"}`,
      `Средняя точность: ${myHistorySummary.avgDelta != null ? `${myHistorySummary.avgDelta}мс` : "—"}`,
      `Категория: ${categoryRuLabel(myCategory)}`,
      `Слоган: ${shareSlogan}`,
    ].join("\n");
  }, [myParticipant?.nickname, myParticipant?.score, myPlace, myHistorySummary.bestDelta, myHistorySummary.avgDelta, myCategory, shareSlogan]);

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedResult(true);
      setTimeout(() => setCopiedResult(false), 1800);
    } catch {
      setCopiedResult(false);
    }
  };

  const downloadResultImage = () => {
    const nickname = (myParticipant?.nickname ?? "Игрок").replace(/[<>&"]/g, "");
    const line1 = `#${myPlace ?? "—"} • ${nickname}`;
    const line2 = `Счёт: ${myParticipant?.score ?? 0}`;
    const line3 = `Лучшая: ${myHistorySummary.bestDelta != null ? `${myHistorySummary.bestDelta}мс` : "—"}  Средняя: ${
      myHistorySummary.avgDelta != null ? `${myHistorySummary.avgDelta}мс` : "—"
    }`;
    const line4 = `Категория: ${categoryRuLabel(myCategory)}  •  ${shareSlogan}`;

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#111827"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#22d3ee"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#bg)"/>
  <rect x="70" y="70" width="940" height="940" rx="42" fill="#0b1220" stroke="#1f2937" stroke-width="3"/>
  <text x="120" y="170" fill="#22d3ee" font-size="44" font-family="Inter,Arial,sans-serif" font-weight="700">Дуэль тайминга</text>
  <rect x="120" y="200" width="840" height="8" rx="4" fill="url(#accent)"/>
  <text x="120" y="300" fill="#e5e7eb" font-size="62" font-family="Inter,Arial,sans-serif" font-weight="800">${line1}</text>
  <text x="120" y="390" fill="#10b981" font-size="74" font-family="Inter,Arial,sans-serif" font-weight="900">${line2}</text>
  <text x="120" y="470" fill="#cbd5e1" font-size="40" font-family="Inter,Arial,sans-serif" font-weight="600">${line3}</text>
  <text x="120" y="560" fill="#f8fafc" font-size="36" font-family="Inter,Arial,sans-serif" font-weight="700">${line4}</text>
  <text x="120" y="900" fill="#94a3b8" font-size="30" font-family="Inter,Arial,sans-serif">Нажми вовремя. Забери первое место.</text>
</svg>`;

    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guess-duel-result-${myParticipant?.nickname ?? "player"}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const badgeLeaders = useMemo(() => {
    if (!participants.length) return null;
    const byScore = [...participants].sort((a, b) => b.score - a.score);
    const withMetrics = participants.map((p) => ({
      playerId: p.player_id,
      nickname: p.nickname,
      maxStreak: p.max_streak,
      metrics: playerMetrics[p.player_id],
    }));

    const mostAccurate = [...withMetrics]
      .filter((x) => x.metrics && x.metrics.bestAbsDeltaMs > 0)
      .sort((a, b) => (a.metrics!.bestAbsDeltaMs - b.metrics!.bestAbsDeltaMs))[0];

    const bestStreak = [...withMetrics].sort((a, b) => b.maxStreak - a.maxStreak)[0];

    const fastestTrigger = [...withMetrics]
      .filter((x) => x.metrics && x.metrics.fastestTriggerMs != null)
      .sort((a, b) => (a.metrics!.fastestTriggerMs as number) - (b.metrics!.fastestTriggerMs as number))[0];

    const roundWinner = [...withMetrics]
      .filter((x) => x.metrics && x.metrics.roundsWon > 0)
      .sort((a, b) => b.metrics!.roundsWon - a.metrics!.roundsWon)[0];

    return {
      mostAccurate,
      bestStreak,
      fastestTrigger,
      roundWinner,
      topByScore: byScore[0],
    };
  }, [participants, playerMetrics]);

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

          <div className="text-right flex items-center gap-2">
            <span
              className={clsx(
                "text-[11px] px-2 py-1 rounded-full border font-bold",
                connStatus === "connected" && "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
                connStatus === "reconnecting" && "border-amber-400/40 bg-amber-500/15 text-amber-200",
                connStatus === "disconnected" && "border-rose-400/40 bg-rose-500/15 text-rose-200"
              )}
            >
              {connStatusLabel(connStatus)}
            </span>
            {myParticipant ? <PlayerBadge nickname={myParticipant.nickname} avatar={myParticipant.avatar} compact /> : <div className="text-xs text-zinc-500">Подключение...</div>}
          </div>
        </div>

        {connStatus !== "connected" ? (
          <div
            className={clsx(
              "mt-3 px-3 py-2 rounded-xl border text-xs font-semibold",
              connStatus === "reconnecting" && "border-amber-400/30 bg-amber-500/10 text-amber-200",
              connStatus === "disconnected" && "border-rose-400/30 bg-rose-500/10 text-rose-200"
            )}
          >
            {connStatus === "reconnecting"
              ? "Соединение нестабильно, пытаемся переподключиться. Интерфейс продолжает работать."
              : "Соединение потеряно. Ожидаем восстановление канала и синхронизацию состояния."}
          </div>
        ) : null}

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
                  disabled={!isHost || room.status !== "waiting" || startingGame || connStatus !== "connected"}
                  className={clsx(
                    "w-full px-4 py-3 rounded-xl font-black transition",
                    isHost ? "bg-emerald-500 text-black hover:bg-emerald-400" : "bg-white/10 text-zinc-300 cursor-not-allowed"
                  )}
                >
                  {isHost ? (startingGame ? "Запускаем..." : "Запустить игру") : "Ждём хоста"}
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
                    disabled={!!myGuess || !isRoundReadyForGuess(runningRound) || submittingGuess || connStatus !== "connected"}
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
                      <span className="text-3xl font-black tracking-tight">{submittingGuess ? "..." : "СЕЙЧАС!"}</span>
                      <span className="text-sm font-bold opacity-80">
                        {myGuess ? "зафиксировано" : submittingGuess ? "отправка" : "нажми"}
                      </span>
                    </motion.div>
                  </motion.button>
                </AnimatePresence>
              </div>

              <div className="mt-4 text-xs text-zinc-500">
                Кнопка блокируется после первого нажатия в раунде.
              </div>
              {submitMessage ? (
                <div className="mt-2 text-xs px-3 py-2 rounded-xl border border-amber-400/30 bg-amber-500/10 text-amber-200">
                  {submitMessage}
                </div>
              ) : null}
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
                        <th className="px-3 py-3">Статус</th>
                        <th className="px-3 py-3">Нажал</th>
                        <th className="px-3 py-3">Отклонение</th>
                        <th className="px-3 py-3">Очки</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roundResults.map((row, idx) => {
                        const isWinner =
                          roundModal.round.winner_player_id &&
                          row.player.player_id === roundModal.round.winner_player_id;
                        const absDelta =
                          row.guess.hasGuess && row.guess.delta_ms != null ? Math.abs(row.guess.delta_ms) : null;
                        const result = classifyResult(row.guess.hasGuess ? row.guess.delta_ms : null);
                        const tone = toneClasses(result.tone);

                        return (
                          <motion.tr
                            key={row.player.id}
                            className={clsx(
                              "border-t border-white/5",
                              isWinner && "bg-emerald-500/10 ring-1 ring-inset ring-emerald-400/30"
                            )}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.16, delay: idx * 0.03 }}
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
                            <td className="px-3 py-3">
                              <span className={clsx("text-[11px] px-2 py-1 rounded-full border font-bold", tone.pill)}>
                                {result.label}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-sm text-zinc-200">
                              {row.guess.hasGuess ? formatMs(row.guess.press_time_ms) : "—"}
                            </td>
                            <td className="px-3 py-3 text-sm font-semibold">
                              {row.guess.hasGuess ? (
                                <span className={tone.text}>
                                  {formatMs(row.guess.delta_ms)}{" "}
                                  {absDelta != null ? <span className="text-zinc-500 font-semibold">({absDelta}мс)</span> : null}
                                </span>
                              ) : (
                                <span className="text-zinc-500">нет нажатия</span>
                              )}
                            </td>
                            <td className={clsx("px-3 py-3 text-sm font-black", row.guess.hasGuess ? tone.text : "text-zinc-300")}>
                              {row.guess.hasGuess ? (
                                <>
                                  {row.guess.points}
                                  <div className="text-[11px] font-semibold text-zinc-500 mt-0.5">
                                    {result.label}
                                  </div>
                                </>
                              ) : (
                                0
                              )}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                  <div className="px-2 py-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/10 text-emerald-200">
                    Очень точно
                  </div>
                  <div className="px-2 py-1.5 rounded-lg border border-sky-400/30 bg-sky-500/10 text-sky-200">
                    Средне
                  </div>
                  <div className="px-2 py-1.5 rounded-lg border border-zinc-400/30 bg-zinc-500/10 text-zinc-200">
                    Плохо
                  </div>
                  <div className="px-2 py-1.5 rounded-lg border border-rose-400/30 bg-rose-500/10 text-rose-200">
                    Раннее нажатие
                  </div>
                </div>

                <div className="mt-3 text-xs text-zinc-500">
                  Игроки отсортированы от самого точного к менее точному. Следующий раунд запускается автоматически.
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
                  const stats = playerMetrics[p.player_id];
                  const badges: string[] = [];
                  if (badgeLeaders?.mostAccurate?.playerId === p.player_id) badges.push("Самый точный");
                  if (badgeLeaders?.bestStreak?.playerId === p.player_id) badges.push("Лучшая серия");
                  if (badgeLeaders?.fastestTrigger?.playerId === p.player_id) badges.push("Самый быстрый триггер");
                  if (badgeLeaders?.roundWinner?.playerId === p.player_id) badges.push("Победитель раундов");
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
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {badges.length ? (
                          badges.map((b) => (
                            <span key={b} className="text-[10px] px-2 py-1 rounded-full border border-white/20 bg-white/10 text-zinc-100 font-bold">
                              {b}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-zinc-400">—</span>
                        )}
                      </div>
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
                      <div className="mt-1 text-sm text-zinc-300">
                        Побед в раундах: <span className="text-amber-200 font-semibold">{stats?.roundsWon ?? 0}</span>
                      </div>
                      <div className="mt-1 text-sm text-zinc-300">
                        Ранних нажатий: <span className="text-rose-200 font-semibold">{stats?.earlyPresses ?? 0}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3.5">
                <div className="text-xs uppercase text-zinc-400">Глобальные бейджи матча</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="text-xs px-2 py-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 text-emerald-200">
                    Самый точный: {badgeLeaders?.mostAccurate?.nickname ?? "—"}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full border border-sky-400/30 bg-sky-500/10 text-sky-200">
                    Лучшая серия: {badgeLeaders?.bestStreak?.nickname ?? "—"}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-200">
                    Самый быстрый триггер: {badgeLeaders?.fastestTrigger?.nickname ?? "—"}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full border border-amber-400/30 bg-amber-500/10 text-amber-200">
                    Победитель раундов: {badgeLeaders?.roundWinner?.nickname ?? "—"}
                  </span>
                </div>
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
                      const stats = playerMetrics[p.player_id];
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

              <div className="mt-6 rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 p-4 md:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase text-zinc-300 tracking-wide">Карточка результата</div>
                    <div className="text-xl md:text-2xl font-black mt-1">{myParticipant?.nickname ?? "Игрок"}</div>
                    <div className="text-sm text-zinc-300 mt-1">{shareSlogan}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-zinc-400">Финальная позиция</div>
                    <div className="text-3xl font-black text-emerald-200">#{myPlace ?? "—"}</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2.5 text-sm">
                  <div className="rounded-xl border border-white/15 bg-black/25 px-3 py-2">
                    <div className="text-[11px] text-zinc-400 uppercase">Общий счет</div>
                    <div className="font-black text-white">{myParticipant?.score ?? 0}</div>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-black/25 px-3 py-2">
                    <div className="text-[11px] text-zinc-400 uppercase">Лучшая точность</div>
                    <div className="font-black text-emerald-200">
                      {myHistorySummary.bestDelta != null ? `${myHistorySummary.bestDelta}мс` : "—"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-black/25 px-3 py-2">
                    <div className="text-[11px] text-zinc-400 uppercase">Средняя точность</div>
                    <div className="font-black text-sky-200">
                      {myHistorySummary.avgDelta != null ? `${myHistorySummary.avgDelta}мс` : "—"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-black/25 px-3 py-2">
                    <div className="text-[11px] text-zinc-400 uppercase">Категория</div>
                    <div className="font-black text-zinc-100">{categoryRuLabel(myCategory)}</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={copyResult}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/20 border border-white/20 font-bold transition"
                  >
                    {copiedResult ? "Скопировано" : "Копировать результат"}
                  </button>
                  <button
                    type="button"
                    onClick={downloadResultImage}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 font-bold transition"
                  >
                    Скачать изображение
                  </button>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 md:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-bold">История раундов</div>
                    <div className="text-xs text-zinc-500 mt-1">
                      Детализация результата по каждому сыгранному раунду.
                    </div>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {myHistorySummary.guessedCount}/{myHistorySummary.roundsPlayed} нажатий
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-zinc-400">Best delta</div>
                    <div className="text-sm font-black text-emerald-200">
                      {myHistorySummary.bestDelta != null ? `${myHistorySummary.bestDelta}ms` : "—"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-zinc-400">Average delta</div>
                    <div className="text-sm font-black text-sky-200">
                      {myHistorySummary.avgDelta != null ? `${myHistorySummary.avgDelta}ms` : "—"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-white/5 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-zinc-400">Общий счет</div>
                    <div className="text-sm font-black text-white">{myParticipant?.score ?? 0}</div>
                  </div>
                  <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-zinc-400">Best streak</div>
                    <div className="text-sm font-black text-amber-200">{myParticipant?.max_streak ?? 0}</div>
                  </div>
                  <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-zinc-400">Ранние нажатия</div>
                    <div className="text-sm font-black text-rose-200">{myHistorySummary.earlyPresses}</div>
                  </div>
                  <div className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-zinc-400">Побед в раундах</div>
                    <div className="text-sm font-black text-violet-200">{playerMetrics[playerId ?? ""]?.roundsWon ?? 0}</div>
                  </div>
                </div>

                {/* Desktop table */}
                <div className="mt-4 hidden md:block overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs uppercase text-zinc-400 bg-white/5">
                        <th className="px-3 py-3">Раунд</th>
                        <th className="px-3 py-3">Событие</th>
                        <th className="px-3 py-3">Факт</th>
                        <th className="px-3 py-3">Нажатие</th>
                        <th className="px-3 py-3">Отклонение</th>
                        <th className="px-3 py-3">Очки</th>
                        <th className="px-3 py-3">Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myRoundHistory.map((item) => {
                        const g = item.guess;
                        const label = classifyResult(g?.delta_ms).label;
                        const tone = toneClasses(classifyResult(g?.delta_ms).tone);
                        const isEarly = !!g && g.delta_ms < 0;
                        return (
                          <tr key={item.round.id} className="border-t border-white/5">
                            <td className="px-3 py-3 text-sm font-semibold text-zinc-300">#{item.round.round_number}</td>
                            <td className="px-3 py-3 text-sm text-zinc-100">{item.round.title}</td>
                            <td className="px-3 py-3 text-sm text-zinc-200">{formatMs(item.round.event_time_ms)}</td>
                            <td className="px-3 py-3 text-sm text-zinc-200">{g ? formatMs(g.press_time_ms) : "—"}</td>
                            <td className={clsx("px-3 py-3 text-sm font-semibold", tone.text)}>
                              {g ? formatMs(g.delta_ms) : "—"}
                            </td>
                            <td className={clsx("px-3 py-3 text-sm font-black", tone.text)}>{g ? g.points : 0}</td>
                            <td className="px-3 py-3">
                              <span className={clsx("text-[11px] px-2 py-1 rounded-full border font-bold", tone.pill)}>
                                {g ? (isEarly ? "Слишком рано" : label) : "Момент пропущен"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="mt-4 md:hidden space-y-2.5">
                  {myRoundHistory.map((item) => {
                    const g = item.guess;
                    const result = classifyResult(g?.delta_ms);
                    const tone = toneClasses(result.tone);
                    return (
                      <div key={item.round.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-black">#{item.round.round_number} {item.round.title}</div>
                          <span className={clsx("text-[11px] px-2 py-1 rounded-full border font-bold", tone.pill)}>
                            {g ? result.label : "Момент пропущен"}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <div className="text-zinc-400">
                            Факт: <span className="text-zinc-200 font-semibold">{formatMs(item.round.event_time_ms)}</span>
                          </div>
                          <div className="text-zinc-400">
                            Нажатие: <span className="text-zinc-200 font-semibold">{g ? formatMs(g.press_time_ms) : "—"}</span>
                          </div>
                          <div className={clsx("text-zinc-400", tone.text)}>
                            Отклонение: <span className="font-semibold">{g ? formatMs(g.delta_ms) : "—"}</span>
                          </div>
                          <div className={clsx("text-zinc-400", tone.text)}>
                            Очки: <span className="font-black">{g ? g.points : 0}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

