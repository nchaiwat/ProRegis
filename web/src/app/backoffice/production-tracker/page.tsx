"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProductionTrackerIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/backoffice/production-tracker/dynamic");
  }, [router]);

  return null;
}
