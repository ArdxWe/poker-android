import * as Clipboard from 'expo-clipboard'
import Constants from 'expo-constants'
import * as SplashScreen from 'expo-splash-screen'
import { useShareIntent } from 'expo-share-intent'
import {
  createContext,
  use,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AppState, BackHandler, Share } from 'react-native'

import {
  createClub,
  deleteGame,
  openClub,
  refreshClub,
  restoreClub,
  saveGame,
} from '@/lib/club-api'
import { clubEndpoint, LIVE_ORIGIN, normalizeOrigin } from '@/lib/constants'
import { clearApiBase, clearAuth, clearIssued, loadDesk, saveApiBase, saveAuth, saveIssued, saveSession } from '@/lib/disk'
import { canRecord, sessionAfterSave } from '@/lib/flow'
import {
  chipsLeft,
  newId,
  recordGame,
  wholeNumber,
  type Game,
  type Player,
  type Session,
} from '@/lib/ledger'
import { emptySession, type ClubRecord } from '@/lib/normalize'
import { originFromConfig } from '@/lib/runtime-config'
import { buildClubShareUrl, buildShareUrl } from '@/lib/share'
import { readShareFromText, type SharedSnapshot } from '@/lib/share-text'

type Route =
  | { name: 'join' }
  | { name: 'create' }
  | { name: 'pass' }
  | { name: 'home' }
  | { name: 'table' }
  | { name: 'game'; id: string }

type ShareView = { snapshot: SharedSnapshot; openId: string | null }

type Paste = { open: boolean; draft: string }

export type ClubController = {
  ready: boolean
  route: Route
  booting: boolean
  offline: boolean
  club: ClubRecord | null
  issued: string | null
  session: Session
  apiBase: string
  defaultOrigin: string
  switching: boolean
  doorMessage: string
  writeError: string
  linkMessage: string
  historyOpen: boolean
  confirmingGameId: string | null
  namingGame: boolean
  confirmingClear: boolean
  gameName: string
  draftName: string
  saving: boolean
  busy: 'join' | 'create' | null
  copied: boolean
  share: ShareView | null
  paste: Paste | null
  shareLabel: (id: string, idle: string) => string
  onHomeScroll: (y: number) => void
  homeScroll: () => number
  join: (password: string) => Promise<void>
  create: (name: string) => Promise<void>
  enterClub: () => Promise<void>
  showCreate: () => void
  showJoin: () => void
  clearDoor: () => void
  switchClub: () => void
  backToClub: () => void
  showTable: () => void
  showHome: () => void
  openGame: (id: string) => void
  toggleHistory: () => void
  askRemove: (id: string) => void
  cancelRemove: () => void
  confirmRemove: () => Promise<void>
  setOneBuyIn: (raw: string) => void
  seatPlayer: (name: string) => void
  renamePlayer: (id: string, name: string) => void
  changeBuyIns: (id: string, delta: number) => void
  setBuyIns: (id: string, raw: string) => void
  setLeft: (id: string, raw: string) => void
  removePlayer: (id: string) => void
  setDraftName: (value: string) => void
  setGameName: (value: string) => void
  beginSave: () => void
  cancelSave: () => void
  commitSave: () => Promise<void>
  askClear: () => void
  cancelClear: () => void
  confirmClear: () => void
  shareGame: (game: Game) => void
  shareOpenGame: (game: Game) => void
  shareClub: () => void
  copyPassword: () => Promise<void>
  sharePassword: () => Promise<void>
  openLink: () => Promise<void>
  setPasteDraft: (value: string) => void
  submitPaste: () => void
  closePaste: () => void
  leaveShare: () => void
  openSharedGame: (id: string) => void
  closeSharedGame: () => void
  commitApiBase: (raw: string) => Promise<void>
  resetApiBase: () => Promise<void>
}

const ClubContext = createContext<ClubController | null>(null)

export function useClub(): ClubController {
  const value = use(ClubContext)
  if (!value) throw new Error('Club screen rendered outside the club provider')
  return value
}

