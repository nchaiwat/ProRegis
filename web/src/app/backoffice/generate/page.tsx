"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from '@/lib/api';

interface PreviewRow {
  code: string;
  pd: string;
}

export default function GeneratePage() {
  const router = useRouter();
  const [session, setSession] = useState<{ username: string } | null>(null);

  const [docNum, setDocNum] = useState("");
  const [startSeq, setStartSeq] = useState(1);
  const [quantity, setQuantity] = useState(10);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("bo_session");
    if (stored) {
      try {
        setSession(JSON.parse(stored));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (docNum.length === 9) {
      const fetchNextSeq = async () => {
        try {
          const token = sessionStorage.getItem("bo_token") || "";
          const res = await fetch(`${getApiBaseUrl()}/backoffice/next-sequence?docNum=${docNum}`, {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && typeof data.nextSeq === "number") {
              setStartSeq(data.nextSeq);
              if (data.nextSeq > 1) {
                setSuccessMsg(`ℹ️ รหัสออเดอร์ผลิตนี้เคยมีการสร้างแล้ว ระบบเลือก Running ลำดับถัดไป (#${data.nextSeq}) ให้คุณโดยอัตโนมัติ`);
              }
            }
          }
        } catch (err) {
          console.error("Failed to fetch next sequence", err);
        }
      };
      fetchNextSeq();
    }
  }, [docNum]);

  const validateDocNum = (val: string) => /^\d{9}$/.test(val);

  // สร้าง Preview (client-side — แค่แสดง PD เพราะ AES ต้องทำฝั่ง server)
  const handlePreview = () => {
    setError("");
    if (!validateDocNum(docNum)) {
      setError("Production Order ต้องเป็นตัวเลข 9 หลัก เช่น 260600007");
      return;
    }
    const rows: PreviewRow[] = [];
    for (let i = 0; i < quantity; i++) {
      const seq = startSeq + i;
      const seqStr = String(seq).padStart(3, "0");
      rows.push({
        code: "*** (เข้ารหัสโดย Server) ***",
        pd: `${docNum}${seqStr}`,
      });
    }
    setPreview(rows);
  };

  // Download CSV จาก Server
  const handleDownload = async () => {
    if (!session) return;
    if (!validateDocNum(docNum)) {
      setError("Production Order ต้องเป็นตัวเลข 9 หลัก เช่น 260600007");
      return;
    }
    setIsGenerating(true);
    setError("");
    setSuccessMsg("");

    try {
      const token = sessionStorage.getItem("bo_token") || "";
      const res = await fetch(`${getApiBaseUrl()}/backoffice/generate`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          docNum,
          startSeq,
          quantity,
        }),
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          sessionStorage.clear();
          router.replace("/backoffice");
          return;
        }
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "เกิดข้อผิดพลาดในการสร้างไฟล์");
      }

      // Trigger download
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const filename = `QR_Batch_${docNum}_seq${String(startSeq).padStart(3, "0")}_qty${quantity}.csv`;
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccessMsg(`✅ ดาวน์โหลดไฟล์ "${filename}" สำเร็จ — บันทึก Log เรียบร้อยแล้ว`);
      setPreview([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!session) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-success">
      <div className="mb-6">
        <h2 className="font-bold text-2xl text-primary">สร้าง QR Code Batch</h2>
          <p className="text-sm text-on-surface-variant mt-1">
            ระบบจะ Generate ไฟล์ CSV (UTF-8 + BOM) พร้อม Token เข้ารหัส AES-128 สำหรับเครื่องยิง QR
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm space-y-6">
          {/* DocNum */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Production Order (DocNum) <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={docNum}
              onChange={(e) => {
                setDocNum(e.target.value.replace(/\D/g, "").slice(0, 9));
                setError("");
                setSuccessMsg("");
                setPreview([]);
              }}
              placeholder="เช่น 260600007 (9 หลัก)"
              maxLength={9}
              className="w-full h-12 px-4 bg-surface-container-low border border-outline-variant rounded-xl text-sm font-mono font-semibold outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
            />
            {docNum.length > 0 && docNum.length < 9 && (
              <p className="text-xs text-error">ต้องการ 9 หลัก (กรอกแล้ว {docNum.length} หลัก)</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Start Seq */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                เริ่มที่ Running No.
              </label>
              <input
                type="number"
                value={startSeq}
                min={1}
                max={999}
                onChange={(e) => setStartSeq(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full h-12 px-4 bg-surface-container-low border border-outline-variant rounded-xl text-sm font-semibold outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
              />
              <p className="text-[11px] text-outline">
                Default: 01 = ชิ้นแรกของ Lot
              </p>
            </div>

            {/* Quantity */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                จำนวน QR ที่ต้องการ
              </label>
              <input
                type="number"
                value={quantity}
                min={1}
                max={500}
                onChange={(e) => setQuantity(Math.min(500, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full h-12 px-4 bg-surface-container-low border border-outline-variant rounded-xl text-sm font-semibold outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
              />
              <p className="text-[11px] text-outline">สูงสุด 500 ชิ้นต่อครั้ง</p>
            </div>
          </div>

          {/* Summary Preview */}
          {docNum.length === 9 && (
            <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-4">
              <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">
                สรุปงาน (Preview)
              </p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-[10px] text-outline uppercase">DocNum</p>
                  <p className="font-mono font-bold text-sm text-primary">{docNum}</p>
                </div>
                <div>
                  <p className="text-[10px] text-outline uppercase">Running</p>
                  <p className="font-mono font-bold text-sm text-primary">
                    {String(startSeq).padStart(3, "0")} → {String(startSeq + quantity - 1).padStart(3, "0")}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-outline uppercase">PD แรก</p>
                  <p className="font-mono font-bold text-sm text-primary">
                    {docNum}{String(startSeq).padStart(3, "0")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-error/10 rounded-lg border border-error/20">
              <span className="material-symbols-outlined text-error !text-[18px]">error</span>
              <p className="text-xs text-error font-semibold">{error}</p>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
              <span className="material-symbols-outlined text-green-600 !text-[18px]">check_circle</span>
              <p className="text-xs text-green-700 font-semibold leading-relaxed">{successMsg}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handlePreview}
              className="flex-1 h-12 border-2 border-secondary text-secondary font-bold rounded-xl hover:bg-secondary/5 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined !text-[20px]">preview</span>
              ดู Preview
            </button>
            <button
              onClick={handleDownload}
              disabled={isGenerating || !validateDocNum(docNum)}
              className="flex-1 h-12 bg-secondary text-white font-bold rounded-xl shadow-md hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span className="material-symbols-outlined !text-[20px]">download</span>
                  Download CSV
                </>
              )}
            </button>
          </div>
        </div>

        {/* Preview Table */}
        {preview.length > 0 && (
          <div className="mt-6 bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-outline-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary !text-[20px]">table_view</span>
              <h3 className="font-bold text-sm text-primary">
                Preview — {preview.length} รายการ (Column Code จะถูกเข้ารหัสจริงเมื่อ Download)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-surface-container-low">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-on-surface-variant uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 text-left font-bold text-on-surface-variant uppercase tracking-wider">Code (AES Token)</th>
                    <th className="px-4 py-3 text-left font-bold text-on-surface-variant uppercase tracking-wider">PD (ใต้ QR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/50">
                  {preview.slice(0, 10).map((row, i) => (
                    <tr key={i} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-4 py-2.5 text-outline font-mono">{startSeq + i}</td>
                      <td className="px-4 py-2.5 text-outline font-mono italic">{row.code}</td>
                      <td className="px-4 py-2.5 font-mono font-semibold text-primary">{row.pd}</td>
                    </tr>
                  ))}
                  {preview.length > 10 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-2.5 text-center text-outline text-[11px]">
                        ... และอีก {preview.length - 10} รายการ (แสดงเฉพาะ 10 รายการแรก)
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
    </div>
  );
}
