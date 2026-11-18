// แถบความคืบหน้าหน้าตาเดียวกับ ProgressControl ของนพรัตน์ แต่ดูได้อย่างเดียว
// (requirement: % ของคำขอคำนวณจากงานย่อยที่ผู้รับงานอัปเดต หัวหน้าไม่ได้แก้เอง)
import { Progress } from "@/components/tailgrids/core/progress";

export default function ProgressCell({ value }: { value: number }) {
  const isComplete = value >= 100;
  return (
    <div className="flex items-center gap-3">
      <div className="w-36" title={`ความคืบหน้า ${value}%`}>
        <Progress progress={value} barColor={isComplete ? "#16a34a" : "#4338CA"} className="w-full" />
      </div>
      <span className="text-sm font-medium">{value}%</span>
    </div>
  );
}
