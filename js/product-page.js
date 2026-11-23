/**
 * Aether Storefront — Product Detail Page
 */

function aetherRenderProductPage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id') || '';
  const product = (window.Aether.PRODUCTS || []).find(function (p) { return p.id === id; });
  const container = document.getElementById('site-content');
  if (!product) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🧭</div><h3>Product not found</h3><p>The requested aether instrument could not be located.</p><a class="btn btn-primary" href="products.html">Browse the Collection</a></div>`;
    return;
  }

  const oldHTML = product.oldPrice ? `<span class="price-old">${aetherFormatPrice(product.oldPrice)}</span>` : '';
  const featuresHTML = product.features.map(function (f) { return `<li>${f}</li>`; }).join('');
  const imgHTML = product.image
    ? `<img src="${product.image}" alt="${product.name}" class="product-img-lg" />`
    : `<span class="product-emoji">${product.emoji}</span>`;

  container.innerHTML = `
    <div class="page-header">
      <span class="terminal-badge">Aether GOODS // PRODUCT DOSSIER</span>
      <h1 class="page-title">${product.name}</h1>
      <p class="page-lead">${product.tagline}</p>
    </div>
    <div class="content-block">
      <div class="product-detail">
        <div class="product-art-lg" style="background:${product.gradient}">${imgHTML}</div>
        <div class="product-detail-info">
          <div class="product-cat">${product.category}</div>
          <h1>${product.name}</h1>
          <p class="product-tagline-lg">${product.tagline}</p>
          <div class="product-detail-price"><span class="price">${aetherFormatPrice(product.price)}</span>${oldHTML}</div>
          <p class="product-detail-desc">${product.description}</p>
          <ul class="feature-list">${featuresHTML}</ul>
          <div class="buy-row">
            <div class="qty-control">
              <button type="button" class="qty-decrease" data-id="${product.id}">−</button>
              <span class="qty-value">1</span>
              <button type="button" class="qty-increase" data-id="${product.id}">+</button>
            </div>
            <button class="btn btn-primary add-to-cart" data-id="${product.id}" data-qty="1">Add To Bag</button>
            <button class="btn btn-outline buy-now" data-id="${product.id}">Buy Now</button>
          </div>
          <p class="summary-note">SKU: ${product.sku} &middot; ${product.inStock ? 'In stock — ships from Aether logistics' : 'Out of stock'}</p>
        </div>
      </div>
    </div>
  `;

  const related = (window.Aether.PRODUCTS || []).filter(function (p) { return p.category === product.category && p.id !== product.id; }).slice(0, 3);
  if (related.length) {
    container.insertAdjacentHTML('beforeend', `
      <section class="content-block">
        <div class="block-header"><span class="section-num">02</span><h2>Related Instruments</h2></div>
        <div class="grid-products">
          ${related.map(aetherProductCardHTML).join('')}
        </div>
      </section>`);
  }

  // qty controls
  container.querySelectorAll('.qty-decrease').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const qtyEl = btn.parentElement.querySelector('.qty-value');
      let q = parseInt(qtyEl.textContent, 10) - 1;
      if (q < 1) q = 1;
      qtyEl.textContent = String(q);
    });
  });
  container.querySelectorAll('.qty-increase').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const qtyEl = btn.parentElement.querySelector('.qty-value');
      let q = parseInt(qtyEl.textContent, 10) + 1;
      if (q > 99) q = 99;
      qtyEl.textContent = String(q);
    });
  });

  container.querySelectorAll('.buy-now').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const qty = parseInt(btn.parentElement.querySelector('.qty-value').textContent, 10) || 1;
      window.Aether.Store.addToCart(btn.getAttribute('data-id'), qty).then(function () {
        window.aetherUpdateCartBadge();
        window.location.href = 'cart.html';
      });
    });
  });
}

window.aetherRenderProductPage = aetherRenderProductPage;
