"use client";

import React, { useState } from "react";
import { getApiBaseUrl } from "@/lib/api";

interface ForcedPasswordChangeModalProps {
  username: string;
  isExpired?: boolean;
  onSuccess: () => void;
}

export default function ForcedPasswordChangeModal({
  username,
  isExpired = true,
  onSuccess,
}: ForcedPasswordChangeModalProps) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Enterprise Password Complexity Checklist (8-16 chars, Uppercase, Lowercase, Number, Special, No Username)
  const isLenValid = newPassword.length >= 8 && newPassword.length <= 16;
  const isUpperValid = /[A-Z]/.test(newPassword);
  const isLowerValid = /[a-z]/.test(newPassword);
  const isDigitValid = /[0-9]/.test(newPassword);
  const isSpecialValid = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]/.test(newPassword);
  const isNoUserValid =
    !username ||
    username.trim().length < 3 ||
    !newPassword.toLowerCase().includes(username.trim().toLowerCase());

  const isAllValid =
    isLenValid &&
    isUpperValid &&
    isLowerValid &&
    isDigitValid &&
    isSpecialValid &&
    isNoUserValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!oldPassword.trim()) {
      setError("กรุณากรอกรหัสผ่านเดิม");
      return;
    }

    if (!isAllValid) {
      setError("กรุณาตั้งรหัสผ่านใหม่ให้ตรงตามเกณฑ์ความปลอดภัยทั้งหมด");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("รหัสผ่านยืนยันไม่ตรงกัน");
      return;
    }

    setLoading(true);
    try {
      const token = sessionStorage.getItem("bo_token");
      const res = await fetch(`${getApiBaseUrl()}/auth/local/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          oldPassword,
          newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "ไม่สามารถเปลี่ยนรหัสผ่านได้");
      }

      // Update session mustChangePassword to false
      const stored = sessionStorage.getItem("bo_session");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          parsed.mustChangePassword = false;
          sessionStorage.setItem("bo_session", JSON.stringify(parsed));
        } catch (e) {
          // ignore
        }
      }

      onSuccess();
    } catch (err: any) {
      setError(err?.message || "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-amber-500/30 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl text-slate-100 relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-2xl shadow-inner">
            <span className="material-symbols-outlined !text-[28px]">lock_reset</span>
          </div>
          <div>
            <h3 className="text-base font-black text-white tracking-tight">
              {isExpired
                ? "⚠️ รหัสผ่านหมดอายุตามรอบ 90 วัน"
                : "🔒 จำเป็นต้องเปลี่ยนรหัสผ่าน"}
            </h3>
            <p className="text-xs text-slate-400">
              บัญชี: <span className="font-bold text-amber-300">{username}</span> (Local DB)
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-300 mb-4 leading-relaxed bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
          ตามมาตรฐานความปลอดภัย ISO 27001 ระบบกำหนดให้บัญชีท้องถิ่นต้องเปลี่ยนรหัสผ่านทุกๆ 90 วัน กรุณาตั้งรหัสผ่านใหม่เพื่อดำเนินการต่อ
        </p>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-medium mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined !text-[18px] text-rose-400">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Complexity Checklist */}
        <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800 text-[11px] mb-4 space-y-1.5">
          <div className="font-bold text-slate-400 mb-1 flex items-center justify-between">
            <span>เกณฑ์ความปลอดภัยรหัสผ่าน (8-16 ตัวอักษร):</span>
            <span className={isAllValid ? "text-emerald-400 font-bold" : "text-slate-500"}>
              {isAllValid ? "✓ ถูกต้องครบถ้วน" : "กำลังตรวจสอบ..."}
            </span>
          </div>
          <div className={isLenValid ? "text-emerald-400 font-semibold" : "text-slate-500"}>
            {isLenValid ? "✓" : "○"} ความยาว 8 - 16 ตัวอักษร (ปัจจุบัน {newPassword.length})
          </div>
          <div className={isUpperValid ? "text-emerald-400 font-semibold" : "text-slate-500"}>
            {isUpperValid ? "✓" : "○"} ตัวอักษรพิมพ์ใหญ่ (A-Z) อย่างน้อย 1 ตัว
          </div>
          <div className={isLowerValid ? "text-emerald-400 font-semibold" : "text-slate-500"}>
            {isLowerValid ? "✓" : "○"} ตัวอักษรพิมพ์เล็ก (a-z) อย่างน้อย 1 ตัว
          </div>
          <div className={isDigitValid ? "text-emerald-400 font-semibold" : "text-slate-500"}>
            {isDigitValid ? "✓" : "○"} ตัวเลข (0-9) อย่างน้อย 1 ตัว
          </div>
          <div className={isSpecialValid ? "text-emerald-400 font-semibold" : "text-slate-500"}>
            {isSpecialValid ? "✓" : "○"} อักขระพิเศษ (!@#$%^&*...) อย่างน้อย 1 ตัว
          </div>
          <div className={isNoUserValid ? "text-emerald-400 font-semibold" : "text-slate-500"}>
            {isNoUserValid ? "✓" : "○"} ห้ามมีชื่อผู้ใช้ ({username}) ในรหัสผ่าน
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              รหัสผ่านเดิม <span className="text-rose-400">*</span>
            </label>
            <input
              type={showPass ? "text" : "password"}
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="กรอกรหัสผ่านเดิมที่ใช้ปัจจุบัน"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              รหัสผ่านใหม่ (8-16 ตัวอักษร) <span className="text-rose-400">*</span>
            </label>
            <input
              type={showPass ? "text" : "password"}
              required
              maxLength={16}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="ตั้งรหัสผ่านใหม่ตามเกณฑ์"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              ยืนยันรหัสผ่านใหม่ <span className="text-rose-400">*</span>
            </label>
            <input
              type={showPass ? "text" : "password"}
              required
              maxLength={16}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="กรอกรหัสผ่านใหม่อีกครั้งให้ตรงกัน"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showPass}
                onChange={(e) => setShowPass(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0"
              />
              <span>แสดงรหัสผ่าน</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={!isAllValid || newPassword !== confirmPassword || loading}
            className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>กำลังบันทึกรหัสผ่านใหม่...</span>
            ) : (
              <>
                <span className="material-symbols-outlined !text-[18px]">verified_user</span>
                <span>บันทึกรหัสผ่านใหม่ (มีอายุ 90 วัน)</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

