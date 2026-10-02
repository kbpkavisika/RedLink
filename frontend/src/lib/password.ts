// No I, L, O, 0 or 1, so a password read out over the phone can't be mistaken
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

/**
 * A random temporary password such as "Kp7w-Xm3q-Rt9b": 12 characters in groups of 4, easy to read out.
 * Uses the browser's cryptographic random numbers. The user must replace it at first sign-in anyway.
 */
export function generateTemporaryPassword(): string {
  const chars: string[] = [];
  // Bytes at or above this limit are skipped, so every character is equally likely
  const limit = 256 - (256 % ALPHABET.length);
  while (chars.length < 12) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    for (const byte of bytes) {
      if (byte < limit && chars.length < 12) {
        chars.push(ALPHABET[byte % ALPHABET.length]);
      }
    }
  }
  return [chars.slice(0, 4), chars.slice(4, 8), chars.slice(8)].map((group) => group.join('')).join('-');
}
