// Global Application State
let currentSlideIndex = 0;
let slideInterval;
let cart = [];
let activeStitchingType = 'unstitched';



// Initialize Supabase Client
const supabaseUrl = "https://jyywiywbcaxuncyradpv.supabase.co";
const supabaseKey = "sb_publishable_Bs1mw8UhNkUBz-QZqRpxLA_CyJJ1eJ7";
let supabase = null;
try {
  if (window.supabase && typeof window.supabase.createClient === "function") {
    supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
  }
} catch (e) {
  console.warn("Supabase load failed, falling back to local simulation:", e);
}
let currentUser = null;

// DOM Elements & Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  // Initialize slider
  startSlider();

  // Load products list initially
  renderCatalog(window.products || []);

  // Search input listeners
  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");
  
  if (searchInput) {
    searchInput.addEventListener("keyup", (e) => {
      if (e.key === "Enter") {
        triggerSearch();
      }
    });
  }
  if (searchBtn) {
    searchBtn.addEventListener("click", triggerSearch);
  }

  // Set initial cart totals
  updateCartUI();

  // Make sure home view is active from the start (door is a CSS fixed overlay)
  const homeView = document.getElementById("home-view");
  if (homeView) homeView.classList.add("active");

  // Setup Supabase auth listeners or check mock session
  if (supabase) {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthStateChange(session);
    });

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthStateChange(session);
    });
  } else {
    // Check for mock session in localStorage
    const mockSession = localStorage.getItem("mock_session");
    if (mockSession) {
      try {
        currentUser = JSON.parse(mockSession);
        updateAuthUI();
        fetchUserOrders();
      } catch (e) {
        console.error("Failed to parse mock session:", e);
        updateAuthUI();
      }
    } else {
      updateAuthUI();
    }
  }
});

/* ==========================================================================
   VIEW ROUTER & NAVIGATION
   ========================================================================== */

// Show any view — no splash blocking needed (door is a CSS fixed overlay)
function showView(viewId) {
  // ensure view switching also updates the hero slider visibility
  if (viewId === 'home') {
    const slides = document.querySelectorAll('.slide');
    slides.forEach(function(sl) { sl.style.opacity = ''; });
    const active = document.querySelector('.slide.active') || slides[0];
    if (active) active.classList.add('active');
  }
  renderView(viewId);
}


// Render the target view section
function renderView(viewId) {
  // Hide all sections
  const sections = document.querySelectorAll(".view-section");
  sections.forEach(sec => sec.classList.remove("active"));

  // Show selected section
  const activeSection = document.getElementById(viewId + "-view");
  if (activeSection) {
    activeSection.classList.add("active");
  }

  // Scroll to top
  window.scrollTo({ top: 0, behavior: "smooth" });

  // Special hooks when entering specific views
  if (viewId === "catalog") {
    resetSidebarFilters();
    renderCatalog(window.products || []);
    document.getElementById("catalogTitle").innerText = "Ethnic Wear Collections";
  }
}

// Called when user clicks the door splash — animate doors open then hide
function openRoyalDoors() {
  const splash = document.getElementById("door-splash");
  if (!splash || splash.classList.contains("opened")) return;

  // Trigger door slide-out animation
  splash.classList.add("opened");
  document.body.classList.remove("lock-scroll");

  // After animation completes, fully remove the splash from view
  setTimeout(function() {
    splash.style.display = "none";
    // Ensure home view is showing
    showView("home");
  }, 1300);
}

function filterByCategory(categoryName) {
  showView('catalog');
  
  // Uncheck all category filters, and check ONLY the selected category
  const checks = document.querySelectorAll(".category-filter-check");
  checks.forEach(check => {
    check.checked = (check.value === categoryName);
  });

  applyFilters();
  
  // Set catalog title
  document.getElementById("catalogTitle").innerText = `${categoryName} Collection`;
}

function filterByOccasion(occasionName) {
  showView('catalog');
  
  // Reset all filters first
  resetSidebarFilters();
  
  let colorValue = "";
  let displayTitle = "";
  
  if (occasionName === 'Haldi') {
    colorValue = "Gold";
    displayTitle = "Haldi Ceremony Collection";
  } else if (occasionName === 'Mehndi') {
    colorValue = "Green";
    displayTitle = "Mehndi Outfits Collection";
  } else if (occasionName === 'Wedding') {
    colorValue = "Red";
    displayTitle = "Royal Wedding Collection";
  } else if (occasionName === 'Sangeet') {
    colorValue = "Blue";
    displayTitle = "Sangeet & Celebration Collection";
  }
  
  if (colorValue) {
    const checks = document.querySelectorAll(".color-filter-check");
    checks.forEach(check => {
      if (check.value === colorValue) {
        check.checked = true;
      }
    });
  }
  
  applyFilters();
  
  // Set catalog title
  document.getElementById("catalogTitle").innerText = displayTitle;
}


