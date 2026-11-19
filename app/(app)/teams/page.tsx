'use client';

// ทีม (งานของพิชญ์ เดิม teams/page.tsx + Data/teamData.ts)
// ปรับให้ใช้ข้อมูลจริงจาก store + เติมส่วนที่ขาด:
//  - "จำกัดการมองเห็นตามทีม" เป็นการตั้งค่าของระบบจริง (เปิดแล้วผู้รับงานเห็นเฉพาะคำขอของทีมตัวเอง) แยกจากปุ่มมุมมอง
//  - "เฉพาะทีมของฉัน" = ทีมที่ผู้ใช้เป็นสมาชิก (เดิม fix ชื่อ "ต้น")
//  - แผนก/หัวหน้าทีม/สมาชิกเลือกจากรายชื่อพนักงาน (เดิมพิมพ์อิสระ) · หัวหน้าแผนกจัดการได้เฉพาะทีมในแผนกตัวเอง
//  - เอาสมาชิกออก, ลบทีม (มีหน้าต่างยืนยัน), เรียงลำดับรายชื่อทีม, กระดิ่งใช้งานได้จริง
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Close, Pencil1, Plus, Search1, Trash1, UserMultiple4, Xmark } from '@tailgrids/icons';
import ConfirmDialog from '@/components/confirm-dialog';
import { NotificationBell } from '@/components/page-header';
import { Guard } from '@/components/role-shell';
import SortSelect, { sortBy, type SortOption } from '@/components/sort-select';
import { nick } from '@/data/requests';
import { useStore } from '@/data/store';
import type { Team } from '@/data/teams';

// กำหนด Type สำหรับจัดการสถานะของ Modal (สร้างทีมใหม่, แก้ไขทีม, เพิ่มสมาชิก, หรือปิดอยู่)
type ModalState = { type: 'create' } | { type: 'edit'; teamId: number } | { type: 'member'; teamId: number } | null;

export default function TeamsPage() {
  return <Guard roles={['head', 'admin']} perm="teams"><Teams /></Guard>;
}

const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';

