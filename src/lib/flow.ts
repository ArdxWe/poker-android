import type { Session } from './ledger.ts'

export function canRecord(session: Session): boolean {
  return session.players.some((player) => player.name.trim() && player.left !== null)
}

export function sessionAfterSave(session: Session): Session {
  return {
    ...session,
    players: session.players
      .filter((player) => player.name.trim())
      .map((player) => ({ ...player, buyIns: 1, left: session.oneBuyIn })),
  }
}
