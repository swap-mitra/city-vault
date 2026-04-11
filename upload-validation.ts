const allowedMimeTypes = [
  "application/json",
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
  "text/plain",
] as const;

const allowedExtensions = [
  ".csv",
  ".gif",
  ".jpeg",
  ".jpg",
  ".json",
  ".pdf",
  ".png",
  ".txt",
  ".webp",
  ".zip",
] as const;

const allowedMimeTypeSet = new Set(allowedMimeTypes);
const allowedExtensionSet = new Set(allowedExtensions);

export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
export const UPLOAD_ACCEPT_ATTRIBUTE = [...allowedMimeTypes, ...allowedExtensions].join(",");

function getFileExtension(filename: string) {
  const lastDotIndex = filename.lastIndexOf(".");

  if (lastDotIndex < 0) {
    return "";
  }

  return filename.slice(lastDotIndex).toLowerCase();
}

export function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function validateUploadFile(file: Pick<File, "name" | "size" | "type">) {
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return `File exceeds the ${formatFileSize(MAX_UPLOAD_SIZE_BYTES)} upload limit.`;
  }

  const normalizedType = file.type.trim().toLowerCase();
  const extension = getFileExtension(file.name);

  if ((normalizedType && allowedMimeTypeSet.has(normalizedType as (typeof allowedMimeTypes)[number])) || (extension && allowedExtensionSet.has(extension as (typeof allowedExtensions)[number]))) {
    return null;
  }

  return "Unsupported file type. Upload an image, PDF, text, JSON, CSV, or ZIP file.";
}