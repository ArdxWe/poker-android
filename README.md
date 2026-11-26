# Poker club

朋友之间记一局德州的牌桌。这是网页版 [ardxwe-table](https://ardxwe-table.netlify.app/) 的安卓客户端：买入、剩下的筹码、历史和排名都走同一套算法，俱乐部仍然只请求已经在线上的 `POST /api/club`。

界面文案是英文，和网页一致。赢是红的，输是绿的。发给朋友的是签名 APK，不上应用商店。

方案在 [docs/android-plan.md](docs/android-plan.md)。网页仓库是 [ArdxWe/poker](https://github.com/ArdxWe/poker)，这个应用不放进那个仓库，也不改它的接口。

## 环境

- Node.js 22 或更新
- 手机上的 [Expo Go](https://expo.dev/go)（Android），或一台 Android 模拟器
- 不需要 Expo 账号也能在 Expo Go 里开发和试用

```bash
npm install
```

## 用 Expo Go 跑

```bash
npm start
```

终端里会出现二维码。手机和电脑在同一网络时，用 Expo Go 扫码。Expo Go 能完成加入、新建、口令、记牌、只读分享（Open link）。系统分享面板把一段文字直接交给本应用，要等装上自己打出来的 APK，Expo Go 里没有这份原生模块。

## 用安卓模拟器跑

先打开 Android Studio 里的模拟器，然后：

```bash
npm run android
```

模拟器访问电脑上的网页开发服务器时，地址是 `http://10.0.2.2:5173`，不是 `localhost`。真机用电脑的局域网 IP。

发给朋友的 APK 只包含 `arm64-v8a`。x86 模拟器跑的是 Expo Go，不是这份 APK。要在模拟器里安装 APK，需要 arm64 的系统映像。

## 俱乐部接口

默认请求：

```text
POST https://ardxwe-table.netlify.app/api/club
Content-Type: application/json
```

请求体是 `{ "op": "..." }`。成功时 `{ "ok": true, "token": "...", "club": { ... } }`，`club.games` 已按时间从新到旧排好。失败时 `{ "ok": false, "reason": "..." }`。

| op | 何时 | 主要字段 |
| --- | --- | --- |
| `create` | 新建 | `name`，`readPassword`，`writePassword`（和读口令相同），`games: []` |
| `open` | 加入 | `readPassword` |
| `restore` | 冷启动 | `token` |
| `refresh` | 回到前台 | `token` |
| `save` | 保存一局 | `token`，`game` |
| `delete` | 删除一局 | `token`，`gameId` |

口令 8 位，字符集 `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`。服务器只存 SHA-256。进行中的一桌不上传。没网时可以记牌，保存需要服务器；上次成功拿到的俱乐部会留在本机。

分享链接永远指向线上网站，方便没装应用的人用浏览器打开：

- 一局：`https://ardxwe-table.netlify.app/#g=` + base64url
- 一整家：`https://ardxwe-table.netlify.app/#c=` + 同样的编码

本机键名和网页对齐：`felt.session.v1`、`felt.server.token.v1`、`felt.server.club.v1`、`felt.server.issued.v1`。开发时改过的接口地址存在 `felt.api.base.v1`。

## 改接口地址

不改代码也能换地址。

1. 复制 `.env.example` 为 `.env`，设置 `EXPO_PUBLIC_API_BASE_URL`。模拟器例子：`http://10.0.2.2:5173`。改完重启 `npm start`。
2. 已经装上的应用：加入页底部的 Server，填源站地址（不要自己加 `/api/club`），点 Save server。Use default 回到线上。

明文 HTTP 只在 `EXPO_PUBLIC_ALLOW_CLEARTEXT` 不为 `0` 时打开。本地调试默认允许。`eas.json` 里的 `production` 会把它设成 `0`。

## 打签名 APK

密钥不要放进仓库。下面两条路都打出可以直接安装的 APK，不是给 Play 用的 AAB。每发一版，把 `app.config.ts` 里的 `version` 和 `android.versionCode` 加一。

### EAS Build

需要 Expo 账号。第一次会在 Expo 服务器上生成签名密钥，密钥不在这个仓库里。

```bash
npm install -g eas-cli
eas login
eas build -p android --profile production
```

`production` 打 release APK，并且不允许明文 HTTP。想在这只包里连 `http://` 开发服务器，用 `preview`：

```bash
eas build -p android --profile preview
```

构建完成后从 Expo 页面下载 APK。

### 本机 Gradle

需要 JDK、Android SDK，以及国内网络下通常要给 Gradle 配镜像。

在仓库外生成密钥（路径自己保管）：

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore "$HOME/keys/poker-club.keystore" -alias poker-club -keyalg RSA -keysize 2048 -validity 10000
```

生成原生工程（`android/` 已被 git 忽略，可以随时删掉重来）：

```bash
npx expo prebuild --platform android
```

在 `android/gradle.properties` 里写下密钥位置（这个文件在被忽略的 `android/` 里）：

```properties
POKER_UPLOAD_STORE_FILE=/absolute/path/poker-club.keystore
POKER_UPLOAD_STORE_PASSWORD=你的口令
POKER_UPLOAD_KEY_ALIAS=poker-club
POKER_UPLOAD_KEY_PASSWORD=你的口令
```

把 `signingConfigs` 放进 `android/app/build.gradle` 已有的 `android` 块。在 Expo 生成的 `buildTypes.release` 里加上 `signingConfig signingConfigs.release`，保留原来的其他配置：

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

然后：

```bash
cd android
./gradlew assembleRelease
```

APK 在 `android/app/build/outputs/apk/release/app-release.apk`。

## 装到手机上

Android 8 起按来源允许安装未知应用。应用不申请存储权限。微信经常拦截或改写 `.apk`，打成 zip 再发更稳。面对面传文件也可以。不要把 APK 上传到 Netlify 当作安装方式。

## 检查

```bash
npm test
npm run typecheck
```

`npm test` 跑的是从网页复制过来的记分、分享链接测试，以及口令和俱乐部请求的测试。

## 和方案不一样的地方

记分、分享编码和 `POST /api/club` 的形状跟网页一致。下面几条是对照网页源码之后的取舍，细节写在方案末尾：

- 断网时保存或删除，网页会抛出未接住的错误。这里停在原来的页面，并显示网页上那句英文。
- 从后台回来的刷新如果返回时已经换成另一家俱乐部，这次结果丢掉。
- 刷新失败只打开离线提示，不把人踢回加入页。冷启动时 token 无效仍会清掉会话并回到加入页。
- 离开只读分享时，如果新建口令还没点 Enter club，先回到口令页。
- Expo Go 里用 Open link 打开 `#g=` / `#c=`。系统分享入口在签名 APK 里。
