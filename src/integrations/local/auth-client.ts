export type LocalSessionUser = {
  id: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  discordUsername?: string | null;
};

export type LocalSession = { user: LocalSessionUser };
type AuthEvent = "SIGNED_IN" | "SIGNED_OUT" | "TOKEN_REFRESHED";
type Listener = (event: AuthEvent, session: LocalSession | null) => void;

const listeners = new Set<Listener>();
let currentSession: LocalSession | null = null;
let sessionReady = false;
let sessionRequest: Promise<LocalSession | null> | null = null;

function asError(error: unknown) {
  return error instanceof Error ? error : new Error("Unable to check the current session");
}

function publish(event: AuthEvent, session: LocalSession | null) {
  currentSession = session;
  sessionReady = true;
  listeners.forEach((listener) => listener(event, session));
}

async function read(): Promise<LocalSession | null> {
  if (typeof window === "undefined") return null;
  const response = await fetch("/api/auth/session", {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Session check failed with status ${response.status}`);
  }
  const result = (await response.json()) as { session?: LocalSession | null };
  if (!("session" in result)) throw new Error("Session check returned an invalid response");
  return result.session?.user?.id ? result.session : null;
}

function refresh() {
  // Several components need the same session. Sharing one in-flight request avoids
  // duplicate checks whenever a route mounts or React runs effects twice in dev.
  sessionRequest ??= read()
    .then((session) => {
      publish(session && !currentSession ? "SIGNED_IN" : "TOKEN_REFRESHED", session);
      return session;
    })
    .finally(() => {
      sessionRequest = null;
    });
  return sessionRequest;
}

export const auth = {
  getSnapshot() {
    return { session: currentSession, ready: sessionReady };
  },
  async completeDiscordSignIn(_legacyPayload: string) {
    const session = await refresh();
    if (!session) throw new Error("Discord returned an invalid session");
    return session;
  },
  onAuthStateChange(listener: Listener) {
    listeners.add(listener);
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
    try {
      return { data: { session: await refresh() }, error: null };
    } catch (error) {
      // A WAF challenge, rate limit or temporary network failure is not a sign-out.
      // Keep the last confirmed state so client-side navigation cannot eject users.
      return { data: { session: currentSession }, error: asError(error) };
    }
  },
  async signOut() {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error(`Sign out failed with status ${response.status}`);
      publish("SIGNED_OUT", null);
      return { error: null };
    } catch (error) {
      return { error: asError(error) };
    }
  },
};
