/**
 * Aether Storefront — Store State & API Client
 * All cart / order state is owned by the Rust backend (ecommerce/backend).
 * This module mirrors the server state in memory and exposes the same
 * function surface the page scripts already use.
 */

function aetherApiBase() {
  return window.Aether_API_BASE || '/api';
}

function aetherFetch(path, options) {
  const opts = Object.assign({ headers: { 'Content-Type': 'application/json' } }, options || {});
  return window.fetch(aetherApiBase() + path, opts).then(function (res) {
    if (res.status === 204) return { ok: true, status: 204, data: {} };
    return res.json().then(function (body) {
      if (!res.ok) {
        throw new Error((body && body.error) || (body && body.message) || ('Request failed with status ' + res.status));
      }
      return { ok: true, status: res.status, data: body };
    });
  });
}

window.Aether = window.Aether || {};
window.Aether.Store = window.Aether.Store || {};

window.Aether.Store.cart = { items: [], promo: null };

window.Aether.Store.load = function () {
  return aetherFetch('/cart').then(function (r) {
    window.Aether.Store.cart = { items: r.data.items || [], promo: r.data.promo || null };
    return window.Aether.Store.cart;
  });
};

window.Aether.Store.getCart = function () {
  return window.Aether.Store.cart;
};

window.Aether.Store.addToCart = function (id, qty) {
  const body = { id: String(id), qty: parseInt(qty, 10) || 1 };
  return aetherFetch('/cart/items', { method: 'POST', body: JSON.stringify(body) }).then(function (r) {
    window.Aether.Store.cart = r.data;
    return window.Aether.PRODUCTS.find(function (p) { return p.id === id; }) || null;
  });
};

window.Aether.Store.removeFromCart = function (id) {
  const body = { id: String(id) };
  return aetherFetch('/cart/remove', { method: 'POST', body: JSON.stringify(body) }).then(function (r) {
    window.Aether.Store.cart = r.data;
    return window.Aether.Store.cart;
  });
};

window.Aether.Store.setCartQty = function (id, qty) {
  const body = { id: String(id), qty: parseInt(qty, 10) || 1 };
  return aetherFetch('/cart/qty', { method: 'POST', body: JSON.stringify(body) }).then(function (r) {
    window.Aether.Store.cart = r.data;
    return window.Aether.Store.cart;
  });
};

window.Aether.Store.clearCart = function () {
  return aetherFetch('/cart', { method: 'DELETE' }).then(function (r) {
    window.Aether.Store.cart = r.data;
    return window.Aether.Store.cart;
  });
};

window.Aether.Store.applyPromo = function (code) {
  const body = { code: String(code || '') };
  return aetherFetch('/cart/promo', { method: 'POST', body: JSON.stringify(body) }).then(function (r) {
    const promo = r.data && r.data.cart ? (r.data.cart.promo || null) : (r.data && r.data.promo) || null;
    window.Aether.Store.cart = { items: (r.data && r.data.cart && r.data.cart.items) || [], promo: promo };
    return { ok: !!(r.data && r.data.cart && r.data.cart.promo), message: 'Promo applied.' };
  });
};

window.Aether.Store.clearPromo = function () {
  return aetherFetch('/cart/promo', { method: 'POST', body: JSON.stringify({ code: '' }) }).then(function (r) {
    const cartData = (r.data && r.data.cart) || r.data || {};
    window.Aether.Store.cart = { items: cartData.items || [], promo: cartData.promo || null };
    return { ok: true, message: 'Promo removed.' };
  });
};

window.Aether.Store.getCartCount = function () {
  const cart = window.Aether.Store.getCart();
  let n = 0;
  (cart.items || []).forEach(function (i) { n += parseInt(i.qty, 10) || 0; });
  return n;
};

window.Aether.Store.getTotals = function () {
  return aetherFetch('/cart/totals').then(function (r) { return r.data; });
};

window.Aether.Store.placeOrder = function (order) {
  return aetherFetch('/orders', { method: 'POST', body: JSON.stringify(order) }).then(function (r) { return r.data; });
};

window.Aether.Store.getOrders = function () {
  return aetherFetch('/orders').then(function (r) { return r.data; });
};

window.Aether.Store.getOrder = function (id) {
  return aetherFetch('/orders/' + encodeURIComponent(String(id))).then(function (r) {
    if (!r.data) throw new Error('Order not found.');
    return r.data;
  }, function () {
    return null;
  });
};

window.Aether.Store.chargeCard = function (cardNumber) {
  const digits = String(cardNumber || '').replace(/\D/g, '');
  return aetherFetch('/payment/charge', { method: 'POST', body: JSON.stringify({ cardNumber: digits }) }).then(function (r) { return r.data; });
};

/* ---------- Formatting & validation helpers (client-side UX only) ---------- */

function aetherFormatPrice(value) {
  const n = typeof value === 'number' ? value : parseFloat(value) || 0;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  } catch (e) {
    return '$' + n.toFixed(2);
  }
}

function aetherLuhnCheck(num) {
  const digits = String(num || '').replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits.charAt(i), 10);
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

function aetherDetectBrand(num) {
  const digits = String(num || '').replace(/\D/g, '');
  if (/^4/.test(digits)) return 'Visa';
  if (/^(5[1-5]|2[2-9])/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  if (/^6/.test(digits)) return 'Discover';
  return 'Card';
}

function aetherFormatCardNumber(value) {
  const digits = String(value || '').replace(/\D/g, '').substring(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function aetherValidateExpiry(value) {
  const m = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(String(value || '').trim());
  if (!m) return { ok: false, message: 'Expiry must be in MM/YY format.' };
  const month = parseInt(m[1], 10);
  const year = 2000 + parseInt(m[2], 10);
  const exp = new Date(year, month, 0, 23, 59, 59);
  if (exp < new Date()) return { ok: false, message: 'Expiry date is in the past.' };
  return { ok: true, message: 'Valid' };
}

function aetherValidateCvv(value) {
  const cvv = String(value || '').replace(/\D/g, '');
  if (!/^\d{3,4}$/.test(cvv)) return { ok: false, message: 'CVV must be 3-4 digits.' };
  return { ok: true, message: 'Valid' };
}

function aetherValidateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim()) ? { ok: true, message: 'Valid' } : { ok: false, message: 'Enter a valid email address.' };
}

window.Aether.Store.formatPrice = aetherFormatPrice;
window.Aether.Store.luhnCheck = aetherLuhnCheck;
window.Aether.Store.detectBrand = aetherDetectBrand;
window.Aether.Store.formatCardNumber = aetherFormatCardNumber;
window.Aether.Store.validateExpiry = aetherValidateExpiry;
window.Aether.Store.validateCvv = aetherValidateCvv;
window.Aether.Store.validateEmail = aetherValidateEmail;
