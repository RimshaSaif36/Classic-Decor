
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
  sanitizedPath = sanitizedPath.replace(/^\/+/, '');
  
  // If path doesn't start with 'images/', prepend it
  if (!sanitizedPath.startsWith('images/')) {
    sanitizedPath = 'images/' + sanitizedPath;
  }
  
  return `${API_URL}/${sanitizedPath}`;
}
