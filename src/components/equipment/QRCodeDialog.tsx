import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";

interface Equipment {
  id: string;
  name: string;
  assetNumber: string;
  serialNumber: string;
  brand: string;
  model: string;
}

interface QRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment;
}

export default function QRCodeDialog({ open, onOpenChange, equipment }: QRCodeDialogProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (open && equipment) {
      generateQRCode();
    }
  }, [open, equipment]);

  const generateQRCode = async () => {
    try {
      const qrData = JSON.stringify({
        id: equipment.id,
        assetNumber: equipment.assetNumber,
        serialNumber: equipment.serialNumber,
        name: equipment.name,
        brand: equipment.brand,
        model: equipment.model,
        url: `${window.location.origin}/equipment/${equipment.id}`
      });

      const canvas = canvasRef.current;
      if (canvas) {
        await QRCode.toCanvas(canvas, qrData, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });

        const dataUrl = canvas.toDataURL('image/png');
        setQrDataUrl(dataUrl);
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const handleDownload = () => {
    if (qrDataUrl) {
      const link = document.createElement('a');
      link.download = `QR_${equipment.assetNumber}.png`;
      link.href = qrDataUrl;
      link.click();
    }
  };

  const handlePrint = () => {
    if (qrDataUrl) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>QR Code - ${equipment.assetNumber}</title>
              <style>
                body { 
                  margin: 0; 
                  padding: 20px; 
                  text-align: center; 
                  font-family: Arial, sans-serif; 
                }
                .qr-container {
                  border: 1px solid #ddd;
                  padding: 20px;
                  display: inline-block;
                  background: white;
                }
                .equipment-info {
                  margin-top: 10px;
                  font-size: 12px;
                  color: #666;
                }
              </style>
            </head>
            <body>
              <div class="qr-container">
                <img src="${qrDataUrl}" alt="QR Code" />
                <div class="equipment-info">
                  <div><strong>${equipment.name}</strong></div>
                  <div>เลขครุภัณฑ์: ${equipment.assetNumber}</div>
                  <div>Serial: ${equipment.serialNumber}</div>
                </div>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code ครุภัณฑ์</DialogTitle>
          <DialogDescription>
            QR Code สำหรับ {equipment.name} (เลขครุภัณฑ์: {equipment.assetNumber})
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4 py-4">
          <div className="bg-white p-4 rounded-lg border">
            <canvas
              ref={canvasRef}
              className="border border-muted rounded"
            />
          </div>
          
          <div className="text-center text-sm text-muted-foreground">
            <p><strong>{equipment.name}</strong></p>
            <p>เลขครุภัณฑ์: {equipment.assetNumber}</p>
            <p>Serial Number: {equipment.serialNumber}</p>
          </div>
          
          <div className="flex space-x-2">
            <Button onClick={handleDownload} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              ดาวน์โหลด
            </Button>
            <Button onClick={handlePrint} variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              พิมพ์
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}