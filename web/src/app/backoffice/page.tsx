"use client";

import { useState } from "react";
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
          <p className="text-xs text-on-surface-variant mb-6">
            สำหรับเจ้าหน้าที่โรงงานและ Admin เท่านั้น
          </p>

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
              disabled={isLoading}
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
        </div>

        <p className="text-center text-xs text-on-primary-container/60 mt-6">
          © 2026 Window Asia Public Company Limited
        </p>
      </div>
    </div>
  );
}
