import { Heart } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-card border-t mt-auto">
      <div className="container mx-auto px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm">
          <div>
            <h4 className="font-medium text-foreground mb-3">ระบบจัดการครุภัณฑ์</h4>
            <p className="text-muted-foreground mb-2">
              ระบบจัดการครุภัณฑ์แบบครบวงจร สำหรับโรงพยาบาลและสถานพยาบาล
            </p>
            <p className="text-muted-foreground">
              เวอร์ชัน 1.0.0
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-foreground mb-3">ติดต่อเรา</h4>
            <div className="space-y-1 text-muted-foreground">
              <p>โทรศัพท์: 02-xxx-xxxx</p>
              <p>อีเมล: support@hospital.go.th</p>
              <p>เวลาทำการ: จันทร์-ศุกร์</p>
              <p>8:00-17:00 น.</p>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-foreground mb-3">การสนับสนุน</h4>
            <div className="space-y-1 text-muted-foreground">
              <p>คู่มือการใช้งาน</p>
              <p>ฝ่ายเทคนิค</p>
              <p>การอบรม</p>
              <p>อัปเดตระบบ</p>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-foreground mb-3">ข้อมูลเพิ่มเติม</h4>
            <div className="space-y-1 text-muted-foreground">
              <p>นโยบายความเป็นส่วนตัว</p>
              <p>เงื่อนไขการใช้งาน</p>
              <p>ความปลอดภัย</p>
              <p>ข่าวสาร</p>
            </div>
          </div>
        </div>
        
        <div className="border-t mt-6 pt-4 flex flex-col md:flex-row justify-between items-center text-muted-foreground">
          <p>© {new Date().getFullYear()} ระบบจัดการครุภัณฑ์. สงวนลิขสิทธิ์.</p>
          <p className="flex items-center gap-2 mt-2 md:mt-0">
            สร้างด้วย <Heart className="h-4 w-4 text-red-500" /> โดย IT Department
          </p>
        </div>
      </div>
    </footer>
  );
};