"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";

export default function SsoStartPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const initiateBounce = async () => {
      try {
        const redirectUri = `${window.location.origin}/auth/callback`;
        const res = await fetch(`${getApiBaseUrl()}/auth/sso/authorize-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ redirect_uri: redirectUri }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.authorize_url) {
          throw new Error(
            data.message ||
              "ระบบ Single Sign-On ปิดใช้งานชั่วคราว กรุณาเข้าสู่ระบบผ่านหน้าล็อกอินปกติ"
          );
        }

        if (data.code_verifier) {
          sessionStorage.setItem("sso_code_verifier", data.code_verifier);
        }
        if (data.state) {
          sessionStorage.setItem("sso_state", data.state);
        }

        window.location.href = data.authorize_url;
      } catch (err: any) {
        setError(err.message || "ไม่สามารถเริ่มต้นการเชื่อมต่อ Central IAM SSO ได้");
      }
    };

    initiateBounce();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-primary-container text-white">
        <div className="max-w-md w-full bg-white text-primary p-7 rounded-2xl shadow-xl border border-outline-variant text-center space-y-4">
          <div className="text-error font-bold text-lg">ไม่สามารถเชื่อมต่อ SSO ได้</div>
          <p className="text-xs text-on-surface-variant">{error}</p>
          <button
            onClick={() => {
              sessionStorage.setItem("bo_manual_login", "1");
              router.replace("/backoffice?local=1");
            }}
            className="w-full h-11 bg-secondary hover:opacity-95 text-white text-xs font-bold rounded-xl cursor-pointer transition"
          >
            ไปยังหน้าเข้าสู่ระบบหลังบ้าน
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-primary-container text-white">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-on-primary-container font-semibold">
          กำลังเชื่อมต่อกับ Window Asia Central IAM...
        </p>
      </div>
    </div>
  );
}
