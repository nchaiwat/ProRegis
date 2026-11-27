"use client";

import React from "react";

interface IdleTimeoutModalProps {
  secondsRemaining: number;
  idleTimeoutMinutes: number;
  onExtend: () => void;
  onLogoutNow: () => void;
}

export default function IdleTimeoutModal({
  secondsRemaining,
  idleTimeoutMinutes,
  onExtend,
  onLogoutNow,
}: IdleTimeoutModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[9990] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white border border-amber-300 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
            <span className="material-symbols-outlined !text-[24px]">timer</span>
          </div>
          <div>
            <h3 className="text-base font-black text-primary tracking-tight">
              ⚠️ แจ้งเตือนหมดเวลาการเชื่อมต่อ (Idle Timeout)
            </h3>
            <p className="text-[11px] text-outline font-semibold mt-0.5">
              นโยบายความปลอดภัย ISO 27001 ({idleTimeoutMinutes} นาที)
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
          คุณไม่มีการใช้งานระบบมาระยะหนึ่ง ระบบจะออกจากระบบอัตโนมัติเพื่อความปลอดภัยในอีก{" "}
          <span className="inline-flex items-center justify-center px-2 py-0.5 mx-1 rounded-md bg-amber-600 text-white font-black text-sm tabular-nums">
            {secondsRemaining}
          </span>{" "}
          วินาที
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            type="button"
            onClick={onExtend}
            className="flex-1 h-11 px-4 bg-secondary hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined !text-[18px]">refresh</span>
            <span>ขยายเวลาใช้งาน</span>
          </button>
          <button
            type="button"
            onClick={onLogoutNow}
            className="h-11 px-4 border border-outline-variant text-on-surface-variant hover:bg-slate-100 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined !text-[18px]">logout</span>
            <span>ออกจากระบบทันที</span>
          </button>
        </div>
      </div>
    </div>
  );
}
