/** Hand-drawn animated success / failure marks. */
export function StatusIcon({ kind }: { kind: "success" | "error" }) {
  const success = kind === "success";
  return (
    <span
      className={`relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border backdrop-blur-sm ${
        success
          ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-300"
          : "border-red-400/50 bg-red-500/10 text-red-300"
      }`}
      style={{
        animation: success
          ? "dd-success-pop 560ms cubic-bezier(0.34,1.56,0.64,1) both, dd-success-pulse 2.2s ease-in-out 560ms infinite"
          : "dd-error-shake 520ms ease-in-out both, dd-error-pulse 1.8s ease-in-out 520ms infinite",
      }}
      aria-hidden
    >
      <svg viewBox="0 0 52 52" className="h-7 w-7 drop-shadow-[0_0_10px_rgba(255,255,255,0.08)]">
        <circle
          cx="26"
          cy="26"
          r="22"
          fill="none"
          strokeWidth="2.5"
          className={success ? "stroke-emerald-300/80" : "stroke-red-300/80"}
          strokeDasharray="140"
          style={{ animation: "dd-draw 0.7s ease-out both", strokeDashoffset: 0 }}
        />
        {success ? (
          <path
            d="M15 27.5 L23 35 L38 18"
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-emerald-200"
            strokeDasharray="120"
            style={{ animation: "dd-draw 0.45s 0.3s ease-out both" }}
          />
        ) : (
          <>
            <path
              d="M17 17 L35 35"
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
              className="stroke-red-200"
              strokeDasharray="120"
              style={{ animation: "dd-draw 0.35s 0.25s ease-out both" }}
            />
            <path
              d="M35 17 L17 35"
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
              className="stroke-red-200"
              strokeDasharray="120"
              style={{ animation: "dd-draw 0.35s 0.45s ease-out both" }}
            />
          </>
        )}
      </svg>
    </span>
  );
}
