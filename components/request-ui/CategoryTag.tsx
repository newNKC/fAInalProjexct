import { Badge } from "@/components/tailgrids/core/badge";

const CATEGORY_COLORS: Record<
  string,
  "blue" | "purple" | "error" | "orange" | "gray"
> = {
  "พัฒนาใหม่": "blue",
  "ปรับปรุง": "purple",
  "แก้ bug": "error",
  "แก้ปัญหา": "orange",
};

// color = สีของหมวดจากหน้า "หมวดคำขอ" (ใช้กับหมวดที่ผู้ดูแลระบบเพิ่มเองซึ่งไม่อยู่ในตารางสีด้านบน)
export default function CategoryTag({ category, color }: { category: string; color?: string }) {
  if (!CATEGORY_COLORS[category] && color) {
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded-md border border-current px-2 py-0.5 text-xs font-medium" style={{ color, background: `${color}1A` }}>
        {category}
      </span>
    );
  }
  return (
    <Badge
      color={CATEGORY_COLORS[category] ?? "gray"}
      className="rounded-md border border-current whitespace-nowrap"
    >
      {category}
    </Badge>
  );
}
