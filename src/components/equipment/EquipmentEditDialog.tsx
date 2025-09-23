import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Equipment {
  id: string;
  name: string;
  type: string;
  brand: string;
  model: string;
  serialNumber: string;
  assetNumber: string;
  status: string;
  location: string;
  user: string;
  purchaseDate: string;
  warrantyEnd: string;
  quantity: string;
  images?: string[];
  specs: {
    [key: string]: string;
  };
}

interface EquipmentEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment;
  onSave: (equipment: Equipment) => void;
}

export default function EquipmentEditDialog({ 
  open, 
  onOpenChange, 
  equipment, 
  onSave 
}: EquipmentEditDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Equipment>(equipment);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Ensure all string fields are never null to avoid React warnings
    setFormData({
      ...equipment,
      brand: equipment.brand || "",
      model: equipment.model || "",
      serialNumber: equipment.serialNumber || "",
      location: equipment.location || "",
      user: equipment.user || "",
      purchaseDate: equipment.purchaseDate || "",
      warrantyEnd: equipment.warrantyEnd || "",
      quantity: equipment.quantity || "1",
      specs: equipment.specs || {}
    });
    
    // Set existing images
    setExistingImages(equipment.images || []);
    setSelectedImages([]);
    setImagePreviews([]);
    setImagesToDelete([]);
  }, [equipment, open]);

  const handleImageUpload = (files: FileList | null) => {
    if (!files) return;
    
    const totalImages = existingImages.length + selectedImages.length;
    const newFiles = Array.from(files).slice(0, 3 - totalImages);
    
    if (totalImages + newFiles.length > 3) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "สามารถอัปโหลดรูปภาพได้สูงสุด 3 รูป",
        variant: "destructive",
      });
      return;
    }
    
    const updatedImages = [...selectedImages, ...newFiles];
    setSelectedImages(updatedImages);
    
    // Create previews for new files
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeNewImage = (index: number) => {
    const updatedImages = selectedImages.filter((_, i) => i !== index);
    const updatedPreviews = imagePreviews.filter((_, i) => i !== index);
    setSelectedImages(updatedImages);
    setImagePreviews(updatedPreviews);
  };

  const removeExistingImage = (imageUrl: string) => {
    setExistingImages(prev => prev.filter(img => img !== imageUrl));
    setImagesToDelete(prev => [...prev, imageUrl]);
  };

  const uploadNewImages = async (equipmentId: string): Promise<string[]> => {
    const imageUrls: string[] = [];
    
    for (let i = 0; i < selectedImages.length; i++) {
      const file = selectedImages[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${equipmentId}-${Date.now()}-${i + 1}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('equipment-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Error uploading image:', error);
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('equipment-images')
        .getPublicUrl(fileName);
        
      imageUrls.push(publicUrl);
    }
    
    return imageUrls;
  };

  const deleteRemovedImages = async () => {
    for (const imageUrl of imagesToDelete) {
      // Extract filename from URL
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      const { error } = await supabase.storage
        .from('equipment-images')
        .remove([fileName]);
        
      if (error) {
        console.error('Error deleting image:', error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Upload new images
      let newImageUrls: string[] = [];
      if (selectedImages.length > 0) {
        newImageUrls = await uploadNewImages(equipment.id);
      }
      
      // Delete removed images
      if (imagesToDelete.length > 0) {
        await deleteRemovedImages();
      }
      
      // Combine existing and new images
      const finalImages = [...existingImages, ...newImageUrls];
      
      // Update equipment data
      const updatedEquipment = {
        ...formData,
        images: finalImages
      };
      
      onSave(updatedEquipment);
      
      toast({
        title: "บันทึกสำเร็จ",
        description: "ข้อมูลครุภัณฑ์ได้รับการอัปเดตแล้ว",
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating equipment:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตข้อมูลได้",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSpecChange = (specKey: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      specs: {
        ...prev.specs,
        [specKey]: value
      }
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>แก้ไขข้อมูลครุภัณฑ์</DialogTitle>
          <DialogDescription>
            แก้ไขข้อมูลครุภัณฑ์ {equipment.name}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ข้อมูลหลัก */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ข้อมูลทั่วไป</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">ชื่อครุภัณฑ์</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type">ประเภท</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value) => handleInputChange('type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Desktop PC">Desktop PC</SelectItem>
                      <SelectItem value="Laptop">Laptop</SelectItem>
                      <SelectItem value="Printer">Printer</SelectItem>
                      <SelectItem value="Monitor">Monitor</SelectItem>
                      <SelectItem value="Server">Server</SelectItem>
                      <SelectItem value="Network Device">Network Device</SelectItem>
                      <SelectItem value="คอมพิวเตอร์ตั้งโต๊ะ">คอมพิวเตอร์ตั้งโต๊ะ</SelectItem>
                      <SelectItem value="คอมพิวเตอร์พกพา">คอมพิวเตอร์พกพา</SelectItem>
                      <SelectItem value="จอแสดงผล">จอแสดงผล</SelectItem>
                      <SelectItem value="เครื่องพิมพ์">เครื่องพิมพ์</SelectItem>
                      <SelectItem value="เซิร์ฟเวอร์">เซิร์ฟเวอร์</SelectItem>
                      <SelectItem value="อุปกรณ์เครือข่าย">อุปกรณ์เครือข่าย</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="brand">ยี่ห้อ</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => handleInputChange('brand', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="model">รุ่น</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => handleInputChange('model', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="serialNumber">Serial Number</Label>
                  <Input
                    id="serialNumber"
                    value={formData.serialNumber}
                    onChange={(e) => handleInputChange('serialNumber', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="assetNumber">เลขครุภัณฑ์</Label>
                  <Input
                    id="assetNumber"
                    value={formData.assetNumber}
                    onChange={(e) => handleInputChange('assetNumber', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="quantity">จำนวน</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => handleInputChange('quantity', e.target.value)}
                    min="1"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ข้อมูลการใช้งาน */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ข้อมูลการใช้งาน</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">สถานะ</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => handleInputChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">พร้อมใช้งาน</SelectItem>
                      <SelectItem value="borrowed">ถูกยืม</SelectItem>
                      <SelectItem value="maintenance">ซ่อมบำรุง</SelectItem>
                      <SelectItem value="damaged">ชำรุด</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="location">สถานที่</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="user">ผู้ใช้งาน</Label>
                  <Input
                    id="user"
                    value={formData.user}
                    onChange={(e) => handleInputChange('user', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="purchaseDate">วันที่ได้มา</Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => handleInputChange('purchaseDate', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="warrantyEnd">หมดประกัน</Label>
                  <Input
                    id="warrantyEnd"
                    type="date"
                    value={formData.warrantyEnd}
                    onChange={(e) => handleInputChange('warrantyEnd', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ข้อมูลเทคนิค */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ข้อมูลเทคนิค</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(formData.specs).map(([key, value]) => (
                  <div key={key}>
                    <Label htmlFor={key} className="capitalize">
                      {key === 'cpu' ? 'CPU' : 
                       key === 'ram' ? 'RAM' :
                       key === 'storage' ? 'Storage' :
                       key === 'size' ? 'ขนาด' :
                       key === 'resolution' ? 'ความละเอียด' :
                       key === 'panel' ? 'Panel' :
                       key === 'type' ? 'ประเภท' :
                       key === 'speed' ? 'ความเร็ว' :
                       key}
                    </Label>
                    <Input
                      id={key}
                      value={value}
                      onChange={(e) => handleSpecChange(key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Image Management Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Camera className="h-5 w-5 text-primary" />
                <span>รูปภาพครุภัณฑ์</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={existingImages.length + selectedImages.length >= 3}
                  className="flex items-center space-x-2"
                >
                  <Upload className="h-4 w-4" />
                  <span>เลือกรูปภาพ</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={existingImages.length + selectedImages.length >= 3}
                  className="flex items-center space-x-2"
                >
                  <Camera className="h-4 w-4" />
                  <span>ถ่ายรูป</span>
                </Button>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => handleImageUpload(e.target.files)}
              />
              
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                capture="environment"
                className="hidden"
                onChange={(e) => handleImageUpload(e.target.files)}
              />

              <p className="text-sm text-muted-foreground">
                จัดการรูปภาพได้สูงสุด 3 รูป (สนับสนุนไฟล์ JPG, PNG, WEBP ขนาดไม่เกิน 5MB ต่อรูป)
              </p>

              {/* Existing Images */}
              {existingImages.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">รูปภาพปัจจุบัน</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {existingImages.map((imageUrl, index) => (
                      <div key={`existing-${index}`} className="relative">
                        <div className="aspect-square bg-muted rounded-lg overflow-hidden border">
                          <img
                            src={imageUrl}
                            alt={`Existing ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 shadow-md"
                          onClick={() => removeExistingImage(imageUrl)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Image Previews */}
              {imagePreviews.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">รูปภาพใหม่</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={`new-${index}`} className="relative">
                        <div className="aspect-square bg-muted rounded-lg overflow-hidden border">
                          <img
                            src={preview}
                            alt={`New Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 shadow-md"
                          onClick={() => removeNewImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" className="bg-gradient-primary hover:opacity-90">
              บันทึกการแก้ไข
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}