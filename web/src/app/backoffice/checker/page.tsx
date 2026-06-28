"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { getApiBaseUrl } from "@/lib/api";

const QrScannerModal = dynamic(() => import("../../QrScannerModal"), { ssr: false });

interface RegistrationDetails {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  address: string;
  province: string;
  postalCode: string;
  registeredAt: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
}

interface ProductDetails {
  itemCode: string;
  itemName: string;
  plannedQty: number;
}

interface SingleCheckResponse {
  registered: boolean;
  docNum: string | null;
  seqNum: string | null;
  registration: RegistrationDetails | null;
  product: ProductDetails;
}

interface LotItem {
  seqNum: string;
  registered: boolean;
  registeredBy?: string;
  registeredAt?: string;
  province?: string;
  phone?: string;
}

interface LotSummaryResponse {
  docNum: string;
  itemCode: string;
  itemName: string;
  totalQty: number;
  registeredCount: number;
  unregisteredCount: number;
  items: LotItem[];
}

export default function CheckerPage() {
  const [activeTab, setActiveTab] = useState<"scan" | "label">("scan");
  
  // Checking States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<SingleCheckResponse | null>(null);

  // QR Scan States
  const [showScanner, setShowScanner] = useState(false);

  // Label Input States
  const [labelInput, setLabelInput] = useState("");
  const [lotSummary, setLotSummary] = useState<LotSummaryResponse | null>(null);
  const [lotLoading, setLotLoading] = useState(false);
  
  // Lot Filtering
  const [lotFilterSearch, setLotFilterSearch] = useState("");
  const [lotFilterStatus, setLotFilterStatus] = useState<"all" | "registered" | "unregistered">("all");

  useEffect(() => {
    // Reset results when tab switches
    setCheckResult(null);
    setLotSummary(null);
    setError(null);
  }, [activeTab]);

  const performCheck = async (payload: { token?: string; label?: string }) => {
    setLoading(true);
    setError(null);
    setCheckResult(null);
    setLotSummary(null);

    try {
      const token = sessionStorage.getItem("bo_token") || "";
      const res = await fetch(`${getApiBaseUrl()}/backoffice/check-product`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to check product");
      }

      const data: SingleCheckResponse = await res.json();
      setCheckResult(data);

      // If checking via label and we have docNum, load lot summary too
      if (payload.label && data.docNum) {
        fetchLotSummary(data.docNum);
      }
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการดึงข้อมูลจากระบบ");
    } finally {
      setLoading(false);
    }
  };

  const fetchLotSummary = async (docNum: string) => {
    setLotLoading(true);
    try {
      const token = sessionStorage.getItem("bo_token") || "";
      const res = await fetch(`${getApiBaseUrl()}/backoffice/lot-summary/${docNum}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data: LotSummaryResponse = await res.json();
        setLotSummary(data);
      }
    } catch (err) {
      console.error("Failed to load lot summary:", err);
    } finally {
      setLotLoading(false);
    }
  };

  const handleScanSuccess = (scannedToken: string) => {
    setShowScanner(false);
    performCheck({ token: scannedToken });
  };

  const handleLabelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = labelInput.trim().replace(/[-]/g, "");
    if (clean.length !== 12 || !/^\d+$/.test(clean)) {
      setError("รหัสสินค้าต้องเป็นตัวเลข 12 หลัก (รหัสล็อต 9 หลัก + ลำดับสินค้า 3 หลัก)");
      return;
    }
    performCheck({ label: clean });
  };

  // Filter lot items dynamically
  const filteredLotItems = lotSummary
    ? lotSummary.items.filter((item) => {
        const matchesSearch =
          item.seqNum.includes(lotFilterSearch) ||
          (item.registeredBy && item.registeredBy.toLowerCase().includes(lotFilterSearch.toLowerCase())) ||
          (item.province && item.province.toLowerCase().includes(lotFilterSearch.toLowerCase()));
        
        const matchesStatus =
          lotFilterStatus === "all" ||
          (lotFilterStatus === "registered" && item.registered) ||
          (lotFilterStatus === "unregistered" && !item.registered);

        return matchesSearch && matchesStatus;
      })
    : [];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-success pb-12">
      {/* Header Branding */}
      <div>
        <h2 className="font-bold text-2xl text-primary">ตรวจสอบข้อมูลสินค้า (Product Checker Portal)</h2>
        <p className="text-sm text-on-surface-variant">ดึงข้อมูลล็อตผลิต รายละเอียดประกัน และข้อมูลลูกค้าจากฐานข้อมูลหลังบ้านและ SAP B1</p>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-outline-variant/60">
        <button
          onClick={() => setActiveTab("scan")}
          className={`h-12 px-6 font-bold text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "scan"
              ? "border-secondary text-secondary"
              : "border-transparent text-on-surface-variant hover:text-primary"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
          สแกนกล้อง QR Code (Scan QR)
        </button>
        <button
          onClick={() => setActiveTab("label")}
          className={`hidden md:flex h-12 px-6 font-bold text-sm border-b-2 transition-all items-center gap-2 cursor-pointer ${
            activeTab === "label"
              ? "border-secondary text-secondary"
              : "border-transparent text-on-surface-variant hover:text-primary"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">barcode_reader</span>
          ใส่รหัสป้ายสินค้า (Label Input)
        </button>
      </div>

      {/* Content Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Control Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-outline-variant rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-primary uppercase tracking-wider border-b pb-2">
              {activeTab === "scan" ? "กล้องควบคุมสแกน" : "กรอกข้อมูลสินค้า"}
            </h3>

            {activeTab === "scan" ? (
              <div className="space-y-4 text-center">
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  กดปุ่มด้านล่างเพื่อเปิดกล้องบนอุปกรณ์ของท่าน (รองรับทั้ง Mobile และหน้าจอ Web) สำหรับสแกน QR Code หน้าบานหน้าต่างหรือกล่องสินค้า
                </p>
                <button
                  onClick={() => setShowScanner(true)}
                  className="w-full h-14 bg-secondary hover:bg-secondary/95 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-95 duration-100 cursor-pointer"
                >
                  <span className="material-symbols-outlined">photo_camera</span>
                  เปิดกล้องสแกน QR Code
                </button>
              </div>
            ) : (
              <form onSubmit={handleLabelSubmit} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    รหัสป้ายสินค้า (12 หลัก)
                  </label>
                  <input
                    type="text"
                    value={labelInput}
                    onChange={(e) => setLabelInput(e.target.value)}
                    placeholder="เช่น 260600007001"
                    maxLength={12}
                    className="w-full h-12 px-4 bg-surface-container-low border border-outline-variant rounded-lg text-sm font-mono outline-none focus:border-secondary transition-all"
                  />
                  <p className="text-[10px] text-outline">
                    แบ่งเป็น: เลข Lot 9 หลักแรก (เช่น 260600007) + เลข Seq 3 หลักหลัง (เช่น 001)
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-primary hover:opacity-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">search</span>
                      ดึงข้อมูลตรวจสอบ
                    </>
                  )}
                </button>
              </form>
            )}

            {error && (
              <div className="p-4 bg-error/10 border border-error/20 rounded-xl flex gap-2.5 text-xs text-error font-semibold leading-relaxed animate-success">
                <span className="material-symbols-outlined flex-shrink-0 text-[18px]">error</span>
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Lot Statistics Overview (Web Only via Label search) */}
          {lotSummary && (
            <div className="bg-white border border-outline-variant rounded-2xl p-5 shadow-sm space-y-4 animate-success">
              <h3 className="font-bold text-sm text-primary uppercase tracking-wider border-b pb-2">
                ภาพรวมล็อตผลิต (Lot Overview)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-container/50 border border-outline-variant/30 p-3.5 rounded-xl text-center">
                  <p className="text-[10px] text-outline font-bold uppercase tracking-wider">จำนวนทั้งหมดใน Lot</p>
                  <p className="text-2xl font-black text-primary font-mono mt-1">{lotSummary.totalQty}</p>
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/20 p-3.5 rounded-xl text-center">
                  <p className="text-[10px] text-outline font-bold uppercase tracking-wider">ลงทะเบียนแล้ว</p>
                  <p className="text-2xl font-black text-emerald-600 font-mono mt-1">{lotSummary.registeredCount}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-on-surface-variant">
                  <span>สัดส่วนการลงทะเบียนสำเร็จ</span>
                  <span className="text-primary">
                    {((lotSummary.registeredCount / lotSummary.totalQty) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-surface-container-high rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${(lotSummary.registeredCount / lotSummary.totalQty) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Details/List Panels */}
        <div className="lg:col-span-2 space-y-6">
          {loading ? (
            <div className="bg-white border border-outline-variant rounded-2xl p-12 flex flex-col items-center justify-center gap-3 shadow-sm">
              <div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-outline font-semibold">กำลังตรวจสอบสิทธิ์การเคลมและดึงข้อมูลจากระบบ SAP B1...</p>
            </div>
          ) : checkResult ? (
            <div className="bg-white border border-outline-variant rounded-2xl overflow-hidden shadow-sm animate-success">
              {/* Status Banner */}
              <div
                className={`p-5 flex items-center justify-between border-b ${
                  checkResult.registered
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800"
                    : "bg-surface-container-high border-outline-variant/60 text-on-surface-variant"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`material-symbols-outlined text-3xl ${
                      checkResult.registered ? "text-emerald-600" : "text-outline"
                    }`}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {checkResult.registered ? "verified" : "help_center"}
                  </span>
                  <div>
                    <h4 className="font-black text-base">
                      {checkResult.registered ? "ตรวจสอบสิทธิ์สำเร็จ: ลงทะเบียนแล้ว" : "ตรวจสอบสำเร็จ: ยังไม่ได้ลงทะเบียน"}
                    </h4>
                    <p className="text-xs opacity-80 font-medium">
                      Lot No (DocNum): {checkResult.docNum || "-"} | Seq No: {checkResult.seqNum || "-"}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-4 py-1.5 text-xs font-black rounded-full uppercase tracking-wider border ${
                    checkResult.registered
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700"
                      : "bg-white border-outline text-outline"
                  }`}
                >
                  {checkResult.registered ? "WARRANTY ACTIVE" : "NO ACTIVE WARRANTY"}
                </span>
              </div>

              {/* Grid content */}
              <div className="p-6 space-y-6 text-sm">
                {/* 1. Product Details Section */}
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-outline uppercase tracking-wider border-b pb-1">รายละเอียดสินค้า (ข้อมูลในระบบและ SAP B1)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">
                    <div>
                      <p className="text-[10px] text-outline font-medium">รหัสสินค้า (SAP ItemCode)</p>
                      <p className="font-bold text-primary tracking-mono">{checkResult.product.itemCode}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-outline font-medium">ชื่อสินค้า (SAP ItemName)</p>
                      <p className="font-bold text-primary">{checkResult.product.itemName}</p>
                    </div>
                  </div>
                </div>

                {/* 2. Customer Registration Details */}
                {checkResult.registered && checkResult.registration ? (
                  <div className="space-y-4">
                    <h4 className="font-bold text-xs text-outline uppercase tracking-wider border-b pb-1">ข้อมูลการลงทะเบียนรับประกันของลูกค้า</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">
                      <div>
                        <p className="text-[10px] text-outline font-medium">ผู้ลงทะเบียน</p>
                        <p className="font-bold text-primary">
                          {checkResult.registration.firstName} {checkResult.registration.lastName}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-outline font-medium">เบอร์โทรศัพท์</p>
                        <p className="font-mono font-bold text-primary">{checkResult.registration.phone}</p>
                      </div>
                      <div className="col-span-1 md:col-span-2">
                        <p className="text-[10px] text-outline font-medium">ที่อยู่ติดตั้ง</p>
                        <p className="font-semibold text-primary leading-relaxed">
                          {checkResult.registration.address} จ.{checkResult.registration.province} {checkResult.registration.postalCode}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-outline font-medium">วันที่ลงทะเบียนสำเร็จ</p>
                        <p className="font-semibold text-primary">
                          {new Date(checkResult.registration.registeredAt).toLocaleString("th-TH")} น.
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-outline font-medium">พิกัด GPS ณ วันลงทะเบียน</p>
                        {checkResult.registration.latitude && checkResult.registration.longitude ? (
                          <a
                            href={`https://www.google.com/maps?q=${checkResult.registration.latitude},${checkResult.registration.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono font-bold text-secondary hover:underline inline-flex items-center gap-1 mt-0.5"
                          >
                            <span className="material-symbols-outlined !text-sm">map</span>
                            {checkResult.registration.latitude}, {checkResult.registration.longitude}
                          </a>
                        ) : (
                          <p className="text-outline italic text-xs">ไม่ได้ระบุพิกัด</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-surface-bright border border-outline-variant/60 rounded-xl p-4 flex gap-3 text-xs text-on-surface-variant font-medium leading-relaxed">
                    <span className="material-symbols-outlined text-outline">info</span>
                    <p>สินค้าในระบบล็อตผลิตนี้ยังไม่ได้รับการเคลมหรือยืนยันรับประกันจากลูกค้ารายใดๆ คุณสามารถนำคิวอาร์หรือตัวป้ายส่งต่อไปยังลูกค้าเพื่อทำการสแกนขึ้นทะเบียนได้ตามปกติ</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-outline-variant rounded-2xl p-16 text-center text-on-surface-variant shadow-sm flex flex-col items-center">
              <span className="material-symbols-outlined !text-6xl text-outline mb-4">search_activity</span>
              <h4 className="font-bold text-base text-primary mb-1">ยังไม่มีการค้นหาข้อมูลสินค้า</h4>
              <p className="text-xs max-w-sm leading-relaxed">กรุณาคลิกสแกนคิวอาร์หรือพิมพ์กรอกเลขรหัสสินค้า 12 หลักด้านซ้าย เพื่อดึงข้อมูลประวัติและประกัน</p>
            </div>
          )}

          {/* Complete Lot List Table (Web only via label search) */}
          {lotSummary && (
            <div className="bg-white border border-outline-variant rounded-2xl overflow-hidden shadow-sm space-y-4 p-5 animate-success">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant/40 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">ballot</span>
                  <h3 className="font-bold text-sm text-primary uppercase tracking-wider">
                    รายการทั้งหมดภายในล็อต (Lot Directory List)
                  </h3>
                </div>
                
                {/* Internal table search & filter */}
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    type="text"
                    value={lotFilterSearch}
                    onChange={(e) => setLotFilterSearch(e.target.value)}
                    placeholder="ค้นหาชื่อ, seq, จังหวัด..."
                    className="h-9 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-xs outline-none focus:border-secondary w-40"
                  />
                  <select
                    value={lotFilterStatus}
                    onChange={(e: any) => setLotFilterStatus(e.target.value)}
                    className="h-9 px-2 bg-surface-container-low border border-outline-variant rounded-lg text-xs outline-none focus:border-secondary"
                  >
                    <option value="all">ทั้งหมด</option>
                    <option value="registered">ลงทะเบียนแล้ว</option>
                    <option value="unregistered">ยังไม่ลงทะเบียน</option>
                  </select>
                </div>
              </div>

              {lotLoading ? (
                <div className="flex items-center justify-center py-10 gap-2">
                  <div className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-outline font-semibold">กำลังประมวลตารางรายการล็อต...</span>
                </div>
              ) : filteredLotItems.length === 0 ? (
                <div className="text-center py-10 text-outline text-xs">
                  ไม่พบรายการลำดับในล็อตที่ตรงตามเงื่อนไขค้นหา
                </div>
              ) : (
                <div className="overflow-x-auto border border-outline-variant/60 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-surface-container-low border-b border-outline-variant/60">
                      <tr>
                        <th className="px-4 py-2.5 font-bold text-on-surface-variant uppercase tracking-wider">Seq No.</th>
                        <th className="px-4 py-2.5 font-bold text-on-surface-variant uppercase tracking-wider">สถานะ</th>
                        <th className="px-4 py-2.5 font-bold text-on-surface-variant uppercase tracking-wider">ลงทะเบียนโดย</th>
                        <th className="px-4 py-2.5 font-bold text-on-surface-variant uppercase tracking-wider">วันที่ลงทะเบียน</th>
                        <th className="px-4 py-2.5 font-bold text-on-surface-variant uppercase tracking-wider">จังหวัด</th>
                        <th className="px-4 py-2.5 text-right font-bold text-on-surface-variant uppercase tracking-wider">ดึงข้อมูล</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/30">
                      {filteredLotItems.map((item) => (
                        <tr
                          key={item.seqNum}
                          className="hover:bg-surface-container-low/30 transition-colors"
                        >
                          <td className="px-4 py-3 font-mono font-bold text-primary">{item.seqNum}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                item.registered
                                  ? "bg-green-500/10 border-green-500/20 text-green-700"
                                  : "bg-surface-container-high border-outline-variant/60 text-outline"
                              }`}
                            >
                              {item.registered ? "ลงทะเบียนแล้ว" : "ว่าง"}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-primary">
                            {item.registeredBy || "-"}
                          </td>
                          <td className="px-4 py-3 text-outline">
                            {item.registeredAt
                              ? new Date(item.registeredAt).toLocaleDateString("th-TH", {
                                  year: "numeric",
                                  month: "short",
                                  day: "2-digit",
                                })
                              : "-"}
                          </td>
                          <td className="px-4 py-3 font-semibold text-primary">
                            {item.province || "-"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {item.registered ? (
                              <button
                                onClick={() => performCheck({ label: `${lotSummary.docNum}${item.seqNum}` })}
                                className="h-7 px-3 bg-secondary/10 hover:bg-secondary/15 text-secondary font-extrabold text-[10px] rounded-md transition-all cursor-pointer"
                              >
                                ตรวจสอบสิทธิ์
                              </button>
                            ) : (
                              <span className="text-[10px] text-outline italic">ไม่มีข้อมูล</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* QR Code Scanner Dialog Modal */}
      {showScanner && (
        <QrScannerModal
          onClose={() => setShowScanner(false)}
          onScanSuccess={handleScanSuccess}
          lang="th"
        />
      )}
    </div>
  );
}
