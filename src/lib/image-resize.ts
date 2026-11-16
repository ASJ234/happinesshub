export interface ResizedImage {
  blob: Blob;
  width: number;
  height: number;
}

/**
 * Shrinks an image in the browser to fit within `maxSize` pixels and
 * re-encodes it as JPEG. Phone photos are often 4-12 MB; this keeps uploads
 * fast and the gallery light. The photo's rotation (EXIF) is applied.
 */
export async function resizeImage(
  file: Blob,
  maxSize: number,
  quality = 0.85
): Promise<ResizedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser can't process images");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
  if (!blob) throw new Error("Could not process the image");
  return { blob, width, height };
}
