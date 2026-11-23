/**
 * Aether Storefront — Shared UI: Header / Footer Injection, Cart Badge, Toasts
 */

function aetherEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function aetherBuildHeaderHTML() {
  const nav = [
    { href: 'index.html', label: 'Overview', key: 'index.html' },
    { href: 'products.html', label: 'Shop', key: 'products.html' },
  ];
  const navLinks = nav
    .map((n) => `<a href="${n.href}" data-nav="${n.key}">${n.label}</a>`)
    .join('');
  const legal = [
    { href: 'privacy.html', label: 'Privacy Policy' },
    { href: 'terms.html', label: 'Terms of Service' },
    { href: 'returns.html', label: 'Return Policy' },
    { href: 'shipping.html', label: 'Shipping & Delivery' },
  ];
  const legalLinks = legal.map((l) => `<a href="${l.href}">${l.label}</a>`).join('');

  return `
    <header class="top-nav">
      <div class="nav-inner">
        <div class="brand-group">
          <a href="index.html" class="brand-link">
            <span class="brand-mark">Aether</span>
          </a>
          <div class="brand-meta">
            <span class="brand-title">Aether Storefront</span>
            <span class="brand-sub">Aether Goods &bull; Aether</span>
          </div>
        </div>
        <nav class="nav-links" id="nav-links">
          ${navLinks}
        </nav>
        <div class="nav-actions">
          <a href="cart.html" class="cart-btn" id="nav-cart-link" aria-label="Open shopping cart">
            <span class="cart-icon">🛒</span>
            <span class="cart-label">Cart</span>
            <span class="cart-count" id="cart-count">0</span>
          </a>
          <button type="button" class="nav-toggle" id="nav-toggle" aria-label="Toggle navigation menu" aria-expanded="false" aria-controls="nav-links">&#9776;</button>
        </div>
      </div>
    </header>
  `;
}

function aetherBuildFooterHTML() {
  const shopLinks = [
    { href: 'index.html', label: 'Overview' },
    { href: 'products.html', label: 'All Products' },
    { href: 'cart.html', label: 'Cart' },
    { href: 'checkout.html', label: 'Checkout' },
  ];
  const legalLinks = [
    { href: 'privacy.html', label: 'Privacy Policy' },
    { href: 'terms.html', label: 'Terms of Service' },
    { href: 'returns.html', label: 'Return Policy' },
    { href: 'shipping.html', label: 'Shipping & Delivery' },
  ];
  const shopHtml = shopLinks.map((l) => `<a href="${l.href}">${l.label}</a>`).join('');
  const legalHtml = legalLinks.map((l) => `<a href="${l.href}">${l.label}</a>`).join('');

  return `
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-col">
          <div class="footer-brand">Aether Goods</div>
          <div class="footer-text">Official Merchandise &amp; Aether Goods &bull; Reg: UDYAM-JH-0010572 &bull; NIC: 72100</div>
        </div>
        <div class="footer-col right">
          <div class="footer-links">${shopLinks.map((l) => `<a href="${l.href}">${l.label}</a>`).join('')}</div>
          <div class="footer-links">${legalLinks.map((l) => `<a href="${l.href}">${l.label}</a>`).join('')}</div>
          <div class="copyright">&copy; 2026 Aether Goods. All rights reserved.</div>
        </div>
      </div>
    </footer>
  `;
}

function aetherRenderHeader() {
  const headerEl = document.getElementById('site-header');
  if (headerEl) headerEl.innerHTML = aetherBuildHeaderHTML();
}

function aetherRenderFooter() {
  const footerEl = document.getElementById('site-footer');
  if (footerEl) footerEl.innerHTML = aetherBuildFooterHTML();
}

