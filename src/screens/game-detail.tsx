import { StyleSheet, Text, View } from 'react-native'

import { Header, ScreenFrame, TextButton } from '@/components/screen'
import { formatAmount, formatSigned, playersByNet, type Game } from '@/lib/ledger'
import { formatPlayedAt } from '@/lib/format'
import { useClub } from '@/state/club-context'
import { colors } from '@/theme'

export function GameDetail({ game, mode }: { game: Game; mode: 'own' | 'shared-club' | 'shared-game' }) {
  const club = useClub()
  const rows = playersByNet(game.players)
  const back =
    mode === 'shared-club'
      ? { label: '← Club', onPress: club.closeSharedGame }
      : mode === 'shared-game'
        ? { label: 'Open app', onPress: club.leaveShare }
        : { label: '← My club', onPress: club.showHome }

  return (
    <ScreenFrame
      header={
        <Header title={game.title || formatPlayedAt(game.playedAt)} serif={false}>
          {mode === 'own' ? (
            <TextButton label={club.shareLabel('open', 'Share game')} onPress={() => club.shareOpenGame(game)} />
          ) : null}
          <TextButton label={back.label} onPress={back.onPress} />
        </Header>
      }
    >
      <View style={styles.head}>
        <Text style={[styles.headText, styles.name]}>Name</Text>
        <Text style={[styles.headText, styles.buy]}>Buy-in</Text>
        <Text style={[styles.headText, styles.left]}>Left</Text>
        <Text style={[styles.headText, styles.net]}>Net</Text>
      </View>
      {rows.map((player) => {
        const tone = player.net > 0 ? styles.win : player.net < 0 ? styles.loss : styles.even
        return (
          <View key={player.name.toLocaleLowerCase()} style={styles.row}>
            <Text numberOfLines={1} style={[styles.cell, styles.name]}>
              {player.name}
            </Text>
            <Text style={[styles.cell, styles.buy]}>{player.buyIns}</Text>
            <Text style={[styles.cell, styles.left]}>{formatAmount(player.left)}</Text>
            <Text style={[styles.netValue, styles.net, tone]}>{formatSigned(player.net)}</Text>
          </View>
        )
      })}
      <View style={styles.foot}>
        <Text style={styles.footText}>Buy-in {formatAmount(game.oneBuyIn)}</Text>
        {game.title ? <Text style={styles.footText}>{formatPlayedAt(game.playedAt)}</Text> : null}
      </View>
    </ScreenFrame>
  )
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  cell: {
    color: colors.ink,
    fontSize: 16,
  },
  name: { flex: 1 },
  buy: { width: 56, textAlign: 'right' },
  left: { width: 72, textAlign: 'right', fontVariant: ['tabular-nums'] },
  net: { width: 84, textAlign: 'right' },
  netValue: {
    fontFamily: 'serif',
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  win: { color: colors.win },
  loss: { color: colors.loss },
  even: { color: colors.muted },
  foot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 16,
  },
  footText: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '600',
  },
})
