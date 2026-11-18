# ระบบจัดการคำขอพัฒนา/แก้ไขซอฟต์แวร์

Next.js 16 + React 19 + Tailwind 4 + TailGrids · ข้อมูลเก็บใน localStorage ของเบราว์เซอร์ (ยังไม่มี backend)

## วิธีรัน

```bash
npm install
npm run dev
```

เปิด http://localhost:3000 แล้วเข้าสู่ระบบด้วยอีเมลด้านล่าง รหัสผ่านเริ่มต้นของทุกบัญชีคือ **`Company@2026`**

## บัญชีตัวอย่าง

อีเมลตั้งเป็น `โรลหลัก.แผนก` (sales = ฝ่ายขาย, acc = ฝ่ายบัญชี, hr = ฝ่ายบุคคล, it = แผนก IT, data = แผนกข้อมูล, mgmt = ฝ่ายบริหาร) พิมพ์แค่ส่วนหน้า `@` ก็ได้

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
| approver.acc | สุดา | หัวหน้าต้นสังกัด ฝ่ายบัญชี + ผู้ขอ | /approvals |
| requester.acc | นพ | ผู้ขอ ฝ่ายบัญชี | /requests |
| requester.hr | ดา | ผู้ขอ ฝ่ายบุคคล (ฝ่ายนี้ไม่มีหัวหน้าต้นสังกัด → คำขอส่งตรงถึงแผนกปลายทาง) | /requests |
| head.data | ปิยะ | หัวหน้าแผนกข้อมูล (แผนกปลายทางที่สอง) + หัวหน้าต้นสังกัด | /incoming |
| assignee.data | ภูมิ | ผู้รับงาน แผนกข้อมูล + ผู้ขอ | /tasks |
| assignee2.data | ฝน | ผู้รับงาน แผนกข้อมูล | /tasks |

เรื่องบัญชีและรหัสผ่าน:
- ใส่รหัสผ่านผิด 5 ครั้งติดกัน บัญชีถูกล็อก 15 นาที (ผู้ดูแลระบบกด "ปลดล็อก" ได้)
- ลืมรหัสผ่าน → ผู้ดูแลระบบกด "รีเซ็ตรหัสผ่าน" ในหน้าจัดการผู้ใช้ ได้รหัสชั่วคราว ผู้ใช้ต้องตั้งรหัสใหม่ตอนเข้าสู่ระบบ
- เปลี่ยนรหัสผ่านเองได้ที่ "บัญชีของฉัน" (กดกล่องชื่อมุมล่างซ้าย)
- ไฟล์แนบเก็บไฟล์จริงใน IndexedDB ของเบราว์เซอร์ เปิดดู/ดาวน์โหลดได้

คนที่มีหลายโรลจะเห็นเมนูของทุกโรลรวมกันใน sidebar (ไม่ซ้ำ ไม่ต้องสลับโรล) · เมนูตาม Figma อยู่ใน `data/menus.tsx`

ถ้าอยากล้างข้อมูลกลับเป็นค่าเริ่มต้น: เปิด DevTools → Application → Local Storage → ลบ `rq-data-v6`

## โครงสร้างไฟล์

```
app/
  login/, forgot-password/  เข้าสู่ระบบ, ลืมรหัสผ่าน
  (app)/                    หน้าที่หลายโรลใช้ร่วมกัน (แต่ละหน้าตรวจสิทธิ์ด้วย <Guard>)
                            requests (คำขอของฉัน/ในฝ่าย/ในแผนก), requests/new, requests/[id], requests/[id]/edit,
                            dashboard (หัวหน้าต้นสังกัด/หัวหน้าแผนก/ผู้บริหาร/ผู้ดูแลระบบ), teams (หัวหน้าแผนก/ผู้ดูแลระบบ),
                            account (บัญชีของฉัน / เปลี่ยนรหัสผ่าน)
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
  auth.ts                   รหัสผ่าน, กฎรหัสผ่าน, รหัสชั่วคราว
  files.ts                  เก็บ/เปิดไฟล์แนบใน IndexedDB
  menus.tsx                 เมนูของแต่ละโรล (ตาม Figma)
```

## ลำดับการทำงานของคำขอ

รออนุมัติ → (ส่งกลับแก้ไข) → รอแผนกปลายทาง → (ปฏิเสธ / ส่งต่อแผนกอื่น) → กำลังดำเนินการ → รอตรวจรับ (อัตโนมัติเมื่องานครบ 100%) → เสร็จสิ้น
ทุกการเปลี่ยนสถานะบันทึกในประวัติคำขอ และการส่งกลับ ปฏิเสธ ส่งต่อ ขอแก้ ต้องกรอกเหตุผล
