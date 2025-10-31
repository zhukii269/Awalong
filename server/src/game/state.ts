import { GameState, ModeConfig, PlayerRole } from './types';

const teamSizeByPlayers: Record<number, [number, number, number, number, number]> = {
  5: [2, 3, 2, 3, 3],
  6: [2, 3, 4, 3, 4],
  7: [2, 3, 3, 4, 4],
  8: [3, 4, 4, 5, 5],
  9: [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5]
};

export function chooseRoles(playerIds: string[], mode: ModeConfig): PlayerRole[] {
  // Minimal role assignment for skeleton: ensure one assassin and merlin, rest servants/minions
  const num = playerIds.length;
  const numEvil = num === 5 || num === 6 ? 2 : num === 7 || num === 8 ? 3 : 4;
  const evilIds = shuffle([...playerIds]).slice(0, numEvil);
  const roles: PlayerRole[] = [];
  // Assign Merlin
  const merlinId = sample(playerIds.filter((id) => !evilIds.includes(id)));
  roles.push({ playerId: merlinId, role: 'merlin', alignment: 'good' });
  // Assign Assassin among evil
  const assassinId = sample(evilIds);
  roles.push({ playerId: assassinId, role: 'assassin', alignment: 'evil' });
  // Optional roles
  if (mode.includeMorgana && evilIds.length > 1) {
    const remainingEvil = evilIds.filter((id) => id !== assassinId);
    const morganaId = sample(remainingEvil);
    if (!roles.find((r) => r.playerId === morganaId)) {
      roles.push({ playerId: morganaId, role: 'morgana', alignment: 'evil' });
    }
  }
  if (mode.includeMordred && evilIds.length > 1) {
    const candidates = evilIds.filter((id) => !roles.find((r) => r.playerId === id));
    if (candidates.length) {
      const id = sample(candidates);
      roles.push({ playerId: id, role: 'mordred', alignment: 'evil' });
    }
  }
  if (mode.includePercival) {
    const goodCandidates = playerIds.filter((id) => !evilIds.includes(id) && id !== merlinId);
    const id = sample(goodCandidates);
    roles.push({ playerId: id, role: 'percival', alignment: 'good' });
  }
  // Fill remaining evil as minions, good as servants
  for (const id of evilIds) {
    if (!roles.find((r) => r.playerId === id)) {
      roles.push({ playerId: id, role: 'minion', alignment: 'evil' });
    }
  }
  for (const id of playerIds) {
    if (!roles.find((r) => r.playerId === id)) {
      roles.push({ playerId: id, role: 'servant', alignment: 'good' });
    }
  }
  return roles;
}

export function createInitialGameState(roomCode: string, playerIds: string[], mode: ModeConfig): GameState {
  const order = shuffle([...playerIds]);
  const roles = chooseRoles(order, mode);
  return {
    roomCode,
    order,
    leaderIndex: 0,
    missionIndex: 0,
    missionTrack: ['pending', 'pending', 'pending', 'pending', 'pending'],
    roles,
    rejectionsInRow: 0,
    currentPhase: { kind: 'night_intro' }
  };
}

export function teamSizeFor(state: GameState): number {
  const sizes = teamSizeByPlayers[state.order.length];
  return sizes[state.missionIndex];
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sample<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}


