import { StyleSheet, Text, View } from 'react-native'

import { Header, Note, PrimaryButton, ScreenFrame, SectionTitle, TextButton } from '@/components/screen'
import { useClub } from '@/state/club-context'
import { colors } from '@/theme'

export function PassphraseScreen() {
  const club = useClub()
  const password = club.issued ?? ''

  return (
    <ScreenFrame header={<Header title="Poker club" />}>
      <View style={styles.stack}>
        <SectionTitle>Club password</SectionTitle>
        <Note>
          Copy and save this password before entering. Use it to return to your club or share it with friends so they
          can join and edit games.
        </Note>
        <View style={styles.codeRow}>
          <Text selectable style={styles.code}>
            {password}
          </Text>
          <TextButton label={club.copied ? 'Copied' : 'Copy password'} onPress={() => void club.copyPassword()} />
        </View>
        <TextButton label="Share" onPress={() => void club.sharePassword()} />
        <PrimaryButton testID="enter-club" label="Enter club" onPress={() => void club.enterClub()} />
      </View>
    </ScreenFrame>
  )
}

const styles = StyleSheet.create({
  stack: {
    gap: 16,
    paddingTop: 8,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  code: {
    flex: 1,
    color: colors.ink,
    fontFamily: 'monospace',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 3,
  },
})
