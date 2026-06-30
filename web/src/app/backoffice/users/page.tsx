"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";

interface UserEntry {
  id: string;
  systemSeqId: number;
  username: string;
  firstName: string;
  lastName: string;
  department: string;
  email: string | null;
  mobile: string | null;
  telegramId: string | null;
  pinCode: string | null;
  lastLogin: string | null;
  role: string;
  status: string;
  failedAttempts: number;
  lockedUntil: string | null;
  createdAt: string;
}

export default function UserAdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  // Sorting states
  const [sortField, setSortField] = useState<keyof UserEntry | "">("systemSeqId");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Filtering/Searching states
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Form states for creating a user
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("CRM_MANAGER");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newDepartment, setNewDepartment] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newMobile, setNewMobile] = useState("");
  const [newTelegramId, setNewTelegramId] = useState("");
  const [newPinCode, setNewPinCode] = useState("");
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Edit states
  const [editingUser, setEditingUser] = useState<UserEntry | null>(null);
  const [editRole, setEditRole] = useState("CRM_MANAGER");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [editTelegramId, setEditTelegramId] = useState("");
  const [editPinCode, setEditPinCode] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState("");

  // Password / PIN direct reset modal state
  const [showPasswordPinModal, setShowPasswordPinModal] = useState(false);
  const [selectedUserForPasswordPin, setSelectedUserForPasswordPin] = useState<UserEntry | null>(null);
  const [changePassword, setChangePassword] = useState("");
  const [changePin, setChangePin] = useState("");
  const [changeError, setChangeError] = useState("");
  const [isChangingPasswordPin, setIsChangingPasswordPin] = useState(false);

  // Telegram test loading state
  const [telegramTestingId, setTelegramTestingId] = useState<string | null>(null);

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
      fetchUsers();
    } catch {
      router.replace("/backoffice");
    }
  }, [router]);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError("");
    try {
      const token = sessionStorage.getItem("bo_token") || "";
      const res = await fetch(`${getApiBaseUrl()}/users`, {
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
        throw new Error("Failed to fetch");
      }

      const data = await res.json();
      setUsers(data);
    } catch {
      setError("ไม่สามารถโหลดรายชื่อผู้ใช้ได้");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newUsername.trim() ||
      !newPassword.trim() ||
      !newFirstName.trim() ||
      !newLastName.trim() ||
      !newDepartment.trim()
    ) {
      setCreateError("กรุณากรอกข้อมูลที่จำเป็น (*) ให้ครบถ้วน");
      return;
    }
    if (newPassword.length < 8) {
      setCreateError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }
    if (newPinCode && !/^\d{6}$/.test(newPinCode)) {
      setCreateError("PIN Code ต้องเป็นตัวเลข 6 หลักเท่านั้น");
      return;
    }

    setIsCreating(true);
    setCreateError("");

    try {
      const token = sessionStorage.getItem("bo_token") || "";
      const res = await fetch(`${getApiBaseUrl()}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: newUsername.trim(),
          passwordPlain: newPassword.trim(),
          role: newRole,
          firstName: newFirstName.trim(),
          lastName: newLastName.trim(),
          department: newDepartment.trim(),
          email: newEmail.trim() || null,
          mobile: newMobile.trim() || null,
          telegramId: newTelegramId.trim() || null,
          pinCode: newPinCode.trim() || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowCreateModal(false);
        setNewUsername("");
        setNewPassword("");
        setNewRole("CRM_MANAGER");
        setNewFirstName("");
        setNewLastName("");
        setNewDepartment("");
        setNewEmail("");
        setNewMobile("");
        setNewTelegramId("");
        setNewPinCode("");
        fetchUsers();
      } else {
        setCreateError(data?.message || "เกิดข้อผิดพลาดในการสร้างผู้ใช้");
      }
    } catch {
      setCreateError("เชื่อมต่อระบบขัดข้อง");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editFirstName.trim() || !editLastName.trim() || !editDepartment.trim()) {
      setUpdateError("กรุณากรอกข้อมูลที่จำเป็น (*) ให้ครบถ้วน");
      return;
    }
    if (editPinCode && !/^\d{6}$/.test(editPinCode)) {
      setUpdateError("PIN Code ต้องเป็นตัวเลข 6 หลักเท่านั้น");
      return;
    }

    setIsUpdating(true);
    setUpdateError("");

    try {
      const token = sessionStorage.getItem("bo_token") || "";
      const res = await fetch(`${getApiBaseUrl()}/users/${editingUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          role: editRole,
          status: editStatus,
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
          department: editDepartment.trim(),
          email: editEmail.trim() || null,
          mobile: editMobile.trim() || null,
          telegramId: editTelegramId.trim() || null,
          pinCode: editPinCode.trim() || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setEditingUser(null);
        fetchUsers();
      } else {
        setUpdateError(data?.message || "ปรับปรุงข้อมูลล้มเหลว");
      }
    } catch {
      setUpdateError("เชื่อมต่อระบบขัดข้อง");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePasswordPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPasswordPin) return;

    if (changePassword && changePassword.length < 8) {
      setChangeError("รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร");
      return;
    }
    if (changePin && !/^\d{6}$/.test(changePin)) {
      setChangeError("PIN Code ต้องเป็นตัวเลข 6 หลักเท่านั้น");
      return;
    }

    setIsChangingPasswordPin(true);
    setChangeError("");

    try {
      const token = sessionStorage.getItem("bo_token") || "";
      const res = await fetch(`${getApiBaseUrl()}/users/${selectedUserForPasswordPin.id}/password-pin`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          passwordPlain: changePassword.trim() || undefined,
          pinCode: changePin.trim() || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowPasswordPinModal(false);
        setChangePassword("");
        setChangePin("");
        setSelectedUserForPasswordPin(null);
        fetchUsers();
        alert("ปรับปรุงข้อมูลรหัสผ่านและ PIN Code เรียบร้อยแล้ว!");
      } else {
        setChangeError(data?.message || "ปรับปรุงข้อมูลล้มเหลว");
      }
    } catch {
      setChangeError("เชื่อมต่อระบบขัดข้อง");
    } finally {
      setIsChangingPasswordPin(false);
    }
  };

  const handleToggleStatus = async (user: UserEntry) => {
    if (user.username === "admin") {
      alert("ไม่สามารถเปลี่ยนสถานะบัญชีหลัก (admin) ได้");
      return;
    }
    const newStatus = user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      const token = sessionStorage.getItem("bo_token") || "";
      const res = await fetch(`${getApiBaseUrl()}/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          role: user.role,
          status: newStatus,
          firstName: user.firstName,
          lastName: user.lastName,
          department: user.department,
          email: user.email,
          mobile: user.mobile,
          telegramId: user.telegramId,
          pinCode: user.pinCode,
        }),
      });

      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data?.message || "สลับสถานะผู้ใช้ล้มเหลว");
      }
    } catch {
      alert("เชื่อมต่อระบบขัดข้อง");
    }
  };

  const handleDeleteUser = async (id: string, username: string) => {
    if (username === "admin") {
      alert("ไม่สามารถลบผู้ใช้หลัก (admin) ได้");
      return;
    }
    if (!confirm(`คุณต้องการลบผู้ใช้ "${username}" ใช่หรือไม่?`)) {
      return;
    }

    try {
      const token = sessionStorage.getItem("bo_token") || "";
      const res = await fetch(`${getApiBaseUrl()}/users/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data?.message || "ลบผู้ใช้ไม่สำเร็จ");
      }
    } catch {
      alert("เชื่อมต่อระบบล้มเหลว");
    }
  };

  const handleTestTelegram = async (user: UserEntry) => {
    if (!user.telegramId) return;
    setTelegramTestingId(user.id);
    try {
      const token = sessionStorage.getItem("bo_token") || "";
      const res = await fetch(`${getApiBaseUrl()}/users/${user.id}/test-telegram`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        alert(`ส่งข้อความทดสอบไปยังคุณ ${user.firstName} (Telegram ID: ${user.telegramId}) สำเร็จแล้ว!`);
      } else {
        alert(data?.message || "ส่งข้อความทดสอบล้มเหลว");
      }
    } catch {
      alert("เชื่อมต่อระบบขัดข้อง");
    } finally {
      setTelegramTestingId(null);
    }
  };

  const handleSort = (field: keyof UserEntry) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const renderSortIcon = (field: keyof UserEntry) => {
    if (sortField !== field) {
      return <span className="material-symbols-outlined text-[14px] text-outline/30 ml-1 select-none">swap_vert</span>;
    }
    return sortDirection === "asc" ? (
      <span className="material-symbols-outlined text-[14px] text-secondary ml-1 select-none">arrow_upward</span>
    ) : (
      <span className="material-symbols-outlined text-[14px] text-secondary ml-1 select-none">arrow_downward</span>
    );
  };

  // Perform filtering & sorting on clientside list
  const filteredAndSortedUsers = users
    .filter((u) => {
      if (filterActiveOnly && u.status !== "ACTIVE") {
        return false;
      }
      if (!searchQuery.trim()) {
        return true;
      }
      const q = searchQuery.toLowerCase();
      return (
        u.username.toLowerCase().includes(q) ||
        (u.firstName || "").toLowerCase().includes(q) ||
        (u.lastName || "").toLowerCase().includes(q) ||
        (u.department || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.mobile || "").toLowerCase().includes(q) ||
        (u.telegramId || "").toLowerCase().includes(q) ||
        (u.pinCode || "").includes(q) ||
        String(u.systemSeqId).includes(q) ||
        u.role.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (!sortField) return 0;
      let valA = a[sortField];
      let valB = b[sortField];

      if (valA === null || valA === undefined) valA = "";
      if (valB === null || valB === undefined) valB = "";

      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();

      if (strA < strB) return sortDirection === "asc" ? -1 : 1;
      if (strA > strB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

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
    <div className="max-w-7xl mx-auto space-y-6 animate-success pb-10 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-bold text-2xl text-primary">จัดการบัญชีผู้ใช้ (User Management)</h2>
          <p className="text-sm text-on-surface-variant">สร้าง กำหนดสิทธิ์ และบริหารผู้ดูแลระบบหลังบ้าน</p>
        </div>
        <button
          onClick={() => {
            setCreateError("");
            setShowCreateModal(true);
          }}
          className="h-12 bg-secondary text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-2 px-5 hover:opacity-95 active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined !text-[18px]">person_add</span>
          เพิ่มผู้ใช้ใหม่
        </button>
      </div>

      {/* FILTER & UNIVERSAL SEARCH CARD */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-white border border-outline-variant rounded-2xl p-4 shadow-sm">
        <div className="relative flex-grow max-w-lg">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Universal Search (ค้นหาข้อมูลผู้ใช้, แผนก, ติดต่อ...)"
            className="w-full h-11 pl-10 pr-10 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-primary material-symbols-outlined text-[16px] cursor-pointer"
            >
              close
            </button>
          )}
        </div>

        <label className="flex items-center gap-2.5 text-sm font-bold text-primary cursor-pointer select-none shrink-0 self-center">
          <input
            type="checkbox"
            checked={filterActiveOnly}
            onChange={(e) => setFilterActiveOnly(e.target.checked)}
            className="w-4 h-4 rounded text-secondary border-outline-variant focus:ring-secondary cursor-pointer"
          />
          <span>แสดงเฉพาะผู้ใช้งานที่ Active</span>
        </label>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-4 bg-error/10 rounded-xl border border-error/20">
          <span className="material-symbols-outlined text-error">error</span>
          <p className="text-sm text-error font-semibold">{error}</p>
        </div>
      ) : (
        <div className="bg-white border border-outline-variant rounded-2xl overflow-hidden shadow-sm animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low border-b border-outline-variant select-none">
                <tr>
                  <th
                    onClick={() => handleSort("systemSeqId")}
                    className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider cursor-pointer hover:bg-surface-container-high/40"
                  >
                    <div className="flex items-center">
                      Seq ID
                      {renderSortIcon("systemSeqId")}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("username")}
                    className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider cursor-pointer hover:bg-surface-container-high/40"
                  >
                    <div className="flex items-center">
                      User ID
                      {renderSortIcon("username")}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("firstName")}
                    className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider cursor-pointer hover:bg-surface-container-high/40"
                  >
                    <div className="flex items-center">
                      ชื่อ-นามสกุล
                      {renderSortIcon("firstName")}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("department")}
                    className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider cursor-pointer hover:bg-surface-container-high/40"
                  >
                    <div className="flex items-center">
                      แผนก
                      {renderSortIcon("department")}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    อีเมล
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    เบอร์โทร
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    Telegram ID
                  </th>
                  <th
                    onClick={() => handleSort("role")}
                    className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider cursor-pointer hover:bg-surface-container-high/40"
                  >
                    <div className="flex items-center">
                      Role
                      {renderSortIcon("role")}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("status")}
                    className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider cursor-pointer hover:bg-surface-container-high/40"
                  >
                    <div className="flex items-center">
                      สถานะ
                      {renderSortIcon("status")}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("lastLogin")}
                    className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider cursor-pointer hover:bg-surface-container-high/40"
                  >
                    <div className="flex items-center">
                      Last Login
                      {renderSortIcon("lastLogin")}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50">
                {filteredAndSortedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-10 text-center text-outline/50 italic">
                      ไม่พบข้อมูลผู้ใช้งานตามเงื่อนไขที่กำหนด
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-surface-container-low/30 transition-colors">
                      <td className="px-4 py-3.5 text-outline font-semibold">
                        <code>{String(user.systemSeqId).padStart(4, "0")}</code>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-primary">{user.username}</td>
                      <td className="px-4 py-3.5 text-primary font-medium">
                        {user.firstName || user.lastName
                          ? `${user.firstName} ${user.lastName}`.trim()
                          : <span className="text-outline/40 italic">ไม่ได้ระบุ</span>}
                      </td>
                      <td className="px-4 py-3.5 text-outline">
                        {user.department ? (
                          <span className="bg-surface-container px-2.5 py-1 rounded-md text-xs font-bold text-slate-700">
                            {user.department}
                          </span>
                        ) : (
                          <span className="text-outline/40 italic">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-on-surface-variant font-medium">
                        {user.email || <span className="text-outline/30 italic">-</span>}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-on-surface-variant font-medium">
                        {user.mobile || <span className="text-outline/30 italic">-</span>}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-on-surface-variant font-medium">
                        {user.telegramId ? (
                          <div className="flex items-center gap-1.5">
                            <span>{user.telegramId.replace(/^@/, '')}</span>
                            <button
                              onClick={() => handleTestTelegram(user)}
                              disabled={telegramTestingId === user.id}
                              title="คลิกทดสอบส่ง Telegram"
                              className="text-sky-500 hover:text-sky-700 disabled:opacity-50 inline-flex items-center justify-center cursor-pointer transition-all active:scale-90"
                            >
                              {telegramTestingId === user.id ? (
                                <div className="w-3.5 h-3.5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin shrink-0" />
                              ) : (
                                <span className="material-symbols-outlined text-[15px]">send</span>
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-outline/30 italic">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-bold border ${
                            user.role === "SYSTEM_ADMIN"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : user.role === "QR_GENERATOR"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-teal-50 text-teal-700 border-teal-200"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${user.status === "ACTIVE" ? "bg-green-600 animate-pulse" : "bg-red-600"}`} />
                          <span className={user.status === "ACTIVE" ? "text-green-700 font-bold" : "text-red-700 font-bold"}>
                            {user.status === "ACTIVE" ? "Active" : "Inactive"}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-outline font-semibold">
                        {user.lastLogin ? (
                          new Date(user.lastLogin).toLocaleString("th-TH", {
                            year: "numeric",
                            month: "short",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          }) + " น."
                        ) : (
                          <span className="text-outline/40 italic">- ยังไม่เคยล็อกอิน -</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        {/* Edit button (violet-blue rounded button) */}
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setEditRole(user.role);
                            setEditStatus(user.status);
                            setEditFirstName(user.firstName || "");
                            setEditLastName(user.lastName || "");
                            setEditDepartment(user.department || "");
                            setEditEmail(user.email || "");
                            setEditMobile(user.mobile || "");
                            setEditTelegramId(user.telegramId || "");
                            setEditPinCode(user.pinCode || "");
                            setUpdateError("");
                          }}
                          title="แก้ไขข้อมูลผู้ใช้"
                          className="material-symbols-outlined text-white bg-[#5B50E1] hover:bg-[#4a3fd1] hover:shadow transition-all p-1.5 rounded-full cursor-pointer !text-[15px] active:scale-95 inline-flex items-center justify-center shrink-0"
                        >
                          edit
                        </button>

                        {/* Change Password / PIN button (orange rounded button) */}
                        <button
                          onClick={() => {
                            setSelectedUserForPasswordPin(user);
                            setChangePassword("");
                            setChangePin(user.pinCode || "");
                            setChangeError("");
                            setShowPasswordPinModal(true);
                          }}
                          title="ตั้งค่ารหัสผ่าน / PIN Code"
                          className="material-symbols-outlined text-white bg-[#FFA800] hover:bg-[#e09400] hover:shadow transition-all p-1.5 rounded-full cursor-pointer !text-[15px] active:scale-95 inline-flex items-center justify-center shrink-0"
                        >
                          key
                        </button>

                        {/* Toggle status button (slate-gray rounded button) */}
                        <button
                          onClick={() => handleToggleStatus(user)}
                          disabled={user.username === "admin"}
                          title={user.status === "ACTIVE" ? "ปิดใช้งานบัญชีผู้ใช้" : "เปิดใช้งานบัญชีผู้ใช้"}
                          className={`material-symbols-outlined transition-all p-1.5 rounded-full cursor-pointer !text-[15px] active:scale-95 inline-flex items-center justify-center shrink-0 ${
                            user.username === "admin"
                              ? "text-white bg-slate-200 cursor-not-allowed opacity-50"
                              : "text-white bg-[#9BA3AF] hover:bg-[#7e8793] hover:shadow"
                          }`}
                        >
                          {user.status === "ACTIVE" ? "person_off" : "person"}
                        </button>

                        {/* Delete button (red rounded button) */}
                        <button
                          onClick={() => handleDeleteUser(user.id, user.username)}
                          disabled={user.username === "admin"}
                          title="ลบผู้ใช้งาน"
                          className={`material-symbols-outlined transition-all p-1.5 rounded-full cursor-pointer !text-[15px] active:scale-95 inline-flex items-center justify-center shrink-0 ${
                            user.username === "admin"
                              ? "text-white bg-rose-200 cursor-not-allowed opacity-50"
                              : "text-white bg-[#FF3B30] hover:bg-[#e02e24] hover:shadow"
                          }`}
                        >
                          delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-success">
          <div className="bg-white border border-outline-variant rounded-2xl p-6 md:p-8 max-w-lg w-full space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center pb-2 border-b border-outline-variant">
              <h3 className="font-bold text-lg text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">person_add</span>
                เพิ่มผู้ใช้งานระบบใหม่
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="material-symbols-outlined text-outline hover:text-primary cursor-pointer text-xl"
              >
                close
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">User ID (Logon Name) *</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="เช่น user01"
                    required
                    className="w-full h-11 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Password *</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="ขั้นต่ำ 8 ตัวอักษร"
                    required
                    className="w-full h-11 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">ชื่อจริง (First Name) *</label>
                  <input
                    type="text"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    placeholder="เช่น สมชาย"
                    required
                    className="w-full h-11 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">นามสกุล (Last Name) *</label>
                  <input
                    type="text"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder="เช่น รักดี"
                    required
                    className="w-full h-11 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">รหัสย่อแผนก (Department) *</label>
                  <input
                    type="text"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    placeholder="เช่น IT, PD, CS"
                    required
                    className="w-full h-11 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">บทบาทสิทธิ์ (Role) *</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full h-11 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:border-secondary"
                  >
                    <option value="CRM_MANAGER">CRM_MANAGER (ดูแลข้อมูลลูกค้า)</option>
                    <option value="QR_GENERATOR">QR_GENERATOR (ฝ่ายผลิตสร้างคิวอาร์)</option>
                    <option value="SYSTEM_ADMIN">SYSTEM_ADMIN (ดูแลระบบทั้งหมด)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">อีเมล (Email)</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="example@windowasia.com"
                    className="w-full h-11 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">เบอร์โทรศัพท์ (Mobile)</label>
                  <input
                    type="text"
                    value={newMobile}
                    onChange={(e) => setNewMobile(e.target.value)}
                    placeholder="เช่น 0918895132"
                    className="w-full h-11 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Quick PIN Code (6 หลัก)</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={newPinCode}
                    onChange={(e) => setNewPinCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="เช่น 123456"
                    className="w-full h-11 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase">Telegram Chat ID (เฉพาะตัวเลขสำหรับส่งทดสอบ)</label>
                <input
                  type="text"
                  value={newTelegramId}
                  onChange={(e) => setNewTelegramId(e.target.value.trim())}
                  placeholder="เช่น 7656347433"
                  className="w-full h-11 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                />
              </div>

              {createError && (
                <p className="text-xs text-error font-semibold leading-relaxed bg-error/5 p-2.5 rounded-lg border border-error/15">
                  {createError}
                </p>
              )}

              <div className="flex gap-3 pt-4 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 h-11 border border-outline-variant text-primary text-xs font-bold rounded-lg hover:bg-surface-container cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 h-11 bg-secondary text-white text-xs font-bold rounded-lg hover:opacity-90 cursor-pointer"
                >
                  {isCreating ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-success">
          <div className="bg-white border border-outline-variant rounded-2xl p-6 md:p-8 max-w-lg w-full space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center pb-2 border-b border-outline-variant">
              <h3 className="font-bold text-lg text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">edit</span>
                แก้ไขข้อมูลผู้ใช้งาน: {editingUser.username}
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="material-symbols-outlined text-outline hover:text-primary cursor-pointer text-xl"
              >
                close
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">ชื่อจริง (First Name) *</label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    placeholder="ชื่อจริง"
                    required
                    className="w-full h-11 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">นามสกุล (Last Name) *</label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    placeholder="นามสกุล"
                    required
                    className="w-full h-11 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">รหัสย่อแผนก (Department) *</label>
                  <input
                    type="text"
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    placeholder="แผนก"
                    required
                    className="w-full h-11 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">บทบาทสิทธิ์ (Role) *</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    disabled={editingUser.username === "admin"}
                    className="w-full h-11 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:border-secondary disabled:opacity-50"
                  >
                    <option value="CRM_MANAGER">CRM_MANAGER (ดูแลข้อมูลลูกค้า)</option>
                    <option value="QR_GENERATOR">QR_GENERATOR (ฝ่ายผลิตสร้างคิวอาร์)</option>
                    <option value="SYSTEM_ADMIN">SYSTEM_ADMIN (ดูแลระบบทั้งหมด)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">อีเมล (Email)</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="example@windowasia.com"
                    className="w-full h-11 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">เบอร์โทรศัพท์ (Mobile)</label>
                  <input
                    type="text"
                    value={editMobile}
                    onChange={(e) => setEditMobile(e.target.value)}
                    placeholder="เบอร์โทร"
                    className="w-full h-11 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Quick PIN Code (6 หลัก)</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={editPinCode}
                    onChange={(e) => setEditPinCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="ใส่ PIN 6 หลัก"
                    className="w-full h-11 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase">Telegram Chat ID</label>
                <input
                  type="text"
                  value={editTelegramId}
                  onChange={(e) => setEditTelegramId(e.target.value.trim())}
                  placeholder="เช่น 7656347433"
                  className="w-full h-11 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase">สถานะผู้ใช้งาน (Status) *</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  disabled={editingUser.username === "admin"}
                  className="w-full h-11 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:border-secondary disabled:opacity-50"
                >
                  <option value="ACTIVE">ACTIVE (ปกติ)</option>
                  <option value="SUSPENDED">SUSPENDED (ปิดการใช้งาน)</option>
                  <option value="LOCKED">LOCKED (ล็อคชั่วคราวจากรหัสผ่านผิด)</option>
                </select>
              </div>

              {updateError && (
                <p className="text-xs text-error font-semibold leading-relaxed bg-error/5 p-2.5 rounded-lg border border-error/15">
                  {updateError}
                </p>
              )}

              <div className="flex gap-3 pt-4 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 h-11 border border-outline-variant text-primary text-xs font-bold rounded-lg hover:bg-surface-container cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 h-11 bg-secondary text-white text-xs font-bold rounded-lg hover:opacity-90 cursor-pointer"
                >
                  {isUpdating ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD / PIN MODAL */}
      {showPasswordPinModal && selectedUserForPasswordPin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-success">
          <div className="bg-white border border-outline-variant rounded-2xl p-6 md:p-8 max-w-sm w-full space-y-5 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-outline-variant">
              <h3 className="font-bold text-lg text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-[#FFA800]">key</span>
                ตั้งค่ารหัสผ่าน / PIN
              </h3>
              <button
                onClick={() => setShowPasswordPinModal(false)}
                className="material-symbols-outlined text-outline hover:text-primary cursor-pointer text-xl"
              >
                close
              </button>
            </div>

            <p className="text-xs text-on-surface-variant">
              เปลี่ยนรหัสผ่าน หรือ Quick PIN Code สำหรับบัญชีผู้ใช้: <b>{selectedUserForPasswordPin.username}</b>
            </p>

            <form onSubmit={handleChangePasswordPin} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase">รหัสผ่านใหม่ (New Password)</label>
                <input
                  type="password"
                  value={changePassword}
                  onChange={(e) => setChangePassword(e.target.value)}
                  placeholder="เว้นว่างไว้หากไม่ต้องการเปลี่ยน"
                  className="w-full h-11 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase">Quick PIN Code (6 หลัก)</label>
                <input
                  type="text"
                  maxLength={6}
                  value={changePin}
                  onChange={(e) => setChangePin(e.target.value.replace(/\D/g, ''))}
                  placeholder="ตัวเลข 6 หลัก (เว้นว่างไว้เพื่อลบ PIN)"
                  className="w-full h-11 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all font-mono font-bold"
                />
              </div>

              {changeError && (
                <p className="text-xs text-error font-semibold leading-relaxed bg-error/5 p-2 rounded border border-error/15">
                  {changeError}
                </p>
              )}

              <div className="flex gap-3 pt-4 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setShowPasswordPinModal(false)}
                  className="flex-1 h-11 border border-outline-variant text-primary text-xs font-bold rounded-lg hover:bg-surface-container cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isChangingPasswordPin}
                  className="flex-1 h-11 bg-secondary text-white text-xs font-bold rounded-lg hover:opacity-90 cursor-pointer"
                >
                  {isChangingPasswordPin ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
