const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function imgUrl(path) {
  if (!path) {
    return "";
  }
  if (path.startsWith("http")) {
    return path;
  }
  // Normalize path separators
  let sanitizedPath = path.replace(/\\/g, "/");

  // Remove leading slashes
  sanitizedPath = sanitizedPath.replace(/^\/+/, "");

  // If path doesn't start with 'images/', prepend it
  if (!sanitizedPath.startsWith("images/")) {
    sanitizedPath = "images/" + sanitizedPath;
  }

  return `${API_URL}/${sanitizedPath}`;
}

/**
 * Compute shipping fee based on subtotal.
 * Free shipping when subtotal is greater than `threshold`.
 */
export function computeShipping(
  subtotal,
  threshold = 5000,
  defaultShipping = 200,
) {
  const s = Number(subtotal) || 0;
  return s > Number(threshold) ? 0 : Number(defaultShipping);
}
