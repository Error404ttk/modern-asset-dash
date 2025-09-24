// Minimal type definitions for the Barcode Detector API
// See: https://wicg.github.io/shape-detection-api/

interface DetectedBarcode {
  rawValue?: string;
  cornerPoints?: DOMPoint[];
  boundingBox?: DOMRectReadOnly;
  format?: string;
}

interface BarcodeDetectorOptions {
  formats?: string[];
}

interface BarcodeDetector {
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: BarcodeDetectorOptions): BarcodeDetector;
  getSupportedFormats?: () => Promise<string[]>;
}

interface Window {
  BarcodeDetector: BarcodeDetectorConstructor;
}