function triggerSearch() {
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  showView('catalog');
  
  // Hide search overlay panel
  toggleSearchOverlay(false);

  // Filter using search query
  let filtered = (window.products || []);
  if (query) {
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.category.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.fabric.toLowerCase().includes(query) ||
      p.color.toLowerCase().includes(query)
    );
    document.getElementById("catalogTitle").innerText = `Search Results for "${query}"`;
  } else {
    document.getElementById("catalogTitle").innerText = "Ethnic Wear Collections";
  }
  
  renderCatalog(filtered);
}

function toggleSearchOverlay(open) {
  const bar = document.getElementById("searchOverlayBar");
  if (!bar) return;
  if (open) {
    bar.classList.add("active");
    const input = document.getElementById("searchInput");
    if (input) setTimeout(() => input.focus(), 300);
  } else {
    bar.classList.remove("active");
  }
}

function resetSidebarFilters() {
  const checkboxes = document.querySelectorAll(".category-filter-check, .color-filter-check, .fabric-filter-check");
  checkboxes.forEach(c => c.checked = false);

  const priceRadioAll = document.querySelector('input[name="price-filter"][value="all"]');
  if (priceRadioAll) priceRadioAll.checked = true;

  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) sortSelect.value = "default";
}

/* ==========================================================================
   HERO CAROUSEL SLIDER
   ========================================================================== */
function startSlider() {
  stopSlider();
  slideInterval = setInterval(() => {
    nextSlide();
  }, 5000);
}

function stopSlider() {
  if (slideInterval) clearInterval(slideInterval);
}

function nextSlide() {
  const slides = document.querySelectorAll(".slide");
  const dots = document.querySelectorAll(".dot");
  if (slides.length === 0) return;

  if (slides[currentSlideIndex]) {
    slides[currentSlideIndex].classList.remove("active");
  }
  if (dots[currentSlideIndex]) {
    dots[currentSlideIndex].classList.remove("active");
  }

  currentSlideIndex = (currentSlideIndex + 1) % slides.length;

  if (slides[currentSlideIndex]) {
    slides[currentSlideIndex].classList.add("active");
  }
  if (dots[currentSlideIndex]) {
    dots[currentSlideIndex].classList.add("active");
  }
}

function setSlide(index) {
  const slides = document.querySelectorAll(".slide");
  const dots = document.querySelectorAll(".dot");
  if (slides.length === 0 || index >= slides.length) return;

  stopSlider();

  if (slides[currentSlideIndex]) {
    slides[currentSlideIndex].classList.remove("active");
  }
  if (dots[currentSlideIndex]) {
    dots[currentSlideIndex].classList.remove("active");
  }

  currentSlideIndex = index;

  if (slides[currentSlideIndex]) {
    slides[currentSlideIndex].classList.add("active");
  }
  if (dots[currentSlideIndex]) {
    dots[currentSlideIndex].classList.add("active");
  }

  startSlider();
}

/* ==========================================================================
   PRODUCT CATALOG FILTERING & SORTING
   ========================================================================== */
function applyFilters() {
  const selectedCategories = Array.from(document.querySelectorAll(".category-filter-check:checked")).map(el => el.value);
  const selectedColors = Array.from(document.querySelectorAll(".color-filter-check:checked")).map(el => el.value);
  const selectedFabrics = Array.from(document.querySelectorAll(".fabric-filter-check:checked")).map(el => el.value);
  const selectedPriceRange = document.querySelector('input[name="price-filter"]:checked').value;
  const activeSort = document.getElementById("sortSelect").value;

  let filtered = [...(window.products || [])];

  // 1. Category Filter
  if (selectedCategories.length > 0) {
    filtered = filtered.filter(p => selectedCategories.includes(p.category));
  }

  // 2. Color Filter
  if (selectedColors.length > 0) {
    filtered = filtered.filter(p => selectedColors.includes(p.color));
  }

  // 3. Fabric Filter
  if (selectedFabrics.length > 0) {
    filtered = filtered.filter(p => selectedFabrics.includes(p.fabric));
  }

  // 4. Price Filter
  if (selectedPriceRange !== "all") {
    filtered = filtered.filter(p => {
      if (selectedPriceRange === "under200") return p.price < 200;
      if (selectedPriceRange === "200-300") return p.price >= 200 && p.price <= 300;
      if (selectedPriceRange === "over300") return p.price > 300;
      return true;
    });
  }

  // 5. Sorting
  if (activeSort === "price-low") {
    filtered.sort((a, b) => a.price - b.price);
  } else if (activeSort === "price-high") {
    filtered.sort((a, b) => b.price - a.price);
  } else if (activeSort === "rating") {
    filtered.sort((a, b) => b.rating - a.rating);
  }

  renderCatalog(filtered);
}

