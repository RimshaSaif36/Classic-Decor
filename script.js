const products = [
  {
    id: 1,
    name: "Scenic Nature Landscape",
    description:
      "A serene natural landscape bringing calm and beauty to any space.",
    price: 4999,
    image: "images/P1.jpg",
    category: "wall-art",
  },
  {
    id: 2,
    name: "Handmade Painting wall art",
    description:
      "Beautifully crafted handmade painting wall art that adds a unique and artistic touch to your living space.",
    price: 5999,
    image: "images/P2.jpg",
    category: "wall-art",
  },
  {
    id: 3,
    name: "Pillar Stand Mirror Base",
    description:
      "A sturdy and elegant pillar stand mirror base that enhances the aesthetic of any room while providing functional support for your mirror.",
    price: 6999,
    image: "images/P3.jpg",
    category: "wall-mirrors",
  },
  {
    id: 4,
    name: "Customized Acrylic Name Plate",
    description:
      "A sleek and modern customized acrylic name plate that adds a personal and stylish touch to any space.",
    price: 7999,
    image: "images/P4.jpg",
    category: "name-plates",
  },
  {
    id: 5,
    name: "Wall Mount Photo Frame",
    description:
      "A stylish and functional wall mount photo frame that beautifully displays your cherished memories while enhancing your home decor.",
    price: 8999,
    image: "images/P5.jpg",
    category: "photo-frames",
  },
  {
    id: 6,
    name: "Panda Baby Wall Decor",
    description:
      "Charming panda baby wall decor that adds a playful and adorable touch to any nursery or child's room.",
    price: 9999,
    image: "images/P6.jpg",
    category: "kids-decor",
  },
  {
    id: 7,
    name: "Wall Floating Shelf",
    description:
      "A stylish and functional wall floating shelf that adds both storage and decorative appeal to any room.",
    price: 10999,
    image: "images/P7.jpg",
    category: "shelves",
  },
  {
    id: 8,
    name: "Transparent Acrylic Wall Clock",
    description:
      "A sleek and modern wall clock crafted from clear acrylic, adding a minimalist and elegant touch to any room while keeping time with style.",
    price: 11999,
    image: "images/P8.jpg",
    category: "wall-clocks",
  },
  {
    id: 9,
    name: "Artistic Flair Design Wall Art",
    description:
      "An artistic flair design wall art piece that brings creativity and vibrancy to your living space, making it a focal point of any room.",
    price: 12999,
    image: "images/P9.jpg",
    category: "wall-art",
  },
  {
    id: 10,
    name: "Ayat Al Kursi Calligraphy",
    description:
      "A beautifully crafted calligraphy piece featuring Ayat Al Kursi, perfect for adding a spiritual and artistic touch to your home or office.",
    price: 13999,
    image: "images/P10.jpg",
    category: "wall-art",
  },
  {
    id: 11,
    name: "Acrylic Vase with Tube Inlay",
    description:
      "A chic and modern acrylic vase with tube inlay, perfect for adding a contemporary touch to your home decor.",
    price: 14999,
    image: "images/P11.jpg",
    category: "vases",
  },
  {
    id: 12,
    name: "Lake River Gloss Wall Decor",
    description:
      "Embrace timeless elegance with this beautiful lake river gloss wall decor. Perfect for adding a sophisticated touch to any room or office.",
    price: 15999,
    image: "images/P12.jpg",
    category: "wall-art",
  },
  {
    id: 13,
    name: "Full Length Large Size Acrylic Mirror",
    description:
      "A premium full-length acrylic mirror designed for crystal-clear reflection and lightweight durability—perfect for bedrooms, studios, and boutiques.",
    price: 15999,
    image: "images/M1.jpg",
    category: "wall-mirrors",
  },
  {
    id: 14,
    name: "Five Frames Tree 3D art Decor for Walls",
    description:
      "A beautiful 3D art decor piece featuring five frames arranged in a tree design, perfect for adding a unique and artistic touch to your walls.",
    price: 2590,
    image: "images/Five Frames Tree 3D art Decor for Walls.jpg",
    category: "wall-art",
  },
  {
    id: 15,
    name: "Acrylic Wall Clocks with 12 inches needles",
    description:
      "A modern acrylic wall clock featuring bold 12-inch needles for clear visibility and stylish décor in any room.",
    price: 2590,
    image: "images/Acrylic Wall Clocks with 12 inches needles.jpg",
    category: "wall-clocks",
  },
  {
    id: 16,
    name: "Large Acrylic Decorative Wall Clocks",
    description:
      "A modern acrylic wall clock featuring bold 12-inch needles for clear visibility and stylish décor in any room.",
    price: 2590,
    image: "images/Large Acrylic Decorative Wall Clocks.jpg",
    category: "wall-clocks",
  },
];

