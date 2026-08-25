import { useEffect, useState } from "react";
import { auth, type LocalSession } from "@/integrations/local/auth-client";

export function useSession() {
  const snapshot = auth.getSnapshot();
  const [session, setSession] = useState<LocalSession | null>(snapshot.session);
  const [ready, setReady] = useState(snapshot.ready);

  useEffect(() => {
    let active = true;
    let retryTimer: number | undefined;
    let retryDelay = 1_000;

    const { data: sub } = auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      setSession(next);
      setReady(true);
    });

    const load = async () => {
      const { data, error } = await auth.getSession();
      if (!active) return;
      if (!error) {
        setSession(data.session);
        setReady(true);
        return;
      }

      const cached = auth.getSnapshot();
      setSession(cached.session);
      setReady(cached.ready);
      if (!cached.ready) {
        retryTimer = window.setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, 30_000);
          void load();
        }, retryDelay);
      }
    };

    void load();
    return () => {
      active = false;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, ready };
}
