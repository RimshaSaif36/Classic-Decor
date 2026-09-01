// Compute shipping fee based on subtotal.
// Free shipping when subtotal is greater than `threshold`.
function computeShipping(subtotal, threshold = 5000, defaultShipping = 200) {
  const s = Number(subtotal) || 0;
  return s > Number(threshold) ? 0 : Number(defaultShipping || 0);
}

module.exports = { computeShipping };
