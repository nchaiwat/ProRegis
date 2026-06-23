"use client";

import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface QrScannerModalProps {
  onClose: () => void;
  onScanSuccess: (token: string) => void;
  lang: "th" | "en";
}

export default function QrScannerModal({ onClose, onScanSuccess, lang }: QrScannerModalProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "inapp-qr-scanner-element";

  useEffect(() => {
    let cancelled = false;
    const html5QrCode = new Html5Qrcode(containerId);
    scannerRef.current = html5QrCode;

    const qrCodeSuccessCallback = (decodedText: string) => {
      let token = decodedText.trim();
      try {
        const url = new URL(decodedText);
        const parts = url.pathname.split("/");
        const extracted = parts[parts.length - 1];
        if (extracted) {
          token = extracted;
        }
      } catch (_) {}

      html5QrCode.stop()
        .then(() => {
          onScanSuccess(token);
        })
        .catch((err) => {
          console.error("Failed to stop scanner:", err);
          onScanSuccess(token);
        });
    };

    const config = {
      fps: 15,
      aspectRatio: 1.0
    };

    html5QrCode.start(
      { facingMode: "environment" },
      config,
      qrCodeSuccessCallback,
      () => {}
    ).then(() => {
      if (!cancelled) {
        setIsStarting(false);
      }
    }).catch((err) => {
      console.error("Error starting camera scanner:", err);
      if (!cancelled) {
        setIsStarting(false);
        setErrorMsg(
          lang === "th"
            ? "ไม่สามารถเข้าถึงกล้องถ่ายรูปได้ โปรดตรวจสอบสิทธิ์การใช้งานกล้องในอุปกรณ์ของคุณ"
            : "Unable to access camera. Please check camera permissions for this site."
        );
      }
    });

    return () => {
      cancelled = true;
      if (html5QrCode.isScanning) {
        html5QrCode.stop().catch((e) => console.warn("Error stopping scanner during unmount:", e));
      }
    };
  }, [onScanSuccess, lang]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
      <style>{`
        #${containerId} {
          width: 100% !important;
          height: 100% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          overflow: hidden !important;
          border-radius: 0.75rem !important;
        }
        #${containerId} video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          object-position: center !important;
          border-radius: 0.75rem !important;
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

      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-outline-variant">
        {/* Header */}
        <div className="px-5 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">photo_camera</span>
            <h3 className="font-bold text-sm text-primary">
              {lang === "th" ? "สแกน QR Code สินค้า" : "Scan Product QR Code"}
            </h3>
          </div>
          <button
            onClick={() => {
              if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop()
                  .then(() => onClose())
                  .catch(() => onClose());
              } else {
                onClose();
              }
            }}
            className="material-symbols-outlined text-outline hover:text-primary transition-colors p-1 rounded-full hover:bg-surface-container cursor-pointer"
          >
            close
          </button>
        </div>

        {/* Camera Scanner viewport */}
        <div className="p-6 flex flex-col items-center justify-center space-y-4">
          <div className="w-full relative aspect-square max-w-[240px] bg-black rounded-xl overflow-hidden border-2 border-secondary/30">
            <div id={containerId} className="w-full h-full" />

            {/* Loading spinner */}
            {isStarting && !errorMsg && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-2">
                <div className="w-7 h-7 border-3 border-secondary border-t-transparent rounded-full animate-spin" />
                <p className="text-white text-[10px] font-semibold tracking-wider">
                  {lang === "th" ? "กำลังเปิดกล้อง..." : "STARTING CAMERA..."}
                </p>
              </div>
            )}

            {/* Custom high-end visual overlay overlaying the scanner viewport */}
            {!isStarting && !errorMsg && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Corner brackets at the borders of the container */}
                <div className="absolute top-3 left-3 w-6 h-6 border-t-4 border-l-4 border-secondary rounded-tl-md" />
                <div className="absolute top-3 right-3 w-6 h-6 border-t-4 border-r-4 border-secondary rounded-tr-md" />
                <div className="absolute bottom-3 left-3 w-6 h-6 border-b-4 border-l-4 border-secondary rounded-bl-md" />
                <div className="absolute bottom-3 right-3 w-6 h-6 border-b-4 border-r-4 border-secondary rounded-br-md" />

                {/* Animated laser line spanning the full width */}
                <div className="custom-scan-line" style={{ left: "8%", right: "8%" }} />
              </div>
            )}
          </div>

          <p className="text-center text-xs text-on-surface-variant font-medium leading-relaxed max-w-xs">
            {lang === "th"
              ? "วางรหัส QR Code ของสินค้าให้อยู่ในกรอบสแกนเพื่อลงทะเบียนอัตโนมัติ"
              : "Align the product QR Code inside the frame to register automatically."}
          </p>

          {errorMsg && (
            <div className="w-full p-3 bg-error/10 border border-error/20 rounded-lg flex gap-2.5 items-start text-xs text-error font-semibold mt-2 leading-relaxed">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
