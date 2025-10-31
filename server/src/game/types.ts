export type Alignment = 'good' | 'evil';

export type Role =
  | 'merlin'
  | 'percival'
  | 'morgana'
  | 'assassin'
  | 'mordred'
  | 'oberon'
  | 'servant'
  | 'minion';

export type PlayerRole = {
  playerId: string;
  role: Role;
  alignment: Alignment;
};

export type MissionTrack = Array<'success' | 'failure' | 'pending'>; // length up to 5

export type Phase =
  | { kind: 'night_intro' }
  | { kind: 'night_merlin' }
  | { kind: 'night_percival' }
  | { kind: 'night_evil_sync' }
  | { kind: 'day_team_select'; leaderIndex: number; teamSize: number }
  | { kind: 'day_team_vote'; proposal: string[] }
  | { kind: 'mission_vote'; team: string[] }
  | { kind: 'assassination' }
  | { kind: 'game_over'; winner: 'good' | 'evil'; reason: string };

export type GameState = {
  roomCode: string;
  order: string[]; // playerId order for leadership rotation
  leaderIndex: number;
  missionIndex: number; // 0..4
  missionTrack: MissionTrack;
  roles: PlayerRole[]; // secret mapping
  rejectionsInRow: number;
  currentPhase: Phase;
};

export type ModeConfig = {
  includeMordred: boolean;
  includeMorgana: boolean;
  includePercival: boolean;
  includeOberon: boolean;
};


