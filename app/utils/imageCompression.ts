/**
 * Image compression utility for profile photos
 * Reduces file size before base64 encoding to minimize localStorage usage
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1, default 0.75
}

/**
 * Compress an image file before storing as base64
 * Uses Canvas API for client-side compression
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<string> {
  const { maxWidth = 512, maxHeight = 512, quality = 0.75 } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img;
        const aspectRatio = width / height;

        if (width > maxWidth) {
          width = maxWidth;
          height = Math.round(width / aspectRatio);
        }
        if (height > maxHeight) {
          height = maxHeight;
          width = Math.round(height * aspectRatio);
        }

        // Create canvas and draw resized image
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64 with quality compression
        const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
        const base64 = canvas.toDataURL(mimeType, quality);

        resolve(base64);
      };

      img.onerror = () => {
        reject(new Error("Could not load image"));
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error("Could not read file"));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Calculate approximate base64 size in bytes
 */
export function estimateBase64Size(base64: string): number {
  return Math.ceil((base64.length * 3) / 4) - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
}

/**
 * Format bytes to human-readable size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
