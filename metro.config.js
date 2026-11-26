const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)
const upstream = config.resolver.resolveRequest

// The copied ledger and share modules keep the web app's `.ts` import suffixes
// so the same files run under node:test. Metro resolves the suffix-less path.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (typeof moduleName === 'string' && moduleName.startsWith('.') && /\.tsx?$/.test(moduleName)) {
    const stripped = moduleName.replace(/\.tsx?$/, '')
    if (upstream) return upstream(context, stripped, platform)
    return context.resolveRequest(context, stripped, platform)
  }
  if (upstream) return upstream(context, moduleName, platform)
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