// Expose products globally
window.products = products;

function renderProductsGrid(containerSelector, category) {
  const section = document.querySelector(containerSelector);
  if (!section) return;
  const grid = section.querySelector(".product-grid");
  if (!grid) return;
  // Prefer server-provided products (stored on window.products) when available
  const source = Array.isArray(window.products) ? window.products : products;
  function normalizeCategoryKey(s) {
    return String(s || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "");
  }

  // --- Search overlay (create dynamically so search works across pages) ---
  function ensureSearchOverlay() {
    let overlay = document.getElementById('search-overlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'search-overlay';
    overlay.className = 'search-overlay';
    overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML = `
      <div class="search-panel">
        <button id="search-close" class="search-close" aria-label="Close search">&times;</button>
        <form id="search-form" class="search-form" role="search">
          <input id="search-input" type="search" name="q" placeholder="Search products, categories..." aria-label="Search" autocomplete="off" />
          <button type="submit" class="search-submit">Search</button>
        </form>
      </div>`;
    document.body.appendChild(overlay);
    const closeBtn = overlay.querySelector('#search-close');
    const form = overlay.querySelector('#search-form');
    const input = overlay.querySelector('#search-input');
    closeBtn && closeBtn.addEventListener('click', (e)=>{ e.preventDefault(); overlay.setAttribute('aria-hidden','true'); overlay.classList.remove('open'); });
    overlay.addEventListener('click', (e)=>{ if (e.target === overlay) { overlay.setAttribute('aria-hidden','true'); overlay.classList.remove('open'); }});
    document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') { overlay.setAttribute('aria-hidden','true'); overlay.classList.remove('open'); }});
    form && form.addEventListener('submit', function(e){ e.preventDefault(); const q = (input && input.value||'').trim(); if(!q){ overlay.setAttribute('aria-hidden','true'); overlay.classList.remove('open'); return; } location.href = 'shop.html?q='+encodeURIComponent(q); });
    return overlay;
  }

  // Attach click handlers to any search icon in the header/menu
  (function attachSearchToggles(){
    const anchors = Array.from(document.querySelectorAll('a.icon-btn, button.icon-btn'));
    anchors.forEach(a => {
      if (a.querySelector && a.querySelector('.fa-magnifying-glass')) {
        a.addEventListener('click', function(e){ e.preventDefault(); const overlay = ensureSearchOverlay(); overlay.setAttribute('aria-hidden','false'); overlay.classList.add('open'); setTimeout(()=>{ const inp = document.getElementById('search-input'); inp && inp.focus(); },50); });
      }
    });
  })();
  const normCategory = category ? normalizeCategoryKey(category) : "";
  const list = source.filter((p) => {
    if (!normCategory) return true;
    const pcat = p && p.category ? normalizeCategoryKey(p.category) : "";
    return pcat === normCategory;
  });
  const html = list
    .map(
      (p) => `
      <div class="product-item" data-product-id="${p.id}">
        <img src="${p.image}" alt="${p.name}" title="${
        p.name
      }" onerror="this.onerror=null;this.src='images/our_products.jpg'">
        <h3>${p.name}</h3>
        <p class="price">PKR ${p.price.toFixed(0)}</p>
        <div class="product-actions">
          <a class="view-details" href="product_detail.html?id=${
            p.id
          }" data-product-id="${p.id}">View Details</a>
          <button class="add-to-cart" data-product-id="${
            p.id
          }">Add to Cart</button>
        </div>
      </div>
    `
    )
    .join("");
  grid.innerHTML = html;
}

async function loadServerProducts() {
  try {
    const base = location.protocol === "file:" ? "http://localhost:3001" : "";
    const resp = await fetch(base + "/api/products");
    const data = await resp.json();
    if (Array.isArray(data)) {
      window.products = data;
    }
  } catch (_) {}
}

function selectVariants() {
  return new Promise((resolve, reject) => {
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,0.4)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "1000";

    const box = document.createElement("div");
    box.style.background = "#fff";
    box.style.borderRadius = "10px";
    box.style.minWidth = "280px";
    box.style.padding = "16px";
    box.style.boxShadow = "0 10px 24px rgba(0,0,0,0.2)";
    box.innerHTML = `
      <h3 style="margin:0 0 12px 0;">Select Options</h3>
      <div style="margin-bottom:10px;">
        <label style="display:block;margin-bottom:6px;">Size</label>
        <select id="variant-size" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
          <option value="Small 12 inches">Small 12 inches</option>
          <option value="Medium 16 inches" selected>Medium 16 inches</option>
          <option value="Large 18 inches">Large 18 inches</option>
          <option value="Custom">Custom</option>
        </select>
      </div>
      <div style="margin-bottom:16px;">
        <label style="display:block;margin-bottom:6px;">Color</label>
        <select id="variant-color" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
          <option value="Golden/Black" selected>Golden/Black</option>
          <option value="Silver/Black">Silver/Black</option>
          <option value="Black">Black</option>
          <option value="Transparent">Transparent</option>
        </select>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button id="variant-cancel" style="padding:8px 12px;border:1px solid #ddd;background:#fff;border-radius:6px;cursor:pointer;">Cancel</button>
        <button id="variant-ok" style="padding:8px 12px;background:#d4af37;color:#000;border:none;border-radius:6px;cursor:pointer;">Add</button>
      </div>
    `;
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const cleanup = () => overlay.remove();
    box.querySelector("#variant-cancel").addEventListener("click", () => {
      cleanup();
      reject(new Error("cancel"));
    });
    box.querySelector("#variant-ok").addEventListener("click", () => {
      const sizeLabel = box.querySelector("#variant-size").value;
      const colorLabel = box.querySelector("#variant-color").value;
      cleanup();
      resolve({ size: sizeLabel, color: colorLabel, sizeLabel, colorLabel });
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // Robust handler: ensure View Details buttons always navigate to the correct detail page
  document.body.addEventListener("click", (e) => {
    const vd = e.target.closest(".view-details");
    if (!vd) return;
    // get product id from button dataset or parent product-item dataset
    const pid =
      vd.dataset.productId || vd.closest(".product-item")?.dataset?.productId;
    // debug: log click + whether this id exists in window.products
    try {
      const found = !!(
        window.products &&
        Array.isArray(window.products) &&
        window.products.find((p) => String(p.id) === String(pid))
      );
      console.debug("[ViewDetails] clicked", { pid, found });
    } catch (err) {
      console.debug("[ViewDetails] clicked", { pid, found: "error" });
    }
    if (pid) {
      // navigate (avoid interfering with modifiers)
      const isLeft = e.button === 0;
      const noMod = !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
      if (isLeft && noMod) {
        e.preventDefault();
        window.location.href =
          "product_detail.html?id=" + encodeURIComponent(pid);
      }
    }
  });
  let currentCategory;
  const isCategoriesPage = document.body.classList.contains("categories-page");
  if (isCategoriesPage) {
    const params = new URLSearchParams(window.location.search);
    currentCategory = params.get("category");
    renderProductsGrid(".shop-products", currentCategory);
    const labels = {
      "wall-art": "Wall Art",
      "wall-mirrors": "Wall Mirrors",
      "wall-clocks": "Wall Clocks",
      "name-plates": "Name Plates",
      "photo-frames": "Photo Frames",
      "kids-decor": "Kids Decor",
      shelves: "Shelves",
      vases: "Flower Vases",
    };
    const h = document.querySelector(".shop-products h2");
    if (h) {
      if (labels[currentCategory]) h.textContent = labels[currentCategory];
      else if (currentCategory) {
        // fallback: convert id to display label
        const label = currentCategory
          .replace(/[-_]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        h.textContent = label;
      } else {
        h.textContent = "All Products";
      }
    }
  }
  document.body.addEventListener("click", (event) => {
    const btn = event.target.closest(".shop-products .add-to-cart");
    if (!btn) return;
    // prefer button dataset, fallback to parent product-item dataset
    const productId = parseInt(
      btn.dataset.productId || btn.closest(".product-item")?.dataset?.productId
    );
    const product = (window.products || products).find(
      (p) => String(p.id) === String(productId)
    );
    if (product && window.addToCart) {
      const hasDetailSelectors =
        document.getElementById("size") || document.getElementById("color");
      if (hasDetailSelectors) {
        window.addToCart(product);
      } else {
        selectVariants()
          .then((opts) => {
            window.addToCart({ ...product, ...opts });
          })
          .catch(() => {});
      }
    }
  });

  const addToCartDetailButton = document.querySelector(".add-to-cart-detail");
  if (addToCartDetailButton) {
    addToCartDetailButton.addEventListener("click", () => {
      const urlParams = new URLSearchParams(window.location.search);
      const productId = parseInt(urlParams.get("id"));
      const product = (window.products || products).find(
        (p) => String(p.id) === String(productId)
      );
      if (product && window.addToCart) {
        const sizeSel = document.getElementById("size");
        const colorSel = document.getElementById("color");
        const size = sizeSel ? sizeSel.value : "";
        const color = colorSel ? colorSel.value : "";
        const sizeLabel =
          sizeSel && sizeSel.selectedOptions[0]
            ? sizeSel.selectedOptions[0].text
            : "";
        const colorLabel =
          colorSel && colorSel.selectedOptions[0]
            ? colorSel.selectedOptions[0].text
            : "";
        const productWithOptions = {
          ...product,
          size,
          color,
          sizeLabel,
          colorLabel,
        };
        window.addToCart(productWithOptions);
      }
    });
  }

  if (window.updateCartCount) {
    window.updateCartCount();
  }

  const params2 = new URLSearchParams(window.location.search);
  if (params2.get("paid") === "1") {
    try {
      if (window.showMessage)
        window.showMessage("Order placed successfully!", "success");
      localStorage.setItem("cart", JSON.stringify([]));
      if (window.updateCartCount) window.updateCartCount();
    } finally {
      history.replaceState(null, "", window.location.pathname);
    }
  } else if (params2.get("cancel") === "1") {
    try {
      if (window.showMessage) window.showMessage("Payment canceled", "error");
    } finally {
      history.replaceState(null, "", window.location.pathname);
    }
  }

  // Auth UI injection
  const navUl = document.querySelector("header nav ul");
  const actionsBox = document.querySelector(".header-actions");
  function setAuth(token, user) {
    try {
      localStorage.setItem("authToken", token);
      localStorage.setItem("currentUser", JSON.stringify(user || {}));
    } catch (_) {}
  }
  function getUser() {
    try {
      return JSON.parse(localStorage.getItem("currentUser") || "null");
    } catch (_) {
      return null;
    }
  }
  function clearAuth() {
    try {
      localStorage.removeItem("authToken");
      localStorage.removeItem("currentUser");
    } catch (_) {}
  }
  window.setAuth = setAuth;

  function updateAuthUI() {
    if (!actionsBox) return;
    if (!document.getElementById("nav-admin")) {
      const frag = document.createDocumentFragment();
      const adminA = document.createElement("a");
      adminA.id = "nav-admin";
      adminA.href = "admin.html";
      adminA.className = "action-link";
      adminA.textContent = "Admin";
      frag.appendChild(adminA);
      const accountSpan = document.createElement("span");
      accountSpan.id = "nav-account";
      accountSpan.className = "action-text";
      frag.appendChild(accountSpan);
      const logoutA = document.createElement("a");
      logoutA.id = "nav-logout";
      logoutA.href = "#";
      logoutA.className = "action-link";
      logoutA.textContent = "Logout";
      frag.appendChild(logoutA);
      actionsBox.appendChild(frag);
      logoutA.addEventListener("click", (e) => {
        e.preventDefault();
        clearAuth();
        if (window.showMessage) window.showMessage("Logged out", "success");
        location.href = "index.html";
      });
    }
    const user = getUser();
    const admin = document.getElementById("nav-admin");
    const account = document.getElementById("nav-account");
    const logout = document.getElementById("nav-logout");
    if (user && user.name) {
      if (admin) admin.style.display = user.role === "admin" ? "" : "none";
      account.style.display = "";
      logout.style.display = "";
      account.textContent = "Hi, " + user.name.split(" ")[0];
    } else {
      if (admin) admin.style.display = "none";
      account.style.display = "none";
      logout.style.display = "none";
    }
  }
  updateAuthUI();

  loadServerProducts().then(() => {
    const shopGrid = document.querySelector(".shop-products .product-grid");
    if (shopGrid) renderProductsGrid(".shop-products", currentCategory);
  });

  // Poll server for product updates so admin-added products appear live
  function startProductsPolling(interval = 5000) {
    const apiBase =
      location.protocol === "file:" ? "http://localhost:3001" : "";
    let last = null;
    async function poll() {
      try {
        const res = await fetch(apiBase + "/api/products");
        if (!res.ok) return;
        const data = await res.json();
        const j = JSON.stringify(data || []);
        if (last === null) {
          last = j;
          return;
        }
        if (j !== last) {
          last = j;
          window.products = Array.isArray(data) ? data : window.products;
          const shopGrid = document.querySelector(
            ".shop-products .product-grid"
          );
          if (shopGrid) renderProductsGrid(".shop-products", currentCategory);
        }
      } catch (_) {}
    }
    // start polling
    setInterval(poll, interval);
    // also run once after short delay to catch quick changes
    setTimeout(poll, 1000);
  }

  // Start polling only on shop page
  if (document.querySelector(".shop-products .product-grid"))
    startProductsPolling(5000);

  // Search overlay toggle and submit (global)
  (function () {
    const toggle = document.getElementById("search-toggle");
    const overlay = document.getElementById("search-overlay");
    const closeBtn = document.getElementById("search-close");
    const form = document.getElementById("search-form");
    const input = document.getElementById("search-input");
    function openSearch() {
      if (!overlay) return;
      overlay.setAttribute("aria-hidden", "false");
      overlay.classList.add("open");
      setTimeout(() => input && input.focus(), 50);
    }
    function closeSearch() {
      if (!overlay) return;
      overlay.setAttribute("aria-hidden", "true");
      overlay.classList.remove("open");
    }
    if (toggle)
      toggle.addEventListener("click", function (e) {
        e.preventDefault();
        openSearch();
      });
    if (closeBtn)
      closeBtn.addEventListener("click", function (e) {
        e.preventDefault();
        closeSearch();
      });
    if (overlay)
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) closeSearch();
      });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeSearch();
    });
    if (form)
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        const q = ((input && input.value) || "").trim();
        if (!q) {
          closeSearch();
          return;
        }
        const href = "shop.html?q=" + encodeURIComponent(q);
        location.href = href;
      });
  })();
});
