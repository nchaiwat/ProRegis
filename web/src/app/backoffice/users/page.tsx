"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";

interface UserEntry {
  id: string;
  username: string;
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

  // Form states for creating a user
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("CRM_MANAGER");
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Edit states
  const [editingUser, setEditingUser] = useState<UserEntry | null>(null);
  const [editRole, setEditRole] = useState("CRM_MANAGER");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState("");

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
    if (!newUsername.trim() || !newPassword.trim()) {
      setCreateError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    if (newPassword.length < 8) {
      setCreateError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
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
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowCreateModal(false);
        setNewUsername("");
        setNewPassword("");
        setNewRole("CRM_MANAGER");
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
    <div className="max-w-4xl mx-auto space-y-6 animate-success">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-bold text-2xl text-primary font-bold">จัดการบัญชีผู้ใช้</h2>
          <p className="text-sm text-on-surface-variant">สร้างและกำหนดสิทธิ์ผู้เข้าใช้งานระบบหลังบ้าน</p>
        </div>
        <button
          onClick={() => {
            setCreateError("");
            setShowCreateModal(true);
          }}
          className="h-12 bg-secondary text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-2 px-5 hover:opacity-95 active:scale-95 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined !text-[18px]">person_add</span>
          เพิ่มผู้ใช้ใหม่
        </button>
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
        <div className="bg-white border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Username</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">บทบาทสิทธิ์ (Role)</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">สถานะ</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">สร้างเมื่อ</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-on-surface-variant uppercase tracking-wider">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-primary">{user.username}</td>
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
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md font-bold border ${
                          user.status === "ACTIVE"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : user.status === "LOCKED"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-outline">
                      {new Date(user.createdAt).toLocaleDateString("th-TH", {
                        year: "numeric",
                        month: "short",
                        day: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setEditingUser(user);
                          setEditRole(user.role);
                          setEditStatus(user.status);
                          setUpdateError("");
                        }}
                        className="material-symbols-outlined text-outline hover:text-secondary transition-colors p-1.5 rounded-full hover:bg-surface-container cursor-pointer !text-[18px]"
                      >
                        edit
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.username)}
                        disabled={user.username === "admin"}
                        className={`material-symbols-outlined transition-colors p-1.5 rounded-full cursor-pointer !text-[18px] ${
                          user.username === "admin"
                            ? "text-outline/20 cursor-not-allowed"
                            : "text-outline hover:text-error hover:bg-surface-container"
                        }`}
                      >
                        delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-success">
          <div className="bg-white border border-outline-variant rounded-2xl p-6 md:p-8 max-w-sm w-full space-y-5 shadow-2xl">
            <h3 className="font-bold text-lg text-primary">เพิ่มผู้ใช้งานใหม่</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase">Username</label>
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
                <label className="text-xs font-bold text-on-surface-variant uppercase">Password (min 8 chars)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-11 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase">Role</label>
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

              {createError && (
                <p className="text-xs text-error font-semibold leading-relaxed">{createError}</p>
              )}

              <div className="flex gap-3 pt-2">
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
                  {isCreating ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-success">
          <div className="bg-white border border-outline-variant rounded-2xl p-6 md:p-8 max-w-sm w-full space-y-5 shadow-2xl">
            <h3 className="font-bold text-lg text-primary">แก้ไขสิทธิ์และสถานะ: {editingUser.username}</h3>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase">บทบาทสิทธิ์ (Role)</label>
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
                <label className="text-xs font-bold text-on-surface-variant uppercase">สถานะผู้ใช้งาน (Status)</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  disabled={editingUser.username === "admin"}
                  className="w-full h-11 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:border-secondary disabled:opacity-50"
                >
                  <option value="ACTIVE">ACTIVE (ปกติ)</option>
                  <option value="LOCKED">LOCKED (ล็อคชั่วคราว)</option>
                  <option value="SUSPENDED">SUSPENDED (ปิดการใช้งาน)</option>
                </select>
              </div>

              {updateError && (
                <p className="text-xs text-error font-semibold leading-relaxed">{updateError}</p>
              )}

              <div className="flex gap-3 pt-2">
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
                  {isUpdating ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
