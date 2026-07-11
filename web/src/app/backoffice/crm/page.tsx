"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";

interface CustomerEntry {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  address: string;
  province: string;
  postalCode: string;
  token: string;
  docNum: string | null;
  seqNum: string | null;
  status: string;
  registeredAt: string;
}

interface PaginatedResponse {
  items: CustomerEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function CrmPage() {
  const router = useRouter();
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter states
  const [search, setSearch] = useState("");
  const [province, setProvince] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);



  // Export CSV state
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, province, status]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    setError("");
    try {
      const token = sessionStorage.getItem("bo_token") || "";
      // Construct query params
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        search: search.trim(),
        province,
        status,
      });

      const res = await fetch(`${getApiBaseUrl()}/crm/registrations?${params.toString()}`, {
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
        throw new Error("Unauthorized or server error");
      }

      const resData = await res.json();
      setData(resData);
    } catch {
      setError("ไม่สามารถเข้าถึงข้อมูลฐานลูกค้าได้ กรุณาตรวจสอบสิทธิ์ของคุณ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };


  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const token = sessionStorage.getItem("bo_token") || "";
      const res = await fetch(`${getApiBaseUrl()}/crm/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          search: search.trim(),
          province,
          status,
        }),
      });

      if (!res.ok) {
        throw new Error("Export failed");
      }

      // Download file directly
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Customer_Database_Export_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("เกิดข้อผิดพลาดในการส่งออกไฟล์รายงาน");
    } finally {
      setIsExporting(false);
    }
  };

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

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-success">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-bold text-2xl text-primary font-bold">ฐานข้อมูลลูกค้า (CRM Portal)</h2>
          <p className="text-sm text-on-surface-variant">รายชื่อผู้ลงทะเบียนสินค้า ข้อมูลการรับประกัน และพิกัดงานซ่อม</p>
        </div>
        <button
          onClick={handleExportCsv}
          disabled={isExporting || !data || data.items.length === 0}
          className="h-12 bg-secondary text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-2 px-5 hover:opacity-95 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
        >
          {isExporting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="material-symbols-outlined !text-[18px]">download</span>
          )}
          ส่งออกรายงาน CSV (PII)
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-outline-variant rounded-2xl p-5 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Search Box */}
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">ค้นหาทั่วไป</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline !text-[20px]">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ชื่อ-นามสกุล, เบอร์โทรศัพท์, รหัส Token หรือเลขที่ใบสั่ง..."
                className="w-full h-11 pl-10 pr-4 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:border-secondary transition-all"
              />
            </div>
          </div>

          {/* Province Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">จังหวัดติดตั้ง</label>
            <select
              value={province}
              onChange={(e) => { setProvince(e.target.value); setPage(1); }}
              className="w-full h-11 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:border-secondary"
            >
              <option value="">-- แสดงทุกจังหวัด --</option>
              {provinces.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Search Action */}
          <button
            type="submit"
            className="w-full h-11 bg-primary text-white font-bold text-xs rounded-xl hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined !text-[18px]">filter_alt</span>
            กรองข้อมูล
          </button>
        </form>
      </div>

      {/* Main List */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-4 bg-error/10 rounded-xl border border-error/20">
          <span className="material-symbols-outlined text-error">error</span>
          <p className="text-sm text-error font-semibold">{error}</p>
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="text-center py-20 text-on-surface-variant bg-white border border-outline-variant rounded-2xl">
          <span className="material-symbols-outlined !text-5xl text-outline mb-3 block">contact_support</span>
          <p className="text-sm">ไม่พบรายชื่อผู้ลงทะเบียนที่ตรงกับเงื่อนไข</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-container-low border-b border-outline-variant">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Ref ID</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">ชื่อ-นามสกุล</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">เบอร์โทรศัพท์ (พราง)</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">จังหวัด</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">วันที่ลงทะเบียน</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-on-surface-variant uppercase tracking-wider">รายละเอียด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/50">
                  {data.items.map((cust) => (
                    <tr key={cust.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-4 py-3.5 font-mono text-xs font-bold text-primary">{cust.id}</td>
                      <td className="px-4 py-3.5 font-semibold text-primary">{cust.firstName} {cust.lastName}</td>
                      <td className="px-4 py-3.5 text-xs font-semibold font-mono text-on-surface-variant">{cust.phone}</td>
                      <td className="px-4 py-3.5 text-xs text-primary font-semibold">
                        {provinces.find((p) => p.value === cust.province)?.label || cust.province}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-outline">
                        {new Date(cust.registeredAt).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "short",
                          day: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => router.push(`/backoffice/crm/${cust.id}`)}
                          className="h-9 px-4 bg-secondary/10 hover:bg-secondary/15 text-secondary font-bold text-[11px] rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 active:scale-95"
                        >
                          <span className="material-symbols-outlined !text-[14px]">visibility</span>
                          ตรวจสอบสิทธิ์
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between text-xs px-2 pt-2">
              <span className="text-on-surface-variant font-medium">แสดงหน้า {data.page} จาก {data.totalPages} (ทั้งหมด {data.total} รายการ)</span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="h-10 px-4 border border-outline-variant rounded-lg hover:bg-white active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed font-semibold text-primary"
                >
                  ย้อนกลับ
                </button>
                <button
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-10 px-4 border border-outline-variant rounded-lg hover:bg-white active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed font-semibold text-primary"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
