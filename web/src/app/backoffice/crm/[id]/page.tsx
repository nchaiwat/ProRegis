"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const provinces = [
    { value: "Bangkok", label: "กรุงเทพมหานคร" },
    { value: "Nonthaburi", label: "นนทบุรี" },
    { value: "Samut Prakan", label: "สมุทรปราการ" },
    { value: "Chiang Mai", label: "เชียงใหม่" },
    { value: "Chonburi", label: "ชลบุรี" },
    { value: "Phuket", label: "ภูเก็ต" },
    { value: "Khon Kaen", label: "ขอนแก่น" },
    { value: "Nakhon Ratchasima", label: "นครราชสีมา" },
  ];

  useEffect(() => {
    if (id) {
      fetchDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchDetails = async () => {
    setLoading(true);
    setError("");
    try {
      const token = sessionStorage.getItem("bo_token") || "";
      const res = await fetch(`${getApiBaseUrl()}/crm/registrations/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          sessionStorage.clear();
          router.replace("/backoffice");
          return;
        }
        throw new Error("Failed to load customer profile");
      }

      const data = await res.json();
      setDetails(data);
    } catch {
      setError("ไม่สามารถดึงข้อมูลรายละเอียดลูกค้าได้ (ระบบได้บันทึกความล้มเหลวลงใน Log)");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!details) return;
    const consent = window.confirm(
      `คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลลูกค้ารายนี้?\n\nลูกค้า: ${details.firstName} ${details.lastName}\nจำนวนชิ้นการรับประกันที่จะถูกลบ: ${details.allRegistrations?.length || 1} ชิ้น\n\n⚠️ คำเตือน: ข้อมูลจะถูกลบออกจากระบบอย่างถาวรและไม่สามารถกู้คืนได้!`
    );
    if (!consent) return;

    try {
      const token = sessionStorage.getItem("bo_token") || "";
      const res = await fetch(`${getApiBaseUrl()}/crm/customer/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        alert("ลบข้อมูลลูกค้าและประวัติทั้งหมดเสร็จสิ้น!");
        router.push("/backoffice/crm");
      } else {
        alert("ไม่สามารถลบข้อมูลได้ กรุณาตรวจสอบสิทธิ์อีกครั้ง");
      }
    } catch (err) {
      console.error("Delete detailed customer error:", err);
      alert("การเชื่อมต่อล้มเหลว");
    }
  };

  const getDiffString = (fromStr: string | null, toStr: string | Date) => {
    if (!fromStr) return "-";
    const from = new Date(fromStr);
    const to = new Date(toStr);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) return "-";
    
    let diffMs = to.getTime() - from.getTime();
    if (diffMs < 0) diffMs = 0;
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "ภายในวันเดียวกัน";
    
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    const days = Math.floor((diffDays % 365) % 30);
    
    let res = "";
    if (years > 0) res += `${years} ปี `;
    if (months > 0) res += `${months} เดือน `;
    if (days > 0) res += `${days} วัน`;
    if (!res) res = `${diffDays} วัน`;
    return res.trim();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-success pb-10">
      {/* Navigation Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant/40 pb-4">
        <div className="space-y-1">
          <button
            onClick={() => router.push("/backoffice/crm")}
            className="inline-flex items-center gap-1.5 h-10 px-4 bg-surface-container-low hover:bg-surface-container border border-outline-variant text-primary font-bold text-xs rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer mb-2"
          >
            <span className="material-symbols-outlined !text-[16px]">arrow_back</span>
            ย้อนกลับไปตารางลูกค้า
          </button>
          <h2 className="font-bold text-2xl text-primary">ตรวจสอบสิทธิ์และข้อมูลการรับประกันสินค้า</h2>
          <p className="text-sm text-on-surface-variant">รายละเอียดประวัติของลูกค้าและจุดงานติดตั้งอย่างละเอียด</p>
        </div>
        {details && (
          <div className="flex sm:self-end">
            <button
              onClick={() => handleDeleteCustomer()}
              className="h-10 px-4 bg-error hover:bg-error-container text-white font-extrabold text-xs rounded-xl shadow hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              title="ลบข้อมูลผู้ใช้งานและประวัติรับประกันทั้งหมดออกจากระบบ"
            >
              <span className="material-symbols-outlined text-base">delete</span>
              <span>ลบลูกค้าและประวัติทั้งหมด</span>
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-3">
          <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-outline font-semibold">กำลังดึงข้อมูลส่วนบุคคลและบันทึกประวัติความปลอดภัย (Audit Logs)...</p>
        </div>
      ) : error ? (
        <div className="p-5 bg-error/10 border border-error/20 rounded-xl flex gap-3 text-sm text-error font-semibold leading-relaxed">
          <span className="material-symbols-outlined flex-shrink-0">error</span>
          <span>{error}</span>
        </div>
      ) : details ? (
        <div className="space-y-6">
          {/* PII Audited Alert */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex gap-3 text-xs font-semibold text-emerald-800 leading-relaxed shadow-sm">
            <span className="material-symbols-outlined text-emerald-600 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
              security
            </span>
            <p>ระบบได้ทำการเปิดพรางข้อมูลส่วนบุคคล (PII) และบันทึกประวัติการขอดึงข้อมูลของผู้ใช้ลงในหน่วยงานตรวจสอบ (Audit Logs) สำหรับการทำธุรกรรมหลังการขายเป็นที่เรียบร้อยแล้ว</p>
          </div>

          {/* Unified Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1: Client Card */}
            <div className="lg:col-span-1 space-y-6">
              {/* Ref Box */}
              <div className="p-5 bg-surface-container rounded-2xl border border-outline-variant flex flex-col gap-2">
                <p className="text-[10px] text-outline font-bold uppercase tracking-wider">รหัสอ้างอิงลูกค้า (Customer Ref)</p>
                <p className="text-xl font-bold text-primary font-mono select-all">
                  CUST-{details.phone ? details.phone.replace(/\D/g, "") : "UNKNOWN"}
                </p>
                <div className="mt-2 flex">
                  <span className="inline-block px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-700 text-xs font-bold rounded-full">
                    สถานะ: มีการรับประกันคุ้มครองอยู่
                  </span>
                </div>
              </div>

              {/* Personal Info Box */}
              <div className="p-5 bg-white rounded-2xl border border-outline-variant/60 space-y-4 shadow-sm">
                <h3 className="font-bold text-sm text-primary border-b border-outline-variant/40 pb-2">
                  ข้อมูลส่วนบุคคลลูกค้า
                </h3>
                <div className="space-y-3.5 text-xs">
                  <div>
                    <p className="text-[10px] text-outline font-semibold uppercase">ชื่อ-นามสกุล</p>
                    <p className="font-bold text-primary text-sm mt-0.5">{details.firstName} {details.lastName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-outline font-semibold uppercase">เบอร์โทรศัพท์ (เบอร์ตรง)</p>
                    <p className="font-mono font-bold text-primary text-sm mt-0.5">{details.phone}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-outline font-semibold uppercase">อีเมลติดต่อ</p>
                    <p className="font-semibold text-primary text-sm mt-0.5">{details.email || "-"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Sites and Products */}
            <div className="lg:col-span-2 space-y-6">
              <div className="p-5 bg-white rounded-2xl border border-outline-variant/60 space-y-5 shadow-sm">
                <h3 className="font-bold text-sm text-primary border-b border-outline-variant/40 pb-2 flex justify-between items-center">
                  <span>สถานที่ติดตั้งและรายการสินค้าที่ครอบครอง</span>
                  <span className="px-2.5 py-0.5 bg-secondary/10 text-secondary text-xs font-extrabold rounded-full">
                    ทั้งหมด {details.allRegistrations?.length || 1} ชิ้น
                  </span>
                </h3>

                <div className="space-y-6">
                  {(() => {
                    const allRegs = details.allRegistrations || [details];
                    const groups: Record<string, { address: string; province: string; postalCode: string; latitude: number | null; longitude: number | null; items: any[] }> = {};

                    for (const r of allRegs) {
                      const key = `${r.address}`.trim().toLowerCase();
                      if (!groups[key]) {
                        groups[key] = {
                          address: r.address,
                          province: r.province,
                          postalCode: r.postalCode,
                          latitude: r.latitude ? Number(r.latitude) : null,
                          longitude: r.longitude ? Number(r.longitude) : null,
                          items: []
                        };
                      }
                      groups[key].items.push(r);
                    }

                    const sitesList = Object.values(groups);

                    return sitesList.map((site, sIdx) => (
                      <div key={sIdx} className="bg-surface-container rounded-2xl p-5 border border-outline-variant/50 space-y-4">
                        {/* Site Header */}
                        <div className="flex justify-between items-start gap-4 border-b border-outline-variant/40 pb-3">
                          <div className="space-y-1">
                            <p className="text-[10px] text-outline font-bold uppercase tracking-wider">🏠 สถานที่ติดตั้ง {sitesList.length > 1 ? `#${sIdx + 1}` : ""}</p>
                            <p className="font-bold text-primary text-sm leading-relaxed">{site.address} จ.{provinces.find((p) => p.value === site.province)?.label || site.province} {site.postalCode}</p>
                          </div>

                          {site.latitude && site.longitude && (
                            <a
                              href={`https://www.google.com/maps?q=${site.latitude},${site.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-9 px-3 bg-secondary text-white font-extrabold text-xs rounded-xl shadow inline-flex items-center gap-1.5 hover:opacity-95 active:scale-95 transition-all flex-shrink-0"
                              title="เปิดแผนที่ Google Maps"
                            >
                              <span className="material-symbols-outlined !text-[16px]">map</span>
                              แผนที่
                            </a>
                          )}
                        </div>

                        {/* Product Items List (Grid Layout) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {site.items.map((item) => (
                            <div key={item.id} className="bg-white/90 p-4 rounded-xl border border-outline-variant/30 flex flex-col justify-between space-y-3 shadow-sm hover:border-secondary/40 transition-colors">
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-start gap-2">
                                  <p className="text-xs font-bold text-primary leading-normal">{item.itemName || "สินค้าทั่วไป"}</p>
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border flex-shrink-0 ${
                                    item.status === 'WARRANTY_ACTIVE'
                                      ? "bg-green-500/10 border-green-500/20 text-green-700"
                                      : "bg-surface-container-high border-outline text-outline"
                                  }`}>
                                    {item.status === 'WARRANTY_ACTIVE' ? "คุ้มครอง" : item.status}
                                  </span>
                                </div>
                                <p className="text-[10px] text-outline font-semibold font-mono">
                                  {item.itemCode || "ไม่ระบุ"}
                                </p>
                              </div>

                              <div className="space-y-2 pt-2 border-t border-outline-variant/30 text-[10px]">
                                <div className="flex justify-between">
                                  <span className="text-outline">รหัสรับประกัน:</span>
                                  <span className="font-bold text-secondary font-mono">{item.id}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-outline">รหัสสั่งผลิต / Lot:</span>
                                  <span className="font-semibold text-primary font-mono">
                                    {item.docNum || "-"}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-outline">ลำดับสินค้าในล็อต:</span>
                                  <span className="font-semibold text-primary font-mono">
                                    {item.seqNum ? `ชิ้นที่ ${parseInt(item.seqNum, 10)}` : "Static QR (รุ่นจำกัดชิ้น)"}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-outline font-medium">🚪 ตำแหน่งติดตั้ง:</span>
                                  <span className="font-bold text-secondary">{item.installationPosition || "ไม่ระบุ"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-outline">📅 วันที่ลงทะเบียน:</span>
                                  <span className="font-semibold text-primary">
                                    {new Date(item.registeredAt).toLocaleDateString("th-TH", {
                                      year: "numeric",
                                      month: "short",
                                      day: "2-digit"
                                    })}
                                  </span>
                                </div>
                                {item.orderDate && (
                                  <>
                                    <div className="flex justify-between border-t border-outline-variant/20 pt-1.5 mt-1.5 text-[9.5px]">
                                      <span className="text-outline">⏱️ ผลิตถึงวันลงทะเบียน:</span>
                                      <span className="font-bold text-primary">{getDiffString(item.orderDate, item.registeredAt)}</span>
                                    </div>
                                    <div className="flex justify-between text-[9.5px]">
                                      <span className="text-outline">⏱️ ผลิตถึงปัจจุบัน:</span>
                                      <span className="font-bold text-primary">{getDiffString(item.orderDate, new Date())}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
