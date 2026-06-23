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

interface DashboardSummary {
  totalGenerated: number;
  totalRegistered: number;
  registrationRate: number;
  provinceStats: { province: string; count: number }[];
  markers: MarkerData[];
  productStats: ProductStat[];
  timelineStats: TimelineStat[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [filterType, setFilterType] = useState<"ALL" | "TODAY" | "MONTH" | "YEAR">("ALL");
  const [customDates, setCustomDates] = useState({ start: "", end: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<DashboardSummary | null>(null);

  // Map references
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    const token = sessionStorage.getItem("bo_token");
    if (!token) {
      router.replace("/backoffice");
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
    // If we have an API key, load google maps, otherwise fall back to visual representation
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
      setMapLoaded(true); // fall back to local SVG map
    }
  }, [mapLoaded]);

  // Initialize/Update Google Map
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
    if (!mapLoaded || !mapRef.current || !data || !apiKey) return;

    try {
      const google = (window as any).google;
      if (!google || !google.maps) return;

      // Center of Thailand
      const center = { lat: 13.736717, lng: 100.523186 };
      const map = new google.maps.Map(mapRef.current, {
        center: center,
        zoom: 6,
        styles: [
          {
            featureType: "all",
            elementType: "geometry",
            stylers: [{ color: "#242f3e" }]
          },
          {
            featureType: "all",
            elementType: "labels.text.stroke",
            stylers: [{ color: "#242f3e" }, { lightness: -80 }]
          },
          {
            featureType: "all",
            elementType: "labels.text.fill",
            stylers: [{ color: "#746855" }]
          },
          {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#17263c" }]
          }
        ]
      });

      // Add Markers
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

  // Custom styling elements for charts
  const maxProductCount = data?.productStats.reduce((max, item) => item.count > max ? item.count : max, 1) || 1;
  const maxTimelineCount = data?.timelineStats.reduce((max, item) => item.count > max ? item.count : max, 1) || 1;

  return (
    <div className="space-y-8 animate-success">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-bold text-2xl text-primary">แดชบอร์ดสรุปสถิติ (System Dashboard)</h2>
          <p className="text-sm text-on-surface-variant mt-1">
            รายงานวิเคราะห์ข้อมูลหน้าบ้านของการลงทะเบียนรับประกัน และสถิติต้นทางจากฝ่ายผลิตหลังบ้าน
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 bg-surface-container-low p-1.5 rounded-xl border border-outline-variant">
          <button
            onClick={() => setFilterType("ALL")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              filterType === "ALL" ? "bg-secondary text-white shadow-sm" : "text-on-surface hover:bg-surface-container"
            }`}
          >
            ทั้งหมด
          </button>
          <button
            onClick={() => setFilterType("TODAY")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              filterType === "TODAY" ? "bg-secondary text-white shadow-sm" : "text-on-surface hover:bg-surface-container"
            }`}
          >
            วันนี้
          </button>
          <button
            onClick={() => setFilterType("MONTH")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              filterType === "MONTH" ? "bg-secondary text-white shadow-sm" : "text-on-surface hover:bg-surface-container"
            }`}
          >
            เดือนนี้
          </button>
          <button
            onClick={() => setFilterType("YEAR")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              filterType === "YEAR" ? "bg-secondary text-white shadow-sm" : "text-on-surface hover:bg-surface-container"
            }`}
          >
            ปีนี้
          </button>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined !text-[32px]">qr_code_2</span>
            </div>
            <div>
              <p className="text-xs text-outline font-bold uppercase tracking-wider">จำนวน QR Code ที่สร้าง</p>
              <h3 className="text-2xl font-black text-primary mt-1">{data.totalGenerated.toLocaleString()} <span className="text-xs font-medium text-outline">ชิ้น</span></h3>
              <p className="text-[11px] text-outline mt-0.5">ยอดผลิตสะสมทั้งหมดในระบบ</p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined !text-[32px]">verified_user</span>
            </div>
            <div>
              <p className="text-xs text-outline font-bold uppercase tracking-wider">ลงทะเบียนรับประกันแล้ว</p>
              <h3 className="text-2xl font-black text-green-600 mt-1">{data.totalRegistered.toLocaleString()} <span className="text-xs font-medium text-outline">ชิ้น</span></h3>
              <p className="text-[11px] text-outline mt-0.5">สำเร็จตามตัวกรองช่วงเวลา</p>
            </div>
          </div>

          {/* Card 3 */}
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
      )}

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

          {/* Map area */}
          {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
            <div
              ref={mapRef}
              className="w-full h-[400px] rounded-xl bg-surface-container border border-outline-variant shadow-inner overflow-hidden"
            />
          ) : (
            // Premium Fallback Thai Map Graphic when API key is missing
            <div className="w-full h-[400px] rounded-xl bg-primary-container border border-outline-variant flex flex-col items-center justify-center p-6 relative overflow-hidden">
              {/* background grids to look high-tech */}
              <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]"></div>
              
              <span className="material-symbols-outlined !text-[48px] text-secondary mb-2 relative z-10 animate-bounce">location_on</span>
              <h5 className="font-bold text-sm text-white relative z-10">แสดงพิกัดบน Google Map</h5>
              <p className="text-xs text-on-primary-container/85 max-w-xs text-center mt-1.5 leading-relaxed relative z-10">
                เนื่องจากไม่ได้ระบุ Google Maps API Key ในไฟล์ <code>.env</code> ระบบแสดงรายชื่อพิกัดล่าสุดด้านล่างนี้แทน:
              </p>

              {data && data.markers.length > 0 ? (
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

        {/* operational stats & ItemCode list */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">inventory_2</span>
                <h4 className="font-bold text-sm text-primary">ยอดลงทะเบียนรับประกันแยกตามรหัสสินค้า (Item Code)</h4>
              </div>
            </div>

            {/* item list bar charts */}
            {data && data.productStats.length > 0 ? (
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

          {/* Regional Table */}
          {data && data.provinceStats.length > 0 && (
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

      {/* Registration Timeline Chart */}
      {data && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">show_chart</span>
            <h4 className="font-bold text-sm text-primary">แนวโน้มระยะยาว (Registration Timeline Trend)</h4>
          </div>

          {/* simple timeline visual bar chart using CSS grid */}
          {data.timelineStats.length > 0 ? (
            <div className="pt-6">
              <div className="flex h-40 items-end gap-1.5 border-b border-l border-outline-variant/50 px-2 pb-1">
                {data.timelineStats.map((item, idx) => {
                  const heightPercentage = (item.count / maxTimelineCount) * 100;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center group relative">
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 bg-inverse-surface text-inverse-on-surface text-[10px] font-bold px-2 py-1.5 rounded shadow opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-20">
                        {item.date}: {item.count} ชิ้น
                      </div>
                      {/* Bar fill */}
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
      )}
    </div>
  );
}
