import crypto from 'crypto'

// Generate a random secret on server startup
const SECRET = crypto.randomBytes(32).toString('hex')
const TOKEN_VALIDITY_MS = 3 * 60 * 1000 // 3 minutes

/**
 * Generates a short invite token
 * Format: Base64(timestamp|signature)
 * We don't need to embed roomId if we verify it against the room context
 */
export const generateToken = (roomId: string): string => {
  const timestamp = Date.now().toString()
  const data = `${roomId}:${timestamp}`
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(data)
    .digest('base64')
    .substring(0, 10) // Short signature

  // Combine and encode
  const payload = `${timestamp}:${signature}`
  return Buffer.from(payload).toString('base64')
}

/**
 * Verifies the invite token
 */
export const verifyToken = (token: string, roomId: string): boolean => {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const [timestampStr, signature] = decoded.split(':')
    const timestamp = parseInt(timestampStr, 10)

    if (isNaN(timestamp)) return false

    // 1. Check validity period
    if (Date.now() - timestamp > TOKEN_VALIDITY_MS) {
      return false
    }

    // 2. Verify signature
    const data = `${roomId}:${timestampStr}`
    const expectedSignature = crypto
      .createHmac('sha256', SECRET)
      .update(data)
      .digest('base64')
      .substring(0, 10)

    return signature === expectedSignature
  } catch (e) {
    return false
  }
}
