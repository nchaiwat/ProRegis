"use client";

import React, { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";

function SsoCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [statusText, setStatusText] = useState("กำลังยืนยันตัวตนกับ Central IAM...");
  const [error, setError] = useState<string | null>(null);
  const executedRef = useRef(false);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code) {
      setError("ไม่พบ Authorization Code ใน URL Redirect จาก Central IAM");
      return;
    }

    if (executedRef.current) return;
    executedRef.current = true;

    const exchangeToken = async () => {
      try {
        const codeVerifier = sessionStorage.getItem("sso_code_verifier") || "";
        const savedState = sessionStorage.getItem("sso_state");

        if (savedState && state && savedState !== state) {
          console.warn("SSO state mismatch warning (Continuing for Portal Launch compatibility)");
        }

        setStatusText("กำลังแลกเปลี่ยนรหัสและยืนยัน Asymmetric RS256 Signature...");

        const redirectUri = `${window.location.origin}/auth/callback`;
        const res = await fetch(`${getApiBaseUrl()}/auth/sso/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            code_verifier: codeVerifier || undefined,
            redirect_uri: redirectUri,
            state: state || undefined,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || data.detail || "การยืนยันตัวตนกับระบบลูกล้มเหลว");
        }

        sessionStorage.removeItem("sso_code_verifier");
        sessionStorage.removeItem("sso_state");
        sessionStorage.removeItem("bo_manual_login");

        setStatusText("ยืนยันตัวตนสำเร็จ! กำลังนำเข้าสู่ระบบหลังบ้าน ProRegis...");

        const token = data.token || data.access_token;
        const userRole = data.user?.role || data.user?.group_name || "IMAGE_EDITOR";
        const allowedMenus = data.user?.allowedMenus || [];
        const portalUrl = data.ciam_portal_url || "https://ciam.windowasia.com/portal";

        sessionStorage.setItem("bo_token", token);
        sessionStorage.setItem("bo_auth_provider", "sso");
        sessionStorage.setItem("bo_ciam_portal_url", portalUrl);
        sessionStorage.setItem(
          "bo_session",
          JSON.stringify({
            username: data.user?.username || "sso_user",
            role: userRole,
            allowedMenus,
            at: Date.now(),
          })
        );

        localStorage.setItem("app_auth_provider", "sso");
        localStorage.setItem("app_ciam_portal_url", portalUrl);

        if (userRole === "CRM_MANAGER") {
          router.replace("/backoffice/crm");
        } else if (userRole === "IMAGE_EDITOR") {
          router.replace("/backoffice/product-images");
        } else {
          router.replace("/backoffice/generate");
        }
      } catch (err: any) {
        console.error("SSO Callback error:", err);
        setError(err.message || "เกิดข้อผิดพลาดในการยืนยันตัวตน");
      }
    };

    exchangeToken();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-primary-container text-white">
        <div className="max-w-md w-full bg-white text-primary p-7 rounded-2xl shadow-xl border border-outline-variant text-center space-y-4">
          <div className="text-error font-bold text-lg">เข้าสู่ระบบไม่สำเร็จ</div>
          <p className="text-xs text-on-surface-variant">{error}</p>
          <button
            onClick={() => {
              sessionStorage.setItem("bo_manual_login", "1");
              router.replace("/backoffice?local=1");
            }}
            className="w-full h-11 bg-secondary hover:opacity-95 text-white text-xs font-bold rounded-xl cursor-pointer transition"
          >
            กลับสู่หน้าเข้าสู่ระบบหลังบ้าน
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-primary-container text-white">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-on-primary-container font-semibold">{statusText}</p>
      </div>
    </div>
  );
}

export default function SsoCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-primary-container text-white">
          <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      }
    >
      <SsoCallbackContent />
    </Suspense>
  );
}
