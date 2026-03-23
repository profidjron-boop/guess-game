"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import AvatarPicker from "@/components/AvatarPicker";
import PlayerBadge from "@/components/PlayerBadge";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { getMatchBySlug } from "@/lib/matches/catalog";
import type { Room } from "@/types/game";

type Props = {
  slug: string;
};

function generateRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export default function MatchDetailsScreen({ slug }: Props) {
  const router = useRouter();
  const { profile, derived, update } = usePlayerProfile();
  const match = useMemo(() => getMatchBySlug(slug), [slug]);

  const [selectedSide, setSelectedSide] = useState<"home" | "away">("home");
  const [selectedMode, setSelectedMode] = useState(0);
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!match) {
    return (
      <div className="min-h-screen bg-slate-900 text-zinc-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-black">Матч не найден</div>
          <Link
            href="/"
            className="inline-flex mt-4 px-4 py-2 rounded-xl bg-emerald-500 text-black font-bold"
          >
            К списку матчей
          </Link>
        </div>
      </div>
    );
  }

  const selectedTeam = selectedSide === "home" ? match.homeTeam : match.awayTeam;
  const selectedEvent = match.modes[selectedMode] ?? match.modes[0];
  const canProceed = derived.isReady;

  const createRoom = async () => {
    if (!profile || !selectedEvent) return;
    setError(null);
    setBusy("create");
    try {
      let createdRoom: Room | null = null;

      for (let attempt = 0; attempt < 5 && !createdRoom; attempt++) {
        const code = generateRoomCode();
        const payload = {
          code,
          status: "waiting" as const,
          host_id: profile.playerId,
          current_round: 0,
          total_rounds: 5,
          match_slug: match.slug,
          match_title: match.title,
          match_home_team: match.homeTeam,
          match_away_team: match.awayTeam,
          category:
            match.category === "cs2" || match.category === "dota2" || match.category === "valorant"
              ? "cyber"
              : "sport",
          league: match.league,
          event_type: selectedEvent.eventType,
          event_label: selectedEvent.label,
        };

        const tryInsert = await supabase.from("rooms").insert(payload).select("*").single();
        if (tryInsert.error) {
          // Fallback for databases where migration has not yet added contextual columns.
          const basicInsert = await supabase
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
          if (basicInsert.error) continue;
          createdRoom = basicInsert.data as Room;
        } else {
          createdRoom = tryInsert.data as Room;
        }

        const participantPayload = {
          room_id: createdRoom.id,
          player_id: profile.playerId,
          nickname: profile.nickname,
          avatar: profile.avatar,
          connected: true,
          ready: false,
          selected_team: selectedTeam,
          selected_team_side: selectedSide,
        };
        const participantInsert = await supabase.from("participants").upsert(participantPayload, {
          onConflict: "room_id,player_id",
        });

        if (participantInsert.error) {
          await supabase.from("participants").upsert(
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
        }
      }

      if (!createdRoom) throw new Error("Не удалось создать комнату по матчу.");
      router.push(`/room/${createdRoom.code}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка создания комнаты");
    } finally {
      setBusy(null);
    }
  };

  const joinRoom = async () => {
    if (!profile) return;
    setError(null);
    setBusy("join");
    try {
      const normalized = joinCode.trim().toUpperCase();
      if (!normalized) throw new Error("Введите код комнаты");

      const roomRes = await supabase.from("rooms").select("*").eq("code", normalized).single();
      if (roomRes.error || !roomRes.data) throw new Error("Комната не найдена");
      const room = roomRes.data as Room;

      const participantPayload = {
        room_id: room.id,
        player_id: profile.playerId,
        nickname: profile.nickname,
        avatar: profile.avatar,
        connected: true,
        ready: false,
        selected_team: selectedTeam,
        selected_team_side: selectedSide,
      };
      const participantInsert = await supabase.from("participants").upsert(participantPayload, {
        onConflict: "room_id,player_id",
      });

      if (participantInsert.error) {
        await supabase.from("participants").upsert(
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
      }

      router.push(`/room/${room.code}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка входа");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-700 text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-zinc-300">{match.league}</div>
            <h1 className="text-3xl font-black text-white">
              {match.homeTeam} — {match.awayTeam}
            </h1>
            <div className="text-sm text-zinc-200 mt-1">
              Second-screen игра для болельщиков этого матча.
            </div>
          </div>
          <Link
            href="/"
            className="px-4 py-2 rounded-xl border border-white/25 bg-white/15 hover:bg-white/25 font-semibold"
          >
            К матчам
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-2xl border border-white/20 bg-white/12 p-4">
            <div className="text-sm font-semibold text-zinc-200">Выберите сторону</div>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedSide("home")}
                className={[
                  "rounded-xl border p-3 text-left transition",
                  selectedSide === "home"
                    ? "border-emerald-400/40 bg-emerald-500/20"
                    : "border-white/20 bg-white/10 hover:bg-white/20",
                ].join(" ")}
              >
                <div className="text-lg">{match.homeTeamLogo}</div>
                <div className="font-black">{match.homeTeam}</div>
                {selectedSide === "home" ? (
                  <div className="text-xs text-emerald-200 mt-1">Ваш выбор</div>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => setSelectedSide("away")}
                className={[
                  "rounded-xl border p-3 text-left transition",
                  selectedSide === "away"
                    ? "border-emerald-400/40 bg-emerald-500/20"
                    : "border-white/20 bg-white/10 hover:bg-white/20",
                ].join(" ")}
              >
                <div className="text-lg">{match.awayTeamLogo}</div>
                <div className="font-black">{match.awayTeam}</div>
                {selectedSide === "away" ? (
                  <div className="text-xs text-emerald-200 mt-1">Ваш выбор</div>
                ) : null}
              </button>
            </div>

            <div className="mt-4 text-sm text-zinc-100">
              Вы предсказываете событие для выбранной команды:{" "}
              <span className="text-emerald-200 font-semibold">{selectedTeam}</span>
            </div>

            <div className="mt-4">
              <div className="text-sm font-semibold text-zinc-200">Доступные события</div>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {match.modes.map((mode, idx) => (
                  <button
                    key={mode.eventType}
                    type="button"
                    onClick={() => setSelectedMode(idx)}
                    className={[
                      "rounded-xl border p-3 text-left transition",
                      selectedMode === idx
                        ? "border-sky-400/50 bg-sky-500/20"
                        : "border-white/20 bg-white/10 hover:bg-white/20",
                    ].join(" ")}
                  >
                    <div className="font-bold">{mode.label}</div>
                    <div className="text-xs text-zinc-300 mt-1">{mode.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/12 p-4">
            <div className="text-lg font-black text-white">Играть по матчу</div>
            <div className="text-sm text-zinc-200 mt-1">Match: {match.title}</div>
            <div className="text-sm text-zinc-200">
              Event: {selectedEvent?.label ?? "—"} ({selectedTeam})
            </div>

            <div className="mt-4 space-y-3">
              <input
                value={profile?.nickname ?? ""}
                onChange={(e) => update({ nickname: e.target.value })}
                placeholder="Никнейм"
                className="w-full px-3 py-2.5 rounded-xl bg-white text-zinc-900 border border-zinc-300 outline-none focus:border-emerald-500"
              />
              <AvatarPicker value={profile?.avatar ?? ""} onChange={(a) => update({ avatar: a })} />
              {profile?.nickname && profile?.avatar ? (
                <PlayerBadge nickname={profile.nickname} avatar={profile.avatar} compact />
              ) : null}
            </div>

            <button
              type="button"
              onClick={createRoom}
              disabled={!canProceed || !!busy}
              className="mt-4 w-full px-4 py-3 rounded-xl bg-emerald-500 text-black font-black hover:bg-emerald-400 disabled:opacity-50"
            >
              {busy === "create" ? "Создаём..." : "Создать комнату по матчу"}
            </button>

            <div className="mt-2 flex gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Код комнаты"
                className="w-full px-3 py-2.5 rounded-xl bg-white text-zinc-900 border border-zinc-300 outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={joinRoom}
                disabled={!canProceed || !!busy}
                className="px-4 py-2.5 rounded-xl border border-white/25 bg-white/15 hover:bg-white/25 font-bold disabled:opacity-50"
              >
                {busy === "join" ? "..." : "Войти"}
              </button>
            </div>

            <div className="mt-3 text-xs text-zinc-200">
              Смотрите трансляцию и нажмите «СЕЙЧАС!» в момент целевого события.
            </div>
            {error ? <div className="mt-2 text-sm text-rose-200">{error}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
