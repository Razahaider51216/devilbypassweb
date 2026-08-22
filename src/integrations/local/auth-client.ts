export type LocalSessionUser = {
  id: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  discordUsername?: string | null;
};

export type LocalSession = { access_token: string; user: LocalSessionUser };
type AuthEvent = "SIGNED_IN" | "SIGNED_OUT" | "TOKEN_REFRESHED";
type Listener = (event: AuthEvent, session: LocalSession | null) => void;

const STORAGE_KEY = "devildev.session";
const listeners = new Set<Listener>();

function read(): LocalSession | null {
  if (typeof window === "undefined") return null;
  try {
    const session = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as LocalSession | null;
    if (!session?.access_token || !session.user?.id) return null;
    const [body] = session.access_token.split(".");
    const encoded = body!.replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "="))) as {
      exp?: number;
    };
    if (!claims.exp || claims.exp * 1000 <= Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function save(result: { token: string; user: LocalSessionUser }, event: AuthEvent) {
  const session = { access_token: result.token, user: result.user };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  listeners.forEach((listener) => listener(event, session));
  return session;
}

function decodeDiscordSession(payload: string) {
  const encoded = payload.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "="));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as {
    token: string;
    user: LocalSessionUser;
  };
}

export const auth = {
  completeDiscordSignIn(payload: string) {
    const result = decodeDiscordSession(payload);
    if (!result.token || !result.user?.id || !result.user.email) {
      throw new Error("Discord returned an invalid session");
    }
    return save(result, "SIGNED_IN");
  },
  onAuthStateChange(listener: Listener) {
    listeners.add(listener);
    queueMicrotask(() => listener("TOKEN_REFRESHED", read()));
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            listeners.delete(listener);
          },
        },
      },
    };
  },
  async getSession() {
    return { data: { session: read() } };
  },
  async signOut() {
    localStorage.removeItem(STORAGE_KEY);
    listeners.forEach((listener) => listener("SIGNED_OUT", null));
    return { error: null };
  },
};