function Teams() {
  const store = useStore();
  const user = store.user!;
  const isAdmin = user.roles.includes('admin');
  useEffect(() => { document.title = 'ทีม · ระบบจัดการคำขอ'; }, []);

  // --- STATE MANAGEMENT ---
  const [search, setSearch] = useState(''); // คำค้นหา
  const [onlyMine, setOnlyMine] = useState(false); // มุมมอง: ทีมทั้งหมด / เฉพาะทีมของฉัน
  const [sort, setSort] = useState('name');
  const [modal, setModal] = useState<ModalState>(null); // ควบคุมการเปิด-ปิดและประเภทของ Modal
  const [confirm, setConfirm] = useState<{ title: string; body: string; label: string; run: () => void } | null>(null);
  // ค่าในฟอร์มของ Modal
  const [teamName, setTeamName] = useState('');
  const [department, setDepartment] = useState(user.dept);
  const [leaderId, setLeaderId] = useState(0);
  const [teamDescription, setTeamDescription] = useState('');
  const [memberId, setMemberId] = useState(0);

  // หัวหน้าแผนกเห็น/จัดการเฉพาะทีมในแผนกตัวเอง · ผู้ดูแลระบบเห็นทุกแผนก
  const teams = store.teams.filter((t) => isAdmin || t.dept === user.dept);
  const staff = (dept: string) => store.users.filter((u) => u.dept === dept);
  const name = (id: number | null) => store.userById(id)?.name ?? '';

  /** กรองตามมุมมอง "เฉพาะทีมของฉัน" และคำค้นหา (ชื่อทีม, แผนก, หัวหน้าทีม, รายละเอียด, สมาชิก) */
  const filteredTeams = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('th');
    return teams.filter((team) => {
      const matchesScope = !onlyMine || team.memberIds.includes(user.id);
      const searchableText = [team.name, team.dept, name(team.leadId), team.description ?? '', ...team.memberIds.map(name)]
        .join(' ').toLocaleLowerCase('th');
      return matchesScope && searchableText.includes(query);
    });
  }, [onlyMine, search, teams]); // eslint-disable-line react-hooks/exhaustive-deps

  const options: SortOption<Team>[] = [
    { key: 'name', label: 'ชื่อทีม', value: (t) => t.name },
    { key: 'dept', label: 'แผนก', value: (t) => t.dept },
    { key: 'size', label: 'สมาชิกมากสุด', value: (t) => t.memberIds.length, dir: 'desc' },
    { key: 'lead', label: 'หัวหน้าทีม', value: (t) => name(t.leadId) },
  ];

  const openCreateModal = () => {
    setTeamName(''); setDepartment(user.dept); setLeaderId(0); setTeamDescription('');
    setModal({ type: 'create' });
  };
  const openEditModal = (team: Team) => {
    setTeamName(team.name); setDepartment(team.dept); setLeaderId(team.leadId ?? 0); setTeamDescription(team.description ?? '');
    setModal({ type: 'edit', teamId: team.id });
  };
  const openMemberModal = (team: Team) => { setMemberId(0); setModal({ type: 'member', teamId: team.id }); };
  const closeModal = () => setModal(null);

  /** บันทึกฟอร์มใน Modal (สร้างทีม / แก้ไขทีม / เพิ่มสมาชิก) */
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!modal) return;
    if (modal.type === 'create') {
      if (teams.some((t) => t.name === teamName.trim() && t.dept === department)) return store.showToast(`มีทีม “${teamName.trim()}” ใน${department}แล้ว`);
      store.saveTeam({ name: teamName.trim(), dept: department, leadId: leaderId || null, memberIds: leaderId ? [leaderId] : [], description: teamDescription.trim() });
      store.showToast(`สร้างทีม “${teamName.trim()}” แล้ว`);
    } else if (modal.type === 'edit') {
      const team = store.teams.find((t) => t.id === modal.teamId)!;
      // หัวหน้าทีมคนใหม่ต้องอยู่ในทีมด้วย · ย้ายแผนกแล้วตัดสมาชิกที่ไม่ได้อยู่แผนกนั้นออก
      const members = team.memberIds.filter((id) => store.userById(id)?.dept === department);
      store.saveTeam({ ...team, name: teamName.trim(), dept: department, leadId: leaderId || null, description: teamDescription.trim(),
        memberIds: leaderId && !members.includes(leaderId) ? [...members, leaderId] : members });
      store.showToast(`บันทึกทีม “${teamName.trim()}” แล้ว`);
    } else {
      const team = store.teams.find((t) => t.id === modal.teamId)!;
      if (memberId && !team.memberIds.includes(memberId)) {
        store.saveTeam({ ...team, memberIds: [...team.memberIds, memberId] });
        store.showToast(`เพิ่ม ${nick(name(memberId))} เข้า${team.name}แล้ว`);
      }
    }
    closeModal();
  };

  // --- DERIVED VALUES & STATISTICS ---
  const modalTeam = modal && modal.type !== 'create' ? store.teams.find((team) => team.id === modal.teamId) : undefined;
  const memberCount = new Set(teams.flatMap((team) => team.memberIds)).size;
  const departmentCount = new Set(teams.map((team) => team.dept)).size;
  const modalTitle = modal?.type === 'create' ? 'สร้างทีมใหม่' : modal?.type === 'edit' ? 'แก้ไขข้อมูลทีม' : 'เพิ่มสมาชิกในทีม';
  const usedBy = (t: Team) => store.requests.filter((r) => r.teamId === t.id).length;

  return (
    <div className="min-w-0 text-slate-800">
      <div className="w-full space-y-6">
        {/* --- HEADER SECTION --- */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-bold leading-tight tracking-tight text-slate-900">ทีม</h1>
            <p className="mt-1 text-sm text-slate-600">{isAdmin ? 'ทีมของทุกแผนก' : `ทีมใน${user.dept}`}</p>
          </div>
          <div className="flex items-center gap-2.5">
            {/* ช่องค้นหาทีมหรือสมาชิก */}
            <label className="relative block w-[280px] max-w-[calc(100vw-110px)]">
              <span className="sr-only">ค้นหาทีมหรือสมาชิก</span>
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาทีมหรือสมาชิก"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-4 pr-10 text-sm text-slate-700 shadow-xs outline-none placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
              <Search1 className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
            </label>
            <NotificationBell />
          </div>
        </header>

        {/* --- FILTER & ACTION BAR SECTION --- */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* ปุ่มสลับมุมมองระหว่าง "ทีมทั้งหมด" และ "เฉพาะทีมของฉัน" */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-sm font-medium text-slate-600">มุมมอง:</span>
              {[{ v: false, label: 'ทีมทั้งหมด' }, { v: true, label: 'เฉพาะทีมของฉัน' }].map((o) => (
                <button key={o.label} type="button" aria-pressed={onlyMine === o.v} onClick={() => setOnlyMine(o.v)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${onlyMine === o.v
                    ? 'border border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                  {o.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700">
              <Plus className="h-4 w-4" />
              สร้างทีมใหม่
            </button>
          </div>
          {/* แถบคำอธิบาย + การตั้งค่าจำกัดการมองเห็น (มีผลกับทั้งระบบ) */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-indigo-50/70 px-4 py-3 text-sm font-medium text-indigo-700">
            <div className="flex items-center gap-2.5">
              <UserMultiple4 className="h-4 w-4 shrink-0 text-indigo-600" />
              <p>ทีมย่อยเป็นฟีเจอร์เสริม · คนหนึ่งอยู่ได้หลายทีม · เปิดจำกัดการมองเห็นแล้ว ผู้รับงานจะเห็นเฉพาะคำขอของทีมตัวเอง</p>
            </div>
            <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-medium text-slate-600 sm:text-sm">
              <input type="checkbox" checked={store.restrictByTeam}
                onChange={(event) => { store.setRestrictByTeam(event.target.checked); store.showToast(event.target.checked ? 'เปิดจำกัดการมองเห็นตามทีมแล้ว' : 'ปิดจำกัดการมองเห็นตามทีมแล้ว'); }}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              จำกัดการมองเห็นตามทีม
            </label>
          </div>
        </section>

        {/* --- KPI SUMMARY CARDS SECTION --- */}
        <section aria-label="สรุปทีม" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: 'ทีมทั้งหมด', value: teams.length, detail: 'ทีมที่จัดการในระบบ', dot: 'bg-indigo-500' },
            { label: 'สมาชิกในทีม', value: memberCount, detail: 'นับสมาชิกที่ไม่ซ้ำกัน', dot: 'bg-emerald-500' },
            { label: 'แผนกที่ดูแล', value: departmentCount, detail: 'แผนกที่มีทีมรับผิดชอบ', dot: 'bg-sky-500' },
          ].map((item) => (
            <article key={item.label} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <span className={`h-2 w-2 rounded-full ${item.dot}`} />
                <span>{item.label}</span>
              </div>
              <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">{item.value}</p>
              <p className="mt-1.5 text-xs text-slate-600">{item.detail}</p>
            </article>
          ))}
        </section>

        {/* --- TEAMS GRID LIST SECTION --- */}
        <section aria-label="รายชื่อทีม" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">รายชื่อทีม</h2>
              <p className="text-xs text-slate-600">แสดง {filteredTeams.length} จาก {teams.length} ทีม</p>
            </div>
            <SortSelect options={options} value={sort} onChange={setSort} />
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {sortBy(filteredTeams, options, sort).map((team) => (
              <article key={team.id} className="flex min-h-[320px] flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition-shadow hover:shadow-md">
                {/* หัวการ์ด: ชื่อทีม แผนก หัวหน้าทีม ปุ่มแก้ไข/ลบ */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-bold text-slate-900">{team.name}</h3>
                    <p className="mt-1 text-xs text-slate-600">
                      {team.dept} · หัวหน้าทีม: <span className="font-medium text-slate-700">{team.leadId ? nick(name(team.leadId)) : 'ยังไม่กำหนด'}</span>
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" aria-label={`แก้ไข${team.name}`} onClick={() => openEditModal(team)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200/70 text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600">
                      <Pencil1 className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label={`ลบ${team.name}`}
                      onClick={() => setConfirm({
                        title: `ลบทีม “${team.name}”?`, label: 'ลบทีม',
                        body: usedBy(team) ? `คำขอ ${usedBy(team)} รายการที่ผูกกับทีมนี้จะกลายเป็น "ไม่ระบุทีม"` : 'ลบแล้วกู้คืนไม่ได้',
                        run: () => { store.removeTeam(team.id); store.showToast(`ลบทีม “${team.name}” แล้ว`); },
                      })}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200/70 text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                      <Trash1 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {/* คำอธิบายทีม */}
                <p className="mt-3.5 min-h-10 text-sm leading-relaxed text-slate-600">{team.description || '—'}</p>
                {/* หัวข้อสมาชิกในทีม */}
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <h4 className="text-sm font-semibold text-slate-800">สมาชิกในทีม</h4>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{team.memberIds.length} คน</span>
                </div>
                {/* รายชื่อสมาชิกภายในทีม */}
                <ul className="mt-3.5 space-y-3">
                  {team.memberIds.map((uid) => {
                    const teamCount = store.teams.filter((item) => item.memberIds.includes(uid)).length; // อยู่กี่ทีม
                    const member = store.userById(uid);
                    return (
                      <li key={uid} className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-600">{member?.name.slice(0, 1)}</span>
                        <span className="text-sm font-medium text-slate-800">{nick(member?.name)} <span className="text-xs font-normal text-slate-600">· {member?.position}</span></span>
                        <span className="ml-auto flex items-center gap-1.5">
                          {uid === team.leadId && <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">หัวหน้าทีม</span>}
                          {teamCount > 1 && <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-600">อยู่ {teamCount} ทีม</span>}
                          {uid !== team.leadId && (
                            <button type="button" aria-label={`เอา ${nick(member?.name)} ออกจากทีม`} className="rounded p-1 text-slate-600 hover:text-red-600"
                              onClick={() => setConfirm({
                                title: `เอา ${nick(member?.name)} ออกจาก${team.name}?`, label: 'เอาออก', body: 'เพิ่มกลับเข้าทีมได้ภายหลัง',
                                run: () => { store.saveTeam({ ...team, memberIds: team.memberIds.filter((x) => x !== uid) }); store.showToast(`เอา ${nick(member?.name)} ออกจาก${team.name}แล้ว`); },
                              })}>
                              <Xmark className="h-4 w-4" />
                            </button>
                          )}
                        </span>
                      </li>
                    );
                  })}
                  {team.memberIds.length === 0 && <li className="py-2 text-sm text-slate-600">ยังไม่มีสมาชิกในทีม</li>}
                </ul>
                {/* ปุ่มเพิ่มสมาชิกเข้าทีมนี้ */}
                <button type="button" onClick={() => openMemberModal(team)}
                  className="mt-auto inline-flex items-center gap-1.5 self-start rounded-lg px-3 py-2 text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-50">
                  <Plus className="h-4 w-4" />
                  เพิ่มสมาชิก
                </button>
              </article>
            ))}
          </div>
        </section>

        {filteredTeams.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-600">ไม่พบทีมที่ตรงกับเงื่อนไข</div>
        )}
      </div>

      {/* --- MODAL DIALOG SECTION --- */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[1px]"
          onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}
          onKeyDown={(event) => event.key === 'Escape' && closeModal()}>
          <section role="dialog" aria-modal="true" aria-labelledby="team-modal-title" className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 id="team-modal-title" className="text-lg font-bold text-slate-900">{modalTitle}{modalTeam && modal.type === 'member' ? ` · ${modalTeam.name}` : ''}</h2>
              <button type="button" aria-label="ปิด" onClick={closeModal} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100">
                <Close className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {modal.type === 'member' ? (
                <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                  สมาชิก (คนใน{modalTeam?.dept})
                  <select autoFocus required value={memberId} onChange={(event) => setMemberId(Number(event.target.value))} className={inputClass}>
                    <option value={0} disabled>เลือกพนักงาน</option>
                    {staff(modalTeam?.dept ?? '').filter((u) => !modalTeam?.memberIds.includes(u.id)).map((u) => (
                      <option key={u.id} value={u.id}>{u.name} · {u.position}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <>
                  <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                    ชื่อทีม
                    <input autoFocus required value={teamName} onChange={(event) => setTeamName(event.target.value)} className={inputClass} placeholder="เช่น ทีมพัฒนาระบบ" />
                  </label>
                  <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                    รายละเอียดทีม
                    <textarea required rows={3} value={teamDescription} onChange={(event) => setTeamDescription(event.target.value)}
                      className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      placeholder="อธิบายหน้าที่หรือความรับผิดชอบของทีม" />
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                      แผนก
                      <select required value={department} disabled={!isAdmin} onChange={(event) => { setDepartment(event.target.value); setLeaderId(0); }} className={inputClass}>
                        {store.depts.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </label>
                    <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                      หัวหน้าทีม
                      <select value={leaderId} onChange={(event) => setLeaderId(Number(event.target.value))} className={inputClass}>
                        <option value={0}>ยังไม่กำหนด</option>
                        {staff(department).map((u) => <option key={u.id} value={u.id}>{nick(u.name)} · {u.position}</option>)}
                      </select>
                    </label>
                  </div>
                </>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">ยกเลิก</button>
                <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
                  {modal.type === 'create' ? 'สร้างทีม' : modal.type === 'edit' ? 'บันทึก' : 'เพิ่มสมาชิก'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      <ConfirmDialog open={!!confirm} title={confirm?.title ?? ''} confirmLabel={confirm?.label ?? ''} danger
        onClose={() => setConfirm(null)} onConfirm={() => { confirm?.run(); setConfirm(null); }}>
        {confirm?.body}
      </ConfirmDialog>
    </div>
  );
}
