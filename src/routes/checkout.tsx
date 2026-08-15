import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import QRCode from "qrcode";
import { buildPromptPayPayload } from "@/lib/promptpay";
import { useQuery } from "@tanstack/react-query";
import { getStorefront } from "@/lib/account.functions";
import { verifySlip as verifySlipFn } from "@/lib/payment.functions";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — DevilDev" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const [planCode, setPlanCode] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const qrRef = useRef<HTMLImageElement | null>(null);
  const [slipUploading, setSlipUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const fetchStorefront = useServerFn(getStorefront);
  const storefront = useQuery({ queryKey: ["storefront"], queryFn: () => fetchStorefront({}) });
  const verifySlip = useServerFn(verifySlipFn as any);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const p = params.get("plan");
    if (p) setPlanCode(p);
  }, []);

  const plan = useMemo(() => {
    return (storefront.data?.plans ?? []).find((p) => p.code === planCode) ?? null;
  }, [storefront.data, planCode]);

  // Generate promptpay payload + QR
  useEffect(() => {
    if (!plan) return;
    // Prefer Vite env variable VITE_PROMPTPAY_NUMBER for client builds; fallback to server env or default
    const DEFAULT_PROMPTPAY = "0624136629";
    const phone = ((import.meta.env as any)?.VITE_PROMPTPAY_NUMBER as string) ?? process.env["PROMPTPAY_NUMBER"] ?? DEFAULT_PROMPTPAY;
    const amount = plan.price;
    try {
      const payload = buildPromptPayPayload(phone, amount, "DevilDev");
      QRCode.toDataURL(payload, { margin: 1 }).then((d: string) => setQrDataUrl(d));
    } catch (err) {
      console.error(err);
      setMessage("ไม่สามารถสร้าง QR ได้ โปรดติดต่อผู้ดูแล");
    }
  }, [plan]);


  // When a file is selected or dropped, only set preview and keep file until user confirms
  const onFile = (file?: File | null) => {
    if (!file || !plan) return;
    setSelectedFile(file);
    setSlipPreview(URL.createObjectURL(file));
    setMessage(null);
    setMessageType(null);
  };

  const handleConfirm = async () => {
    if (!selectedFile || !plan) return;
    setIsScanning(true);
    setSlipUploading(true);
    setMessage(null);
    setMessageType(null);
    try {
      const reader = new FileReader();
      const dataUrl: string = await new Promise((res, rej) => {
        reader.onload = () => res(String(reader.result));
        reader.onerror = rej;
        reader.readAsDataURL(selectedFile);
      });
      const matches = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
      if (!matches) throw new Error("invalid_image_data");
      const mimeType = matches[1];
      const base64 = matches[2];

      // Show scanning status text while awaiting server
      setMessage("กำลังตรวจสอบสลิปการโอนเงินกับระบบธนาคาร...");

      const res = await verifySlip({ data: { planCode: plan.code, amount: plan.price, imageBase64: base64, mimeType } } as any);
      if (res.ok) {
        // success -> redirect to payment success page
        setMessageType("success");
        setMessage("ชำระเงินสำเร็จแล้ว! แพ็กเกจของคุณได้รับการปรับปรุงเรียบร้อยแล้ว");
        // small delay so user sees success before redirect
        setTimeout(() => (location.href = "/payment/success"), 700);
      } else {
        setMessageType("error");
        setMessage(res.message ?? "การตรวจสอบไม่ผ่าน");
      }
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      setMessageType("error");
      setMessage(msg || "เกิดข้อผิดพลาดขณะอัปโหลดสลิป");
    } finally {
      setIsScanning(false);
      setSlipUploading(false);
    }
  };

  function downloadQr() {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `devildev_qr_${plan?.code ?? 'payment'}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  const bankLinks = [
    { name: 'K PLUS', scheme: 'kplus://' },
    { name: 'SCB EASY', scheme: 'scbeasy://' },
    { name: 'Krungthai NEXT', scheme: 'krungthainext://' },
    { name: 'TMB', scheme: 'tmb://'},
    { name: 'BAY', scheme: 'bbltb://'},
  ];

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  return (
    <main className="min-h-screen text-foreground">
      <div className="mx-auto w-full max-w-2xl px-5 pb-20 pt-8">
        <h1 className="text-xl font-bold">ชำระเงิน</h1>
        {!plan ? (
          <div className="mt-6 rounded-2xl border border-border bg-card p-6">กรุณาเลือกแพ็กเกจเพื่อชำระเงิน</div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-sm font-semibold">แพ็กเกจ: {plan.name_th ?? plan.name_en}</p>
              <p className="mt-1 text-lg font-bold">ยอดชำระ: {plan.price} {plan.currency}</p>
              <div className="mt-4 flex items-center justify-center">
                {qrDataUrl ? (
                  <div className="relative rounded-xl p-4 bg-white/5 backdrop-blur-md ring-1 ring-white/10 shadow-lg">
                    <div className="mx-auto" style={{ width: 220, height: 220, marginBottom: 12 }}>
                      <div className="w-[220px] h-[220px] bg-white/3 rounded-md overflow-hidden flex items-center justify-center" style={{ boxShadow: '0 8px 30px rgba(150,0,255,0.08)' }}>
                        <img ref={qrRef} src={qrDataUrl} alt="PromptPay QR" className="w-full h-full object-contain" />
                      </div>
                    </div>

                    <div className="mt-2 flex flex-col items-center gap-3">
                      <div className="flex justify-center gap-3">
                        <button onClick={downloadQr} className="rounded-md bg-amber-500 text-white px-3 py-2 text-sm font-semibold shadow hover:brightness-95">ดาวน์โหลด QR</button>
                      </div>
                      <div className="flex flex-wrap justify-center gap-2">
                        {bankLinks.map(b => (
                          <a key={b.name} href={b.scheme} className="inline-flex items-center px-3 py-2 rounded-md bg-white/6 text-xs font-medium" rel="noopener noreferrer">{b.name}</a>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-muted-foreground">กำลังสร้าง QR...</p>
                )}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">สแกน QR เพื่อชำระยอดข้างต้น</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-sm font-semibold">อัปโหลดสลิปการโอน</p>
              <p className="mt-2 text-xs text-muted-foreground">อัปโหลดรูปภาพสลิปเพื่อให้ระบบตรวจสอบอัตโนมัติ</p>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`mt-3 rounded-lg p-4 flex flex-col items-center justify-center gap-4 ${dragActive ? 'border-2 border-emerald-400 bg-emerald-50/10' : 'border-2 border-dashed border-border bg-card/50'}`}>
                <div className="flex flex-col items-center text-center">
                  <div className="p-3 rounded-md bg-white/5 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h10a4 4 0 004-4v-5a4 4 0 00-4-4H7a4 4 0 00-4 4v5z" /></svg>
                  </div>
                  <p className="font-medium">อัปโหลดสลิปการโอน</p>
                  <p className="text-xs text-muted-foreground">ลากและวางไฟล์ที่นี่ หรือคลิกเพื่อเลือกไฟล์ (PNG/JPEG)</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center px-3 py-2 bg-emerald-600 text-white rounded-md cursor-pointer">
                    เลือกไฟล์
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => onFile(e.target.files?.[0] ?? null)} className="hidden" disabled={slipUploading || isScanning} />
                  </label>
                  {slipPreview ? (
                    <div className="relative">
                      <img src={slipPreview} alt="preview" className="h-12 w-12 rounded-md object-cover border" />
                      {isScanning ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-md">
                          <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                          </svg>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {/* Confirm button shown after selecting file */}
                {selectedFile ? (
                  <div className="mt-3 flex items-center gap-3">
                    <button onClick={handleConfirm} disabled={slipUploading || isScanning} className="rounded-md bg-emerald-600 text-white px-4 py-2 text-sm font-semibold shadow hover:brightness-95">
                      {isScanning ? 'กำลังสแกน...' : 'ยืนยันการชำระเงิน'}
                    </button>
                    <button onClick={() => { setSelectedFile(null); setSlipPreview(null); setMessage(null); setMessageType(null); }} disabled={isScanning} className="rounded-md bg-white/6 px-3 py-2 text-sm">
                      ยกเลิก
                    </button>
                  </div>
                ) : null}
              </div>
              {message ? (
                <p className={`mt-2 text-sm ${messageType === 'success' ? 'text-emerald-600' : 'text-destructive'}`}>{message}</p>
              ) : null}
            </div>

            <div className="flex gap-3">
              <Link to="/" className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-semibold">กลับ</Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
