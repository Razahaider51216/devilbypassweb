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

async function read(): Promise<LocalSession | null> {
  if (typeof window === "undefined") return null;
  try {
    const response = await fetch("/api/auth/session", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!response.ok) return null;
    const result = (await response.json()) as { session?: LocalSession | null };
    return result.session?.user?.id ? result.session : null;
  } catch {
    return null;
  }
}

export const auth = {
  async completeDiscordSignIn(_legacyPayload: string) {
    const session = await read();
    listeners.forEach((listener) => listener("SIGNED_IN", session));
    if (!session) throw new Error("Discord returned an invalid session");
    return session;
  },
  onAuthStateChange(listener: Listener) {
    listeners.add(listener);
    void read().then((session) => listener("TOKEN_REFRESHED", session));
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
    return { data: { session: await read() } };
  },
  async signOut() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    listeners.forEach((listener) => listener("SIGNED_OUT", null));
    return { error: null };
  },
};
