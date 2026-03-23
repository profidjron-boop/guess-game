"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import AvatarPicker from "@/components/AvatarPicker";
import PlayerBadge from "@/components/PlayerBadge";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { categoryLabel, getMatchBySlug } from "@/lib/matches/catalog";
import type { LeaderboardRow, Room } from "@/types/game";

type Props = {
  slug: string;
};

function statusRu(status: "live" | "upcoming" | "finished") {
  if (status === "live") return "LIVE";
  if (status === "upcoming") return "Скоро";
  return "Завершён";
}

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
  const [rooms, setRooms] = useState<Room[]>([]);
  const [rows, setRows] = useState<LeaderboardRow[]>([]);

  const selectedTeam = selectedSide === "home" ? (match?.homeTeam ?? "") : (match?.awayTeam ?? "");
  const selectedEvent = match?.modes[selectedMode] ?? match?.modes[0] ?? null;
  const canProceed = derived.isReady;
  const eventForTeam = `${selectedEvent?.label ?? "Событие"} — ${selectedTeam}`;
  const startsLabel = useMemo(() => {
    const d = new Date(match?.startsAt ?? "");
    if (!match || Number.isNaN(d.getTime())) return statusRu(match?.status ?? "upcoming");
    if (match.status === "upcoming") {
      return `Скоро в ${d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
    }
    return statusRu(match.status);
  }, [match]);

  useEffect(() => {
    if (!match) return;
    let mounted = true;

    const loadRooms = async () => {
      const byMatch = await supabase
        .from("rooms")
        .select("*")
        .eq("status", "waiting")
        .eq("match_slug", match.slug)
        .order("created_at", { ascending: false })
        .limit(12);

      if (!mounted) return;
      if (byMatch.data && byMatch.data.length > 0) {
        setRooms(byMatch.data as Room[]);
        return;
      }

      const fallback = await supabase
        .from("rooms")
        .select("*")
        .eq("status", "waiting")
        .order("created_at", { ascending: false })
        .limit(12);
      if (!mounted) return;
      setRooms((fallback.data ?? []) as Room[]);
    };

    const loadLeaderboard = async () => {
      const matchRooms = await supabase
        .from("rooms")
        .select("id")
        .eq("match_slug", match.slug)
        .eq("status", "finished")
        .limit(100);
      const ids = (matchRooms.data ?? []).map((x) => x.id);
      if (ids.length === 0) {
        if (mounted) setRows([]);
        return;
      }
      const { data } = await supabase
        .from("leaderboard")
        .select("*")
        .in("room_id", ids)
        .order("total_score", { ascending: false })
        .limit(50);
      if (!mounted) return;
      setRows((data ?? []) as LeaderboardRow[]);
    };

    loadRooms();
    loadLeaderboard();
    const id = setInterval(() => {
      loadRooms();
      loadLeaderboard();
    }, 5000);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [match?.slug, match]);

  if (!match) {
    return (
      <div className="gd-page flex items-center justify-center">
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

  const createRoom = async () => {
    if (!profile || !selectedEvent || !match) return;
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
          match_category: match.category,
          league: match.league,
          event_type: selectedEvent.eventType,
          event_label: eventForTeam,
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
    if (!profile || !match) return;
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
    <div className="gd-page">
      <div className="max-w-6xl mx-auto px-4 py-6 pb-28 md:pb-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-zinc-300">
              {categoryLabel(match.category)} • {match.league} • {startsLabel}
            </div>
            <h1 className="text-3xl font-black text-white">
              {match.homeTeam} — {match.awayTeam}
            </h1>
            <div className="text-sm text-zinc-200 mt-1">
              Second-screen игра для болельщиков в реальном времени.
            </div>
          </div>
          <Link href="/" className="gd-btn-secondary">
            К матчам
          </Link>
        </div>

        <div className="mt-5 gd-card p-5 md:p-6 rounded-[28px]">
          <div className="flex items-start justify-between gap-3">
            <span className="gd-chip bg-rose-500/20 border-rose-400/30 text-rose-200">
              {startsLabel}
            </span>
            <span className="gd-chip">{match.league}</span>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-center">
              <div className="text-3xl">{match.homeTeamLogo}</div>
              <div className="mt-1 text-sm font-bold">{match.homeTeam}</div>
            </div>
            <div className="text-xl font-black text-zinc-100">VS</div>
            <div className="text-center">
              <div className="text-3xl">{match.awayTeamLogo}</div>
              <div className="mt-1 text-sm font-bold">{match.awayTeam}</div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 gd-card">
            <div className="text-sm font-semibold text-zinc-200">Выберите сторону</div>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedSide("home")}
                className={[
                  "rounded-[20px] border p-3 text-left transition min-h-[108px]",
                  selectedSide === "home"
                    ? "border-emerald-300/50 bg-emerald-500/20 shadow-[0_12px_28px_rgba(34,197,94,0.2)]"
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
                  "rounded-[20px] border p-3 text-left transition min-h-[108px]",
                  selectedSide === "away"
                    ? "border-emerald-300/50 bg-emerald-500/20 shadow-[0_12px_28px_rgba(34,197,94,0.2)]"
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
              <div className="text-sm font-semibold text-zinc-200">Событие для предсказания</div>
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

            <div className="mt-4 gd-card-soft">
              <div className="text-xs uppercase tracking-wide text-zinc-400">Как играть</div>
              <div className="mt-1 text-sm text-zinc-100">
                Откройте трансляцию и нажмите «СЕЙЧАС!» в момент события.
              </div>
            </div>
          </div>

          <div className="gd-card">
            <div className="text-lg font-black text-white">Играть по матчу</div>
            <div className="text-sm text-zinc-200 mt-1">Матч: {match.title}</div>
            <div className="text-sm text-zinc-200">Событие: {eventForTeam}</div>

            <div className="mt-4 space-y-3">
              <input
                value={profile?.nickname ?? ""}
                onChange={(e) => update({ nickname: e.target.value })}
                placeholder="Никнейм"
                className="gd-input"
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
              className="gd-btn-primary mt-4 w-full disabled:opacity-50"
            >
              {busy === "create" ? "Создаём..." : "Создать комнату"}
            </button>

            <div className="mt-2 flex gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Код комнаты"
                className="gd-input"
              />
              <button
                type="button"
                onClick={joinRoom}
                disabled={!canProceed || !!busy}
                className="gd-btn-secondary disabled:opacity-50"
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

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="gd-card">
            <div className="text-lg font-black text-white">Комнаты по матчу</div>
            <div className="mt-3 space-y-2">
              {rooms.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/25 bg-white/10 px-3 py-3 text-sm text-zinc-200">
                  Активных комнат пока нет. Создайте первую комнату по этому матчу.
                </div>
              ) : (
                rooms.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setJoinCode(r.code)}
                    className="w-full text-left rounded-xl border border-white/20 bg-white/12 hover:bg-white/20 px-3 py-2.5 transition"
                  >
                    <div className="text-sm font-black text-zinc-100">Код: {r.code}</div>
                    <div className="text-xs text-zinc-300">
                      {r.match_title ?? "Комната без матча"} • {r.event_label ?? "Событие матча"}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="gd-card">
            <div className="text-lg font-black text-white">Лидерборд по матчу</div>
            <div className="mt-3 space-y-2">
              {rows.slice(0, 8).map((r, idx) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 flex items-center justify-between"
                >
                  <div className="text-sm">
                    <span className="text-zinc-300 font-black mr-2">#{idx + 1}</span>
                    <span className="text-zinc-100 font-semibold">{r.nickname}</span>
                  </div>
                  <div className="text-sm font-black text-emerald-200">{r.total_score}</div>
                </div>
              ))}
              {rows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/25 bg-white/10 px-3 py-3 text-sm text-zinc-200">
                  Лидерборд пока пуст.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden fixed inset-x-0 bottom-0 z-40 p-4 pb-[max(16px,env(safe-area-inset-bottom))] bg-gradient-to-t from-[#0B1020] to-[#0B1020]/30 backdrop-blur">
        <button
          type="button"
          onClick={createRoom}
          disabled={!canProceed || !!busy}
          className="gd-btn-primary w-full h-14 disabled:opacity-50"
        >
          {busy === "create" ? "Создаём..." : "Создать комнату"}
        </button>
      </div>
    </div>
  );
}
