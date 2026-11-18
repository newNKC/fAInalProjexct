'use client'

// เก็บไฟล์แนบจริงไว้ใน IndexedDB ของเบราว์เซอร์ (ไฟล์ใหญ่เก็บใน localStorage ไม่ได้)
// key = Attachment.id · ถ้าต่อ backend จริง ให้เปลี่ยน 3 ฟังก์ชันนี้เป็นการอัปโหลด/ดาวน์โหลดผ่าน API แทน

const DB_NAME = "rq-files";
const STORE = "files";

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
    });
}

export const saveFile = (id: string, file: Blob) => run("readwrite", (s) => s.put(file, id));
export const loadFile = (id: string) => run<Blob | undefined>("readonly", (s) => s.get(id));
export const deleteFile = (id: string) => run("readwrite", (s) => s.delete(id));

// เปิดดูในแท็บใหม่ (PDF/รูปเปิดได้ในเบราว์เซอร์) หรือดาวน์โหลด
export async function openFile(id: string, name: string, download = false): Promise<boolean> {
    const blob = await loadFile(id).catch(() => undefined);
    if (!blob) return false;
    const url = URL.createObjectURL(blob);
    if (download) {
        const a = document.createElement("a");
        a.href = url; a.download = name; a.click();
    } else {
        window.open(url, "_blank", "noopener");
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return true;
}
