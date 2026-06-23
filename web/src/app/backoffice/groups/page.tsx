"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";

interface RolePermissionEntry {
  id: string;
  role: string;
  allowedMenus: string[];
}

export default function GroupManagementPage() {
  const router = useRouter();
  const [rolePermissions, setRolePermissions] = useState<RolePermissionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  const menuList = [
    { key: "dashboard", name: "แดชบอร์ดระบบ (Dashboard)", group: "general" },
    { key: "checker", name: "ตรวจสอบข้อมูลสินค้า (Product Checker)", group: "general" },
    { key: "generate", name: "สร้างไฟล์คิวอาร์ (QR Builder)", group: "general" },
    { key: "production-tracker", name: "รายการสั่งผลิต (Production Tracker)", group: "general" },
    { key: "crm", name: "ฐานข้อมูลลูกค้า (CRM Database)", group: "general" },
    { key: "users", name: "จัดการบัญชีผู้ใช้ (User Admin)", group: "admin" },
    { key: "groups", name: "จัดการกลุ่มผู้ใช้งาน (Group Management)", group: "admin" },
    { key: "logs", name: "ประวัติบันทึกการทำงาน (Audit Logs)", group: "admin" },
  ];

  const roleFriendlyNames: Record<string, string> = {
    SYSTEM_ADMIN: "กลุ่มผู้ดูแลระบบสูงสุด (System Administrator)",
    QR_GENERATOR: "กลุ่มเจ้าหน้าที่ฝ่ายผลิต (Factory & QR Builder)",
    CRM_MANAGER: "กลุ่มผู้จัดการข้อมูลลูกค้า (CRM Manager)",
  };

  useEffect(() => {
    const stored = sessionStorage.getItem("bo_session");
    if (!stored) {
      router.replace("/backoffice");
      return;
    }
    try {
      const s = JSON.parse(stored);
      if (s.role !== "SYSTEM_ADMIN") {
        setIsAdmin(false);
        setError("ขออภัย เฉพาะผู้ดูแลระบบสูงสุด (SYSTEM_ADMIN) เท่านั้นที่เข้าใช้งานส่วนนี้ได้");
        setIsLoading(false);
        return;
      }
      setIsAdmin(true);
      fetchRolePermissions();
    } catch {
      router.replace("/backoffice");
    }
  }, [router]);

  const fetchRolePermissions = async () => {
    setIsLoading(true);
    setError("");
    try {
      const token = sessionStorage.getItem("bo_token") || "";
      const res = await fetch(`${getApiBaseUrl()}/users/roles`, {
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
        throw new Error("Failed to fetch permissions");
      }

      const data = await res.json();
      setRolePermissions(data);
    } catch {
      setError("ไม่สามารถโหลดสิทธิ์และกลุ่มผู้ใช้งานได้");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckboxChange = (role: string, menuKey: string, checked: boolean) => {
    setRolePermissions(prev =>
      prev.map(item => {
        if (item.role !== role) return item;
        const newMenus = checked
          ? [...item.allowedMenus, menuKey]
          : item.allowedMenus.filter(k => k !== menuKey);
        return { ...item, allowedMenus: newMenus };
      })
    );
  };

  const handleSavePermissions = async (role: string, allowedMenus: string[]) => {
    setSavingRole(role);
    setSuccessMsg("");
    setError("");

    try {
      const token = sessionStorage.getItem("bo_token") || "";
      const res = await fetch(`${getApiBaseUrl()}/users/roles/${role}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ allowedMenus }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`บันทึกสิทธิ์สำหรับกลุ่ม ${role} สำเร็จแล้ว!`);
        setTimeout(() => setSuccessMsg(""), 3500);

        // Update local session storage if current user is admin and modified admin permissions
        const stored = sessionStorage.getItem("bo_session");
        if (stored) {
          const s = JSON.parse(stored);
          if (s.role === role) {
            s.allowedMenus = allowedMenus;
            sessionStorage.setItem("bo_session", JSON.stringify(s));
            // Trigger storage event so layout sidebar updates immediately
            window.dispatchEvent(new Event("storage"));
          }
        }
      } else {
        setError(data?.message || "เกิดข้อผิดพลาดในการบันทึกสิทธิ์");
      }
    } catch {
      setError("เชื่อมต่อระบบล้มเหลว");
    } finally {
      setSavingRole(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center animate-success">
        <span className="material-symbols-outlined text-red-500 !text-6xl mb-4">gpp_maybe</span>
        <h2 className="font-bold text-xl text-primary mb-2">เข้าถึงไม่ได้</h2>
        <p className="text-sm text-on-surface-variant leading-relaxed mb-6">{error || "ตรวจสอบสิทธิ์เข้าใช้งาน"}</p>
        <button
          onClick={() => router.replace("/backoffice/generate")}
          className="px-6 h-12 bg-secondary text-white font-bold rounded-xl shadow cursor-pointer active:scale-95 transition-all text-xs"
        >
          กลับไปหน้า QR Builder
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-success">
      <div>
        <h2 className="font-bold text-2xl text-primary font-bold">จัดการกลุ่มผู้ใช้งาน (Group Management)</h2>
        <p className="text-sm text-on-surface-variant">
          กำหนดบทบาทกลุ่มใช้งานระบบหลังบ้าน และจัดการสิทธิ์เข้าถึงเมนูต่างๆ
        </p>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="flex items-center gap-2.5 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl animate-fade-in">
          <span className="material-symbols-outlined text-[20px] text-green-600">check_circle</span>
          <p className="text-xs font-bold">{successMsg}</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2.5 p-4 bg-error/10 border border-error/20 text-error rounded-xl animate-fade-in">
          <span className="material-symbols-outlined text-[20px]">error</span>
          <p className="text-xs font-bold">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {rolePermissions.map((rp) => {
            const friendlyName = roleFriendlyNames[rp.role] || rp.role;
            const isSavingThis = savingRole === rp.role;

            return (
              <div
                key={rp.id}
                className="bg-white border border-outline-variant rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                {/* Card Header */}
                <div className="p-5 border-b border-outline-variant/60 bg-surface-container-lowest rounded-t-2xl">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-secondary text-[20px]">group</span>
                    <span className="text-[10px] font-extrabold uppercase bg-secondary-container/20 text-secondary-container px-2 py-0.5 rounded border border-secondary-container/10">
                      {rp.role}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-primary leading-tight mt-1.5">{friendlyName}</h3>
                </div>

                {/* Card Body - Checkboxes */}
                <div className="p-5 flex-1 space-y-4">
                  {/* General Menu Items */}
                  <div className="space-y-2.5">
                    <span className="block text-[10px] font-bold text-outline uppercase tracking-wider">
                      เมนูทั่วไป (General Menus)
                    </span>
                    <div className="space-y-2">
                      {menuList
                        .filter((m) => m.group === "general")
                        .map((menu) => {
                          const isChecked = rp.allowedMenus.includes(menu.key);
                          return (
                            <label
                              key={menu.key}
                              className="flex items-start gap-2.5 text-xs text-on-surface-variant hover:text-primary transition-colors cursor-pointer select-none"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) =>
                                  handleCheckboxChange(rp.role, menu.key, e.target.checked)
                                }
                                className="mt-0.5 h-4 w-4 rounded border-outline-variant text-secondary focus:ring-secondary transition-all"
                              />
                              <span>{menu.name}</span>
                            </label>
                          );
                        })}
                    </div>
                  </div>

                  {/* Admin Menu Items */}
                  <div className="space-y-2.5 pt-2 border-t border-outline-variant/40">
                    <span className="block text-[10px] font-bold text-outline uppercase tracking-wider">
                      เมนูแอดมิน (Admin Menus)
                    </span>
                    <div className="space-y-2">
                      {menuList
                        .filter((m) => m.group === "admin")
                        .map((menu) => {
                          const isChecked = rp.allowedMenus.includes(menu.key);
                          return (
                            <label
                              key={menu.key}
                              className="flex items-start gap-2.5 text-xs text-on-surface-variant hover:text-primary transition-colors cursor-pointer select-none"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) =>
                                  handleCheckboxChange(rp.role, menu.key, e.target.checked)
                                }
                                className="mt-0.5 h-4 w-4 rounded border-outline-variant text-secondary focus:ring-secondary transition-all"
                              />
                              <span>{menu.name}</span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                </div>

                {/* Card Footer - Save Button */}
                <div className="p-5 border-t border-outline-variant/60 bg-surface-container-low rounded-b-2xl">
                  <button
                    onClick={() => handleSavePermissions(rp.role, rp.allowedMenus)}
                    disabled={isSavingThis}
                    className="w-full h-11 bg-secondary text-white text-xs font-bold rounded-xl shadow hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isSavingThis ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>กำลังบันทึก...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined !text-[18px]">save</span>
                        <span>บันทึกสิทธิ์สแกน/ใช้งาน</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
