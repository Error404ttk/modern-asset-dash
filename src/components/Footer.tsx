import { useState, useEffect } from "react";
import { Heart, Edit, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FooterSettings {
  system_name: string;
  system_description: string;
  version: string;
  contact_phone: string;
  contact_email: string;
  working_hours: string;
  copyright_text: string;
  developer: string;
  support_items: { text: string; link: string }[];
  additional_info_items: { text: string; link: string }[];
}

export const Footer = () => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [footerData, setFooterData] = useState<FooterSettings>({
    system_name: "ระบบจัดการครุภัณฑ์",
    system_description: "ระบบจัดการครุภัณฑ์แบบครบวงจร สำหรับโรงพยาบาลและสถานพยาบาล",
    version: "1.0.0",
    contact_phone: "02-xxx-xxxx",
    contact_email: "support@hospital.go.th",
    working_hours: "จันทร์-ศุกร์ 8:00-17:00 น.",
    copyright_text: "ระบบจัดการครุภัณฑ์. สงวนลิขสิทธิ์.",
    developer: "IT Department",
    support_items: [
      { text: "คู่มือการใช้งาน", link: "/user-manual" },
      { text: "ฝ่ายเทคนิค", link: "/technical-support" },
      { text: "การอบรม", link: "/training" },
      { text: "อัปเดตระบบ", link: "/system-updates" }
    ],
    additional_info_items: [
      { text: "นโยบายความเป็นส่วนตัว (PDPA)", link: "/privacy-policy" },
      { text: "เงื่อนไขการใช้งาน", link: "/terms-of-service" },
      { text: "ความปลอดภัยข้อมูล", link: "/data-security" },
      { text: "ข่าวสารและประกาศ", link: "/news" }
    ]
  });

  useEffect(() => {
    loadFooterSettings();
  }, []);

  const loadFooterSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        // Use organization data for footer if available
        setFooterData(prev => ({
          ...prev,
          system_name: data.name || prev.system_name,
          contact_phone: data.phone || prev.contact_phone,
          contact_email: data.email || prev.contact_email,
        }));
      }
    } catch (error) {
      console.error('Error loading footer settings:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Update organization settings with footer data
      const { data: existingData } = await supabase
        .from('organization_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (existingData) {
        const { error } = await supabase
          .from('organization_settings')
          .update({
            name: footerData.system_name,
            phone: footerData.contact_phone,
            email: footerData.contact_email,
          })
          .eq('id', existingData.id);

        if (error) throw error;
      }

      toast({
        title: "บันทึกสำเร็จ",
        description: "อัปเดตข้อมูล Footer เรียบร้อยแล้ว",
      });
      
      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    loadFooterSettings(); // Reset to original data
  };

  return (
    <footer className="bg-card border-t mt-auto">
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-end items-center mb-4">
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button size="sm" onClick={handleSave} disabled={loading}>
                  <Save className="h-4 w-4 mr-1" />
                  บันทึก
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-1" />
                  ยกเลิก
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-1" />
                แก้ไข
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm">
          <div>
            <h4 className="font-medium text-foreground mb-3">
              {isEditing ? (
                <Input
                  value={footerData.system_name}
                  onChange={(e) => setFooterData({ ...footerData, system_name: e.target.value })}
                  className="text-sm font-medium"
                />
              ) : (
                footerData.system_name
              )}
            </h4>
            <div className="text-muted-foreground mb-2">
              {isEditing ? (
                <Textarea
                  value={footerData.system_description}
                  onChange={(e) => setFooterData({ ...footerData, system_description: e.target.value })}
                  rows={3}
                  className="text-sm"
                />
              ) : (
                <p>{footerData.system_description}</p>
              )}
            </div>
            <p className="text-muted-foreground">
              เวอร์ชัน {isEditing ? (
                <Input
                  value={footerData.version}
                  onChange={(e) => setFooterData({ ...footerData, version: e.target.value })}
                  className="inline-block w-20 text-sm"
                />
              ) : (
                footerData.version
              )}
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-foreground mb-3">ติดต่อเรา</h4>
            <div className="space-y-1 text-muted-foreground">
              <p>โทรศัพท์: {isEditing ? (
                <Input
                  value={footerData.contact_phone}
                  onChange={(e) => setFooterData({ ...footerData, contact_phone: e.target.value })}
                  className="inline-block w-32 text-sm"
                />
              ) : (
                footerData.contact_phone
              )}</p>
              <p>อีเมล: {isEditing ? (
                <Input
                  value={footerData.contact_email}
                  onChange={(e) => setFooterData({ ...footerData, contact_email: e.target.value })}
                  className="inline-block w-48 text-sm"
                />
              ) : (
                footerData.contact_email
              )}</p>
              <p>เวลาทำการ: {isEditing ? (
                <Input
                  value={footerData.working_hours}
                  onChange={(e) => setFooterData({ ...footerData, working_hours: e.target.value })}
                  className="inline-block w-40 text-sm"
                />
              ) : (
                footerData.working_hours
              )}</p>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-foreground mb-3">การสนับสนุน</h4>
            <div className="space-y-1 text-muted-foreground">
              {isEditing ? (
                <div className="space-y-3">
                  {footerData.support_items.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="ข้อความ"
                          value={item.text}
                          onChange={(e) => {
                            const newItems = [...footerData.support_items];
                            newItems[index] = { ...newItems[index], text: e.target.value };
                            setFooterData({ ...footerData, support_items: newItems });
                          }}
                          className="text-sm"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const newItems = footerData.support_items.filter((_, i) => i !== index);
                            setFooterData({ ...footerData, support_items: newItems });
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <Input
                        placeholder="ลิงก์ (เช่น /user-manual หรือ https://example.com)"
                        value={item.link}
                        onChange={(e) => {
                          const newItems = [...footerData.support_items];
                          newItems[index] = { ...newItems[index], link: e.target.value };
                          setFooterData({ ...footerData, support_items: newItems });
                        }}
                        className="text-sm"
                      />
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setFooterData({
                        ...footerData,
                        support_items: [...footerData.support_items, { text: "รายการใหม่", link: "#" }]
                      });
                    }}
                  >
                    เพิ่มรายการ
                  </Button>
                </div>
              ) : (
                footerData.support_items.map((item, index) => (
                  <p key={index}>
                    <a 
                      href={item.link} 
                      target={item.link.startsWith('http') ? '_blank' : '_self'}
                      rel={item.link.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="hover:text-primary hover:underline transition-colors"
                    >
                      {item.text}
                    </a>
                  </p>
                ))
              )}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-foreground mb-3">ข้อมูลเพิ่มเติม</h4>
            <div className="space-y-1 text-muted-foreground">
              {isEditing ? (
                <div className="space-y-3">
                  {footerData.additional_info_items.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="ข้อความ"
                          value={item.text}
                          onChange={(e) => {
                            const newItems = [...footerData.additional_info_items];
                            newItems[index] = { ...newItems[index], text: e.target.value };
                            setFooterData({ ...footerData, additional_info_items: newItems });
                          }}
                          className="text-sm"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const newItems = footerData.additional_info_items.filter((_, i) => i !== index);
                            setFooterData({ ...footerData, additional_info_items: newItems });
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <Input
                        placeholder="ลิงก์ (เช่น /privacy-policy หรือ https://example.com)"
                        value={item.link}
                        onChange={(e) => {
                          const newItems = [...footerData.additional_info_items];
                          newItems[index] = { ...newItems[index], link: e.target.value };
                          setFooterData({ ...footerData, additional_info_items: newItems });
                        }}
                        className="text-sm"
                      />
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setFooterData({
                        ...footerData,
                        additional_info_items: [...footerData.additional_info_items, { text: "รายการใหม่", link: "#" }]
                      });
                    }}
                  >
                    เพิ่มรายการ
                  </Button>
                </div>
              ) : (
                footerData.additional_info_items.map((item, index) => (
                  <p key={index}>
                    <a 
                      href={item.link} 
                      target={item.link.startsWith('http') ? '_blank' : '_self'}
                      rel={item.link.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="hover:text-primary hover:underline transition-colors"
                    >
                      {item.text}
                    </a>
                  </p>
                ))
              )}
            </div>
          </div>
        </div>
        
        <div className="border-t mt-6 pt-4 flex flex-col md:flex-row justify-between items-center text-muted-foreground">
          <p>© {new Date().getFullYear()} {isEditing ? (
            <Input
              value={footerData.copyright_text}
              onChange={(e) => setFooterData({ ...footerData, copyright_text: e.target.value })}
              className="inline-block w-64 text-sm"
            />
          ) : (
            footerData.copyright_text
          )}</p>
          <p className="flex items-center gap-2 mt-2 md:mt-0">
            สร้างด้วย <Heart className="h-4 w-4 text-red-500" /> โดย {isEditing ? (
              <Input
                value={footerData.developer}
                onChange={(e) => setFooterData({ ...footerData, developer: e.target.value })}
                className="inline-block w-32 text-sm"
              />
            ) : (
              footerData.developer
            )}
          </p>
        </div>
      </div>
    </footer>
  );
};