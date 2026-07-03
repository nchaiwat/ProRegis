"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";

interface SettingInfo {
  value: string;
  updatedAt: string;
}

export default function SettingsAdminPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Configuration States
  const [settings, setSettings] = useState<Record<string, SettingInfo>>({});

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
        setSettings(data);
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

  const handleUpdateSetting = async (key: string, newValue: string) => {
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
        body: JSON.stringify({ key, value: newValue }),
      });

      if (res.ok) {
        setSuccessMsg(`อัปเดต ${key} สำเร็จแล้ว!`);
        setTimeout(() => setSuccessMsg(""), 3000);
        // Refresh settings from database to get fresh updatedAt timestamps
        await fetchSettings();
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

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return (
      date.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }) + " น."
    );
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

  const qrMode = settings.QR_CODE_MODE?.value || "STATIC";
  const verificationMode = settings.VERIFICATION_MODE?.value || "OTP";

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in pb-12">
      {/* Header Panel */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-primary tracking-tight">ตั้งค่าระบบ (System Settings)</h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            ปรับเปลี่ยนโหมดสแกน, สิทธิ์ความปลอดภัย และรหัสการเชื่อมโยงระบบปลายทาง (SAP & Telegram) โดยไม่ต้องแก้ไขไฟล์ .env
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

      {/* Grouping Cards */}
      <div className="space-y-6">
        
        {/* SECTION 1: CORE FUNCTION SYSTEM */}
        <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm p-6 space-y-6">
          <h2 className="font-bold text-base text-primary border-b border-outline-variant/40 pb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">tune</span>
            โหมดการทำงานและฟังก์ชันหลัก
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* QR CODE MODE */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-primary">รูปแบบสแกน QR Code</span>
                <span className="text-[10px] text-outline font-semibold">
                  อัปเดต: {formatDateTime(settings.QR_CODE_MODE?.updatedAt)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleUpdateSetting("QR_CODE_MODE", "STATIC")}
                  className={`py-3 px-4 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                    qrMode === "STATIC"
                      ? "border-secondary bg-secondary/5 text-secondary ring-1 ring-secondary"
                      : "border-outline-variant/60 text-outline hover:bg-surface-container-lowest"
                  }`}
                >
                  Static QR (9 หลัก)
                </button>
                <button
                  onClick={() => handleUpdateSetting("QR_CODE_MODE", "DYNAMIC")}
                  className={`py-3 px-4 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                    qrMode === "DYNAMIC"
                      ? "border-secondary bg-secondary/5 text-secondary ring-1 ring-secondary"
                      : "border-outline-variant/60 text-outline hover:bg-surface-container-lowest"
                  }`}
                >
                  Dynamic QR (AES)
                </button>
              </div>
            </div>

            {/* VERIFICATION MODE */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-primary">ระบบยืนยันตัวตน</span>
                <span className="text-[10px] text-outline font-semibold">
                  อัปเดต: {formatDateTime(settings.VERIFICATION_MODE?.updatedAt)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleUpdateSetting("VERIFICATION_MODE", "OTP")}
                  className={`py-3 px-4 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                    verificationMode === "OTP"
                      ? "border-secondary bg-secondary/5 text-secondary ring-1 ring-secondary"
                      : "border-outline-variant/60 text-outline hover:bg-surface-container-lowest"
                  }`}
                >
                  SMS OTP Verification
                </button>
                <button
                  onClick={() => handleUpdateSetting("VERIFICATION_MODE", "LINE")}
                  className={`py-3 px-4 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                    verificationMode === "LINE"
                      ? "border-secondary bg-secondary/5 text-secondary ring-1 ring-secondary"
                      : "border-outline-variant/60 text-outline hover:bg-surface-container-lowest"
                  }`}
                >
                  LINE Login (LIFF)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: TELEGRAM CONFIGURATIONS */}
        <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm p-6 space-y-6">
          <h2 className="font-bold text-base text-primary border-b border-outline-variant/40 pb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">send</span>
            ระบบแจ้งเตือนผ่าน Telegram (Notifications)
          </h2>

          <div className="space-y-4">
            {/* Telegram API Base URL */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">API Base URL</label>
                <p className="text-[10px] text-outline font-semibold mt-0.5">
                  อัปเดต: {formatDateTime(settings.TELEGRAM_API_BASE_URL?.updatedAt)}
                </p>
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  defaultValue={settings.TELEGRAM_API_BASE_URL?.value || ""}
                  onBlur={(e) => {
                    if (e.target.value !== (settings.TELEGRAM_API_BASE_URL?.value || "")) {
                      handleUpdateSetting("TELEGRAM_API_BASE_URL", e.target.value);
                    }
                  }}
                  placeholder="https://api.telegram.org"
                  className="h-11 px-4 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary flex-1"
                />
              </div>
            </div>

            {/* Telegram Bot Token */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">Bot Token ID</label>
                <p className="text-[10px] text-outline font-semibold mt-0.5">
                  อัปเดต: {formatDateTime(settings.TELEGRAM_BOT_TOKEN?.updatedAt)}
                </p>
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  defaultValue={settings.TELEGRAM_BOT_TOKEN?.value || ""}
                  onBlur={(e) => {
                    if (e.target.value !== (settings.TELEGRAM_BOT_TOKEN?.value || "")) {
                      handleUpdateSetting("TELEGRAM_BOT_TOKEN", e.target.value);
                    }
                  }}
                  placeholder="8231754616:AAHcITgZR6_..."
                  className="h-11 px-4 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary flex-1"
                />
              </div>
            </div>

            {/* Telegram Group ID */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">Group ID</label>
                <p className="text-[10px] text-outline font-semibold mt-0.5">
                  อัปเดต: {formatDateTime(settings.TELEGRAM_GROUP_ID?.updatedAt)}
                </p>
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  defaultValue={settings.TELEGRAM_GROUP_ID?.value || ""}
                  onBlur={(e) => {
                    if (e.target.value !== (settings.TELEGRAM_GROUP_ID?.value || "")) {
                      handleUpdateSetting("TELEGRAM_GROUP_ID", e.target.value);
                    }
                  }}
                  placeholder="-5394050672"
                  className="h-11 px-4 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: SAP BUSINESS ONE SERVICE LAYER */}
        <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm p-6 space-y-6">
          <h2 className="font-bold text-base text-primary border-b border-outline-variant/40 pb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">database</span>
            การเชื่อมต่อ SAP Business One Service Layer
          </h2>

          <div className="space-y-4">
            {/* SAP URL */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">Service Layer URL</label>
                <p className="text-[10px] text-outline font-semibold mt-0.5">
                  อัปเดต: {formatDateTime(settings.SAP_SERVICE_LAYER_URL?.updatedAt)}
                </p>
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  defaultValue={settings.SAP_SERVICE_LAYER_URL?.value || ""}
                  onBlur={(e) => {
                    if (e.target.value !== (settings.SAP_SERVICE_LAYER_URL?.value || "")) {
                      handleUpdateSetting("SAP_SERVICE_LAYER_URL", e.target.value);
                    }
                  }}
                  placeholder="http://192.168.1.100:50002/b1s/v2 หรือ mock"
                  className="h-11 px-4 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary flex-1"
                />
              </div>
            </div>

            {/* SAP Company DB */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">Company Database DB</label>
                <p className="text-[10px] text-outline font-semibold mt-0.5">
                  อัปเดต: {formatDateTime(settings.SAP_COMPANY_DB?.updatedAt)}
                </p>
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  defaultValue={settings.SAP_COMPANY_DB?.value || ""}
                  onBlur={(e) => {
                    if (e.target.value !== (settings.SAP_COMPANY_DB?.value || "")) {
                      handleUpdateSetting("SAP_COMPANY_DB", e.target.value);
                    }
                  }}
                  placeholder="SBO_WA_Test_20260531"
                  className="h-11 px-4 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary flex-1"
                />
              </div>
            </div>

            {/* SAP Username */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">UserName</label>
                <p className="text-[10px] text-outline font-semibold mt-0.5">
                  อัปเดต: {formatDateTime(settings.SAP_USERNAME?.updatedAt)}
                </p>
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  defaultValue={settings.SAP_USERNAME?.value || ""}
                  onBlur={(e) => {
                    if (e.target.value !== (settings.SAP_USERNAME?.value || "")) {
                      handleUpdateSetting("SAP_USERNAME", e.target.value);
                    }
                  }}
                  placeholder="Chaiwat.N"
                  className="h-11 px-4 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary flex-1"
                />
              </div>
            </div>

            {/* SAP Password */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">Password</label>
                <p className="text-[10px] text-outline font-semibold mt-0.5">
                  อัปเดต: {formatDateTime(settings.SAP_PASSWORD?.updatedAt)}
                </p>
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  type="password"
                  defaultValue={settings.SAP_PASSWORD?.value || ""}
                  onBlur={(e) => {
                    if (e.target.value !== (settings.SAP_PASSWORD?.value || "")) {
                      handleUpdateSetting("SAP_PASSWORD", e.target.value);
                    }
                  }}
                  placeholder="••••••••"
                  className="h-11 px-4 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary flex-1"
                />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
