/**
 * Aether Storefront — Store State & API Client
 * Primary: Axum Rust REST backend (/api)
 * Fallback: High-fidelity client-side Web Storage for static hosting (GitHub Pages)
 */

function aetherApiBase() {
  return window.Aether_API_BASE || '/api';
}

function aetherFetch(path, options) {
  // If hosted on GitHub Pages and no explicit custom backend is set, fail-fast to local storage
  if (window.location.hostname.endsWith('github.io') && !window.Aether_API_BASE) {
    return Promise.reject(new Error('Static hosting fallback'));
  }
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

/* ---------- Local Web Storage Engine (GitHub Pages Fallback) ---------- */

function aetherLocalGetCart() {
  try {
    const raw = localStorage.getItem('aether_cart');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { items: [], promo: null };
}

function aetherLocalSaveCart(cart) {
  try {
    localStorage.setItem('aether_cart', JSON.stringify(cart));
  } catch (e) {}
}

function aetherLocalGetOrders() {
  try {
    const raw = localStorage.getItem('aether_orders');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

function aetherLocalSaveOrder(order) {
  try {
    const orders = aetherLocalGetOrders();
    orders.unshift(order);
    localStorage.setItem('aether_orders', JSON.stringify(orders));
  } catch (e) {}
}

function aetherComputeLocalTotals(cart) {
  const items = cart.items || [];
  let subtotal = 0;
  let count = 0;
  items.forEach(function (i) {
    const p = (window.Aether.PRODUCTS || []).find(function (prod) { return prod.id === i.id; });
    if (p) {
      subtotal += p.price * (parseInt(i.qty, 10) || 0);
      count += parseInt(i.qty, 10) || 0;
    }
  });

  let discount = 0;
  let freeship = false;
  if (cart.promo) {
    const code = typeof cart.promo === 'string' ? cart.promo : cart.promo.code;
    const pObj = (window.Aether.PROMOS || {})[code];
    if (pObj) {
      if (pObj.type === 'percent') {
        discount = subtotal * (pObj.value / 100);
      } else if (pObj.type === 'freeship') {
        freeship = true;
      }
    }
  }

  const shipping = (subtotal > 0 && !freeship && subtotal < 150) ? 15.0 : 0.0;
  const taxable = Math.max(0, subtotal - discount);
  const tax = Math.round(taxable * 0.0825 * 100) / 100;
  const total = Math.max(0, taxable + shipping + tax);

  return {
    itemCount: count,
    subtotal: subtotal,
    discount: discount,
    shipping: shipping,
    tax: tax,
    total: total
  };
}

window.Aether = window.Aether || {};
window.Aether.Store = window.Aether.Store || {};

window.Aether.Store.cart = aetherLocalGetCart();

window.Aether.Store.load = function () {
  return aetherFetch('/cart').then(function (r) {
    window.Aether.Store.cart = { items: r.data.items || [], promo: r.data.promo || null };
    aetherLocalSaveCart(window.Aether.Store.cart);
    return window.Aether.Store.cart;
  }).catch(function () {
    window.Aether.Store.cart = aetherLocalGetCart();
    return window.Aether.Store.cart;
  });
};

window.Aether.Store.getCart = function () {
  return window.Aether.Store.cart || aetherLocalGetCart();
};

window.Aether.Store.addToCart = function (id, qty) {
  const body = { id: String(id), qty: parseInt(qty, 10) || 1 };
  return aetherFetch('/cart/items', { method: 'POST', body: JSON.stringify(body) }).then(function (r) {
    window.Aether.Store.cart = r.data;
    aetherLocalSaveCart(window.Aether.Store.cart);
    return window.Aether.PRODUCTS.find(function (p) { return p.id === id; }) || null;
  }).catch(function () {
    const cart = aetherLocalGetCart();
    const existing = cart.items.find(function (i) { return i.id === id; });
    if (existing) {
      existing.qty = (parseInt(existing.qty, 10) || 0) + (parseInt(qty, 10) || 1);
    } else {
      cart.items.push({ id: String(id), qty: parseInt(qty, 10) || 1 });
    }
    window.Aether.Store.cart = cart;
    aetherLocalSaveCart(cart);
    return window.Aether.PRODUCTS.find(function (p) { return p.id === id; }) || null;
  });
};

window.Aether.Store.removeFromCart = function (id) {
  const body = { id: String(id) };
  return aetherFetch('/cart/remove', { method: 'POST', body: JSON.stringify(body) }).then(function (r) {
    window.Aether.Store.cart = r.data;
    aetherLocalSaveCart(window.Aether.Store.cart);
    return window.Aether.Store.cart;
  }).catch(function () {
    const cart = aetherLocalGetCart();
    cart.items = cart.items.filter(function (i) { return i.id !== id; });
    window.Aether.Store.cart = cart;
    aetherLocalSaveCart(cart);
    return window.Aether.Store.cart;
  });
};

window.Aether.Store.setCartQty = function (id, qty) {
  const q = parseInt(qty, 10) || 0;
  if (q <= 0) return window.Aether.Store.removeFromCart(id);
  const body = { id: String(id), qty: q };
  return aetherFetch('/cart/qty', { method: 'POST', body: JSON.stringify(body) }).then(function (r) {
    window.Aether.Store.cart = r.data;
    aetherLocalSaveCart(window.Aether.Store.cart);
    return window.Aether.Store.cart;
  }).catch(function () {
    const cart = aetherLocalGetCart();
    const item = cart.items.find(function (i) { return i.id === id; });
    if (item) item.qty = q;
    window.Aether.Store.cart = cart;
    aetherLocalSaveCart(cart);
    return window.Aether.Store.cart;
  });
};

window.Aether.Store.clearCart = function () {
  return aetherFetch('/cart', { method: 'DELETE' }).then(function (r) {
    window.Aether.Store.cart = r.data;
    aetherLocalSaveCart(window.Aether.Store.cart);
    return window.Aether.Store.cart;
  }).catch(function () {
    const cart = { items: [], promo: null };
    window.Aether.Store.cart = cart;
    aetherLocalSaveCart(cart);
    return window.Aether.Store.cart;
  });
};

window.Aether.Store.applyPromo = function (code) {
  const c = String(code || '').trim();
  const body = { code: c };
  return aetherFetch('/cart/promo', { method: 'POST', body: JSON.stringify(body) }).then(function (r) {
    const promo = r.data && r.data.cart ? (r.data.cart.promo || null) : (r.data && r.data.promo) || null;
    window.Aether.Store.cart = { items: (r.data && r.data.cart && r.data.cart.items) || [], promo: promo };
    aetherLocalSaveCart(window.Aether.Store.cart);
    return { ok: !!(r.data && r.data.cart && r.data.cart.promo), message: 'Promo applied.' };
  }).catch(function () {
    const promoDef = (window.Aether.PROMOS || {})[c];
    if (promoDef) {
      const cart = aetherLocalGetCart();
      cart.promo = promoDef;
      window.Aether.Store.cart = cart;
      aetherLocalSaveCart(cart);
      return { ok: true, message: 'Promo applied.' };
    }
    return { ok: false, message: 'Invalid promo code.' };
  });
};

window.Aether.Store.clearPromo = function () {
  return aetherFetch('/cart/promo', { method: 'POST', body: JSON.stringify({ code: '' }) }).then(function (r) {
    const cartData = (r.data && r.data.cart) || r.data || {};
    window.Aether.Store.cart = { items: cartData.items || [], promo: cartData.promo || null };
    aetherLocalSaveCart(window.Aether.Store.cart);
    return { ok: true, message: 'Promo removed.' };
  }).catch(function () {
    const cart = aetherLocalGetCart();
    cart.promo = null;
    window.Aether.Store.cart = cart;
    aetherLocalSaveCart(cart);
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
  return aetherFetch('/cart/totals').then(function (r) {
    return r.data;
  }).catch(function () {
    return aetherComputeLocalTotals(window.Aether.Store.getCart());
  });
};

window.Aether.Store.placeOrder = function (order) {
  return aetherFetch('/orders', { method: 'POST', body: JSON.stringify(order) }).then(function (r) {
    window.Aether.Store.clearCart();
    return r.data;
  }).catch(function () {
    const orderId = 'ORD-' + Date.now().toString(16).toUpperCase();
    const created = new Date().toISOString();
    const totals = aetherComputeLocalTotals(window.Aether.Store.getCart());
    const finalOrder = Object.assign({
      id: orderId,
      createdAt: created,
      items: order.items || [],
      subtotal: totals.subtotal,
      discount: totals.discount,
      shipping: totals.shipping,
      tax: totals.tax,
      total: totals.total,
      shippingAddress: order.shipping,
      payment: order.payment
    });
    aetherLocalSaveOrder(finalOrder);
    window.Aether.Store.clearCart();
    return finalOrder;
  });
};

window.Aether.Store.getOrders = function () {
  return aetherFetch('/orders').then(function (r) {
    return r.data;
  }).catch(function () {
    return aetherLocalGetOrders();
  });
};

window.Aether.Store.getOrder = function (id) {
  return aetherFetch('/orders/' + encodeURIComponent(String(id))).then(function (r) {
    if (!r.data) throw new Error('Order not found.');
    return r.data;
  }).catch(function () {
    const orders = aetherLocalGetOrders();
    const match = orders.find(function (o) { return o.id === id; });
    if (!match) throw new Error('Order not found.');
    return match;
  });
};

window.Aether.Store.chargeCard = function (cardNumber) {
  const digits = String(cardNumber || '').replace(/\D/g, '');
  return aetherFetch('/payment/charge', { method: 'POST', body: JSON.stringify({ cardNumber: digits }) }).then(function (r) {
    return r.data;
  }).catch(function () {
    const approved = aetherLuhnCheck(digits) && digits !== '4000000000000002';
    const brand = aetherDetectBrand(digits);
    const last4 = digits.slice(-4) || '0000';
    return {
      approved: approved,
      brand: brand,
      last4: last4,
      message: approved ? 'Approved' : (digits === '4000000000000002' ? 'Card declined.' : 'Invalid card number.')
    };
  });
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
