'use client'

// เตือนก่อนปิดแท็บ/รีเฟรช เมื่อกรอกฟอร์มค้างไว้ (พฤติกรรมมาตรฐานของเบราว์เซอร์)
import { useEffect } from "react";

export function useLeaveGuard(dirty: boolean) {
    useEffect(() => {
        if (!dirty) return;
        const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
        window.addEventListener("beforeunload", onBeforeUnload);
        return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }, [dirty]);
}
