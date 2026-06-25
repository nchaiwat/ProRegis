"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";

interface RegistrationHistoryItem {
  id: string;
  docNum: string;
  seqNum: string;
  itemCode: string;
  itemName: string;
  registeredAt: string;
  status: string;
}

const THFlag = () => (
  <svg viewBox="0 0 9 6" width="20" height="13" className="rounded-[2px] shadow-[0_0_1px_rgba(0,0,0,0.35)] object-cover">
    <rect width="9" height="6" fill="#a51931"/>
    <rect y="1" width="9" height="4" fill="#f4f5f8"/>
    <rect y="2" width="9" height="2" fill="#2d2a4a"/>
  </svg>
);

const USFlag = () => (
  <svg viewBox="0 0 76 40" width="20" height="13" className="rounded-[2px] shadow-[0_0_1px_rgba(0,0,0,0.35)] object-cover">
    <rect width="76" height="40" fill="#b22234"/>
    <path d="M0,3.08h76v3.08H0zm0,6.15h76v3.08H0zm0,6.15h76v3.08H0zm0,6.15h76v3.08H0zm0,6.15h76v3.08H0zm0,6.15h76v3.08H0z" fill="#fff"/>
    <rect width="30" height="21.54" fill="#3c3b6e"/>
    <g fill="#fff">
      <circle cx="5" cy="5" r="1"/>
      <circle cx="15" cy="5" r="1"/>
      <circle cx="25" cy="5" r="1"/>
      <circle cx="10" cy="10" r="1"/>
      <circle cx="20" cy="10" r="1"/>
      <circle cx="5" cy="15" r="1"/>
      <circle cx="15" cy="15" r="1"/>
      <circle cx="25" cy="15" r="1"/>
    </g>
  </svg>
);

