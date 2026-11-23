/**
 * Aether Storefront — Shop Page: Featured Products + Catalog Grid / Filters / Sort
 */

function aetherProductCardHTML(p, idx) {
  const oldHTML = p.oldPrice
    ? `<span class="price-old">${aetherFormatPrice(p.oldPrice)}</span>`
    : '';
  const saveHTML = p.oldPrice
    ? `<span class="product-save">Save ${aetherFormatPrice(p.oldPrice - p.price)}</span>`
    : '';
  const imgHTML = p.image
    ? `<img src="${p.image}" alt="${p.name}" class="product-img" loading="lazy" />`
    : `<span class="product-emoji">${p.emoji}</span>`;
  const art = `<div class="product-art" style="background:${p.gradient}">${imgHTML}${saveHTML}</div>`;
  const priceRow = `<div class="product-price-row"><span class="price">${aetherFormatPrice(p.price)}</span>${oldHTML}</div>`;
  const ratingRow = `<div class="product-rating">&#9733; ${p.rating.toFixed(1)} &middot; ${p.reviews} reviews</div>`;
  const actions = `<div class="product-actions"><button class="btn btn-sm add-to-cart" data-id="${p.id}">Add To Bag</button></div>`;
  return `
    <article class="product-card reveal" data-product-id="${p.id}" style="--d:${((idx || 0) * 40)}ms">
      <a href="product.html?id=${encodeURIComponent(p.id)}">${art}</a>
      <div class="product-body">
        <div class="product-cat">${p.category}</div>
        <a class="product-name" href="product.html?id=${encodeURIComponent(p.id)}">${p.name}</a>
        <p class="product-tagline">${p.tagline}</p>
        ${priceRow}
        ${ratingRow}
        ${actions}
      </div>
    </article>`;
}

function aetherRenderFeatured() {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;
  const featured = (window.Aether.PRODUCTS || []).filter(function (p) { return p.featured; });
  grid.innerHTML = featured.map((p, i) => aetherProductCardHTML(p, i)).join('');
  if (window.aetherInitReveal) window.aetherInitReveal();
}

function aetherRenderShop() {
  const grid = document.getElementById('shop-grid');
  if (!grid) return;
  const params = new URLSearchParams(window.location.search);
  let category = params.get('cat') || 'All';
  if (!window.Aether.CATEGORIES.includes(category) && category !== 'All') category = 'All';
  let list = (window.Aether.PRODUCTS || []).slice();
  const chip = document.querySelector('.chip.active');
  if (category && category !== 'All') {
    list = list.filter(function (p) { return p.category === category; });
  }
  const sortEl = document.getElementById('sort-select');
  const sort = sortEl ? sortEl.value : 'featured';
  if (sort === 'price-asc') list.sort(function (a, b) { return a.price - b.price; });
  else if (sort === 'price-desc') list.sort(function (a, b) { return b.price - a.price; });
  else if (sort === 'rating') list.sort(function (a, b) { return b.rating - a.rating; });
  else if (sort === 'name') list.sort(function (a, b) { return a.name.localeCompare(b.name); });
  grid.innerHTML = list.map((p, i) => aetherProductCardHTML(p, i)).join('');
  if (window.aetherInitReveal) window.aetherInitReveal();
}

function aetherInitShop() {
  const grid = document.getElementById('shop-grid');
  if (!grid) return;
  const chipsWrap = document.getElementById('category-filters');
  if (chipsWrap) {
    chipsWrap.addEventListener('click', function (ev) {
      const chip = ev.target.closest('.chip');
      if (!chip) return;
      document.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');
      const cat = chip.getAttribute('data-cat');
      const url = new URL(window.location.href);
      if (cat && cat !== 'All') url.searchParams.set('cat', cat); else url.searchParams.delete('cat');
      window.history.replaceState({}, '', url.toString());
      aetherRenderShop();
    });
  }
  const sortEl = document.getElementById('sort-select');
  if (sortEl) {
    sortEl.addEventListener('change', function () { aetherRenderShop(); });
  }
  aetherRenderShop();
}

function aetherInitStorefront() {
  aetherRenderFeatured();
  aetherInitNewsletter();
  if (document.getElementById('shop-grid')) aetherInitShop();
}

window.aetherRenderFeatured = aetherRenderFeatured;
window.aetherRenderShop = aetherRenderShop;
window.aetherInitShop = aetherInitShop;
window.aetherInitStorefront = aetherInitStorefront;
