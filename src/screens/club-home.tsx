import { useEffect, useRef } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { DangerButton, Header, Note, PrimaryButton, ScreenFrame, TextButton } from '@/components/screen'
import { formatSigned } from '@/lib/ledger'
import { formatPlayedAt } from '@/lib/format'
import { standings } from '@/lib/ledger'
import { useClub } from '@/state/club-context'
import { colors } from '@/theme'
import type { Game } from '@/lib/ledger'

export function ClubHome({ mode }: { mode: 'own' | 'share' }) {
  const club = useClub()
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null)
  const readOnly = mode === 'share'
  const games: Game[] = readOnly
    ? club.share?.snapshot.kind === 'club'
      ? club.share.snapshot.games
      : []
    : (club.club?.games ?? [])
  const ranks = standings(games)
  const title = readOnly ? 'Poker club' : (club.club?.name ?? 'Poker club')

  useEffect(() => {
    if (readOnly) return
    const y = club.homeScroll()
    const frame = requestAnimationFrame(() => scrollRef.current?.scrollTo({ y, animated: false }))
    return () => cancelAnimationFrame(frame)
    // Restore once when the club list mounts, not on every score update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly])

  return (
    <ScreenFrame
      scrollRef={scrollRef}
      onScroll={readOnly ? undefined : club.onHomeScroll}
      header={
        <Header title={title}>
          {readOnly ? (
            <TextButton label="Open app" onPress={club.leaveShare} />
          ) : (
            <PrimaryButton
              testID="new-game"
              compact
              label="New game"
              disabled={club.booting || !club.club}
              onPress={club.showTable}
            />
          )}
        </Header>
      }
    >
      <View style={styles.stack}>
        {!readOnly && club.offline && club.club ? (
          <Note>Could not reach the server. Showing the last saved games.</Note>
        ) : null}
        {!readOnly && club.linkMessage && !club.paste?.open ? <Note>{club.linkMessage}</Note> : null}
        {!readOnly && club.booting && !club.club ? (
          <Text style={styles.empty}>Opening club…</Text>
        ) : games.length === 0 ? (
          <Text style={styles.empty}>No games yet</Text>
        ) : (
          <>
            {readOnly ? <Note>Shared club · read only</Note> : null}
            <View>
              <View style={styles.rankHead}>
                <Text style={styles.rankTitle}>Ranking</Text>
                <Text style={styles.rankMeta}>Games</Text>
                <Text style={[styles.rankMeta, styles.right]}>Net</Text>
              </View>
              {ranks.map((row, index) => {
                const tone = row.net > 0 ? styles.win : row.net < 0 ? styles.loss : styles.even
                return (
                  <View key={row.name.toLocaleLowerCase()} style={styles.rankRow}>
                    <View style={styles.nameCell}>
                      <View style={[styles.badge, index === 0 && styles.badgeFirst]}>
                        <Text style={[styles.badgeText, index === 0 && styles.badgeTextFirst]}>{index + 1}</Text>
                      </View>
                      <Text numberOfLines={1} style={styles.playerName}>
                        {row.name}
                      </Text>
                    </View>
                    <Text style={styles.games}>{row.games}</Text>
                    <Text style={[styles.net, tone]}>{formatSigned(row.net)}</Text>
                  </View>
                )
              })}
            </View>
            <View>
              <Pressable accessibilityRole="button" onPress={club.toggleHistory} style={styles.historyHead}>
                <Text style={styles.rankTitle}>Game history</Text>
                <Text style={[styles.caret, club.historyOpen && styles.caretOpen]}>&gt;</Text>
              </Pressable>
              {club.historyOpen
                ? games.map((game) =>
                    !readOnly && club.confirmingGameId === game.id ? (
                      <View key={game.id} style={styles.confirm}>
                        <Text style={styles.confirmTitle}>Remove this game?</Text>
                        {club.writeError ? <Note>{club.writeError}</Note> : null}
                        <View style={styles.confirmActions}>
                          <View style={styles.confirmButton}>
                            <DangerButton label="Remove" onPress={() => void club.confirmRemove()} />
                          </View>
                          <View style={styles.confirmButton}>
                            <TextButton label="Cancel" onPress={club.cancelRemove} />
                          </View>
                        </View>
                      </View>
                    ) : (
                      <View key={game.id} style={styles.historyRow}>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => (readOnly ? club.openSharedGame(game.id) : club.openGame(game.id))}
                          style={styles.historyMain}
                        >
                          {game.title ? (
                            <Text numberOfLines={1} style={styles.gameTitle}>
                              {game.title}
                            </Text>
                          ) : null}
                          <Text numberOfLines={1} style={game.title ? styles.gameTime : styles.gameTitle}>
                            {formatPlayedAt(game.playedAt)}
                          </Text>
                        </Pressable>
                        <TextButton
                          label={club.shareLabel(game.id, 'Share')}
                          onPress={() => club.shareGame(game)}
                        />
                        {readOnly ? null : <TextButton danger label="Remove" onPress={() => club.askRemove(game.id)} />}
                      </View>
                    ),
                  )
                : null}
            </View>
          </>
        )}
        {!readOnly && club.club && !club.booting ? (
          <View style={styles.footer}>
            <TextButton label="Switch club" onPress={club.switchClub} />
            {games.length > 0 ? (
              <TextButton label={club.shareLabel('club', 'Share club')} onPress={club.shareClub} />
            ) : null}
            <TextButton label="Open link" onPress={() => void club.openLink()} />
          </View>
        ) : null}
      </View>
    </ScreenFrame>
  )
}

const styles = StyleSheet.create({
  stack: {
    gap: 18,
    paddingTop: 4,
  },
  empty: {
    color: colors.muted,
    fontSize: 16,
    paddingVertical: 24,
  },
  rankHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rankTitle: {
    flex: 1,
    color: colors.muted,
    fontSize: 15,
    fontWeight: '600',
  },
  rankMeta: {
    width: 64,
    color: colors.muted,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  right: {
    textAlign: 'right',
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  nameCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.rank,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeFirst: {
    backgroundColor: colors.felt,
  },
  badgeText: {
    color: colors.rankInk,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  badgeTextFirst: {
    color: '#ffffff',
  },
  playerName: {
    flex: 1,
    color: colors.ink,
    fontSize: 17,
  },
  games: {
    width: 64,
    textAlign: 'center',
    color: colors.muted,
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  net: {
    width: 84,
    textAlign: 'right',
    fontFamily: 'serif',
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  win: { color: colors.win },
  loss: { color: colors.loss },
  even: { color: colors.muted },
  historyHead: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  caret: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '500',
  },
  caretOpen: {
    transform: [{ rotate: '90deg' }],
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 56,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  historyMain: {
    flex: 1,
    minWidth: 0,
  },
  gameTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '600',
  },
  gameTime: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '500',
  },
  confirm: {
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  confirmTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
  },
  footer: {
    gap: 2,
    paddingTop: 8,
  },
})
