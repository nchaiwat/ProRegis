"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";

export default function SettingsAdminPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Settings states
  const [qrMode, setQrMode] = useState<"STATIC" | "DYNAMIC">("STATIC");
  const [verificationMode, setVerificationMode] = useState<"OTP" | "LINE">("OTP");

  useEffect(() => {
    const stored = sessionStorage.getItem("bo_session");
    if (!stored) {
      router.replace("/backoffice");
      return;
    }
    try {
      const s = JSON.parse(stored);
      if (s.role !== "SYSTEM_ADMIN") {
        setIsAdmin(false);
        setError("ขออภัย เฉพาะผู้ดูแลระบบสูงสุด (SYSTEM_ADMIN) เท่านั้นที่เข้าใช้งานส่วนนี้ได้");
        setIsLoading(false);
        return;
      }
      setIsAdmin(true);
      fetchSettings();
    } catch {
      router.replace("/backoffice");
    }
  }, [router]);

  const fetchSettings = async () => {
    setIsLoading(true);
    setError("");
    const token = sessionStorage.getItem("bo_token");

    try {
      const res = await fetch(`${getApiBaseUrl()}/backoffice/settings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.QR_CODE_MODE) {
          setQrMode(data.QR_CODE_MODE as "STATIC" | "DYNAMIC");
        }
        if (data.VERIFICATION_MODE) {
          setVerificationMode(data.VERIFICATION_MODE as "OTP" | "LINE");
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.message || "ไม่สามารถดึงข้อมูลการตั้งค่าได้");
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleQrMode = async (mode: "STATIC" | "DYNAMIC") => {
    setIsSaving(true);
    setSuccessMsg("");
    setError("");
    const token = sessionStorage.getItem("bo_token");

    try {
      const res = await fetch(`${getApiBaseUrl()}/backoffice/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ key: "QR_CODE_MODE", value: mode }),
      });

      if (res.ok) {
        setQrMode(mode);
        setSuccessMsg("อัปเดตโหมด QR Code สำเร็จ");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.message || "ไม่สามารถบันทึกข้อมูลการตั้งค่าได้");
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการบันทึกการตั้งค่า");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleVerificationMode = async (mode: "OTP" | "LINE") => {
    setIsSaving(true);
    setSuccessMsg("");
    setError("");
    const token = sessionStorage.getItem("bo_token");

    try {
      const res = await fetch(`${getApiBaseUrl()}/backoffice/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ key: "VERIFICATION_MODE", value: mode }),
      });

      if (res.ok) {
        setVerificationMode(mode);
        setSuccessMsg("อัปเดตระบบยืนยันตัวตนสำเร็จ");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.message || "ไม่สามารถบันทึกข้อมูลการตั้งค่าได้");
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการบันทึกการตั้งค่า");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-semibold text-outline">กำลังโหลดการตั้งค่า...</span>
      </div>
    );
  }

  if (error && !isAdmin) {
    return (
      <div className="p-6 bg-error/10 border border-error/20 rounded-xl text-center">
        <span className="material-symbols-outlined text-error !text-[48px] mb-3">gpp_maybe</span>
        <p className="text-sm font-bold text-error">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      {/* Header Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-primary tracking-tight">ตั้งค่าระบบ (System Settings)</h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            ปรับเปลี่ยนโหมดการสแกนและระบบยืนยันตัวตนของแอปพลิเคชัน ProRegis ในแบบเรียลไทม์
          </p>
        </div>
        <button
          onClick={fetchSettings}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 border border-outline-variant hover:bg-surface-container-high active:scale-95 duration-100 rounded-xl text-xs font-bold text-primary cursor-pointer transition-all disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[16px]">sync</span>
          รีเฟรชข้อมูล
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-success/15 border border-success/30 rounded-xl text-success font-semibold text-xs animate-slide-up">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <p>{successMsg}</p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-error/15 border border-error/30 rounded-xl text-error font-semibold text-xs animate-slide-up">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <p>{error}</p>
        </div>
      )}

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* QR CODE MODE SETTING */}
        <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm p-6 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary flex-shrink-0">
              <span className="material-symbols-outlined text-[24px]">qr_code_2</span>
            </div>
            <div>
              <h3 className="font-bold text-base text-primary">โหมดรูปแบบ QR Code</h3>
              <p className="text-xs text-on-surface-variant/80 mt-1 leading-relaxed">
                สวิตช์รูปแบบการพิมพ์สติกเกอร์บาร์โค้ดสแกนรับประกัน
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* STATIC MODE CARD */}
            <button
              onClick={() => handleToggleQrMode("STATIC")}
              disabled={isSaving}
              className={`p-4 rounded-xl border text-left flex flex-col justify-between h-36 transition-all active:scale-98 cursor-pointer ${
                qrMode === "STATIC"
                  ? "border-secondary bg-secondary/5 ring-1 ring-secondary"
                  : "border-outline-variant/60 hover:bg-surface-container-lowest"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                  qrMode === "STATIC" ? "bg-secondary text-white" : "bg-surface-variant text-outline"
                }`}>
                  Static
                </span>
                {qrMode === "STATIC" && (
                  <span className="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
                )}
              </div>
              <div>
                <h4 className="font-bold text-xs text-primary">Static QR (9 หลัก)</h4>
                <p className="text-[10px] text-on-surface-variant/65 mt-1 leading-normal">
                  พิมพ์รหัสใบสั่งผลิต 9 หลักอันเดียวกันทั้งล็อต ง่ายต่อการผลิตในโรงงาน
                </p>
              </div>
            </button>

            {/* DYNAMIC MODE CARD */}
            <button
              onClick={() => handleToggleQrMode("DYNAMIC")}
              disabled={isSaving}
              className={`p-4 rounded-xl border text-left flex flex-col justify-between h-36 transition-all active:scale-98 cursor-pointer ${
                qrMode === "DYNAMIC"
                  ? "border-secondary bg-secondary/5 ring-1 ring-secondary"
                  : "border-outline-variant/60 hover:bg-surface-container-lowest"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                  qrMode === "DYNAMIC" ? "bg-secondary text-white" : "bg-surface-variant text-outline"
                }`}>
                  Dynamic
                </span>
                {qrMode === "DYNAMIC" && (
                  <span className="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
                )}
              </div>
              <div>
                <h4 className="font-bold text-xs text-primary">Dynamic QR (AES)</h4>
                <p className="text-[10px] text-on-surface-variant/65 mt-1 leading-normal">
                  เข้ารหัสลับไม่ซ้ำชิ้น ยับยั้งการลงทะเบียนซ้ำสวมสิทธิ์ได้สมบูรณ์แบบ
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* VERIFICATION MODE SETTING */}
        <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm p-6 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary flex-shrink-0">
              <span className="material-symbols-outlined text-[24px]">verified_user</span>
            </div>
            <div>
              <h3 className="font-bold text-base text-primary">ระบบยืนยันตัวตนลูกค้า</h3>
              <p className="text-xs text-on-surface-variant/80 mt-1 leading-relaxed">
                สวิตช์ช่องทางการตรวจสอบสิทธิ์ลูกค้าในขั้นตอนที่ 4
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* SMS OTP CARD */}
            <button
              onClick={() => handleToggleVerificationMode("OTP")}
              disabled={isSaving}
              className={`p-4 rounded-xl border text-left flex flex-col justify-between h-36 transition-all active:scale-98 cursor-pointer ${
                verificationMode === "OTP"
                  ? "border-secondary bg-secondary/5 ring-1 ring-secondary"
                  : "border-outline-variant/60 hover:bg-surface-container-lowest"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                  verificationMode === "OTP" ? "bg-secondary text-white" : "bg-surface-variant text-outline"
                }`}>
                  SMS OTP
                </span>
                {verificationMode === "OTP" && (
                  <span className="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
                )}
              </div>
              <div>
                <h4 className="font-bold text-xs text-primary">ยืนยันทางเบอร์โทร SMS</h4>
                <p className="text-[10px] text-on-surface-variant/65 mt-1 leading-normal">
                  ป้อนหมายเลขโทรศัพท์และรับรหัส OTP 6 หลักเพื่อกดยืนยันใบลงทะเบียน
                </p>
              </div>
            </button>

            {/* LINE LIFF CARD */}
            <button
              onClick={() => handleToggleVerificationMode("LINE")}
              disabled={isSaving}
              className={`p-4 rounded-xl border text-left flex flex-col justify-between h-36 transition-all active:scale-98 cursor-pointer ${
                verificationMode === "LINE"
                  ? "border-secondary bg-secondary/5 ring-1 ring-secondary"
                  : "border-outline-variant/60 hover:bg-surface-container-lowest"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                  verificationMode === "LINE" ? "bg-secondary text-white" : "bg-surface-variant text-outline"
                }`}>
                  LINE Login
                </span>
                {verificationMode === "LINE" && (
                  <span className="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
                )}
              </div>
              <div>
                <h4 className="font-bold text-xs text-primary">ข้ามทาง LINE User ID</h4>
                <p className="text-[10px] text-on-surface-variant/65 mt-1 leading-normal">
                  ดึงประวัติตัวตนลูกค้าผ่าน LINE LIFF อัตโนมัติ ปลอดภัย และสะดวกสูงสุด
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Admin Actions Panel */}
      <div className="p-5 bg-surface-container-low border border-outline-variant/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-outline">info</span>
          <p className="text-[11px] text-on-surface-variant font-medium max-w-lg leading-relaxed">
            ระบบจัดเก็บประวัติการปรับการตั้งค่าไว้ที่ **Audit Log** เสมอเพื่อตรวจสอบย้อนหลัง 
            การสลับโหมดจะมีผลต่อหน้าสแกนลงทะเบียนของลูกค้าในทันทีโดยไม่ต้องรีสตาร์ทบริการ
          </p>
        </div>
      </div>
    </div>
  );
}
