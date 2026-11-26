import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { Field, Header, Note, PrimaryButton, ScreenFrame, SectionTitle, TextButton } from '@/components/screen'
import { useClub } from '@/state/club-context'

export function CreateScreen() {
  const club = useClub()
  const [name, setName] = useState('')

  return (
    <ScreenFrame header={<Header title="Poker club" />}>
      <View style={styles.stack}>
        <SectionTitle>Create a club</SectionTitle>
        <Field
          label="Club name"
          value={name}
          onChangeText={(value) => {
            setName(value)
            if (club.doorMessage) club.clearDoor()
          }}
          autoCapitalize="words"
        />
        <Note>
          We'll generate a club password. Save it to return later, and share it with friends who should be able to join
          and edit games.
        </Note>
        <PrimaryButton
          testID="create-club"
          label="Create club"
          disabled={club.busy !== null}
          onPress={() => void club.create(name)}
        />
        <TextButton label="Back to join" onPress={club.showJoin} />
        {club.doorMessage ? <Note>{club.doorMessage}</Note> : null}
      </View>
    </ScreenFrame>
  )
}

const styles = StyleSheet.create({
  stack: {
    gap: 14,
    paddingTop: 8,
  },
})
