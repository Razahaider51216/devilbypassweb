import {
  confirmPasswordReset,
  requestPasswordReset,
  signIn,
  signUp,
  updateMyPassword,
} from "@/lib/auth.functions";

export type LocalSession = { access_token: string; user: { id: string; email: string } };
type AuthEvent = "SIGNED_IN" | "SIGNED_OUT" | "PASSWORD_RECOVERY" | "TOKEN_REFRESHED";
type Listener = (event: AuthEvent, session: LocalSession | null) => void;

const STORAGE_KEY = "devildev.session";
const listeners = new Set<Listener>();

function errorOf(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

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

function save(result: { token: string; user: { id: string; email: string } }, event: AuthEvent) {
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
    user: { id: string; email: string };
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
  async signInWithPassword(input: { email: string; password: string }) {
    try {
      const result = await signIn({ data: input });
      return { data: { session: save(result, "SIGNED_IN"), user: result.user }, error: null };
    } catch (error) {
      return { data: { session: null, user: null }, error: errorOf(error) };
    }
  },
  async signUp(input: {
    email: string;
    password: string;
    options?: { data?: { username?: string }; emailRedirectTo?: string };
  }) {
    try {
      const result = await signUp({
        data: {
          email: input.email,
          password: input.password,
          username: input.options?.data?.username ?? "",
        },
      });
      return { data: { session: save(result, "SIGNED_IN"), user: result.user }, error: null };
    } catch (error) {
      return { data: { session: null, user: null }, error: errorOf(error) };
    }
  },
  async signOut() {
    localStorage.removeItem(STORAGE_KEY);
    listeners.forEach((listener) => listener("SIGNED_OUT", null));
    return { error: null };
  },
  async resetPasswordForEmail(email: string) {
    try {
      const data = await requestPasswordReset({ data: { email } });
      return { data, error: null };
    } catch (error) {
      return { data: null, error: errorOf(error) };
    }
  },
  async verifyOtp(input: { email: string; token: string; type: "recovery" }) {
    try {
      const result = await confirmPasswordReset({
        data: { email: input.email, code: input.token },
      });
      return {
        data: { session: save(result, "PASSWORD_RECOVERY"), user: result.user },
        error: null,
      };
    } catch (error) {
      return { data: { session: null, user: null }, error: errorOf(error) };
    }
  },
  async updateUser(input: { password: string }) {
    try {
      await updateMyPassword({ data: input });
      return { data: { user: read()?.user ?? null }, error: null };
    } catch (error) {
      return { data: { user: null }, error: errorOf(error) };
    }
  },
};
