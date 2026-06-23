"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";

interface ProductionTrackerItem {
  docNum: string;
  itemCode: string;
  itemName: string;
  requestCount: number;
  requestDates: string[];
  totalQuantity: number;
  registeredCount: number;
}

export default function ProductionTrackerPage() {
  const router = useRouter();
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
      const res = await fetch(`${getApiBaseUrl()}/backoffice/production-tracker`, {
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
      if (resData.success) {
        setData(resData.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = data.filter((item) => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;
    return (
      item.docNum.toLowerCase().includes(term) ||
      item.itemCode.toLowerCase().includes(term) ||
      (item.itemName && item.itemName.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-8 animate-success">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-bold text-2xl text-primary">ติดตามรายการใบสั่งผลิต (Production Tracker)</h2>
          <p className="text-sm text-on-surface-variant mt-1">
            แสดงสถานะใบสั่งผลิต (Production Order) รหัสสินค้าจาก SAP B1 จำนวน QR ที่สร้าง และประวัติการสแกนลงทะเบียนรับประกันของลูกค้า
          </p>
        </div>

        {/* Search bar */}
        <div className="relative w-full md:w-80">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline !text-[20px]">
            search
          </span>
          <input
            type="text"
            placeholder="ค้นหาด้วย เลขใบสั่งผลิต หรือรหัสสินค้า..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-semibold outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
          />
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
                <tr>
                  <th className="px-5 py-4 font-bold text-on-surface-variant uppercase tracking-wider">เลขที่สั่งผลิต (PD)</th>
                  <th className="px-5 py-4 font-bold text-on-surface-variant uppercase tracking-wider">รหัสสินค้า (Item Code)</th>
                  <th className="px-5 py-4 font-bold text-on-surface-variant uppercase tracking-wider">ชื่อสินค้า (SAP B1)</th>
                  <th className="px-5 py-4 font-bold text-on-surface-variant uppercase tracking-wider text-center">ขอสร้าง QR (ครั้ง)</th>
                  <th className="px-5 py-4 font-bold text-on-surface-variant uppercase tracking-wider text-center">จำนวนผลิตทั้งหมด</th>
                  <th className="px-5 py-4 font-bold text-on-surface-variant uppercase tracking-wider text-center">ลงทะเบียนแล้ว</th>
                  <th className="px-5 py-4 font-bold text-on-surface-variant uppercase tracking-wider text-center">อัตราลงทะเบียน</th>
                  <th className="px-5 py-4 font-bold text-on-surface-variant uppercase tracking-wider text-center">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50">
                {filteredData.length > 0 ? (
                  filteredData.map((item, idx) => {
                    const rate = item.totalQuantity > 0 ? (item.registeredCount / item.totalQuantity) * 100 : 0;
                    const dateSorted = [...item.requestDates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
                    const lastRequestDate = dateSorted.length > 0 ? new Date(dateSorted[0]).toLocaleDateString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "ไม่พบประวัติ";
                    
                    return (
                      <tr key={idx} className="hover:bg-surface-container-low/30 transition-colors">
                        <td className="px-5 py-4 font-mono font-bold text-primary">{item.docNum}</td>
                        <td className="px-5 py-4 font-mono font-bold text-secondary">{item.itemCode}</td>
                        <td className="px-5 py-4 text-on-surface font-semibold max-w-xs truncate">{item.itemName || "สินค้าทั่วไป (Mock SAP)"}</td>
                        <td className="px-5 py-4 text-center font-bold text-primary">{item.requestCount}</td>
                        <td className="px-5 py-4 text-center font-mono font-bold">{item.totalQuantity.toLocaleString()} ชิ้น</td>
                        <td className="px-5 py-4 text-center font-mono font-bold text-green-600">{item.registeredCount.toLocaleString()} ชิ้น</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col items-center gap-1 min-w-[100px]">
                            <span className="font-bold text-[10px] text-primary">{rate.toFixed(1)}%</span>
                            <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${rate > 50 ? "bg-green-500" : rate > 10 ? "bg-secondary" : "bg-outline"}`}
                                style={{ width: `${Math.min(100, rate)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button
                            onClick={() => setSelectedItem(item)}
                            className="h-8 px-3 rounded-lg border border-outline-variant hover:bg-surface-container text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined !text-[16px]">history</span>
                            ประวัติขอ
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-outline italic">
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
      {selectedItem && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-success">
          <div className="bg-white rounded-2xl border border-outline-variant max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg text-primary">ประวัติการขอรหัส QR Code</h3>
                <p className="text-xs text-outline font-semibold">ใบสั่งผลิต: {selectedItem.docNum}</p>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-outline cursor-pointer"
              >
                <span className="material-symbols-outlined !text-[18px]">close</span>
              </button>
            </div>

            <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/60 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-outline">รหัสสินค้า:</span>
                <span className="font-mono font-bold text-primary">{selectedItem.itemCode}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-outline">ชื่อสินค้า:</span>
                <span className="font-bold text-primary text-right max-w-[200px] truncate">{selectedItem.itemName}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-outline">จำนวนล็อตที่ผลิตสะสม:</span>
                <span className="font-bold text-primary">{selectedItem.totalQuantity.toLocaleString()} ชิ้น</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-outline uppercase tracking-wider">วันเวลาที่กดสร้าง QR Code ({selectedItem.requestCount} ครั้ง)</h4>
              <div className="max-h-48 overflow-y-auto custom-scrollbar border border-outline-variant/60 rounded-xl divide-y divide-outline-variant/30">
                {selectedItem.requestDates.map((date, i) => (
                  <div key={i} className="px-4 py-2.5 text-xs font-semibold text-primary flex justify-between items-center bg-surface-container-lowest hover:bg-surface-container-low/50">
                    <span className="flex items-center gap-1.5 text-outline">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                      ครั้งที่ {selectedItem.requestDates.length - i}
                    </span>
                    <span className="font-mono">{new Date(date).toLocaleString("th-TH")}</span>
                  </div>
                ))}
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
