export interface CompressedImageResult {
  file: File;
  previewUrl: string;
  originalSize: number;
  compressedSize: number;
}

export async function compressImageFile(
  file: File,
  options: { maxSizeMB: number; quality: number },
): Promise<CompressedImageResult> {
  return {
    file,
    previewUrl: await fileToDataUrl(file),
    originalSize: file.size,
    compressedSize: file.size,
  };
}

export async function compressImageFiles(
  files: FileList | File[],
  options: { maxSizeMB: number; quality: number },
): Promise<CompressedImageResult[]> {
  const list = Array.isArray(files) ? files : Array.from(files);
  const results: CompressedImageResult[] = [];
  for (const file of list) {
    if (!file.type.startsWith("image/")) continue;
    const result = await compressImageFile(file, options);
    results.push(result);
  }
  return results;
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
