import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Loader2, Settings as SettingsIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TechnicalSpecsDialog } from "./TechnicalSpecsDialog";
import { TechnicalSpecType, TechnicalSpecRecord, TECHNICAL_SPEC_TYPES } from "@/data/technicalSpecs";

interface TechnicalSpecsManagementProps {
  activeTab: string;
}

export const TechnicalSpecsManagement = ({ activeTab }: TechnicalSpecsManagementProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [specs, setSpecs] = useState<Record<string, TechnicalSpecRecord[]>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSpecType, setSelectedSpecType] = useState<TechnicalSpecType | null>(null);
  const [editingSpec, setEditingSpec] = useState<TechnicalSpecRecord | null>(null);
  const [deletingSpec, setDeletingSpec] = useState<{ spec: TechnicalSpecRecord; type: TechnicalSpecType } | null>(null);

  useEffect(() => {
    if (activeTab === 'technical-specs') {
      loadAllSpecs();
    }
  }, [activeTab]);

  const loadAllSpecs = async () => {
    setLoading(true);
    try {
      const specsData: Record<string, TechnicalSpecRecord[]> = {};

      for (const specType of TECHNICAL_SPEC_TYPES) {
        const { data, error } = await supabase
          .from(specType.tableName)
          .select('*')
          .order('name');

        if (error) {
          console.error(`Error loading ${specType.name}:`, error);
          specsData[specType.id] = [];
        } else {
          specsData[specType.id] = data || [];
        }
      }

      setSpecs(specsData);
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

  const handleAddSpec = (specType: TechnicalSpecType) => {
    setSelectedSpecType(specType);
    setEditingSpec(null);
    setIsDialogOpen(true);
  };

  const handleEditSpec = (specType: TechnicalSpecType, spec: TechnicalSpecRecord) => {
    setSelectedSpecType(specType);
    setEditingSpec(spec);
    setIsDialogOpen(true);
  };

  const handleDeleteSpec = (specType: TechnicalSpecType, spec: TechnicalSpecRecord) => {
    setDeletingSpec({ spec, type: specType });
    setIsDeleteDialogOpen(true);
  };

  const handleToggleSpecStatus = async (specType: TechnicalSpecType, spec: TechnicalSpecRecord) => {
    try {
      const { error } = await supabase
        .from(specType.tableName)
        .update({ active: !spec.active })
        .eq('id', spec.id);

      if (error) throw error;

      toast({
        title: "อัปเดตสำเร็จ",
        description: `${spec.active ? 'พักใช้งาน' : 'เปิดใช้งาน'}${specType.displayName}เรียบร้อยแล้ว`,
      });

      loadAllSpecs();
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingSpec) return;

    try {
      const { error } = await supabase
        .from(deletingSpec.type.tableName)
        .delete()
        .eq('id', deletingSpec.spec.id);

      if (error) throw error;

      toast({
        title: "ลบสำเร็จ",
        description: `ลบ${deletingSpec.type.displayName}เรียบร้อยแล้ว`,
      });

      loadAllSpecs();
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setDeletingSpec(null);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedSpecType(null);
    setEditingSpec(null);
  };

  const renderSpecList = (specType: TechnicalSpecType) => {
    const specList = specs[specType.id] || [];

    if (loading) {
      return (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {specList.map((spec) => (
          <div key={spec.id} className="border rounded-lg p-4 bg-card">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <specType.icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h3 className="font-medium text-foreground">{spec.name}</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {specType.fields.slice(1, 4).map(field => {
                        const value = spec[field.key];
                        if (!value) return null;
                        return (
                          <span key={field.key} className="text-xs text-muted-foreground">
                            {field.label}: {value}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={spec.active ? "default" : "secondary"}>
                  {spec.active ? "ใช้งาน" : "ไม่ใช้งาน"}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggleSpecStatus(specType, spec)}
                >
                  {spec.active ? "พักใช้งาน" : "ใช้งาน"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEditSpec(specType, spec)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeleteSpec(specType, spec)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {specList.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            ยังไม่มีข้อมูล{specType.displayName}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <TabsContent value="technical-specs">
        <div className="space-y-6">
          {TECHNICAL_SPEC_TYPES.map((specType) => (
            <Card key={specType.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <specType.icon className="mr-2 h-5 w-5" />
                      จัดการ{specType.displayName}
                    </CardTitle>
                    <CardDescription>
                      เพิ่ม แก้ไข หรือลบ{specType.displayName}ในระบบ
                    </CardDescription>
                  </div>
                  <Button onClick={() => handleAddSpec(specType)}>
                    <Plus className="mr-2 h-4 w-4" />
                    เพิ่ม{specType.displayName}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {renderSpecList(specType)}
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      {/* Dialog for adding/editing specs */}
      {selectedSpecType && (
        <TechnicalSpecsDialog
          open={isDialogOpen}
          onOpenChange={handleDialogClose}
          specType={selectedSpecType}
          spec={editingSpec}
          onSuccess={loadAllSpecs}
        />
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบ{specType?.displayName} "{deletingSpec?.spec.name}" ใช่หรือไม่?
              การดำเนินการนี้ไม่สามารถยกเลิกได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
