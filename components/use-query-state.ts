'use client'

// เก็บค่าตัวกรองไว้ใน URL (?cat=2&state=open) → กดย้อนกลับ / รีเฟรช / ส่งลิงก์ให้คนอื่น แล้วตัวกรองยังอยู่
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function useQueryState<T extends string>(key: string, fallback: T): [T, (v: T) => void] {
    const params = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const value = (params.get(key) as T | null) ?? fallback;
    const set = (v: T) => {
        const next = new URLSearchParams(params.toString());
        if (v === fallback) next.delete(key); else next.set(key, v);
        const qs = next.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    };
    return [value, set];
}
