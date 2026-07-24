"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";

interface RegistrationHistoryItem {
  id: string;
  docNum: string | null;
  seqNum: string | null;
  itemCode: string;
  itemName: string;
  registeredAt: string;
  status: string;
  installationPosition?: string | null;
  imageUrl?: string;
}

interface ContactData {
  exists: boolean;
  phone?: string | null;
  email?: string | null;
  maskedPhone?: string | null;
  maskedEmail?: string | null;
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

const localT = {
  th: {
    checkTitle: "ตรวจสอบสิทธิ์รับประกันสินค้า",
    checkSubtitle: "โปรดระบุเบอร์โทรศัพท์มือถือ หรือ อีเมลที่คุณใช้ในการลงทะเบียนเพื่อรับรหัสยืนยันตัวตน OTP",
    contactLabel: "เบอร์โทรศัพท์มือถือ หรือ อีเมล",
    contactPlaceholder: "เช่น 0812345678 หรือ customer@example.com",
    invalidContact: "โปรดระบุเบอร์โทรศัพท์ที่ถูกต้อง (9-10 หลัก) หรืออีเมลที่ถูกต้อง",
    contactNotFound: "ไม่พบประวัติการลงทะเบียนสำหรับเบอร์โทรศัพท์หรืออีเมลนี้ในระบบ",
    checkingContact: "กำลังตรวจสอบข้อมูล...",
    
    chooseTitle: "เลือกช่องทางรับรหัส OTP",
    chooseSubtitle: "ระบบพบประวัติการลงทะเบียนของคุณ โปรดเลือกช่องทางจัดส่งรหัสยืนยันตัวตน",
    smsOption: "ส่ง SMS ไปที่เบอร์โทรศัพท์",
    emailOption: "ส่งอีเมลไปที่",
    sendOtpBtn: "ขอรหัส OTP",
    
    otpTitle: "ยืนยันรหัส OTP",
    otpSubtitle: "ระบบได้ส่งรหัส OTP (6 หลัก) ไปยัง {channel} แล้ว",
    otpPlaceholder: "กรอกรหัส 6 หลัก",
    verifyBtn: "ตรวจสอบสิทธิ์",
    backBtn: "ย้อนกลับ",
    resendCode: "ส่งรหัสอีกครั้ง",
    resendCooldown: "ส่งใหม่ได้ใน {seconds} วินาที",
    otpErrorFallback: "รหัส OTP ไม่ถูกต้อง โปรดทดสอบด้วยเลข '123456'",
    
    historyTitle: "สิทธิ์การรับประกันของคุณ",
    historySubtitle: "พบประวัติการลงทะเบียนทั้งหมด {count} รายการ",
    noHistory: "ยังไม่มีประวัติการลงทะเบียนรับประกันด้วยข้อมูลการติดต่อนี้",
    goHome: "กลับไปยังหน้าแรก",
    itemCode: "รหัสสินค้า",
    prodOrder: "จำนวนที่ผลิต",
    seqNo: "ลำดับที่",
    registeredAt: "ลงทะเบียนเมื่อ",
    activeStatus: "รับประกันแล้ว",
    lifetimeWarranty: "รับประกันตลอดอายุการใช้งาน",
    sessionLoading: "กำลังตรวจสอบสิทธิ์รับประกันสินค้าของคุณ...",
    smsChannelName: "เบอร์โทรศัพท์มือถือ",
    emailChannelName: "อีเมล",
    powerBy: "ให้บริการโดย Window Asia Public Company Limited"
  },
  en: {
    checkTitle: "Check Warranty Rights",
    checkSubtitle: "Please enter your registered mobile phone number or email address to receive OTP.",
    contactLabel: "Mobile Phone Number or Email",
    contactPlaceholder: "e.g. 0812345678 or customer@example.com",
    invalidContact: "Please enter a valid phone number (9-10 digits) or email address",
    contactNotFound: "No warranty registration history found for this phone number or email.",
    checkingContact: "Checking history...",
    
    chooseTitle: "Select OTP Delivery Channel",
    chooseSubtitle: "Warranty history found. Please choose where to send the verification code.",
    smsOption: "Send SMS to phone number",
    emailOption: "Send email to",
    sendOtpBtn: "Request OTP",
    
    otpTitle: "Verify OTP",
    otpSubtitle: "A 6-digit OTP code has been sent to your {channel}.",
    otpPlaceholder: "Enter 6-digit code",
    verifyBtn: "Verify Rights",
    backBtn: "Back",
    resendCode: "Resend Code",
    resendCooldown: "Resend in {seconds}s",
    otpErrorFallback: "Invalid OTP code. Please test with '123456'",
    
    historyTitle: "Your Warranty Coverage",
    historySubtitle: "Found {count} registered products.",
    noHistory: "No warranty registration history found for this contact details.",
    goHome: "Back to Home Page",
    itemCode: "Product Code",
    prodOrder: "Production Quantity",
    seqNo: "Seq No",
    registeredAt: "Registered on",
    activeStatus: "Warranty Active",
    lifetimeWarranty: "Lifetime Warranty Coverage",
    sessionLoading: "Checking your product warranty rights...",
    smsChannelName: "Mobile Phone",
    emailChannelName: "Email",
    powerBy: "Powered by Window Asia Public Company Limited"
  }
};

export default function MyWarrantyPage() {
  const router = useRouter();
  const [lang, setLang] = useState<"th" | "en">("th");
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: Input, 2: Choose Channel, 3: Verify OTP, 4: History/Loading
  const [contact, setContact] = useState("");
  const [contactData, setContactData] = useState<ContactData>({ exists: false });
  const [selectedChannel, setSelectedChannel] = useState<"sms" | "email">("sms");
  const [targetContact, setTargetContact] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [registrations, setRegistrations] = useState<RegistrationHistoryItem[]>([]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpExpiryTimer, setOtpExpiryTimer] = useState(0);

  useEffect(() => {
    // Check for active session when mounting
    const sessionStr = localStorage.getItem("proregis_customer_session");
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        // Active session for 1 hour (3600000 ms)
        if (Date.now() - session.timestamp < 3600000) {
          const contactVal = session.phone || session.email;
          if (contactVal) {
            setStep(4);
            setIsLoading(true);
            fetchRegistrations(contactVal, "SESSION_BYPASS");
          }
        } else {
          localStorage.removeItem("proregis_customer_session");
        }
      } catch (e) {
        console.warn("Failed to retrieve local session data:", e);
      }
    }
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpExpiryTimer > 0) {
      timer = setTimeout(() => setOtpExpiryTimer(otpExpiryTimer - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpExpiryTimer]);

  const fetchRegistrations = async (contactVal: string, otpVal: string) => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`${getApiBaseUrl()}/registration/by-contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact: contactVal, otpCode: otpVal }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to fetch registrations");
      }

      const data = await res.json();
      setRegistrations(data);
      setStep(4); // History view
      
      // Save/refresh session details to localStorage
      localStorage.setItem("proregis_customer_session", JSON.stringify({
        firstName: "",
        lastName: "",
        address: "",
        province: "",
        postalCode: "",
        phone: contactVal.includes("@") ? "" : contactVal,
        email: contactVal.includes("@") ? contactVal : "",
        timestamp: Date.now()
      }));
    } catch (err: any) {
      setError(err.message || (lang === "th" ? "เกิดข้อผิดพลาดในการดึงข้อมูลสิทธิ์การรับประกัน" : "Failed to load warranty rights"));
      setStep(1); // Return to first step on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    const cleanInput = contact.trim();
    if (!cleanInput) {
      setError(localT[lang].invalidContact);
      return;
    }

    const isEmail = cleanInput.includes("@");
    if (isEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanInput)) {
        setError(localT[lang].invalidContact);
        return;
      }
    } else {
      const cleanPhone = cleanInput.replace(/\D/g, "");
      if (!cleanPhone || cleanPhone.length < 9 || cleanPhone.length > 10) {
        setError(localT[lang].invalidContact);
        return;
      }
    }

    setIsLoading(true);
    try {
      const checkRes = await fetch(`${getApiBaseUrl()}/registration/check-contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact: cleanInput }),
      });

      if (!checkRes.ok) {
        throw new Error(lang === "th" ? "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" : "Failed to check contact info");
      }

      const checkData: ContactData = await checkRes.json();
      if (!checkData.exists) {
        setError(localT[lang].contactNotFound);
        return;
      }

      setContactData(checkData);
      
      // Auto select channel based on what's available
      if (checkData.maskedPhone && !checkData.maskedEmail) {
        setSelectedChannel("sms");
      } else if (!checkData.maskedPhone && checkData.maskedEmail) {
        setSelectedChannel("email");
      } else {
        setSelectedChannel("sms"); // default
      }
      
      setStep(2); // Move to choose channel step
    } catch (err: any) {
      setError(err.message || (lang === "th" ? "เกิดข้อผิดพลาดในการเชื่อมต่อ" : "Connection failed."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const targetVal = selectedChannel === "sms" ? contactData.phone : contactData.email;
    if (!targetVal) {
      setError(lang === "th" ? "ไม่พบข้อมูลการติดต่อ" : "Contact details not found.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${getApiBaseUrl()}/otp/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact: targetVal, channel: selectedChannel }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to request OTP");
      }

      setTargetContact(targetVal);
      setStep(3); // Go to Verify OTP step
      setResendCooldown(60);
      setOtpExpiryTimer(300);
    } catch (err: any) {
      setError(err.message || (lang === "th" ? "เกิดข้อผิดพลาดในการส่ง OTP" : "Failed to send OTP"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!otpCode || otpCode.length !== 6) {
      setError(lang === "th" ? "โปรดระบุรหัส OTP 6 หลัก" : "Please enter a 6-digit OTP code");
      return;
    }

    setIsLoading(true);
    try {
      await fetchRegistrations(targetContact, otpCode);
    } catch (err: any) {
      setError(err.message || localT[lang].otpErrorFallback);
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/otp/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact: targetContact, channel: selectedChannel }),
      });
      if (!res.ok) throw new Error("Failed to resend OTP");
      setResendCooldown(60);
      setOtpExpiryTimer(300);
    } catch (err: any) {
      setError(lang === "th" ? "เกิดข้อผิดพลาดในการส่ง OTP ใหม่" : "Failed to resend OTP");
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

  // Helper to dynamically render product icons based on names
  const getProductIcon = (itemName: string) => {
    const name = itemName.toLowerCase();
    if (name.includes("window") || name.includes("หน้าต่าง") || name.includes("บานเลื่อน") || name.includes("บานกระทุ้ง")) {
      return "window";
    }
    if (name.includes("door") || name.includes("ประตู")) {
      return "door_front";
    }
    if (name.includes("glass") || name.includes("กระจก")) {
      return "view_in_ar";
    }
    return "package_2";
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface-bright text-on-surface">
      {/* Header matching page.tsx exactly */}
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
        
        {/* Loading Spinner for sessions */}
        {isLoading && step === 4 && registrations.length === 0 && (
          <div className="w-full text-center py-16 space-y-4">
            <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-semibold text-on-surface-variant">
              {localT[lang].sessionLoading}
            </p>
          </div>
        )}

        {/* Step 1: Phone or Email input */}
        {step === 1 && (
          <div className="w-full bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 md:p-8 shadow-sm animate-fade-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-secondary !text-3xl">verified_user</span>
              </div>
              <h2 className="font-bold text-2xl text-primary mb-2">
                {localT[lang].checkTitle}
              </h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {localT[lang].checkSubtitle}
              </p>
            </div>

            <form onSubmit={handleCheckContact} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-primary uppercase tracking-wider block">
                  {localT[lang].contactLabel}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-xl">
                    contact_mail
                  </span>
                  <input
                    type="text"
                    placeholder={localT[lang].contactPlaceholder}
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="w-full h-12 pl-11 pr-4 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm font-semibold focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                  />
                </div>
                {error && (
                  <p className="text-xs text-error font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">error</span>
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-secondary text-white font-bold rounded-xl shadow hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-base cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>{localT[lang].sendOtpBtn}</span>
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Choose OTP Channel */}
        {step === 2 && (
          <div className="w-full bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 md:p-8 shadow-sm animate-fade-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-secondary !text-3xl">contact_support</span>
              </div>
              <h2 className="font-bold text-2xl text-primary mb-2">
                {localT[lang].chooseTitle}
              </h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {localT[lang].chooseSubtitle}
              </p>
            </div>

            <form onSubmit={handleRequestOtp} className="space-y-4">
              {contactData.maskedPhone && (
                <div
                  onClick={() => setSelectedChannel("sms")}
                  className={`w-full p-4 border rounded-xl flex items-center gap-3.5 transition-all text-left cursor-pointer ${
                    selectedChannel === "sms"
                      ? "border-secondary bg-secondary/5 ring-1 ring-secondary"
                      : "border-outline-variant hover:bg-surface-container-low"
                  }`}
                >
                  <span className={`material-symbols-outlined text-2xl ${selectedChannel === "sms" ? "text-secondary" : "text-outline"}`}>
                    sms
                  </span>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-primary">
                      {localT[lang].smsOption}
                    </p>
                    <p className="text-xs font-semibold text-on-surface-variant mt-0.5">
                      {contactData.maskedPhone}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-secondary">
                    {selectedChannel === "sms" ? "radio_button_checked" : "radio_button_unchecked"}
                  </span>
                </div>
              )}

              {contactData.maskedEmail && (
                <div
                  onClick={() => setSelectedChannel("email")}
                  className={`w-full p-4 border rounded-xl flex items-center gap-3.5 transition-all text-left cursor-pointer ${
                    selectedChannel === "email"
                      ? "border-secondary bg-secondary/5 ring-1 ring-secondary"
                      : "border-outline-variant hover:bg-surface-container-low"
                  }`}
                >
                  <span className={`material-symbols-outlined text-2xl ${selectedChannel === "email" ? "text-secondary" : "text-outline"}`}>
                    mail
                  </span>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-primary">
                      {localT[lang].emailOption}
                    </p>
                    <p className="text-xs font-semibold text-on-surface-variant mt-0.5">
                      {contactData.maskedEmail}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-secondary">
                    {selectedChannel === "email" ? "radio_button_checked" : "radio_button_unchecked"}
                  </span>
                </div>
              )}

              {error && (
                <p className="text-xs text-error font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">error</span>
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 h-12 border border-outline-variant text-on-surface-variant font-bold rounded-xl hover:bg-surface-container-low transition-all active:scale-[0.98] cursor-pointer text-sm"
                >
                  {localT[lang].backBtn}
                </button>
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 h-12 bg-secondary text-white font-bold rounded-xl shadow hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-base cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>{localT[lang].sendOtpBtn}</span>
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Enter OTP */}
        {step === 3 && (
          <div className="w-full bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 md:p-8 shadow-sm animate-fade-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-secondary !text-3xl">
                  {selectedChannel === "email" ? "mail" : "sms"}
                </span>
              </div>
              <h2 className="font-bold text-2xl text-primary mb-2">
                {localT[lang].otpTitle}
              </h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {localT[lang].otpSubtitle.replace(
                  "{channel}",
                  selectedChannel === "sms" ? localT[lang].smsChannelName : localT[lang].emailChannelName
                )}
              </p>
              {otpExpiryTimer > 0 ? (
                <p className="text-xs font-bold text-secondary mt-2">
                  {lang === "th"
                    ? `รหัส OTP จะหมดอายุใน ${Math.floor(otpExpiryTimer / 60)}:${String(otpExpiryTimer % 60).padStart(2, "0")} นาที`
                    : `OTP will expire in ${Math.floor(otpExpiryTimer / 60)}:${String(otpExpiryTimer % 60).padStart(2, "0")} min`}
                </p>
              ) : (
                <p className="text-xs font-bold text-error mt-2">
                  {lang === "th" ? "รหัส OTP หมดอายุแล้ว โปรดกดส่งรหัสใหม่อีกครั้ง" : "OTP has expired. Please request a new code."}
                </p>
              )}
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-primary uppercase tracking-wider block text-center">
                  {lang === "th" ? "รหัสยืนยัน 6 หลัก" : "6-Digit Verification Code"}
                </label>
                
                <div className="relative flex flex-col gap-2">
                  {/* 6 Styled OTP Boxes */}
                  <div className="flex justify-center gap-2 py-2">
                    {Array.from({ length: 6 }).map((_, idx) => {
                      const digit = otpCode[idx] || "";
                      const isFocused = otpCode.length === idx;
                      return (
                        <div
                          key={idx}
                          className={`w-12 h-14 border-2 rounded-xl flex items-center justify-center text-xl font-bold transition-all ${
                            digit
                              ? "border-secondary bg-secondary/5 text-primary"
                              : isFocused
                              ? "border-secondary bg-white ring-4 ring-secondary/15"
                              : "border-outline-variant bg-surface-container-lowest"
                          }`}
                        >
                          {digit}
                          {isFocused && (
                            <span className="w-[2px] h-6 bg-secondary animate-pulse" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Hidden input overlaying the boxes */}
                  <input
                    type="text"
                    pattern="\d*"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setOtpCode(val);
                      if (error) setError("");
                    }}
                    autoFocus
                    className="absolute inset-0 w-full h-full opacity-0 cursor-text select-none text-transparent"
                    style={{ caretColor: "transparent" }}
                  />
                </div>

                {error && (
                  <p className="text-xs text-error font-semibold flex items-center justify-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-base">error</span>
                    {error}
                  </p>
                )}
                {selectedChannel === "sms" && (
                  <p className="text-[10px] text-outline text-center mt-1">
                    {lang === "th" ? "เพื่อทดสอบ โปรดป้อน: 123456" : "For testing, enter: 123456"}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={otpCode.length !== 6 || isLoading || otpExpiryTimer === 0}
                className={`w-full h-12 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-base ${
                  otpCode.length === 6 && !isLoading && otpExpiryTimer > 0
                    ? "bg-secondary text-white hover:opacity-95 shadow-md active:scale-95 cursor-pointer"
                    : "bg-surface-container-high text-outline-variant cursor-not-allowed"
                }`}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>{localT[lang].verifyBtn}</span>
                    <span className="material-symbols-outlined">how_to_reg</span>
                  </>
                )}
              </button>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-xs font-bold text-outline hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  {localT[lang].backBtn}
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isLoading}
                  className={`text-xs font-bold transition-colors cursor-pointer ${
                    resendCooldown > 0
                      ? "text-outline-variant cursor-not-allowed"
                      : "text-secondary hover:underline"
                  }`}
                >
                  {resendCooldown > 0
                    ? localT[lang].resendCooldown.replace("{seconds}", resendCooldown.toString())
                    : localT[lang].resendCode}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 4: Warranty History list */}
        {step === 4 && registrations.length > 0 && (
          <div className="w-full space-y-6 animate-fade-in">
            {/* Header info card */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 animate-success">
                <span className="material-symbols-outlined text-emerald-600 !text-3xl">verified</span>
              </div>
              <h2 className="font-bold text-2xl text-primary mb-2">
                {localT[lang].historyTitle}
              </h2>
              <p className="text-sm text-on-surface-variant font-semibold">
                {localT[lang].historySubtitle.replace("{count}", registrations.length.toString())}
              </p>
            </div>

            {/* List of registered items */}
            <div className="space-y-4">
              {registrations.map((item) => (
                <div
                  key={item.id}
                  className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden space-y-4"
                >
                  {/* Left accent bar */}
                  <div className="absolute left-0 top-0 h-full w-1.5 bg-secondary" />

                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center pl-2">
                    {/* Dynamic product type icon or Product Image */}
                    <div className="w-16 h-16 bg-surface-container border border-outline-variant/60 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden shadow-inner">
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt="Product thumbnail" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-secondary text-2xl">
                          {getProductIcon(item.itemName)}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 flex-grow">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-secondary bg-secondary-container/20 px-2.5 py-0.5 rounded-full">
                        {item.id}
                      </span>
                      <h3 className="font-bold text-base text-primary pt-0.5">{item.itemName}</h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-on-surface-variant">
                        <p className="flex items-center gap-1.5">
                          <span className="font-semibold text-primary">{localT[lang].itemCode}:</span>
                          <code>{item.itemCode}</code>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <span className="font-semibold text-primary">{lang === "th" ? "วันที่ผลิต" : "Mfg Date"}:</span>
                          <code>{lang === "th" ? (item as any).mfgDateTh || "-" : (item as any).mfgDateEn || "-"}</code>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <span className="font-semibold text-primary">{lang === "th" ? "เลขการผลิต" : "Production No."}:</span>
                          <code>{item.docNum || (item as any).lotNo || "-"}</code>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <span className="font-semibold text-primary">{localT[lang].seqNo}:</span>
                          <code>{item.seqNum || "-"}</code>
                        </p>
                        {item.installationPosition && (
                          <p className="flex items-center gap-1.5 sm:col-span-2 text-secondary font-bold">
                            <span className="font-semibold text-primary">{lang === "th" ? "จุดที่ติดตั้ง" : "Installation Location"}:</span>
                            <span>{item.installationPosition}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status indicator on the right */}
                    <div className="flex flex-col md:items-end gap-1.5 shrink-0 self-stretch justify-between md:justify-start">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 self-start md:self-auto">
                        <span className="material-symbols-outlined text-[16px] !fill-1">
                          verified_user
                        </span>
                        {localT[lang].activeStatus}
                      </span>
                      <span className="text-[10px] font-bold text-outline uppercase tracking-wider text-right">
                        {localT[lang].lifetimeWarranty}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-outline-variant/60 flex flex-col md:flex-row justify-between text-xs text-on-surface-variant font-medium pl-2 gap-2">
                    <span>
                      {localT[lang].registeredAt}{" "}
                      <span className="font-bold text-primary">{formatDate(item.registeredAt)}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Back button */}
            <div className="flex justify-center pt-4">
              <button
                onClick={() => router.push("/")}
                className="w-full max-w-sm h-12 border-2 border-outline-variant text-secondary font-bold rounded-xl hover:bg-surface-container-low transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-base cursor-pointer"
              >
                <span className="material-symbols-outlined">arrow_back</span>
                {localT[lang].goHome}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer matching home page layout */}
      <footer className="w-full py-4 text-center text-xs text-on-surface-variant border-t border-outline-variant bg-surface-container-low mt-auto">
        <p>© 2026 Window Asia Public Company Limited. All rights reserved.</p>
      </footer>
    </div>
  );
}
