// Where the JWT lives. "Keep me signed in" → localStorage (survives closing the browser);
// otherwise sessionStorage (cleared when the tab closes).
const KEY = 'redlink.token';

// Storage can throw (private mode, blocked site data); treat that as "no token"
function safely<T>(action: () => T, fallback: T): T {
  try {
    return action();
  } catch {
    return fallback;
  }
}

export const tokenStore = {
  get(): string | null {
    return safely(() => sessionStorage.getItem(KEY) ?? localStorage.getItem(KEY), null);
  },

  // Was the current token saved with "Keep me signed in"?
  isRemembered(): boolean {
    return safely(() => localStorage.getItem(KEY) !== null, false);
  },

  set(token: string, remember: boolean) {
    this.clear();
    safely(() => (remember ? localStorage : sessionStorage).setItem(KEY, token), undefined);
  },

  clear() {
    safely(() => {
      localStorage.removeItem(KEY);
      sessionStorage.removeItem(KEY);
    }, undefined);
  },
};
