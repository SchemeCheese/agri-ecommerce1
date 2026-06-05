import imageCompression from 'browser-image-compression';

/**
 * Cấu hình nén ảnh trước khi gửi cho AI (suggest-product, AI chat).
 * 0.3MB webp / 1024px là đủ cho vision model — gửi ảnh gốc 5-10MB chỉ tốn
 * băng thông và khiến BE phải parse base64 khổng lồ trên event loop.
 * useWebWorker giữ main thread rảnh → UI không khựng khi nén.
 */
const AI_COMPRESSION_OPTIONS = {
  maxSizeMB: 0.3,
  maxWidthOrHeight: 1024,
  useWebWorker: true,
  fileType: 'image/webp',
};

/**
 * Nén ảnh rồi trả về data URI base64 (BE tự strip prefix).
 * Nén fail (vd: HEIC trên browser không decode được) → fallback gửi ảnh gốc;
 * lỗi đọc file thì reject để caller xử lý.
 */
export async function compressImageForAI(file: File): Promise<string> {
  let source: Blob = file;
  try {
    source = await imageCompression(file, AI_COMPRESSION_OPTIONS);
  } catch {
    // Giữ ảnh gốc — chất lượng gửi đi không đổi, chỉ mất lợi ích nén
  }
  return blobToDataUri(source);
}

/**
 * Mime thực tế của data URI trả về từ compressImageForAI.
 * Bình thường là image/webp; khi nén fallback thì là mime gốc của file.
 */
export function mimeFromDataUri(dataUri: string, fallback = 'image/jpeg'): string {
  return dataUri.match(/^data:([^;]+);base64,/)?.[1] ?? fallback;
}

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
