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
  const [selectedTables, setSelectedTables] = useState<string[]>(["registrations", "generation_logs", "production_orders", "audit_logs"]);

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

  // Email & SMTP settings
  const [emailOtpMode, setEmailOtpMode] = useState("TEST");
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpSecure, setSmtpSecure] = useState("false");
  const [smtpUser, setSmtpUser] = useState("itwindowasia@gmail.com");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFromName, setSmtpFromName] = useState("Window Asia Warranty");
  const [smtpFromEmail, setSmtpFromEmail] = useState("itwindowasia@gmail.com");
  const [smtpEmailSubject, setSmtpEmailSubject] = useState("");
  const [smtpEmailBody, setSmtpEmailBody] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testEmailError, setTestEmailError] = useState("");
  const [testEmailSuccess, setTestEmailSuccess] = useState("");

  // Password Visibility Toggle and Timer
  const [showPassword, setShowPassword] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [passwordTimer, setPasswordTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Central IAM SSO & Governance States
  const [ciamBaseUrl, setCiamBaseUrl] = useState("https://ciam.windowasia.com");
  const [ciamClientId, setCiamClientId] = useState("proregis-spoke-client");
  const [ciamClientSecret, setCiamClientSecret] = useState("");
  const [ciamClientSecretMasked, setCiamClientSecretMasked] = useState("sec_****_2026");
  const [ciamM2mKey, setCiamM2mKey] = useState("");
  const [ciamM2mKeyMasked, setCiamM2mKeyMasked] = useState("sec_****_2026");
  const [ciamSsoEnabled, setCiamSsoEnabled] = useState(true);
  const [ciamBreakGlassActive, setCiamBreakGlassActive] = useState(false);
  const [ciamAdGatewayUrl, setCiamAdGatewayUrl] = useState("http://172.18.0.1:3100");
  const [ciamAutoProvisionGroup, setCiamAutoProvisionGroup] = useState("IMAGE_EDITOR");
  const [ciamSessionTtlMinutes, setCiamSessionTtlMinutes] = useState(480);
  const [showCiamSecret, setShowCiamSecret] = useState(false);

  // CIAM Connection Test & Sync States
  const [ciamOnline, setCiamOnline] = useState<boolean | null>(null);
  const [ciamTestInfo, setCiamTestInfo] = useState<{
    latency_ms?: number;
    ciam_issuer?: string;
    jwks_uri?: string;
    key_id?: string;
    message?: string;
  } | null>(null);
  const [isTestingCiam, setIsTestingCiam] = useState(false);
  const [isSyncingAccounts, setIsSyncingAccounts] = useState(false);
  const [syncResultMsg, setSyncResultMsg] = useState("");
  const [syncResultErr, setSyncResultErr] = useState("");

  // Break-Glass Emergency Modal / Confirmation
  const [breakGlassReason, setBreakGlassReason] = useState("");
  const [isTogglingBreakGlass, setIsTogglingBreakGlass] = useState(false);
  const [breakGlassMsg, setBreakGlassMsg] = useState("");

  // In-App AI Copilot & MCP Tools States (Category E)
  const [aiCopilotEnabled, setAiCopilotEnabled] = useState(false);
  const [aiProvider, setAiProvider] = useState("google");
  const [aiModel, setAiModel] = useState("gemini-1.5-flash");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiApiKeyMasked, setAiApiKeyMasked] = useState<string | null>(null);
  const [aiBaseUrl, setAiBaseUrl] = useState("");
  const [aiSystemPrompt, setAiSystemPrompt] = useState("");
  const [aiAllowMcpTools, setAiAllowMcpTools] = useState(true);
  const [showAiKey, setShowAiKey] = useState(false);
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{
    status: string;
    latency_ms?: number;
    message: string;
  } | null>(null);

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
      const [res, ciamRes, aiRes] = await Promise.all([
        fetch(`${getApiBaseUrl()}/backoffice/settings`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${getApiBaseUrl()}/settings/ciam-sso`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
        fetch(`${getApiBaseUrl()}/settings/ai`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
      ]);

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

        // Populate Email & SMTP settings
        setEmailOtpMode(data.EMAIL_OTP_MODE?.value || "TEST");
        setSmtpHost(data.SMTP_HOST?.value || "smtp.gmail.com");
        setSmtpPort(data.SMTP_PORT?.value || "587");
        setSmtpSecure(data.SMTP_SECURE?.value || "false");
        setSmtpUser(data.SMTP_USER?.value || "itwindowasia@gmail.com");
        setSmtpPass(data.SMTP_PASS?.value || "");
        setSmtpFromName(data.SMTP_FROM_NAME?.value || "Window Asia Warranty");
        setSmtpFromEmail(data.SMTP_FROM_EMAIL?.value || "itwindowasia@gmail.com");
        setSmtpEmailSubject(data.SMTP_EMAIL_SUBJECT?.value || "");
        setSmtpEmailBody(data.SMTP_EMAIL_BODY?.value || "");
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.message || "ไม่สามารถดึงข้อมูลการตั้งค่าได้");
      }

      if (ciamRes && ciamRes.ok) {
        const ciamData = await ciamRes.json();
        const s = ciamData.settings || {};
        setCiamBaseUrl(s.ciam_base_url || "https://ciam.windowasia.com");
        setCiamClientId(s.ciam_client_id || "proregis-spoke-client");
        setCiamClientSecret("");
        setCiamClientSecretMasked(s.ciam_client_secret_masked || "sec_****_2026");
        setCiamM2mKey("");
        setCiamM2mKeyMasked(s.ciam_m2m_key_masked || "sec_****_2026");
        setCiamSsoEnabled(Boolean(s.ciam_sso_enabled));
        setCiamBreakGlassActive(Boolean(s.ciam_break_glass_active));
        setCiamAdGatewayUrl(s.ciam_ad_gateway_url || "http://172.18.0.1:3100");
        setCiamAutoProvisionGroup(s.ciam_auto_provision_group || "IMAGE_EDITOR");
        setCiamSessionTtlMinutes(Number(s.ciam_session_ttl_minutes) || 480);
        if (s.agent_status && typeof s.agent_status.online === "boolean") {
          setCiamOnline(s.agent_status.online);
        }
      }

      if (aiRes && aiRes.ok) {
        const aiData = await aiRes.json();
        setAiCopilotEnabled(Boolean(aiData.enabled));
        setAiProvider(aiData.provider || "google");
        setAiModel(aiData.model || "gemini-1.5-flash");
        setAiApiKey("");
        setAiApiKeyMasked(aiData.api_key_masked || null);
        setAiBaseUrl(aiData.base_url || "");
        setAiSystemPrompt(aiData.system_prompt || "");
        setAiAllowMcpTools(aiData.allow_mcp_tools !== undefined ? Boolean(aiData.allow_mcp_tools) : true);
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestCiamConnection = async () => {
    setIsTestingCiam(true);
    setCiamTestInfo(null);
    const token = sessionStorage.getItem("bo_token");
    try {
      const res = await fetch(`${getApiBaseUrl()}/settings/ciam-sso/test-connection`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ciam_base_url: ciamBaseUrl }),
      });
      const data = await res.json();
      setCiamOnline(data.status === "connected");
      setCiamTestInfo(data);
    } catch {
      setCiamOnline(false);
      setCiamTestInfo({ message: "ไม่สามารถเชื่อมต่อไปยังเซิร์ฟเวอร์ API ได้" });
    } finally {
      setIsTestingCiam(false);
    }
  };

  const handleImmediateAccountSync = async () => {
    setIsSyncingAccounts(true);
    setSyncResultMsg("");
    setSyncResultErr("");
    const token = sessionStorage.getItem("bo_token");
    try {
      const res = await fetch(`${getApiBaseUrl()}/settings/ciam-agent/sync-now`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.online) {
        setCiamOnline(true);
        setSyncResultMsg(
          data.message ||
            `ซิงก์ข้อมูลกับ Central IAM สำเร็จ: ปรับปรุงสถานะตรงกัน 100% (สร้างใหม่ ${data.createdCount || 0} บัญชี, ปรับสถานะ ${data.updatedCount || 0} บัญชี)`
        );
      } else {
        setCiamOnline(false);
        setSyncResultErr(data.message || "ไม่สามารถซิงก์กับ Central IAM ได้ในขณะนี้");
      }
    } catch {
      setSyncResultErr("เกิดข้อผิดพลาดในการเรียกคำสั่งซิงก์บัญชีทันที");
    } finally {
      setIsSyncingAccounts(false);
    }
  };

  const handleToggleBreakGlass = async (nextState: boolean) => {
    if (!breakGlassReason.trim()) {
      setError("กรุณาระบุเหตุผลก่อนสลับโหมดฉุกเฉิน Break-Glass");
      return;
    }
    setIsTogglingBreakGlass(true);
    setBreakGlassMsg("");
    setError("");
    const token = sessionStorage.getItem("bo_token");
    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/sso/break-glass-toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          break_glass_active: nextState,
          reason: breakGlassReason.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setCiamBreakGlassActive(nextState);
        setBreakGlassReason("");
        setBreakGlassMsg(data.message || "อัปเดตสถานะโหมดฉุกเฉิน Break-Glass เรียบร้อยแล้ว");
      } else {
        setError(data.message || "ไม่สามารถเปลี่ยนสถานะ Break-Glass ได้");
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsTogglingBreakGlass(false);
    }
  };

  const handleTestAiConnection = async () => {
    setIsTestingAi(true);
    setAiTestResult(null);
    const token = sessionStorage.getItem("bo_token");
    try {
      const res = await fetch(`${getApiBaseUrl()}/settings/ai/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          provider: aiProvider,
          model: aiModel,
          api_key: aiApiKey || undefined,
          base_url: aiBaseUrl || undefined,
        }),
      });
      const data = await res.json();
      setAiTestResult(data);
    } catch {
      setAiTestResult({
        status: "error",
        message: "ไม่สามารถทดสอบการเชื่อมต่อ AI API ได้",
      });
    } finally {
      setIsTestingAi(false);
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
      { key: "EMAIL_OTP_MODE", value: emailOtpMode },
      { key: "SMTP_HOST", value: smtpHost },
      { key: "SMTP_PORT", value: smtpPort },
      { key: "SMTP_SECURE", value: smtpSecure },
      { key: "SMTP_USER", value: smtpUser },
      { key: "SMTP_PASS", value: smtpPass },
      { key: "SMTP_FROM_NAME", value: smtpFromName },
      { key: "SMTP_FROM_EMAIL", value: smtpFromEmail },
      { key: "SMTP_EMAIL_SUBJECT", value: smtpEmailSubject },
      { key: "SMTP_EMAIL_BODY", value: smtpEmailBody },
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

      // Save Central IAM SSO settings (Group A)
      const ciamRes = await fetch(`${getApiBaseUrl()}/settings/ciam-sso`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ciam_base_url: ciamBaseUrl,
          ciam_client_id: ciamClientId,
          ciam_client_secret: ciamClientSecret || undefined,
          ciam_m2m_key: ciamM2mKey || undefined,
          ciam_sso_enabled: ciamSsoEnabled,
          ciam_ad_gateway_url: ciamAdGatewayUrl,
          ciam_auto_provision_group: ciamAutoProvisionGroup,
          ciam_session_ttl_minutes: ciamSessionTtlMinutes,
        }),
      });
      if (!ciamRes.ok) allOk = false;

      // Save In-App AI Copilot settings (Group E)
      const aiRes = await fetch(`${getApiBaseUrl()}/settings/ai`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ai_copilot_enabled: aiCopilotEnabled,
          ai_provider: aiProvider,
          ai_model: aiModel,
          ai_api_key: aiApiKey || undefined,
          ai_base_url: aiBaseUrl,
          ai_system_prompt: aiSystemPrompt,
          ai_allow_mcp_tools: aiAllowMcpTools,
        }),
      });
      if (!aiRes.ok) allOk = false;

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

  const handleTestEmailSend = async () => {
    if (!testEmail) {
      setTestEmailError("โปรดระบุอีเมลปลายทางสำหรับการทดสอบ");
      return;
    }
    setIsTestingEmail(true);
    setTestEmailError("");
    setTestEmailSuccess("");
    const token = sessionStorage.getItem("bo_token");

    try {
      const res = await fetch(`${getApiBaseUrl()}/backoffice/settings/test-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          smtpHost,
          smtpPort,
          smtpSecure,
          smtpUser,
          smtpPass,
          smtpFromName,
          smtpFromEmail,
          testEmail,
          subject: smtpEmailSubject,
          bodyTemplate: smtpEmailBody,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTestEmailSuccess(data.message || "ส่งอีเมลทดสอบสำเร็จ!");
      } else {
        const errData = await res.json().catch(() => ({}));
        setTestEmailError(errData.message || "การส่งอีเมลทดสอบล้มเหลว");
      }
    } catch {
      setTestEmailError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsTestingEmail(false);
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
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tables: selectedTables }),
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

        {/* SECTION: EMAIL OTP GATEWAY CONFIGURATIONS */}
        <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm p-6 space-y-6">
          <h2 className="font-bold text-base text-primary border-b border-outline-variant/40 pb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">mail</span>
            ระบบส่งและยืนยัน Email OTP (Email SMTP Settings)
          </h2>

          <div className="space-y-4">

            {/* SMTP Host */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">SMTP Host</label>
                <p className="text-[10px] text-outline font-semibold mt-0.5">
                  อัปเดต: {formatDateTime(dbSettings.SMTP_HOST?.updatedAt)}
                </p>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="เช่น smtp.gmail.com"
                  className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary"
                />
              </div>
            </div>

            {/* SMTP Port & Secure */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
                <div className="md:w-1/2">
                  <label className="text-xs font-bold text-primary">SMTP Port</label>
                  <p className="text-[10px] text-outline font-semibold mt-0.5">
                    อัปเดต: {formatDateTime(dbSettings.SMTP_PORT?.updatedAt)}
                  </p>
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="เช่น 587 หรือ 465"
                    className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary"
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
                <div className="md:w-1/2">
                  <label className="text-xs font-bold text-primary">การเชื่อมต่อแบบ Secure (SSL/TLS)</label>
                  <p className="text-[10px] text-outline font-semibold mt-0.5">
                    อัปเดต: {formatDateTime(dbSettings.SMTP_SECURE?.updatedAt)}
                  </p>
                </div>
                <div className="flex-1">
                  <select
                    value={smtpSecure}
                    onChange={(e) => setSmtpSecure(e.target.value)}
                    className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl outline-none text-xs font-semibold bg-surface-container-low focus:border-secondary"
                  >
                    <option value="false">STARTTLS / TLS (Port 587 - แนะนำสำหรับ Gmail)</option>
                    <option value="true">SSL (Port 465)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SMTP User (Username) */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">SMTP Username (Email)</label>
                <p className="text-[10px] text-outline font-semibold mt-0.5">
                  อัปเดต: {formatDateTime(dbSettings.SMTP_USER?.updatedAt)}
                </p>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="เช่น itwindowasia@gmail.com"
                  className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary"
                />
              </div>
            </div>

            {/* SMTP Password */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">SMTP Password (หรือ App Password)</label>
                <p className="text-[10px] text-outline font-semibold mt-0.5">
                  อัปเดต: {formatDateTime(dbSettings.SMTP_PASS?.updatedAt)}
                </p>
              </div>
              <div className="flex-1 relative">
                <input
                  type={showSmtpPassword ? "text" : "password"}
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  placeholder="App Password 16 หลักจาก Google"
                  className="w-full h-11 pl-4 pr-12 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary"
                />
                <button
                  type="button"
                  onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-primary material-symbols-outlined !text-[18px] cursor-pointer"
                >
                  {showSmtpPassword ? "visibility_off" : "visibility"}
                </button>
              </div>
            </div>

            {/* SMTP From Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
                <div className="md:w-1/2">
                  <label className="text-xs font-bold text-primary">ชื่อผู้ส่ง (Sender Display Name)</label>
                  <p className="text-[10px] text-outline font-semibold mt-0.5">
                    อัปเดต: {formatDateTime(dbSettings.SMTP_FROM_NAME?.updatedAt)}
                  </p>
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={smtpFromName}
                    onChange={(e) => setSmtpFromName(e.target.value)}
                    placeholder="เช่น Window Asia Warranty"
                    className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary"
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
                <div className="md:w-1/2">
                  <label className="text-xs font-bold text-primary">อีเมลผู้ส่ง (Sender Address)</label>
                  <p className="text-[10px] text-outline font-semibold mt-0.5">
                    อัปเดต: {formatDateTime(dbSettings.SMTP_FROM_EMAIL?.updatedAt)}
                  </p>
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={smtpFromEmail}
                    onChange={(e) => setSmtpFromEmail(e.target.value)}
                    placeholder="เช่น itwindowasia@gmail.com"
                    className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary"
                  />
                </div>
              </div>
            </div>

            {/* Email OTP Subject */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">หัวข้ออีเมล OTP (Email Subject)</label>
                <p className="text-[10px] text-outline font-semibold mt-0.5">
                  อัปเดต: {formatDateTime(dbSettings.SMTP_EMAIL_SUBJECT?.updatedAt)}
                </p>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={smtpEmailSubject}
                  onChange={(e) => setSmtpEmailSubject(e.target.value)}
                  placeholder="เช่น รหัสยืนยันตัวตนสำหรับการลงทะเบียนรับประกันสินค้า (Warranty Verification OTP)"
                  className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary"
                />
              </div>
            </div>

            {/* Email OTP Body Template */}
            <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">รูปแบบข้อความอีเมล (Email HTML Template)</label>
                <p className="text-[10px] text-outline font-semibold mt-0.5">
                  อัปเดต: {formatDateTime(dbSettings.SMTP_EMAIL_BODY?.updatedAt)}
                </p>
                <p className="text-[9px] text-outline font-normal mt-1 leading-relaxed">
                  * ใช้ตัวแปร <code className="font-bold text-secondary">{`{code}`}</code> เพื่อแทนที่รหัส OTP 6 หลักในเทมเพลต HTML
                </p>
              </div>
              <div className="flex-1">
                <textarea
                  value={smtpEmailBody}
                  onChange={(e) => setSmtpEmailBody(e.target.value)}
                  placeholder="ป้อนเทมเพลต HTML ของอีเมล..."
                  rows={8}
                  className="w-full p-4 border border-outline-variant/60 rounded-xl outline-none text-xs font-mono bg-surface-container-low focus:border-secondary resize-y"
                />
              </div>
            </div>

            {/* Test Email Send Panel */}
            <div className="pt-4 border-t border-outline-variant/40 space-y-4">
              <h3 className="text-xs font-bold text-primary flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-secondary">mail</span>
                ทดสอบระบบส่งอีเมล OTP (SMTP Test Delivery)
              </h3>
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="ระบุอีเมลผู้รับเพื่อทดสอบ (เช่น test@gmail.com)"
                    className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleTestEmailSend}
                  disabled={isTestingEmail || !testEmail}
                  className={`h-11 px-6 rounded-xl font-bold text-xs transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer ${
                    isTestingEmail || !testEmail
                      ? "bg-surface-variant text-outline-variant cursor-not-allowed"
                      : "bg-secondary text-white hover:opacity-95 shadow-sm"
                  }`}
                >
                  {isTestingEmail ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>กำลังส่ง...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">send</span>
                      <span>ทดสอบส่งอีเมล</span>
                    </>
                  )}
                </button>
              </div>
              {testEmailError && (
                <div className="p-3.5 bg-error/10 border border-error/20 rounded-xl flex gap-2 text-xs text-error font-semibold leading-relaxed animate-success">
                  <span className="material-symbols-outlined flex-shrink-0 text-[18px]">error</span>
                  <span>{testEmailError}</span>
                </div>
              )}
              {testEmailSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex gap-2 text-xs text-emerald-800 font-semibold leading-relaxed animate-success">
                  <span className="material-symbols-outlined flex-shrink-0 text-[18px] text-emerald-600">check_circle</span>
                  <span>{testEmailSuccess}</span>
                </div>
              )}
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
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setSapServiceLayerUrl("http://wa-dbs2.wa.net:50002/b1s/v2")}
                    className="px-2 py-1 bg-surface-variant text-[10px] font-bold rounded-lg hover:bg-outline-variant/40 transition-all cursor-pointer"
                  >
                    ใช้ Local Default (wa-dbs2)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSapServiceLayerUrl("https://sapb1.waapps.net/b1s/v2")}
                    className="px-2 py-1 bg-surface-variant text-[10px] font-bold rounded-lg hover:bg-outline-variant/40 transition-all cursor-pointer"
                  >
                    ใช้ VPS Production (sapb1.waapps)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSapServiceLayerUrl("mock")}
                    className="px-2 py-1 bg-surface-variant text-[10px] font-bold rounded-lg hover:bg-outline-variant/40 transition-all cursor-pointer"
                  >
                    ใช้ Mock Mode
                  </button>
                </div>
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
                  placeholder="ชื่อ Company Database ใน SAP B1"
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

        {/* SECTION: CENTRAL IAM (SSO, DIRECTORY SYNC & BREAK-GLASS) */}
        <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/40 pb-3">
            <h2 className="font-bold text-base text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">shield_person</span>
              การเชื่อมต่อ Central IAM (Single Sign-On & Directory Governance)
            </h2>
            <div className="flex items-center gap-2">
              {ciamOnline === true ? (
                <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                  🟢 เชื่อมต่อปกติ (Online)
                </span>
              ) : ciamOnline === false ? (
                <span className="px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                  🔴 ไม่สามารถเชื่อมต่อได้ (Offline)
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold">
                  ⚪ ยังไม่ได้ตรวจสอบสถานะ
                </span>
              )}
            </div>
          </div>

          {/* 1. Health & Immediate Sync Action Bar */}
          <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-primary">
                ตรวจสอบสถานะการเชื่อมต่อ & ซิงก์บัญชีผู้ใช้กับ Central IAM
              </p>
              <p className="text-[11px] text-outline mt-0.5">
                ทดสอบการดึง JWKS Public Keys (RS256) หรือสั่งแลกเปลี่ยนและปรับยอดบัญชีผู้ใช้แบบ Two-Way Reconciliation ทันทีโดยไม่ต้องรอรอบ 120 วินาที
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleTestCiamConnection}
                disabled={isTestingCiam}
                className="h-10 px-4 bg-white hover:bg-slate-50 border border-outline-variant text-primary text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
              >
                {isTestingCiam ? (
                  <div className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>⚡ ทดสอบการเชื่อมต่อไปยัง Central IAM</span>
                )}
              </button>

              <button
                type="button"
                onClick={handleImmediateAccountSync}
                disabled={isSyncingAccounts}
                className="h-10 px-4 bg-secondary hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
              >
                {isSyncingAccounts ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>⚡ ซิงก์บัญชีผู้ใช้กับ CIAM ทันที</span>
                )}
              </button>
            </div>
          </div>

          {ciamTestInfo && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-semibold space-y-1 ${
                ciamOnline
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              <p>{ciamTestInfo.message}</p>
              {ciamTestInfo.latency_ms !== undefined && (
                <p className="text-[11px] opacity-85">
                  Latency: {ciamTestInfo.latency_ms} ms | Issuer: {ciamTestInfo.ciam_issuer || "-"} | Key ID:{" "}
                  {ciamTestInfo.key_id || "-"}
                </p>
              )}
            </div>
          )}

          {syncResultMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800">
              ✅ {syncResultMsg}
            </div>
          )}
          {syncResultErr && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800">
              ⚠️ {syncResultErr}
            </div>
          )}

          {/* 2. Central IAM Configuration Form */}
          <div className="space-y-4">
            {/* Enforce SSO Toggle */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">สวิตช์เปิด/ปิด SSO (Enforce SSO)</label>
                <p className="text-[10px] text-outline mt-0.5">
                  หากปิด ปุ่ม SSO บนหน้า Login หลังบ้านจะถูกซ่อนอัตโนมัติ
                </p>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCiamSsoEnabled(true)}
                  className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    ciamSsoEnabled
                      ? "border-secondary bg-secondary/5 text-secondary ring-1 ring-secondary"
                      : "border-outline-variant/60 text-outline"
                  }`}
                >
                  เปิดใช้งาน Central IAM SSO
                </button>
                <button
                  type="button"
                  onClick={() => setCiamSsoEnabled(false)}
                  className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    !ciamSsoEnabled
                      ? "border-secondary bg-secondary/5 text-secondary ring-1 ring-secondary"
                      : "border-outline-variant/60 text-outline"
                  }`}
                >
                  ปิดใช้งาน SSO (ใช้เฉพาะฟอร์มปกติ)
                </button>
              </div>
            </div>

            {/* Central IAM Base URL */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">Central IAM Base URL</label>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={ciamBaseUrl}
                  onChange={(e) => setCiamBaseUrl(e.target.value)}
                  placeholder="https://ciam.windowasia.com"
                  className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary"
                />
              </div>
            </div>

            {/* OIDC Client ID */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">OIDC Client ID</label>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={ciamClientId}
                  onChange={(e) => setCiamClientId(e.target.value)}
                  placeholder="proregis-spoke-client"
                  className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary"
                />
              </div>
            </div>

            {/* OIDC Client Secret */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">OIDC Client Secret</label>
                <p className="text-[10px] text-outline mt-0.5">
                  ค่าปัจจุบัน: <code className="font-mono">{ciamClientSecretMasked}</code>
                </p>
              </div>
              <div className="flex-1 relative">
                <input
                  type={showCiamSecret ? "text" : "password"}
                  value={ciamClientSecret}
                  onChange={(e) => setCiamClientSecret(e.target.value)}
                  placeholder={`เว้นว่างไว้หากไม่ต้องการเปลี่ยน (${ciamClientSecretMasked})`}
                  className="w-full h-11 pl-4 pr-12 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary"
                />
                <button
                  type="button"
                  onClick={() => setShowCiamSecret(!showCiamSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-primary material-symbols-outlined !text-[18px] cursor-pointer"
                >
                  {showCiamSecret ? "visibility_off" : "visibility"}
                </button>
              </div>
            </div>

            {/* M2M Management Key */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">M2M Management API Key</label>
                <p className="text-[10px] text-outline mt-0.5">
                  ค่าปัจจุบัน: <code className="font-mono">{ciamM2mKeyMasked}</code>
                </p>
              </div>
              <div className="flex-1">
                <input
                  type={showCiamSecret ? "text" : "password"}
                  value={ciamM2mKey}
                  onChange={(e) => setCiamM2mKey(e.target.value)}
                  placeholder={`เว้นว่างไว้หากไม่ต้องการเปลี่ยน (${ciamM2mKeyMasked})`}
                  className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary"
                />
              </div>
            </div>

            {/* Active Directory Gateway URL */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">Active Directory Gateway URL</label>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={ciamAdGatewayUrl}
                  onChange={(e) => setCiamAdGatewayUrl(e.target.value)}
                  placeholder="http://172.18.0.1:3100"
                  className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary"
                />
              </div>
            </div>

            {/* Default Auto-Provision Group & Session TTL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                <div className="md:w-1/2">
                  <label className="text-xs font-bold text-primary">กลุ่มสิทธิ์เริ่มต้น (Default Group)</label>
                  <p className="text-[10px] text-outline mt-0.5">สำหรับผู้ใช้ใหม่จาก SSO / Auto-Provision</p>
                </div>
                <div className="flex-1">
                  <select
                    value={ciamAutoProvisionGroup}
                    onChange={(e) => setCiamAutoProvisionGroup(e.target.value)}
                    className="w-full h-11 px-3 border border-outline-variant/60 rounded-xl outline-none text-xs font-semibold bg-surface-container-low focus:border-secondary"
                  >
                    <option value="IMAGE_EDITOR">IMAGE_EDITOR (สิทธิ์น้อยที่สุด - แนะนำ)</option>
                    <option value="QR_GENERATOR">QR_GENERATOR (ฝ่ายผลิต/คลังสินค้า)</option>
                    <option value="CRM_MANAGER">CRM_MANAGER (ฝ่ายดูแลลูกค้า)</option>
                    <option value="SYSTEM_ADMIN">SYSTEM_ADMIN (ผู้ดูแลระบบสูงสุด)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                <div className="md:w-1/2">
                  <label className="text-xs font-bold text-primary">อายุเซสชัน (Session TTL นาที)</label>
                  <p className="text-[10px] text-outline mt-0.5">ค่าแนะนำ: 480 นาที (8 ชั่วโมง)</p>
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    min={15}
                    max={1440}
                    value={ciamSessionTtlMinutes}
                    onChange={(e) => setCiamSessionTtlMinutes(Number(e.target.value) || 480)}
                    className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Break-Glass Emergency Panel */}
          <div className="p-5 rounded-xl border border-amber-300 bg-amber-50/70 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600 !text-[22px]">emergency_home</span>
                <div>
                  <h3 className="text-xs font-bold text-amber-900">
                    สวิตช์ฉุกเฉิน Break-Glass Emergency Mode (ISO 27001)
                  </h3>
                  <p className="text-[11px] text-amber-800">
                    สลับไปล็อกอินตรงกับ AD Gateway / Local DB ทันทีเมื่อเครือข่ายคลาวด์ Central IAM ขัดข้อง (พร้อมส่งแจ้งเตือน Telegram)
                  </p>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  ciamBreakGlassActive
                    ? "bg-red-600 text-white"
                    : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                }`}
              >
                {ciamBreakGlassActive ? "🚨 BREAK-GLASS ACTIVE" : "โหมดปกติ (Inactive)"}
              </span>
            </div>

            <div className="flex flex-col md:flex-row gap-3 pt-1">
              <input
                type="text"
                value={breakGlassReason}
                onChange={(e) => setBreakGlassReason(e.target.value)}
                placeholder="ระบุเหตุผลในการสลับโหมด Break-Glass (เช่น Central IAM Cloud Maintenance)..."
                className="flex-1 h-10 px-3.5 bg-white border border-amber-300 rounded-xl text-xs font-medium text-primary outline-none focus:border-amber-600"
              />
              <button
                type="button"
                disabled={isTogglingBreakGlass || !breakGlassReason.trim()}
                onClick={() => handleToggleBreakGlass(!ciamBreakGlassActive)}
                className={`h-10 px-5 rounded-xl text-xs font-bold text-white shadow-xs transition cursor-pointer disabled:opacity-50 ${
                  ciamBreakGlassActive
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {isTogglingBreakGlass
                  ? "กำลังดำเนินการ..."
                  : ciamBreakGlassActive
                  ? "ปิดโหมดฉุกเฉิน (กลับสู่ SSO ปกติ)"
                  : "⚠️ เปิดโหมดฉุกเฉิน Break-Glass"}
              </button>
            </div>

            {breakGlassMsg && (
              <p className="text-xs font-bold text-amber-900 bg-white/80 p-2.5 rounded-lg border border-amber-200">
                {breakGlassMsg}
              </p>
            )}
          </div>
        </div>

        {/* SECTION: IN-APP AI COPILOT & MCP TOOLS (CATEGORY E) */}
        <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/40 pb-3">
            <h2 className="font-bold text-base text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">smart_toy</span>
              ผู้ช่วยอัจฉริยะประจำระบบหลังบ้าน (In-App AI Copilot & MCP Tools)
            </h2>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                aiCopilotEnabled
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                  : "bg-slate-100 border border-slate-200 text-slate-600"
              }`}
            >
              {aiCopilotEnabled ? "🟢 เปิดแสดงผล Chat Widget" : "⚫ ปิดซ่อน Chat Widget"}
            </span>
          </div>

          <div className="space-y-4">
            {/* Enable AI Copilot Toggle */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">สถานะ AI Copilot (หลังบ้าน)</label>
                <p className="text-[10px] text-outline mt-0.5">
                  หากปิด ปุ่ม Floating Chat ในระบบหลังบ้านจะถูกซ่อน 100%
                </p>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAiCopilotEnabled(true)}
                  className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    aiCopilotEnabled
                      ? "border-secondary bg-secondary/5 text-secondary ring-1 ring-secondary"
                      : "border-outline-variant/60 text-outline"
                  }`}
                >
                  เปิดใช้งาน AI Copilot Widget
                </button>
                <button
                  type="button"
                  onClick={() => setAiCopilotEnabled(false)}
                  className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    !aiCopilotEnabled
                      ? "border-secondary bg-secondary/5 text-secondary ring-1 ring-secondary"
                      : "border-outline-variant/60 text-outline"
                  }`}
                >
                  ปิดใช้งาน (ซ่อน Widget อัตโนมัติ)
                </button>
              </div>
            </div>

            {/* Provider & Model */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                <div className="md:w-1/2">
                  <label className="text-xs font-bold text-primary">ผู้ให้บริการ AI (Provider)</label>
                </div>
                <div className="flex-1">
                  <select
                    value={aiProvider}
                    onChange={(e) => setAiProvider(e.target.value)}
                    className="w-full h-11 px-3 border border-outline-variant/60 rounded-xl outline-none text-xs font-semibold bg-surface-container-low focus:border-secondary"
                  >
                    <option value="google">Google Gemini (google)</option>
                    <option value="openai">OpenAI (openai)</option>
                    <option value="anthropic">Anthropic Claude (anthropic)</option>
                    <option value="ollama">Ollama Local LLM (ollama)</option>
                    <option value="custom">Custom OpenAI-Compatible (custom)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                <div className="md:w-1/2">
                  <label className="text-xs font-bold text-primary">รหัสโมเดล (AI Model)</label>
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    placeholder="เช่น gemini-1.5-flash, gpt-4o-mini"
                    className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary"
                  />
                </div>
              </div>
            </div>

            {/* AI API Key + Test Connection Button */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">AI API Key</label>
                <p className="text-[10px] text-outline mt-0.5">
                  ค่าปัจจุบัน: <code className="font-mono">{aiApiKeyMasked || "ยังไม่ได้ตั้งค่า (ใช้ Local Fallback)"}</code>
                </p>
              </div>
              <div className="flex-1 flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type={showAiKey ? "text" : "password"}
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    placeholder={
                      aiApiKeyMasked
                        ? `เว้นว่างไว้หากใช้คีย์เดิม (${aiApiKeyMasked})`
                        : "ระบุ API Key (เช่น AIzaSy... หรือ sk-...)"
                    }
                    className="w-full h-11 pl-4 pr-10 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAiKey(!showAiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-primary material-symbols-outlined !text-[18px] cursor-pointer"
                  >
                    {showAiKey ? "visibility_off" : "visibility"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleTestAiConnection}
                  disabled={isTestingAi}
                  className="h-11 px-4 bg-secondary hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60 whitespace-nowrap"
                >
                  {isTestingAi ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>⚡ ทดสอบเชื่อมต่อ API Key</span>
                  )}
                </button>
              </div>
            </div>

            {aiTestResult && (
              <div
                className={`p-3 rounded-xl border text-xs font-semibold ${
                  aiTestResult.status === "connected"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}
              >
                {aiTestResult.message}
              </div>
            )}

            {/* Custom Endpoint URL */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">Custom Base URL (Optional)</label>
                <p className="text-[10px] text-outline mt-0.5">เฉพาะกรณีใช้ Ollama หรือ Private LLM Proxy</p>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={aiBaseUrl}
                  onChange={(e) => setAiBaseUrl(e.target.value)}
                  placeholder="เช่น http://localhost:11434/v1"
                  className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary"
                />
              </div>
            </div>

            {/* Allow MCP Tools */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">อนุญาต MCP Tools</label>
              </div>
              <div className="flex-1">
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-primary">
                  <input
                    type="checkbox"
                    checked={aiAllowMcpTools}
                    onChange={(e) => setAiAllowMcpTools(e.target.checked)}
                    className="w-4 h-4 rounded border-outline-variant text-secondary focus:ring-secondary cursor-pointer"
                  />
                  <span>อนุญาตให้ AI อ่านสถิติฐานข้อมูลหลังบ้านและเชื่อมต่อ Central IAM MCP Tools</span>
                </label>
              </div>
            </div>

            {/* AI System Prompt */}
            <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-6">
              <div className="md:w-1/4">
                <label className="text-xs font-bold text-primary">System Prompt ประจำระบบ</label>
              </div>
              <div className="flex-1">
                <textarea
                  rows={3}
                  value={aiSystemPrompt}
                  onChange={(e) => setAiSystemPrompt(e.target.value)}
                  className="w-full p-3 border border-outline-variant/60 rounded-xl outline-none text-xs font-medium bg-surface-container-low focus:border-secondary resize-y"
                />
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
              <h3 className="text-base font-black tracking-tight">ยืนยันการล้างข้อมูลระบบ</h3>
            </div>
            
            <p className="text-xs font-semibold text-outline leading-relaxed">
              โปรดเลือกข้อมูลที่คุณต้องการลบออกจากฐานข้อมูลแบบถาวร:
            </p>
            <div className="space-y-2 bg-surface-container-low p-4 rounded-xl border border-outline-variant/20 text-xs font-bold text-primary flex flex-col">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedTables.includes("registrations")}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedTables(prev => [...prev, "registrations"]);
                    } else {
                      setSelectedTables(prev => prev.filter(t => t !== "registrations"));
                    }
                  }}
                  className="rounded border-outline-variant text-error focus:ring-error w-4 h-4 cursor-pointer"
                />
                <span className={selectedTables.includes("registrations") ? "text-error" : "text-outline"}>
                  ข้อมูลการลงทะเบียนรับประกันทั้งหมด
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedTables.includes("generation_logs")}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedTables(prev => [...prev, "generation_logs"]);
                    } else {
                      setSelectedTables(prev => prev.filter(t => t !== "generation_logs"));
                    }
                  }}
                  className="rounded border-outline-variant text-error focus:ring-error w-4 h-4 cursor-pointer"
                />
                <span className={selectedTables.includes("generation_logs") ? "text-error" : "text-outline"}>
                  ประวัติการสร้าง QR Code ทั้งหมด
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedTables.includes("audit_logs")}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedTables(prev => [...prev, "audit_logs"]);
                    } else {
                      setSelectedTables(prev => prev.filter(t => t !== "audit_logs"));
                    }
                  }}
                  className="rounded border-outline-variant text-error focus:ring-error w-4 h-4 cursor-pointer"
                />
                <span className={selectedTables.includes("audit_logs") ? "text-error" : "text-outline"}>
                  ประวัติกิจกรรมทั้งหมด (Audit Logs)
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedTables.includes("production_orders")}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedTables(prev => [...prev, "production_orders"]);
                    } else {
                      setSelectedTables(prev => prev.filter(t => t !== "production_orders"));
                    }
                  }}
                  className="rounded border-outline-variant text-error focus:ring-error w-4 h-4 cursor-pointer"
                />
                <span className={selectedTables.includes("production_orders") ? "text-error" : "text-outline"}>
                  ข้อมูลแคชสินค้าและออร์เดอร์ SAP
                </span>
              </label>
            </div>

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
                disabled={confirmText !== "RESET" || isResetting || selectedTables.length === 0}
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
