/**
 * Aether Storefront — Checkout + Order Confirmation
 */

function aetherRenderOrderSummary(container, cart, totals) {
  if (!cart.items || !cart.items.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🧾</div><h3>Nothing to check out</h3><p>Your cart is empty.</p><a class="btn btn-primary" href="products.html">Browse the Collection</a></div>`;
    return;
  }
  const itemsHTML = cart.items.map(function (i) {
    const p = (window.Aether.PRODUCTS || []).find(function (p) { return p.id === i.id; });
    const lineTotal = p ? p.price * (parseInt(i.qty, 10) || 0) : 0;
    const name = p ? p.name : i.id;
    const thumb = p && p.image
      ? `<img src="${p.image}" alt="${name}" class="order-item-thumb" />`
      : `<span class="order-item-emoji">${p ? p.emoji : '📦'}</span>`;
    return `
      <div class="order-item-row">
        <span class="order-item-info">${thumb}<span>${name} &times; ${parseInt(i.qty, 10) || 0}</span></span>
        <span>${aetherFormatPrice(lineTotal)}</span>
      </div>`;
  }).join('');
  const discountRow = totals.discount > 0 ? `<div class="summary-row discount">Promo discount</div>` : '';
  container.innerHTML = `
    <div class="summary-card">
      <div class="summary-title">Order Summary</div>
      <div class="order-items-mini">${itemsHTML}</div>
      <div class="summary-row"><span>Subtotal</span><span>${aetherFormatPrice(totals.subtotal)}</span></div>
      ${discountRow}
      <div class="summary-row"><span>Shipping</span><span>${totals.shipping > 0 ? aetherFormatPrice(totals.shipping) : 'FREE'}</span></div>
      <div class="summary-row"><span>Estimated Tax</span><span>${aetherFormatPrice(totals.tax)}</span></div>
      <div class="summary-row total"><span>Total</span><span>${aetherFormatPrice(totals.total)}</span></div>
      <div class="summary-note">Payment method: <span id="summary-payment">—</span></div>
    </div>`;
}

function aetherInitCheckout() {
  const container = document.getElementById('checkout-content');
  if (!container) return Promise.resolve();

  return window.Aether.Store.load().then(function (cart) {
    if (!cart.items || !cart.items.length) {
      aetherRenderOrderSummary(container, cart, { subtotal: 0, discount: 0, shipping: 0, tax: 0, total: 0 });
      return null;
    }
    return window.Aether.Store.getTotals().then(function (totals) {
      aetherRenderOrderSummary(container, cart, totals);
      return totals;
    });
  }).then(function (totals) {
    const summaryPayment = document.getElementById('summary-payment');
    if (summaryPayment) summaryPayment.textContent = 'Aether Card';
    return totals;
  });
}

function aetherValidateShipping(address) {
  const errors = {};
  if (!address.fullName || address.fullName.trim().length < 2) errors.fullName = 'Full name is required.';
  const emailRes = window.Aether.Store.validateEmail(address.email);
  if (!emailRes.ok) errors.email = emailRes.message;
  if (!address.address || address.address.trim().length < 5) errors.address = 'Street address is required.';
  if (!address.city || address.city.trim().length < 2) errors.city = 'City is required.';
  if (!address.state || address.state.trim().length < 2) errors.state = 'State is required.';
  if (!address.zip || address.zip.trim().length < 3) errors.zip = 'ZIP / postal code is required.';
  if (!address.country || address.country.trim().length < 2) errors.country = 'Country is required.';
  return { ok: Object.keys(errors).length === 0, errors: errors };
}

function aetherValidatePayment(payment) {
  const errors = {};
  if (!payment.cardName || payment.cardName.trim().length < 2) errors.cardName = 'Name on card is required.';
  const digits = String(payment.cardNumber || '').replace(/\D/g, '');
  const luhn = window.Aether.Store.luhnCheck(digits);
  if (digits.length < 13 || digits.length > 19) errors.cardNumber = 'Card number must be 13-19 digits.';
  else if (!luhn) errors.cardNumber = 'Card number failed validation.';
  const exp = window.Aether.Store.validateExpiry(payment.expiry);
  if (!exp.ok) errors.expiry = exp.message;
  const cvv = window.Aether.Store.validateCvv(payment.cvv);
  if (!cvv.ok) errors.cvv = cvv.message;
  return { ok: Object.keys(errors).length === 0, errors: errors };
}

function aetherCollectShipping() {
  const data = {};
  ['fullName', 'email', 'address', 'city', 'state', 'zip', 'country'].forEach(function (k) {
    const el = document.getElementById('ship-' + k);
    data[k] = el ? (el.value || '').trim() : '';
  });
  return data;
}

function aetherCollectPayment() {
  const data = {};
  ['cardName', 'cardNumber', 'expiry', 'cvv'].forEach(function (k) {
    const el = document.getElementById('pay-' + k);
    data[k] = el ? (el.value || '').trim() : '';
  });
  return data;
}

function aetherPlaceOrderFromCheckout(totals) {
  const shipping = aetherCollectShipping();
  const payment = aetherCollectPayment();
  const cart = window.Aether.Store.getCart();
  const items = (cart.items || []).map(function (i) {
    const p = (window.Aether.PRODUCTS || []).find(function (p) { return p.id === i.id; });
    return { id: i.id, qty: parseInt(i.qty, 10) || 1, price: p ? p.price : 0, name: p ? p.name : i.id };
  });
  const order = {
    items: items,
    promo: cart.promo ? cart.promo.code : null,
    shipping: shipping,
    payment: {
      brand: window.Aether.Store.detectBrand(payment.cardNumber),
      last4: String(payment.cardNumber || '').replace(/\D/g, '').slice(-4),
      approved: true,
    },
  };
  return window.Aether.Store.placeOrder(order).then(function (created) { return created; });
}

function aetherInitCheckoutPage() {
  const content = document.getElementById('checkout-content');
  if (!content) return Promise.resolve();

  const payForm = document.getElementById('pay-form');
  const payButton = document.getElementById('pay-button');
  const alertBox = document.getElementById('checkout-alert');
  const processingBox = document.getElementById('processing-box');

  function showAlert(type, title, message) {
    if (!alertBox) return;
    alertBox.className = 'alert ' + (type === 'error' ? 'alert-error' : type === 'success' ? 'alert-success' : 'alert-info');
    alertBox.style.display = 'block';
    alertBox.innerHTML = '<div class="alert-title">' + (title || '') + '</div><div>' + message + '</div>';
  }

  function setProcessing(on) {
    if (processingBox) processingBox.style.display = on ? 'flex' : 'none';
    if (payButton) {
      payButton.disabled = !!on;
      payButton.innerHTML = on ? '<span class="spinner"></span> Processing' : 'Pay Now';
    }
  }

  function clearErrors() {
    ['fullName', 'email', 'address', 'city', 'state', 'zip', 'country', 'cardName', 'cardNumber', 'expiry', 'cvv'].forEach(function (k) {
      const el = document.getElementById('ship-' + k) || document.getElementById('pay-' + k);
      if (el) el.classList.remove('input-error');
    });
    ['fullName', 'email', 'address', 'city', 'state', 'zip', 'country', 'cardName', 'cardNumber', 'expiry', 'cvv'].forEach(function (k) {
      const el = document.getElementById('ship-' + k) || document.getElementById('pay-' + k);
      const err = document.getElementById('err-' + k);
      if (err) err.style.display = 'none';
    });
  }

  function showFieldError(key, message) {
    const el = document.getElementById('ship-' + key) || document.getElementById('pay-' + key);
    if (el) el.classList.add('input-error');
    const err = document.getElementById('err-' + key);
    if (err) { err.textContent = message; err.style.display = 'block'; }
  }

  if (payForm) {
    payForm.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (payButton && payButton.disabled) return;
      clearErrors();
      if (alertBox) alertBox.style.display = 'none';

      const shipping = aetherCollectShipping();
      const payment = aetherCollectPayment();
      const shipRes = aetherValidateShipping(shipping);
      if (!shipRes.ok) {
        Object.keys(shipRes.errors).forEach(function (k) { showFieldError(k, shipRes.errors[k]); });
        showAlert('error', 'Shipping Information Incomplete', 'Please complete all shipping fields before processing payment.');
        return;
      }
      const payRes = aetherValidatePayment(payment);
      if (!payRes.ok) {
        Object.keys(payRes.errors).forEach(function (k) { showFieldError(k, payRes.errors[k]); });
        showAlert('error', 'Payment Information Invalid', 'Please review the card details and try again.');
        return;
      }

      setProcessing(true);
      window.Aether.Store.chargeCard(payment.cardNumber).then(function (charge) {
        if (!charge.approved) {
          setProcessing(false);
          showAlert('error', 'Payment Declined', charge.message + ' Use test card 4000 0000 0000 0002 to simulate a decline, or 4242 4242 4242 4242 to approve.');
          return;
        }
        return aetherPlaceOrderFromCheckout().then(function (order) {
          setProcessing(false);
          showAlert('success', 'Order Confirmed', 'Order ' + order.id + ' placed successfully.');
          window.setTimeout(function () { window.location.href = 'confirmation.html?order=' + encodeURIComponent(order.id); }, 1400);
        });
      }).catch(function (err) {
        setProcessing(false);
        showAlert('error', 'Payment Gateway Error', err.message || 'Payment processing failed. Please try again.');
      });
    });
  }

  return window.Aether.Store.load().then(function (cart) {
    if (!cart.items || !cart.items.length) {
      aetherRenderOrderSummary(content, cart, { subtotal: 0, discount: 0, shipping: 0, tax: 0, total: 0 });
      return null;
    }
    return window.Aether.Store.getTotals().then(function (totals) {
      aetherRenderOrderSummary(content, cart, totals);
      const paySummary = document.getElementById('summary-payment');
      if (paySummary) paySummary.textContent = 'Aether Card';
      return totals;
    });
  });
}

window.aetherInitCheckoutPage = aetherInitCheckoutPage;
window.aetherValidateShipping = aetherValidateShipping;
window.aetherValidatePayment = aetherValidatePayment;
window.aetherPlaceOrderFromCheckout = aetherPlaceOrderFromCheckout;
window.aetherInitCheckout = aetherInitCheckout;
window.aetherRenderOrderSummary = aetherRenderOrderSummary;
