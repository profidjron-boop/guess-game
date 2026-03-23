export type MatchStatus = "live" | "upcoming" | "finished";
export type MatchCategory =
  | "football"
  | "hockey"
  | "boxing"
  | "tennis"
  | "cs2"
  | "dota2"
  | "valorant";

export type MatchEventMode = {
  eventType: string;
  label: string;
  description: string;
  teamScope: "selected_team" | "neutral";
};

export type MatchCard = {
  id: string;
  slug: string;
  title: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo: string;
  awayTeamLogo: string;
  category: MatchCategory;
  league: string;
  status: MatchStatus;
  startsAt: string;
  modes: MatchEventMode[];
};

export const MATCH_CATEGORIES: Array<{ id: "all" | MatchCategory; label: string }> = [
  { id: "all", label: "Все" },
  { id: "football", label: "Футбол" },
  { id: "hockey", label: "Хоккей" },
  { id: "boxing", label: "Бокс" },
  { id: "tennis", label: "Теннис" },
  { id: "cs2", label: "CS2" },
  { id: "dota2", label: "Dota 2" },
  { id: "valorant", label: "Valorant" },
];

export const MATCHES: MatchCard[] = [
  {
    id: "m1",
    slug: "avangard-neftekhimik-khl",
    title: "Авангард — Нефтехимик",
    homeTeam: "Авангард",
    awayTeam: "Нефтехимик",
    homeTeamLogo: "🦅",
    awayTeamLogo: "🐺",
    category: "hockey",
    league: "KHL",
    status: "live",
    startsAt: "2026-03-24T17:00:00Z",
    modes: [
      {
        eventType: "goal_by_team",
        label: "Гол вашей команды",
        description: "Нажмите в точный момент, когда ваша команда забивает шайбу.",
        teamScope: "selected_team",
      },
    ],
  },
  {
    id: "m2",
    slug: "lokomotiv-spartak-rpl",
    title: "Локомотив — Спартак",
    homeTeam: "Локомотив",
    awayTeam: "Спартак",
    homeTeamLogo: "🚂",
    awayTeamLogo: "🟥",
    category: "football",
    league: "РПЛ",
    status: "upcoming",
    startsAt: "2026-03-24T19:00:00Z",
    modes: [
      {
        eventType: "goal_by_team",
        label: "Гол вашей команды",
        description: "Предсказывайте момент гола выбранной команды.",
        teamScope: "selected_team",
      },
      {
        eventType: "penalty_by_team",
        label: "Пенальти вашей команды",
        description: "Нажмите в момент назначения пенальти вашей команде.",
        teamScope: "selected_team",
      },
    ],
  },
  {
    id: "m3",
    slug: "real-barca-laliga",
    title: "Real Madrid — Barcelona",
    homeTeam: "Real Madrid",
    awayTeam: "Barcelona",
    homeTeamLogo: "⚪",
    awayTeamLogo: "🔵",
    category: "football",
    league: "La Liga",
    status: "live",
    startsAt: "2026-03-24T20:00:00Z",
    modes: [
      {
        eventType: "goal_by_team",
        label: "Goal by your team",
        description: "Tap NOW exactly when your selected team scores.",
        teamScope: "selected_team",
      },
    ],
  },
  {
    id: "m4",
    slug: "fury-usyk-heavyweight",
    title: "Fury — Usyk",
    homeTeam: "Fury",
    awayTeam: "Usyk",
    homeTeamLogo: "🥊",
    awayTeamLogo: "🇺🇦",
    category: "boxing",
    league: "Heavyweight",
    status: "upcoming",
    startsAt: "2026-03-24T21:00:00Z",
    modes: [
      {
        eventType: "knockdown_by_team",
        label: "Нокдаун вашего бойца",
        description: "Нажмите в момент, когда выбранный боец отправляет соперника в нокдаун.",
        teamScope: "selected_team",
      },
    ],
  },
  {
    id: "m5",
    slug: "djokovic-alcaraz-atp",
    title: "Djokovic — Alcaraz",
    homeTeam: "Djokovic",
    awayTeam: "Alcaraz",
    homeTeamLogo: "🎾",
    awayTeamLogo: "🔥",
    category: "tennis",
    league: "ATP",
    status: "live",
    startsAt: "2026-03-24T14:00:00Z",
    modes: [
      {
        eventType: "ace_by_team",
        label: "Эйс вашего игрока",
        description: "Нажмите в момент подачи навылет выбранного теннисиста.",
        teamScope: "selected_team",
      },
    ],
  },
  {
    id: "m6",
    slug: "navi-g2-iem",
    title: "NAVI — G2",
    homeTeam: "NAVI",
    awayTeam: "G2",
    homeTeamLogo: "🟨",
    awayTeamLogo: "⚫",
    category: "cs2",
    league: "IEM",
    status: "live",
    startsAt: "2026-03-24T18:00:00Z",
    modes: [
      {
        eventType: "first_blood_by_team",
        label: "First Blood вашей команды",
        description: "Нажмите в момент первого фрага выбранной команды.",
        teamScope: "selected_team",
      },
      {
        eventType: "ace_by_team",
        label: "Ace вашей команды",
        description: "Предскажите момент эйса выбранной команды.",
        teamScope: "selected_team",
      },
    ],
  },
  {
    id: "m7",
    slug: "spirit-falcons-dota2",
    title: "Team Spirit — Falcons",
    homeTeam: "Team Spirit",
    awayTeam: "Falcons",
    homeTeamLogo: "🐉",
    awayTeamLogo: "🦅",
    category: "dota2",
    league: "DreamLeague",
    status: "live",
    startsAt: "2026-03-24T18:30:00Z",
    modes: [
      {
        eventType: "first_blood_by_team",
        label: "First Blood вашей команды",
        description: "Нажмите в момент First Blood от выбранной команды.",
        teamScope: "selected_team",
      },
      {
        eventType: "tower_destroyed_by_team",
        label: "Первая башня вашей команды",
        description: "Нажмите в момент падения башни от вашей команды.",
        teamScope: "selected_team",
      },
    ],
  },
  {
    id: "m8",
    slug: "fnatic-prx-valorant",
    title: "FNATIC — PRX",
    homeTeam: "FNATIC",
    awayTeam: "PRX",
    homeTeamLogo: "🟧",
    awayTeamLogo: "🟦",
    category: "valorant",
    league: "VCT",
    status: "upcoming",
    startsAt: "2026-03-24T22:00:00Z",
    modes: [
      {
        eventType: "spike_plant_by_team",
        label: "Spike Plant вашей команды",
        description: "Предскажите точный момент установки spike вашей командой.",
        teamScope: "selected_team",
      },
    ],
  },
];

export function getMatchBySlug(slug: string) {
  return MATCHES.find((m) => m.slug === slug) ?? null;
}

export function categoryLabel(category: MatchCategory) {
  switch (category) {
    case "football":
      return "Футбол";
    case "hockey":
      return "Хоккей";
    case "boxing":
      return "Бокс";
    case "tennis":
      return "Теннис";
    case "cs2":
      return "CS2";
    case "dota2":
      return "Dota 2";
    case "valorant":
      return "Valorant";
    default:
      return category;
  }
}
