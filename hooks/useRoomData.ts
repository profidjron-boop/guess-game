"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Participant, Round, Room } from "@/types/game";

export function useRoomData(roomCode: string | null, playerId: string | null) {
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(false);

  const roomId = room?.id ?? null;
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    if (!roomCode) return;
    setLoading(true);
    try {
      const r = await supabase
        .from("rooms")
        .select("*")
        .eq("code", roomCode)
        .single();

      setRoom(r.data as Room);

      const p = await supabase
        .from("participants")
        .select("*")
        .eq("room_id", r.data!.id)
        .order("score", { ascending: false });

      setParticipants((p.data ?? []) as Participant[]);

      const ro = await supabase
        .from("rounds")
        .select("*")
        .eq("room_id", r.data!.id)
        .order("round_number", { ascending: true });

      setRounds((ro.data ?? []) as Round[]);
    } finally {
      setLoading(false);
    }
  }, [roomCode]);

  // Throttle refreshes triggered by realtime events.
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) return;
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      refresh();
    }, 250);
  }, [refresh]);

  useEffect(() => {
    if (!roomCode) return;
    refresh();
  }, [roomCode, refresh]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    };
  }, [roomId, scheduleRefresh]);

  const myParticipant = useMemo(() => {
    if (!playerId) return null;
    return participants.find((p) => p.player_id === playerId) ?? null;
  }, [participants, playerId]);

  return {
    room,
    participants,
    rounds,
    myParticipant,
    loading,
    refresh,
    scheduleRefresh,
  };
}

