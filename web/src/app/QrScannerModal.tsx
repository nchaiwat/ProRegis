"use client";

import React, { useEffect, useRef, useState } from "react";

interface QrScannerModalProps {
  onClose: () => void;
  onScanSuccess: (token: string) => void;
  lang: "th" | "en";
}

export default function QrScannerModal({ onClose, onScanSuccess, lang }: QrScannerModalProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const isMountedRef = useRef(true);
  const containerId = "inapp-qr-scanner-element";

  useEffect(() => {
    isMountedRef.current = true;

    // Dynamically import html5-qrcode so it's guaranteed to run client-side
    // and only after the DOM element is confirmed mounted
    let cancelled = false;

    const startScanner = async () => {
      // Small delay so the modal DOM is fully painted first
      await new Promise((res) => setTimeout(res, 150));
      if (cancelled || !isMountedRef.current) return;

      let Html5Qrcode: typeof import("html5-qrcode").Html5Qrcode;
      try {
        const mod = await import("html5-qrcode");
        Html5Qrcode = mod.Html5Qrcode;
      } catch {
        if (!isMountedRef.current) return;
        setErrorMsg(
          lang === "th"
            ? "ไม่สามารถโหลด QR Scanner ได้ กรุณารีเฟรชหน้าเว็บ"
            : "Failed to load QR Scanner. Please refresh the page."
        );
        setIsStarting(false);
        return;
      }

      const el = document.getElementById(containerId);
      if (!el || cancelled) {
        if (isMountedRef.current) setIsStarting(false);
        return;
      }

      const html5QrCode = new Html5Qrcode(containerId);
      scannerRef.current = html5QrCode;

      const qrCodeSuccessCallback = (decodedText: string) => {
        let token = decodedText.trim();
        try {
          // ถ้า QR เก็บ URL เต็ม เช่น https://proregis.windowasia.com/p/TOKEN
          const url = new URL(decodedText);
          const parts = url.pathname.split("/");
          const extracted = parts[parts.length - 1];
          if (extracted) token = extracted;
        } catch {
          // QR เก็บแค่ Token ล้วนๆ — ใช้ค่าตรงๆ
        }

        html5QrCode
          .stop()
          .then(() => onScanSuccess(token))
          .catch(() => onScanSuccess(token));
      };

      const config = {
        fps: 15,
        aspectRatio: 1.0,
      };

      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          qrCodeSuccessCallback,
          () => {} // suppress verbose frame errors
        );
        if (isMountedRef.current) setIsStarting(false);
      } catch (err) {
        console.error("Camera start error:", err);
        if (!isMountedRef.current) return;
        setIsStarting(false);
        // Distinguish permission denial from other errors
        const message = String(err).toLowerCase();
        if (message.includes("permission") || message.includes("notallowed") || message.includes("denied")) {
          setErrorMsg(
            lang === "th"
              ? "ถูกปฏิเสธสิทธิ์กล้อง กรุณาอนุญาตการใช้กล้องในการตั้งค่าเบราว์เซอร์ แล้วลองใหม่"
              : "Camera permission denied. Please allow camera access in your browser settings and try again."
          );
        } else if (message.includes("notfound") || message.includes("no camera")) {
          setErrorMsg(
            lang === "th"
              ? "ไม่พบกล้องบนอุปกรณ์นี้"
              : "No camera found on this device."
          );
        } else {
          setErrorMsg(
            lang === "th"
              ? "ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบว่าอนุญาตกล้องแล้ว และเข้าผ่าน HTTPS หรือ localhost"
              : "Unable to open camera. Make sure camera permission is granted and you're using HTTPS or localhost."
          );
        }
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      isMountedRef.current = false;
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const handleClose = () => {
    if (scannerRef.current?.isScanning) {
      scannerRef.current.stop().then(() => onClose()).catch(() => onClose());
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <style>{`
        #${containerId} {
          width: 100% !important;
          height: 100% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          overflow: hidden !important;
        }
        #${containerId} video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          object-position: center !important;
        }
        @keyframes scan-line-anim {
          0% { top: 4%; }
          50% { top: 96%; }
          100% { top: 4%; }
        }
        .custom-scan-line {
          position: absolute;
          left: 5%;
          right: 5%;
          height: 3px;
          background: linear-gradient(90deg, transparent, var(--color-secondary, #0284c7), transparent);
          box-shadow: 0 0 10px var(--color-secondary, #0284c7);
          animation: scan-line-anim 2.5s ease-in-out infinite;
        }
      `}</style>

      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-outline-variant animate-success">
        {/* Header */}
        <div className="px-5 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">photo_camera</span>
            <h3 className="font-bold text-sm text-primary">
              {lang === "th" ? "สแกน QR Code บนสินค้า" : "Scan Product QR Code"}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="material-symbols-outlined text-outline hover:text-primary transition-colors p-1 rounded-full hover:bg-surface-container cursor-pointer"
          >
            close
          </button>
        </div>

        {/* Camera Viewport - Edge-to-Edge */}
        <div className="w-full relative aspect-square bg-black overflow-hidden border-b border-outline-variant">
          {/* This div MUST stay in DOM before scanner init */}
          <div id={containerId} className="w-full h-full" />

          {/* Loading spinner overlay — shown while camera initializes */}
          {isStarting && !errorMsg && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-3">
              <div className="w-8 h-8 border-3 border-secondary border-t-transparent rounded-full animate-spin" />
              <p className="text-white text-xs font-medium">
                {lang === "th" ? "กำลังเปิดกล้อง..." : "Starting camera..."}
              </p>
            </div>
          )}

          {/* Custom high-end visual overlay overlaying the scanner viewport */}
          {!isStarting && !errorMsg && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Corner brackets at the borders of the container */}
              <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-secondary rounded-tl-md" />
              <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-secondary rounded-tr-md" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-secondary rounded-bl-md" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-secondary rounded-br-md" />

              {/* Animated laser line spanning the full width */}
              <div className="custom-scan-line" style={{ left: "8%", right: "8%" }} />
            </div>
          )}
        </div>

        {/* Instructions & Actions */}
        <div className="p-5 flex flex-col items-center space-y-4">
          <p className="text-center text-xs text-on-surface-variant font-medium leading-relaxed max-w-xs">
            {lang === "th"
              ? "ชี้กล้องไปที่ QR Code บนกระจกหรือสินค้าให้อยู่ในกรอบ"
              : "Point the camera at the QR Code on the glass or product."}
          </p>

          {errorMsg && (
            <div className="w-full p-3 bg-error/10 border border-error/20 rounded-lg flex gap-2.5 items-start text-xs text-error font-semibold leading-relaxed">
              <span className="material-symbols-outlined text-[18px] flex-shrink-0">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Retry button if error */}
          {errorMsg && (
            <button
              onClick={handleClose}
              className="w-full h-12 bg-secondary text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined !text-[18px]">close</span>
              {lang === "th" ? "ปิดและลองใหม่" : "Close & Retry"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
