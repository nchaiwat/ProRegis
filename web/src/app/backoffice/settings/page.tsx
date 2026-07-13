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

  // Danger Zone States
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  // DB Settings Metadata (contains values and updatedAt timestamps)
  const [dbSettings, setDbSettings] = useState<Record<string, SettingInfo>>({});

  // Local Form Input States
  const [qrMode, setQrMode] = useState("STATIC");
  const [verificationMode, setVerificationMode] = useState("OTP");
  const [telegramApiBaseUrl, setTelegramApiBaseUrl] = useState("");
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramGroupId, setTelegramGroupId] = useState("");
  const [sapServiceLayerUrl, setSapServiceLayerUrl] = useState("");
  const [sapCompanyDb, setSapCompanyDb] = useState("");
  const [sapUsername, setSapUsername] = useState("");
  const [sapPassword, setSapPassword] = useState("");

  // SMS Gateway settings
  const [smsProviderName, setSmsProviderName] = useState("SMSMKT");
  const [smsApiKey, setSmsApiKey] = useState("");
  const [smsApiSecret, setSmsApiSecret] = useState("");
  const [smsSendUrl, setSmsSendUrl] = useState("");
  const [smsValidateUrl, setSmsValidateUrl] = useState("");
  const [smsProjectKey, setSmsProjectKey] = useState("");
  const [smsOtpMode, setSmsOtpMode] = useState("TEST");

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
        setQrMode(data.QR_CODE_MODE?.value || "STATIC");
        setVerificationMode(data.VERIFICATION_MODE?.value || "OTP");
        setTelegramApiBaseUrl(data.TELEGRAM_API_BASE_URL?.value || "https://api.telegram.org");
        setTelegramBotToken(data.TELEGRAM_BOT_TOKEN?.value || "");
        setTelegramGroupId(data.TELEGRAM_GROUP_ID?.value || "");
        setSapServiceLayerUrl(data.SAP_SERVICE_LAYER_URL?.value || "");
        setSapCompanyDb(data.SAP_COMPANY_DB?.value || "");
        setSapUsername(data.SAP_USERNAME?.value || "");
        setSapPassword(data.SAP_PASSWORD?.value || "");
        
        // Populate SMS Gateway settings
        setSmsProviderName(data.SMS_PROVIDER_NAME?.value || "SMSMKT");
        setSmsApiKey(data.SMS_API_KEY?.value || "");
        setSmsApiSecret(data.SMS_API_SECRET?.value || "");
        setSmsSendUrl(data.SMS_SEND_URL?.value || "https://portal-otp.smsmkt.com/api/otp-send");
        setSmsValidateUrl(data.SMS_VALIDATE_URL?.value || "https://portal-otp.smsmkt.com/api/otp-validate");
        setSmsProjectKey(data.SMS_PROJECT_KEY?.value || "");
        setSmsOtpMode(data.SMS_OTP_MODE?.value || "TEST");
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
      { key: "QR_CODE_MODE", value: qrMode },
      { key: "VERIFICATION_MODE", value: verificationMode },
      { key: "TELEGRAM_API_BASE_URL", value: telegramApiBaseUrl },
      { key: "TELEGRAM_BOT_TOKEN", value: telegramBotToken },
      { key: "TELEGRAM_GROUP_ID", value: telegramGroupId },
      { key: "SAP_SERVICE_LAYER_URL", value: sapServiceLayerUrl },
      { key: "SAP_COMPANY_DB", value: sapCompanyDb },
      { key: "SAP_USERNAME", value: sapUsername },
      { key: "SAP_PASSWORD", value: sapPassword },
      { key: "SMS_PROVIDER_NAME", value: smsProviderName },
      { key: "SMS_API_KEY", value: smsApiKey },
      { key: "SMS_API_SECRET", value: smsApiSecret },
      { key: "SMS_SEND_URL", value: smsSendUrl },
      { key: "SMS_VALIDATE_URL", value: smsValidateUrl },
      { key: "SMS_PROJECT_KEY", value: smsProjectKey },
      { key: "SMS_OTP_MODE", value: smsOtpMode },
    ];

    try {
      let allOk = true;
      for (const item of payload) {
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
        window.dispatchEvent(new Event("settings-updated"));
      } else {
        setError("ไม่สามารถบันทึกข้อมูลบางค่าได้ โปรดตรวจสอบระบบ");
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAllData = async () => {
    if (confirmText !== "RESET") {
      setError("กรุณาพิมพ์คำว่า RESET เพื่อยืนยันการลบข้อมูล");
      return;
    }

    setIsResetting(true);
    setError("");
    setSuccessMsg("");
    setShowConfirmReset(false);
    const token = sessionStorage.getItem("bo_token");

    try {
      const res = await fetch(`${getApiBaseUrl()}/backoffice/clear-test-data`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setSuccessMsg(data.message || "ล้างข้อมูลระบบเรียบร้อยแล้ว!");
        setConfirmText("");
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.message || "เกิดข้อผิดพลาดในการล้างข้อมูล");
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsResetting(false);
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
                  type="button"
                  onClick={() => setQrMode("STATIC")}
                  className={`py-3 px-4 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                    qrMode === "STATIC"
                      ? "border-secondary bg-secondary/5 text-secondary ring-1 ring-secondary"
                      : "border-outline-variant/60 text-outline hover:bg-surface-container-lowest"
                  }`}
                >
                  Static QR (9 หลัก)
                </button>
                <button
                  type="button"
                  onClick={() => setQrMode("DYNAMIC")}
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
                  type="button"
                  onClick={() => setVerificationMode("OTP")}
                  className={`py-3 px-4 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                    verificationMode === "OTP"
                      ? "border-secondary bg-secondary/5 text-secondary ring-1 ring-secondary"
                      : "border-outline-variant/60 text-outline hover:bg-surface-container-lowest"
                  }`}
                >
                  SMS OTP Verification
                </button>
                <button
                  type="button"
                  onClick={() => setVerificationMode("LINE")}
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

        {/* SECTION: SMS OTP GATEWAY CONFIGURATIONS */}
        <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm p-6 space-y-6">
          <h2 className="font-bold text-base text-primary border-b border-outline-variant/40 pb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">sms</span>
            ระบบส่งและยืนยัน SMS OTP (SMS Gateway - SMSMKT)
          </h2>

          <div className="space-y-4">
            {/* SMS OTP MODE (REAL / TEST) */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">การทำงานของ OTP (OTP Mode)</label>
                <p className="text-[10px] text-outline font-semibold mt-0.5">
                  อัปเดต: {formatDateTime(dbSettings.SMS_OTP_MODE?.updatedAt)}
                </p>
              </div>
              <div className="flex-1">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSmsOtpMode("REAL")}
                    className={`py-3 px-4 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                      smsOtpMode === "REAL"
                        ? "border-secondary bg-secondary/5 text-secondary ring-1 ring-secondary"
                        : "border-outline-variant/60 text-outline hover:bg-surface-container-lowest"
                    }`}
                  >
                    เปิดใช้งาน (ส่ง SMS OTP จริง)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSmsOtpMode("TEST")}
                    className={`py-3 px-4 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                      smsOtpMode === "TEST"
                        ? "border-secondary bg-secondary/5 text-secondary ring-1 ring-secondary"
                        : "border-outline-variant/60 text-outline hover:bg-surface-container-lowest"
                    }`}
                  >
                    ปิดใช้งาน (ทดสอบ / บังคับใช้รหัส 123456)
                  </button>
                </div>
              </div>
            </div>
            {/* SMS Provider Name */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">ผู้ให้บริการ SMS (Provider)</label>
                <p className="text-[10px] text-outline font-semibold mt-0.5">
                  อัปเดต: {formatDateTime(dbSettings.SMS_PROVIDER_NAME?.updatedAt)}
                </p>
              </div>
              <div className="flex-1">
                <select
                  value={smsProviderName}
                  onChange={(e) => setSmsProviderName(e.target.value)}
                  className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl outline-none text-xs font-semibold bg-surface-container-low focus:border-secondary"
                >
                  <option value="SMSMKT">SMSMKT (Real Gateway)</option>
                  <option value="MOCK">MOCK System (สำหรับทดสอบ / รหัสคงที่ 123456)</option>
                </select>
              </div>
            </div>

            {/* SMS API Key */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">API Key</label>
                <p className="text-[10px] text-outline font-semibold mt-0.5">
                  อัปเดต: {formatDateTime(dbSettings.SMS_API_KEY?.updatedAt)}
                </p>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={smsApiKey}
                  onChange={(e) => setSmsApiKey(e.target.value)}
                  placeholder="เช่น a7aa2b729a72af46265ea2a15b15e708"
                  className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary"
                />
              </div>
            </div>

            {/* SMS API Secret */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">API Secret (Secret Key)</label>
                <p className="text-[10px] text-outline font-semibold mt-0.5">
                  อัปเดต: {formatDateTime(dbSettings.SMS_API_SECRET?.updatedAt)}
                </p>
              </div>
              <div className="flex-1 relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={smsApiSecret}
                  onChange={(e) => setSmsApiSecret(e.target.value)}
                  placeholder="เช่น 4bu6uRdNlUKq10ZI"
                  className="w-full h-11 pl-4 pr-12 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-primary material-symbols-outlined !text-[18px] cursor-pointer"
                >
                  {showPassword ? "visibility_off" : "visibility"}
                </button>
              </div>
            </div>

            {/* SMS Project Key */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">Project Key</label>
                <p className="text-[10px] text-outline font-semibold mt-0.5">
                  อัปเดต: {formatDateTime(dbSettings.SMS_PROJECT_KEY?.updatedAt)}
                </p>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={smsProjectKey}
                  onChange={(e) => setSmsProjectKey(e.target.value)}
                  placeholder="เช่น mZP-------"
                  className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary"
                />
              </div>
            </div>

            {/* SMS API Send URL */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">API Send URL (ขอ OTP)</label>
                <p className="text-[10px] text-outline font-semibold mt-0.5">
                  อัปเดต: {formatDateTime(dbSettings.SMS_SEND_URL?.updatedAt)}
                </p>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={smsSendUrl}
                  onChange={(e) => setSmsSendUrl(e.target.value)}
                  placeholder="https://portal-otp.smsmkt.com/api/otp-send"
                  className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary"
                />
              </div>
            </div>

            {/* SMS API Validate URL */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">API Validate URL (ยืนยัน OTP)</label>
                <p className="text-[10px] text-outline font-semibold mt-0.5">
                  อัปเดต: {formatDateTime(dbSettings.SMS_VALIDATE_URL?.updatedAt)}
                </p>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={smsValidateUrl}
                  onChange={(e) => setSmsValidateUrl(e.target.value)}
                  placeholder="https://portal-otp.smsmkt.com/api/otp-validate"
                  className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary"
                />
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
                  className="absolute right-3 text-outline hover:text-primary transition-all flex items-center justify-center p-1.5 rounded-lg hover:bg-surface-variant cursor-pointer animate-fade-in"
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

        {/* SECTION 4: DANGER ZONE / CLEAR TEST DATA */}
        <div className="bg-error/5 rounded-2xl border border-error/20 shadow-sm p-6 space-y-4 animate-fade-in">
          <div className="flex items-center gap-3 border-b border-error/10 pb-3">
            <span className="material-symbols-outlined text-error !text-[24px]">gpp_maybe</span>
            <h2 className="font-bold text-base text-error">
              โซนอันตราย / ล้างข้อมูลระบบ (Danger Zone)
            </h2>
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-bold text-primary">ล้างข้อมูลการทดสอบทั้งหมด (Clear All Test Data)</p>
              <p className="text-[11px] text-outline font-semibold leading-relaxed">
                ลบข้อมูลลูกค้าลงทะเบียนรับประกัน, ประวัติการสร้าง QR Code, แคชออร์เดอร์ SAP และบันทึกกิจกรรมทั้งหมดออกจากระบบแบบถาวร เพื่อเตรียมทดสอบใหม่
                <br />
                <span className="text-error font-bold">ข้อมูลบัญชีผู้ดูแลระบบ และการตั้งค่าระบบ จะไม่ถูกลบ</span>
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={() => {
                  setConfirmText("");
                  setShowConfirmReset(true);
                }}
                disabled={isResetting}
                className="h-11 px-5 bg-error text-white text-xs font-bold rounded-xl shadow-md hover:bg-error/90 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined !text-[18px]">delete_forever</span>
                <span>ล้างข้อมูลการทดสอบทั้งหมด</span>
              </button>
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

      {/* Confirmation Reset Modal */}
      {showConfirmReset && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-2xl p-6 max-w-md w-full space-y-4 animate-scale-in">
            <div className="flex items-center gap-3 text-error border-b border-outline-variant/30 pb-3">
              <span className="material-symbols-outlined !text-[28px]">warning</span>
              <h3 className="text-base font-black tracking-tight">ยืนยันการล้างข้อมูลทั้งหมด</h3>
            </div>
            
            <p className="text-xs font-semibold text-outline leading-relaxed">
              การดำเนินการนี้จะทำการลบข้อมูลต่อไปนี้ออกจากฐานข้อมูลแบบถาวร:
            </p>
            <ul className="text-xs font-bold text-outline-variant list-disc list-inside space-y-1 bg-surface-container-low p-3 rounded-xl border border-outline-variant/20">
              <li className="text-error">ข้อมูลการลงทะเบียนรับประกันทั้งหมด</li>
              <li className="text-error">ประวัติการสร้าง QR Code ทั้งหมด</li>
              <li className="text-error">ประวัติกิจกรรมทั้งหมด (Audit Logs)</li>
              <li className="text-error">ข้อมูลแคชสินค้าและออร์เดอร์ SAP</li>
            </ul>

            <div className="space-y-2 pt-2">
              <label className="text-[11px] font-bold text-primary block">
                พิมพ์คำว่า <span className="text-error font-black underline">RESET</span> ด้านล่างเพื่อยืนยันการลบ:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="พิมพ์ RESET ตรงนี้"
                className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl outline-none text-center font-black tracking-widest text-xs uppercase focus:border-error focus:ring-1 focus:ring-error bg-surface-container-lowest transition-all"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmReset(false);
                  setConfirmText("");
                }}
                className="h-11 px-4 border border-outline-variant/60 text-outline text-xs font-bold rounded-xl hover:bg-surface-container-low transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleClearAllData}
                disabled={confirmText !== "RESET" || isResetting}
                className="h-11 px-6 bg-error text-white text-xs font-bold rounded-xl shadow hover:bg-error/95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResetting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>กำลังลบข้อมูล...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined !text-[18px]">delete_forever</span>
                    <span>ลบข้อมูลถาวร</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