function renderCatalog(items) {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  grid.innerHTML = "";

  if (items.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: span 3; text-align: center; padding: 50px 0; color: var(--color-gray-dark);">
        <i class="fa-solid fa-face-frown" style="font-size: 40px; color: var(--color-gold); margin-bottom: 15px;"></i>
        <p style="font-size: 18px; font-weight: 500;">No products match your current filters.</p>
        <button onclick="resetSidebarFilters(); renderCatalog(window.products);" style="margin-top: 15px; color: var(--color-maroon); font-weight: 600; text-decoration: underline;">Clear all filters</button>
      </div>
    `;
    return;
  }

  items.forEach(product => {
    // Generate star ratings markup
    let starsHtml = "";
    const fullStars = Math.floor(product.rating);
    const halfStar = product.rating % 1 >= 0.5 ? 1 : 0;
    
    for (let i = 0; i < fullStars; i++) {
      starsHtml += `<i class="fa-solid fa-star stars"></i>`;
    }
    if (halfStar) {
      starsHtml += `<i class="fa-solid fa-star-half-stroke stars"></i>`;
    }
    const emptyStars = 5 - (fullStars + halfStar);
    for (let i = 0; i < emptyStars; i++) {
      starsHtml += `<i class="fa-regular fa-star stars"></i>`;
    }

    const card = document.createElement("div");
    card.className = "product-card";
    
    // Tag display
    const tagHtml = product.tags && product.tags.length > 0 
      ? `<span class="product-tag">${product.tags[0]}</span>`
      : "";

    card.innerHTML = `
      ${tagHtml}
      <div class="product-img-wrapper" onclick="showProductDetails('${product.id}')" style="cursor: pointer;">
        <img src="${product.image}" alt="${product.name}">
      </div>
      <div class="product-details-summary">
        <span class="product-cat">${product.category}</span>
        <h3 class="product-title" onclick="showProductDetails('${product.id}')" style="cursor: pointer;">${product.name}</h3>
        <div class="product-rating">
          ${starsHtml}
          <span>(${product.reviews})</span>
        </div>
        <div class="product-price-row">
          <span class="product-price">$${product.price.toFixed(2)}</span>
          <button class="product-card-btn" onclick="showProductDetails('${product.id}')">View Details</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

/* ==========================================================================
   PRODUCT DETAILS VIEW & CUSTOM STITCHING TAB LOGIC
   ========================================================================== */
function showProductDetails(productId) {
  const product = (window.products || []).find(p => p.id === productId);
  if (!product) return;

  showView('detail');
  activeStitchingType = 'unstitched';

  const container = document.getElementById("productDetailContainer");
  if (!container) return;

  // Generate specs markup
  const specs = [
    { label: "Fabric", value: product.fabric },
    { label: "Color", value: product.color },
    { label: "Work", value: product.description.includes("embroidery") ? "Intricate Embroidery" : "Zari Work" },
    { label: "Availability", value: product.inStock ? "In Stock" : "Out of Stock" }
  ];

  let specsHtml = "";
  specs.forEach(s => {
    specsHtml += `<div class="spec-item"><strong>${s.label}:</strong> ${s.value}</div>`;
  });

  // Generate stars
  let starsHtml = "";
  for (let i = 0; i < Math.floor(product.rating); i++) {
    starsHtml += `<i class="fa-solid fa-star" style="color: #f1c40f;"></i>`;
  }
  if (product.rating % 1 >= 0.5) {
    starsHtml += `<i class="fa-solid fa-star-half-stroke" style="color: #f1c40f;"></i>`;
  }

  // Create detail layout content
  container.innerHTML = `
    <!-- Gallery -->
    <div class="p-detail-images">
      <div class="p-detail-main-img">
        <img id="mainProductImage" src="${product.image}" alt="${product.name}">
      </div>
      <div style="display: flex; gap: 10px;">
        <img src="${product.image}" alt="thumb" style="width: 80px; height: 100px; object-fit: cover; border: 2px solid var(--color-gold); border-radius: 4px; cursor: pointer;">
        <img src="${product.image}" alt="thumb" style="width: 80px; height: 100px; object-fit: cover; border: 1px solid var(--color-gray-light); border-radius: 4px; cursor: pointer; filter: hue-rotate(90deg);" onclick="changePreviewTint(90)">
        <img src="${product.image}" alt="thumb" style="width: 80px; height: 100px; object-fit: cover; border: 1px solid var(--color-gray-light); border-radius: 4px; cursor: pointer; filter: hue-rotate(180deg);" onclick="changePreviewTint(180)">
      </div>
    </div>

    <!-- Purchase details & Custom Stitching -->
    <div class="p-detail-info">
      <span class="p-detail-cat">${product.category}</span>
      <h1 class="p-detail-title">${product.name}</h1>
      <div class="p-detail-rating">
        <div class="stars">${starsHtml}</div>
        <span style="color: var(--color-gray-dark); font-size: 13px;">(${product.reviews} customer reviews)</span>
      </div>
      <div class="p-detail-price">$${product.price.toFixed(2)}</div>
      <p class="p-detail-desc">${product.description}</p>

      <div class="p-detail-specs">
        ${specsHtml}
      </div>

      <!-- Stitching System -->
      <div class="stitching-section">
        <h3 class="stitch-title">Stitching & Customization</h3>
        <div class="stitch-tabs">
          <button class="stitch-tab active" id="tab-unstitched" onclick="setStitchingTab('unstitched')">Unstitched Fabric (+$0)</button>
          <button class="stitch-tab" id="tab-standard" onclick="setStitchingTab('standard')">Standard Size (+$20)</button>
          <button class="stitch-tab" id="tab-custom" onclick="setStitchingTab('custom')">Custom Tailoring (+$50)</button>
        </div>

        <!-- Unstitched panel -->
        <div class="stitch-content-panel active" id="panel-unstitched">
          <p style="font-size: 13px; color: var(--color-gray-dark);">The product will be shipped as unstitched fabric dress materials, sarees with unstitched blouse piece, or unhemmed garments.</p>
        </div>

        <!-- Standard Size panel -->
        <div class="stitch-content-panel" id="panel-standard">
          <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 8px;">Select Standard Size</label>
          <select class="standard-size-select" id="standardSizeSelect">
            <option value="XS (Chest: 34 inch)">XS (Chest: 34 inch)</option>
            <option value="S (Chest: 36 inch)">S (Chest: 36 inch)</option>
            <option value="M (Chest: 38 inch)">M (Chest: 38 inch)</option>
            <option value="L (Chest: 40 inch)">L (Chest: 40 inch)</option>
            <option value="XL (Chest: 42 inch)">XL (Chest: 42 inch)</option>
            <option value="XXL (Chest: 44 inch)">XXL (Chest: 44 inch)</option>
          </select>
        </div>

        <!-- Custom Tailoring panel -->
        <div class="stitch-content-panel" id="panel-custom">
          <div class="custom-stitch-grid">
            <div class="measure-input-group">
              <label>Bust / Chest (inches)</label>
              <input type="number" id="measureBust" min="30" max="60" placeholder="e.g. 36">
            </div>
            <div class="measure-input-group">
              <label>Waist (inches)</label>
              <input type="number" id="measureWaist" min="24" max="55" placeholder="e.g. 30">
            </div>
            <div class="measure-input-group">
              <label>Height (ft/inches)</label>
              <input type="text" id="measureHeight" placeholder="e.g. 5ft 4in">
            </div>
            <div class="measure-input-group">
              <label>Shoulder Width (inches)</label>
              <input type="number" id="measureShoulder" min="10" max="25" placeholder="e.g. 15">
            </div>
            <div class="measure-input-group" style="grid-column: span 2;">
              <label>Special Tailoring Instructions</label>
              <input type="text" id="measureNotes" placeholder="e.g. Make sleeves full length, high neck collar.">
            </div>
            <span class="measure-note">Our imperial tailoring team will design this item specifically to your dimensions. Note: Custom orders add 5-7 days to shipping times.</span>
          </div>
        </div>
      </div>

      <div class="action-row">
        <button class="btn-add-cart" onclick="handleAddCart('${product.id}')">Add to Cart Bag</button>
      </div>
    </div>
  `;
}

function setStitchingTab(type) {
  activeStitchingType = type;
  
  // Update active tabs
  document.querySelectorAll(".stitch-tab").forEach(tab => tab.classList.remove("active"));
  document.getElementById(`tab-${type}`).classList.add("active");

  // Update panels
  document.querySelectorAll(".stitch-content-panel").forEach(panel => panel.classList.remove("active"));
  document.getElementById(`panel-${type}`).classList.add("active");
}

function changePreviewTint(degrees) {
  const mainImg = document.getElementById("mainProductImage");
  if (mainImg) {
    mainImg.style.filter = `hue-rotate(${degrees}deg)`;
  }
}

/* ==========================================================================
   CART SYSTEM OPERATIONS (CRUD & UI UPDATES)
   ========================================================================== */
function toggleCart(open) {
  const overlay = document.getElementById("cartOverlay");
  const drawer = document.getElementById("cartDrawer");
  if (open) {
    overlay.classList.add("active");
    drawer.classList.add("active");
  } else {
    overlay.classList.remove("active");
    drawer.classList.remove("active");
  }
}

function handleAddCart(productId) {
  const product = (window.products || []).find(p => p.id === productId);
  if (!product) return;

  let stitchingDetails = "";
  let stitchingPrice = 0;

  if (activeStitchingType === 'standard') {
    const size = document.getElementById("standardSizeSelect").value;
    stitchingDetails = `Standard Size: ${size}`;
    stitchingPrice = 20.00;
  } else if (activeStitchingType === 'custom') {
    const bust = document.getElementById("measureBust").value;
    const waist = document.getElementById("measureWaist").value;
    const height = document.getElementById("measureHeight").value;
    const shoulder = document.getElementById("measureShoulder").value;
    const notes = document.getElementById("measureNotes").value;

    if (!bust || !waist || !height) {
      showToast("Please fill in basic measurements for custom tailoring!", true);
      return;
    }

    stitchingDetails = `Custom Stitched (Bust: ${bust}\", Waist: ${waist}\", Ht: ${height}, Sh: ${shoulder}\")`;
    if (notes) {
      stitchingDetails += ` Notes: "${notes}"`;
    }
    stitchingPrice = 50.00;
  } else {
    stitchingDetails = "Unstitched Fabric Material";
    stitchingPrice = 0.00;
  }

  // Create a unique cart item key to distinguish same product with different stitching configurations
  const cartItemId = `${productId}-${activeStitchingType}-${stitchingDetails.replace(/[^a-zA-Z0-9]/g, "")}`;

  // Check if item already in cart
  const existingItem = cart.find(item => item.id === cartItemId);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      id: cartItemId,
      product: product,
      quantity: 1,
      stitchingType: activeStitchingType,
      stitchingDetails: stitchingDetails,
      stitchingPrice: stitchingPrice
    });
  }

  showToast(`${product.name} (${activeStitchingType}) added to cart!`);
  updateCartUI();
  toggleCart(true); // show the cart drawer immediately
}

