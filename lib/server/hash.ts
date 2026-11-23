import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const KEY_LENGTH = 32

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  return `s1$${salt}$${scryptSync(password, salt, KEY_LENGTH).toString('hex')}`
}

export function verifyPassword(password: string, stored: string) {
  const [scheme, salt, hash] = stored.split('$')
  if (scheme !== 's1' || !salt || !hash) return false
  const expected = Buffer.from(hash, 'hex')
  const actual = scryptSync(password, salt, KEY_LENGTH)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export function newToken() {
  return randomBytes(32).toString('hex')
}

/** Sessions are stored by digest so a copy of the store cannot be replayed as a cookie. */
export function digest(value: string) {
  return createHash('sha256').update(value).digest('hex')
}
