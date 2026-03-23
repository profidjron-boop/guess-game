export type Category = "sport" | "cyber";

export type PlayerProfile = {
  playerId: string; // local UUID
  nickname: string;
  avatar: string; // emoji or #RRGGBB
};

export type Room = {
  id: string;
  code: string;
  status: "waiting" | "playing" | "finished";
  host_id: string;
  current_round: number;
  total_rounds: number;
  created_at: string;
  started_at: string | null;
  match_slug?: string | null;
  match_title?: string | null;
  match_home_team?: string | null;
  match_away_team?: string | null;
  match_category?: string | null;
  league?: string | null;
  event_type?: string | null;
  event_label?: string | null;
};

export type Participant = {
  id: string;
  room_id: string;
  player_id: string;
  nickname: string;
  avatar: string;
  score: number;
  streak: number;
  max_streak: number;
  connected: boolean;
  ready: boolean;
  created_at: string;
  selected_team?: string | null;
  selected_team_side?: "home" | "away" | null;
};

export type RoundTemplate = {
  round_number: number;
  title: string;
  category: Category;
  duration_ms: number;
};

export type Round = {
  id: string;
  room_id: string;
  round_number: number;
  title: string;
  category: Category;
  duration_ms: number;
  event_time_ms: number | null;
  status: "pending" | "running" | "ended";
  started_at: string | null;
  ended_at: string | null;
  winner_player_id: string | null;
  match_slug?: string | null;
  event_type?: string | null;
  event_label?: string | null;
  round_context?: Record<string, unknown> | null;
};

export type Guess = {
  id: string;
  room_id: string;
  round_id: string;
  player_id: string;
  press_time_ms: number;
  /** null до отметки эталона события на трансляции (mark_round_event) */
  delta_ms: number | null;
  points: number;
  created_at: string;
};

export type LeaderboardRow = {
  id: string;
  room_id: string;
  player_id: string;
  nickname: string;
  avatar: string;
  total_score: number;
  avg_delta_ms: number;
  best_delta_ms: number;
  category: Category;
  played_at: string;
};
