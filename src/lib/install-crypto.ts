import * as ExpoCrypto from 'expo-crypto'

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

type LooseCrypto = {
  getRandomValues?: (array: Uint8Array) => Uint8Array
  subtle?: {
    digest: (algorithm: AlgorithmIdentifier, data: BufferSource) => Promise<ArrayBuffer>
  }
}

function btoaPolyfill(input: string): string {
  let output = ''
  for (let index = 0; index < input.length; index += 3) {
    const a = input.charCodeAt(index)
    const b = index + 1 < input.length ? input.charCodeAt(index + 1) : 0
    const c = index + 2 < input.length ? input.charCodeAt(index + 2) : 0
    const triple = (a << 16) | (b << 8) | c
    output += alphabet[(triple >> 18) & 63]
    output += alphabet[(triple >> 12) & 63]
    output += index + 1 < input.length ? alphabet[(triple >> 6) & 63] : '='
    output += index + 2 < input.length ? alphabet[triple & 63] : '='
  }
  return output
}

function atobPolyfill(input: string): string {
  const clean = input.replace(/=+$/, '')
  let output = ''
  for (let index = 0; index < clean.length; index += 4) {
    const a = alphabet.indexOf(clean[index] ?? 'A')
    const b = alphabet.indexOf(clean[index + 1] ?? 'A')
    const c = alphabet.indexOf(clean[index + 2] ?? 'A')
    const d = alphabet.indexOf(clean[index + 3] ?? 'A')
    const triple = (a << 18) | (b << 12) | (c << 6) | d
    output += String.fromCharCode((triple >> 16) & 255)
    if (index + 2 < clean.length) output += String.fromCharCode((triple >> 8) & 255)
    if (index + 3 < clean.length) output += String.fromCharCode(triple & 255)
  }
  return output
}

export function installCrypto(): void {
  const root = globalThis as {
    crypto?: LooseCrypto
    btoa?: (data: string) => string
    atob?: (data: string) => string
  }
  if (!root.crypto) root.crypto = {}
  const cryptoRef = root.crypto
  if (typeof cryptoRef.getRandomValues !== 'function') {
    cryptoRef.getRandomValues = (array) => {
      const bytes = ExpoCrypto.getRandomBytes(array.byteLength)
      const view = new Uint8Array(array.buffer, array.byteOffset, array.byteLength)
      view.set(bytes.subarray(0, view.length))
      return array
    }
  }
  if (!cryptoRef.subtle) {
    cryptoRef.subtle = {
      async digest(algorithm, data) {
        const name = typeof algorithm === 'string' ? algorithm : algorithm.name
        if (name !== 'SHA-256') throw new Error(`Unsupported digest ${name}`)
        return ExpoCrypto.digest(ExpoCrypto.CryptoDigestAlgorithm.SHA256, data)
      },
    }
  }
  if (typeof root.btoa !== 'function') root.btoa = btoaPolyfill
  if (typeof root.atob !== 'function') root.atob = atobPolyfill
}
