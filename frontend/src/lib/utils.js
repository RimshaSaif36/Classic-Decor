const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const DEFAULT_SIZE_LABEL = "Small (S) - 8 × 8";
const DEFAULT_COLOR_LABEL = "Transparent";

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

function normalizeOptionLabel(option) {
  if (typeof option === "string") {
    return option;
  }

  if (option && typeof option.label === "string") {
    return option.label;
  }

  return "";
}

export function getDefaultSizeLabel(product) {
  const sizes = Array.isArray(product?.sizes)
    ? product.sizes.map(normalizeOptionLabel).filter(Boolean)
    : [];

  if (sizes.length === 0) {
    return DEFAULT_SIZE_LABEL;
  }

  return sizes.find((label) => label === DEFAULT_SIZE_LABEL || /^small\b/i.test(label)) || sizes[0];
}

export function getDefaultColorLabel(product) {
  const colors = Array.isArray(product?.colors)
    ? product.colors.map(normalizeOptionLabel).filter(Boolean)
    : [];

  if (colors.length === 0) {
    return DEFAULT_COLOR_LABEL;
  }

  return colors.find((label) => String(label).toLowerCase() === DEFAULT_COLOR_LABEL.toLowerCase()) || colors[0];
}

export function addProductToCart(product, overrides = {}) {
  if (!product) {
    return null;
  }

  const productId = product._id || product.id || product.slug;
  const sizeLabel = String(
    overrides.sizeLabel || overrides.size || getDefaultSizeLabel(product),
  ).trim();
  const colorLabel = String(
    overrides.colorLabel || overrides.color || getDefaultColorLabel(product),
  ).trim();

  if (!productId || !sizeLabel || !colorLabel) {
    return null;
  }

  const next = [...JSON.parse(localStorage.getItem("cart") || "[]")];
  const existing = next.find(
    (item) =>
      item.id === productId &&
      String(item.size || "") === sizeLabel &&
      String(item.color || "") === colorLabel,
  );

  if (existing) {
    existing.quantity = (existing.quantity || 1) + 1;
  } else {
    next.push({
      ...product,
      id: productId,
      quantity: 1,
      size: sizeLabel,
      color: colorLabel,
      sizeLabel,
      colorLabel,
    });
  }

  localStorage.setItem("cart", JSON.stringify(next));

  try {
    const total = next.reduce((sum, item) => sum + (item.quantity || 1), 0);
    window.dispatchEvent(new CustomEvent("cart-updated", { detail: { total } }));
  } catch {
    void 0;
  }

  return { productId, sizeLabel, colorLabel };
}
