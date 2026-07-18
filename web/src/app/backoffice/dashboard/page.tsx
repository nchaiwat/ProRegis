"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";

interface MarkerData {
  id: string;
  province: string;
  latitude: number;
  longitude: number;
  registeredAt: string;
}

interface ProductStat {
  itemCode: string;
  itemName: string;
  count: number;
}

interface TimelineStat {
  date: string;
  count: number;
}

interface InstallationPositionStat {
  label: string;
  count: number;
}

interface ConsentStat {
  optIn: number;
  optOut: number;
}

interface PurchaseSizeStat {
  size1: number;
  size2_3: number;
  size4_6: number;
  size7plus: number;
}

interface LagTimeStat {
  under30: number;
  thirtyToNinety: number;
  ninetyToOneEighty: number;
  overOneEighty: number;
}

interface ProductionMonthStat {
  month: string;
  count: number;
}

interface ApiUsageStat {
  action: string;
  count: number;
}

interface SapFallbackStat {
  dbCacheHits: number;
  sapSuccesses: number;
  sapErrors: number;
}

interface ErrorStat {
  message: string;
  action: string;
  time: string;
}

interface SmsOtpStat {
  otpRequests: number;
  otpVerifications: number;
}

interface DbVolumeStat {
  registrations: number;
  auditLogs: number;
  productionOrders: number;
}

interface DashboardSummary {
  totalGenerated: number;
  totalRegistered: number;
  registrationRate: number;
  provinceStats: { province: string; count: number }[];
  markers: MarkerData[];
  productStats: ProductStat[];
  timelineStats: TimelineStat[];
  // Category A New Stats
  installationPositionStats: InstallationPositionStat[];
  consentStats: ConsentStat;
  purchaseSizeStats: PurchaseSizeStat;
  lagTimeStats: LagTimeStat;
  productionMonthStats: ProductionMonthStat[];
  // Category B New Stats
  apiUsageStats: ApiUsageStat[];
  sapFallbackStats: SapFallbackStat;
  errorStats: ErrorStat[];
  smsOtpStats: SmsOtpStat;
  dbVolumeStats: DbVolumeStat;
}

