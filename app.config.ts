import type { ExpoConfig } from 'expo/config'

const allowCleartext = process.env.EXPO_PUBLIC_ALLOW_CLEARTEXT !== '0'
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://ardxwe-table.netlify.app'

const config: ExpoConfig = {
  name: 'Poker club',
  slug: 'poker-club',
  version: '1.0.0',
  orientation: 'default',
  icon: './assets/images/icon.png',
  scheme: 'pokerclub',
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: 'app.ardxwe.table',
    icon: './assets/expo.icon',
    supportsTablet: true,
  },
  android: {
    package: 'app.ardxwe.table',
    versionCode: 1,
    predictiveBackGestureEnabled: false,
    adaptiveIcon: {
      backgroundColor: '#f7f2ea',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
  },
  web: {
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#f7f2ea',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          minSdkVersion: 26,
          buildArchs: ['arm64-v8a'],
          usesCleartextTraffic: allowCleartext,
        },
      },
    ],
    [
      'expo-share-intent',
      {
        disableIOS: true,
        androidIntentFilters: ['text/*'],
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    apiBaseUrl,
  },
}

export default config