export function ClubProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [route, setRoute] = useState<Route>({ name: 'join' })
  const [booting, setBooting] = useState(false)
  const [offline, setOffline] = useState(false)
  const [club, setClub] = useState<ClubRecord | null>(null)
  const [issued, setIssued] = useState<string | null>(null)
  const [session, setSession] = useState<Session>(emptySession())
  const [apiBase, setApiBase] = useState(LIVE_ORIGIN)
  const [defaultOrigin, setDefaultOrigin] = useState(LIVE_ORIGIN)
  const [switching, setSwitching] = useState(false)
  const [doorMessage, setDoorMessage] = useState('')
  const [writeError, setWriteError] = useState('')
  const [linkMessage, setLinkMessage] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [confirmingGameId, setConfirmingGameId] = useState<string | null>(null)
  const [namingGame, setNamingGame] = useState(false)
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [gameName, setGameName] = useState('')
  const [draftName, setDraftName] = useState('')
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState<'join' | 'create' | null>(null)
  const [copied, setCopied] = useState(false)
  const [share, setShare] = useState<ShareView | null>(null)
  const [paste, setPaste] = useState<Paste | null>(null)
  const [shareFlash, setShareFlash] = useState<{ id: string; text: string } | null>(null)

  const tokenRef = useRef<string | null>(null)
  const clubRef = useRef<ClubRecord | null>(null)
  const issuedRef = useRef<string | null>(null)
  const sessionRef = useRef(session)
  const gameNameRef = useRef(gameName)
  const apiRef = useRef(LIVE_ORIGIN)
  const generation = useRef(0)
  const busyRef = useRef<'join' | 'create' | null>(null)
  const savingRef = useRef(false)
  const live = useRef(true)
  const scrollY = useRef(0)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handledShare = useRef('')

  sessionRef.current = session
  gameNameRef.current = gameName
  clubRef.current = club
  issuedRef.current = issued

  const shareIntent = useShareIntent({
    disabled: Constants.executionEnvironment === 'storeClient' || process.env.EXPO_OS === 'web',
    resetOnBackground: false,
  })

  function bump() {
    generation.current += 1
    return generation.current
  }

  function flash(id: string, text: string) {
    if (flashTimer.current) clearTimeout(flashTimer.current)
    setShareFlash({ id, text })
    flashTimer.current = setTimeout(() => setShareFlash(null), 1800)
  }

  function rememberClub(nextToken: string, nextClub: ClubRecord) {
    tokenRef.current = nextToken
    clubRef.current = nextClub
    setClub(nextClub)
    void saveAuth(nextToken, nextClub)
  }

  async function restore(token: string) {
    const seen = generation.current
    const result = await restoreClub(clubEndpoint(apiRef.current), token)
    if (!live.current || generation.current !== seen || tokenRef.current !== token) return
    if (result.kind === 'ok') {
      rememberClub(result.token, result.club)
      setBooting(false)
      setOffline(false)
      return
    }
    setBooting(false)
    if (result.kind === 'invalid') {
      tokenRef.current = null
      clubRef.current = null
      setClub(null)
      setOffline(false)
      await clearAuth()
      if (!issuedRef.current) setRoute({ name: 'join' })
      return
    }
    if (clubRef.current) setOffline(true)
    else if (!issuedRef.current) {
      setOffline(false)
      setRoute({ name: 'join' })
    }
  }

  async function refresh() {
    const token = tokenRef.current
    if (!token) return
    const seen = generation.current
    const result = await refreshClub(clubEndpoint(apiRef.current), token)
    if (!live.current || generation.current !== seen || tokenRef.current !== token) return
    if (!result.ok) {
      setOffline(true)
      return
    }
    rememberClub(token, result.club)
    setOffline(false)
  }

  const refreshRef = useRef(refresh)
  refreshRef.current = refresh

  function acceptSharedText(text: string) {
    const shared = readShareFromText(text)
    if (!shared) {
      setLinkMessage('That link is not a shared game.')
      return
    }
    setShare({ snapshot: shared, openId: null })
    setLinkMessage('')
    setPaste(null)
  }

  const acceptRef = useRef(acceptSharedText)
  acceptRef.current = acceptSharedText

  useEffect(() => {
    live.current = true
    return () => {
      live.current = false
    }
  }, [])

  useEffect(() => {
    let active = true
    loadDesk()
      .then((desk) => {
        if (!active) return
        const configured = originFromConfig()
        const origin = desk.apiBase ? normalizeOrigin(desk.apiBase) : configured
        apiRef.current = origin
        tokenRef.current = desk.token
        clubRef.current = desk.club
        issuedRef.current = desk.issued
        sessionRef.current = desk.session
        setSession(desk.session)
        setClub(desk.club)
        setIssued(desk.issued)
        setApiBase(origin)
        setDefaultOrigin(configured)
        setRoute(desk.issued ? { name: 'pass' } : desk.token ? { name: 'home' } : { name: 'join' })
        setBooting(Boolean(desk.token && !desk.club))
        setReady(true)
        void SplashScreen.hideAsync()
        if (desk.token) void restore(desk.token)
      })
      .catch(() => {
        if (!active) return
        setReady(true)
        setRoute({ name: 'join' })
        void SplashScreen.hideAsync()
      })
    return () => {
      active = false
    }
    // Hydrate once. restore reads the latest refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!ready) return
    void saveSession(session)
  }, [ready, session])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refreshRef.current()
    })
    return () => sub.remove()
  }, [])

  const resetShareRef = useRef(shareIntent.resetShareIntent)
  resetShareRef.current = shareIntent.resetShareIntent

  useEffect(() => {
    if (!ready || !shareIntent.hasShareIntent) {
      if (!shareIntent.hasShareIntent) handledShare.current = ''
      return
    }
    const text = shareIntent.shareIntent.webUrl || shareIntent.shareIntent.text || ''
    if (!text || handledShare.current === text) return
    handledShare.current = text
    acceptRef.current(text)
    resetShareRef.current()
  }, [ready, shareIntent.hasShareIntent, shareIntent.shareIntent.text, shareIntent.shareIntent.webUrl])

  function leaveShare() {
    setShare(null)
    setPaste(null)
    setLinkMessage('')
    if (issuedRef.current) setRoute({ name: 'pass' })
    else if (tokenRef.current) setRoute({ name: 'home' })
    else setRoute({ name: 'join' })
  }

  function onBack(): boolean {
    if (paste?.open) {
      setPaste(null)
      return true
    }
    if (namingGame) {
      setNamingGame(false)
      setGameName('')
      return true
    }
    if (confirmingClear) {
      setConfirmingClear(false)
      return true
    }
    if (confirmingGameId) {
      setConfirmingGameId(null)
      setWriteError('')
      return true
    }
    if (share) {
      if (share.snapshot.kind === 'club' && share.openId) {
        setShare({ ...share, openId: null })
        return true
      }
      leaveShare()
      return true
    }
    if (route.name === 'pass') return true
    if (route.name === 'table' || route.name === 'game') {
      setRoute({ name: 'home' })
      return true
    }
    if (route.name === 'create') {
      setDoorMessage('')
      setRoute({ name: 'join' })
      return true
    }
    if (route.name === 'join' && switching && clubRef.current) {
      setSwitching(false)
      setDoorMessage('')
      setRoute({ name: 'home' })
      return true
    }
    return false
  }

  const onBackRef = useRef(onBack)
  onBackRef.current = onBack

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => onBackRef.current())
    return () => sub.remove()
  }, [])

  async function publish(url: string, id: string) {
    let label = 'Link copied'
    try {
      await Clipboard.setStringAsync(url)
    } catch {
      label = 'Copy the link'
    }
    flash(id, label)
    try {
      await Share.share({ message: url })
    } catch {
      // The share sheet was dismissed or is not available.
    }
  }

  const value: ClubController = {
    ready,
    route,
    booting,
    offline,
    club,
    issued,
    session,
    apiBase,
    defaultOrigin,
    switching,
    doorMessage,
    writeError,
    linkMessage,
    historyOpen,
    confirmingGameId,
    namingGame,
    confirmingClear,
    gameName,
    draftName,
    saving,
    busy,
    copied,
    share,
    paste,
    shareLabel(id, idle) {
      return shareFlash?.id === id ? shareFlash.text : idle
    },
    onHomeScroll(y) {
      scrollY.current = y
    },
    homeScroll() {
      return scrollY.current
    },
    async join(password) {
      if (!password.trim() || busyRef.current) return
      busyRef.current = 'join'
      setBusy('join')
      setDoorMessage('')
      const seen = bump()
      try {
        const result = await openClub(clubEndpoint(apiRef.current), password)
        if (!live.current || generation.current !== seen) return
        if (!result.ok) {
          setDoorMessage(result.message)
          return
        }
        rememberClub(result.token, result.club)
        setSwitching(false)
        setOffline(false)
        setDoorMessage('')
        setRoute({ name: 'home' })
      } finally {
        busyRef.current = null
        if (live.current) setBusy(null)
      }
    },
    async create(name) {
      if (busyRef.current) return
      busyRef.current = 'create'
      setBusy('create')
      setDoorMessage('')
      const seen = bump()
      try {
        const result = await createClub({ url: clubEndpoint(apiRef.current), name })
        if (!live.current || generation.current !== seen) return
        if (!result.ok) {
          setDoorMessage(result.message)
          return
        }
        issuedRef.current = result.password
        rememberClub(result.token, result.club)
        setIssued(result.password)
        await saveIssued(result.password)
        setCopied(false)
        setOffline(false)
        setDoorMessage('')
        setRoute({ name: 'pass' })
      } finally {
        busyRef.current = null
        if (live.current) setBusy(null)
      }
    },
    async enterClub() {
      issuedRef.current = null
      setIssued(null)
      setCopied(false)
      await clearIssued()
      setRoute(tokenRef.current ? { name: 'home' } : { name: 'join' })
    },
    showCreate() {
      setDoorMessage('')
      setRoute({ name: 'create' })
    },
    showJoin() {
      setDoorMessage('')
      setRoute({ name: 'join' })
    },
    clearDoor() {
      setDoorMessage('')
    },
    switchClub() {
      setSwitching(true)
      setDoorMessage('')
      setWriteError('')
      setRoute({ name: 'join' })
    },
    backToClub() {
      setSwitching(false)
      setDoorMessage('')
      setRoute({ name: 'home' })
    },
    showTable() {
      if (booting || !tokenRef.current || !clubRef.current) return
      scrollY.current = 0
      setShare(null)
      setLinkMessage('')
      setRoute({ name: 'table' })
    },
    showHome() {
      setRoute({ name: 'home' })
    },
    openGame(id) {
      setConfirmingGameId(null)
      setWriteError('')
      setRoute({ name: 'game', id })
    },
    toggleHistory() {
      setHistoryOpen((open) => !open)
      setConfirmingGameId(null)
      setWriteError('')
    },
    askRemove(id) {
      setConfirmingGameId(id)
      setWriteError('')
    },
    cancelRemove() {
      setConfirmingGameId(null)
      setWriteError('')
    },
    async confirmRemove() {
      const id = confirmingGameId
      const token = tokenRef.current
      if (!id || !token) return
      const seen = bump()
      const removed = await deleteGame(clubEndpoint(apiRef.current), token, id)
      if (!live.current || generation.current !== seen) return
      if (!removed.ok) {
        setWriteError(removed.message)
        if (removed.offline) setOffline(true)
        return
      }
      rememberClub(token, removed.club)
      setOffline(false)
      setWriteError('')
      setConfirmingGameId(null)
      setRoute((current) => (current.name === 'game' && current.id === id ? { name: 'home' } : current))
    },
    setOneBuyIn(raw) {
      const parsed = wholeNumber(Number(raw))
      if (parsed === null || parsed < 1) return
      setSession((current) => ({ ...current, oneBuyIn: parsed }))
    },
    seatPlayer(name) {
      const trimmed = name.trim()
      if (!trimmed) return
      const key = trimmed.toLocaleLowerCase()
      setSession((current) => {
        if (current.players.some((player) => player.name.trim().toLocaleLowerCase() === key)) return current
        const player: Player = { id: newId(), name: trimmed, buyIns: 1, left: null }
        return { ...current, players: [...current.players, player] }
      })
      setDraftName('')
      setNamingGame(false)
      setConfirmingClear(false)
    },
    renamePlayer(id, name) {
      setSession((current) => ({
        ...current,
        players: current.players.map((player) => (player.id === id ? { ...player, name } : player)),
      }))
    },
    changeBuyIns(id, delta) {
      setSession((current) => ({
        ...current,
        players: current.players.map((player) => {
          if (player.id !== id) return player
          const next = wholeNumber(player.buyIns + delta)
          if (next === null) return player
          return { ...player, buyIns: next }
        }),
      }))
    },
    setBuyIns(id, raw) {
      const parsed = chipsLeft(raw)
      if (parsed === null) return
      setSession((current) => ({
        ...current,
        players: current.players.map((player) => (player.id === id ? { ...player, buyIns: parsed } : player)),
      }))
    },
    setLeft(id, raw) {
      setSession((current) => ({
        ...current,
        players: current.players.map((player) => {
          if (player.id !== id) return player
          if (raw === '') return { ...player, left: null }
          const parsed = chipsLeft(raw)
          if (parsed === null) return player
          return { ...player, left: parsed }
        }),
      }))
    },
    removePlayer(id) {
      setSession((current) => ({ ...current, players: current.players.filter((player) => player.id !== id) }))
    },
    setDraftName,
    setGameName,
    beginSave() {
      if (!canRecord(sessionRef.current)) return
      setConfirmingClear(false)
      setNamingGame(true)
    },
    cancelSave() {
      setNamingGame(false)
      setGameName('')
    },
    async commitSave() {
      if (savingRef.current) return
      const current = sessionRef.current
      if (!canRecord(current)) return
      const game = recordGame(current, new Date().toISOString(), newId(), gameNameRef.current)
      if (!game) return
      const token = tokenRef.current
      if (!token || !clubRef.current) {
        setWriteError('Create a club before saving this game.')
        return
      }
      savingRef.current = true
      setSaving(true)
      const seen = bump()
      try {
        const saved = await saveGame(clubEndpoint(apiRef.current), token, game)
        if (!live.current || generation.current !== seen) return
        if (!saved.ok) {
          setWriteError(saved.message)
          if (saved.offline) setOffline(true)
          return
        }
        rememberClub(token, saved.club)
        setOffline(false)
        setWriteError('')
        setGameName('')
        setNamingGame(false)
        setConfirmingClear(false)
        setSession(sessionAfterSave(current))
        setRoute({ name: 'home' })
      } finally {
        savingRef.current = false
        if (live.current) setSaving(false)
      }
    },
    askClear() {
      if (sessionRef.current.players.length === 0) return
      setNamingGame(false)
      setConfirmingClear(true)
    },
    cancelClear() {
      setConfirmingClear(false)
    },
    confirmClear() {
      setSession((current) => ({ ...current, players: [] }))
      setConfirmingClear(false)
    },
    shareGame(game) {
      setConfirmingGameId(null)
      void publish(buildShareUrl(game, LIVE_ORIGIN, '/'), game.id)
    },
    shareOpenGame(game) {
      void publish(buildShareUrl(game, LIVE_ORIGIN, '/'), 'open')
    },
    shareClub() {
      const games = clubRef.current?.games ?? []
      const url = buildClubShareUrl(games, LIVE_ORIGIN, '/')
      if (!url) {
        flash('club', 'Too big')
        return
      }
      setConfirmingGameId(null)
      void publish(url, 'club')
    },
    async copyPassword() {
      const password = issuedRef.current
      if (!password) return
      try {
        await Clipboard.setStringAsync(password)
        setCopied(true)
      } catch {
        setCopied(false)
      }
    },
    async sharePassword() {
      const password = issuedRef.current
      if (!password) return
      try {
        await Share.share({ message: password })
      } catch {
        // The share sheet was dismissed or is not available.
      }
    },
    async openLink() {
      let text = ''
      try {
        text = await Clipboard.getStringAsync()
      } catch {
        text = ''
      }
      const shared = text ? readShareFromText(text) : null
      if (shared) {
        setShare({ snapshot: shared, openId: null })
        setLinkMessage('')
        setPaste(null)
        return
      }
      setPaste({ open: true, draft: text })
      setLinkMessage(text.trim() ? 'That link is not a shared game.' : '')
    },
    setPasteDraft(draft) {
      setPaste((current) => (current ? { ...current, draft } : current))
    },
    submitPaste() {
      const draft = paste?.draft ?? ''
      const shared = readShareFromText(draft)
      if (!shared) {
        setLinkMessage('That link is not a shared game.')
        return
      }
      setShare({ snapshot: shared, openId: null })
      setLinkMessage('')
      setPaste(null)
    },
    closePaste() {
      setPaste(null)
    },
    leaveShare,
    openSharedGame(id) {
      setShare((current) => (current ? { ...current, openId: id } : current))
    },
    closeSharedGame() {
      setShare((current) => (current ? { ...current, openId: null } : current))
    },
    async commitApiBase(raw) {
      const origin = normalizeOrigin(raw)
      apiRef.current = origin
      setApiBase(origin)
      if (origin === defaultOrigin) await clearApiBase()
      else await saveApiBase(origin)
    },
    async resetApiBase() {
      apiRef.current = defaultOrigin
      setApiBase(defaultOrigin)
      await clearApiBase()
    },
  }

  return <ClubContext value={value}>{children}</ClubContext>
}
