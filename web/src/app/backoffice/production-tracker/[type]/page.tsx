"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";

interface ProductionTrackerItem {
  docNum: string;
  itemCode: string;
  itemName: string;
  requestCount: number;
  latestRequestDate: string;
  latestRequestUser: string;
  latestRequestQty: number;
  history: Array<{
    attemptNumber: number;
    generatedAt: string;
    username: string;
    quantity: number;
  }>;
  registeredCount: number;
  plannedQty?: number;
  completedQty?: number;
  orderDate?: string | null;
  startDate?: string | null;
  status?: string | null;
}

const getStatusBadge = (status: string | null | undefined) => {
  if (!status) return <span className="px-2 py-0.5 rounded-full bg-outline/10 text-outline text-[10px] font-bold">ไม่ระบุ</span>;
  const s = status.trim();
  if (s === "L" || s === "bposClosed" || s === "boposClosed" || s === "Closed") {
    return <span className="px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-bold">Closed</span>;
  }
  if (s === "R" || s === "bposReleased" || s === "boposReleased" || s === "Released") {
    return <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200 text-[10px] font-bold">Released</span>;
  }
  if (s === "P" || s === "bposPlanned" || s === "boposPlanned" || s === "Planned") {
    return <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-bold">Planned</span>;
  }
  if (s === "C" || s === "bposCancelled" || s === "boposCancelled" || s === "Cancelled") {
    return <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold">Cancelled</span>;
  }
  return <span className="px-2 py-0.5 rounded-full bg-outline/10 text-outline text-[10px] font-bold">{status}</span>;
};

