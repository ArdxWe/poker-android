import { Pressable, StyleSheet, Text, View } from 'react-native'

import { Field, Header, Note, OutlineButton, PaperInput, PrimaryButton, ScreenFrame, TextButton, useNarrow } from '@/components/screen'
import { canRecord } from '@/lib/flow'
import { formatAmount, formatSigned, playerNet, standings, summarize } from '@/lib/ledger'
import { useClub } from '@/state/club-context'
import { colors } from '@/theme'

export function TableScreen() {
  const club = useClub()
  const narrow = useNarrow()
  const summary = summarize(club.session)
  const roster = standings(club.club?.games ?? []).map((row) => row.name)
  const seated = new Set(club.session.players.map((player) => player.name.trim().toLocaleLowerCase()))
  const available = roster.filter((name) => !seated.has(name.toLocaleLowerCase()))
  const ready = canRecord(club.session)

  return (
    <ScreenFrame
      header={
        <Header title="New game">
          <TextButton label="My club" onPress={club.showHome} />
        </Header>
      }
    >
      <View style={styles.stack}>
        {club.linkMessage && !club.paste?.open ? <Note>{club.linkMessage}</Note> : null}
        <View style={styles.buyInRow}>
          <Text style={styles.buyInLabel}>One buy-in</Text>
          <PaperInput
            accessibilityLabel="One buy-in"
            keyboardType="number-pad"
            tone="card"
            value={String(club.session.oneBuyIn)}
            onChangeText={club.setOneBuyIn}
            style={styles.buyInInput}
          />
        </View>
        {club.session.players.map((player) => {
          const net = playerNet(player, club.session.oneBuyIn)
          const tone = net === null || net === 0 ? styles.even : net > 0 ? styles.win : styles.loss
          return (
            <View key={player.id} style={styles.player}>
              <View style={styles.nameRow}>
                <PaperInput
                  accessibilityLabel={`Name for ${player.name || 'player'}`}
                  value={player.name}
                  onChangeText={(value) => club.renamePlayer(player.id, value)}
                  style={styles.nameInput}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove"
                  onPress={() => club.removePlayer(player.id)}
                  style={styles.remove}
                >
                  <Text style={styles.removeMark}>×</Text>
                </Pressable>
              </View>
              <View style={styles.statRow}>
                <View style={styles.stepper}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove a buy-in from ${player.name}`}
                    onPress={() => club.changeBuyIns(player.id, -1)}
                    style={({ pressed }) => [styles.step, pressed && styles.stepPressed]}
                  >
                    {({ pressed }) => <Text style={[styles.stepMark, pressed && styles.stepMarkPressed]}>−</Text>}
                  </Pressable>
                  <PaperInput
                    accessibilityLabel={`Buy-ins for ${player.name}`}
                    keyboardType="number-pad"
                    value={String(player.buyIns)}
                    onChangeText={(value) => club.setBuyIns(player.id, value)}
                    style={styles.stepInput}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Add a buy-in for ${player.name}`}
                    onPress={() => club.changeBuyIns(player.id, 1)}
                    style={({ pressed }) => [styles.step, pressed && styles.stepPressed]}
                  >
                    {({ pressed }) => <Text style={[styles.stepMark, pressed && styles.stepMarkPressed]}>+</Text>}
                  </Pressable>
                </View>
                <PaperInput
                  accessibilityLabel={`Chips left for ${player.name}`}
                  keyboardType="number-pad"
                  tone="card"
                  value={player.left === null ? '' : String(player.left)}
                  onChangeText={(value) => club.setLeft(player.id, value)}
                  placeholder="Left"
                  style={styles.leftInput}
                />
                <Text style={[styles.net, tone]}>{net === null ? '—' : formatSigned(net)}</Text>
              </View>
            </View>
          )
        })}

        {available.length > 0 ? (
          <View style={styles.saved}>
            <Text style={styles.savedLabel}>Saved players</Text>
            <View style={styles.chips}>
              {available.map((name) => (
                <Pressable key={name.toLocaleLowerCase()} onPress={() => club.seatPlayer(name)} style={styles.chip}>
                  <Text style={styles.chipText}>{name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.addRow}>
          <View style={styles.addField}>
            <Field
              accessibilityLabel="Player name"
              placeholder="Name"
              value={club.draftName}
              onChangeText={club.setDraftName}
              autoCapitalize="words"
              onSubmitEditing={() => club.seatPlayer(club.draftName)}
            />
          </View>
          <PrimaryButton compact label="Add" onPress={() => club.seatPlayer(club.draftName)} testID="add-player" />
        </View>

        <View style={styles.summary}>
          <SummaryCell label="Total buy-ins" value={formatAmount(summary.totalBuyIns)} narrow={narrow} />
          <SummaryCell label="Total in" value={formatAmount(summary.totalIn)} narrow={narrow} />
          <SummaryCell label="Total left" value={formatAmount(summary.totalLeft)} narrow={narrow} />
          <SummaryCell
            label="Off by"
            value={formatSigned(summary.offBy)}
            narrow={narrow}
            tone={summary.offBy > 0 ? 'win' : summary.offBy < 0 ? 'loss' : 'even'}
          />
        </View>

        {club.namingGame ? (
          <View style={styles.stack}>
            <Field
              accessibilityLabel="Game name"
              placeholder="Game name (optional)"
              value={club.gameName}
              onChangeText={club.setGameName}
            />
            <View style={styles.actionRow}>
              <View style={styles.action}>
                <PrimaryButton
                  testID="save-game"
                  label="Save"
                  disabled={!ready || club.saving}
                  onPress={() => void club.commitSave()}
                />
              </View>
              <View style={styles.action}>
                <OutlineButton label="Cancel" onPress={club.cancelSave} />
              </View>
            </View>
            {club.writeError ? <Note>{club.writeError}</Note> : null}
          </View>
        ) : club.confirmingClear ? (
          <View style={styles.stack}>
            <Text style={styles.confirm}>Clear all players?</Text>
            <View style={styles.actionRow}>
              <View style={styles.action}>
                <Pressable
                  accessibilityRole="button"
                  onPress={club.confirmClear}
                  style={({ pressed }) => [styles.clearDanger, pressed && styles.clearDangerPressed]}
                >
                  <Text style={styles.clearDangerLabel}>Clear</Text>
                </Pressable>
              </View>
              <View style={styles.action}>
                <OutlineButton label="Cancel" onPress={club.cancelClear} />
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <View style={styles.action}>
              <PrimaryButton label="Save game" disabled={!ready} onPress={club.beginSave} testID="save-game" />
            </View>
            <View style={styles.action}>
              <OutlineButton label="Clear" disabled={club.session.players.length === 0} onPress={club.askClear} />
            </View>
          </View>
        )}
      </View>
    </ScreenFrame>
  )
}

function SummaryCell({
  label,
  value,
  narrow,
  tone = 'even',
}: {
  label: string
  value: string
  narrow: boolean
  tone?: 'win' | 'loss' | 'even'
}) {
  return (
    <View style={[styles.summaryCell, narrow && styles.summaryCellNarrow]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, tone === 'win' ? styles.win : tone === 'loss' ? styles.loss : styles.ink]}>
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  stack: { gap: 14, paddingTop: 8 },
  buyInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  buyInLabel: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  buyInInput: {
    width: 104,
    flex: 0,
    textAlign: 'right',
    fontFamily: 'serif',
    fontSize: 22,
    fontVariant: ['tabular-nums'],
  },
  player: {
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameInput: {
    flex: 1,
  },
  remove: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeMark: { color: colors.danger, fontSize: 28, lineHeight: 30 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  step: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPressed: { backgroundColor: colors.felt, borderColor: colors.felt },
  stepMark: { color: colors.felt, fontSize: 22, fontWeight: '600' },
  stepMarkPressed: { color: '#ffffff' },
  stepInput: {
    width: 52,
    flex: 0,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    borderRadius: 8,
  },
  leftInput: {
    width: 88,
    flex: 0,
    textAlign: 'right',
    fontFamily: 'serif',
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  net: {
    flex: 1,
    textAlign: 'right',
    fontFamily: 'serif',
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  win: { color: colors.win },
  loss: { color: colors.loss },
  even: { color: colors.muted },
  ink: { color: colors.ink },
  saved: { gap: 8 },
  savedLabel: { color: colors.muted, fontSize: 15, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  addRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  addField: { flex: 1 },
  summary: { flexDirection: 'row', flexWrap: 'wrap' },
  summaryCell: { width: '25%', paddingVertical: 8, paddingRight: 6 },
  summaryCellNarrow: { width: '50%' },
  summaryLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  summaryValue: {
    fontFamily: 'serif',
    fontSize: 18,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  actionRow: { flexDirection: 'row', gap: 10 },
  action: { flex: 1 },
  confirm: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  clearDanger: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearDangerPressed: { backgroundColor: colors.dangerPressed },
  clearDangerLabel: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
})
