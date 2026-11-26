import { NavigationBar } from 'expo-navigation-bar'
import { Stack } from 'expo-router/stack'
import * as SplashScreen from 'expo-splash-screen'
import * as SystemUI from 'expo-system-ui'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { installCrypto } from '@/lib/install-crypto'
import { ClubProvider } from '@/state/club-context'
import { colors } from '@/theme'

installCrypto()
void SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.paper)
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.paper }}>
      <SafeAreaProvider>
        <ClubProvider>
          <StatusBar style="dark" />
          <NavigationBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.paper },
            }}
          />
        </ClubProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
