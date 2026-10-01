// Where to go after signing in: the ?from= page if it is one of ours, otherwise null (use the role's home).
// Only same-site paths are allowed, so a link like /login?from=https://evil.example can't send users away.
export function safeRedirectPath(from: string | null): string | null {
  if (!from || !from.startsWith('/') || from.startsWith('//') || from.startsWith('/\\')) {
    return null;
  }
  return from;
}
