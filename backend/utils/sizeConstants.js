// Standard product sizes
const PRODUCT_SIZES = [
  {
    id: "s",
    label: "Small (S) - 8 × 8",
    dimension: 8,
  },
  {
    id: "m",
    label: "Medium (M) - 12 × 12",
    dimension: 12,
  },
  {
    id: "l",
    label: "Large (L) - 15 × 15",
    dimension: 15,
  },
];

// Get all size labels as simple strings
const getAllSizeLabels = () => PRODUCT_SIZES.map((s) => s.label);

// Get size info by label
const getSizeByLabel = (label) => PRODUCT_SIZES.find((s) => s.label === label);

// Get size info by id
const getSizeById = (id) => PRODUCT_SIZES.find((s) => s.id === id);

module.exports = {
  PRODUCT_SIZES,
  getAllSizeLabels,
  getSizeByLabel,
  getSizeById,
};
