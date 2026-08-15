import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/payment_success")({
  head: () => ({ meta: [{ title: "Payment Success — DevilDev" }] }),
  component: SuccessPage,
});

function SuccessPage() {
  return (
    <main className="min-h-screen text-foreground">
      <div className="mx-auto w-full max-w-2xl px-5 pb-20 pt-8">
        <h1 className="text-xl font-bold">ชำระเงินสำเร็จ</h1>
        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <div className="rounded-lg bg-emerald-600/10 p-4">
            <p className="text-sm font-semibold text-emerald-800">เราตรวจสอบสลิปเรียบร้อย — ขอบคุณที่ชำระเงิน</p>
            <p className="mt-2 text-xs text-emerald-700">ระบบได้เปิดใช้งานแพ็กเกจให้เรียบร้อยแล้ว</p>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Link to="/" className="inline-flex items-center justify-center rounded-xl bg-emerald-500 text-white px-4 py-2 text-sm font-semibold shadow-lg ring-2 ring-emerald-300">กลับไปยังระบบบายพาส</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
