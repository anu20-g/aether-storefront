# Aether Storefront — Aether Goods

Official e-commerce storefront for Aether Goods. Built on the storefront's high-contrast "scientific terminal" design language.

**Live Deployment**: [https://anu20-g.github.io/aether-storefront/](https://anu20-g.github.io/aether-storefront/)

## Pages

- `index.html` — Storefront overview, featured instruments, core principles, collection families, newsletter
- `products.html` — Catalog with category filters and sorting
- `product.html?id=<sku>` — Product dossier (qty, add to bag, buy now, related)
- `cart.html` — Cart management (quantity controls, remove, promo codes, totals)
- `checkout.html` — Checkout (shipping form + simulated payment authorization)
- `confirmation.html?order=<id>` — Order confirmation

## Legal

- `privacy.html`, `terms.html`, `returns.html`, `shipping.html` — governance pages

## Architecture

Frontend: static HTML/CSS/vanilla JS (no framework).

Backend (Rust / Axum): `backend/`

- Serves static storefront from `../ecommerce`
- REST API under `/api`

### API

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness |
| GET | `/api/products` | Catalog |
| GET | `/api/cart` | Get cart |
| POST | `/api/cart/items` | Add item `{id, qty}` |
| POST | `/api/cart/qty` | Set qty `{id, qty}` (qty<=0 removes) |
| POST | `/api/cart/remove` | Remove `{id}` |
| POST / DELETE | `/api/cart/promo` | Apply/clear promo `{code}` |
| GET | `/api/cart/totals` | Totals (subtotal, discount, shipping, tax, total) |
| DELETE | `/api/cart` | Clear cart |
| POST | `/api/orders` | Place order |
| GET | `/api/orders` | List orders |
| GET | `/api/orders/{id}` | Get order |
| POST | `/api/payment/charge` | Simulated charge `{cardNumber}` |

## Simulated Payment

- Luhn-validated card numbers; brand detection (Visa / Mastercard / Amex / Discover).
- Test approval: `4242 4242 4242 4242` — any future expiry, any CVV.
- Test decline: `4000 0000 0000 0002`.

No real payment rail is engaged.

## Run

Backend:

```bash
cd ecommerce/backend
cargo run
```

Serves on `http://localhost:8080`.

Frontend is served from `ecommerce/` by the Rust server.

## Data

Cart and orders persist to `ecommerce/data/store.json` (runtime state).
