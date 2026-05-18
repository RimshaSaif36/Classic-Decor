import { getEffectivePrice } from './utils';

function getExistingId(value) {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  return value.productId ?? value._id ?? value.id ?? value.orderId ?? value.transactionId ?? value.slug;
}

function getExistingName(value) {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  return value.name ?? value.title;
}

function getExistingPrice(value) {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  if (value.finalPrice != null) {
    return value.finalPrice;
  }

  if (value.finalAmount != null) {
    return value.finalAmount;
  }

  if (value.discountedPrice != null) {
    return value.discountedPrice;
  }

  if (value.salePrice != null) {
    return value.salePrice;
  }

  if (value.amount != null) {
    return value.amount;
  }

  if (value.saleDiscount != null && (value.basePrice != null || value.price != null)) {
    return getEffectivePrice(value.basePrice ?? value.price, value.saleDiscount, value.sizeLabel ?? value.size);
  }

  return value.price ?? value.cost ?? value.totalPrice ?? value.basePrice;
}

function getExistingQuantity(value) {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  return value.qty ?? value.quantity ?? 1;
}

function normalizeItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    item_id: getExistingId(item),
    item_name: getExistingName(item),
    price: getExistingPrice(item),
    quantity: getExistingQuantity(item),
  }));
}

function getActionField(event, { entity, id, source, value, shipping, normalizedItems }) {
  const ecommerceId = id ?? getExistingId(entity) ?? normalizedItems[0]?.item_id;
  const pagePath = typeof window !== 'undefined' ? window.location?.pathname : undefined;
  const pageTitle = typeof document !== 'undefined' ? document.title : undefined;
  const actionField = {
    id: ecommerceId,
    event_type: event,
    source: source ?? pagePath,
  };

  if (value != null) {
    actionField.value = value;
  }

  if (event === 'Purchase' && value != null) {
    actionField.revenue = value;
  }

  if (shipping != null) {
    actionField.shipping = shipping;
  }

  if (pagePath) {
    actionField.page_path = pagePath;
  }

  if (pageTitle) {
    actionField.page_title = pageTitle;
  }

  return actionField;
}

export function pushGtmEcommerceEvent(event, { entity, items, id, value, source, shipping } = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dataLayer = window.dataLayer || [];

  const normalizedItems = normalizeItems(
    Array.isArray(items) ? items : entity ? [entity] : [],
  );
  const ecommerceId = id ?? getExistingId(entity) ?? normalizedItems[0]?.item_id;
  const ecommerceValue = value ?? getExistingPrice(entity);
  const actionField = getActionField(event, {
    entity,
    id,
    source,
    value: ecommerceValue,
    shipping,
    normalizedItems,
  });
  const eventPayload = {
    actionField,
    id: ecommerceId,
    value: ecommerceValue,
    currency: 'PKR',
    items: normalizedItems,
  };

  if (shipping != null) {
    eventPayload.shipping = shipping;
  }

  window.dataLayer.push({
    event,
    ecommerce: {
      [event]: eventPayload,
    },
  });
}