export default function ProductionTrackerPage() {
  const router = useRouter();
  const params = useParams();
  const type = (params?.type as string) || "dynamic";
  const isStatic = type.toLowerCase() === "static";

  const [data, setData] = useState<ProductionTrackerItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedItem, setSelectedItem] = useState<ProductionTrackerItem | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    const token = sessionStorage.getItem("bo_token");
    if (!token) {
      router.replace("/backoffice");
    }
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const token = sessionStorage.getItem("bo_token") || "";
      const res = await fetch(`${getApiBaseUrl()}/backoffice/production-tracker?mode=${type.toUpperCase()}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          sessionStorage.clear();
          router.replace("/backoffice");
          return;
        }
        throw new Error("ไม่สามารถดึงข้อมูลรายการใบสั่งผลิตได้");
      }

      const resData = await res.json();
      if (resData.success && Array.isArray(resData.data)) {
        setData(resData.data);
      } else {
        throw new Error("โครงสร้างข้อมูลไม่ถูกต้อง");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [type]);

  const filteredData = data.filter((item) => {
    const query = searchQuery.toLowerCase().trim();
    return (
      item.docNum.toLowerCase().includes(query) ||
      item.itemCode.toLowerCase().includes(query) ||
      (item.itemName && item.itemName.toLowerCase().includes(query))
    );
  });

  return (
    <div className="w-full mx-auto space-y-6 px-4 md:px-8 animate-success">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="font-bold text-2xl text-primary">
            {isStatic ? "Product Tracker (Static QR)" : "Product Tracker (Dynamic QR)"}
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">
            {isStatic 
              ? "ติดตามข้อมูลสเปกสินค้าและยอดการลงทะเบียนรับประกันของรหัสคิวอาร์แบบทั่วไป (Static QR) จากระบบ SAP B1"
              : "ติดตามประวัติการสร้างรหัส QR Code รายใบสั่งผลิต และข้อมูลความคืบหน้าของ Production Order จาก SAP B1"
            }
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline !text-[20px]">
              search
            </span>
            <input
              type="text"
              placeholder="ค้นหา PD, Item Code, ชื่อสินค้า..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-72 h-10 pl-10 pr-4 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs font-semibold outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
            />
          </div>
          <button
            onClick={fetchData}
            className="h-10 px-4 bg-secondary text-white font-bold rounded-xl text-xs active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined !text-[16px]">refresh</span>
            โหลดใหม่
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-error/10 rounded-lg border border-error/20">
          <span className="material-symbols-outlined text-error !text-[18px]">error</span>
          <p className="text-xs text-error font-semibold">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-3 border-secondary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-outline">กำลังโหลดข้อมูล...</span>
        </div>
      ) : (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr className="whitespace-nowrap">
                  <th className="px-2 py-3.5 font-bold text-on-surface-variant uppercase tracking-wider text-center">
                    {isStatic ? "วัน/เวลา" : "วัน/เวลา ที่ขอ"}
                  </th>
                  {!isStatic && <th className="px-2 py-3.5 font-bold text-on-surface-variant uppercase tracking-wider text-center">User ID</th>}
                  <th className="px-2 py-3.5 font-bold text-on-surface-variant uppercase tracking-wider text-center">PD Num</th>
                  {!isStatic && <th className="px-2 py-3.5 font-bold text-on-surface-variant uppercase tracking-wider text-center">จำนวน QR</th>}
                  {!isStatic && <th className="px-2 py-3.5 font-bold text-on-surface-variant uppercase tracking-wider text-center">สร้างครั้งที่</th>}
                  <th className="px-2 py-3.5 font-bold text-on-surface-variant uppercase tracking-wider text-center">Pln Qty</th>
                  <th className="px-2 py-3.5 font-bold text-on-surface-variant uppercase tracking-wider text-center">Cpl Qty</th>
                  <th className="px-2 py-3.5 font-bold text-on-surface-variant uppercase tracking-wider text-center">Item Code</th>
                  <th className="px-2 py-3.5 font-bold text-on-surface-variant uppercase tracking-wider text-left">Desc</th>
                  <th className="px-2 py-3.5 font-bold text-on-surface-variant uppercase tracking-wider text-center">Order Date</th>
                  <th className="px-2 py-3.5 font-bold text-on-surface-variant uppercase tracking-wider text-center">Start Date</th>
                  <th className="px-2 py-3.5 font-bold text-on-surface-variant uppercase tracking-wider text-center">Status</th>
                  <th className="px-2 py-3.5 font-bold text-on-surface-variant uppercase tracking-wider text-center">ยอดลงทะเบียน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50">
                {filteredData.length > 0 ? (
                  filteredData.map((item, idx) => {
                    const formatDate = (dateStr: string | null | undefined) => {
                      if (!dateStr) return "-";
                      try {
                        const d = new Date(dateStr);
                        if (isNaN(d.getTime())) return dateStr;
                        return d.toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        });
                      } catch {
                        return dateStr;
                      }
                    };

                    const formatDateTime = (dateStr: string | null | undefined) => {
                      if (!dateStr) return "-";
                      try {
                        const d = new Date(dateStr);
                        if (isNaN(d.getTime())) return dateStr;
                        return d.toLocaleString("th-TH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        });
                      } catch {
                        return dateStr;
                      }
                    };

                    return (
                      <tr key={idx} className="hover:bg-surface-container-low/30 transition-colors whitespace-nowrap">
                        <td className="px-2 py-3.5 text-center font-mono font-semibold text-primary">{formatDateTime(item.latestRequestDate)}</td>
                        {!isStatic && <td className="px-2 py-3.5 text-center font-semibold text-on-surface">{item.latestRequestUser || "-"}</td>}
                        <td className="px-2 py-3.5 text-center font-mono font-bold text-primary">{item.docNum}</td>
                        {!isStatic && <td className="px-2 py-3.5 text-center font-mono font-bold text-secondary">{(item.latestRequestQty ?? 0).toLocaleString()}</td>}
                        {!isStatic && (
                          <td className="px-2 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span className="font-mono font-bold text-on-surface">{item.requestCount}</span>
                              {item.requestCount >= 2 && (
                                <button
                                  onClick={() => setSelectedItem(item)}
                                  title="ดูประวัติการสร้างครั้งก่อนหน้า"
                                  className="w-5 h-5 rounded-full bg-secondary/10 hover:bg-secondary/20 text-secondary flex items-center justify-center transition-all cursor-pointer"
                                >
                                  <span className="material-symbols-outlined !text-[12px]">history</span>
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                        <td className="px-2 py-3.5 text-center font-mono font-bold text-primary">{(item.plannedQty ?? 0).toLocaleString()}</td>
                        <td className="px-2 py-3.5 text-center font-mono font-bold text-secondary">{(item.completedQty ?? 0).toLocaleString()}</td>
                        <td className="px-2 py-3.5 text-center font-mono font-bold text-secondary">{item.itemCode}</td>
                        <td className="px-2 py-3.5 text-on-surface font-semibold max-w-[220px] truncate text-left" title={item.itemName}>{item.itemName || "สินค้าทั่วไป"}</td>
                        <td className="px-2 py-3.5 text-center font-semibold text-on-surface-variant">{formatDate(item.orderDate)}</td>
                        <td className="px-2 py-3.5 text-center font-semibold text-on-surface-variant">{formatDate(item.startDate)}</td>
                        <td className="px-2 py-3.5 text-center">{getStatusBadge(item.status)}</td>
                        <td className="px-2 py-3.5 text-center font-mono font-bold text-secondary">{(item.registeredCount ?? 0).toLocaleString()} ชิ้น</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={isStatic ? 9 : 13} className="px-5 py-10 text-center text-outline italic">
                      ไม่พบข้อมูลใบสั่งผลิตที่ตรงกับคำค้นหา
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal for detailed history */}
      {selectedItem && !isStatic && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-success">
          <div className="bg-white rounded-2xl border border-outline-variant max-w-lg w-full shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg text-primary">ประวัติการขอสร้าง QR Code</h3>
                <p className="text-xs text-outline font-semibold">ใบสั่งผลิต (PD Num): {selectedItem.docNum}</p>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-outline cursor-pointer"
              >
                <span className="material-symbols-outlined !text-[18px]">close</span>
              </button>
            </div>

            {/* PO Details Cache Card */}
            <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/60 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-outline">รหัสสินค้า (Item Code):</span>
                <p className="font-mono font-bold text-primary">{selectedItem.itemCode}</p>
              </div>
              <div>
                <span className="text-outline">ชื่อสินค้า (Desc):</span>
                <p className="font-bold text-primary truncate" title={selectedItem.itemName}>{selectedItem.itemName || "สินค้าทั่วไป"}</p>
              </div>
              <div>
                <span className="text-outline">แผนผลิต SAP (Pln Qty):</span>
                <p className="font-bold text-primary">{(selectedItem.plannedQty ?? 0).toLocaleString()} ชิ้น</p>
              </div>
              <div>
                <span className="text-outline">ผลิตเสร็จ SAP (Cpl Qty):</span>
                <p className="font-bold text-secondary">{(selectedItem.completedQty ?? 0).toLocaleString()} ชิ้น</p>
              </div>
            </div>

            {/* Previous Requests Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-outline uppercase tracking-wider">
                ประวัติการสร้างก่อนหน้า (ครั้งที่ 1 ถึง {selectedItem.requestCount - 1})
              </h4>
              <div className="max-h-56 overflow-y-auto custom-scrollbar border border-outline-variant/60 rounded-xl">
                {selectedItem.history && selectedItem.history.length > 0 ? (
                  <table className="w-full text-xs text-left">
                    <thead className="bg-surface-container-low border-b border-outline-variant/60">
                      <tr>
                        <th className="px-3 py-2.5 font-bold text-outline text-center">ครั้งที่</th>
                        <th className="px-3 py-2.5 font-bold text-outline text-center">วัน/เวลา</th>
                        <th className="px-3 py-2.5 font-bold text-outline text-center">User ID</th>
                        <th className="px-3 py-2.5 font-bold text-outline text-center">จำนวน QR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/30">
                      {selectedItem.history.map((hist: any, i: number) => {
                        const formatHistDateTime = (dateStr: string | null | undefined) => {
                          if (!dateStr) return "-";
                          try {
                            const d = new Date(dateStr);
                            if (isNaN(d.getTime())) return dateStr;
                            return d.toLocaleString("th-TH", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            });
                          } catch {
                            return dateStr;
                          }
                        };
                        return (
                          <tr key={i} className="hover:bg-surface-container-low/30 whitespace-nowrap">
                            <td className="px-3 py-2.5 text-center font-mono font-semibold text-outline">ครั้งที่ {hist.attemptNumber}</td>
                            <td className="px-3 py-2.5 text-center font-mono text-primary">{formatHistDateTime(hist.generatedAt)}</td>
                            <td className="px-3 py-2.5 text-center font-semibold text-on-surface">{hist.username}</td>
                            <td className="px-3 py-2.5 text-center font-mono font-bold text-secondary">{hist.quantity.toLocaleString()} ชิ้น</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-4 text-center text-outline italic text-xs">
                    ไม่มีประวัติการสร้างก่อนหน้า (การสร้างครั้งแรกแสดงอยู่ที่ตารางหลักแล้ว)
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setSelectedItem(null)}
              className="w-full h-11 bg-secondary text-white font-bold rounded-xl active:scale-[0.98] transition-all cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
