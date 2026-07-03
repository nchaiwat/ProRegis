"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

interface SessionInfo {
  username: string;
  role: string;
  allowedMenus: string[];
}

export default function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Mobile sidebar state
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  // Accordion for Administrator group
  const [isAdminExpanded, setIsAdminExpanded] = useState(true);

  const isLoginPage = pathname === "/backoffice" || pathname === "/backoffice/";

  useEffect(() => {
    setMounted(true);
    if (!pathname) return;

    const token = sessionStorage.getItem("bo_token");
    const storedSession = sessionStorage.getItem("bo_session");

    if (!token || !storedSession) {
      if (!isLoginPage) {
        router.replace("/backoffice");
      } else {
        setIsLoading(false);
      }
      return;
    }

    try {
      const s = JSON.parse(storedSession);
      // Verify session expiry (8 hours matching JWT)
      if (Date.now() - s.at > 8 * 60 * 60 * 1000) {
        sessionStorage.clear();
        if (!isLoginPage) {
          router.replace("/backoffice");
        } else {
          setIsLoading(false);
        }
        return;
      }

      setSession({
        username: s.username,
        role: s.role,
        allowedMenus: s.allowedMenus || [],
      });

      // If logged in and trying to access login page, redirect to correct landing sub-page
      if (isLoginPage) {
        if (s.role === "QR_GENERATOR") {
          router.replace("/backoffice/generate");
        } else if (s.role === "CRM_MANAGER") {
          router.replace("/backoffice/crm");
        } else {
          router.replace("/backoffice/generate");
        }
      } else {
        setIsLoading(false);
      }
    } catch {
      sessionStorage.clear();
      if (!isLoginPage) {
        router.replace("/backoffice");
      } else {
        setIsLoading(false);
      }
    }
  }, [pathname, isLoginPage, router]);

  // Close mobile sidebar on path change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    sessionStorage.clear();
    router.replace("/backoffice");
  };

  // Render children directly during server side render to avoid hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-outline">Loading Back Office...</span>
        </div>
      </div>
    );
  }

  // Render child page directly if it is the login page
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Define General Menus
  const menuItems = [
    {
      key: "dashboard",
      name: "แดชบอร์ดระบบ (Dashboard)",
      path: "/backoffice/dashboard",
      icon: "dashboard",
    },
    {
      key: "checker",
      name: "ตรวจสอบข้อมูลสินค้า (Product Checker)",
      path: "/backoffice/checker",
      icon: "verified_user",
    },
    {
      key: "generate",
      name: "สร้างไฟล์คิวอาร์ (QR Builder)",
      path: "/backoffice/generate",
      icon: "qr_code",
    },
    {
      key: "production-tracker",
      name: "รายการสั่งผลิต (Production Tracker)",
      path: "/backoffice/production-tracker",
      icon: "factory",
    },
    {
      key: "crm",
      name: "ฐานข้อมูลลูกค้า (CRM Database)",
      path: "/backoffice/crm",
      icon: "groups",
    },
  ];

  // Define Admin Menus
  const adminMenuItems = [
    {
      key: "users",
      name: "จัดการบัญชีผู้ใช้ (User Admin)",
      path: "/backoffice/users",
      icon: "manage_accounts",
    },
    {
      key: "groups",
      name: "จัดการกลุ่มผู้ใช้งาน (Group Management)",
      path: "/backoffice/groups",
      icon: "admin_panel_settings",
    },
    {
      key: "logs",
      name: "ประวัติบันทึกการทำงาน (Audit Logs)",
      path: "/backoffice/logs",
      icon: "history_toggle_off",
    },
    {
      key: "settings",
      name: "ตั้งค่าระบบ (System Settings)",
      path: "/backoffice/settings",
      icon: "settings",
    },
  ];

  // Filter menus based on dynamic allowedMenus array
  const allowedGeneralMenu = menuItems.filter(item => 
    session?.allowedMenus?.includes(item.key) || 
    (session?.role === "SYSTEM_ADMIN" && (!session.allowedMenus || session.allowedMenus.length === 0))
  );

  const allowedAdminMenu = adminMenuItems.filter(item => 
    session?.allowedMenus?.includes(item.key) || 
    (session?.role === "SYSTEM_ADMIN" && (!session.allowedMenus || session.allowedMenus.length === 0))
  );

  const showAdminSection = allowedAdminMenu.length > 0;

  // Sidebar Inner Content Component (Reusable for Desktop & Mobile drawer)
  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-primary-container text-on-primary-container">
      {/* Header Branding */}
      <div className="p-6 border-b border-on-primary-fixed-variant/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shadow-md">
            <img src="/icon-192.png" alt="ProRegis Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="font-black text-white text-lg tracking-tight">ProRegis Portal</h2>
            <p className="text-[10px] text-on-primary-container/75 uppercase tracking-widest font-bold">Window Asia</p>
          </div>
        </div>
        {/* Close button on mobile drawer */}
        <button 
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden text-on-primary-container hover:text-white material-symbols-outlined !text-[22px] cursor-pointer"
        >
          close
        </button>
      </div>

      {/* User Card */}
      <div className="p-4 mx-4 my-4 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3">
        <div className="w-10 h-10 bg-secondary-container text-on-secondary-container rounded-full flex items-center justify-center font-bold text-sm shadow">
          {(session?.username || "U").substring(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{session?.username}</p>
          <span className="inline-block text-[9px] font-extrabold uppercase bg-secondary-container/20 text-secondary-container px-2 py-0.5 rounded-full border border-secondary-container/10 mt-1">
            {session?.role === "SYSTEM_ADMIN" ? "Admin" : session?.role === "QR_GENERATOR" ? "Factory Staff" : "CRM Manager"}
          </span>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
        <p className="text-[10px] font-extrabold text-on-primary-container/45 uppercase tracking-wider pl-3 mb-2">เมนูระบบ</p>
        
        {/* General Menus */}
        {allowedGeneralMenu.map((item, idx) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.key}
              href={item.path}
              className={`flex items-center gap-3.5 px-4 h-12 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? "bg-secondary text-white shadow-md shadow-secondary/15"
                  : "hover:bg-white/5 text-on-primary-container hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined !text-[20px]" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                {item.icon}
              </span>
              <span>{item.name}</span>
            </Link>
          );
        })}

        {/* Accordion Group for Administrator */}
        {showAdminSection && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <button
              onClick={() => setIsAdminExpanded(!isAdminExpanded)}
              className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-extrabold text-on-primary-container/45 uppercase tracking-wider hover:text-white transition-colors cursor-pointer text-left"
            >
              <span>ผู้ดูแลระบบ (Admin)</span>
              <span className="material-symbols-outlined !text-[16px] transition-transform duration-200" style={{
                transform: isAdminExpanded ? "rotate(0deg)" : "rotate(-90deg)"
              }}>
                expand_more
              </span>
            </button>
            
            {/* Collapsible Section content */}
            <div className={`space-y-1 mt-1 overflow-hidden transition-all duration-300 ease-in-out ${
              isAdminExpanded ? "max-h-[250px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
            }`}>
              {allowedAdminMenu.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.key}
                    href={item.path}
                    className={`flex items-center gap-3 px-4 h-11 rounded-xl text-xs font-bold transition-all pl-6 ${
                      isActive
                        ? "bg-secondary text-white shadow-md shadow-secondary/15"
                        : "hover:bg-white/5 text-on-primary-container hover:text-white"
                    }`}
                  >
                    <span className="material-symbols-outlined !text-[18px]" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Footer actions */}
      <div className="p-4 border-t border-on-primary-fixed-variant/10 space-y-2">
        <button
          onClick={handleLogout}
          className="w-full h-11 border border-white/10 hover:border-error/30 hover:bg-error/10 text-on-primary-container hover:text-red-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined !text-[18px]">logout</span>
          ออกจากระบบ
        </button>
        <p className="text-center text-[10px] text-on-primary-container/30">
          © 2026 Window Asia Co., Ltd.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-container-low flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <header className="md:hidden h-16 bg-primary-container text-white px-4 border-b border-on-primary-fixed-variant/10 flex items-center justify-between z-30 shadow-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileOpen(true)}
            className="p-1 rounded-lg hover:bg-white/5 flex items-center justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-white !text-[24px]">menu</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md overflow-hidden flex items-center justify-center shadow-sm">
              <img src="/icon-192.png" alt="ProRegis Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-black text-sm tracking-tight text-white">ProRegis Backoffice</span>
          </div>
        </div>

        <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center font-bold text-xs shadow text-white">
          {(session?.username || "U").substring(0, 2).toUpperCase()}
        </div>
      </header>

      {/* Mobile Sidebar Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden animate-fade-in"
        />
      )}

      {/* Sidebar container */}
      {/* Desktop version (stickies to side) */}
      <aside className="hidden md:flex w-72 h-screen sticky top-0 flex-shrink-0 border-r border-outline-variant/10 shadow-lg z-30">
        {renderSidebarContent()}
      </aside>

      {/* Mobile version (drawer slides out) */}
      <aside className={`fixed inset-y-0 left-0 w-72 z-50 shadow-2xl md:hidden transform transition-transform duration-300 ease-in-out ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        {renderSidebarContent()}
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 min-w-0 p-5 md:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