export default function MyWarrantyPage() {
  const router = useRouter();
  const [lang, setLang] = useState<"th" | "en">("th");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [registrations, setRegistrations] = useState<RegistrationHistoryItem[]>([]);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError("");
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 9 || cleanPhone.length > 10) {
      setPhoneError(lang === "th" ? "โปรดระบุเบอร์โทรศัพท์ที่ถูกต้อง (9-10 หลัก)" : "Please enter a valid phone number (9-10 digits)");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Check if phone number exists in registrations DB first
      const checkRes = await fetch(`${getApiBaseUrl()}/registration/check-phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone }),
      });

      if (!checkRes.ok) {
        throw new Error(lang === "th" ? "เกิดข้อผิดพลาดในการตรวจสอบเบอร์โทรศัพท์" : "Failed to check phone number");
      }

      const checkData = await checkRes.json();
      if (!checkData.exists) {
        setPhoneError(lang === "th" ? "ไม่พบประวัติการลงทะเบียนสำหรับเบอร์โทรศัพท์นี้ในระบบ" : "No warranty registration history found for this phone number.");
        return;
      }

      // 2. If exists, proceed to send OTP
      const res = await fetch(`${getApiBaseUrl()}/otp/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to request OTP");
      }

      setStep(2);
      setResendCooldown(60);
    } catch (err: any) {
      setPhoneError(err.message || (lang === "th" ? "เกิดข้อผิดพลาดในการส่ง OTP" : "Failed to send OTP"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");
    if (!otpCode || otpCode.length !== 6) {
      setOtpError(lang === "th" ? "โปรดระบุรหัส OTP 6 หลัก" : "Please enter a 6-digit OTP code");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/registration/by-phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.replace(/\D/g, ""), otpCode }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Invalid OTP or failed to fetch registrations");
      }

      const data = await res.json();
      setRegistrations(data);
      setStep(3);
    } catch (err: any) {
      setOtpError(err.message || (lang === "th" ? "รหัส OTP ไม่ถูกต้อง โปรดทดสอบด้วยเลข '123456'" : "Invalid OTP code. Please test with '123456'"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setOtpError("");
    setIsLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/otp/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.replace(/\D/g, "") }),
      });
      if (!res.ok) throw new Error("Failed to resend OTP");
      setResendCooldown(60);
    } catch (err: any) {
      setOtpError(lang === "th" ? "เกิดข้อผิดพลาดในการส่ง OTP ใหม่" : "Failed to resend OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(lang === "th" ? "th-TH" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + (lang === "th" ? " น." : "");
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface-bright">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-6 h-16 bg-surface-bright border-b border-outline-variant shadow-sm">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => router.push("/")}>
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shadow-sm">
            <img src="/icon-192.png" alt="ProRegis Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="font-bold text-xl text-primary tracking-tight">ProRegis</h1>
        </div>
        {/* Language Flag Button */}
        <button
          onClick={() => setLang(lang === "th" ? "en" : "th")}
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low transition-colors active:scale-95 duration-100 cursor-pointer shadow-sm"
          title={lang === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
        >
          {lang === "th" ? <USFlag /> : <THFlag />}
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-grow pt-24 pb-12 flex flex-col items-center px-4 max-w-xl mx-auto w-full">
        {/* Step 1: Request OTP by Phone */}
        {step === 1 && (
          <div className="w-full bg-white border border-outline-variant rounded-2xl p-6 md:p-8 shadow-md">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-secondary !text-3xl">verified_user</span>
              </div>
              <h2 className="font-bold text-2xl text-primary mb-2">
                {lang === "th" ? "ตรวจสอบสิทธิ์รับประกันสินค้า" : "Check Warranty Rights"}
              </h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {lang === "th"
                  ? "โปรดระบุเบอร์โทรศัพท์ที่คุณใช้ลงทะเบียนเพื่อส่งรหัสยืนยันตัวตน OTP"
                  : "Please enter your registered phone number to verify your identity via OTP."}
              </p>
            </div>

            <form onSubmit={handleRequestOtp} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-primary uppercase tracking-wider block">
                  {lang === "th" ? "เบอร์โทรศัพท์มือถือ" : "Mobile Phone Number"}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-xl">
                    phone_android
                  </span>
                  <input
                    type="tel"
                    placeholder={lang === "th" ? "เช่น 0812345678" : "e.g. 0812345678"}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-12 pl-11 pr-4 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm font-semibold focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                  />
                </div>
                {phoneError && (
                  <p className="text-xs text-error font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">error</span>
                    {phoneError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-secondary text-white font-bold rounded-xl shadow-md hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-base cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>{lang === "th" ? "ขอรหัส OTP" : "Request OTP"}</span>
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Input OTP */}
        {step === 2 && (
          <div className="w-full bg-white border border-outline-variant rounded-2xl p-6 md:p-8 shadow-md">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-secondary !text-3xl">sms_failed</span>
              </div>
              <h2 className="font-bold text-2xl text-primary mb-2">
                {lang === "th" ? "ยืนยันรหัส OTP" : "Verify OTP"}
              </h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {lang === "th"
                  ? `ระบบได้ส่งรหัส OTP ไปยังเบอร์ ${phone} แล้ว`
                  : `OTP code has been sent to ${phone}.`}
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-primary uppercase tracking-wider block">
                  {lang === "th" ? "รหัสยืนยัน 6 หลัก" : "6-Digit Verification Code"}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-xl">
                    lock
                  </span>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full h-12 pl-11 pr-4 bg-surface-container-lowest border border-outline-variant rounded-xl text-center text-lg tracking-[0.5em] font-bold focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                  />
                </div>
                {otpError && (
                  <p className="text-xs text-error font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">error</span>
                    {otpError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-secondary text-white font-bold rounded-xl shadow-md hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-base cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>{lang === "th" ? "ตรวจสอบสิทธิ์" : "Verify Rights"}</span>
                    <span className="material-symbols-outlined">how_to_reg</span>
                  </>
                )}
              </button>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-bold text-outline hover:text-primary transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  {lang === "th" ? "ย้อนกลับ" : "Back"}
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isLoading}
                  className={`text-xs font-bold transition-colors ${
                    resendCooldown > 0
                      ? "text-outline-variant cursor-not-allowed"
                      : "text-secondary hover:underline"
                  }`}
                >
                  {resendCooldown > 0
                    ? lang === "th"
                      ? `ส่งใหม่ได้ใน ${resendCooldown} วินาที`
                      : `Resend in ${resendCooldown}s`
                    : lang === "th"
                    ? "ส่งรหัสอีกครั้ง"
                    : "Resend Code"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Registration History */}
        {step === 3 && (
          <div className="w-full space-y-6">
            <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-md text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-emerald-600 !text-3xl">verified</span>
              </div>
              <h2 className="font-bold text-2xl text-primary mb-2">
                {lang === "th" ? "สิทธิ์การรับประกันของคุณ" : "Your Warranty Coverage"}
              </h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {lang === "th"
                  ? `พบประวัติการลงทะเบียนทั้งหมด ${registrations.length} รายการ`
                  : `Found ${registrations.length} registered products.`}
              </p>
            </div>

            {registrations.length === 0 ? (
              <div className="bg-white border border-outline-variant rounded-2xl p-8 text-center text-on-surface-variant shadow-sm space-y-4">
                <span className="material-symbols-outlined text-[48px] text-outline">inbox</span>
                <p className="text-sm font-semibold">
                  {lang === "th"
                    ? "ยังไม่มีประวัติการลงทะเบียนรับประกันด้วยเบอร์โทรศัพท์นี้"
                    : "No warranty registration history found for this phone number."}
                </p>
                <button
                  onClick={() => router.push("/")}
                  className="px-6 py-2.5 bg-secondary text-white font-bold rounded-xl shadow hover:opacity-95 transition-all text-xs cursor-pointer"
                >
                  {lang === "th" ? "ไปลงทะเบียนสินค้าใหม่" : "Register New Product"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {registrations.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-outline-variant rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-md transition-all space-y-4 relative overflow-hidden"
                  >
                    {/* Decorative accent side bar */}
                    <div className="absolute left-0 top-0 h-full w-1.5 bg-secondary" />

                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 pl-2">
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-secondary bg-secondary-container/20 px-2.5 py-1 rounded-full">
                          {item.id}
                        </span>
                        <h3 className="font-bold text-base text-primary pt-1">{item.itemName}</h3>
                        <p className="text-xs text-on-surface-variant flex items-center gap-1">
                          <span className="font-semibold text-primary">{lang === "th" ? "รหัสสินค้า:" : "Item Code:"}</span>
                          <code>{item.itemCode}</code>
                        </p>
                        <p className="text-xs text-on-surface-variant flex items-center gap-1">
                          <span className="font-semibold text-primary">{lang === "th" ? "ใบสั่งผลิต (PD):" : "Prod Order:"}</span>
                          <code>{item.docNum}</code>
                          <span className="text-outline-variant">|</span>
                          <span className="font-semibold text-primary">{lang === "th" ? "ลำดับที่:" : "Seq No:"}</span>
                          <code>{item.seqNum}</code>
                        </p>
                      </div>

                      <div className="flex flex-col md:items-end gap-2 shrink-0">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100 self-start md:self-auto">
                          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            verified_user
                          </span>
                          {lang === "th" ? "รับประกันแล้ว" : "Warranty Active"}
                        </span>
                        <span className="text-[11px] font-semibold text-outline">
                          {lang === "th" ? "รับประกันตลอดอายุการใช้งาน" : "Lifetime Warranty Coverage"}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3.5 border-t border-outline-variant/60 flex flex-col md:flex-row justify-between text-xs text-on-surface-variant font-medium pl-2 gap-2">
                      <span>
                        {lang === "th" ? "ลงทะเบียนเมื่อ:" : "Registered on:"}{" "}
                        <span className="font-bold text-primary">{formatDate(item.registeredAt)}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-center pt-4">
              <button
                onClick={() => router.push("/")}
                className="w-full max-w-sm h-14 border-2 border-outline-variant text-secondary font-bold rounded-xl hover:bg-surface-container-low transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-base cursor-pointer"
              >
                <span className="material-symbols-outlined">arrow_back</span>
                {lang === "th" ? "กลับไปยังหน้าแรก" : "Back to Home Page"}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-on-surface-variant border-t border-outline-variant bg-surface-container-low">
        <p>© 2026 Window Asia Public Company Limited. All rights reserved.</p>
      </footer>
    </div>
  );
}