function aetherUpdateCartBadge() {
  const countEl = document.getElementById('cart-count');
  const cartLink = document.getElementById('nav-cart-link');
  let count = 0;
  try {
    const store = window.Aether.Store;
    if (store && store.getCart) count = store.getCart().items.reduce((a, i) => a + (parseInt(i.qty, 10) || 0), 0);
  } catch (e) { /* ignore */ }
  if (countEl) {
    countEl.textContent = String(count);
    countEl.classList.remove('bump');
    void countEl.offsetWidth;
    countEl.classList.add('bump');
  }
}

function aetherInitToast() {
  const container = document.getElementById('toast-container');
  if (!container) {
    const c = document.createElement('div');
    c.className = 'toast-container';
    c.id = 'toast-container';
    document.body.appendChild(c);
  }
}

function aetherToast(message) {
  const container = document.getElementById('toast-container') || document.body.appendChild((function () { const c = document.createElement('div'); c.className='toast-container'; c.id='toast-container'; document.body.appendChild(c); return c; })());
  const toastEl = document.createElement('div');
  toastEl.className = 'toast';
  toastEl.textContent = message;
  container.appendChild(toastEl);
  window.setTimeout(() => {
    toastEl.style.opacity = '0';
    toastEl.style.transition = 'opacity 0.25s ease';
    window.setTimeout(() => toastEl.remove(), 250);
  }, 2200);
}

function aetherInitNewsletter() {
  const form = document.getElementById('newsletter-form');
  if (!form) return;
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    const input = document.getElementById('newsletter-email');
    const email = input ? input.value.trim() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      window.aetherToast('Enter a valid email address.');
      return;
    }
    window.aetherToast('Subscribed: launch notices incoming.');
    form.reset();
  });
}

function aetherInitReveal() {
  const els = document.querySelectorAll('.reveal:not(.aether-in)');
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) {
    els.forEach(function (el) { el.classList.add('aether-in'); });
    return;
  }
  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('aether-in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  els.forEach(function (el) { io.observe(el); });
}

function aetherInitUI() {
  aetherRenderHeader();
  aetherRenderFooter();
  aetherInitToast();
  aetherUpdateCartBadge();
  aetherInitReveal();
  document.addEventListener('click', function (ev) {
    const addBtn = ev.target && ev.target.closest ? ev.target.closest('.add-to-cart') : null;
    if (addBtn) {
      const id = addBtn.getAttribute('data-id');
      if (!id) return;
      ev.preventDefault();
      ev.stopPropagation();
      const qty = parseInt(addBtn.getAttribute('data-qty'), 10) || 1;
      window.Aether.Store.addToCart(id, qty).then(function (product) {
        window.aetherToast((product ? product.name : 'Item') + ' added to cart.');
        window.aetherUpdateCartBadge();
      }).catch(function (err) {
        window.aetherToast('Could not add item to cart.');
      });
      return;
    }
    const navToggle = ev.target && ev.target.closest ? ev.target.closest('#nav-toggle') : null;
    if (navToggle) {
      const navEl = document.getElementById('nav-links');
      const wasOpen = navEl ? navEl.classList.contains('open') : false;
      if (navEl) navEl.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', wasOpen ? 'false' : 'true');
      return;
    }
    const link = ev.target && ev.target.closest ? ev.target.closest('a') : null;
    if (link) {
      const href = link.getAttribute('href') || '';
      const match = document.querySelector('.nav-links a[href="' + href + '"]');
      const navEl = document.querySelector('.nav-links');
      if (navEl) navEl.classList.remove('open');
      document.querySelectorAll('.nav-links a').forEach(function (a) { a.classList.remove('active'); });
      if (match) match.classList.add('active');
    }
  });
}

window.aetherRenderHeader = aetherRenderHeader;
window.aetherRenderFooter = aetherRenderFooter;
window.aetherUpdateCartBadge = aetherUpdateCartBadge;
window.aetherToast = aetherToast;
window.aetherInitUI = aetherInitUI;
window.aetherInitReveal = aetherInitReveal;
window.aetherInitNewsletter = aetherInitNewsletter;
window.aetherEl = aetherEl;
