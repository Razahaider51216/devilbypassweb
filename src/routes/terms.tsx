import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentPage } from "@/components/devildev/LegalDocumentPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — DevilDev" },
      {
        name: "description",
        content: "Terms and conditions for using the DevilDev link bypass service.",
      },
      { property: "og:title", content: "Terms of Service — DevilDev" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: () => <LegalDocumentPage kind="terms" />,
});
