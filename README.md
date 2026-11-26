# Poker club

An Android client for the web app at [ardxwe-table](https://ardxwe-table.netlify.app/). Friends use it to keep a Texas hold'em table: buy-ins, chips left, history, and standings all use the same ledger as the site. The club still talks only to the existing `POST /api/club` endpoint.

The UI copy is English, matching the site. Wins are red and losses are green. Friends install a signed APK. This app is not published to an app store.

Design notes are in [docs/android-plan.md](docs/android-plan.md). The web app lives in [ArdxWe/poker](https://github.com/ArdxWe/poker). This client stays in its own repository and does not change that API.

## Features

- Join a club or create one. A new club gets an 8-character password.
- Score the current table on the device. An in-progress table is not uploaded.
- Save and delete finished games through `POST /api/club`.
- Show game history and standings from the last club the device successfully loaded.
- Open a read-only share of one game or a whole club. Share links always point at the live site, so someone without the app can open them in a browser.
- Point the client at another origin with `EXPO_PUBLIC_API_BASE_URL` or the Server field on the join screen.

## Setup

- Node.js 22 or newer
- [Expo Go](https://expo.dev/go) on an Android phone, or an Android emulator
- An Expo account is not required to develop and try the app in Expo Go

```bash
npm install
```

## Run with Expo Go

```bash
npm start
```

The terminal prints a QR code. With the phone and computer on the same network, scan it in Expo Go. Expo Go can join, create, confirm a password, score a table, and open a read-only share with Open link. Handing a block of text to this app from the system share sheet needs a signed APK. Expo Go does not include that native module.

## Run on an Android emulator

Start an emulator in Android Studio, then:

```bash
npm run android
```

From the emulator, the web dev server on the computer is `http://10.0.2.2:5173`, not `localhost`. A physical device uses the computer's LAN address.

The APK built for friends contains only `arm64-v8a`. An x86 emulator runs Expo Go, not that APK. Installing the APK in an emulator needs an arm64 system image.

## Club API

The default request is:

```text
POST https://ardxwe-table.netlify.app/api/club
Content-Type: application/json
```

The body is `{ "op": "..." }`. Success is `{ "ok": true, "token": "...", "club": { ... } }`. The live endpoint returns `club.games` newest first, and this app lists them in that order. Failure is `{ "ok": false, "reason": "..." }`.

| op | When | Main fields |
| --- | --- | --- |
| `create` | New club | `name`, `readPassword`, `writePassword` (same as the read password), `games: []` |
| `open` | Join | `readPassword` |
| `restore` | Cold start | `token` |
| `refresh` | Return to the foreground | `token` |
| `save` | Save one game | `token`, `writePassword: ""`, `game` |
| `delete` | Delete one game | `token`, `writePassword: ""`, `gameId` |

Passwords are 8 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`. The server stores only the SHA-256. Scoring works offline. Saving needs the server. The last club that loaded successfully stays on the device.

Share links always use the live site:

- One game: `https://ardxwe-table.netlify.app/#g=` plus base64url
- A whole club: `https://ardxwe-table.netlify.app/#c=` plus the same encoding

Local keys match the web app: `felt.session.v1`, `felt.server.token.v1`, `felt.server.club.v1`, `felt.server.issued.v1`. A server address changed during development is stored in `felt.api.base.v1`.

## API base URL

The origin can be changed without editing code.

1. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_BASE_URL`. For the emulator, `http://10.0.2.2:5173`. Restart `npm start` after changing it.
2. On an installed app, open Server at the bottom of the join screen, enter the site origin (do not append `/api/club`; a trailing `/api/club` is stripped), and tap Save server. Use default returns to the built-in origin.

Plain HTTP is enabled only when `EXPO_PUBLIC_ALLOW_CLEARTEXT` is not `0`. Local development allows it. The `production` profile in `eas.json` sets it to `0`.

## Build a signed APK

Keep the signing key out of the repository. Both paths below produce an APK you can install directly, not an AAB for Play. For each release, increment `version` and `android.versionCode` in `app.config.ts`.

### EAS Build

This needs an Expo account. The first build creates the signing key on Expo's servers. That key is not in this repository.

```bash
npm install -g eas-cli
eas login
eas build -p android --profile production
```

`production` builds a release APK and disallows plain HTTP. To let that package reach an `http://` dev server, use `preview`:

```bash
eas build -p android --profile preview
```

Download the APK from the Expo build page when it finishes.

### Local Gradle

This needs a JDK and the Android SDK. If Gradle cannot reach its default hosts, configure a mirror.

Generate the key outside the repository and keep the path private:

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore "$HOME/keys/poker-club.keystore" -alias poker-club -keyalg RSA -keysize 2048 -validity 10000
```

Generate the native project. `android/` is gitignored and can be deleted and recreated:

```bash
npx expo prebuild --platform android
```

Write the key location in `android/gradle.properties` (that file lives in the ignored `android/` directory):

```properties
POKER_UPLOAD_STORE_FILE=/absolute/path/poker-club.keystore
POKER_UPLOAD_STORE_PASSWORD=your-store-password
POKER_UPLOAD_KEY_ALIAS=poker-club
POKER_UPLOAD_KEY_PASSWORD=your-key-password
```

Add `signingConfigs` inside the existing `android` block in `android/app/build.gradle`. On the `buildTypes.release` block Expo generated, set `signingConfig signingConfigs.release` and keep the rest of that block:

```gradle
signingConfigs {
    release {
        storeFile file(POKER_UPLOAD_STORE_FILE)
        storePassword POKER_UPLOAD_STORE_PASSWORD
        keyAlias POKER_UPLOAD_KEY_ALIAS
        keyPassword POKER_UPLOAD_KEY_PASSWORD
    }
}
```

Then:

```bash
cd android
./gradlew assembleRelease
```

The APK is `android/app/build/outputs/apk/release/app-release.apk`.

## Install on a phone

From Android 8 onward, allow installs from the source you use. The app does not request storage permission. WeChat often blocks or rewrites an `.apk`, so sending it inside a zip is more reliable. Transferring the file in person also works. Do not upload the APK to Netlify as the way to install it.

## Checks

```bash
npm test
npm run typecheck
```

`npm test` runs the scoring and share-link tests copied from the web app, plus the password and club-request tests.

## Known gaps

Scoring, share encoding, and the shape of `POST /api/club` match the web app. These are the choices made after reading that source. The notes at the end of the plan have the longer version.

- If save or delete fails because the device is offline, the web app throws an error it does not catch. This app stays on the current screen and shows the same English line: `Could not save. This game is still here.` or `Could not remove that game.`
- A refresh started when returning to the foreground is dropped if the open club has changed by the time the response arrives.
- A failed refresh only turns on the offline note. It does not send the user back to the join screen. On a cold start, an invalid token still clears the session and returns to the join screen, unless a new-club password is still waiting on the passphrase screen.
- Leaving a read-only share returns to the passphrase screen when Enter club has not been tapped yet for a new password.
- In Expo Go, open `#g=` and `#c=` links with Open link. The system share entry is in the signed APK.
