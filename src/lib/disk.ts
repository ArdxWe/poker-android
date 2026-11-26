import AsyncStorage from '@react-native-async-storage/async-storage'

import { API_BASE_KEY, CLUB_KEY, ISSUED_KEY, SESSION_KEY, TOKEN_KEY } from './keys.ts'
import { emptySession, normalizeClubRecord, normalizeSession, type ClubRecord } from './normalize.ts'
import type { Session } from './ledger.ts'

export type Desk = {
  session: Session
  token: string | null
  club: ClubRecord | null
  issued: string | null
  apiBase: string | null
}

async function read(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key)
  } catch {
    return null
  }
}

export async function loadDesk(): Promise<Desk> {
  const [sessionRaw, tokenRaw, clubRaw, issuedRaw, apiRaw] = await Promise.all([
    read(SESSION_KEY),
    read(TOKEN_KEY),
    read(CLUB_KEY),
    read(ISSUED_KEY),
    read(API_BASE_KEY),
  ])
  let session = emptySession()
  if (sessionRaw) {
    try {
      session = normalizeSession(JSON.parse(sessionRaw))
    } catch {
      session = emptySession()
    }
  }
  const token = tokenRaw && tokenRaw.length > 0 ? tokenRaw : null
  let club: ClubRecord | null = null
  if (token && clubRaw) {
    try {
      club = normalizeClubRecord(JSON.parse(clubRaw))
    } catch {
      club = null
    }
  }
  return {
    session,
    token,
    club,
    issued: issuedRaw && issuedRaw.length > 0 ? issuedRaw : null,
    apiBase: apiRaw && apiRaw.trim() ? apiRaw.trim() : null,
  }
}

export async function saveSession(session: Session): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export async function saveAuth(token: string, club: ClubRecord): Promise<void> {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [CLUB_KEY, JSON.stringify(club)],
  ])
}

export async function clearAuth(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, CLUB_KEY])
}

export async function saveIssued(password: string): Promise<void> {
  await AsyncStorage.setItem(ISSUED_KEY, password)
}

export async function clearIssued(): Promise<void> {
  await AsyncStorage.removeItem(ISSUED_KEY)
}

export async function saveApiBase(origin: string): Promise<void> {
  await AsyncStorage.setItem(API_BASE_KEY, origin)
}

export async function clearApiBase(): Promise<void> {
  await AsyncStorage.removeItem(API_BASE_KEY)
}
