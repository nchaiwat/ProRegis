"use client";

import React, { useEffect, useState, useRef } from "react";
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

  // DB Settings Metadata (contains values and updatedAt timestamps)
  const [dbSettings, setDbSettings] = useState<Record<string, SettingInfo>>({});

  // Local Form Input States
  const [telegramApiBaseUrl, setTelegramApiBaseUrl] = useState("");
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramGroupId, setTelegramGroupId] = useState("");
  const [sapServiceLayerUrl, setSapServiceLayerUrl] = useState("");
  const [sapCompanyDb, setSapCompanyDb] = useState("");
  const [sapUsername, setSapUsername] = useState("");
  const [sapPassword, setSapPassword] = useState("");

  // Password Visibility Toggle and Timer
  const [showPassword, setShowPassword] = useState(false);
  const [passwordTimer, setPasswordTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Handle password mask countdown timer
  useEffect(() => {
    if (showPassword) {
      setPasswordTimer(30);
      if (timerRef.current) clearInterval(timerRef.current);
      
      timerRef.current = setInterval(() => {
        setPasswordTimer((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setShowPassword(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setPasswordTimer(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [showPassword]);

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
        setDbSettings(data);
        
        // Populate local states
        setTelegramApiBaseUrl(data.TELEGRAM_API_BASE_URL?.value || "https://api.telegram.org");
        setTelegramBotToken(data.TELEGRAM_BOT_TOKEN?.value || "");
        setTelegramGroupId(data.TELEGRAM_GROUP_ID?.value || "");
        setSapServiceLayerUrl(data.SAP_SERVICE_LAYER_URL?.value || "");
        setSapCompanyDb(data.SAP_COMPANY_DB?.value || "");
        setSapUsername(data.SAP_USERNAME?.value || "");
        setSapPassword(data.SAP_PASSWORD?.value || "");
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

  const handleSaveAllSettings = async () => {
    setIsSaving(true);
    setSuccessMsg("");
    setError("");
    const token = sessionStorage.getItem("bo_token");

    const payload = [
      { key: "TELEGRAM_API_BASE_URL", value: telegramApiBaseUrl },
      { key: "TELEGRAM_BOT_TOKEN", value: telegramBotToken },
      { key: "TELEGRAM_GROUP_ID", value: telegramGroupId },
      { key: "SAP_SERVICE_LAYER_URL", value: sapServiceLayerUrl },
      { key: "SAP_COMPANY_DB", value: sapCompanyDb },
      { key: "SAP_USERNAME", value: sapUsername },
      { key: "SAP_PASSWORD", value: sapPassword },
    ];

    try {
      let allOk = true;
      for (const item of payload) {
        // Only update if value changed from DB version to minimize DB writes and audit logs
        const currentDbVal = dbSettings[item.key]?.value || "";
        if (item.value !== currentDbVal) {
          const res = await fetch(`${getApiBaseUrl()}/backoffice/settings`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ key: item.key, value: item.value }),
          });
          if (!res.ok) {
            allOk = false;
          }
        }
      }

      if (allOk) {
        setSuccessMsg("บันทึกการเปลี่ยนแปลงการตั้งค่าระบบเรียบร้อยแล้ว!");
        setTimeout(() => setSuccessMsg(""), 4000);
        await fetchSettings();
      } else {
        setError("ไม่สามารถบันทึกข้อมูลบางค่าได้ โปรดตรวจสอบระบบ");
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateMode = async (key: string, modeValue: string) => {
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
        body: JSON.stringify({ key, value: modeValue }),
      });

      if (res.ok) {
        setSuccessMsg("อัปเดตโหมดการใช้งานสำเร็จ!");
        setTimeout(() => setSuccessMsg(""), 3000);
        await fetchSettings();
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.message || "ไม่สามารถบันทึกข้อมูลโหมดการใช้งานได้");
      }
    } catch {
      setError("เกิดข้อผิดพลาดขณะส่งข้อมูลตั้งค่า");
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

  const qrMode = dbSettings.QR_CODE_MODE?.value || "STATIC";
  const verificationMode = dbSettings.VERIFICATION_MODE?.value || "OTP";

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in pb-12">
      {/* Header Panel with Save Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-primary tracking-tight">ตั้งค่าระบบ (System Settings)</h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            ปรับเปลี่ยนโหมดสแกน, สิทธิ์ความปลอดภัย และรหัสการเชื่อมโยงระบบปลายทาง (SAP & Telegram) โดยไม่ต้องแก้ไขไฟล์ .env
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSaveAllSettings}
            disabled={isSaving}
            className="h-12 px-6 bg-secondary text-white text-xs font-bold rounded-xl shadow hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined !text-[18px]">save</span>
                <span>บันทึกการตั้งค่าทั้งหมด</span>
              </>
            )}
          </button>
        </div>
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
                  อัปเดต: {formatDateTime(dbSettings.QR_CODE_MODE?.updatedAt)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleUpdateMode("QR_CODE_MODE", "STATIC")}
                  disabled={isSaving}
                  className={`py-3 px-4 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                    qrMode === "STATIC"
                      ? "border-secondary bg-secondary/5 text-secondary ring-1 ring-secondary"
                      : "border-outline-variant/60 text-outline hover:bg-surface-container-lowest"
                  }`}
                >
                  Static QR (9 หลัก)
                </button>
                <button
                  onClick={() => handleUpdateMode("QR_CODE_MODE", "DYNAMIC")}
                  disabled={isSaving}
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
                  อัปเดต: {formatDateTime(dbSettings.VERIFICATION_MODE?.updatedAt)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleUpdateMode("VERIFICATION_MODE", "OTP")}
                  disabled={isSaving}
                  className={`py-3 px-4 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                    verificationMode === "OTP"
                      ? "border-secondary bg-secondary/5 text-secondary ring-1 ring-secondary"
                      : "border-outline-variant/60 text-outline hover:bg-surface-container-lowest"
                  }`}
                >
                  SMS OTP Verification
                </button>
                <button
                  onClick={() => handleUpdateMode("VERIFICATION_MODE", "LINE")}
                  disabled={isSaving}
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
                  อัปเดต: {formatDateTime(dbSettings.TELEGRAM_API_BASE_URL?.updatedAt)}
                </p>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={telegramApiBaseUrl}
                  onChange={(e) => setTelegramApiBaseUrl(e.target.value)}
                  placeholder="https://api.telegram.org"
                  className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary"
                />
              </div>
            </div>

            {/* Telegram Bot Token */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">Bot Token ID</label>
                <p className="text-[10px] text-outline font-semibold mt-0.5">
                  อัปเดต: {formatDateTime(dbSettings.TELEGRAM_BOT_TOKEN?.updatedAt)}
                </p>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={telegramBotToken}
                  onChange={(e) => setTelegramBotToken(e.target.value)}
                  placeholder="8231754616:AAHcITgZR6_..."
                  className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary"
                />
              </div>
            </div>

            {/* Telegram Group ID */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">Group ID</label>
                <p className="text-[10px] text-outline font-semibold mt-0.5">
                  อัปเดต: {formatDateTime(dbSettings.TELEGRAM_GROUP_ID?.updatedAt)}
                </p>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={telegramGroupId}
                  onChange={(e) => setTelegramGroupId(e.target.value)}
                  placeholder="-5394050672"
                  className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary"
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
                  อัปเดต: {formatDateTime(dbSettings.SAP_SERVICE_LAYER_URL?.updatedAt)}
                </p>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={sapServiceLayerUrl}
                  onChange={(e) => setSapServiceLayerUrl(e.target.value)}
                  placeholder="http://192.168.1.100:50002/b1s/v2 หรือ mock"
                  className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary"
                />
              </div>
            </div>

            {/* SAP Company DB */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">Company Database DB</label>
                <p className="text-[10px] text-outline font-semibold mt-0.5">
                  อัปเดต: {formatDateTime(dbSettings.SAP_COMPANY_DB?.updatedAt)}
                </p>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={sapCompanyDb}
                  onChange={(e) => setSapCompanyDb(e.target.value)}
                  placeholder="SBO_WA_Test_20260531"
                  className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary"
                />
              </div>
            </div>

            {/* SAP Username */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">UserName</label>
                <p className="text-[10px] text-outline font-semibold mt-0.5">
                  อัปเดต: {formatDateTime(dbSettings.SAP_USERNAME?.updatedAt)}
                </p>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={sapUsername}
                  onChange={(e) => setSapUsername(e.target.value)}
                  placeholder="Chaiwat.N"
                  className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary"
                />
              </div>
            </div>

            {/* SAP Password */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">Password</label>
                <p className="text-[10px] text-outline font-semibold mt-0.5">
                  อัปเดต: {formatDateTime(dbSettings.SAP_PASSWORD?.updatedAt)}
                </p>
              </div>
              <div className="flex-1 relative flex items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  value={sapPassword}
                  onChange={(e) => setSapPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-4 pr-12 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-outline hover:text-primary transition-all flex items-center justify-center p-1.5 rounded-lg hover:bg-surface-variant cursor-pointer"
                >
                  <span className="material-symbols-outlined !text-[20px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
                {showPassword && (
                  <span className="absolute right-12 text-[10px] font-bold text-secondary-container px-2 py-0.5 rounded bg-secondary-container/20 border border-secondary-container/10 mr-1 animate-pulse">
                    {passwordTimer}s
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Footer Save Actions Button */}
      <div className="flex justify-end gap-2 pt-4">
        <button
          onClick={handleSaveAllSettings}
          disabled={isSaving}
          className="h-12 px-8 bg-secondary text-white text-xs font-bold rounded-xl shadow-md hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>กำลังบันทึกการตั้งค่าระบบ...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined !text-[18px]">save</span>
              <span>บันทึกการตั้งค่าทั้งหมด</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
