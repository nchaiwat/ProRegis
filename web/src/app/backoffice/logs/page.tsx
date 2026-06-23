"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from '@/lib/api';

interface LogEntry {
  id: string;
  username: string;
  docNum: string;
  startSeq: number;
  quantity: number;
  ipAddress: string | null;
  generatedAt: string;
}

export default function LogsPage() {
  const router = useRouter();
  const [session, setSession] = useState<{ username: string } | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("bo_session");
    if (stored) {
      try {
        setSession(JSON.parse(stored));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    const token = sessionStorage.getItem("bo_token") || "";
    fetch(`${getApiBaseUrl()}/backoffice/logs?limit=100`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          sessionStorage.clear();
          router.replace("/backoffice");
          throw new Error("Unauthorized");
        }
        return r.json();
      })
      .then((data) => setLogs(data.logs || []))
      .catch(() => setError("ไม่สามารถโหลดประวัติได้"))
      .finally(() => setIsLoading(false));
  }, [session, router]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString("th-TH", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (!session) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-success">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-2xl text-primary font-bold">Audit Log</h2>
          <p className="text-sm text-on-surface-variant">บันทึกการสร้าง QR Batch ทั้งหมด</p>
        </div>
        <div className="text-sm text-on-surface-variant font-bold">
          {!isLoading && <span>{logs.length} รายการ</span>}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-4 bg-error/10 rounded-xl border border-error/20">
          <span className="material-symbols-outlined text-error">error</span>
          <p className="text-sm text-error font-semibold">{error}</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 text-on-surface-variant bg-white border border-outline-variant rounded-2xl">
          <span className="material-symbols-outlined !text-5xl text-outline mb-3 block">history</span>
          <p className="text-sm">ยังไม่มีประวัติการ Generate</p>
        </div>
      ) : (
        <div className="bg-white border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">วันเวลา</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">ผู้ใช้</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">DocNum</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Running</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-on-surface-variant uppercase tracking-wider">จำนวน QR</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50">
                {logs.map((log) => {
                  const endSeq = log.startSeq + log.quantity - 1;
                  return (
                    <tr key={log.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-on-surface-variant whitespace-nowrap">
                        {formatDate(log.generatedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-secondary/10 text-secondary rounded-full text-xs font-semibold">
                          <span className="material-symbols-outlined !text-[14px]">person</span>
                          {log.username}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-primary">{log.docNum}</td>
                      <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">
                        {String(log.startSeq).padStart(3, "0")} → {String(endSeq).padStart(3, "0")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-primary">{log.quantity}</span>
                        <span className="text-on-surface-variant"> ชิ้น</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-outline font-mono">
                        {log.ipAddress || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
