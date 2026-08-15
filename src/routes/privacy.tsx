import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentPage } from "@/components/devildev/LegalDocumentPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — DevilDev" },
      {
        name: "description",
        content: "How DevilDev collects, uses and protects personal information.",
      },
      { property: "og:title", content: "Privacy Policy — DevilDev" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: () => <LegalDocumentPage kind="privacy" />,
});
