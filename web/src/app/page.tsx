"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// Load QrScannerModal client-side only (html5-qrcode needs window/DOM)
const QrScannerModal = dynamic(() => import("./QrScannerModal"), {
  ssr: false,
  loading: () => null,
});

export default function Home() {
  const router = useRouter();
  const [lang, setLang] = useState<"th" | "en">("th");
  const [showScanner, setShowScanner] = useState(false);
  const [scanError, setScanError] = useState("");

  const handleScanSuccess = (rawToken: string) => {
    setShowScanner(false);
    if (!rawToken) return;
    // rawToken คือ AES+Base64URL token ที่อยู่ใน QR Code
    // ส่งต่อไปหน้า /p/[token] เพื่อถอดรหัสและ fetch สินค้า
    router.push(`/p/${encodeURIComponent(rawToken)}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface-bright">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-6 h-16 bg-surface-bright border-b border-outline-variant shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shadow-sm">
            <img src="/icon-192.png" alt="ProRegis Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="font-bold text-xl text-primary tracking-tight">ProRegis</h1>
        </div>
        <button
          onClick={() => setLang(lang === "th" ? "en" : "th")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm font-semibold hover:bg-surface-container-low transition-colors active:scale-95 duration-100"
        >
          <span className="material-symbols-outlined text-lg">language</span>
          {lang === "th" ? "English" : "ไทย"}
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-grow pt-16 flex flex-col items-center justify-center px-4 max-w-lg mx-auto w-full">
        {/* Logo & Brand */}
        <div className="text-center mb-10">
          <div className="w-24 h-24 rounded-3xl overflow-hidden flex items-center justify-center mx-auto mb-6 shadow-lg">
            <img src="/icon-512.png" alt="ProRegis App Icon" className="w-full h-full object-cover" />
          </div>
          <h2 className="font-bold text-3xl text-primary mb-2">
            {lang === "th" ? "ลงทะเบียนรับประกัน" : "Product Warranty"}
          </h2>
          <p className="text-sm text-on-surface-variant leading-relaxed max-w-xs mx-auto">
            {lang === "th"
              ? "สแกน QR Code บนสินค้า Window Asia เพื่อเปิดใช้งานสิทธิ์รับประกันสินค้าของคุณ"
              : "Scan the QR Code on your Window Asia product to activate your warranty coverage."}
          </p>
        </div>

        {/* Primary CTA — Scan Button */}
        <button
          onClick={() => {
            setScanError("");
            setShowScanner(true);
          }}
          className="w-full max-w-sm h-16 bg-secondary text-white font-bold text-lg rounded-2xl shadow-lg hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-3 mb-4"
        >
          <span
            className="material-symbols-outlined !text-2xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            photo_camera
          </span>
          {lang === "th" ? "เปิดกล้องสแกน QR Code" : "Open Camera to Scan QR"}
        </button>

        {/* Instruction Steps */}
        <div className="w-full max-w-sm bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 mb-6">
          <p className="text-xs font-bold text-outline uppercase tracking-wider mb-4">
            {lang === "th" ? "วิธีการลงทะเบียน" : "How to Register"}
          </p>
          <div className="space-y-3">
            {[
              {
                icon: "photo_camera",
                th: "กดปุ่มด้านบน เปิดกล้องในแอป",
                en: "Tap the button above to open camera",
              },
              {
                icon: "qr_code_scanner",
                th: "ส่องกล้องไปที่ QR Code บนกระจก/สินค้า",
                en: "Point camera at the QR Code on your glass/product",
              },
              {
                icon: "assignment_turned_in",
                th: "กรอกข้อมูลและยืนยันตัวตน",
                en: "Fill in your details and verify via OTP",
              },
              {
                icon: "verified",
                th: "รับสิทธิ์รับประกันทันที!",
                en: "Get your warranty activated instantly!",
              },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-7 h-7 bg-secondary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-secondary !text-[16px]">
                    {step.icon}
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  <span className="font-semibold text-primary">{i + 1}.</span>{" "}
                  {lang === "th" ? step.th : step.en}
                </p>
              </div>
            ))}
          </div>
        </div>

        {scanError && (
          <p className="text-xs text-error font-semibold text-center">{scanError}</p>
        )}

        {/* Window Asia branding */}
        <div className="flex items-center gap-2 mt-2">
          <div className="w-px h-4 bg-outline-variant" />
          <p className="text-xs text-outline">
            {lang === "th"
              ? "ให้บริการโดย Window Asia Public Company Limited"
              : "Powered by Window Asia Public Company Limited"}
          </p>
          <div className="w-px h-4 bg-outline-variant" />
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-on-surface-variant border-t border-outline-variant bg-surface-container-low">
        <p>© 2026 Window Asia Public Company Limited. All rights reserved.</p>
      </footer>

      {/* QR Scanner Modal */}
      {showScanner && (
        <QrScannerModal
          onClose={() => setShowScanner(false)}
          onScanSuccess={handleScanSuccess}
          lang={lang}
        />
      )}
    </div>
  );
}
