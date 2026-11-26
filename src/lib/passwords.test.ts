import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import { digestSecret, generatePassword } from './passwords.ts'

test('a generated password is eight readable characters', () => {
  const password = generatePassword()
  assert.match(password, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/)
})

test('digestSecret trims and matches SHA-256 hex', async () => {
  const expected = createHash('sha256').update('abc').digest('hex')
  assert.equal(await digestSecret(' abc '), expected)
  assert.equal(expected, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
})
