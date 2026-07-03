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
  const [isSavingAll, setIsSavingAll] = useState(false);
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
    { key: "settings", name: "ตั้งค่าระบบ (System Settings)", group: "admin" },
  ];

  const menuIcons: Record<string, string> = {
    dashboard: "dashboard",
    checker: "verified_user",
    generate: "qr_code",
    "production-tracker": "factory",
    crm: "groups",
    users: "manage_accounts",
    groups: "admin_panel_settings",
    logs: "history_toggle_off",
    settings: "settings",
  };

  const roles = ["CRM_MANAGER", "QR_GENERATOR", "SYSTEM_ADMIN"];

  const roleFriendlyNames: Record<string, string> = {
    CRM_MANAGER: "CRM Manager",
    QR_GENERATOR: "Factory & QR Builder",
    SYSTEM_ADMIN: "System Admin",
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

  const handleSaveAllPermissions = async () => {
    setIsSavingAll(true);
    setSuccessMsg("");
    setError("");

    try {
      const token = sessionStorage.getItem("bo_token") || "";
      const promises = rolePermissions.map(rp =>
        fetch(`${getApiBaseUrl()}/users/roles/${rp.role}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ allowedMenus: rp.allowedMenus }),
        })
      );

      const results = await Promise.all(promises);
      const allOk = results.every(res => res.ok);

      if (allOk) {
        setSuccessMsg("บันทึกสิทธิ์การใช้งานของทุกกลุ่มสำเร็จเรียบร้อยแล้ว!");
        setTimeout(() => setSuccessMsg(""), 3500);

        // Update local session storage if current user is admin and modified admin permissions
        const stored = sessionStorage.getItem("bo_session");
        if (stored) {
          const s = JSON.parse(stored);
          const currentRolePerm = rolePermissions.find(rp => rp.role === s.role);
          if (currentRolePerm) {
            s.allowedMenus = currentRolePerm.allowedMenus;
            sessionStorage.setItem("bo_session", JSON.stringify(s));
            // Trigger storage event so layout sidebar updates immediately
            window.dispatchEvent(new Event("storage"));
          }
        }
      } else {
        setError("มีบางบทบาทที่ไม่สามารถบันทึกสิทธิ์ได้ โปรดลองอีกครั้ง");
      }
    } catch {
      setError("เชื่อมต่อระบบล้มเหลว");
    } finally {
      setIsSavingAll(false);
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
    <div className="max-w-6xl mx-auto space-y-6 animate-success">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-2xl text-primary font-bold">จัดการกลุ่มผู้ใช้งาน (Group Management)</h2>
          <p className="text-sm text-on-surface-variant">
            กำหนดบทบาทกลุ่มใช้งานระบบหลังบ้าน และจัดการสิทธิ์เข้าถึงเมนูต่างๆ
          </p>
        </div>
        <button
          onClick={handleSaveAllPermissions}
          disabled={isSavingAll || isLoading}
          className="h-12 px-6 bg-secondary text-white text-xs font-bold rounded-xl shadow hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {isSavingAll ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>กำลังบันทึกทั้งหมด...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined !text-[18px]">save</span>
              <span>บันทึกสิทธิ์การใช้งานทั้งหมด</span>
            </>
          )}
        </button>
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

      {/* Permissions Grid Table */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white border border-outline-variant/40 rounded-2xl shadow-sm overflow-hidden">
          <table className="table-auto w-full text-xs">
            <thead>
              <tr className="bg-surface-container-lowest border-b border-outline-variant/60">
                <th className="px-6 py-4 text-left font-bold text-primary tracking-wide w-2/5">เมนู</th>
                {roles.map(role => (
                  <th key={role} className="px-6 py-4 text-center font-bold text-primary tracking-wide">
                    {roleFriendlyNames[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {/* General Menus Section */}
              <tr className="bg-surface-container-low/40">
                <td colSpan={1 + roles.length} className="px-6 py-2.5 font-extrabold text-[10px] text-outline uppercase tracking-wider">
                  เมนูทั่วไป (General Menus)
                </td>
              </tr>
              {menuList
                .filter(m => m.group === "general")
                .map(menu => (
                  <tr key={menu.key} className="hover:bg-surface-container-lowest/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-primary flex items-center gap-3">
                      <span className="material-symbols-outlined text-outline text-[18px]">
                        {menuIcons[menu.key] || "circle"}
                      </span>
                      <span>{menu.name}</span>
                    </td>
                    {roles.map(role => {
                      const rp = rolePermissions.find(x => x.role === role);
                      const isChecked = rp ? rp.allowedMenus.includes(menu.key) : false;
                      return (
                        <td key={role} className="px-6 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => handleCheckboxChange(role, menu.key, e.target.checked)}
                            className="h-5 w-5 rounded border-outline-variant text-secondary focus:ring-secondary transition-all cursor-pointer inline-block"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}

              {/* Admin Menus Section */}
              <tr className="bg-surface-container-low/40">
                <td colSpan={1 + roles.length} className="px-6 py-2.5 font-extrabold text-[10px] text-outline uppercase tracking-wider">
                  ผู้ดูแลระบบ (Admin Menus)
                </td>
              </tr>
              {menuList
                .filter(m => m.group === "admin")
                .map(menu => (
                  <tr key={menu.key} className="hover:bg-surface-container-lowest/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-primary flex items-center gap-3">
                      <span className="material-symbols-outlined text-outline text-[18px]">
                        {menuIcons[menu.key] || "circle"}
                      </span>
                      <span>{menu.name}</span>
                    </td>
                    {roles.map(role => {
                      const rp = rolePermissions.find(x => x.role === role);
                      const isChecked = rp ? rp.allowedMenus.includes(menu.key) : false;
                      return (
                        <td key={role} className="px-6 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => handleCheckboxChange(role, menu.key, e.target.checked)}
                            className="h-5 w-5 rounded border-outline-variant text-secondary focus:ring-secondary transition-all cursor-pointer inline-block"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
