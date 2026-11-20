'use client';

import { Guard } from '@/components/role-shell';
import { allRoles } from '@/data/users';

// หมวดคำขอ (งานของพิชญ์ เดิม admin/categories/page.tsx + Data/workmeData.ts)
// ปรับให้ใช้ข้อมูลจริงจาก store: เพิ่ม/แก้/ลบ/เปิด-ปิดใช้งานแล้วมีผลกับแบบฟอร์มส่งคำขอและทุกหน้า · "ใช้ N คำขอ" นับจากคำขอจริง
// เติมส่วนที่ขาด: เรียงลำดับรายการ, สถานะเปิด/ปิดใช้งานแสดงในรายการ, ยืนยันก่อนลบ, กระดิ่งใช้งานได้จริง
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Pencil1, Plus, Search1, Trash1 } from '@tailgrids/icons';
import ConfirmDialog from '@/components/confirm-dialog';
import { NotificationBell } from '@/components/page-header';
import SortSelect, { sortBy, type SortOption } from '@/components/sort-select';
import type { Category } from '@/data/categories';
import { useStore } from '@/data/store';

const CATEGORY_COLORS = ['#4F46E5', '#0284C7', '#E11D48', '#D97706', '#059669', '#7C3AED', '#DB2777', '#475569'];

