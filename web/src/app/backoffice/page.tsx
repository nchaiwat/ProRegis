"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from '@/lib/api';

export default function BackofficePage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginMethod, setLoginMethod] = useState<"DB" | "AD">("DB");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSsoLoading, setIsSsoLoading] = useState(false);

  // Central IAM SSO dynamic state
  const [ssoConfig, setSsoConfig] = useState<{
    sso_enabled: boolean;
    break_glass_active: boolean;
    ciam_base_url?: string;
    login_button_label?: string;
  }>({
    sso_enabled: false,
    break_glass_active: false,
  });

  useEffect(() => {
    fetch(`${getApiBaseUrl()}/auth/sso/config`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setSsoConfig({
            sso_enabled: Boolean(data.sso_enabled),
            break_glass_active: Boolean(data.break_glass_active),
            ciam_base_url: data.ciam_base_url,
            login_button_label: data.login_button_label,
          });
          if (data.ciam_base_url) {
            sessionStorage.setItem("bo_ciam_portal_url", `${String(data.ciam_base_url).replace(/\/+$/, "")}/portal`);
            localStorage.setItem("app_ciam_portal_url", `${String(data.ciam_base_url).replace(/\/+$/, "")}/portal`);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleCiamSso = async () => {
    setIsSsoLoading(true);
    setError("");
    try {
      const redirectUri = `${window.location.origin}/auth/callback`;
      const res = await fetch(`${getApiBaseUrl()}/auth/sso/authorize-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redirect_uri: redirectUri }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.authorize_url) {
        setError(data?.message || "ไม่สามารถเริ่มต้นการเข้าสู่ระบบผ่าน Central IAM SSO ได้");
        setIsSsoLoading(false);
        return;
      }

      if (data.code_verifier) {
        sessionStorage.setItem("sso_code_verifier", data.code_verifier);
      }
      if (data.state) {
        sessionStorage.setItem("sso_state", data.state);
      }

      window.location.href = data.authorize_url;
    } catch {
      setError("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ Central IAM SSO ได้");
      setIsSsoLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("กรุณากรอก Username และ Password");
      return;
    }
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          passwordPlain: password.trim(),
          loginMethod,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        // Store JWT token and session metadata
        sessionStorage.setItem("bo_token", data.token);
        sessionStorage.setItem("bo_auth_provider", "local");
        localStorage.setItem("app_auth_provider", "local");
        sessionStorage.setItem(
          "bo_session",
          JSON.stringify({
            username: data.user.username,
            role: data.user.role,
            allowedMenus: data.user.allowedMenus || [],
            at: Date.now(),
          })
        );

        // Redirect based on user role limits
        if (data.user.role === "CRM_MANAGER") {
          router.push("/backoffice/crm");
        } else if (data.user.role === "IMAGE_EDITOR") {
          router.push("/backoffice/product-images");
        } else {
          router.push("/backoffice/generate");
        }
      } else {
        setError(data?.message || "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      }
    } catch {
      setError("ไม่สามารถเชื่อมต่อ Server ได้ กรุณาตรวจสอบการเชื่อมต่อ");
    } finally {
      setIsLoading(false);
    }
  };

  const showSsoButtons = ssoConfig.sso_enabled && !ssoConfig.break_glass_active;

  return (
    <div className="min-h-screen bg-primary-container flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-success">
        {/* Header Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center mx-auto mb-4 shadow-lg">
            <img src="/icon-512.png" alt="ProRegis Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-white">ProRegis</h1>
          <p className="text-sm text-on-primary-container mt-1">Back Office — Window Asia</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-7 border border-outline-variant">
          <h2 className="font-bold text-lg text-primary mb-1">เข้าสู่ระบบ</h2>
          <p className="text-xs text-on-surface-variant mb-5">
            สำหรับเจ้าหน้าที่โรงงานและ Admin เท่านั้น
          </p>

          {/* Break-Glass Emergency Banner (Scenario 3) */}
          {ssoConfig.break_glass_active && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2">
              <span className="material-symbols-outlined text-amber-600 !text-[18px] mt-0.5">warning</span>
              <p className="text-[11px] font-bold text-amber-800 leading-relaxed">
                ⚠️ ระบบอยู่ในโหมดฉุกเฉิน (Break-Glass Active) - กรุณาเข้าใช้งานด้วยรหัสผ่านตรง
              </p>
            </div>
          )}

          {/* Desktop SSO Button: Compact on top of standard form (Scenario 1 Desktop) */}
          {showSsoButtons && (
            <div className="hidden md:block mb-4">
              <button
                type="button"
                onClick={handleCiamSso}
                disabled={isSsoLoading || isLoading}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
              >
                {isSsoLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>🛡️ เข้าสู่ระบบด้วย Window Asia SSO ✨</span>
                )}
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-outline-variant/60" />
                </div>
                <div className="relative flex justify-center text-[11px]">
                  <span className="bg-white px-3 text-outline font-semibold">
                    หรือเข้าสู่ระบบด้วยชื่อผู้ใช้งาน
                  </span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Login Method Selector */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-outline-variant">
              <button
                type="button"
                onClick={() => { setLoginMethod("DB"); setError(""); }}
                className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  loginMethod === "DB"
                    ? "bg-secondary text-white shadow-sm"
                    : "text-slate-600 hover:text-primary"
                }`}
              >
                Database (DB)
              </button>
              <button
                type="button"
                onClick={() => { setLoginMethod("AD"); setError(""); }}
                className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  loginMethod === "AD"
                    ? "bg-secondary text-white shadow-sm"
                    : "text-slate-600 hover:text-primary"
                }`}
              >
                Active Directory (AD)
              </button>
            </div>

            {/* Username */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline !text-[20px]">
                  person
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(""); }}
                  placeholder="ชื่อผู้ใช้"
                  autoComplete="username"
                  className="w-full h-11 pl-10 pr-4 bg-surface-container-low border border-outline-variant rounded-lg text-sm font-medium outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline !text-[20px]">
                  lock
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="รหัสผ่าน"
                  autoComplete="current-password"
                  className="w-full h-11 pl-10 pr-12 bg-surface-container-low border border-outline-variant rounded-lg text-sm font-medium outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline hover:text-primary transition-colors cursor-pointer !text-[20px]"
                >
                  {showPassword ? "visibility_off" : "visibility"}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-error/10 rounded-lg border border-error/20">
                <span className="material-symbols-outlined text-error !text-[18px] mt-0.5">error</span>
                <p className="text-xs text-error font-semibold leading-relaxed">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || isSsoLoading}
              className="w-full h-12 bg-secondary text-white font-bold rounded-xl shadow-md hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span className="material-symbols-outlined !text-[20px]">login</span>
                  เข้าสู่ระบบ
                </>
              )}
            </button>
          </form>

          {/* Mobile Secondary SSO Button: Below primary form on mobile screens (Scenario 1 Mobile) */}
          {showSsoButtons && (
            <div className="block md:hidden pt-4 mt-1">
              <div className="relative mb-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-outline-variant/60" />
                </div>
                <div className="relative flex justify-center text-[10px]">
                  <span className="bg-white px-2.5 text-outline font-semibold">
                    หรือเข้าสู่ระบบด้วย
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCiamSso}
                disabled={isSsoLoading || isLoading}
                className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
              >
                {isSsoLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>🛡️ Window Asia SSO ✨</span>
                )}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-on-primary-container/60 mt-6">
          © 2026 Window Asia Public Company Limited
        </p>
      </div>
    </div>
  );
}
