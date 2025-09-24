import { useState, useEffect, useRef, useCallback } from "react";
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
  quantity?: string;
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
  console.log('QRCodeDialog rendered with:', { open, equipment: !!equipment });
  
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const generateQRCode = useCallback(async () => {
    try {
      console.log('Generating QR Code for equipment:', equipment);
      const qrUrl = `${window.location.origin}/equipment/${equipment.id}`;
      console.log('QR Code URL:', qrUrl);
      const canvas = canvasRef.current;
      console.log('Canvas element:', canvas);
      if (canvas) {
        await QRCode.toCanvas(canvas, qrUrl, {
          width: 256,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' }
        });
        const dataUrl = canvas.toDataURL('image/png');
        setQrDataUrl(dataUrl);
        console.log('QR Code generated successfully');
      } else {
        console.error('Canvas element not found');
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  }, [equipment]);
  const setCanvasRef = (node: HTMLCanvasElement | null) => {
    canvasRef.current = node;
    if (node && open && equipment) {
      console.log('Canvas mounted, generating QR...');
      generateQRCode();
    }
  };

  useEffect(() => {
    console.log('QR Dialog useEffect triggered:', { open, equipment: !!equipment });
    if (open && equipment && canvasRef.current) {
      console.log('Calling generateQRCode...');
      generateQRCode();
    }
  }, [open, equipment, generateQRCode]);

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
        const html = `
          <html>
            <head>
              <title>QR Code - ${equipment.assetNumber}</title>
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <style>
                body { margin: 0; padding: 20px; text-align: center; font-family: Arial, sans-serif; }
                .qr-container { border: 1px solid #ddd; padding: 20px; display: inline-block; background: white; }
                .equipment-info { margin-top: 10px; font-size: 12px; color: #666; }
                @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
              </style>
            </head>
            <body>
              <div class="qr-container">
                <img id="qrImg" src="${qrDataUrl}" alt="QR Code for ${equipment.name}" />
                <div class="equipment-info">
                  <div><strong>${equipment.name}</strong></div>
                  <div>เลขครุภัณฑ์: ${equipment.assetNumber}</div>
                  <div>Serial: ${equipment.serialNumber}</div>
                </div>
              </div>
              <script>
                const img = document.getElementById('qrImg');
                function doPrint() { window.focus(); window.print(); }
                if (img.complete) { doPrint(); }
                else { img.onload = doPrint; img.onerror = doPrint; }
              </script>
            </body>
          </html>`;
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
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
              ref={setCanvasRef}
              className="border border-muted rounded"
            />
          </div>
          
          <div className="text-center text-sm text-muted-foreground">
            <p><strong>{equipment.name}</strong></p>
            <p>เลขครุภัณฑ์: {equipment.assetNumber}</p>
            <p>Serial Number: {equipment.serialNumber}</p>
          </div>
          
          <div className="flex space-x-2">
            <Button onClick={handleDownload} variant="outline" disabled={!qrDataUrl}>
              <Download className="h-4 w-4 mr-2" />
              ดาวน์โหลด
            </Button>
            <Button onClick={handlePrint} variant="outline" disabled={!qrDataUrl}>
              <Printer className="h-4 w-4 mr-2" />
              พิมพ์
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}