function CategoriesPage() {
    const store = useStore();
    useEffect(() => { document.title = 'หมวดคำขอ · ระบบจัดการคำขอ'; }, []);
    const usageCount = (category: Category) => store.requests.filter((r) => r.categoryId === category.id).length;

    // --- STATE MANAGEMENT ---
    const [search, setSearch] = useState(''); // คำค้นหา
    const [sort, setSort] = useState('id');
    const [editingId, setEditingId] = useState<number | null>(null); // หมวดที่กำลังแก้ไข (null = โหมดเพิ่มใหม่)
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState(CATEGORY_COLORS[0]);
    const [active, setActive] = useState(true);
    const [formError, setFormError] = useState('');
    const [toDelete, setToDelete] = useState<Category | null>(null);

    /** กรองรายการหมวดคำขอตามคำค้นหา (ชื่อ + คำอธิบาย) */
    const filteredCategories = useMemo(() => {
        const query = search.trim().toLocaleLowerCase('th');
        return store.categories.filter((category) => `${category.name} ${category.description}`.toLocaleLowerCase('th').includes(query));
    }, [store.categories, search]);

    const options: SortOption<Category>[] = [
        { key: 'id', label: 'สร้างก่อน', value: (c) => c.id },
        { key: 'name', label: 'ชื่อหมวด', value: (c) => c.name },
        { key: 'used', label: 'ใช้มากสุด', value: (c) => usageCount(c), dir: 'desc' },
        { key: 'active', label: 'เปิดใช้งานก่อน', value: (c) => (c.active ? 0 : 1) },
    ];

    const resetForm = () => { setEditingId(null); setName(''); setDescription(''); setColor(CATEGORY_COLORS[0]); setActive(true); setFormError(''); };

    const handleEdit = (category: Category) => {
        setEditingId(category.id); setName(category.name); setDescription(category.description); setColor(category.color); setActive(category.active); setFormError('');
    };

    /** บันทึกฟอร์ม (เพิ่มใหม่ / แก้ไข) · กันชื่อหมวดซ้ำ */
    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const normalizedName = name.trim().toLocaleLowerCase('th');
        const duplicate = store.categories.some((category) => category.name.toLocaleLowerCase('th') === normalizedName && category.id !== editingId);
        if (duplicate) { setFormError('มีหมวดคำขอนี้อยู่แล้ว'); return; }
        store.saveCategory({ ...(editingId ? { id: editingId } : {}), name: name.trim(), description: description.trim(), color, active });
        store.showToast(editingId ? `แก้ไขหมวด “${name.trim()}” แล้ว` : `เพิ่มหมวด “${name.trim()}” แล้ว`);
        resetForm();
    };

    /** ลบหมวดคำขอ (ลบได้เมื่อยังไม่มีคำขอใช้หมวดนี้) */
    const handleDelete = (category: Category) => {
        if (usageCount(category) > 0) return;
        store.removeCategory(category.id);
        store.showToast(`ลบหมวด “${category.name}” แล้ว`);
        if (editingId === category.id) resetForm();
    };

    return (
        <div className="min-w-0 text-slate-800">
            <div className="w-full">
                <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[30px] font-bold leading-9 tracking-tight text-slate-900">หมวดคำขอ</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* ช่องค้นหาหมวด */}
                        <label className="relative block w-[260px] max-w-[calc(100vw-100px)]">
                            <span className="sr-only">ค้นหาหมวดคำขอ</span>
                            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาชื่อหรือคำอธิบายหมวด"
                                className="h-11 w-full rounded-lg border border-slate-300 bg-white py-3 pl-4 pr-10 text-sm text-slate-700 outline-none placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                            <Search1 className="pointer-events-none absolute right-2.5 top-3 h-4 w-4 text-slate-600" />
                        </label>
                        <NotificationBell />
                    </div>
                </header>

                <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.65fr_1fr]">
                    {/* รายการหมวดคำขอทั้งหมด */}
                    <section aria-label="หมวดคำขอทั้งหมด" className="rounded-xl border border-slate-300 bg-white p-6 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">หมวดคำขอทั้งหมด</h2>
                                <p className="mt-1.5 text-sm text-slate-600">จัดการ เพิ่ม แก้ไข และลบหมวดคำขอ</p>
                            </div>
                            <SortSelect options={options} value={sort} onChange={setSort} />
                        </div>
                        <div className="mt-2 divide-y divide-slate-300">
                            {sortBy(filteredCategories, options, sort).map((category) => (
                                <div key={category.id}
                                    className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 py-4 sm:grid-cols-[100px_minmax(0,1fr)_auto_auto_auto] ${category.active ? '' : 'opacity-60'}`}>
                                    {/* ป้ายชื่อหมวดคำขอ พร้อมสีตามที่กำหนด */}
                                    <span className="w-fit rounded border px-3 py-1.5 text-xs font-semibold" style={{ color: category.color, borderColor: category.color }}>
                                        {category.name}
                                    </span>
                                    <p className="truncate text-sm text-slate-600">{category.description || '—'}</p>
                                    <span className="col-start-2 text-xs text-slate-600 sm:col-start-auto">
                                        ใช้ {usageCount(category)} คำขอ{!category.active && ' · ปิดใช้งาน'}
                                    </span>
                                    <button type="button" aria-label={`แก้ไขหมวด ${category.name}`} onClick={() => handleEdit(category)}
                                        className="row-start-1 flex h-9 w-9 items-center justify-center rounded text-slate-600 transition-colors hover:bg-slate-100 hover:text-indigo-600 sm:row-auto">
                                        <Pencil1 className="h-5 w-5" />
                                    </button>
                                    <button type="button" aria-label={`ลบหมวด ${category.name}`}
                                        title={usageCount(category) > 0 ? 'ลบได้เมื่อไม่มีคำขอใช้งานหมวดนี้ (ปิดใช้งานแทนได้)' : 'ลบหมวดคำขอ'}
                                        disabled={usageCount(category) > 0} onClick={() => setToDelete(category)}
                                        className="row-start-1 flex h-9 w-9 items-center justify-center rounded text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 sm:row-auto">
                                        <Trash1 className="h-5 w-5" />
                                    </button>
                                </div>
                            ))}
                            {filteredCategories.length === 0 && <p className="py-8 text-center text-xs text-slate-600">ไม่พบหมวดคำขอที่ค้นหา</p>}
                        </div>
                        <p className="border-t border-slate-300 pt-3 text-xs text-slate-600">
                            ลบได้เฉพาะหมวดที่ยังไม่มีคำขอ · หมวดที่ใช้งานแล้วให้แก้ไขเป็น “ปิดใช้งาน” แทน (จะไม่แสดงในแบบฟอร์มส่งคำขอ)
                        </p>
                    </section>

                    {/* ฟอร์มเพิ่ม/แก้ไขหมวดคำขอ */}
                    <section className="rounded-xl border border-slate-300 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-slate-800">{editingId ? 'แก้ไขหมวดคำขอ' : 'เพิ่มหมวดใหม่'}</h2>
                        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                            <label className="block space-y-2 text-sm font-semibold text-slate-700">
                                ชื่อหมวด <span className="text-red-500">*</span>
                                <input required aria-label="ชื่อหมวด" value={name} onChange={(event) => { setName(event.target.value); setFormError(''); }} placeholder="เช่น ขอข้อมูล/รายงาน"
                                    className="h-12 w-full rounded-lg border border-slate-300 px-4 text-sm font-normal outline-none placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                            </label>
                            <label className="block space-y-2 text-sm font-semibold text-slate-700">
                                คำอธิบาย
                                <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="อธิบายว่าคำขอแบบไหนควรใช้หมวดนี้" rows={4}
                                    className="w-full resize-y rounded-lg border border-slate-300 px-4 py-3 text-sm font-normal outline-none placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                            </label>
                            <fieldset>
                                <legend className="mb-3 text-sm font-semibold text-slate-700">สีป้าย</legend>
                                <div className="flex flex-wrap items-center gap-3">
                                    {CATEGORY_COLORS.map((option) => (
                                        <button key={option} type="button" aria-label={`เลือกสี ${option}`} aria-pressed={color === option} onClick={() => setColor(option)}
                                            className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${color === option ? 'ring-2 ring-indigo-300 ring-offset-2' : ''}`}
                                            style={{ backgroundColor: option }} />
                                    ))}
                                </div>
                            </fieldset>
                            <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-700">
                                <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                {editingId ? 'เปิดใช้งาน' : 'เปิดใช้งานทันที'}
                            </label>
                            {formError && <p role="alert" className="text-sm text-red-600">{formError}</p>}
                            <div className="flex gap-2">
                                {editingId && (
                                    <button type="button" onClick={resetForm} className="h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50">ยกเลิก</button>
                                )}
                                <button type="submit" className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 text-sm font-semibold text-white transition-colors hover:bg-indigo-700">
                                    <Plus className="h-4 w-4" />
                                    {editingId ? 'บันทึกการแก้ไข' : 'เพิ่มหมวด'}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            </div>

            <ConfirmDialog open={!!toDelete} title={`ลบหมวด “${toDelete?.name}”?`} confirmLabel="ลบหมวด" danger
                onClose={() => setToDelete(null)} onConfirm={() => { if (toDelete) handleDelete(toDelete); setToDelete(null); }}>
                ลบแล้วกู้คืนไม่ได้ · หมวดนี้ยังไม่มีคำขอใช้งาน
            </ConfirmDialog>
        </div>
    );
}

// ตรวจสิทธิ์ "categories" ในหน้า "สิทธิ์โรล" (ปิดสิทธิ์แล้วเข้าหน้าไม่ได้)
export default function Page() {
  return <Guard roles={allRoles} perm="categories"><CategoriesPage /></Guard>;
}
