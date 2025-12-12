let cart = JSON.parse(localStorage.getItem("cart")) || [];
const shippingPrice = 200; // Fixed shipping price

const saveCart = () => {
  localStorage.setItem("cart", JSON.stringify(cart));
  if (window.updateCartCount) {
    // Ensure updateCartCount is available globally
    window.updateCartCount();
  }
};

const updateCartCount = () => {
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const ids = ["cart-count", "nav-cart-count"];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = totalItems;
  });
};

const showMessage = (message, type = "success") => {
  const el = document.createElement("div");
  el.classList.add("cart-message", type);
  el.textContent = message;
  el.style.position = "fixed";
  el.style.top = "20px";
  el.style.left = "50%";
  el.style.transform = "translateX(-50%)";
  el.style.padding = "15px 30px";
  el.style.borderRadius = "8px";
  el.style.fontSize = "1.1rem";
  el.style.fontWeight = "bold";
  el.style.color = "#fff";
  el.style.zIndex = "1000";
  el.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
  el.style.opacity = "0";
  el.style.transition = "opacity 200ms ease";
  if (type === "success") el.style.backgroundColor = "#4CAF50";
  if (type === "error") el.style.backgroundColor = "#f44336";
  document.body.appendChild(el);
  requestAnimationFrame(() => {
    el.style.opacity = "1";
  });
  setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 200);
  }, 3000);
};

const addToCart = (product) => {
  const existingItem = cart.find((item) => item.id === product.id);
  if (existingItem) {
    existingItem.quantity++;
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  saveCart();
  showMessage(`${product.name} added to cart!`, "success");
};

// Expose functions globally
window.updateCartCount = updateCartCount;
window.addToCart = addToCart;

document.addEventListener("DOMContentLoaded", () => {
  const cartItemsContainer = document.querySelector(".cart-items");
  const subtotalPriceElement = document.querySelector(".subtotal-price");
  const totalPriceElement = document.querySelector(".total-price span");

  const renderCartItems = () => {
    // If container or totals are not present on the page, nothing to render
    if (!cartItemsContainer || !subtotalPriceElement || !totalPriceElement)
      return;
    cartItemsContainer.innerHTML = ""; // Clear existing items
    if (cart.length === 0) {
      cartItemsContainer.innerHTML =
        '<p style="text-align: center; padding: 20px;">Your cart is empty.</p>';
      subtotalPriceElement.textContent = `PKR 0`;
      totalPriceElement.textContent = `PKR ${shippingPrice}`;
      return;
    }

    let subtotal = 0;
    cart.forEach((item) => {
      let cleanPrice = String(item.price).replace(/,/g, "");
      const itemPrice = parseFloat(cleanPrice);

      if (isNaN(itemPrice)) {
        console.error("Invalid price encountered:", item.price);
        return;
      }

      // ✅ Convert price to PKR by dividing by 100
      const itemPricePKR = itemPrice;
      const itemTotal = itemPricePKR * item.quantity;
      subtotal += itemTotal;

      const cartItemElement = document.createElement("div");
      cartItemElement.classList.add("cart-item-row");
      cartItemElement.innerHTML = `
            <div class="product-info-cell">
                <img src="${item.image}" alt="${item.name}" title="${
        item.name
      }">
                <span class="item-name">${item.name}</span>
                ${
                  item.sizeLabel || item.colorLabel
                    ? `<div class="item-variants">${
                        item.sizeLabel ? `Size: ${item.sizeLabel}` : ""
                      }${
                        item.colorLabel
                          ? `${item.sizeLabel ? " | " : ""}Color: ${
                              item.colorLabel
                            }`
                          : ""
                      }</div>`
                    : ""
                }
            </div>
            <div class="item-price">PKR ${itemPricePKR.toFixed(0)}</div>
            <div class="quantity-control">
                <button class="quantity-btn minus" data-id="${
                  item.id
                }">-</button>
                <input type="text" class="quantity" value="${
                  item.quantity
                }" readonly>
                <button class="quantity-btn plus" data-id="${
                  item.id
                }">+</button>
            </div>
            <div class="item-total-cell">PKR ${itemTotal.toFixed(0)}</div>
            <div class="item-remove-cell">
                <button class="remove-item" data-id="${item.id}">Remove</button>
            </div>
        `;
      cartItemsContainer.appendChild(cartItemElement);
    });

    subtotalPriceElement.textContent = `PKR ${subtotal.toFixed(0)}`;
    totalPriceElement.textContent = `PKR ${(subtotal + shippingPrice).toFixed(
      0
    )}`;
  };

  // Only attach click handler if the container exists on the page
  if (cartItemsContainer) {
    cartItemsContainer.addEventListener("click", (event) => {
      const target = event.target;
      const itemId = parseInt(target.dataset.id);

      if (target.classList.contains("plus")) {
        const item = cart.find((i) => i.id === itemId);
        if (item) {
          item.quantity++;
          saveCart();
          renderCartItems();
        }
      } else if (target.classList.contains("minus")) {
        const item = cart.find((i) => i.id === itemId);
        if (item && item.quantity > 1) {
          item.quantity--;
          saveCart();
          renderCartItems();
        }
      } else if (target.classList.contains("remove-item")) {
        cart = cart.filter((item) => item.id !== itemId);
        saveCart();
        renderCartItems();
      }
    });
  }

  // Only render cart items if on the cart page
  if (document.body.classList.contains("cart-page")) {
    // Add a class to the body of cart.html
    renderCartItems();
  }
  updateCartCount(); // Initial update of cart count on all pages
});
