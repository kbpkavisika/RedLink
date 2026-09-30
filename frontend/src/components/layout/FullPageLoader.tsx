// Shown while a saved session is being checked, so the login page doesn't flash first
export function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center" aria-busy="true">
      <img
        src="/brand/redlink-icon.svg"
        alt=""
        className="size-10 animate-pulse motion-reduce:animate-none"
      />
      <span className="sr-only">Loading RedLink…</span>
    </div>
  );
}