export default function DashboardPage() {
  const router = useRouter();
  const [filterType, setFilterType] = useState<"ALL" | "TODAY" | "MONTH" | "YEAR">("ALL");
  const [customDates, setCustomDates] = useState({ start: "", end: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<DashboardSummary | null>(null);
  
  // Role & Tab Management
  const [sessionRole, setSessionRole] = useState<string>("");
  const [activeDashboardTab, setActiveDashboardTab] = useState<"CRM" | "ADMIN">("CRM");

  // Map references
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Redirect if not logged in & parse session
  useEffect(() => {
    const token = sessionStorage.getItem("bo_token");
    const storedSession = sessionStorage.getItem("bo_session");
    if (!token) {
      router.replace("/backoffice");
      return;
    }
    if (storedSession) {
      try {
        const s = JSON.parse(storedSession);
        setSessionRole(s.role || "");
      } catch (err) {
        console.error("Failed to parse session:", err);
      }
    }
  }, [router]);

  // Fetch dashboard data
  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const token = sessionStorage.getItem("bo_token") || "";
      
      let query = "";
      const now = new Date();
      if (filterType === "TODAY") {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        query = `?startDate=${start}`;
      } else if (filterType === "MONTH") {
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        query = `?startDate=${start}`;
      } else if (filterType === "YEAR") {
        const start = new Date(now.getFullYear(), 0, 1).toISOString();
        query = `?startDate=${start}`;
      } else if (customDates.start || customDates.end) {
        const params: string[] = [];
        if (customDates.start) params.push(`startDate=${new Date(customDates.start).toISOString()}`);
        if (customDates.end) params.push(`endDate=${new Date(customDates.end).toISOString()}`);
        query = `?${params.join("&")}`;
      }

      const res = await fetch(`${getApiBaseUrl()}/backoffice/dashboard-summary${query}`, {
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
        throw new Error("ไม่สามารถเรียกดูข้อมูล Dashboard ได้");
      }

      const resData = await res.json();
      if (resData.success) {
        setData(resData.summary);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterType, customDates]);

  // Load Google Maps Script
  useEffect(() => {
    if (typeof window === "undefined" || mapLoaded) return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
    if (apiKey) {
      const existingScript = document.getElementById("google-maps-api");
      if (!existingScript) {
        const script = document.createElement("script");
        script.id = "google-maps-api";
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMap`;
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
        (window as any).initGoogleMap = () => {
          setMapLoaded(true);
        };
      } else {
        setMapLoaded(true);
      }
    } else {
      setMapLoaded(true);
    }
  }, [mapLoaded]);

  // Initialize/Update Google Map
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
    if (!mapLoaded || !mapRef.current || !data || !apiKey) return;

    try {
      const google = (window as any).google;
      if (!google || !google.maps) return;

      const center = { lat: 13.736717, lng: 100.523186 };
      const map = new google.maps.Map(mapRef.current, {
        center: center,
        zoom: 6,
        styles: [
          { featureType: "all", elementType: "geometry", stylers: [{ color: "#242f3e" }] },
          { featureType: "all", elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }, { lightness: -80 }] },
          { featureType: "all", elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
          { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] }
        ]
      });

      data.markers.forEach((marker) => {
        if (marker.latitude && marker.longitude) {
          const m = new google.maps.Marker({
            position: { lat: Number(marker.latitude), lng: Number(marker.longitude) },
            map: map,
            title: `จังหวัด: ${marker.province}`,
            animation: google.maps.Animation.DROP
          });

          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="color: black; font-family: Inter, sans-serif; font-size: 12px; padding: 4px;">
                <strong>ข้อมูลการลงทะเบียน</strong><br/>
                จังหวัด: ${marker.province}<br/>
                วันลงทะเบียน: ${new Date(marker.registeredAt).toLocaleDateString("th-TH")}
              </div>
            `
          });

          m.addListener("click", () => {
            infoWindow.open(map, m);
          });
        }
      });
    } catch (e) {
      console.error("Google Maps rendering error:", e);
    }
  }, [mapLoaded, data]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-outline">กำลังดาวน์โหลดสถิติวิเคราะห์ระบบ...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl flex flex-col items-center justify-center gap-2">
        <span className="material-symbols-outlined text-[36px]">error</span>
        <h4 className="font-bold">เกิดข้อผิดพลาดในการโหลดข้อมูล</h4>
        <p className="text-xs">{error}</p>
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-700 text-white rounded-xl text-xs font-bold hover:bg-red-800">
          ลองใหม่อีกครั้ง
        </button>
      </div>
    );
  }

  // Pre-calculations for SVG/HTML layouts
  const maxProductCount = data?.productStats.reduce((max, item) => item.count > max ? item.count : max, 1) || 1;
  const maxTimelineCount = data?.timelineStats.reduce((max, item) => item.count > max ? item.count : max, 1) || 1;

  return (
    <div className="space-y-8 animate-success">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-bold text-2xl text-primary">แดชบอร์ดสรุปสถิติ (ProRegis Analysis Dashboard)</h2>
          <p className="text-sm text-on-surface-variant mt-1">
            ระบบวิเคราะห์ประสิทธิภาพการลงทะเบียนรับประกันสินค้า และรายงานระบบทางเทคนิค
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 bg-surface-container-low p-1.5 rounded-xl border border-outline-variant">
          {(["ALL", "TODAY", "MONTH", "YEAR"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filterType === type ? "bg-secondary text-white shadow-sm" : "text-on-surface hover:bg-surface-container"
              }`}
            >
              {type === "ALL" ? "ทั้งหมด" : type === "TODAY" ? "วันนี้" : type === "MONTH" ? "เดือนนี้" : "ปีนี้"}
            </button>
          ))}
        </div>
      </div>

      {/* Role-Based Tab Switches */}
      {sessionRole === "SYSTEM_ADMIN" && (
        <div className="flex border-b border-outline-variant/60 gap-4 mb-6">
          <button
            onClick={() => setActiveDashboardTab("CRM")}
            className={`h-12 px-6 font-bold text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeDashboardTab === "CRM"
                ? "border-secondary text-secondary"
                : "border-transparent text-on-surface-variant hover:text-primary"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">groups</span>
            สถิติลูกค้า & งานบริการ (CRM & Service)
          </button>
          <button
            onClick={() => setActiveDashboardTab("ADMIN")}
            className={`h-12 px-6 font-bold text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeDashboardTab === "ADMIN"
                ? "border-secondary text-secondary"
                : "border-transparent text-on-surface-variant hover:text-primary"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
            สถานะระบบ & เทคนิค (IT Admin Dashboard)
          </button>
        </div>
      )}

      {/* Render TAB 1: CRM & Customer Dashboard */}
      {activeDashboardTab === "CRM" && data && (
        <div className="space-y-8">
          {/* Metrics Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm flex items-center gap-5">
              <div className="w-14 h-14 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined !text-[32px]">qr_code_2</span>
              </div>
              <div>
                <p className="text-xs text-outline font-bold uppercase tracking-wider">จำนวน QR Code ที่สร้าง</p>
                <h3 className="text-2xl font-black text-primary mt-1">
                  {data.totalGenerated.toLocaleString()} <span className="text-xs font-medium text-outline">ชิ้น</span>
                </h3>
                <p className="text-[11px] text-outline mt-0.5">ยอดผลิตสะสมทั้งหมดในระบบ</p>
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm flex items-center gap-5">
              <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined !text-[32px]">verified_user</span>
              </div>
              <div>
                <p className="text-xs text-outline font-bold uppercase tracking-wider">ลงทะเบียนรับประกันแล้ว</p>
                <h3 className="text-2xl font-black text-green-600 mt-1">
                  {data.totalRegistered.toLocaleString()} <span className="text-xs font-medium text-outline">ชิ้น</span>
                </h3>
                <p className="text-[11px] text-outline mt-0.5">สำเร็จตามตัวกรองช่วงเวลา</p>
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm flex items-center gap-5">
              <div className="w-14 h-14 bg-secondary-container/10 text-secondary-container rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined !text-[32px]">analytics</span>
              </div>
              <div className="flex-1">
                <p className="text-xs text-outline font-bold uppercase tracking-wider">อัตราการลงทะเบียนเปิดใช้งาน</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl font-black text-primary">{data.registrationRate.toFixed(2)}%</h3>
                  <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
                    <div
                      className="h-full bg-secondary transition-all duration-500"
                      style={{ width: `${Math.min(100, data.registrationRate)}%` }}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-outline mt-0.5">สัดส่วนลงทะเบียนเปิดใช้งานสำเร็จ</p>
              </div>
            </div>
          </div>

          {/* Main Grid Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Map Container */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">map</span>
                  <h4 className="font-bold text-sm text-primary">พิกัดลูกค้าลงทะเบียนรับประกัน (Google Maps)</h4>
                </div>
                <span className="text-[10px] bg-secondary/10 text-secondary font-bold px-2 py-0.5 rounded-full border border-secondary/20">
                  พิกัด GPS ติดตั้ง
                </span>
              </div>

              {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
                <div
                  ref={mapRef}
                  className="w-full h-[400px] rounded-xl bg-surface-container border border-outline-variant shadow-inner overflow-hidden"
                />
              ) : (
                <div className="w-full h-[400px] rounded-xl bg-primary-container border border-outline-variant flex flex-col items-center justify-center p-6 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                  <span className="material-symbols-outlined !text-[48px] text-secondary mb-2 relative z-10 animate-bounce">location_on</span>
                  <h5 className="font-bold text-sm text-white relative z-10">แสดงพิกัดบน Google Map</h5>
                  <p className="text-xs text-on-primary-container/85 max-w-xs text-center mt-1.5 leading-relaxed relative z-10">
                    เนื่องจากไม่ได้ระบุ Google Maps API Key ระบบแสดงรายชื่อพิกัดล่าสุดด้านล่างนี้แทน:
                  </p>

                  {data.markers.length > 0 ? (
                    <div className="w-full max-w-sm mt-4 bg-white/5 rounded-xl border border-white/10 p-3 h-48 overflow-y-auto custom-scrollbar relative z-10">
                      <table className="w-full text-left text-[11px] text-white">
                        <thead>
                          <tr className="text-outline uppercase font-bold border-b border-white/10">
                            <th className="pb-1.5">จังหวัด</th>
                            <th className="pb-1.5 text-center">พิกัด (Lat, Lng)</th>
                            <th className="pb-1.5 text-right">วันที่</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-semibold">
                          {data.markers.slice(0, 20).map((marker, i) => (
                            <tr key={i} className="hover:bg-white/5">
                              <td className="py-2 text-secondary-container">{marker.province}</td>
                              <td className="py-2 text-center font-mono text-[10px]">{Number(marker.latitude).toFixed(4)}, {Number(marker.longitude).toFixed(4)}</td>
                              <td className="py-2 text-right text-outline">{new Date(marker.registeredAt).toLocaleDateString("th-TH")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-outline mt-3 italic relative z-10">ยังไม่มีข้อมูลพิกัดลงทะเบียนตามตัวกรองนี้</p>
                  )}
                </div>
              )}
            </div>

            {/* Top Product stats */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm space-y-6 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary">inventory_2</span>
                    <h4 className="font-bold text-sm text-primary">ยอดลงทะเบียนรับประกันแยกตามรหัสสินค้า (Item Code)</h4>
                  </div>
                </div>

                {data.productStats.length > 0 ? (
                  <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
                    {data.productStats.map((item, idx) => {
                      const percentage = (item.count / maxProductCount) * 100;
                      return (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-primary font-mono">{item.itemCode}</span>
                            <span className="text-secondary font-mono">{item.count} ชิ้น</span>
                          </div>
                          <div className="text-[11px] text-outline truncate">{item.itemName}</div>
                          <div className="h-3 bg-surface-container rounded-full overflow-hidden flex">
                            <div
                              className="h-full bg-secondary-container rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center border border-dashed border-outline-variant rounded-xl bg-surface-container-low">
                    <span className="material-symbols-outlined text-outline !text-[36px]">inbox</span>
                    <p className="text-xs text-outline font-semibold mt-2">ยังไม่มีข้อมูลการลงทะเบียนสินค้าใดๆ</p>
                  </div>
                )}
              </div>

              {data.provinceStats.length > 0 && (
                <div className="pt-4 border-t border-outline-variant/60">
                  <h5 className="text-xs font-bold text-primary uppercase tracking-wider mb-2">จังหวัดที่มีการลงทะเบียนสูงสุด</h5>
                  <div className="flex flex-wrap gap-2">
                    {data.provinceStats.slice(0, 5).map((prov, i) => (
                      <span key={i} className="text-xs font-bold bg-surface-container text-on-surface border border-outline-variant px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary-container"></span>
                        {prov.province}: <span className="font-mono text-secondary">{prov.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CRM Dashboard: Section for Advanced Customer Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* A1. Installation Position Distribution */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">home_pin</span>
                <h4 className="font-bold text-sm text-primary">ตำแหน่งติดตั้งสินค้าของลูกค้า</h4>
              </div>

              <div className="space-y-4 pt-2">
                {data.installationPositionStats && data.installationPositionStats.length > 0 ? (
                  data.installationPositionStats.map((item, idx) => {
                    const totalPos = data.installationPositionStats.reduce((s, i) => s + i.count, 0) || 1;
                    const pct = (item.count / totalPos) * 100;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-on-surface">{item.label}</span>
                          <span className="text-secondary font-mono">{pct.toFixed(1)}% ({item.count} ชิ้น)</span>
                        </div>
                        <div className="h-2.5 bg-surface-container rounded-full overflow-hidden">
                          <div
                            className="h-full bg-secondary rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-outline italic text-center py-6">ไม่มีข้อมูลตำแหน่งติดตั้ง</p>
                )}
              </div>
            </div>

            {/* A2. PDPA Marketing Consent Opt-in Rate */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-secondary">security</span>
                  <h4 className="font-bold text-sm text-primary">อัตราการกดยินยอมวิเคราะห์ข้อมูลการตลาด</h4>
                </div>
                <p className="text-[11px] text-outline">สัดส่วนผู้ใช้กดยินยอม PDPA ข้อเสนอพิเศษแยกตามจำนวนใบสมัคร</p>
              </div>

              <div className="flex items-center justify-center gap-8 py-2">
                {(() => {
                  const totalConsent = data.consentStats.optIn + data.consentStats.optOut;
                  const consentRate = totalConsent > 0 ? (data.consentStats.optIn / totalConsent) * 100 : 0;
                  const radius = 35;
                  const strokeDasharray = 2 * Math.PI * radius;
                  const strokeDashoffset = strokeDasharray * (1 - consentRate / 100);

                  return (
                    <>
                      {/* SVG Ring */}
                      <div className="relative w-28 h-28 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="56" cy="56" r={radius} stroke="#e0e0e0" strokeWidth="8" fill="transparent" />
                          <circle
                            cx="56"
                            cy="56"
                            r={radius}
                            stroke="var(--color-secondary, #0284c7)"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            className="transition-all duration-700"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <span className="text-lg font-black text-primary font-mono">{consentRate.toFixed(1)}%</span>
                          <span className="text-[9px] text-outline font-bold">ยินยอม</span>
                        </div>
                      </div>

                      {/* Legends */}
                      <div className="flex flex-col justify-center gap-2">
                        <div className="flex items-center gap-2 text-xs font-bold">
                          <span className="w-3.5 h-3.5 rounded-full bg-secondary"></span>
                          <span>ยินยอม: {data.consentStats.optIn} คน</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-outline">
                          <span className="w-3.5 h-3.5 rounded-full bg-surface-container"></span>
                          <span>ปฏิเสธ: {data.consentStats.optOut} คน</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* A3. Purchase Size Distribution per Customer */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">shopping_bag</span>
                <h4 className="font-bold text-sm text-primary">พฤติกรรมยอดซื้อสินค้าสะสมต่อเบอร์โทร</h4>
              </div>

              <div className="space-y-3 pt-2">
                {(() => {
                  const sizes = [
                    { key: "1 ชิ้น", val: data.purchaseSizeStats.size1, color: "bg-blue-500" },
                    { key: "2-3 ชิ้น", val: data.purchaseSizeStats.size2_3, color: "bg-teal-500" },
                    { key: "4-6 ชิ้น", val: data.purchaseSizeStats.size4_6, color: "bg-indigo-500" },
                    { key: "7 ชิ้นขึ้นไป (โครงการ)", val: data.purchaseSizeStats.size7plus, color: "bg-purple-500" }
                  ];
                  const totalCustomers = sizes.reduce((sum, s) => sum + s.val, 0) || 1;
                  return sizes.map((size, idx) => {
                    const pct = (size.val / totalCustomers) * 100;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-on-surface">{size.key}</span>
                          <span className="text-secondary font-mono">{pct.toFixed(1)}% ({size.val} คน)</span>
                        </div>
                        <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                          <div className={`h-full ${size.color}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

          {/* CRM Dashboard: Lag time & Production month */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* A4. Lead Time / Days Elapsed between production order and registration */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">schedule</span>
                <h4 className="font-bold text-sm text-primary">ระยะเวลารอคอยตั้งแต่สินค้าผลิตเสร็จจนลงทะเบียน (Inventory Lead Time)</h4>
              </div>
              
              <div className="grid grid-cols-4 gap-3 text-center py-4">
                {(() => {
                  const lags = [
                    { label: "ภายใน 30 วัน", count: data.lagTimeStats.under30, color: "text-green-600 bg-green-50 border-green-200" },
                    { label: "30 - 90 วัน", count: data.lagTimeStats.thirtyToNinety, color: "text-blue-600 bg-blue-50 border-blue-200" },
                    { label: "90 - 180 วัน", count: data.lagTimeStats.ninetyToOneEighty, color: "text-orange-600 bg-orange-50 border-orange-200" },
                    { label: "เกิน 180 วัน", count: data.lagTimeStats.overOneEighty, color: "text-red-600 bg-red-50 border-red-200" }
                  ];
                  return lags.map((l, i) => (
                    <div key={i} className={`p-3 rounded-2xl border ${l.color}`}>
                      <p className="text-[11px] font-bold truncate">{l.label}</p>
                      <h4 className="text-xl font-black font-mono mt-1.5">{l.count}</h4>
                      <p className="text-[9px] font-semibold opacity-70 mt-0.5">ใบสมัคร</p>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* A5. Month of Production distribution of registered items */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">calendar_month</span>
                <h4 className="font-bold text-sm text-primary">ยอดลงทะเบียนรับประกันแยกตามรุ่นเดือนผลิตสินค้า</h4>
              </div>

              {data.productionMonthStats && data.productionMonthStats.length > 0 ? (
                <div className="flex items-end h-28 gap-2 border-b border-outline-variant/60 pb-1">
                  {(() => {
                    const maxCount = Math.max(...data.productionMonthStats.map(m => m.count), 1);
                    return data.productionMonthStats.map((item, i) => {
                      const h = (item.count / maxCount) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center group relative">
                          <div className="absolute bottom-full mb-1 bg-inverse-surface text-inverse-on-surface text-[9px] font-bold px-1.5 py-1 rounded shadow opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20 whitespace-nowrap">
                            {item.month}: {item.count} ชิ้น
                          </div>
                          <div className="w-full bg-secondary-container/70 group-hover:bg-secondary rounded-t transition-all cursor-pointer" style={{ height: `${Math.max(6, h)}%` }} />
                          <span className="text-[8px] text-outline font-bold mt-1 scale-90">{item.month.substring(5, 7)}/{item.month.substring(2, 4)}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                <p className="text-xs text-outline italic text-center py-10">ยังไม่มีข้อมูลประวัติแยกตามเดือนผลิตสินค้า</p>
              )}
            </div>
          </div>

          {/* Timeline Trend */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">show_chart</span>
              <h4 className="font-bold text-sm text-primary">แนวโน้มการลงทะเบียนรายวัน (Registration Timeline Trend)</h4>
            </div>

            {data.timelineStats.length > 0 ? (
              <div className="pt-6">
                <div className="flex h-40 items-end gap-1.5 border-b border-l border-outline-variant/50 px-2 pb-1">
                  {data.timelineStats.map((item, idx) => {
                    const heightPercentage = (item.count / maxTimelineCount) * 100;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center group relative">
                        <div className="absolute bottom-full mb-2 bg-inverse-surface text-inverse-on-surface text-[10px] font-bold px-2 py-1.5 rounded shadow opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-20">
                          {item.date}: {item.count} ชิ้น
                        </div>
                        <div
                          className="w-full bg-secondary rounded-t min-h-[4px] hover:bg-secondary-container transition-all cursor-pointer"
                          style={{ height: `${Math.max(4, heightPercentage)}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-outline font-bold mt-2 px-1">
                  <span>{data.timelineStats[0].date}</span>
                  <span>{data.timelineStats[Math.floor(data.timelineStats.length / 2)]?.date}</span>
                  <span>{data.timelineStats[data.timelineStats.length - 1].date}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-outline italic text-center py-10">ไม่พบข้อมูลสถิติตามไทม์ไลน์ที่ระบุ</p>
            )}
          </div>
        </div>
      )}

      {/* Render TAB 2: IT Admin & System Operations Dashboard */}
      {activeDashboardTab === "ADMIN" && sessionRole === "SYSTEM_ADMIN" && data && (
        <div className="space-y-8">
          {/* Tech Stats Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Estimated SMS Spending */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm flex items-center gap-5">
              <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined !text-[32px]">payments</span>
              </div>
              <div>
                <p className="text-xs text-outline font-bold uppercase tracking-wider">ประมาณการค่าใช้จ่าย SMS OTP</p>
                <h3 className="text-2xl font-black text-amber-600 mt-1 font-mono">
                  {(data.smsOtpStats.otpRequests * 0.50).toFixed(2)} <span className="text-xs font-bold text-outline">THB</span>
                </h3>
                <p className="text-[11px] text-outline mt-0.5">คิดอัตราถัวเฉลี่ย 0.50 บาท/ข้อความ</p>
              </div>
            </div>

            {/* Card 2: Database Volume */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm flex items-center gap-5">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined !text-[32px]">database</span>
              </div>
              <div>
                <p className="text-xs text-outline font-bold uppercase tracking-wider">ขนาดข้อมูล (Database Records)</p>
                <h3 className="text-2xl font-black text-indigo-600 mt-1 font-mono">
                  {(data.dbVolumeStats.registrations + data.dbVolumeStats.auditLogs + data.dbVolumeStats.productionOrders).toLocaleString()}{" "}
                  <span className="text-xs font-bold text-outline">แถว</span>
                </h3>
                <p className="text-[11px] text-outline mt-0.5">ลงทะเบียน: {data.dbVolumeStats.registrations} | Logs: {data.dbVolumeStats.auditLogs}</p>
              </div>
            </div>

            {/* Card 3: SAP Service Layer Status */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm flex items-center gap-5">
              <div className="w-14 h-14 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined !text-[32px]">cloud_sync</span>
              </div>
              <div className="flex-1">
                <p className="text-xs text-outline font-bold uppercase tracking-wider">SAP B1 Service Layer</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
                  </div>
                  <span className="text-sm font-black text-teal-700">ONLINE</span>
                </div>
                <p className="text-[11px] text-outline mt-1.5">เชื่อมต่อพร้อมใช้งานดึงข้อมูลใบสั่งผลิตสินค้า</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* B2. DB Cache hit vs SAP fallbacks */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm space-y-6">
              <div>
                <h4 className="font-bold text-sm text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">memory</span>
                  ประสิทธิภาพการแคชข้อมูลสินค้า (Local DB Hits vs SAP Fallback)
                </h4>
                <p className="text-xs text-outline mt-1">วัดประสิทธิผลระบบ Cache-Aside จากปริมาณคิวรี่</p>
              </div>

              {(() => {
                const totalResolves = data.sapFallbackStats.dbCacheHits + data.sapFallbackStats.sapSuccesses + data.sapFallbackStats.sapErrors;
                const hitRate = totalResolves > 0 ? (data.sapFallbackStats.dbCacheHits / totalResolves) * 100 : 100;
                const fallbackRate = 100 - hitRate;

                return (
                  <div className="space-y-6">
                    {/* Visual Segmented Bar */}
                    <div className="space-y-2">
                      <div className="h-6 w-full bg-surface-container rounded-full overflow-hidden flex font-mono text-[10px] text-white font-bold">
                        <div
                          className="bg-green-600 flex items-center justify-center transition-all"
                          style={{ width: `${hitRate}%` }}
                        >
                          {hitRate > 15 && `Local DB Hit (${hitRate.toFixed(0)}%)`}
                        </div>
                        <div
                          className="bg-secondary flex items-center justify-center transition-all"
                          style={{ width: `${fallbackRate}%` }}
                        >
                          {fallbackRate > 15 && `SAP Fallback (${fallbackRate.toFixed(0)}%)`}
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-outline font-semibold">
                        <span>Local DB Lookup (Cache Hit)</span>
                        <span>SAP Fallback Query</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant">
                        <p className="text-[10px] font-bold text-outline uppercase tracking-wider">Local DB Hit</p>
                        <h4 className="text-lg font-black text-green-600 font-mono mt-1">{data.sapFallbackStats.dbCacheHits} ครั้ง</h4>
                      </div>
                      <div className="bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant">
                        <p className="text-[10px] font-bold text-outline uppercase tracking-wider">SAP Success</p>
                        <h4 className="text-lg font-black text-secondary font-mono mt-1">{data.sapFallbackStats.sapSuccesses} ครั้ง</h4>
                      </div>
                      <div className="bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant">
                        <p className="text-[10px] font-bold text-outline uppercase tracking-wider">SAP Error</p>
                        <h4 className="text-lg font-black text-red-600 font-mono mt-1">{data.sapFallbackStats.sapErrors} ครั้ง</h4>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* B4. SMS OTP Request-to-Verify Funnel */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm space-y-6">
              <div>
                <h4 className="font-bold text-sm text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">filter_alt</span>
                  กรวยแปลง OTP SMS (SMS OTP Conversion Funnel)
                </h4>
                <p className="text-xs text-outline mt-1">ประสิทธิภาพการแปลงจากหน้าลงทะเบียน SMS OTP สูงสุด</p>
              </div>

              {(() => {
                const totalReq = data.smsOtpStats.otpRequests;
                const totalVerify = data.smsOtpStats.otpVerifications;
                const conversion = totalReq > 0 ? (totalVerify / totalReq) * 100 : 0;

                return (
                  <div className="space-y-4">
                    {/* Funnel Layout */}
                    <div className="flex flex-col items-center gap-2.5">
                      <div className="w-full bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-blue-700 font-bold uppercase tracking-wider">1. คำขอรหัส SMS OTP (Requested)</p>
                        <h4 className="text-xl font-black text-blue-900 font-mono mt-0.5">{totalReq.toLocaleString()} ข้อความ</h4>
                      </div>

                      <div className="w-5/6 bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-center relative">
                        <div className="absolute inset-y-0 left-0 bg-indigo-600/10 transition-all rounded-l-xl" style={{ width: `${conversion}%` }}></div>
                        <p className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider relative z-10">2. ยืนยันรหัสถูกต้องสำเร็จ (Verified)</p>
                        <h4 className="text-xl font-black text-indigo-900 font-mono mt-0.5 relative z-10">{totalVerify.toLocaleString()} ใบสมัคร</h4>
                      </div>

                      <div className="w-2/3 bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-green-700 font-bold uppercase tracking-wider">3. อัตราการเปิดสำเร็จ (Conversion Rate)</p>
                        <h4 className="text-xl font-black text-green-900 font-mono mt-0.5">{conversion.toFixed(1)}%</h4>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* B1. API Transaction Actions */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm space-y-4 lg:col-span-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">terminal</span>
                <h4 className="font-bold text-sm text-primary">สถิติปริมาณธุรกรรม API (Activity Audit)</h4>
              </div>

              <div className="space-y-3.5 pt-2">
                {data.apiUsageStats && data.apiUsageStats.length > 0 ? (
                  data.apiUsageStats.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs font-bold border-b border-outline-variant/60 pb-2">
                      <span className="font-mono bg-surface-container text-on-surface px-2 py-1.5 rounded-lg border border-outline-variant">{item.action}</span>
                      <span className="font-mono text-secondary text-sm">{item.count.toLocaleString()} ครั้ง</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-outline italic text-center py-10">ไม่พบประวัติการใช้งาน API</p>
                )}
              </div>
            </div>

            {/* B3. System Error Logs status tracker */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm space-y-4 lg:col-span-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-600">bug_report</span>
                  <h4 className="font-bold text-sm text-primary">รายงานข้อผิดพลาดล่าหลังของระบบ (System Errors Tracker)</h4>
                </div>
                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                  ล่าสุด 10 รายการ
                </span>
              </div>

              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar pt-1">
                {data.errorStats && data.errorStats.length > 0 ? (
                  data.errorStats.map((err, i) => (
                    <div key={i} className="bg-red-50/50 border border-red-200/50 rounded-xl p-3 space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-bold text-red-700">
                        <span className="font-mono bg-red-100 px-2 py-0.5 rounded border border-red-200">{err.action}</span>
                        <span>{new Date(err.time).toLocaleString("th-TH")}</span>
                      </div>
                      <p className="text-xs text-red-900 font-semibold leading-relaxed break-words">{err.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 gap-2 text-green-600">
                    <span className="material-symbols-outlined !text-[36px]">check_circle</span>
                    <p className="text-xs font-bold">ไม่พบข้อผิดพลาดระบบสะสม (System Status Healthy)</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
