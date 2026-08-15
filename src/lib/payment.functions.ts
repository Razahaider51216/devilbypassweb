import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/integrations/local/auth-middleware";

// Create a purchase request (order) server function if you want explicit order rows
export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) =>
    z.object({ planCode: z.string().min(1).max(40), amount: z.number().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    if (!userId) return { ok: false, message: "not_signed_in" };
    const { planCode } = data;
    const { database } = await import("@/integrations/local/database.server");
    const { data: plan } = await database
      .from("plans")
      .select("code, price, is_trial")
      .eq("code", planCode)
      .eq("is_active", true)
      .maybeSingle();
    if (!plan || plan.is_trial || Number(plan.price) <= 0)
      return { ok: false, message: "invalid_plan" };

    const since = new Date(Date.now() - 60_000).toISOString();
    const { count } = await database
      .from("purchase_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since);
    if ((count ?? 0) >= 3) return { ok: false, message: "rate_limited" };

    const { error, data: row } = await database
      .from("purchase_requests")
      .insert({ user_id: userId, plan_code: planCode, status: "pending" })
      .select("id")
      .maybeSingle();
    if (error) return { ok: false, message: error.message };
    return { ok: true, id: row?.id };
  });

export const verifySlip = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) =>
    z
      .object({
        planCode: z.string().min(1).max(40),
        // Accepted for compatibility with the current UI, but never trusted.
        amount: z.number().optional(),
        imageBase64: z.string().min(10).max(12_000_000),
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    if (!userId) return { ok: false, message: "not_signed_in" };

    const { planCode, imageBase64, mimeType } = data as {
      planCode: string;
      imageBase64: string;
      mimeType: "image/jpeg" | "image/png" | "image/webp";
    };

    const { database } = await import("@/integrations/local/database.server");
    const { data: plan } = await database
      .from("plans")
      .select("code, price, duration_days, is_active, is_trial")
      .eq("code", planCode)
      .maybeSingle();
    const expectedAmount = Number(plan?.price ?? 0);
    if (
      !plan?.is_active ||
      plan.is_trial ||
      !Number.isFinite(expectedAmount) ||
      expectedAmount <= 0
    ) {
      return { ok: false, message: "invalid_plan" };
    }

    let imageBuffer: Buffer;
    try {
      imageBuffer = Buffer.from(imageBase64, "base64");
    } catch {
      return { ok: false, message: "invalid_image" };
    }
    if (imageBuffer.length === 0 || imageBuffer.length > 8_000_000) {
      return { ok: false, message: "invalid_image" };
    }
    const isJpeg = imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8 && imageBuffer[2] === 0xff;
    const isPng =
      imageBuffer[0] === 0x89 &&
      imageBuffer[1] === 0x50 &&
      imageBuffer[2] === 0x4e &&
      imageBuffer[3] === 0x47;
    const isWebp =
      imageBuffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      imageBuffer.subarray(8, 12).toString("ascii") === "WEBP";
    if (
      (mimeType === "image/jpeg" && !isJpeg) ||
      (mimeType === "image/png" && !isPng) ||
      (mimeType === "image/webp" && !isWebp)
    ) {
      return { ok: false, message: "invalid_image" };
    }

    // Prefer SlipOK config if present, otherwise fallback to generic SLIP_VERIFICATION_API
    const slipokUrl =
      process.env["SLIPOK_API_URL"] ??
      process.env["VITE_SLIPOK_API_URL"] ??
      process.env["SLIP_VERIFICATION_API_URL"];
    const slipokKey = process.env["SLIPOK_API_KEY"] ?? process.env["SLIP_VERIFICATION_API_KEY"];
    const slipokBranch = process.env["SLIPOK_BRANCH_ID"] ?? process.env["SLIPOK_BRANCH"];

    let verified = false;
    let slipUrl = "";
    let verificationMessage: string | undefined = undefined;

    // Helper: normalize to last 10 digits for Thai mobile/account comparison
    const localLast10 = (s?: string) => {
      if (!s) return "";
      const digits = s.replace(/[^0-9]/g, "");
      return digits.slice(-10);
    };

    if (slipokUrl && slipokKey) {
      try {
        // Prepare binary buffer of the image for FormData
        // Determine extension and mime for naming
        let ext = "jpg";
        let contentType = "image/jpeg";
        if (typeof mimeType === "string") {
          const mt = mimeType.toLowerCase();
          if (mt.includes("png")) {
            ext = "png";
            contentType = "image/png";
          } else if (mt.includes("jpeg") || mt.includes("jpg")) {
            ext = "jpg";
            contentType = "image/jpeg";
          } else if (mt.includes("webp")) {
            ext = "webp";
            contentType = "image/webp";
          }
        }

        // Build FormData and send to SlipOK as requested (files key + log + amount)
        const form = new FormData();
        const fileName = `slip_${userId}_${Date.now()}.${ext}`;
        const blob = new Blob([Uint8Array.from(imageBuffer)], { type: contentType });
        form.append("files", blob, fileName);
        form.append("log", "true");
        form.append("amount", String(expectedAmount));
        if (slipokBranch) form.append("branch_id", String(slipokBranch));

        const resp = await fetch(slipokUrl, {
          method: "POST",
          headers: { "x-authorization": String(slipokKey) as string },
          body: form,
        });

        const slipokStatus = resp.status;
        const json = await resp.json().catch(() => ({}));

        // SlipOK's success flag and codes
        const success = Boolean(
          json?.success === true || json?.ok === true || json?.data?.success === true,
        );
        const code = Number(json?.code ?? 0) || 0;
        const payload = json?.data ?? json;
        const respAccount =
          payload?.account ||
          payload?.to_account ||
          payload?.receiver_account ||
          payload?.destination ||
          payload?.payee ||
          null;
        const respAmount =
          Number(payload?.amount ?? payload?.sum ?? payload?.value ?? payload?.price ?? 0) || 0;
        const isDuplicate = Boolean(
          payload?.duplicate ||
          payload?.is_duplicate ||
          payload?.used ||
          payload?.is_used ||
          json?.is_duplicate ||
          code === 1012,
        );

        const expectedAccount = localLast10(
          process.env["PROMPTPAY_NUMBER"] ?? process.env["VITE_PROMPTPAY_NUMBER"] ?? "",
        );
        const foundAccount = localLast10(respAccount ?? undefined);

        if (isDuplicate) {
          verificationMessage = "สลิปนี้ถูกใช้งานไปแล้ว";
          verified = false;
        } else if (expectedAccount && foundAccount && expectedAccount !== foundAccount) {
          verificationMessage = "บัญชีผู้รับไม่ตรงกับที่ตั้งค่าไว้";
          verified = false;
        } else if (!respAmount || Math.abs(expectedAmount - respAmount) >= 0.01) {
          verificationMessage = `ยอดเงินไม่ถูกต้อง (ได้รับ ${respAmount} บาท)`;
          verified = false;
        } else if (success) {
          verified = true;
        } else {
          // Use SlipOK message or include HTTP status/code details for clarity
          verificationMessage = `SlipOK ตรวจสอบไม่ผ่าน (status: ${slipokStatus}, code: ${code})`;
          verified = false;
        }
      } catch (err) {
        console.error("SlipOK verification call failed", err);
        verificationMessage = "slip_verification_unavailable";
        verified = false;
      }
    }

    try {
      const status = verified ? "paid" : "pending";

      // Keep a local copy of the slip for admin records.
      try {
        let ext = "jpg";
        let contentType = "image/jpeg";
        if (typeof mimeType === "string") {
          const mt = mimeType.toLowerCase();
          if (mt.includes("png")) {
            ext = "png";
            contentType = "image/png";
          } else if (mt.includes("jpeg") || mt.includes("jpg")) {
            ext = "jpg";
            contentType = "image/jpeg";
          } else if (mt.includes("webp")) {
            ext = "webp";
            contentType = "image/webp";
          }
        }

        void contentType;
        const { saveUpload } = await import("@/integrations/local/storage.server");
        slipUrl = saveUpload("slips", imageBuffer, ext);
      } catch (storageErr) {
        console.warn("storage upload exception, skipping storage", storageErr);
      }

      const { error: insertError, data: inserted } = await database
        .from("purchase_requests")
        .insert({ user_id: userId, plan_code: planCode, status, admin_note: slipUrl })
        .select("id")
        .maybeSingle();

      if (insertError) {
        console.error("db insert error", insertError);
        return { ok: false, message: "db_error" };
      }

      if (verified) {
        if (inserted?.id) {
          await database.from("purchase_requests").update({ status: "paid" }).eq("id", inserted.id);
        }

        try {
          let expires: string | null = null;
          if (plan.duration_days != null) {
            const days = Number(plan.duration_days) || 0;
            expires = new Date(Date.now() + days * 86_400_000).toISOString();
          }
          await database
            .from("profiles")
            .update({ plan_code: planCode, plan_expires_at: expires })
            .eq("id", userId);
        } catch (err) {
          console.error("activate plan failed", err);
        }

        return { ok: true };
      }
      // If not verified, return provider or captured error message (no vague fallback)
      return { ok: false, message: verificationMessage ?? "การตรวจสอบไม่ผ่าน" };
    } catch (err) {
      console.error(err);
      return { ok: false, message: "เกิดข้อผิดพลาดขณะประมวลผลสลิป" };
    }
  });
