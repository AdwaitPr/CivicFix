/**
 * Verifies binary file signature (magic bytes) to prevent polyglot/SVG XSS uploads.
 * Permitted formats: JPEG, PNG, WebP. Maximum size: 5 MB (5,242,880 bytes).
 */
export function validateImageMagicBytes(
  buffer: Uint8Array,
  declaredMimeType: string
): { valid: boolean; detectedMime?: "image/jpeg" | "image/png" | "image/webp"; error?: string } {
  const MAX_BYTES = 5 * 1024 * 1024;
  if (!buffer || buffer.byteLength < 12) {
    return { valid: false, error: "File is too small to be a valid image." };
  }
  if (buffer.byteLength > MAX_BYTES) {
    return { valid: false, error: "Image exceeds the maximum 5 MB file size limit." };
  }

  // JPEG signature: FF D8 FF
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;

  // WebP signature: RIFF....WEBP (52 49 46 46 .... 57 45 42 50)
  const isWebp =
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50;

  let detectedMime: "image/jpeg" | "image/png" | "image/webp" | undefined;
  if (isJpeg) detectedMime = "image/jpeg";
  else if (isPng) detectedMime = "image/png";
  else if (isWebp) detectedMime = "image/webp";

  if (!detectedMime) {
    return {
      valid: false,
      error: "Unsupported or corrupted image signature. Only JPEG, PNG, and WebP are permitted.",
    };
  }

  if (detectedMime !== declaredMimeType) {
    return {
      valid: false,
      error: `MIME type mismatch: declared ${declaredMimeType} but detected ${detectedMime}.`,
    };
  }

  return { valid: true, detectedMime };
}
