"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getApiBaseUrl } from "@/lib/api";

export default function SpokeCopilotWidget() {
  const [enabled, setEnabled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([
    {
      role: "assistant",
      content:
        "สวัสดีครับ! ผมคือผู้ช่วย AI ประจำระบบหลังบ้าน ProRegis สามารถสอบถามสถิติการลงทะเบียนรับประกัน, ใบสั่งผลิต SAP, หรือสถานะระบบ Central IAM ได้เลยครับ",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const checkAiStatus = useCallback(() => {
    const token = sessionStorage.getItem("bo_token");
    fetch(`${getApiBaseUrl()}/settings/ai`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setEnabled(Boolean(data?.enabled));
      })
      .catch(() => setEnabled(false));
  }, []);

  useEffect(() => {
    checkAiStatus();
    const onSettingsUpdated = () => checkAiStatus();
    window.addEventListener("settings-updated", onSettingsUpdated);
    return () => window.removeEventListener("settings-updated", onSettingsUpdated);
  }, [checkAiStatus]);

  // Mandatory rule: Do NOT render widget if ai_copilot_enabled == false
  if (!enabled) return null;

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const newMsg = { role: "user", content: input.trim() };
    const nextHistory = [...messages, newMsg];
    setMessages(nextHistory);
    setInput("");
    setLoading(true);

    try {
      const token = sessionStorage.getItem("bo_token") || "";
      const res = await fetch(`${getApiBaseUrl()}/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: nextHistory }),
      });
      const data = await res.json();
      if (data?.message) {
        setMessages((prev) => [...prev, data.message]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "ไม่สามารถประมวลผลคำตอบได้ในขณะนี้" },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "เกิดข้อผิดพลาดในการเชื่อมต่อกับผู้ช่วย AI" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-secondary hover:opacity-95 text-white rounded-full shadow-2xl transition flex items-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-outlined !text-[20px] text-amber-300">auto_awesome</span>
          <span className="text-xs font-bold">AI Assistant</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-2rem)] h-[500px] z-50 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 flex flex-col overflow-hidden animate-fade-in">
          <div className="p-3.5 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined !text-[20px] text-sky-400">smart_toy</span>
              <div>
                <span className="text-xs font-bold block">ProRegis AI Copilot</span>
                <span className="text-[10px] text-slate-400 block">Backoffice Assistant (MCP Ready)</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white cursor-pointer p-1"
            >
              <span className="material-symbols-outlined !text-[18px]">close</span>
            </button>
          </div>

          <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`p-2.5 rounded-xl whitespace-pre-wrap leading-relaxed ${
                  m.role === "user"
                    ? "bg-secondary text-white ml-auto max-w-[82%]"
                    : "bg-slate-800 text-slate-100 max-w-[85%] border border-slate-700/60"
                }`}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="text-slate-400 text-xs italic flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                <span>กำลังประมวลผล...</span>
              </div>
            )}
          </div>

          <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="พิมพ์คำถาม เช่น สรุปยอดลงทะเบียน..."
              className="flex-1 bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-sky-400"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-3 py-2 bg-secondary hover:opacity-95 disabled:opacity-50 rounded-xl flex items-center justify-center cursor-pointer"
            >
              <span className="material-symbols-outlined !text-[16px] text-white">send</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
