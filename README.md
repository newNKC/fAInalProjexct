# ระบบจัดการคำขอพัฒนา/แก้ไขซอฟต์แวร์

Next.js 16 + React 19 + Tailwind 4 + TailGrids · ข้อมูลเก็บใน localStorage ของเบราว์เซอร์ (ยังไม่มี backend)

## วิธีรัน

```bash
npm install
npm run dev
```

เปิด http://localhost:3000 แล้วเข้าสู่ระบบด้วยอีเมลด้านล่าง (รหัสผ่านพิมพ์อะไรก็ได้)

## บัญชีทดลอง

| อีเมล | ชื่อ | โรล | หน้าแรก |
| --- | --- | --- | --- |
| orawan.s@company.local | แอน | ผู้ขอ | /requests |
| ekkachai@company.local | เอก | ผู้ขอ | /requests |
| somsak.j@company.local | สมศักดิ์ | หัวหน้าต้นสังกัด + ผู้ขอ | /approvals |
| wichai.t@company.local | วิชัย | หัวหน้าแผนกปลายทาง + หัวหน้าต้นสังกัด | /incoming |
| thanakorn@company.local | ต้น | ผู้รับงาน + ผู้ขอ | /tasks |
| ploy@company.local | พลอย | ผู้รับงาน | /tasks |
| keng@company.local | เก่ง | ผู้รับงาน | /tasks |
| praphaporn@company.local | ประภาพร | ผู้บริหาร | /dashboard |
| nida@company.local | นิด | ผู้ดูแลระบบ | /admin/dashboard |

คนที่มีหลายโรลสลับโรลได้จากแถบ "สลับโรล" ด้านบนของหน้า

ถ้าอยากล้างข้อมูลกลับเป็นค่าเริ่มต้น: เปิด DevTools → Application → Local Storage → ลบ `rq-data-v1`

## โครงสร้างไฟล์

```
app/
  login/                    หน้าเข้าสู่ระบบ
  (requester)/              ผู้ขอ: requests, requests/new, requests/[id], requests/[id]/edit
  (approver)/               หัวหน้าต้นสังกัด: approvals, approvals/[id]
  (head)/                   หัวหน้าแผนกปลายทาง: incoming, incoming/[id] (รับ/ปฏิเสธ/ส่งต่อ/วางแผนงาน), workload
  (assignee)/               ผู้รับงาน: tasks
  (executive)/              ผู้บริหาร: dashboard, dashboard/[id]
  (admin)/                  ผู้ดูแลระบบ: admin/dashboard, users, categories, permissions, teams
components/
  sidebar.tsx, role-badge.tsx         ไฟล์กลางเดิม
  role-shell.tsx                      ตรวจการเข้าสู่ระบบ + โรล แล้วแสดง sidebar (ทุก layout ใช้)
  request-detail.tsx                  รายละเอียดคำขอ (ทุกโรลใช้ร่วมกัน)
  request-form.tsx, request-table.tsx, status-badge.tsx, progress-bar.tsx,
  reason-dialog.tsx, filter-chips.tsx, page-header.tsx, dashboard-view.tsx
  tailgrids/core/                     คอมโพเนนต์ของ TailGrids (ไม่แก้)
data/
  store.tsx                 ข้อมูลกลาง (Context + localStorage) ทุกหน้าใช้ useStore()
  users.ts, permissions.ts  ข้อมูลเดิม
  requests.ts               ชนิดข้อมูลคำขอ/งาน/ประวัติ + ข้อมูลตัวอย่าง + ฟังก์ชันช่วย
  categories.ts, teams.ts   ข้อมูลตัวอย่าง
```

## ลำดับการทำงานของคำขอ

รออนุมัติ → (ส่งกลับแก้ไข) → รอแผนกปลายทาง → (ปฏิเสธ / ส่งต่อแผนกอื่น) → กำลังดำเนินการ → รอตรวจรับ (อัตโนมัติเมื่องานครบ 100%) → เสร็จสิ้น
ทุกการเปลี่ยนสถานะบันทึกในประวัติคำขอ และการส่งกลับ ปฏิเสธ ส่งต่อ ขอแก้ ต้องกรอกเหตุผล
