"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";

interface CustomImageItem {
  itemCode: string;
  itemName: string | null;
  imageBase64: string;
  createdAt: string;
  registrationCount?: number;
}

interface ProductLookupResult {
  itemCode: string;
  itemName: string;
}

export default function ProductImagesPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Gallery library list
  const [galleryItems, setGalleryItems] = useState<CustomImageItem[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);

  // Search & Upload state
  const [searchCode, setSearchCode] = useState("");
  const [lookupResult, setLookupResult] = useState<ProductLookupResult | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");

  // Upload States
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [compressedSizeInfo, setCompressedSizeInfo] = useState<string>("");
  const [imageScope, setImageScope] = useState<"prefix" | "exact">("prefix");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingCards, setUploadingCards] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const stored = sessionStorage.getItem("bo_session");
    if (!stored) {
      router.replace("/backoffice");
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      setSession(parsed);
      setLoading(false);
      fetchGallery();
    } catch {
      router.replace("/backoffice");
    }
  }, []);

  const fetchGallery = async () => {
    setGalleryLoading(true);
    try {
      const token = sessionStorage.getItem("bo_token") || "";
      const res = await fetch(`${getApiBaseUrl()}/backoffice/custom-images`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setGalleryItems(data);
      }
    } catch (err) {
      console.error("Failed to load image gallery:", err);
    } finally {
      setGalleryLoading(false);
    }
  };

  const handleProductLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return;

    setLookupLoading(true);
    setLookupError("");
    setLookupResult(null);
    setUploadPreview(null);
    setCompressedSizeInfo("");

    try {
      const token = sessionStorage.getItem("bo_token") || "";
      // Call check-product endpoint to verify if the code exists
      const res = await fetch(`${getApiBaseUrl()}/backoffice/check-product`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ label: searchCode.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setLookupResult({
          itemCode: data.product.itemCode,
          itemName: data.product.itemName || "สินค้ากลุ่มรหัส " + data.product.itemCode,
        });
      } else {
        // Fallback for custom model prefix or new codes not yet in SAP Order
        setLookupResult({
          itemCode: searchCode.trim(),
          itemName: "สินค้ากลุ่มรหัส " + searchCode.trim(),
        });
      }
    } catch (err: any) {
      setLookupResult({
        itemCode: searchCode.trim(),
        itemName: "สินค้ากลุ่มรหัส " + searchCode.trim(),
      });
    } finally {
      setLookupLoading(false);
    }
  };

  const handleImageUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDim = 600;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.75);
          setUploadPreview(compressedBase64);

          const strLength = compressedBase64.length - "data:image/jpeg;base64,".length;
          const sizeInBytes = Math.ceil(strLength * 0.75);
          const sizeInKb = (sizeInBytes / 1024).toFixed(1);
          const origInMb = (file.size / (1024 * 1024)).toFixed(2);
          setCompressedSizeInfo(`${sizeInKb} KB (บีบอัดลงจาก ${origInMb} MB)`);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCardImageChange = (e: React.ChangeEvent<HTMLInputElement>, itemCode: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDim = 600;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.75);

          setUploadingCards((prev) => ({ ...prev, [itemCode]: true }));
          try {
            const token = sessionStorage.getItem("bo_token") || "";
            const res = await fetch(`${getApiBaseUrl()}/backoffice/upload-image`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                itemCode,
                imageBase64: compressedBase64,
              }),
            });

            if (!res.ok) {
              throw new Error("Failed to save image");
            }

            alert("เปลี่ยนรูปภาพสินค้าสำเร็จ!");
            fetchGallery();
          } catch (err: any) {
            alert(err.message || "เกิดข้อผิดพลาดในการเปลี่ยนรูปภาพ");
          } finally {
            setUploadingCards((prev) => ({ ...prev, [itemCode]: false }));
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const saveProductImage = async () => {
    if (!uploadPreview || !lookupResult) return;
    setUploadingImage(true);
    try {
      const token = sessionStorage.getItem("bo_token") || "";
      let targetCode = lookupResult.itemCode;

      const res = await fetch(`${getApiBaseUrl()}/backoffice/upload-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          itemCode: targetCode,
          imageBase64: uploadPreview,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save image");
      }

      alert("บันทึกรูปภาพสินค้าสำเร็จ!");
      setUploadPreview(null);
      setCompressedSizeInfo("");
      setLookupResult(null);
      setSearchCode("");
      fetchGallery();
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการบันทึกรูปภาพ");
    } finally {
      setUploadingImage(false);
    }
  };

  const deleteProductImage = async (itemCode: string) => {
    if (!confirm(`คุณต้องการลบรูปภาพสินค้าของรหัส "${itemCode}" ใช่หรือไม่?`)) return;

    try {
      const token = sessionStorage.getItem("bo_token") || "";
      const res = await fetch(`${getApiBaseUrl()}/backoffice/product-image/${itemCode}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to delete image");
      }

      alert("ลบรูปภาพสินค้าสำเร็จ!");
      fetchGallery();
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการลบรูปภาพ");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-success pb-12">
      {/* Header */}
      <div>
        <h2 className="font-bold text-2xl text-primary">จัดการรูปภาพสินค้า (Product Image Portal)</h2>
        <p className="text-sm text-on-surface-variant">อัปโหลด แก้ไข และลบภาพสินค้าพรีวิวสำหรับการรับประกันสินค้าของลูกค้า</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Side: Upload Image Form */}
        <div className="lg:col-span-1 bg-white border border-outline-variant rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="font-bold text-sm text-primary uppercase tracking-wider border-b pb-2">อัปโหลดภาพสินค้าใหม่</h3>
          
          <form onSubmit={handleProductLookup} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">รหัสกลุ่มสินค้าพรีฟิกซ์ (Model Prefix)</label>
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                placeholder="เช่น FA00-W0114"
                className="w-full h-12 px-4 bg-surface-container-low border border-outline-variant rounded-lg text-sm font-mono outline-none focus:border-secondary transition-all"
                disabled={lookupLoading}
              />
              <p className="text-[10px] text-outline">
                ระบุรหัสสีและรุ่นกลุ่มสินค้า (Prefix) เท่านั้น รูปภาพนี้จะถูกนำไปใช้ร่วมกับสินค้าโมเดลนี้ในทุกๆ ขนาดความกว้างยาว
              </p>
            </div>
            <button
              type="submit"
              disabled={lookupLoading || !searchCode.trim()}
              className="w-full h-12 bg-primary hover:opacity-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {lookupLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">search</span>
                  ค้นหารหัสเพื่อผูกรูป
                </>
              )}
            </button>
          </form>

          {lookupResult && (
            <div className="border-t border-outline-variant/60 pt-4 space-y-4 animate-success">
              <div className="bg-surface-container/30 border border-outline-variant p-3.5 rounded-xl space-y-1">
                <p className="text-[10px] text-outline font-bold uppercase tracking-wider">เป้าหมายที่ผูกข้อมูล</p>
                <p className="font-bold text-primary text-xs tracking-mono break-all">{lookupResult.itemCode}</p>
                <p className="text-xs text-on-surface-variant truncate">{lookupResult.itemName}</p>
              </div>

              {/* Upload Dropzone */}
              <div className="space-y-4">
                <div className="bg-surface-container-low border border-dashed border-outline-variant rounded-2xl p-5 text-center flex flex-col items-center justify-center relative group hover:border-secondary transition-all">
                  <span className="material-symbols-outlined text-outline text-3xl mb-1.5 group-hover:scale-110 duration-200">cloud_upload</span>
                  <p className="text-xs text-on-surface-variant font-bold">เลือกไฟล์รูปภาพเพื่ออัปโหลด</p>
                  <p className="text-[10px] text-outline mt-0.5">WebP, PNG, JPG (ระบบจะลดขนาดและบีบอัดภาพอัตโนมัติ)</p>
                  
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={handleImageUploadChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    disabled={uploadingImage}
                  />
                </div>

                {uploadPreview && (
                  <div className="bg-secondary-container/10 border border-secondary-container/20 rounded-xl p-3.5 space-y-3 animate-success">
                    <div className="flex justify-between items-center text-xs font-bold text-primary">
                      <span>ภาพจำลองพรีวิวที่ลดขนาดแล้ว</span>
                      {compressedSizeInfo && (
                        <span className="text-secondary bg-secondary-container/20 px-2 py-0.5 rounded-full text-[10px]">
                          {compressedSizeInfo}
                        </span>
                      )}
                    </div>

                    <div className="w-full h-32 bg-surface-container border border-outline-variant/80 rounded-xl overflow-hidden flex items-center justify-center">
                      <img src={uploadPreview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    
                    {/* Saves directly to normalized model prefix */}
                    <div className="space-y-1">
                      <p className="text-[10px] text-outline font-semibold">
                        รูปภาพนี้จะถูกบันทึกเป็นภาพพรีวิวสำหรับโมเดลรหัสหลัก: <code>{lookupResult.itemCode.includes("-") ? lookupResult.itemCode.split("-").slice(0, -1).join("-") : lookupResult.itemCode}</code>
                      </p>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={saveProductImage}
                        disabled={uploadingImage}
                        className="flex-grow h-10 bg-secondary text-white font-extrabold text-xs rounded-lg shadow hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {uploadingImage ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-base">save</span>
                            <span>บันทึกรูปภาพ</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadPreview(null);
                          setCompressedSizeInfo("");
                        }}
                        disabled={uploadingImage}
                        className="h-10 px-4 border border-outline-variant text-outline hover:text-primary font-extrabold text-xs rounded-lg hover:bg-surface-container-low active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Image Library Gallery */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-sm text-primary uppercase tracking-wider">คลังภาพสินค้าที่อัปโหลด ({galleryItems.length})</h3>
              <button 
                onClick={fetchGallery}
                disabled={galleryLoading}
                className="h-9 px-3.5 bg-surface-container hover:bg-surface-container-high border border-outline-variant/60 text-primary font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer"
              >
                <span className={`material-symbols-outlined text-base ${galleryLoading ? "animate-spin" : ""}`}>refresh</span>
                รีเฟรช
              </button>
            </div>

            {galleryLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-outline">
                <div className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-semibold">กำลังดึงข้อมูลคลังภาพ...</p>
              </div>
            ) : galleryItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-outline gap-2.5">
                <span className="material-symbols-outlined text-5xl opacity-40">image_search</span>
                <div>
                  <p className="text-xs font-bold">ไม่พบภาพสินค้าที่อัปโหลดเองในระบบ</p>
                  <p className="text-[10px] opacity-80 mt-0.5">คุณสามารถใช้ช่องค้นหาด้านซ้ายเพื่อเพิ่มภาพใหม่เข้าสู่ฐานข้อมูลได้ทันที</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {galleryItems.map((item) => (
                  <div key={item.itemCode} className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm flex flex-col group hover:shadow transition-all animate-success relative">
                    
                    {/* Direct Upload input for Card */}
                    <input
                      id={`file-input-${item.itemCode}`}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleCardImageChange(e, item.itemCode)}
                      className="hidden"
                    />

                    {/* Loader Card Overlay */}
                    {uploadingCards[item.itemCode] && (
                      <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 z-10">
                        <div className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                        <p className="text-[10px] font-black text-secondary">กำลังอัปโหลดรูปใหม่...</p>
                      </div>
                    )}

                    {/* Thumbnail */}
                    <div className="w-full h-32 bg-surface-container border-b border-outline-variant/60 relative overflow-hidden flex items-center justify-center">
                      <img src={item.imageBase64} alt={item.itemCode} className="w-full h-full object-cover group-hover:scale-105 duration-300" />
                    </div>

                    {/* Meta info */}
                    <div className="p-3.5 flex-grow flex flex-col justify-between gap-3 text-sm">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[8.5px] font-black rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            <span className="material-symbols-outlined text-[10px] !fill-1">verified_user</span>
                            ลงทะเบียนแล้ว {item.registrationCount || 0} ชิ้น
                          </span>
                        </div>
                        <p className="font-bold text-xs text-primary font-mono truncate tracking-tight pt-1">{item.itemCode}</p>
                        <p className="text-[10px] text-on-surface-variant truncate">{item.itemName || "สินค้าทั่วไป"}</p>
                      </div>

                      {/* Action buttons (Direct replacement + Delete) */}
                      <div className="flex gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => document.getElementById(`file-input-${item.itemCode}`)?.click()}
                          className="flex-grow h-9 bg-secondary/10 hover:bg-secondary/15 text-secondary border border-secondary/20 font-bold text-xs rounded-lg active:scale-95 duration-100 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">image_search</span>
                          เปลี่ยนรูป
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => deleteProductImage(item.itemCode)}
                          className="h-9 w-9 bg-error/5 hover:bg-error/10 text-error border border-error/20 font-bold rounded-lg active:scale-95 duration-100 transition-all flex items-center justify-center cursor-pointer"
                          title="ลบรูปภาพ"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