function updateCartQty(itemId, change) {
  const item = cart.find(i => i.id === itemId);
  if (!item) return;

  item.quantity += change;
  if (item.quantity <= 0) {
    removeFromCart(itemId);
    return;
  }
  updateCartUI();
}

function removeFromCart(itemId) {
  cart = cart.filter(i => i.id !== itemId);
  updateCartUI();
  showToast("Item removed from your cart bag.");
}

function updateCartUI() {
  // Update header count badges
  const cartBadges = document.querySelectorAll("#cartCountBadge");
  const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartBadges.forEach(badge => badge.innerText = totalQty);

  const cartList = document.getElementById("cartItemsList");
  if (!cartList) return;

  cartList.innerHTML = "";

  if (cart.length === 0) {
    cartList.innerHTML = `
      <div class="cart-empty-message">
        <div class="cart-empty-icon"><i class="fa-solid fa-cart-flatbed-suitcases"></i></div>
        <p>Your shopping cart is empty.</p>
        <button class="btn-gold" style="margin-top: 20px;" onclick="toggleCart(false); showView('catalog');">Browse Catalog</button>
      </div>
    `;
    
    // Reset summaries
    document.getElementById("cartSubtotal").innerText = "$0.00";
    document.getElementById("cartStitchCharges").innerText = "$0.00";
    document.getElementById("cartGrandTotal").innerText = "$0.00";
    return;
  }

  let subtotal = 0;
  let stitchingTotal = 0;

  cart.forEach(item => {
    const itemSubtotal = item.product.price * item.quantity;
    const itemStitchFee = item.stitchingPrice * item.quantity;
    subtotal += itemSubtotal;
    stitchingTotal += itemStitchFee;

    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <div class="cart-item-img">
        <img src="${item.product.image}" alt="${item.product.name}">
      </div>
      <div class="cart-item-details">
        <h4 class="cart-item-title">${item.product.name}</h4>
        <div class="cart-item-meta">${item.stitchingDetails}</div>
        <div class="cart-item-price-qty">
          <div class="cart-qty-controls">
            <button class="qty-btn" onclick="updateCartQty('${item.id}', -1)">-</button>
            <span class="qty-value">${item.quantity}</span>
            <button class="qty-btn" onclick="updateCartQty('${item.id}', 1)">+</button>
          </div>
          <span class="cart-item-price">$${(item.product.price + item.stitchingPrice).toFixed(2)}</span>
        </div>
      </div>
      <button class="cart-remove-btn" onclick="removeFromCart('${item.id}')" title="Remove Item"><i class="fa-regular fa-trash-can"></i></button>
    `;
    cartList.appendChild(row);
  });

  const grandTotal = subtotal + stitchingTotal;

  document.getElementById("cartSubtotal").innerText = `$${subtotal.toFixed(2)}`;
  document.getElementById("cartStitchCharges").innerText = `$${stitchingTotal.toFixed(2)}`;
  document.getElementById("cartGrandTotal").innerText = `$${grandTotal.toFixed(2)}`;
}

/* ==========================================================================
   CHECKOUT SIMULATOR & ORDER SUBMISSION
   ========================================================================== */
function proceedToCheckout() {
  if (cart.length === 0) {
    showToast("Your cart is empty. Add items to checkout!", true);
    return;
  }

  toggleCart(false);
  showView('checkout');

  // Render summaries on checkout page
  const orderList = document.getElementById("checkoutOrderItems");
  if (!orderList) return;

  orderList.innerHTML = "";

  let subtotal = 0;
  let stitchingTotal = 0;

  cart.forEach(item => {
    const itemSubtotal = item.product.price * item.quantity;
    const itemStitchFee = item.stitchingPrice * item.quantity;
    subtotal += itemSubtotal;
    stitchingTotal += itemStitchFee;

    const row = document.createElement("div");
    row.className = "order-summary-item";
    row.innerHTML = `
      <div>
        <strong style="color: var(--color-maroon-dark);">${item.product.name}</strong> x ${item.quantity}
        <div style="font-size: 11px; color: var(--color-gray-dark); margin-top: 2px;">${item.stitchingDetails}</div>
      </div>
      <span>$${((item.product.price + item.stitchingPrice) * item.quantity).toFixed(2)}</span>
    `;
    orderList.appendChild(row);
  });

  const grandTotal = subtotal + stitchingTotal;

  document.getElementById("checkoutSubtotal").innerText = `$${subtotal.toFixed(2)}`;
  document.getElementById("checkoutStitchFee").innerText = `$${stitchingTotal.toFixed(2)}`;
  document.getElementById("checkoutGrandTotal").innerText = `$${grandTotal.toFixed(2)}`;
}

function togglePaymentUI(mode) {
  const ccFields = document.getElementById("ccFields");
  const optionCC = document.getElementById("payOptionCC");
  const optionPP = document.getElementById("payOptionPP");

  const ccNum = document.getElementById("ccNum");
  const ccExpiry = document.getElementById("ccExpiry");
  const ccCvv = document.getElementById("ccCvv");

  if (mode === 'cc') {
    ccFields.style.display = "grid";
    optionCC.classList.add("active");
    optionPP.classList.remove("active");
    ccNum.required = true;
    ccExpiry.required = true;
    ccCvv.required = true;
  } else {
    ccFields.style.display = "none";
    optionCC.classList.remove("active");
    optionPP.classList.add("active");
    ccNum.required = false;
    ccExpiry.required = false;
    ccCvv.required = false;
  }
}

async function submitOrder(event) {
  event.preventDefault();

  const orderNum = `RJ-${Math.floor(1000000 + Math.random() * 9000000)}`;
  document.getElementById("successOrderNumber").innerText = `Order Number: ${orderNum}`;

  // Gather values
  const email = document.getElementById("emailAddr").value.trim();
  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const streetAddr = document.getElementById("streetAddr").value.trim();
  const city = document.getElementById("city").value.trim();
  const country = document.getElementById("country").value;
  const state = document.getElementById("state").value.trim();
  const zipCode = document.getElementById("zipCode").value.trim();
  
  const paymentMethod = document.querySelector('input[name="payment-type"]:checked')?.value || "credit-card";

  // Calculate totals
  let subtotal = 0;
  let stitchingTotal = 0;
  
  const orderItems = cart.map(item => {
    const itemSub = item.product.price * item.quantity;
    const itemStitch = item.stitchingPrice * item.quantity;
    subtotal += itemSub;
    stitchingTotal += itemStitch;
    
    return {
      product_id: item.product.id,
      product_name: item.product.name,
      quantity: item.quantity,
      price: item.product.price,
      stitching_details: item.stitchingDetails,
      stitching_price: item.stitchingPrice,
      image: item.product.image
    };
  });

  const grandTotal = subtotal + stitchingTotal;

  // Insert payload
  const orderPayload = {
    order_number: orderNum,
    user_id: currentUser ? currentUser.id : null,
    email: email,
    first_name: firstName,
    last_name: lastName,
    street_address: streetAddr,
    city: city,
    state: state,
    zip_code: zipCode,
    country: country,
    payment_method: paymentMethod,
    items: orderItems,
    subtotal: subtotal,
    stitching_fee: stitchingTotal,
    total_payable: grandTotal
  };

  // If Supabase is loaded, try insert
  if (supabase) {
    try {
      const { error } = await supabase
        .from('orders')
        .insert([orderPayload]);

      if (error) throw error;
      console.log("Order saved to database successfully.");
    } catch (err) {
      console.warn("Could not write order to database:", err.message);
      showToast("Order simulated locally.");
      const localOrders = JSON.parse(localStorage.getItem("mock_orders") || "[]");
      orderPayload.created_at = new Date().toISOString();
      localOrders.push(orderPayload);
      localStorage.setItem("mock_orders", JSON.stringify(localOrders));
    }
  } else {
    const localOrders = JSON.parse(localStorage.getItem("mock_orders") || "[]");
    orderPayload.created_at = new Date().toISOString();
    localOrders.push(orderPayload);
    localStorage.setItem("mock_orders", JSON.stringify(localOrders));
  }

  // Clean cart, reset forms
  cart = [];
  updateCartUI();
  document.getElementById("checkoutForm").reset();

  showView('success');
  showToast("Imperial Order placed successfully!");
  
  // Refresh order list if logged in
  if (currentUser) {
    fetchUserOrders();
  }
}

/* ==========================================================================
   TOAST NOTIFICATION ALERTS
   ========================================================================== */
function showToast(message, isError = false) {
  const container = document.getElementById("notificationContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast-notification";
  if (isError) {
    toast.style.borderLeftColor = "#e74c3c";
  }

  const icon = isError ? "fa-solid fa-circle-exclamation" : "fa-solid fa-circle-check";
  
  toast.innerHTML = `
    <i class="${icon}" style="color: ${isError ? '#e74c3c' : 'var(--color-gold)'}; font-size: 18px;"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Auto remove
  setTimeout(() => {
    toast.style.animation = "slideInRight 0.3s ease-in reverse forwards";
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}



/* ==========================================================================
   ACCOUNT & AUTHENTICATION SYSTEMS
   ========================================================================== */
function handleAuthStateChange(session) {
  currentUser = session ? session.user : null;
  updateAuthUI();
  if (currentUser) {
    fetchUserOrders();
  }
}

function updateAuthUI() {
  const tabContainer = document.querySelector(".account-modal-tabs");
  const panelLogin = document.getElementById("panel-login");
  const panelSignup = document.getElementById("panel-signup");
  const profilePanel = document.getElementById("profile-panel");
  const accountIcon = document.querySelector('.action-icon-btn[title="Account"] i');

  if (currentUser) {
    // User is logged in
    if (tabContainer) tabContainer.style.display = "none";
    if (panelLogin) panelLogin.style.display = "none";
    if (panelSignup) panelSignup.style.display = "none";
    if (profilePanel) profilePanel.style.display = "block";

    // Show name and email
    const name = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
    document.getElementById("profile-name").innerText = `Namaste, ${name}!`;
    document.getElementById("profile-email").innerText = currentUser.email;

    // Highlight user icon
    if (accountIcon) {
      accountIcon.style.color = "var(--color-gold)";
      accountIcon.className = "fa-solid fa-user";
    }
  } else {
    // User is logged out
    if (tabContainer) tabContainer.style.display = "flex";
    if (profilePanel) profilePanel.style.display = "none";

    // Reset tabs
    setAccountTab('login');

    // Reset user icon
    if (accountIcon) {
      accountIcon.style.color = "";
      accountIcon.className = "fa-regular fa-user";
    }
  }
}

async function fetchUserOrders() {
  const ordersList = document.getElementById("profile-orders-list");
  if (!ordersList) return;

  ordersList.innerHTML = `<p class="no-orders-message"><i class="fa-solid fa-spinner fa-spin"></i> Loading order history...</p>`;

  if (!supabase) {
    const allMockOrders = JSON.parse(localStorage.getItem("mock_orders") || "[]");
    const userOrders = allMockOrders.filter(o => o.user_id === currentUser?.id);

    if (userOrders.length === 0) {
      ordersList.innerHTML = `<p class="no-orders-message">No orders placed yet. Start exploring the collection!</p>`;
      return;
    }

    ordersList.innerHTML = "";
    userOrders.forEach(order => {
      const date = new Date(order.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      
      const item = document.createElement("div");
      item.className = "profile-order-item";
      item.innerHTML = `
        <div class="profile-order-meta">
          <span class="profile-order-num">${order.order_number}</span>
          <span class="profile-order-date">${date}</span>
        </div>
        <span class="profile-order-price">$${Number(order.total_payable).toFixed(2)}</span>
      `;
      ordersList.appendChild(item);
    });
    return;
  }

  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!orders || orders.length === 0) {
      ordersList.innerHTML = `<p class="no-orders-message">No orders placed yet. Start exploring the collection!</p>`;
      return;
    }

    ordersList.innerHTML = "";
    orders.forEach(order => {
      const date = new Date(order.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      
      const item = document.createElement("div");
      item.className = "profile-order-item";
      item.innerHTML = `
        <div class="profile-order-meta">
          <span class="profile-order-num">${order.order_number}</span>
          <span class="profile-order-date">${date}</span>
        </div>
        <span class="profile-order-price">$${Number(order.total_payable).toFixed(2)}</span>
      `;
      ordersList.appendChild(item);
    });
  } catch (err) {
    console.error("Error loading order history:", err);
    ordersList.innerHTML = `<p class="no-orders-message" style="color: #e74c3c;">Failed to load order history. Make sure 'orders' table is created.</p>`;
  }
}

function setAccountTab(type) {
  // Update active tab buttons
  document.querySelectorAll(".account-tab").forEach(tab => tab.classList.remove("active"));
  const activeTab = document.getElementById(`tab-${type}`);
  if (activeTab) activeTab.classList.add("active");

  // Update active form panels
  document.querySelectorAll(".account-form-panel").forEach(panel => panel.classList.remove("active"));
  const activePanel = document.getElementById(`panel-${type}`);
  if (activePanel) activePanel.classList.add("active");
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!supabase) {
    const mockUsers = JSON.parse(localStorage.getItem("mock_users") || "[]");
    const foundUser = mockUsers.find(u => u.email === email && u.password === password);
    if (foundUser) {
      currentUser = {
        id: foundUser.id,
        email: foundUser.email,
        user_metadata: { full_name: foundUser.name }
      };
      localStorage.setItem("mock_session", JSON.stringify(currentUser));
      showToast(`Welcome back, ${foundUser.name}!`);
      event.target.reset();
      updateAuthUI();
      fetchUserOrders();
      showView('home');
    } else {
      showToast("Invalid email or password (Demo Mode). Please register first!", true);
    }
    return;
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    showToast(`Welcome back, ${data.user.user_metadata?.full_name || email.split('@')[0]}!`);
    event.target.reset();
    showView('home');
  } catch (err) {
    showToast(err.message || "Failed to log in", true);
  }
}

async function handleSignup(event) {
  event.preventDefault();
  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;

  if (!supabase) {
    const mockUsers = JSON.parse(localStorage.getItem("mock_users") || "[]");
    if (mockUsers.some(u => u.email === email)) {
      showToast("Email address already registered (Demo Mode)!", true);
      return;
    }
    const newUser = {
      id: "mock-" + Math.random().toString(36).substr(2, 9),
      name: name,
      email: email,
      password: password
    };
    mockUsers.push(newUser);
    localStorage.setItem("mock_users", JSON.stringify(mockUsers));

    currentUser = {
      id: newUser.id,
      email: newUser.email,
      user_metadata: { full_name: newUser.name }
    };
    localStorage.setItem("mock_session", JSON.stringify(currentUser));

    showToast(`Welcome, ${name}! Account created successfully (Demo Mode).`);
    event.target.reset();
    updateAuthUI();
    fetchUserOrders();
    showView('home');
    return;
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name
        }
      }
    });

    if (error) throw error;

    if (data.session) {
      showToast(`Account created successfully! Welcome, ${name}!`);
      event.target.reset();
      showView('home');
    } else {
      showToast("Verification link sent! Please check your email inbox.");
      event.target.reset();
      showView('home');
    }
  } catch (err) {
    showToast(err.message || "Failed to sign up", true);
  }
}

async function handleSignOut() {
  if (!supabase) {
    currentUser = null;
    localStorage.removeItem("mock_session");
    showToast("Logged out successfully");
    updateAuthUI();
    showView('home');
    return;
  }
  try {
    await supabase.auth.signOut();
    showToast("Logged out successfully");
    showView('home');
  } catch (err) {
    showToast("Error logging out", true);
  }
}

