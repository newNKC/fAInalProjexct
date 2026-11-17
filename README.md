# ระบบจัดการคำขอพัฒนา/แก้ไขซอฟต์แวร์

Next.js 16 + React 19 + Tailwind 4 + TailGrids · ข้อมูลเก็บใน localStorage ของเบราว์เซอร์ (ยังไม่มี backend)

## วิธีรัน

```bash
npm install
npm run dev
```

เปิด http://localhost:3000 แล้วเข้าสู่ระบบด้วยอีเมลด้านล่าง (รหัสผ่านพิมพ์อะไรก็ได้)

## บัญชีทดลอง

อีเมลตั้งเป็น `โรลหลัก.แผนก` (sales = ฝ่ายขาย, it = แผนก IT, mgmt = ฝ่ายบริหาร) พิมพ์แค่ส่วนหน้า `@` ก็ได้

| อีเมล | ชื่อ | โรล | หน้าแรก |
| --- | --- | --- | --- |
| requester.sales | แอน | ผู้ขอ | /requests |
| requester2.sales | เอก | ผู้ขอ | /requests |
| approver.sales | สมศักดิ์ | หัวหน้าต้นสังกัด + ผู้ขอ | /approvals |
| head.it | วิชัย | หัวหน้าแผนกปลายทาง + หัวหน้าต้นสังกัด | /incoming |
| assignee.it | ต้น | ผู้รับงาน + ผู้ขอ | /tasks |
| assignee2.it | พลอย | ผู้รับงาน | /tasks |
| assignee3.it | เก่ง | ผู้รับงาน | /tasks |
| executive.mgmt | ประภาพร | ผู้บริหาร | /dashboard |
| admin.it | นิด | ผู้ดูแลระบบ | /dashboard |

หน้า login มีรายชื่อ "ทดลองเข้าใช้ตามโรล" 6 คน กดชื่อเพื่อเข้าสู่ระบบทันที

คนที่มีหลายโรลจะเห็นเมนูของทุกโรลรวมกันใน sidebar (ไม่ซ้ำ ไม่ต้องสลับโรล) · เมนูตาม Figma อยู่ใน `data/menus.tsx`

ถ้าอยากล้างข้อมูลกลับเป็นค่าเริ่มต้น: เปิด DevTools → Application → Local Storage → ลบ `rq-data-v3`

## โครงสร้างไฟล์

```
app/
  login/                    หน้าเข้าสู่ระบบ + ทางลัดทดลองตามโรล
  (app)/                    หน้าที่หลายโรลใช้ร่วมกัน (แต่ละหน้าตรวจสิทธิ์ด้วย <Guard>)
                            requests (คำขอของฉัน/ในฝ่าย/ในแผนก), requests/new, requests/[id], requests/[id]/edit,
                            dashboard (หัวหน้าต้นสังกัด/หัวหน้าแผนก/ผู้บริหาร/ผู้ดูแลระบบ), teams (หัวหน้าแผนก/ผู้ดูแลระบบ)
  (approver)/               หัวหน้าต้นสังกัด: approvals, approvals/[id]
  (head)/                   หัวหน้าแผนกปลายทาง: incoming, incoming/[id]/plan, incoming/[id]/decline
  (assignee)/               ผู้รับงาน: tasks
  (admin)/                  ผู้ดูแลระบบ: admin/users, admin/categories, admin/permissions
components/
  sidebar.tsx, role-badge.tsx         ไฟล์กลางเดิม
  role-shell.tsx                      ตรวจการเข้าสู่ระบบ + โรล, sidebar, toast, Guard
  page-header.tsx                     หัวเพจ: ย้อนกลับ · ชื่อหน้า · มุมมองของ · ค้นหาคำขอ · กระดิ่ง
  request-parts.tsx                   การ์ดสรุปคำขอ, ขั้นตอนคำขอ, ข้อมูลคำขอ, ประวัติ, งานหลัก/งานย่อย
  request-form.tsx                    แบบฟอร์มส่งคำขอ (ลากไฟล์มาวางได้)
  sort-table.tsx, sort-select.tsx     ตาราง/รายการที่เรียงตามหัวข้อได้
  status-badge.tsx, category-badge.tsx, stat-card.tsx, banner.tsx, inbox-card.tsx,
  progress-bar.tsx, filter-chips.tsx, reason-dialog.tsx, action-items.ts
  tailgrids/core/                     คอมโพเนนต์ของ TailGrids (ไม่แก้)
data/
  store.tsx                 ข้อมูลกลาง (Context + localStorage) ทุกหน้าใช้ useStore()
  users.ts, permissions.ts  ข้อมูลเดิม
  requests.ts               ชนิดข้อมูลคำขอ/งาน/ประวัติ + ข้อมูลตัวอย่าง + ฟังก์ชันช่วย
  categories.ts, teams.ts   ข้อมูลตัวอย่าง
  menus.tsx                 เมนูของแต่ละโรล (ตาม Figma)
```

## ลำดับการทำงานของคำขอ

รออนุมัติ → (ส่งกลับแก้ไข) → รอแผนกปลายทาง → (ปฏิเสธ / ส่งต่อแผนกอื่น) → กำลังดำเนินการ → รอตรวจรับ (อัตโนมัติเมื่องานครบ 100%) → เสร็จสิ้น
ทุกการเปลี่ยนสถานะบันทึกในประวัติคำขอ และการส่งกลับ ปฏิเสธ ส่งต่อ ขอแก้ ต้องกรอกเหตุผล
