import { StyleSheet, Text, View } from 'react-native'

import { Field, Note, OutlineButton, PrimaryButton } from '@/components/screen'
import { ClubHome } from '@/screens/club-home'
import { CreateScreen } from '@/screens/create-screen'
import { GameDetail } from '@/screens/game-detail'
import { JoinScreen } from '@/screens/join-screen'
import { PassphraseScreen } from '@/screens/passphrase-screen'
import { TableScreen } from '@/screens/table-screen'
import { useClub } from '@/state/club-context'
import { colors } from '@/theme'

export function FeltApp() {
  const club = useClub()
  if (!club.ready) return <View style={styles.boot} />

  const route = club.route
  let body = <JoinScreen />
  if (club.share?.snapshot.kind === 'game') {
    body = <GameDetail game={club.share.snapshot.game} mode="shared-game" />
  } else if (club.share?.snapshot.kind === 'club' && club.share.openId) {
    const game = club.share.snapshot.games.find((item) => item.id === club.share?.openId)
    body = game ? <GameDetail game={game} mode="shared-club" /> : <ClubHome mode="share" />
  } else if (club.share?.snapshot.kind === 'club') {
    body = <ClubHome mode="share" />
  } else if (route.name === 'pass') body = <PassphraseScreen />
  else if (route.name === 'create') body = <CreateScreen />
  else if (route.name === 'join') body = <JoinScreen />
  else if (route.name === 'table') body = <TableScreen />
  else if (route.name === 'game') {
    const game = club.club?.games.find((item) => item.id === route.id)
    body = game ? <GameDetail game={game} mode="own" /> : <ClubHome mode="own" />
  } else if (!club.club && !club.booting) body = <JoinScreen />
  else body = <ClubHome mode="own" />

  return (
    <View style={styles.root}>
      {body}
      {club.paste?.open ? <PasteSheet /> : null}
    </View>
  )
}

function PasteSheet() {
  const club = useClub()
  return (
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        <Text style={styles.sheetTitle}>Open link</Text>
        <Field
          accessibilityLabel="Shared link"
          multiline
          value={club.paste?.draft ?? ''}
          onChangeText={club.setPasteDraft}
          placeholder="https://ardxwe-table.netlify.app/#g=…"
          autoCapitalize="none"
        />
        {club.linkMessage ? <Note>{club.linkMessage}</Note> : null}
        <PrimaryButton label="Open" onPress={club.submitPaste} />
        <OutlineButton label="Cancel" onPress={club.closePaste} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  boot: { flex: 1, backgroundColor: colors.paper },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(28, 24, 20, 0.28)',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 520,
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  sheetTitle: {
    color: colors.ink,
    fontFamily: 'serif',
    fontSize: 22,
    fontWeight: '500',
  },
})
