import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { SiteBackground } from "@/components/devildev/SiteBackground";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "DevilBypass — Link Bypass" },
      {
        name: "description",
        content:
          "DevilBypass unlocks shortened and locked links in seconds. Paste a URL and get the real key back. Thai and English interface.",
      },
      { name: "author", content: "DevilBypass" },
      { property: "og:title", content: "DevilBypass — Link Bypass" },
      {
        property: "og:description",
        content:
          "DevilBypass unlocks shortened and locked links in seconds. Paste a URL and get the real key back. Thai and English interface.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "DevilBypass — Link Bypass" },
      {
        name: "twitter:description",
        content:
          "DevilBypass unlocks shortened and locked links in seconds. Paste a URL and get the real key back. Thai and English interface.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.svg?v=devilbypass", type: "image/svg+xml" },
      { rel: "alternate icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+Thai:wght@400;500;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: "dark" }} suppressHydrationWarning>
      <head>
        <HeadContent />
        {/* Applies the saved theme before paint so there is no wrong-theme flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('devildev.theme')==='light'?'light':'dark';var r=document.documentElement;r.classList.toggle('light',t==='light');r.classList.toggle('dark',t==='dark');r.style.colorScheme=t;}catch(e){}",
          }}
        />
        {/* Removed third-party ad script (previously injected by ad network). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              try{
                const blocked = [
                  '[removed-ad]', '[removed-ad]', '[removed-ad]',
                  '[removed-ad]', '[removed-ad]', '[removed-ad]'
                ];

                const removeMatches = () => {
                  // Remove script/link/img elements whose src/href contain blocked domains
                  document.querySelectorAll('script[src], link[href], img[src]').forEach(el => {
                    const src = (el.getAttribute('src') || el.getAttribute('href') || '').toLowerCase();
                    if (!src) return;
                    for (const b of blocked) if (src.includes(b)) el.remove();
                  });

                  // Remove elements by suspicious ids/classes or inline script patterns
                  document.querySelectorAll('*').forEach(el => {
                    const id = (el.id || '').toLowerCase();
                    const cls = (el.className || '').toLowerCase();
                    if (!id && !cls) return;
                    if (/(adsterra|[removed-ad]|[removed-ad]|effectivecpm)/i.test(id+cls)) el.remove();
                  });
                };

                removeMatches();
                const mo = new MutationObserver(removeMatches);
                mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
                // keep a reference to stop if needed
                window.__removeAdElementsObserver = mo;
              }catch(e){}
            })();`,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <SiteBackground />
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <div className="relative z-10 min-h-screen">
        <Outlet />
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}
