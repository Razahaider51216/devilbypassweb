import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/integrations/local/auth-middleware";

const BypassInput = z.object({
  url: z.string().trim().min(1).max(2048),
});

export type BypassResult = {
  status: "succeed" | "failed";
  result: string;
  time: string | null;
  expiresAt: string | null;
  errorCode:
    | "missing_key"
    | "unauthorized"
    | "rate_limited"
    | "timeout"
    | "upstream"
    | "not_signed_in"
    | "quota"
    | "banned"
    | "bypass_disabled"
    | "invalid_url"
    | "saturday_free"
    | null;
  remaining: number | null;
};

type Reservation = {
  ok?: boolean;
  code?: string;
  reservation_id?: string;
  remaining?: number | null;
};

type SecurityRpc = (
  functionName: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: unknown }>;

function fail(errorCode: NonNullable<BypassResult["errorCode"]>, result = ""): BypassResult {
  return { status: "failed", result, time: null, expiresAt: null, errorCode, remaining: null };
}

export const bypassLink = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => BypassInput.parse(input))
  .handler(async ({ data, context }): Promise<BypassResult> => {
    const { userId } = context;
    if (!userId) return fail("not_signed_in");

    const { sanitizeTargetUrl } = await import("@/lib/security.server");
    const checked = sanitizeTargetUrl(data.url);
    if (!checked.ok) return fail("invalid_url", checked.reason);

    const { database } = await import("@/integrations/local/database.server");
    const securityRpc = database.rpc as unknown as SecurityRpc;

    const host = new URL(checked.url).hostname.replace(/^www\./, "").toLowerCase();
    const { data: blocked } = await database
      .from("supported_sites")
      .select("domain_or_pattern")
      .eq("status", "disabled");
    const isBlocked = (blocked ?? []).some((row: { domain_or_pattern: string }) => {
      const domain = String(row.domain_or_pattern).split("/")[0]?.toLowerCase() ?? "";
      return domain.length > 2 && (host === domain || host.endsWith(`.${domain}`));
    });
    if (isBlocked) return fail("invalid_url", "This website is currently disabled.");

    const apiKey = process.env["IXCORE_API_KEY"];
    if (!apiKey) return fail("missing_key", "The bypass service is not configured.");

    // These checks and the quota reservation execute under a database row lock,
    // closing the parallel-request race a modified client could otherwise exploit.
    const { data: reservationRaw, error: reservationError } = await securityRpc(
      "reserve_bypass_slot",
      { _user_id: userId, _url: checked.url },
    );
    if (reservationError) {
      console.error("Bypass reservation failed", reservationError);
      return fail("upstream", "The bypass service is temporarily unavailable.");
    }
    const reservation = reservationRaw as Reservation | null;
    if (!reservation?.ok || !reservation.reservation_id) {
      const allowedCodes = new Set<NonNullable<BypassResult["errorCode"]>>([
        "not_signed_in",
        "quota",
        "banned",
        "bypass_disabled",
        "rate_limited",
        "saturday_free",
      ]);
      const requestedCode = reservation?.code as NonNullable<BypassResult["errorCode"]>;
      return fail(allowedCodes.has(requestedCode) ? requestedCode : "upstream");
    }

    const endpoint = `https://api.ixcore.xyz/v1/bypass?url=${encodeURIComponent(checked.url)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    let outcome: BypassResult;
    try {
      const response = await fetch(endpoint, {
        headers: { "x-api-key": apiKey, accept: "application/json" },
        signal: controller.signal,
      });

      const declaredLength = Number(response.headers.get("content-length") ?? 0);
      if (declaredLength > 1_000_000) throw new Error("Upstream response too large");
      const raw = await response.text();
      if (raw.length > 1_000_000) throw new Error("Upstream response too large");

      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        payload = {};
      }

      if (!response.ok) {
        outcome = {
          status: "failed",
          result: "The upstream service rejected the request.",
          time: null,
          expiresAt: null,
          errorCode:
            response.status === 401 || response.status === 403
              ? "unauthorized"
              : response.status === 429
                ? "rate_limited"
                : "upstream",
          remaining: null,
        };
      } else {
        const succeeded = payload["status"] === "succeed";
        outcome = {
          status: succeeded ? "succeed" : "failed",
          result:
            typeof payload["result"] === "string"
              ? (payload["result"] as string).slice(0, 10_000)
              : "No result returned.",
          time: typeof payload["time"] === "string" ? (payload["time"] as string) : null,
          expiresAt:
            typeof payload["expires_at"] === "string" ? (payload["expires_at"] as string) : null,
          errorCode: succeeded ? null : "upstream",
          remaining: null,
        };
      }
    } catch (error) {
      const aborted = error instanceof Error && error.name === "AbortError";
      outcome = {
        status: "failed",
        result: aborted ? "The bypass request timed out." : "Unexpected upstream error.",
        time: null,
        expiresAt: null,
        errorCode: aborted ? "timeout" : "upstream",
        remaining: null,
      };
    } finally {
      clearTimeout(timeout);
    }

    const { data: finishRaw, error: finishError } = await securityRpc("finish_bypass_slot", {
      _reservation_id: reservation.reservation_id,
      _user_id: userId,
      _succeeded: outcome.status === "succeed",
      _result: outcome.result.slice(0, 500),
    });
    if (finishError) console.error("Bypass reservation finalization failed", finishError);
    const finished = finishRaw as { remaining?: number | null } | null;
    outcome.remaining = finished?.remaining ?? reservation.remaining ?? null;
    return outcome;
  });
