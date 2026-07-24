"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { translations, THAILAND_PROVINCES } from "../../translations";
import { getApiBaseUrl } from '@/lib/api';

const QrScannerModal = dynamic(() => import("../../QrScannerModal"), { ssr: false });

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

interface ProductData {
  token: string;
  code: string;
  modelTh: string;
  modelEn: string;
  manufactureDate: string;
  lotNo: string;
  poNo: string;
  imageUrl: string;
  warrantyPeriod: string;
  seqNum?: string | null;
  specs: {
    th: { label: string; value: string }[];
    en: { label: string; value: string }[];
  };
  features: {
    th: string[];
    en: string[];
  };
}

const getWarrantyExpiryString = (warrantyPeriod: string, registeredAt: Date, lang: "th" | "en") => {
  const period = warrantyPeriod.toLowerCase();
  
  if (
    period.includes("ตลอด") || 
    period.includes("lifetime") || 
    period.includes("lifelong") ||
    period.includes("ตลอดชีพ")
  ) {
    return "LIFETIME";
  }

  let yearsToAdd = 0;
  let monthsToAdd = 0;

  const yearMatch = period.match(/(\d+)\s*(ปี|year)/);
  if (yearMatch) {
    yearsToAdd = parseInt(yearMatch[1], 10);
  } else {
    const monthMatch = period.match(/(\d+)\s*(เดือน|month)/);
    if (monthMatch) {
      monthsToAdd = parseInt(monthMatch[1], 10);
    } else {
      yearsToAdd = 1; // Default fallback
    }
  }

  const expiryDate = new Date(registeredAt);
  if (yearsToAdd > 0) {
    expiryDate.setFullYear(expiryDate.getFullYear() + yearsToAdd);
  }
  if (monthsToAdd > 0) {
    expiryDate.setMonth(expiryDate.getMonth() + monthsToAdd);
  }

  return expiryDate.toLocaleDateString(lang === "th" ? "th-TH" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const mockProducts: Record<string, ProductData> = {
  "PR-2024-X1": {
    token: "PR-2024-X1",
    code: "PR-2024-X1",
    modelTh: "สว่านอุตสาหกรรม Pro-X (สว่านไฟฟ้ากำลังสูง)",
    modelEn: "Pro-X Industrial Drill (High-Torque)",
    manufactureDate: "ต.ค. 2023",
    lotNo: "B-992-DELTA",
    poNo: "PO-884321",
    imageUrl: "https://images.unsplash.com/photo-1504148455328-c376907d081c?q=80&w=800&auto=format&fit=crop",
    warrantyPeriod: "ตลอดอายุการใช้งาน (Lifetime Warranty)",
    specs: {
      th: [
        { label: "แรงดันไฟฟ้า", value: "36V Li-Ion" },
        { label: "แรงบิดสูงสุด", value: "120 Nm" },
        { label: "น้ำหนักเครื่อง", value: "2.4 กก." },
        { label: "ระดับความเร็ว", value: "2 ระดับ (0-500 / 0-2100 RPM)" }
      ],
      en: [
        { label: "Voltage", value: "36V Li-Ion" },
        { label: "Max Torque", value: "120 Nm" },
        { label: "Weight", value: "2.4 kg" },
        { label: "Speed Levels", value: "2 Speeds (0-500 / 0-2100 RPM)" }
      ]
    },
    features: {
      th: [
        "มอเตอร์ไร้แปรงถ่าน EC ขั้นสูง พร้อมระบบป้องกันเซลล์แบตเตอรี่ (ECP)",
        "หัวจับโลหะแบบไม่ต้องใช้กุญแจขนาด 1.5 - 13 มม. เพื่อความแม่นยำสูง",
        "ตั้งค่าแรงบิดได้ 25+1 ระดับ เพื่อการขันสกรูที่แม่นยำ",
        "มาตรฐาน IP54 - ป้องกันฝุ่นและละอองน้ำจากทุกทิศทาง"
      ],
      en: [
        "Advanced EC brushless motor with Electronic Cell Protection (ECP)",
        "1.5 - 13 mm keyless metal chuck for high precision work",
        "25+1 torque settings for precise screwdriving control",
        "IP54 rating - dust and splash resistant for harsh conditions"
      ]
    }
  },
  "WA-GLASS-7729": {
    token: "WA-GLASS-7729",
    code: "WA-WD-SL80",
    modelTh: "หน้าต่างบานเลื่อนนิรภัย SL80 (กระจกเทมเปอร์ 8 มม.)",
    modelEn: "SL80 Sliding Safety Window (8mm Tempered Glass)",
    manufactureDate: "เม.ย. 2026",
    lotNo: "LOT-882-WIN",
    poNo: "PO-991043",
    imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800&auto=format&fit=crop",
    warrantyPeriod: "ตลอดอายุการใช้งาน (Lifetime Warranty)",
    specs: {
      th: [
        { label: "ประเภทกระจก", value: "กระจกนิรภัยเทมเปอร์ (Tempered Glass 8mm)" },
        { label: "สีกระจก", value: "สีเขียวตัดแสง (Green Tinted)" },
        { label: "วัสดุเฟรม", value: "อลูมิเนียมเกรดพรีเมียมอบสีพิเศษ (Magnesium-Alloy)" },
        { label: "การป้องกันเสียง", value: "ลดเสียงรบกวนสูงสุด 35 dB" }
      ],
      en: [
        { label: "Glass Type", value: "8mm Tempered Safety Glass" },
        { label: "Glass Color", value: "Green Tinted (Heat Absorbing)" },
        { label: "Frame Material", value: "Premium Magnesium-Alloy Aluminum" },
        { label: "Acoustic Rating", value: "Reduces noise up to 35 dB" }
      ]
    },
    features: {
      th: [
        "กระจกเทมเปอร์นิรภัย แข็งแกร่งกว่ากระจกธรรมดาถึง 5 เท่า แตกแล้วเป็นเม็ดข้าวโพด",
        "เฟรมดีไซน์ลิขสิทธิ์เฉพาะ ป้องกันน้ำรั่วซึม 100% ด้วยระบบบ่ารางแบบขั้นบันได",
        "ติดตั้งตัวล็อคสองชั้น (Double Lock) เพื่อความปลอดภัยสูงสุดของบ้าน",
        "สารเคลือบพิเศษสะท้อนรังสี UV 99% ช่วยประหยัดค่าไฟฟ้าในระยะยาว"
      ],
      en: [
        "Tempered safety glass, 5x stronger than regular glass, crumbles into small fragments if broken",
        "Patented frame design with a multi-level sill track ensuring 100% water tightness",
        "Equipped with a secure double lock mechanism for maximum residential security",
        "Special UV coating blocking 99% of UV rays, improving thermal efficiency"
      ]
    }
  },
  "WA-LIFETIME-GLASS": {
    token: "WA-LIFETIME-GLASS",
    code: "WA-DR-SD90",
    modelTh: "ประตูนิรภัยกระจกสองชั้น SD90 (รับประกันตลอดอายุการใช้งาน)",
    modelEn: "SD90 Double-Glazed Safety Door (Lifetime Warranty)",
    manufactureDate: "พ.ค. 2026",
    lotNo: "LOT-910-LIFE",
    poNo: "PO-991500",
    imageUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=800&auto=format&fit=crop",
    warrantyPeriod: "ตลอดอายุการใช้งาน (Lifetime Warranty)",
    specs: {
      th: [
        { label: "ประเภทกระจก", value: "กระจกนิรภัยลามิเนตสองชั้น (Double Glazed)" },
        { label: "การประหยัดพลังงาน", value: "สะท้อนความร้อนและป้องกัน UV 99%" },
        { label: "ระบบล็อค", value: "ระบบล็อคหลายจุดความปลอดภัยสูง (Multi-point Lock)" },
        { label: "การลดเสียง", value: "ลดเสียงรบกวนสูงสุด 42 dB" }
      ],
      en: [
        { label: "Glass Type", value: "Double Glazed Laminated Safety Glass" },
        { label: "Energy Efficiency", value: "UV Protection 99% & Heat Reflective" },
        { label: "Locking System", value: "High-Security Multi-point System" },
        { label: "Acoustic Rating", value: "Reduces noise up to 42 dB" }
      ]
    },
    features: {
      th: [
        "รับประกันตลอดอายุการใช้งานสำหรับกระจกและโครงสร้างหลักของประตู",
        "ป้องกันรังสีความร้อนและความชื้น 100% ไม่บิดงอหรือเกิดตะไคร่น้ำ",
        "เฟรมแมกนีเซียม-อลูมิเนียมเกรดอากาศยานพร้อมการเคลือบเงาสุดหรู",
        "ซีลยาง EPDM 3 ชั้นรอบบานประตู ป้องกันลมฝุ่นและน้ำรั่วซึมสมบูรณ์แบบ"
      ],
      en: [
        "Lifetime warranty on the glass panels and structural door frame",
        "100% weather, moisture, and UV resistant - will not warp or degrade",
        "Aerospace-grade magnesium-aluminum frame with luxury finish",
        "Triple EPDM rubber seals providing ultimate draft, dust, and water isolation"
      ]
    }
  }
};



export default function RegistrationPage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [lang, setLang] = useState<"th" | "en">("th");
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [product, setProduct] = useState<ProductData | null>(null);
  
  // Decoded QR info (after AES decrypt)
  const [docNum, setDocNum] = useState<string | null>(null);
  const [seqNum, setSeqNum] = useState<string | null>(null);
  const [decryptError, setDecryptError] = useState<string | null>(null);

  // System Config states (fetched dynamically from product specs payload)
  const [qrMode, setQrMode] = useState<"STATIC" | "DYNAMIC">("STATIC");
  const [verificationMode, setVerificationMode] = useState<"OTP" | "LINE" | "EMAIL">("OTP");

  // LINE LIFF auth states
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [lineProfileName, setLineProfileName] = useState<string | null>(null);

  // Static QR site-registration check states
  const [isRegisteredAtSite, setIsRegisteredAtSite] = useState(false);
  const [registrationHistory, setRegistrationHistory] = useState<any[]>([]);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [showDuplicateConfirmModal, setShowDuplicateConfirmModal] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState(0);

  // Step 2 Form State
  const [mandatoryConsent, setMandatoryConsent] = useState(false);
  const [optionalConsent, setOptionalConsent] = useState(false);

  // Step 3 Form State
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    address: "",
    province: "",
    postalCode: "",
    phone: "",
    email: "",
    installationPosition: ""
  });
  const [gpsLocation, setGpsLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // OTP Verification State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refRegNumber, setRefRegNumber] = useState("");
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [otpRefCode, setOtpRefCode] = useState("");
  const [smsOtpMode, setSmsOtpMode] = useState("TEST");
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [autofilledProfile, setAutofilledProfile] = useState<any>(null);
  const [showAutofillPrompt, setShowAutofillPrompt] = useState(false);
  const [isUsingExistingAddress, setIsUsingExistingAddress] = useState(false);
  // sessionLoaded becomes true once the session-restore useEffect has fully completed
  // (including any async fetchProfileByPhone call). The product status-check useEffect
  // depends on this so it never fires before GPS / profile data is ready.
  const [sessionLoaded, setSessionLoaded] = useState(false);

  const getProvinceLabel = (prov: string, currentLang: "th" | "en") => {
    if (!prov) return "";
    const key = prov.trim().toLowerCase();
    const found = THAILAND_PROVINCES.find(
      p => p.th.toLowerCase() === key || p.en.toLowerCase() === key
    );
    if (found) {
      return currentLang === "th" ? found.th : found.en;
    }
    return prov;
  };

  const canShowFullForm = isPhoneVerified || verificationMode === "LINE" || hasActiveSession;

  const t = translations[lang];

  useEffect(() => {
    let storedPhone: string | null = null;
    const sessionStr = localStorage.getItem("proregis_customer_session");
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        // Active session for 1 hour (3,600,000 milliseconds)
        if (Date.now() - session.timestamp < 3600000 && session.firstName && session.address) {
          setFormData({
            firstName: session.firstName || "",
            lastName: session.lastName || "",
            address: session.address || "",
            province: session.province || "",
            postalCode: session.postalCode || "",
            phone: session.phone || "",
            email: session.email || "",
            installationPosition: ""
          });
          if (session.latitude && session.longitude) {
            setGpsLocation({
              latitude: Number(session.latitude),
              longitude: Number(session.longitude)
            });
            setIsUsingExistingAddress(true);
          }
          setHasActiveSession(true);
          setIsPhoneVerified(true);
          setMandatoryConsent(true);
          setOptionalConsent(true);
          storedPhone = session.phone;
          // Full session data is synchronously available — mark session as loaded
          setSessionLoaded(true);
        } else {
          localStorage.removeItem("proregis_customer_session");
        }
      } catch (e) {
        console.warn("Failed to retrieve local session data:", e);
      }
    }

    // If no full profile session, check lightweight OTP session (30 min)
    // This avoids re-requesting OTP for the same phone within the session window
    if (!storedPhone) {
      const otpSessionStr = localStorage.getItem("proregis_otp_session");
      if (otpSessionStr) {
        try {
          const otpSession = JSON.parse(otpSessionStr);
          // OTP session valid for 30 minutes (1,800,000 ms)
          if (Date.now() - otpSession.verifiedAt < 1800000 && (otpSession.phone || otpSession.email)) {
            const contact = otpSession.phone || otpSession.email;
            setFormData((prev) => ({ ...prev, phone: otpSession.phone || "", email: otpSession.email || "" }));
            setIsPhoneVerified(true);
            storedPhone = contact;
            // fetchProfileByPhone is async — it sets sessionLoaded=true in its finally block
            fetchProfileByPhone(contact);
            return; // Don't call setSessionLoaded(true) here; fetchProfileByPhone will do it
          } else {
            localStorage.removeItem("proregis_otp_session");
          }
        } catch (e) {
          console.warn("Failed to retrieve OTP session data:", e);
        }
      }
    }

    // If we reach here, session loading is done (either full session or no session at all)
    setSessionLoaded(true);

    // Load LINE LIFF SDK dynamically from edge CDN
    const script = document.createElement("script");
    script.src = "https://static.line-scdn.net/liff/edge/2/sdk.js";
    script.async = true;
    script.onload = async () => {
      const liff = (window as any).liff;
      if (liff) {
        try {
          // LIFF ID for Window Asia
          await liff.init({ liffId: "2003884321-7N81eKxa" }).catch(() => {});
          if (liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            setLineUserId(profile.userId);
            setLineProfileName(profile.displayName);
            if (profile.displayName) {
              const names = profile.displayName.split(" ");
              setFormData(prev => ({
                ...prev,
                firstName: prev.firstName || names[0] || "",
                lastName: prev.lastName || names[1] || ""
              }));
            }
          } else {
            if (liff.isInClient()) {
              liff.login();
            }
          }
        } catch (err) {
          console.error("LINE LIFF SDK initialisation error:", err);
        }
      }
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const fetchProfileByPhone = async (phoneVal: string) => {
    try {
      const isEmail = phoneVal.includes('@');
      const endpoint = isEmail ? "by-contact" : "by-phone";
      const payload = isEmail ? { contact: phoneVal, otpCode: "SESSION_BYPASS" } : { phone: phoneVal, otpCode: "SESSION_BYPASS" };
      const res = await fetch(`${getApiBaseUrl()}/registration/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const list = await res.json();
        if (list && list.length > 0) {
          const latest = list[0]; // most recent registration
          const profile = {
            firstName: latest.firstName || "",
            lastName: latest.lastName || "",
            address: latest.address || "",
            province: latest.province || "",
            postalCode: latest.postalCode || "",
            email: latest.email || "",
            latitude: latest.latitude || null,
            longitude: latest.longitude || null
          };
          setAutofilledProfile(profile);
          // Immediately restore GPS from historical registration so Step 3 won't re-prompt
          if (profile.latitude && profile.longitude) {
            setGpsLocation({
              latitude: Number(profile.latitude),
              longitude: Number(profile.longitude)
            });
            setIsUsingExistingAddress(true);
            // Persist coordinates into localStorage so useEffect([product, sessionLoaded]) can use them
            const stored = localStorage.getItem("proregis_customer_session");
            if (stored) {
              try {
                const existingSession = JSON.parse(stored);
                localStorage.setItem("proregis_customer_session", JSON.stringify({
                  ...existingSession,
                  firstName: profile.firstName || existingSession.firstName,
                  lastName: profile.lastName || existingSession.lastName,
                  address: profile.address || existingSession.address,
                  province: profile.province || existingSession.province,
                  postalCode: profile.postalCode || existingSession.postalCode,
                  email: profile.email || existingSession.email,
                  latitude: profile.latitude,
                  longitude: profile.longitude,
                  phone: isEmail ? (latest.phone || existingSession.phone || "") : phoneVal,
                  timestamp: existingSession.timestamp || Date.now()
                }));
              } catch {}
            } else {
              // No full session yet — create one from profile data so future token scans can use it
              localStorage.setItem("proregis_customer_session", JSON.stringify({
                firstName: profile.firstName,
                lastName: profile.lastName,
                address: profile.address,
                province: profile.province,
                postalCode: profile.postalCode,
                email: profile.email,
                phone: phoneVal,
                latitude: profile.latitude,
                longitude: profile.longitude,
                timestamp: Date.now()
              }));
            }
          }
          setShowAutofillPrompt(true);
        }
      }
    } catch (err) {
      console.warn("Failed fetching profile by phone:", err);
    } finally {
      // Signal that session data (including GPS from history) is now available
      setSessionLoaded(true);
    }
  };

  // Helper to check if this lot (PD) is already registered at user's location
  const checkRegistrationStatus = async (resolvedDocNum: string, phoneVal: string, lat?: number, lng?: number, triggerModal = true) => {
    let activePhone = phoneVal;
    const isEmailMode = verificationMode === "EMAIL";
    if (!activePhone) {
      // Fallback: check formData or local session
      activePhone = isEmailMode ? formData.email : formData.phone;
      if (!activePhone) {
        const stored = localStorage.getItem("proregis_customer_session");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            activePhone = isEmailMode ? (parsed.email || "") : (parsed.phone || "");
          } catch {}
        }
      }
    }

    if (!resolvedDocNum || !activePhone) {
      console.warn("Skipping checkRegistrationStatus due to missing parameters:", { resolvedDocNum, activePhone });
      return;
    }

    setIsCheckingStatus(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/registration/check-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docNum: resolvedDocNum,
          phone: activePhone,
          latitude: lat,
          longitude: lng
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.registered) {
          setIsRegisteredAtSite(true);
          setRegistrationHistory(data.list || []);
          setRefRegNumber(data.list[data.list.length - 1]?.id || "");
          
          if (data.profile && data.profile.firstName && data.profile.address) {
            setFormData({
              firstName: data.profile.firstName || "",
              lastName: data.profile.lastName || "",
              address: data.profile.address || "",
              province: data.profile.province || "",
              postalCode: data.profile.postalCode || "",
              phone: data.profile.phone || "",
              email: data.profile.email || "",
              installationPosition: ""
            });

            if (data.profile.latitude && data.profile.longitude) {
              setGpsLocation({
                latitude: Number(data.profile.latitude),
                longitude: Number(data.profile.longitude)
              });
              setIsUsingExistingAddress(true);
            }
            setMandatoryConsent(true);
            setOptionalConsent(true);

            localStorage.setItem("proregis_customer_session", JSON.stringify({
              firstName: data.profile.firstName,
              lastName: data.profile.lastName,
              address: data.profile.address,
              province: data.profile.province,
              postalCode: data.profile.postalCode,
              phone: data.profile.phone,
              email: data.profile.email,
              latitude: data.profile.latitude || null,
              longitude: data.profile.longitude || null,
              timestamp: Date.now()
            }));
          }

          if (triggerModal && data.count > 0 && qrMode === "STATIC") {
            setDuplicateCount(data.count);
            setShowDuplicateConfirmModal(true);
          } else {
            setStep(4);
          }
        } else {
          setIsRegisteredAtSite(false);
          
          // Re-populate from local storage for a seamless experience on additional scans at same site
          const stored = localStorage.getItem("proregis_customer_session");
          if (stored) {
            try {
              const session = JSON.parse(stored);
              setFormData(prev => ({
                ...prev,
                firstName: session.firstName || prev.firstName,
                lastName: session.lastName || prev.lastName,
                address: session.address || prev.address,
                province: session.province || prev.province,
                postalCode: session.postalCode || prev.postalCode,
                phone: session.phone || prev.phone,
                email: session.email || prev.email,
              }));

              if (session.latitude && session.longitude) {
                setGpsLocation({
                  latitude: Number(session.latitude),
                  longitude: Number(session.longitude)
                });
                setIsUsingExistingAddress(true);
              }
              setMandatoryConsent(true);
              setOptionalConsent(true);
            } catch (e) {
              console.warn("Failed to parse local session in checkRegistrationStatus fallback:", e);
            }
          }

          if (!triggerModal) {
            setStep(4);
          }
        }
      }
    } catch (err) {
      console.warn("Failed checking registration status:", err);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const isValidTokenFormat = (t: string): boolean => {
    if (t === "PR-2024-X1" || t === "WA-GLASS-7729" || t === "WA-LIFETIME-GLASS") {
      return true;
    }
    // Allow 9-digit or 12-digit numeric static tokens
    if (/^\d{9}$/.test(t) || /^\d{12}$/.test(t)) {
      return true;
    }
    // Dynamic token checks
    const base64UrlRegex = /^[A-Za-z0-9\-_]+$/;
    return base64UrlRegex.test(t) && t.length >= 20 && t.length <= 40;
  };

  useEffect(() => {
    async function fetchProduct() {
      if (!isValidTokenFormat(token)) {
        setDecryptError("INVALID_TOKEN");
        return;
      }

      let resolvedDocNum: string | null = null;
      let resolvedSeqNum: string | null = null;

      // Check if it's a plain static token (e.g. 9 or 12 digit number, or predefined mock codes)
      const isPlainStatic = /^\d{9}$/.test(token) || /^\d{12}$/.test(token) || token === "PR-2024-X1" || token === "WA-GLASS-7729" || token === "WA-LIFETIME-GLASS";

      if (!isPlainStatic) {
        // Step 1: Try to decrypt the token (AES-128-CBC + Base64URL)
        try {
          const decryptRes = await fetch(`${getApiBaseUrl()}/backoffice/decrypt`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
          if (decryptRes.ok) {
            const decryptData = await decryptRes.json();
            if (decryptData.success) {
              resolvedDocNum = decryptData.docNum;
              resolvedSeqNum = decryptData.seqNum;
              setDocNum(decryptData.docNum);
              setSeqNum(decryptData.seqNum);
            } else {
              setDecryptError("INVALID_TOKEN");
              return;
            }
          } else {
            setDecryptError("INVALID_TOKEN");
            return;
          }
        } catch (err) {
          console.warn("Decrypt API not reachable, treating token as plain.", err);
        }
      } else {
        // It's a plain static token
        if (token.length === 12) {
          setDocNum(token.substring(0, 9));
          setSeqNum(token.substring(9, 12));
        } else if (token.length === 9) {
          setDocNum(token);
        }
      }

      // Step 2: Fetch product — use docNum if decrypted, else use raw token as fallback
      const lookupKey = resolvedDocNum || token;
      try {
        const res = await fetch(`${getApiBaseUrl()}/products/${encodeURIComponent(lookupKey)}`);
        if (res.ok) {
          const data = await res.json();
          setProduct(data);
          if (data.qrMode) setQrMode(data.qrMode as "STATIC" | "DYNAMIC");
          if (data.verificationMode) setVerificationMode(data.verificationMode as "OTP" | "LINE" | "EMAIL");
          if (data.smsOtpMode) setSmsOtpMode(data.smsOtpMode);

          // If QR Mode is STATIC, store docNum for use by the session check effect below
          // (checkRegistrationStatus will be called in the [product, hasActiveSession] useEffect)
          return;
        } else {
          // If the server explicitly rejected the request, show the validation error message!
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.message || (lang === "th" ? "ไม่พบข้อมูลสินค้าในระบบ" : "Product not found");
          setDecryptError(errMsg);
          return;
        }
      } catch (err) {
        console.warn("API Server not reachable, falling back to local mocks.", err);
      }

      // Local Fallback (mock data)
      const matchedProduct = mockProducts[token] || mockProducts[lookupKey];
      if (matchedProduct) {
        setProduct(matchedProduct);
      } else {
        setProduct({
          token: lookupKey,
          code: lookupKey,
          modelTh: "กระจกหน้าต่างอลูมิเนียมนำเข้าซีรีส์ย่อย",
          modelEn: "Imported Aluminum Window Sub-Series",
          manufactureDate: "ก.พ. 2026",
          lotNo: "LOT-01",
          poNo: "120",
          imageUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=800&auto=format&fit=crop",
          warrantyPeriod: "ตลอดอายุการใช้งาน (Lifetime Warranty)",
          specs: {
            th: [
              { label: "จำนวนที่ผลิต", value: "120 ชิ้น" },
              { label: "ลำดับที่", value: resolvedSeqNum ? `ชิ้นที่ ${parseInt(resolvedSeqNum)}` : "-" },
              { label: "วันที่ผลิต", value: "ก.พ. 2026" },
              { label: "มาตรฐานควบคุม", value: "ISO 9001:2015" },
            ],
            en: [
              { label: "Production Quantity", value: "120 Units" },
              { label: "Unit No.", value: resolvedSeqNum ? `Unit ${parseInt(resolvedSeqNum)}` : "-" },
              { label: "Manufacture Date", value: "Feb 2026" },
              { label: "Compliance Standard", value: "ISO 9001:2015" },
            ]
          },
          features: {
            th: [
              "ผลิตจากอลูมิเนียมหนาพิเศษ แข็งแรง ทนลมพายุได้ดีเยี่ยม",
              "กระจกฉนวนประหยัดพลังงาน ช่วยสะท้อนรังสีความร้อนของดวงอาทิตย์",
              "ดีไซน์ขอบบางเพิ่มมุมมองภายนอกที่กว้างขวางขึ้น"
            ],
            en: [
              "Heavy-duty aluminum profile designed for superior wind load resistance",
              "Energy-efficient insulated glass pane helping reject solar heat",
              "Slim profile frame maximizing natural daylight and viewing area"
            ]
          }
        });
      }
    }
    fetchProduct();
  }, [token]);

  // OTP timer countdown
  useEffect(() => {
    if (otpTimer > 0) {
      const interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [otpTimer]);

  // After both product AND session data (including async fetchProfileByPhone) are ready,
  // run the duplicate/status check for STATIC QR.
  useEffect(() => {
    if (!product || qrMode !== "STATIC" || !sessionLoaded) return;
    const storedSession = localStorage.getItem("proregis_customer_session");
    if (!storedSession) return;
    try {
      const session = JSON.parse(storedSession);
      if (!session.phone) return;
      const actualDocNum = docNum || (token.length === 9 ? token : null);
      if (!actualDocNum) return;
      // Pass GPS from session — guaranteed to be present now that sessionLoaded=true
      checkRegistrationStatus(
        actualDocNum,
        session.phone,
        session.latitude ? Number(session.latitude) : undefined,
        session.longitude ? Number(session.longitude) : undefined
      );
    } catch (e) {
      console.warn("Error reading session for status check:", e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, sessionLoaded]);

  // Scroll to top of the page when the step changes (e.g. to step 4 on success)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [step]);

  if (decryptError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-bright p-4">
        <div className="max-w-[450px] w-full bg-white rounded-2xl border border-outline-variant p-8 shadow-lg text-center space-y-6 animate-fade-in">
          <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-error text-4xl">error</span>
          </div>
          <div className="space-y-2">
            <h2 className="font-bold text-xl text-primary">
              {lang === "th" ? "เกิดข้อผิดพลาด" : "Error Occurred"}
            </h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              {decryptError === "INVALID_TOKEN"
                ? (lang === "th"
                    ? "ขออภัยครับ รหัส QR นี้ไม่ใช่รหัสสแกนรับประกันของ Window Asia กรุณาตรวจสอบ QR Code รับประกันที่ถูกต้อง แล้วลองสแกนใหม่อีกครั้ง"
                    : "Sorry, this QR code is not a valid Window Asia warranty registration code. Please inspect the correct warranty QR code and try again."
                  )
                : decryptError
              }
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => {
                setDecryptError(null);
                router.push("/?scan=true");
              }}
              className="w-full h-12 bg-secondary text-white font-bold rounded-xl hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
              <span>{lang === "th" ? "ลองใหม่อีกครั้ง" : "Try Again"}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-bright">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-outline">Loading...</span>
        </div>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === "phone") {
      finalValue = value.replace(/\D/g, "").substring(0, 10);
      setHasActiveSession(false);
    }
    setFormData((prev) => ({ ...prev, [name]: finalValue }));
    setSubmitError(null);
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleFetchGps = () => {
    setIsGpsLoading(true);
    setGpsErrorMsg(null);
    if (!navigator.geolocation) {
      setGpsErrorMsg(t.gpsError);
      setIsGpsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setIsGpsLoading(false);
      },
      (error) => {
        console.warn("Geolocation error:", error);
        setGpsErrorMsg(t.gpsError);
        setIsGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const validateStep3 = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName.trim()) newErrors.firstName = lang === "th" ? "โปรดระบุชื่อจริง" : "First Name is required";
    if (!formData.lastName.trim()) newErrors.lastName = lang === "th" ? "โปรดระบุนามสกุล" : "Last Name is required";
    if (!formData.address.trim()) newErrors.address = lang === "th" ? "โปรดระบุสถานที่ติดตั้ง" : "Address is required";
    if (!formData.province) newErrors.province = lang === "th" ? "โปรดเลือกจังหวัด" : "Province is required";
    if (!formData.postalCode.trim() || !/^\d{5}$/.test(formData.postalCode)) {
      newErrors.postalCode = lang === "th" ? "โปรดระบุรหัสไปรษณีย์ 5 หลัก" : "Valid 5-digit postal code required";
    }
    if (!formData.phone.trim() || !/^0\d{9}$/.test(formData.phone.replace(/[-]/g, ""))) {
      newErrors.phone = lang === "th" ? "โปรดระบุเบอร์โทรศัพท์ 10 หลัก (เช่น 0891234567)" : "Valid 10-digit mobile number required";
    }
    if (verificationMode === "EMAIL") {
      if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = lang === "th" ? "โปรดระบุอีเมลที่ถูกต้องเพื่อยืนยันสิทธิ์" : "Valid email address is required";
      }
    } else {
      if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = lang === "th" ? "รูปแบบอีเมลไม่ถูกต้อง" : "Invalid email format";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePhoneOnly = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.phone.trim() || !/^0\d{9}$/.test(formData.phone.replace(/[-]/g, ""))) {
      newErrors.phone = lang === "th" ? "โปรดระบุเบอร์โทรศัพท์ 10 หลัก (เช่น 0891234567)" : "Valid 10-digit mobile number required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateEmailOnly = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = lang === "th" ? "โปรดระบุอีเมลที่ถูกต้อง (เช่น example@windowasia.com)" : "Valid email address required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEmailMode = verificationMode === "EMAIL";
    if (isEmailMode) {
      if (!validateEmailOnly()) return;
    } else {
      if (!validatePhoneOnly()) return;
    }

    // Bypass OTP if LINE Mode is active or we have active full-profile session
    if (verificationMode === "LINE" || hasActiveSession) {
      setIsPhoneVerified(true);
      return;
    }

    // Bypass OTP if a lightweight OTP session for this contact is still valid (30 min)
    const otpSessionStr = localStorage.getItem("proregis_otp_session");
    if (otpSessionStr) {
      try {
        const otpSession = JSON.parse(otpSessionStr);
        const contactVal = isEmailMode ? formData.email : formData.phone;
        if (
          otpSession.phone === contactVal &&
          Date.now() - otpSession.verifiedAt < 1800000
        ) {
          setIsPhoneVerified(true);
          return;
        }
      } catch (e) {
        console.warn("Failed to parse OTP session:", e);
      }
    }

    setIsSubmitting(true);
    try {
      const contactVal = isEmailMode ? formData.email : formData.phone;
      const res = await fetch(`${getApiBaseUrl()}/otp/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: contactVal })
      });
      if (res.ok) {
        const resData = await res.json();
        setIsSubmitting(false);
        setShowOtpModal(true);
        setOtpTimer(60);
        setOtpError("");
        setOtpRefCode(resData.refCode || "");
        return;
      } else {
        const errData = await res.json().catch(() => ({}));
        setIsSubmitting(false);
        setSubmitError(errData.message || (lang === "th" ? "ไม่สามารถส่งรหัส OTP ได้ โปรดตรวจสอบการตั้งค่า" : "Failed to send OTP. Please check your settings."));
        return;
      }
    } catch (err) {
      console.warn("Backend not running, simulating OTP request.", err);
    }

    // Fallback simulation (only run if network/fetch exception was thrown)
    setTimeout(() => {
      setIsSubmitting(false);
      setShowOtpModal(true);
      setOtpTimer(60);
      setOtpError("");
      setOtpRefCode("MOCK");
    }, 800);
  };

  const handleDirectRegistration = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token,
          docNum: docNum || undefined,
          seqNum: seqNum || undefined,
          firstName: formData.firstName,
          lastName: formData.lastName,
          address: formData.address,
          province: formData.province,
          postalCode: formData.postalCode,
          phone: formData.phone,
          email: formData.email || undefined,
          mandatoryConsent: mandatoryConsent,
          optionalConsent: optionalConsent,
          latitude: gpsLocation?.latitude || undefined,
          longitude: gpsLocation?.longitude || undefined,
          lineUserId: lineUserId || undefined,
          installationPosition: formData.installationPosition || undefined
        })
      });
      if (res.ok) {
        const data = await res.json();
        setRefRegNumber(data.refCode);

        // Store/Refresh session details
        localStorage.setItem("proregis_customer_session", JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          address: formData.address,
          province: formData.province,
          postalCode: formData.postalCode,
          phone: formData.phone,
          email: formData.email,
          latitude: gpsLocation?.latitude || null,
          longitude: gpsLocation?.longitude || null,
          timestamp: Date.now()
        }));

        // Static QR Mode: load registered units to transition straight to Dashboard
        if (qrMode === "STATIC") {
          const actualDocNum = docNum || (token.length === 9 ? token : null);
          if (actualDocNum) {
            await checkRegistrationStatus(actualDocNum, formData.phone, gpsLocation?.latitude, gpsLocation?.longitude, false);
          }
        }

        setIsSubmitting(false);
        setStep(4);
        return;
      } else {
        const data = await res.json();
        setSubmitError(data.message || (lang === "th" ? "เกิดข้อผิดพลาดในการลงทะเบียน" : "Failed to register product"));
        setIsSubmitting(false);
        return;
      }
    } catch (err) {
      console.warn("Direct registration failed, checking error type.", err);
      if (err instanceof TypeError) {
        // Fallback simulation when API server is unreachable
        setTimeout(() => {
          const cleanLotSuffix = (product?.lotNo && product.lotNo.includes("-")) ? product.lotNo.split("-")[1] : "WIN";
          const randomRef = `REG-${Math.floor(Math.random() * 90000) + 10000}-${cleanLotSuffix}`;
          setRefRegNumber(randomRef);

          localStorage.setItem("proregis_customer_session", JSON.stringify({
            firstName: formData.firstName,
            lastName: formData.lastName,
            address: formData.address,
            province: formData.province,
            postalCode: formData.postalCode,
            phone: formData.phone,
            email: formData.email,
            latitude: gpsLocation?.latitude || null,
            longitude: gpsLocation?.longitude || null,
            timestamp: Date.now()
          }));

          setIsSubmitting(false);
          setStep(4);
        }, 1000);
        return;
      } else {
        setSubmitError(lang === "th" ? "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์" : "Server connection failed");
        setIsSubmitting(false);
        return;
      }
    }
  };

  const handleUseAutofilled = () => {
    if (autofilledProfile) {
      setFormData((prev) => ({
        ...prev,
        firstName: autofilledProfile.firstName,
        lastName: autofilledProfile.lastName,
        address: autofilledProfile.address,
        province: autofilledProfile.province,
        postalCode: autofilledProfile.postalCode,
        email: autofilledProfile.email
      }));
      // Restore GPS from autofilled profile if available
      if (autofilledProfile.latitude && autofilledProfile.longitude) {
        setGpsLocation({
          latitude: Number(autofilledProfile.latitude),
          longitude: Number(autofilledProfile.longitude)
        });
        setIsUsingExistingAddress(true);
      } else {
        // Fall back to session coordinates if profile has none
        const stored = localStorage.getItem("proregis_customer_session");
        if (stored) {
          try {
            const session = JSON.parse(stored);
            if (session.latitude && session.longitude) {
              setGpsLocation({
                latitude: Number(session.latitude),
                longitude: Number(session.longitude)
              });
              setIsUsingExistingAddress(true);
            }
          } catch {}
        }
      }
      setMandatoryConsent(true);
      setOptionalConsent(true);
      setShowAutofillPrompt(false);
    }
  };

  const handleClearAddressForNew = () => {
    setFormData((prev) => ({
      ...prev,
      address: "",
      province: "",
      postalCode: ""
    }));
    setGpsLocation(null);
    setIsUsingExistingAddress(false);
    setShowAutofillPrompt(false);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep3()) return;
    await handleDirectRegistration();
  };

  const handleVerifyOtp = async () => {
    setIsSubmitting(true);
    let verifySuccess = false;
    const isEmailMode = verificationMode === "EMAIL";
    const contactVal = isEmailMode ? formData.email : formData.phone;

    try {
      const endpoint = isEmailMode ? "by-contact" : "by-phone";
      const payload = isEmailMode ? { contact: contactVal, otpCode: otpCode } : { phone: contactVal, otpCode: otpCode };
      
      const res = await fetch(`${getApiBaseUrl()}/registration/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        verifySuccess = true;
        const list = await res.json();
        if (list && list.length > 0) {
          const latest = list[0]; // most recent registration
          const profile = {
            firstName: latest.firstName || "",
            lastName: latest.lastName || "",
            address: latest.address || "",
            province: latest.province || "",
            postalCode: latest.postalCode || "",
            email: latest.email || "",
            latitude: latest.latitude || null,
            longitude: latest.longitude || null
          };
          setAutofilledProfile(profile);
          setFormData((prev) => ({
            ...prev,
            firstName: profile.firstName,
            lastName: profile.lastName,
            address: profile.address,
            province: profile.province,
            postalCode: profile.postalCode,
            email: profile.email
          }));
          setShowAutofillPrompt(true);
        }
      } else {
        if (smsOtpMode === "TEST" && (otpCode === "123456" || otpCode === "654321")) {
          verifySuccess = true;
          try {
            const bypassPayload = isEmailMode ? { contact: contactVal, otpCode: "SESSION_BYPASS" } : { phone: contactVal, otpCode: "SESSION_BYPASS" };
            const bypassRes = await fetch(`${getApiBaseUrl()}/registration/${endpoint}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(bypassPayload)
            });
            if (bypassRes.ok) {
              const list = await bypassRes.json();
              if (list && list.length > 0) {
                const latest = list[list.length - 1];
                const profile = {
                  firstName: latest.firstName || "",
                  lastName: latest.lastName || "",
                  address: latest.address || "",
                  province: latest.province || "",
                  postalCode: latest.postalCode || "",
                  email: latest.email || ""
                };
                setAutofilledProfile(profile);
                setFormData((prev) => ({
                  ...prev,
                  firstName: profile.firstName,
                  lastName: profile.lastName,
                  address: profile.address,
                  province: profile.province,
                  postalCode: profile.postalCode,
                  email: profile.email
                }));
                setShowAutofillPrompt(true);
              }
            }
          } catch (e) {
            console.warn("Failed retrieving mock profile:", e);
          }
        }
      }
    } catch (err) {
      console.warn("Backend not running, simulating verification", err);
      verifySuccess = otpCode === "123456" || otpCode === "654321";
    }

    if (!verifySuccess) {
      setIsSubmitting(false);
      setOtpError(
        isEmailMode
          ? (lang === "th" ? "รหัส OTP ไม่ถูกต้อง โปรดป้อนรหัสที่ได้รับจากอีเมล" : "Invalid OTP code. Enter the code received via email.")
          : (lang === "th" ? "รหัส OTP ไม่ถูกต้อง โปรดป้อนรหัสที่ได้รับจาก SMS" : "Invalid OTP code. Enter the code received via SMS.")
      );
      return;
    }

    setShowOtpModal(false);

    // Save lightweight OTP session so same contact won't need OTP again within 30 min
    localStorage.setItem("proregis_otp_session", JSON.stringify({
      phone: contactVal,
      verifiedAt: Date.now()
    }));

    // Check duplicate status AFTER successful OTP verification
    if (qrMode === "STATIC") {
      try {
        const actualDocNum = docNum || (token.length === 9 ? token : null);
        if (actualDocNum) {
          const res = await fetch(`${getApiBaseUrl()}/registration/check-status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              docNum: actualDocNum,
              phone: contactVal,
              latitude: gpsLocation?.latitude,
              longitude: gpsLocation?.longitude
            })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.registered && data.count > 0) {
              setDuplicateCount(data.count);
              setShowDuplicateConfirmModal(true);
              setIsSubmitting(false);
              return;
            }
          }
        }
      } catch (err) {
        console.warn("Failed checking status after verification:", err);
      }
    }

    setIsPhoneVerified(true);
    setIsSubmitting(false);
  };

  const handleAddUnit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/registration/add-unit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, phone: formData.phone })
      });
      if (res.ok) {
        setShowDuplicateConfirmModal(false);
        const actualDocNum = docNum || (token.length === 9 ? token : null);
        if (actualDocNum) {
          setStep(4);
          await checkRegistrationStatus(actualDocNum, formData.phone, gpsLocation?.latitude, gpsLocation?.longitude, false);
        }
      } else {
        const data = await res.json();
        setSubmitError(data.message || (lang === "th" ? "เกิดข้อผิดพลาดในการเพิ่มชิ้นงาน" : "Failed to add unit"));
      }
    } catch {
      setSubmitError(lang === "th" ? "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" : "Server connection failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface-bright pb-16 md:pb-0">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-margin-mobile md:px-gutter-desktop h-16 bg-surface-bright border-b border-outline-variant shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowScanner(true)}
            className="material-symbols-outlined text-primary hover:bg-surface-container-high transition-colors p-2 rounded-full active:scale-95 duration-100 cursor-pointer"
          >
            qr_code_scanner
          </button>
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shadow-sm flex-shrink-0">
            <img src="/icon-192.png" alt="ProRegis Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="font-bold text-xl text-primary tracking-tight">ProRegis</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Language Flag Button */}
          <button
            onClick={() => setLang(lang === "th" ? "en" : "th")}
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low transition-colors active:scale-95 duration-100 cursor-pointer shadow-sm"
            title={lang === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
          >
            {lang === "th" ? <USFlag /> : <THFlag />}
          </button>
          <button 
            onClick={() => router.push("/")}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors active:scale-95 duration-100"
          >
            <span className="material-symbols-outlined text-on-surface-variant">home</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow pt-24 pb-12 px-margin-mobile max-w-[1200px] mx-auto w-full">
        {/* Step progress bar */}
        {step < 4 && (
          <div className="mb-8 flex items-center justify-center gap-2">
            <div className={`h-1.5 w-12 rounded-full transition-all duration-300 ${step >= 1 ? "bg-secondary" : "bg-surface-variant"}`}></div>
            <div className={`h-1.5 w-12 rounded-full transition-all duration-300 ${step >= 2 ? "bg-secondary" : "bg-surface-variant"}`}></div>
            <div className={`h-1.5 w-12 rounded-full transition-all duration-300 ${step >= 3 ? "bg-secondary" : "bg-surface-variant"}`}></div>
            <div className={`h-1.5 w-12 rounded-full transition-all duration-300 ${step >= 4 ? "bg-secondary" : "bg-surface-variant"}`}></div>
          </div>
        )}

        {/* Step 1: Product Specs */}
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 space-y-6">
            <section className="overflow-hidden rounded-xl bg-white shadow-sm border border-outline-variant/30">
              <div className="relative h-[250px] md:h-[400px] w-full bg-surface-container">
                <img 
                  src={product.imageUrl} 
                  alt={lang === "th" ? product.modelTh : product.modelEn} 
                  className="w-full h-full object-cover" 
                />
                <div className="absolute top-4 left-4">
                  <div className="bg-secondary-container text-on-secondary-container px-4 py-1.5 rounded-full flex items-center gap-2 shadow-sm border border-secondary/20">
                    <span className="material-symbols-outlined text-[18px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                      verified
                    </span>
                    <span className="font-semibold text-xs text-on-secondary-container">
                      {lang === "th" ? `รับประกัน: ${product.warrantyPeriod}` : `Warranty: ${product.warrantyPeriod}`}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="font-bold text-2xl text-primary tracking-tight">
                    {lang === "th" ? product.modelTh : product.modelEn}
                  </h2>
                  <span className="text-xs font-bold text-secondary uppercase bg-secondary-container/20 px-3 py-1 rounded-full">
                    {t.verifiedStatus}
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant max-w-3xl leading-relaxed">
                  {t.specDescText1}
                </p>
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Bento card specs */}
              <div className="md:col-span-2 bg-white rounded-xl p-6 border border-outline-variant shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-outline-variant/40 pb-3">
                  <span className="material-symbols-outlined text-secondary">analytics</span>
                  <h3 className="font-bold text-lg text-primary">{t.techSpecs}</h3>
                </div>
                <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                  <div>
                    <p className="text-[10px] text-outline font-bold uppercase tracking-wider">{t.prodCode}</p>
                    <p className="text-sm text-primary font-semibold tracking-mono">{product.code}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-outline font-bold uppercase tracking-wider">{t.prodDate}</p>
                    <p className="text-sm text-primary font-semibold">{product.manufactureDate}</p>
                  </div>
                  {product.lotNo && (
                    <div>
                      <p className="text-[10px] text-outline font-bold uppercase tracking-wider">{t.lotNo}</p>
                      <p className="text-sm text-primary font-semibold tracking-mono">{product.lotNo}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-outline font-bold uppercase tracking-wider">{t.orderNo}</p>
                    <p className="text-sm text-primary font-semibold tracking-mono">{docNum || token}</p>
                  </div>
                  {qrMode === "DYNAMIC" && (seqNum || product.seqNum) && (
                    <div>
                      <p className="text-[10px] text-outline font-bold uppercase tracking-wider">{t.productionSeq}</p>
                      <p className="text-sm text-primary font-semibold tracking-mono">
                        ชิ้นที่ {parseInt(seqNum || product.seqNum || "", 10)}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-outline font-bold uppercase tracking-wider">{t.poNo}</p>
                    <p className="text-sm text-primary font-semibold tracking-mono">{product.poNo}</p>
                  </div>
                </div>
              </div>

              {/* Side Specs Card */}
              <div className="bg-primary-container text-on-primary p-6 rounded-xl shadow-lg flex flex-col justify-between">
                <div className="space-y-4">
                  <span className="material-symbols-outlined text-secondary-container text-3xl">bolt</span>
                  <h3 className="font-bold text-lg text-white">{t.performance}</h3>
                  <div className="space-y-2.5 text-xs">
                    {(lang === "th" ? product.specs.th : product.specs.en).map((spec, i) => (
                      <div key={i} className="flex justify-between border-b border-on-primary-fixed-variant/20 pb-1.5 last:border-b-0 last:pb-0">
                        <span className="text-on-primary-container">{spec.label}</span>
                        <span className="font-semibold text-white">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-4 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-[10px] font-bold text-on-primary-container uppercase tracking-wider">{t.systemReady}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Features List */}
              <div className="space-y-3">
                <h3 className="font-bold text-lg text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">settings</span>
                  {t.specDetails}
                </h3>
                <ul className="space-y-2 text-sm text-on-surface-variant">
                  {(lang === "th" ? product.features.th : product.features.en).map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 bg-white p-3 rounded-lg border border-outline-variant/30">
                      <span className="material-symbols-outlined text-green-600 text-lg mt-0.5">check_circle</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Product description paragraph */}
              <div className="space-y-3">
                <h3 className="font-bold text-lg text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">description</span>
                  {t.prodDesc}
                </h3>
                <div className="text-sm text-on-surface-variant leading-relaxed space-y-3">
                  <p>{t.specDescText2}</p>
                  <p>{t.specDescText3}</p>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-outline-variant flex flex-col items-center gap-2">
              <button 
                onClick={() => {
                  if (hasActiveSession) {
                    setStep(3);
                  } else {
                    setStep(2);
                  }
                }}
                className="w-full md:w-auto min-w-[320px] h-14 bg-secondary text-white font-bold rounded-xl shadow-md hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-base cursor-pointer"
              >
                <span>{t.nextConsent}</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
              <p className="text-[10px] text-outline font-semibold">{t.step} 1 {t.stepOf}</p>
            </div>
            </div>

            {/* Sidebar info */}
            <div className="lg:col-span-4 space-y-6">
              <div className="p-6 bg-surface-container border border-outline-variant rounded-xl flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-on-secondary-container">verified_user</span>
                </div>
                <h3 className="font-bold text-sm text-primary mb-2">{lang === "th" ? "การลงทะเบียนที่ปลอดภัย" : "Secure Registration"}</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {lang === "th" 
                    ? "ข้อมูลของคุณจะได้รับการจัดเก็บอย่างปลอดภัยด้วยการเข้ารหัส SSL และใช้เฉพาะเพื่อวัตถุประสงค์ในการยืนยันสิทธิ์รับประกันสินค้าเท่านั้น" 
                    : "Your data is stored securely using SSL encryption and is used exclusively for verifying your warranty rights."}
                </p>
              </div>

              <div className="p-6 bg-white border border-outline-variant rounded-xl shadow-sm space-y-4">
                <h3 className="font-bold text-sm text-primary">{lang === "th" ? "ขั้นตอนทั้งหมด" : "Steps Progress"}</h3>
                <ul className="space-y-3.5 text-xs font-semibold">
                  <li className="flex items-center gap-2 text-secondary">
                    <div className="w-5 h-5 rounded-full border-2 border-secondary flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-secondary"></div>
                    </div>
                    <span>{t.navInfo}</span>
                  </li>
                  <li className="flex items-center gap-2 text-outline">
                    <span className="material-symbols-outlined !text-xl">radio_button_unchecked</span>
                    <span>{t.navConsent}</span>
                  </li>
                  <li className="flex items-center gap-2 text-outline">
                    <span className="material-symbols-outlined !text-xl">radio_button_unchecked</span>
                    <span>{t.navRegister}</span>
                  </li>
                  <li className="flex items-center gap-2 text-outline">
                    <span className="material-symbols-outlined !text-xl">radio_button_unchecked</span>
                    <span>{t.navSuccess}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: PDPA Consent */}
        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-6">
              <section className="space-y-4">
                <h2 className="font-bold text-3xl text-primary">{t.privacyTitle}</h2>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  {t.privacySubtitle}
                </p>
              </section>

              <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant flex gap-4 items-start">
                <span className="material-symbols-outlined text-secondary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  security
                </span>
                <div>
                  <h3 className="font-bold text-sm text-primary mb-1 uppercase tracking-wider">{t.dataProtectionTitle}</h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {t.dataProtectionDesc}
                  </p>
                </div>
              </div>

              <div className="relative h-60 w-full rounded-xl overflow-hidden shadow-sm group">
                <img 
                  src="https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=800&auto=format&fit=crop" 
                  alt="Security and Trust" 
                  className="w-full h-full object-cover transition-transform duration-75 group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent"></div>
              </div>
            </div>

            <div className="lg:col-span-5 lg:sticky lg:top-24">
              <div className="bg-white rounded-xl p-8 border border-outline-variant shadow-[0px_4px_12px_rgba(15,23,42,0.05)] space-y-6">
                <div className="space-y-5">
                  <label className="flex items-start gap-3.5 cursor-pointer group">
                    <input 
                      type="checkbox"
                      checked={mandatoryConsent}
                      onChange={(e) => setMandatoryConsent(e.target.checked)}
                      className="mt-1 h-5 w-5 rounded border-outline-variant text-secondary focus:ring-secondary transition-all"
                    />
                    <span className="text-xs font-semibold text-on-surface leading-normal">
                      {t.mandatoryConsent} <span className="text-error font-bold">*</span>
                    </span>
                  </label>

                  <label className="flex items-start gap-3.5 cursor-pointer group">
                    <input 
                      type="checkbox"
                      checked={optionalConsent}
                      onChange={(e) => setOptionalConsent(e.target.checked)}
                      className="mt-1 h-5 w-5 rounded border-outline-variant text-secondary focus:ring-secondary transition-all"
                    />
                    <span className="text-xs font-semibold text-on-surface-variant leading-normal">
                      {t.optionalConsent}
                    </span>
                  </label>
                </div>

                <div className="pt-4 border-t border-outline-variant flex justify-between items-center">
                  <a 
                    href="https://windowasia.com/wp-content/uploads/2024/02/%E0%B8%99%E0%B9%82%E0%B8%A2%E0%B8%9A%E0%B8%B2%E0%B8%A2%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B8%84%E0%B8%B8%E0%B9%89%E0%B8%A1%E0%B8%84%E0%B8%A3%E0%B8%AD%E0%B8%87%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%A1%E0%B8%B9%E0%B8%A5%E0%B8%AA%E0%B9%88%E0%B8%A7%E0%B8%99%E0%B8%9A%E0%B8%B8%E0%B8%84%E0%B8%84%E0%B8%A5-.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary hover:underline"
                  >
                    <span className="material-symbols-outlined text-[18px]">policy</span>
                    {t.privacyPolicyFull}
                  </a>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      if (mandatoryConsent) setStep(3);
                    }}
                    disabled={!mandatoryConsent}
                    className={`w-full h-14 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-base ${
                      mandatoryConsent
                        ? "bg-secondary text-white hover:opacity-95 cursor-pointer shadow-md active:scale-[0.98]"
                        : "bg-surface-variant text-outline-variant cursor-not-allowed"
                    }`}
                  >
                    <span>{t.proceedRegistration}</span>
                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                  </button>
                  <button 
                    onClick={() => setStep(1)}
                    className="w-full h-14 border-2 border-outline-variant text-secondary font-bold rounded-xl hover:bg-surface-container-low transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-base cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                    {t.back}
                  </button>
                </div>
                <p className="text-center text-[10px] text-outline font-semibold">{t.step} 2 {t.stepOf}</p>
              </div>

              {/* Steps Progress card for Step 2 */}
              <div className="p-6 bg-white border border-outline-variant rounded-xl shadow-sm space-y-4 mt-6">
                <h3 className="font-bold text-sm text-primary">{lang === "th" ? "ขั้นตอนทั้งหมด" : "Steps Progress"}</h3>
                <ul className="space-y-3.5 text-xs font-semibold">
                  <li className="flex items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-green-600 !text-xl">check_circle</span>
                    <span>{t.navInfo}</span>
                  </li>
                  <li className="flex items-center gap-2 text-secondary">
                    <div className="w-5 h-5 rounded-full border-2 border-secondary flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-secondary"></div>
                    </div>
                    <span>{t.navConsent}</span>
                  </li>
                  <li className="flex items-center gap-2 text-outline">
                    <span className="material-symbols-outlined !text-xl">radio_button_unchecked</span>
                    <span>{t.navRegister}</span>
                  </li>
                  <li className="flex items-center gap-2 text-outline">
                    <span className="material-symbols-outlined !text-xl">radio_button_unchecked</span>
                    <span>{t.navSuccess}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Customer Registration form */}
        {step === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 bg-white border border-outline-variant rounded-xl p-6 md:p-10 shadow-[0px_4px_12px_rgba(15,23,42,0.05)]">
              <div className="mb-6">
                <h2 className="font-bold text-2xl text-primary">{t.regTitle}</h2>
                <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">{t.regSubtitle}</p>
              </div>

              {hasActiveSession && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex gap-3 items-start animate-fade-in shadow-sm">
                  <span className="material-symbols-outlined text-emerald-600 mt-0.5">
                    bolt
                  </span>
                  <p className="text-xs font-semibold text-emerald-800 leading-relaxed">
                    {t.sessionAutofilled}
                  </p>
                </div>
              )}

              {!canShowFullForm ? (
                <form onSubmit={handleRequestOtp} className="space-y-6">
                  {verificationMode === "EMAIL" ? (
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-bold text-on-surface" htmlFor="email">
                        {lang === "th" ? "โปรดระบุอีเมลเพื่อยืนยันตัวตนก่อนกรอกที่อยู่ติดตั้ง" : "Enter your email address to verify identity before entering address"} <span className="text-error font-bold">*</span>
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant">mail</span>
                        <input 
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="example@windowasia.com"
                          className="w-full h-14 pl-12 pr-4 bg-surface-container-low border-b-2 border-transparent focus:border-secondary focus:ring-0 rounded-t outline-none text-base font-semibold"
                        />
                      </div>
                      {errors.email && <span className="text-xs text-error font-semibold">{errors.email}</span>}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-bold text-on-surface" htmlFor="phone">
                        {lang === "th" ? "โปรดระบุเบอร์โทรศัพท์เพื่อยืนยันตัวตนก่อนกรอกที่อยู่ติดตั้ง" : "Enter your phone number to verify identity before entering address"} <span className="text-error font-bold">*</span>
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant">phone</span>
                        <input 
                          type="tel"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="0891234567"
                          maxLength={10}
                          className="w-full h-14 pl-12 pr-4 bg-surface-container-low border-b-2 border-transparent focus:border-secondary focus:ring-0 rounded-t outline-none text-base font-semibold"
                        />
                      </div>
                      {errors.phone && <span className="text-xs text-error font-semibold">{errors.phone}</span>}
                    </div>
                  )}

                  {submitError && (
                    <div className="p-4 bg-error/10 border border-error/20 rounded-xl flex gap-2.5 text-xs text-error font-semibold leading-relaxed animate-success">
                      <span className="material-symbols-outlined flex-shrink-0 text-[18px]">error</span>
                      <span>{submitError}</span>
                    </div>
                  )}

                  <div className="pt-6 flex flex-col md:flex-row gap-4">
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full md:flex-1 h-14 bg-secondary text-white font-bold rounded-xl shadow-md hover:opacity-95 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-base cursor-pointer"
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <span>
                            {verificationMode === "EMAIL"
                              ? (lang === "th" ? "ขอรหัส OTP ทางอีเมล" : "Request Email OTP")
                              : (lang === "th" ? "ขอรหัส OTP" : "Request OTP")}
                          </span>
                          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                        </>
                      )}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setStep(2)}
                      className="w-full md:flex-1 h-14 border-2 border-outline-variant text-secondary font-bold rounded-xl hover:bg-surface-container-low transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-base cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                      {t.back}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="space-y-6">
                  {/* Name section is always shown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-on-surface" htmlFor="firstName">{t.firstName} <span className="text-error font-bold">*</span></label>
                      <input 
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder={lang === "th" ? "สมชาย" : "John"}
                        disabled={showAutofillPrompt || hasActiveSession}
                        className="h-12 px-4 bg-surface-container-low border-b-2 border-transparent focus:border-secondary focus:ring-0 rounded-t outline-none text-sm font-medium disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                      {errors.firstName && <span className="text-xs text-error font-semibold">{errors.firstName}</span>}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-on-surface" htmlFor="lastName">{t.lastName} <span className="text-error font-bold">*</span></label>
                      <input 
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder={lang === "th" ? "ดีใจ" : "Doe"}
                        disabled={showAutofillPrompt || hasActiveSession}
                        className="h-12 px-4 bg-surface-container-low border-b-2 border-transparent focus:border-secondary focus:ring-0 rounded-t outline-none text-sm font-medium disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                      {errors.lastName && <span className="text-xs text-error font-semibold">{errors.lastName}</span>}
                    </div>
                  </div>

                  {/* Returning Customer Autofill Prompt - visible only when prompt is active */}
                  {autofilledProfile && showAutofillPrompt ? (
                    <div className="p-5 bg-secondary-container/5 border border-secondary/20 rounded-2xl space-y-4 shadow-sm animate-success">
                      <div className="flex gap-3">
                        <span className="material-symbols-outlined text-secondary text-2xl">account_circle</span>
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm text-primary">
                            {lang === "th" ? "พบข้อมูลที่อยู่ลงทะเบียนเดิมของคุณในระบบ" : "Found your previously registered profile"}
                          </h4>
                          <p className="text-xs text-on-surface-variant leading-relaxed font-semibold mt-0.5">
                            ที่อยู่ติดตั้งล่าสุด: {autofilledProfile.address} จ.{getProvinceLabel(autofilledProfile.province, lang)} {autofilledProfile.postalCode}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <button
                          type="button"
                          onClick={handleUseAutofilled}
                          className="h-12 bg-secondary text-white font-extrabold text-xs rounded-xl shadow hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-base">check_circle</span>
                          <span>{lang === "th" ? "ใช้ที่อยู่ติดตั้งหลังเดิม" : "Use existing address"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleClearAddressForNew}
                          className="h-12 border border-outline-variant text-outline hover:text-primary font-extrabold text-xs rounded-xl hover:bg-surface-container-low active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-base">add_home</span>
                          <span>{lang === "th" ? "ระบุที่อยู่ติดตั้งหลังใหม่" : "Register at a new location"}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    // The rest of the form - visible when prompt is answered or completely new customer
                    <>
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-on-surface" htmlFor="address">{t.address} <span className="text-error font-bold">*</span></label>
                          {isUsingExistingAddress && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsUsingExistingAddress(false);
                                setFormData(prev => ({ ...prev, address: "", province: "", postalCode: "" }));
                                setGpsLocation(null);
                              }}
                              className="text-xs font-bold text-secondary hover:underline cursor-pointer flex items-center gap-0.5 animate-success"
                            >
                              <span className="material-symbols-outlined !text-[12px]">edit</span>
                              ลงทะเบียนบ้านหลังใหม่
                            </button>
                          )}
                        </div>
                        <textarea 
                          id="address"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          disabled={hasActiveSession || isUsingExistingAddress}
                          placeholder={lang === "th" ? "เช่น 123/45 หมู่บ้านวินโดว์ ซอย 4 ถนนสุขุมวิท..." : "e.g. 123/45 Suite 4B, Grand Residence..."}
                          rows={3}
                          className="p-4 bg-surface-container-low border-b-2 border-transparent focus:border-secondary focus:ring-0 rounded-t outline-none text-sm font-medium resize-none disabled:opacity-75 disabled:cursor-not-allowed"
                        />
                        {errors.address && <span className="text-xs text-error font-semibold">{errors.address}</span>}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-bold text-on-surface" htmlFor="province">{t.province} <span className="text-error font-bold">*</span></label>
                          <select 
                            id="province"
                            name="province"
                            value={formData.province}
                            onChange={handleInputChange}
                            disabled={hasActiveSession || isUsingExistingAddress}
                            className="h-12 px-4 bg-surface-container-low border-b-2 border-transparent focus:border-secondary focus:ring-0 rounded-t outline-none text-sm font-medium disabled:opacity-75 disabled:cursor-not-allowed"
                          >
                            <option value="">-- {t.selectProvince} --</option>
                            {THAILAND_PROVINCES.map((prov) => (
                              <option key={prov.en} value={lang === "th" ? prov.th : prov.en}>
                                {lang === "th" ? prov.th : prov.en}
                              </option>
                            ))}
                          </select>
                          {errors.province && <span className="text-xs text-error font-semibold">{errors.province}</span>}
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-bold text-on-surface" htmlFor="postalCode">{t.postalCode} <span className="text-error font-bold">*</span></label>
                          <input 
                            type="text"
                            id="postalCode"
                            name="postalCode"
                            value={formData.postalCode}
                            onChange={handleInputChange}
                            disabled={hasActiveSession || isUsingExistingAddress}
                            placeholder="10110"
                            maxLength={5}
                            className="h-12 px-4 bg-surface-container-low border-b-2 border-transparent focus:border-secondary focus:ring-0 rounded-t outline-none text-sm font-medium disabled:opacity-75 disabled:cursor-not-allowed"
                          />
                          {errors.postalCode && <span className="text-xs text-error font-semibold">{errors.postalCode}</span>}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-bold text-on-surface" htmlFor="phone">
                            {t.phone} {(verificationMode === "OTP" || verificationMode === "EMAIL") && <span className="text-error font-bold">*</span>}
                          </label>
                          <input 
                            type="tel"
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            disabled={verificationMode === "OTP" || hasActiveSession}
                            className={`h-12 px-4 border-b-2 border-transparent focus:border-secondary focus:ring-0 rounded-t outline-none text-sm font-medium ${
                              verificationMode === "OTP" || hasActiveSession
                                ? "bg-surface-container-low/60 text-outline cursor-not-allowed"
                                : "bg-surface-container-low"
                            }`}
                          />
                          {errors.phone && <span className="text-xs text-error font-semibold">{errors.phone}</span>}
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-bold text-on-surface" htmlFor="email">
                            {t.email} {verificationMode === "EMAIL" && <span className="text-error font-bold">*</span>}
                          </label>
                          <input 
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="john.doe@example.com"
                            disabled={verificationMode === "EMAIL" || hasActiveSession}
                            className={`h-12 px-4 border-b-2 border-transparent focus:border-secondary focus:ring-0 rounded-t outline-none text-sm font-medium ${
                              verificationMode === "EMAIL" || hasActiveSession
                                ? "bg-surface-container-low/60 text-outline cursor-not-allowed"
                                : "bg-surface-container-low"
                            }`}
                          />
                          {errors.email && <span className="text-xs text-error font-semibold">{errors.email}</span>}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-6">
                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-bold text-on-surface" htmlFor="installationPosition">
                            {lang === "th" ? "จุดติดตั้งสินค้า (เช่น ห้องนอนชั้น 2, หน้าบ้าน)" : "Installation Location (e.g. Master Bedroom, Kitchen)"} <span className="text-outline text-[10px] font-normal">(Optional)</span>
                          </label>
                          <input 
                            type="text"
                            id="installationPosition"
                            name="installationPosition"
                            value={formData.installationPosition}
                            onChange={handleInputChange}
                            placeholder={lang === "th" ? "ระบุตำแหน่งที่ติดตั้งบานนี้" : "e.g. Living room, Kitchen, Bedroom"}
                            className="h-12 px-4 bg-surface-container-low border-b-2 border-transparent focus:border-secondary focus:ring-0 rounded-t outline-none text-sm font-medium"
                          />
                        </div>
                      </div>

                      {/* GPS Location Section */}
                      <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant space-y-3">
                        <div className="flex items-start gap-3.5">
                          <span className="material-symbols-outlined text-secondary text-2xl mt-0.5">
                            location_on
                          </span>
                          <div className="space-y-1 flex-1">
                            <h3 className="font-bold text-sm text-primary">{t.gpsLabel}</h3>
                            <p className="text-xs text-on-surface-variant leading-relaxed">
                              {gpsLocation
                                ? (lang === "th" ? "พิกัดสถานที่ติดตั้งถูกบันทึกไว้เรียบร้อยแล้ว" : "Installation location coordinates are saved.")
                                : t.gpsDesc}
                            </p>
                          </div>
                        </div>
                        
                        {gpsLocation ? (
                          // GPS coordinates already available - show verified badge
                          <div className="pt-1 flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                              <span className="material-symbols-outlined !text-base text-emerald-600" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                              <span>{lang === "th" ? "พิกัดที่ติดตั้ง:" : "Location:"}</span>
                            </div>
                            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50/50 px-3 py-1.5 rounded-md border border-emerald-100">
                              Lat: {gpsLocation.latitude.toFixed(6)}, Lng: {gpsLocation.longitude.toFixed(6)}
                            </span>
                            {isUsingExistingAddress && (
                              <span className="text-[10px] text-outline font-medium">
                                ({lang === "th" ? "จากประวัติลงทะเบียนเดิม" : "from previous registration"})
                              </span>
                            )}
                          </div>
                        ) : (
                          // No GPS - show fetch button
                          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center pt-2">
                            <button
                              type="button"
                              onClick={handleFetchGps}
                              disabled={isGpsLoading}
                              className={`inline-flex items-center gap-2 px-5 h-11 rounded-lg text-xs font-bold transition-all active:scale-[0.98] cursor-pointer ${
                                isGpsLoading
                                  ? "bg-surface-variant text-outline-variant cursor-not-allowed border border-transparent"
                                  : "bg-secondary/10 hover:bg-secondary/15 text-secondary border border-secondary/25"
                              }`}
                            >
                              {isGpsLoading ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin"></div>
                                  <span>{t.gpsLoading}</span>
                                </>
                              ) : (
                                <>
                                  <span className="material-symbols-outlined text-lg">my_location</span>
                                  <span>{t.gpsButton}</span>
                                </>
                              )}
                            </button>

                            {gpsErrorMsg && (
                              <span className="text-[11px] font-medium text-error leading-normal">
                                {gpsErrorMsg}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {submitError && (
                        <div className="p-4 mb-4 bg-error/10 border border-error/20 rounded-xl flex gap-2.5 text-xs text-error font-semibold leading-relaxed animate-success">
                          <span className="material-symbols-outlined flex-shrink-0 text-[18px]">error</span>
                          <span>{submitError}</span>
                        </div>
                      )}

                      <div className="pt-8 border-t border-outline-variant flex flex-col md:flex-row gap-4">
                        <button 
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full md:flex-1 h-14 bg-secondary text-white font-bold rounded-xl shadow-md hover:opacity-95 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-base cursor-pointer"
                        >
                          {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <>
                              <span>{isPhoneVerified ? (lang === "th" ? "ลงทะเบียนรับประกันสินค้า" : "Register Product Warranty") : t.submitReg}</span>
                              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}

                  {/* Always render Back to contact edit button at the bottom of the form block */}
                  <div className="pt-4 flex">
                    <button 
                      type="button"
                      onClick={() => {
                        localStorage.removeItem("proregis_otp_session");
                        localStorage.removeItem("proregis_customer_session");
                        setFormData((prev) => ({
                          ...prev,
                          phone: "",
                          firstName: "",
                          lastName: "",
                          address: "",
                          province: "",
                          postalCode: "",
                          email: "",
                        }));
                        setHasActiveSession(false);
                        setIsPhoneVerified(false);
                        setIsUsingExistingAddress(false);
                        setShowAutofillPrompt(false);
                        setAutofilledProfile(null);
                      }}
                      className="w-full h-14 border-2 border-outline-variant text-secondary font-bold rounded-xl hover:bg-surface-container-low transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-base cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                      {verificationMode === "EMAIL"
                        ? (lang === "th" ? "แก้ไขอีเมล" : "Change Email Address")
                        : (lang === "th" ? "แก้ไขเบอร์โทรศัพท์" : "Change Phone Number")}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Sidebar info */}
            <div className="lg:col-span-4 space-y-6">
              <div className="p-6 bg-surface-container border border-outline-variant rounded-xl flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-on-secondary-container">verified_user</span>
                </div>
                <h3 className="font-bold text-sm text-primary mb-2">{lang === "th" ? "การลงทะเบียนที่ปลอดภัย" : "Secure Registration"}</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {lang === "th" 
                    ? "ข้อมูลของคุณจะได้รับการจัดเก็บอย่างปลอดภัยด้วยการเข้ารหัส SSL และใช้เฉพาะเพื่อวัตถุประสงค์ในการยืนยันสิทธิ์รับประกันสินค้าเท่านั้น" 
                    : "Your data is stored securely using SSL encryption and is used exclusively for verifying your warranty rights."}
                </p>
              </div>

              <div className="p-6 bg-white border border-outline-variant rounded-xl shadow-sm space-y-4">
                <h3 className="font-bold text-sm text-primary">{lang === "th" ? "ขั้นตอนทั้งหมด" : "Steps Progress"}</h3>
                <ul className="space-y-3.5 text-xs font-semibold">
                  <li className="flex items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-green-600 !text-xl">check_circle</span>
                    <span>{t.navInfo}</span>
                  </li>
                  <li className="flex items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-green-600 !text-xl">check_circle</span>
                    <span>{t.navConsent}</span>
                  </li>
                  <li className="flex items-center gap-2 text-secondary">
                    <div className="w-5 h-5 rounded-full border-2 border-secondary flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-secondary"></div>
                    </div>
                    <span>{t.navRegister}</span>
                  </li>
                  <li className="flex items-center gap-2 text-outline">
                    <span className="material-symbols-outlined !text-xl">radio_button_unchecked</span>
                    <span>{t.navSuccess}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Registration Success / Warranty Dashboard */}
        {step === 4 && (
          <div className="space-y-8 animate-success">
            {isRegisteredAtSite ? (
              /* =====================================================================
                 WARRANTY DASHBOARD (STATIC QR MODE FOR EXISTING CUSTOMERS)
                 ===================================================================== */
              <div className="space-y-6">
                <section className="flex flex-col items-center text-center py-6">
                  <div className="w-20 h-20 bg-secondary-container rounded-full flex items-center justify-center mb-6 shadow-md border border-secondary/20">
                    <span className="material-symbols-outlined text-secondary !text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                      shield
                    </span>
                  </div>
                  <h2 className="font-bold text-2xl md:text-3xl text-primary tracking-tight">
                    {lang === "th" ? "แดชบอร์ดรับประกันสินค้า" : "Warranty Dashboard"}
                  </h2>
                  <p className="text-sm text-on-surface-variant max-w-lg mt-2 leading-relaxed">
                    {lang === "th"
                      ? "สินค้ารุ่นนี้ได้รับการเปิดใช้งานสิทธิ์รับประกันภัยเรียบร้อยแล้ว ณ จุดติดตั้งของคุณ"
                      : "This product lot has active lifetime warranty coverage at your site."}
                  </p>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Installation Details card */}
                  <div className="lg:col-span-7 bg-white rounded-xl p-6 border border-outline-variant shadow-sm space-y-4">
                    <h3 className="font-bold text-base text-primary border-b border-outline-variant/40 pb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary">house</span>
                      {lang === "th" ? "ข้อมูลจุดติดตั้งและสเปกหลัก" : "Installation & Specs"}
                    </h3>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-xs">
                      <div>
                        <p className="text-[10px] text-outline font-bold uppercase tracking-wider">{lang === "th" ? "ชื่อลูกค้า" : "Name"}</p>
                        <p className="text-sm text-primary font-semibold mt-1">{formData.firstName} {formData.lastName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-outline font-bold uppercase tracking-wider">{lang === "th" ? "เบอร์โทรศัพท์" : "Phone"}</p>
                        <p className="text-sm text-primary font-semibold mt-1">{formData.phone}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] text-outline font-bold uppercase tracking-wider">{lang === "th" ? "ที่อยู่ติดตั้ง" : "Address"}</p>
                        <p className="text-sm text-primary font-medium mt-1 leading-normal">{formData.address} จ.{formData.province} {formData.postalCode}</p>
                      </div>
                      {lineProfileName && (
                        <div className="col-span-2">
                          <p className="text-[10px] text-outline font-bold uppercase tracking-wider">LINE ID</p>
                          <p className="text-sm text-primary font-semibold mt-1 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#06C755]"></span>
                            {lineProfileName}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Registered Units list bento card */}
                  <div className="lg:col-span-5 bg-white rounded-xl p-6 border border-outline-variant shadow-sm space-y-4 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-base text-primary border-b border-outline-variant/40 pb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary">fact_check</span>
                        {lang === "th" ? "จำนวนชิ้นที่คุ้มครองแล้ว" : "Registered Units"}
                      </h3>
                      
                      <div className="my-4 flex items-center justify-between">
                        <span className="text-sm text-on-surface-variant font-medium">{lang === "th" ? "จำนวนสินค้าที่รับประกันสะสม:" : "Active warranty count:"}</span>
                        <span className="text-2xl font-black text-secondary px-3.5 py-1 bg-secondary-container/20 rounded-full border border-secondary/20">{registrationHistory.length} {lang === "th" ? "ชิ้น" : "Units"}</span>
                      </div>

                      <div className="max-h-36 overflow-y-auto space-y-2 pr-1 text-xs">
                        {registrationHistory.map((reg, idx) => (
                          <div key={reg.id} className="flex justify-between items-center p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/20">
                            <span className="font-semibold text-primary">{lang === "th" ? `ชิ้นที่ ${idx + 1}` : `Unit ${idx + 1}`}</span>
                            <span className="text-[10px] text-on-surface-variant font-medium">
                              {new Date(reg.registeredAt).toLocaleDateString(lang === "th" ? "th-TH" : "en-US", { year: "numeric", month: "short", day: "numeric" })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action: register additional unit */}
                    <div className="pt-4 border-t border-outline-variant/40 space-y-2">
                      <button
                        onClick={() => setShowScanner(true)}
                        className="w-full h-12 bg-secondary text-white font-bold rounded-xl shadow-md hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                        <span>{lang === "th" ? "ลงทะเบียนเพิ่มเติม" : "Register Additional Product"}</span>
                      </button>
                      <button
                        onClick={() => router.push("/my-warranty")}
                        className="w-full h-12 bg-transparent border-2 border-secondary text-secondary hover:bg-secondary/5 font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition-all cursor-pointer mt-2"
                      >
                        <span className="material-symbols-outlined text-[18px]">local_police</span>
                        <span>{lang === "th" ? "ดูรายการรับประกันทั้งหมดของฉัน" : "View All My Warranties"}</span>
                      </button>
                      {submitError && (
                        <p className="text-[10px] text-error font-semibold text-center mt-1">{submitError}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* =====================================================================
                 ORIGINAL REGISTRATION SUCCESS VIEW
                 ===================================================================== */
              <>
                <section className="flex flex-col items-center text-center py-6">
                  <div className="w-24 h-24 bg-secondary-container rounded-full flex items-center justify-center mb-6 shadow-lg shadow-secondary-container/20">
                    <span className="material-symbols-outlined text-on-secondary-container !text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                      check_circle
                    </span>
                  </div>
                  <h2 className="font-bold text-3xl text-primary">{t.successTitle}</h2>
                  <p className="text-sm text-on-surface-variant max-w-md mt-2 leading-relaxed">
                    {lang === "th" ? (
                      <>
                        ข้อมูลสินค้าและการรับประกันของคุณได้รับการบันทึกในระบบหลักของ{" "}
                        <span className="whitespace-nowrap">Window&nbsp;Asia&nbsp;PCL.</span> เรียบร้อยแล้ว
                      </>
                    ) : (
                      <>
                        Your product information and warranty details have been successfully recorded in the{" "}
                        <span className="whitespace-nowrap">Window&nbsp;Asia&nbsp;PCL.</span> registry.
                      </>
                    )}
                  </p>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-8 bg-white rounded-xl p-6 border border-outline-variant shadow-[0px_4px_12px_rgba(15,23,42,0.05)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                      <span className="material-symbols-outlined !text-[120px]">verified</span>
                    </div>
                    <p className="text-[10px] text-secondary font-bold uppercase tracking-widest mb-1">{t.refCode}</p>
                    <h3 className="font-extrabold text-2xl md:text-3xl text-primary tracking-wider font-mono">{refRegNumber}</h3>
                    
                    <div className="flex gap-4 mt-8 flex-wrap">
                      <div className="flex items-center gap-1.5 bg-surface-container-low px-4 py-2 rounded-full text-xs font-semibold text-on-surface">
                        <span className="material-symbols-outlined text-secondary text-sm">calendar_today</span>
                        <span>{lang === "th" ? "วันที่ลงทะเบียน: " : "Registered: "}{new Date().toLocaleDateString(lang === "th" ? "th-TH" : "en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
                      </div>
                      
                      {getWarrantyExpiryString(product.warrantyPeriod, new Date(), lang) === "LIFETIME" ? (
                        <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-full text-xs font-bold text-amber-700">
                          <span className="material-symbols-outlined text-sm text-amber-600">workspace_premium</span>
                          <span>{lang === "th" ? "รับประกัน: ตลอดอายุการใช้งาน (Lifetime)" : "Warranty: Lifetime"}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-surface-container-low px-4 py-2 rounded-full text-xs font-semibold text-on-surface">
                          <span className="material-symbols-outlined text-secondary text-sm">event_busy</span>
                          <span>{lang === "th" ? "หมดอายุวันที่: " : "Expiry: "}{getWarrantyExpiryString(product.warrantyPeriod, new Date(), lang)}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 bg-surface-container-low px-4 py-2 rounded-full text-xs font-semibold text-on-surface">
                        <span className="material-symbols-outlined text-secondary text-sm">language</span>
                        <span>{t.intlRegistry}</span>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-4 grid grid-cols-1 gap-4">
                    <button 
                      onClick={() => setShowScanner(true)}
                      className="bg-secondary text-white rounded-xl p-5 flex flex-col justify-between shadow-md active:scale-95 transition-all cursor-pointer text-left group min-h-[120px] border border-secondary/30"
                    >
                      <div>
                        <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-lg">photo_camera</span>
                          {lang === "th" ? "สแกนชิ้นถัดไปทันที" : "Scan Next Item"}
                        </h4>
                        <p className="text-[11px] text-white/80 mt-1 leading-normal">
                          {lang === "th" 
                            ? "เปิดกล้องเพื่อสแกน QR Code ของสินค้าชิ้นถัดไปได้ทันทีจากจุดนี้"
                            : "Open in-app camera to register the next product scan immediately."}
                        </p>
                      </div>
                      <div className="flex justify-end items-center mt-2">
                        <span className="material-symbols-outlined text-sm font-bold bg-white text-secondary p-1 rounded-full group-hover:translate-x-0.5 transition-transform">
                          arrow_forward
                        </span>
                      </div>
                    </button>

                    <button 
                      onClick={() => router.push("/my-warranty")}
                      className="bg-surface-container border border-outline-variant hover:bg-surface-container-high rounded-xl p-5 flex flex-col justify-between shadow-xs active:scale-95 transition-all cursor-pointer text-left group min-h-[120px]"
                    >
                      <div>
                        <h4 className="font-bold text-sm text-primary flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-lg">local_police</span>
                          {lang === "th" ? "ดูรายการรับประกันทั้งหมด" : "View All Warranties"}
                        </h4>
                        <p className="text-[11px] text-on-surface-variant mt-1 leading-normal">
                          {lang === "th" 
                            ? "เรียกดูสิทธิ์การรับประกันสินค้าทั้งหมดที่คุณได้ลงทะเบียนไว้แล้ว"
                            : "Retrieve all registered product warranty rights under your phone/email."}
                        </p>
                      </div>
                      <div className="flex justify-end items-center mt-2">
                        <span className="material-symbols-outlined text-sm font-bold bg-white text-primary border border-outline-variant p-1 rounded-full group-hover:translate-x-0.5 transition-transform">
                          arrow_forward
                        </span>
                      </div>
                    </button>

                    <button 
                      onClick={() => router.push("/")}
                      className="bg-primary text-white rounded-xl p-5 flex flex-col justify-between shadow-md active:scale-95 transition-all cursor-pointer text-left group min-h-[120px]"
                    >
                      <div>
                        <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-lg">home</span>
                          {t.backDashboard}
                        </h4>
                        <p className="text-[11px] text-white/80 mt-1 leading-normal">
                          {t.backDashboardDesc}
                        </p>
                      </div>
                      <div className="flex justify-end items-center mt-2">
                        <span className="material-symbols-outlined text-sm font-bold bg-white text-primary p-1 rounded-full group-hover:translate-x-0.5 transition-transform">
                          arrow_forward
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Backoffice controls, support info and other elements shared by success screen */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Benefits summary list */}
              <div className="md:col-span-12 bg-white rounded-xl p-6 md:p-8 border border-outline-variant shadow-sm space-y-6">
                <h4 className="font-bold text-lg text-primary">{t.benefitsTitle}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-surface-container-low rounded-lg flex items-center justify-center">
                      <span className="material-symbols-outlined text-secondary text-2xl">verified_user</span>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-primary">{t.benefit1Title}</p>
                      <p className="text-xs text-on-surface-variant mt-1 leading-normal">
                        {getWarrantyExpiryString(product.warrantyPeriod, new Date(), lang) === "LIFETIME" ? (
                          lang === "th" 
                            ? "เปิดใช้งานการรับประกันสินค้าแบบตลอดอายุการใช้งาน (Lifetime Warranty) เรียบร้อยแล้ว"
                            : "Your Lifetime Product Warranty is active starting today."
                        ) : (
                          lang === "th"
                            ? `การรับประกันสินค้าเต็มจำนวน (${product.warrantyPeriod}) เริ่มมีผลตั้งแต่วันนี้เป็นต้นไป`
                            : `Your full ${product.warrantyPeriod} warranty is active starting today.`
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-surface-container-low rounded-lg flex items-center justify-center">
                      <span className="material-symbols-outlined text-secondary text-2xl">menu_book</span>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-primary">{t.benefit2Title}</p>
                      <p className="text-xs text-on-surface-variant mt-1 leading-normal">{t.benefit2Desc}</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-surface-container-low rounded-lg flex items-center justify-center">
                      <span className="material-symbols-outlined text-secondary text-2xl">workspace_premium</span>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-primary">{t.benefit3Title}</p>
                      <p className="text-xs text-on-surface-variant mt-1 leading-normal">{t.benefit3Desc}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* VIP Customer Support contacts */}
              <div className="md:col-span-12 bg-surface-container-high rounded-xl p-6 md:p-8 space-y-4">
                <div>
                  <h4 className="font-bold text-lg text-primary">
                    {lang === "th" ? (
                      <>
                        ฝ่ายบริการลูกค้า <span className="whitespace-nowrap">Window&nbsp;Asia&nbsp;PCL.</span>
                      </>
                    ) : (
                      <>
                        <span className="whitespace-nowrap">Window&nbsp;Asia&nbsp;PCL.</span> Customer Support
                      </>
                    )}
                  </h4>
                  <p className="text-xs text-on-surface-variant mt-1">{t.csSubtitle}</p>
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  <a href="tel:0614193518" className="flex items-center gap-2 bg-white border border-outline-variant px-4 py-2.5 rounded-lg text-xs font-semibold text-primary hover:bg-surface-container-low transition-colors">
                    <span className="material-symbols-outlined">call</span>
                    <span>{t.csPhone}</span>
                  </a>
                  <a href="mailto:waservice@windowasia.com" className="flex items-center gap-2 bg-white border border-outline-variant px-4 py-2.5 rounded-lg text-xs font-semibold text-primary hover:bg-surface-container-low transition-colors">
                    <span className="material-symbols-outlined">mail</span>
                    <span>{t.csEmail}</span>
                  </a>
                  <a 
                    href="https://line.me/R/ti/p/@windowasia"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-[#06C755] text-white px-5 py-2.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-all shadow-md active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[18px]">chat</span>
                    <span>{t.csChat}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* OTP verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-success">
          <div className="bg-white border border-outline-variant rounded-2xl p-6 md:p-8 max-w-sm w-full space-y-6 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-secondary-container rounded-full flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-secondary text-2xl">sms</span>
              </div>
              <h3 className="font-bold text-lg text-primary">{t.otpTitle}</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {t.otpSubtitle.replace("{phone}", formData.phone)}
                {otpRefCode && (
                  <span className="block font-black text-secondary mt-1.5 text-xs bg-secondary-container/10 border border-secondary/20 rounded-md py-1">
                    Ref Code: {otpRefCode}
                  </span>
                )}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-2 relative">
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
                    if (otpError) setOtpError("");
                  }}
                  autoFocus
                  className="absolute inset-0 w-full h-full opacity-0 cursor-text select-none text-transparent"
                  style={{ caretColor: "transparent" }}
                />

                {otpError && <p className="text-xs text-error font-semibold text-center mt-1">{otpError}</p>}
                {smsOtpMode === "TEST" && (
                  <p className="text-[10px] text-outline text-center mt-1">
                    {lang === "th" ? "เพื่อทดสอบ โปรดป้อน: 123456" : "For testing, enter: 123456"}
                  </p>
                )}
              </div>

              <button
                onClick={handleVerifyOtp}
                disabled={otpCode.length !== 6 || isSubmitting}
                className={`w-full h-14 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-base ${
                  otpCode.length === 6 && !isSubmitting
                    ? "bg-secondary text-white hover:opacity-95 shadow-md active:scale-95 cursor-pointer"
                    : "bg-surface-variant text-outline-variant cursor-not-allowed"
                }`}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span>{t.verifyOtp}</span>
                )}
              </button>

              <div className="flex justify-between items-center text-xs pt-2">
                <button 
                  onClick={() => setShowOtpModal(false)}
                  className="text-outline font-semibold hover:underline"
                >
                  {t.cancel}
                </button>
                {otpTimer > 0 ? (
                  <span className="text-outline font-medium">
                    {t.otpCooldown.replace("{seconds}", otpTimer.toString())}
                  </span>
                ) : (
                  <button 
                    onClick={async () => {
                      setOtpTimer(60);
                      setOtpCode("");
                      setOtpError("");
                      // Resend request to API
                      try {
                        const res = await fetch(`${getApiBaseUrl()}/otp/request`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ phone: formData.phone })
                        });
                        if (res.ok) {
                          const resData = await res.json();
                          setOtpRefCode(resData.refCode || "");
                        } else {
                          const errData = await res.json().catch(() => ({}));
                          setOtpError(errData.message || (lang === "th" ? "ส่งรหัส OTP ล้มเหลว" : "Failed to resend OTP"));
                        }
                      } catch (err) {
                        console.warn("Backend not running, simulated resend.");
                        setOtpRefCode("MOCK");
                      }
                    }}
                    className="text-secondary font-bold hover:underline"
                  >
                    {t.resendOtp}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full py-8 px-margin-mobile md:px-gutter-desktop flex flex-col md:flex-row justify-between items-center gap-4 bg-surface-container-low border-t border-outline-variant">
        <div className="flex gap-6 text-xs font-semibold text-on-surface-variant">
          <a href="#" className="hover:text-secondary">{lang === "th" ? "ช่วยเหลือ" : "Help"}</a>
          <a href="#" className="hover:text-secondary">{lang === "th" ? "ข้อกำหนด" : "Terms"}</a>
          <a href="#" className="hover:text-secondary">{lang === "th" ? "ความเป็นส่วนตัว" : "Privacy"}</a>
        </div>
        <p className="text-[10px] text-outline">© 2026 Window Asia Public Company Limited. All rights reserved.</p>
      </footer>

      {/* Mobile Bottom Navigation Bar */}
      {step < 4 && (
        <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-16 pb-safe bg-white border-t border-outline-variant shadow-lg md:hidden">
          <button 
            onClick={() => setStep(1)}
            className={`flex flex-col items-center justify-center flex-1 transition-opacity ${step === 1 ? "text-secondary font-semibold" : "text-outline"}`}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: step === 1 ? "'FILL' 1" : "'FILL' 0" }}>info</span>
            <span className="text-[10px] mt-0.5">{t.navInfo}</span>
          </button>
          <button 
            onClick={() => { if (step >= 2) setStep(2); }}
            disabled={step < 2}
            className={`flex flex-col items-center justify-center flex-1 transition-opacity ${step === 2 ? "text-secondary font-semibold" : step > 2 ? "text-on-surface-variant" : "text-outline/40 cursor-not-allowed"}`}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: step === 2 ? "'FILL' 1" : "'FILL' 0" }}>fact_check</span>
            <span className="text-[10px] mt-0.5">{t.navConsent}</span>
          </button>
          <button 
            onClick={() => { if (step >= 3) setStep(3); }}
            disabled={step < 3}
            className={`flex flex-col items-center justify-center flex-1 transition-opacity ${step === 3 ? "text-secondary font-semibold" : step > 3 ? "text-on-surface-variant" : "text-outline/40 cursor-not-allowed"}`}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: step === 3 ? "'FILL' 1" : "'FILL' 0" }}>app_registration</span>
            <span className="text-[10px] mt-0.5">{t.navRegister}</span>
          </button>
          <button 
            disabled
            className="flex flex-col items-center justify-center flex-1 text-outline/40 cursor-not-allowed"
          >
            <span className="material-symbols-outlined">check_circle</span>
            <span className="text-[10px] mt-0.5">{t.navSuccess}</span>
          </button>
        </nav>
      )}

      {/* QR Code Scanner Modal Overlay */}
      {showScanner && (
        <QrScannerModal 
          onClose={() => setShowScanner(false)} 
          onScanSuccess={(scannedToken) => {
            setShowScanner(false);
            
            const getDocNum = (t: string) => {
              if (t.length === 9) return t;
              if (t.length === 12) return t.substring(0, 9);
              return t;
            };

            const scannedDocNum = getDocNum(scannedToken);
            const currentDocNum = getDocNum(token);
            const isSame = scannedToken === token || scannedDocNum === currentDocNum;

            if (isSame) {
              if (qrMode === "STATIC") {
                setDuplicateCount(registrationHistory.length || 1);
                setShowDuplicateConfirmModal(true);
              } else {
                alert(lang === "th" ? "รหัส QR Code นี้ได้รับการลงทะเบียนแล้ว" : "This QR Code is already registered.");
              }
            } else {
              router.push(`/p/${scannedToken}`);
            }
          }} 
          lang={lang} 
        />
      )}

      {/* Duplicate Registration Confirmation Modal for Static QR */}
      {showDuplicateConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-outline-variant p-6 md:p-8 shadow-2xl text-center space-y-6 animate-success">
            <div className="w-16 h-16 bg-secondary/15 rounded-full flex items-center justify-center mx-auto border border-secondary/20">
              <span className="material-symbols-outlined text-secondary !text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                help
              </span>
            </div>
            <div className="space-y-3">
              <h3 className="font-bold text-xl text-primary">
                {lang === "th" ? "พบข้อมูลการลงทะเบียนซ้ำ" : "Duplicate Registration Found"}
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {lang === "th" 
                  ? `ระบบตรวจสอบพบว่าคุณได้รับการลงทะเบียนรับประกันสินค้าในรุ่นนี้ที่พิกัดบ้านของคุณแล้วจำนวน ${duplicateCount} ชิ้น คุณต้องการลงทะเบียนเพิ่มเติมเป็นชิ้นที่ ${duplicateCount + 1} หรือไม่?`
                  : `Our system detected that you already have ${duplicateCount} registered unit(s) of this product model at your location. Would you like to register an additional unit as unit ${duplicateCount + 1}?`}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleAddUnit}
                disabled={isSubmitting}
                className="w-full sm:flex-1 h-12 bg-secondary text-white font-bold rounded-xl shadow-md hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 text-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">add_circle</span>
                    <span>
                      {lang === "th" ? `ลงทะเบียนชิ้นที่ ${duplicateCount + 1}` : `Register unit ${duplicateCount + 1}`}
                    </span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDuplicateConfirmModal(false);
                  localStorage.removeItem("proregis_customer_session");
                  
                  // Clear autofill inputs to force a clean form for the new location
                  setFormData(prev => ({
                    ...prev,
                    address: "",
                    province: "",
                    postalCode: ""
                  }));
                  setGpsLocation(null);
                  setIsUsingExistingAddress(false);
                  setShowAutofillPrompt(false);
                  setAutofilledProfile(null);
                  setIsPhoneVerified(true);
                  
                  // Go directly to Step 3 (form input)
                  setStep(3);
                }}
                className="w-full sm:flex-1 h-12 border border-outline-variant text-primary font-semibold rounded-xl hover:bg-surface-container-low transition-all active:scale-[0.98] cursor-pointer text-sm"
              >
                {lang === "th" ? "ลงทะเบียนบ้านหลังใหม่" : "Register at a new house"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
