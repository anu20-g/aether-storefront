/**
 * Aether Storefront — Cart Page: line items, quantity controls, promo, summary
 */

function aetherRenderCart(cart, totals) {
  const container = document.getElementById('site-content');
  if (!cart.items || !cart.items.length) {
    container.innerHTML = `
      <div class="page-header"><span class="terminal-badge">Aether GOODS // CART</span><h1 class="page-title">Your Cart</h1></div>
      <div class="content-block">
        <div class="empty-state">
          <div class="empty-icon">🛒</div>
          <h3>Your cart is empty</h3>
          <p>No aether instruments selected. The collection awaits.</p>
          <a class="btn btn-primary" href="products.html">Browse the Collection</a>
        </div>
      </div>`;
    return;
  }

  const itemsHTML = cart.items.map(function (i) {
    const p = (window.Aether.PRODUCTS || []).find(function (p) { return p.id === i.id; });
    if (!p) return '';
    const lineTotal = p.price * (parseInt(i.qty, 10) || 0);
    const imgHTML = p.image
      ? `<img src="${p.image}" alt="${p.name}" class="cart-thumb-img" />`
      : p.emoji;
    const art = `<div class="cart-thumb" style="background:${p.gradient}">${imgHTML}</div>`;
    const controls = `
      <div class="cart-item-controls">
        <div class="qty-control">
          <button type="button" class="qty-decrease" data-id="${p.id}">−</button>
          <span class="qty-value">${parseInt(i.qty, 10) || 0}</span>
          <button type="button" class="qty-increase" data-id="${p.id}">+</button>
        </div>
        <button type="button" class="remove-link" data-remove="${p.id}">Remove</button>
      </div>`;
    return `
      <div class="cart-item" data-cart-item-id="${p.id}">
        <div>${art}</div>
        <div>
          <div class="cart-item-name"><a href="product.html?id=${encodeURIComponent(p.id)}">${p.name}</a></div>
          <div class="cart-item-meta">SKU ${p.sku} &middot; UNIT ${aetherFormatPrice(p.price)}</div>
          ${controls}
        </div>
        <div class="cart-item-price">${aetherFormatPrice(lineTotal)}</div>
      </div>`;
  }).join('');

  const discountRow = totals.discount > 0
    ? `<div class="summary-row discount">Promo discount (${cart.promo ? cart.promo.code : ''})</div>`
    : '';

  const promoSection = `
    <div class="summary-card" style="margin-bottom:24px;">
      <div class="summary-title">Promo Code</div>
      ${cart.promo ? `
        <div class="promo-applied">
          <span>${cart.promo.code} applied</span>
          <button type="button" class="remove-link" id="promo-clear">Remove</button>
        </div>` : `
        <form class="promo-row" id="promo-form">
          <input type="text" id="promo-input" placeholder="Promo code (Aether10)" autocomplete="off" />
          <button type="submit" class="btn btn-sm">Apply</button>
        </form>`}
    </div>`;

  container.innerHTML = `
    <div class="page-header"><span class="terminal-badge">Aether GOODS // CART</span><h1 class="page-title">Your Cart</h1></div>
    <div class="container">
      <div class="cart-layout">
        <div>
          <div class="cart-items">${itemsHTML}</div>
          <div style="margin-top:16px;"><a href="products.html" class="link-btn">Continue Shopping &rarr;</a></div>
        </div>
        <div>
          <div class="summary-card">
            <div class="summary-title">Order Summary</div>
            <div class="summary-row"><span>Subtotal</span><span>${aetherFormatPrice(totals.subtotal)}</span></div>
            ${discountRow}
            <div class="summary-row"><span>Shipping</span><span>${totals.shipping > 0 ? aetherFormatPrice(totals.shipping) : 'FREE'}</span></div>
            <div class="summary-row"><span>Estimated Tax</span><span>${aetherFormatPrice(totals.tax)}</span></div>
            <div class="summary-row total"><span>Total</span><span>${aetherFormatPrice(totals.total)}</span></div>
            <a class="btn btn-primary btn-block" style="margin-top:16px;" href="checkout.html">Proceed to Checkout</a>
            <p class="summary-note">Taxes are estimates calculated at 8% &middot; Shipping is free on orders over $75.</p>
          </div>
          ${promoSection}
        </div>
      </div>
    </div>`;

  // promo form handling
  const promoForm = document.getElementById('promo-form');
  if (promoForm) {
    promoForm.addEventListener('submit', function (ev) {
      ev.preventDefault();
      const code = document.getElementById('promo-input').value;
      window.Aether.Store.applyPromo(code).then(function (res) {
        window.aetherToast(res.message);
        return window.aetherInitCart();
      });
    });
  }

  const promoClearBtn = document.getElementById('promo-clear');
  if (promoClearBtn) {
    promoClearBtn.addEventListener('click', function () {
      window.Aether.Store.clearPromo().then(function () { return window.aetherInitCart(); });
    });
  }

  // cart item interactions
  container.querySelectorAll('.cart-item').forEach(function (item) {
    const id = item.getAttribute('data-cart-item-id');
    const qtyEl = item.querySelector('.qty-value');
    const inc = item.querySelector('.qty-increase');
    const dec = item.querySelector('.qty-decrease');
    const rem = item.querySelector('.remove-link');
    if (inc) {
      inc.addEventListener('click', function () {
        const q = (parseInt(qtyEl.textContent, 10) || 1) + 1;
        window.Aether.Store.setCartQty(id, Math.min(99, q)).then(function () { window.aetherUpdateCartBadge(); return window.aetherInitCart(); });
      });
    }
    if (dec) {
      dec.addEventListener('click', function () {
        const q = (parseInt(qtyEl.textContent, 10) || 1) - 1;
        if (q < 1) {
          window.Aether.Store.removeFromCart(id).then(function () { window.aetherUpdateCartBadge(); return window.aetherInitCart(); });
        } else {
          window.Aether.Store.setCartQty(id, q).then(function () { window.aetherUpdateCartBadge(); return window.aetherInitCart(); });
        }
      });
    }
    if (rem) {
      rem.addEventListener('click', function () {
        window.Aether.Store.removeFromCart(id).then(function () { window.aetherUpdateCartBadge(); return window.aetherInitCart(); });
      });
    }
  });
}

async function aetherInitCart() {
  const cart = await window.Aether.Store.load();
  const totals = await window.Aether.Store.getTotals();
  aetherRenderCart(cart, totals);
}

window.aetherRenderCart = aetherRenderCart;
window.aetherInitCart = aetherInitCart;
