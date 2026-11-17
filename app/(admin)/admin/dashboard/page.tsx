'use client'

import DashboardView from "@/components/dashboard-view";

export default function Page() {
    return <DashboardView detailHref={(r) => `/admin/dashboard/${r.id}`} />
}
