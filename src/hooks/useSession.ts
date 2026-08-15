import { useEffect, useState } from "react";
import { auth, type LocalSession } from "@/integrations/local/auth-client";

export function useSession() {
  const [session, setSession] = useState<LocalSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: sub } = auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setReady(true);
    });
    auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, ready };
}
