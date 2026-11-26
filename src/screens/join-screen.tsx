import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { Field, Header, Note, PrimaryButton, ScreenFrame, SectionTitle, TextButton } from '@/components/screen'
import { useClub } from '@/state/club-context'
import { colors } from '@/theme'

export function JoinScreen() {
  const club = useClub()
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [editingServer, setEditingServer] = useState(false)
  const [serverDraft, setServerDraft] = useState(club.apiBase)

  return (
    <ScreenFrame header={<Header title="Poker club" />}>
      <View style={styles.stack}>
        <SectionTitle>Join a club</SectionTitle>
        <Field
          label="Club password"
          value={password}
          onChangeText={(value) => {
            setPassword(value)
            if (club.doorMessage) club.clearDoor()
          }}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoComplete="password"
          trailing={<TextButton label={show ? 'Hide' : 'Show'} onPress={() => setShow((current) => !current)} />}
        />
        <PrimaryButton
          testID="join-club"
          label="Join club"
          disabled={!password.trim() || club.busy !== null}
          onPress={() => void club.join(password)}
        />
        <TextButton label="Create a club" onPress={club.showCreate} />
        {club.switching && club.club ? (
          <TextButton label={`Back to ${club.club.name}`} onPress={club.backToClub} />
        ) : null}
        <TextButton testID="open-link" label="Open link" onPress={() => void club.openLink()} />
        {club.doorMessage ? <Note>{club.doorMessage}</Note> : null}
        {club.linkMessage && !club.paste?.open ? <Note>{club.linkMessage}</Note> : null}
        <View style={styles.server}>
          <TextButton
            label="Server"
            onPress={() => {
              setServerDraft(club.apiBase)
              setEditingServer((current) => !current)
            }}
          />
          {editingServer ? (
            <View style={styles.stack}>
              <Field
                value={serverDraft}
                onChangeText={setServerDraft}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={club.defaultOrigin}
              />
              <View style={styles.serverActions}>
                <TextButton
                  label="Save server"
                  onPress={() => {
                    void club.commitApiBase(serverDraft)
                    setEditingServer(false)
                  }}
                />
                <TextButton
                  label="Use default"
                  onPress={() => {
                    void club.resetApiBase()
                    setServerDraft(club.defaultOrigin)
                    setEditingServer(false)
                  }}
                />
              </View>
            </View>
          ) : (
            <Text style={styles.serverHost}>{club.apiBase}</Text>
          )}
        </View>
      </View>
    </ScreenFrame>
  )
}

const styles = StyleSheet.create({
  stack: {
    gap: 14,
    paddingTop: 8,
  },
  server: {
    marginTop: 12,
    gap: 4,
  },
  serverHost: {
    color: colors.muted,
    fontSize: 13,
  },
  serverActions: {
    flexDirection: 'row',
    gap: 16,
  },
})
