'use client'

// คำขอในแผนก (งานของนพรัตน์ เดิม incoming/dept/page.tsx) · งานทั้งหมดที่ส่งเข้าแผนกของผู้ใช้
import { Guard } from "@/components/role-shell";
import RequestListPage from "@/components/request-ui/RequestListPage";
import { useStore } from "@/data/store";

export default function DepartmentRequestsPage() {
    return <Guard roles={["head", "assignee"]}><Content /></Guard>
}

function Content() {
    const store = useStore();
    const user = store.user!;
    const rows = store.requests.filter((r) => r.targetDept === user.dept && store.canSee(r));
    return <RequestListPage title="คำขอในแผนก" sub={`งานทั้งหมดที่ส่งเข้า${user.dept}`} hrefBase="/incoming/dept" requests={rows} mode="dept" />
}
