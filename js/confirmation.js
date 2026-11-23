/**
 * Aether Storefront — Order Confirmation Page
 */

function aetherRenderConfirmation(order) {
  const container = document.getElementById('site-content');
  if (!order) {
    container.innerHTML = `
      <div class="page-header"><span class="terminal-badge">Aether GOODS // ORDER</span><h1 class="page-title">Order Not Found</h1></div>
      <div class="content-block"><div class="empty-state"><div class="empty-icon">🧾</div><h3>Order could not be located</h3><p>The order reference could not be matched to a stored order.</p><a class="btn btn-primary" href="products.html">Return to the Collection</a></div></div>`;
    return;
  }
  const itemsHTML = (order.items || []).map(function (i) {
    const name = i.name || i.id;
    const p = (window.Aether.PRODUCTS || []).find(function (p) { return p.id === i.id; });
    const thumb = p && p.image
      ? `<img src="${p.image}" alt="${name}" class="order-item-thumb" />`
      : `<span class="order-item-emoji">${p ? p.emoji : '📦'}</span>`;
    return `<div class="order-item-row"><span class="order-item-info">${thumb}<span>${name} &times; ${i.qty}</span></span><span>${aetherFormatPrice(i.price * i.qty)}</span></div>`;
  }).join('');
  const addr = order.shippingAddress;
  const pay = order.payment;

  container.innerHTML = `
    <div class="page-header"><span class="terminal-badge">Aether GOODS // ORDER CONFIRMATION</span><h1 class="page-title">Order Confirmed</h1></div>
    <div class="container">
      <div class="success-wrap">
        <div class="success-panel">
          <div class="success-icon">&#10003;</div>
          <h2 style="font-size:20px;font-weight:800;margin-bottom:8px;">Thank You — Order Placed</h2>
          <p style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;">Your aether instruments are being prepared for dispatch.</p>
          <div class="order-id-line">ORDER ID: ${order.id}</div>
          <div class="summary-row"><span>Placed At</span><span>${order.createdAt || ''}</span></div>
          <div class="summary-row"><span>Items</span><span>${(order.items || []).reduce(function (a, i) { return a + (parseInt(i.qty, 10) || 0); }, 0)}</span></div>
          <div class="summary-row"><span>Subtotal</span><span>${aetherFormatPrice(order.subtotal)}</span></div>
          <div class="summary-row"><span>Total Charged</span><span>${aetherFormatPrice(order.total)}</span></div>
          <div class="summary-row" style="margin-top:8px;"><span>Payment</span><span>${pay ? (pay.brand || 'Card') + ' •••• ' + (pay.last4 || '') : '—'}</span></div>
          <div style="margin-top:18px;"><div class="summary-title">Items</div>${itemsHTML}</div>
          ${addr ? `<div style="margin-top:18px;"><div class="summary-title">Shipping To</div><div style="font-size:13px;color:var(--text-secondary);line-height:1.7;">${addr.fullName}<br/>${addr.address}<br/>${addr.city}, ${addr.state} ${addr.zip}<br/>${addr.country}<br/>${addr.email}</div></div>` : ''}
          <div style="display:flex;gap:12px;margin-top:24px;flex-wrap:wrap;">
            <a class="btn btn-primary" href="products.html">Continue Shopping</a>
            <a class="btn btn-outline" href="index.html">Back to Overview</a>
          </div>
        </div>
      </div>
    </div>`;
}

function aetherInitConfirmation() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('order');
  const container = document.getElementById('site-content');
  if (!orderId) {
    aetherRenderConfirmation(null);
    return;
  }
  window.Aether.Store.getOrder(orderId).then(function (order) {
    aetherRenderConfirmation(order);
  }).catch(function () {
    aetherRenderConfirmation(null);
  });
}

window.aetherInitConfirmation = aetherInitConfirmation;
window.aetherRenderConfirmation = aetherRenderConfirmation;
