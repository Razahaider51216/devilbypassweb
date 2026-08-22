import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Redirecting to Discord — DevilDev Bypass" }],
  }),
  component: LoginRedirect,
});

function LoginRedirect() {
  useEffect(() => {
    window.location.replace("/api/auth/discord");
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
      <p className="text-sm text-muted-foreground">Redirecting to Discord...</p>
    </main>
  );
}
