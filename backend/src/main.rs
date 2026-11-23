/**
 * Aether Storefront — Aether Goods API
 *
 * Rust (Axum) serving layer for the Aether e-commerce storefront.
 * - Serves the static frontend from ../ecommerce
 * - REST API: /api/health, /api/products, /api/cart*, /api/orders, /api/payment/charge
 * - Pseudo payment: Luhn-validated card numbers, test decline card 4000000000000002
 */

use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tower_http::services::ServeDir;

/* ---------------- Types ---------------- */

#[derive(Clone, Serialize, Deserialize, Default)]
pub struct Cart {
    #[serde(default)]
    pub items: Vec<CartItem>,
    #[serde(default)]
    pub promo: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct CartItem {
    pub id: String,
    pub qty: i64,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct OrderLine {
    pub id: String,
    pub qty: i64,
    pub price: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShippingAddress {
    pub full_name: String,
    pub email: String,
    pub address: String,
    pub city: String,
    pub state: String,
    pub zip: String,
    pub country: String,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct PaymentInfo {
    pub brand: String,
    pub last4: String,
    pub approved: bool,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct Order {
    pub id: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    pub items: Vec<OrderLine>,
    pub subtotal: f64,
    pub discount: f64,
    pub shipping: f64,
    pub tax: f64,
    pub total: f64,
    #[serde(rename = "shippingAddress")]
    pub shipping_address: Option<ShippingAddress>,
    pub payment: Option<PaymentInfo>,
}

#[derive(Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
}

#[derive(Deserialize)]
pub struct AddItemRequest {
    pub id: String,
    pub qty: i64,
}

#[derive(Deserialize)]
pub struct QtyUpdateRequest {
    pub id: String,
    pub qty: i64,
}

#[derive(Deserialize)]
pub struct RemoveItemRequest {
    pub id: String,
}

#[derive(Deserialize)]
pub struct PromoRequest {
    pub code: String,
}

#[derive(Deserialize)]
pub struct ChargeRequest {
    #[serde(rename = "cardNumber")]
    pub card_number: String,
}

#[derive(Serialize, Deserialize)]
pub struct ChargeResponse {
    pub approved: bool,
    pub brand: String,
    pub last4: String,
    pub message: String,
}

#[derive(Serialize, Deserialize)]
pub struct CartWithMeta {
    pub cart: Cart,
    pub totals: Totals,
}

#[derive(Serialize, Deserialize, Default)]
pub struct Totals {
    #[serde(rename = "itemCount")]
    pub item_count: i64,
    pub subtotal: f64,
    pub discount: f64,
    pub shipping: f64,
    pub tax: f64,
    pub total: f64,
}

#[derive(Deserialize)]
pub struct CreateOrderRequest {
    pub items: Vec<OrderLine>,
    pub promo: Option<String>,
    pub shipping: Option<ShippingAddress>,
    pub payment: Option<PaymentInfo>,
}

/* ---------------- App state ---------------- */

#[derive(Clone, Default)]
pub struct AppState {
    pub cart: Arc<Mutex<Cart>>,
    pub orders: Arc<Mutex<Vec<Order>>>,
}

/* ---------------- Catalog ---------------- */

#[derive(Clone, Serialize)]
pub struct Product {
    pub id: String,
    pub name: String,
    pub sku: String,
    pub category: String,
    pub price: f64,
    #[serde(rename = "oldPrice")]
    pub old_price: Option<f64>,
    #[serde(rename = "rating")]
    pub rating: f64,
    pub reviews: i64,
    #[serde(rename = "inStock")]
    pub in_stock: bool,
    pub image: String,
    pub emoji: String,
    pub gradient: String,
    pub tagline: String,
    pub description: String,
    pub features: Vec<String>,
}

fn product(
    id: &str,
    name: &str,
    sku: &str,
    category: &str,
    price: f64,
    old_price: Option<f64>,
    rating: f64,
    reviews: i64,
    in_stock: bool,
    image: &str,
    emoji: &str,
    gradient: &str,
    tagline: &str,
    description: &str,
    features: &[&str],
) -> Product {
    Product {
        id: id.to_string(),
        name: name.to_string(),
        sku: sku.to_string(),
        category: category.to_string(),
        price,
        old_price,
        rating,
        reviews,
        in_stock,
        image: image.to_string(),
        emoji: emoji.to_string(),
        gradient: gradient.to_string(),
        tagline: tagline.to_string(),
        description: description.to_string(),
        features: features.iter().map(|s| (*s).to_string()).collect(),
    }
}

fn all_products() -> Vec<Product> {
    vec![
    product(
        "sov-ultrahd-01",
        "Aether UltraHeadset",
        "Aether-AUD-001",
        "Audio",
        249.0,
        Some(299.0),
        4.8,
        187,
        true,
        "images/products/sov-ultrahd-01.svg",
        "🎧",
        "linear-gradient(135deg, #0d47a1 0%, #0a0f1e 100%)",
        "Closed-back studio reference headset with graphene drivers.",
        "The Aether UltraHeadset pairs custom graphene-driver transducers with adaptive closed-back acoustic sealing. Engineered for low-latency monitoring, long-haul sessions, and mission-critical audio work.",
        &[
            "40mm graphene driver architecture",
            "Adaptive ANC with transparency pass-through",
            "40-hour battery life, USB-C fast charge",
            "3.5mm wired and 2.4GHz low-latency wireless modes",
        ],
    ),
    product(
        "trm-pulsewatch-02",
        "Pulse Sentinel Watch",
        "Aether-WRD-002",
        "Wearables",
        329.0,
        Some(389.0),
        4.7,
        142,
        true,
        "images/products/trm-pulsewatch-02.svg",
        "⌚",
        "linear-gradient(135deg, #1b5e20 0%, #0a0f1e 100%)",
        "Rugged field telemetry watch with aether biometric sensors.",
        "The Pulse Sentinel Watch fuses Aether-grade biometric sensing with a thermally hardened field chassis.",
        &[
            "Dual-band GNSS + barometric telemetry",
            "Heart-rate, SpO2, and skin-temperature sensing",
            "MIL-STD-810H shock and thermal tolerance",
            "90-day battery life, sapphire lens",
        ],
    ),
    product(
        "trm-forgekbd-03",
        "Forge Mech Keyboard",
        "Aether-CPT-003",
        "Computing",
        159.0,
        Some(189.0),
        4.9,
        231,
        true,
        "images/products/trm-forgekbd-03.svg",
        "⌨️",
        "linear-gradient(135deg, #3a3a3a 0%, #111111 100%)",
        "Hot-swappable gasket-mounted mechanical keyboard.",
        "The Forge Mech Keyboard is a gasket-mounted, hot-swappable 75% board built on a machined aluminium frame.",
        &[
            "Gasket-mounted 75% layout, PBT keycaps",
            "Hot-swap socket support for 3/5-pin switches",
            "Tri-mode connectivity (BT / 2.4GHz / USB-C)",
            "South-facing RGB with tri-mode brightness",
        ],
    ),
    product(
        "trm-lumen-04",
        "Lumen Desk Array",
        "Aether-HOM-004",
        "Home Office",
        89.0,
        Some(109.0),
        4.6,
        98,
        true,
        "images/products/trm-lumen-04.svg",
        "💡",
        "linear-gradient(135deg, #f59e0b 0%, #92400e 100%)",
        "Circadian-tuned task lighting for deep work sessions.",
        "The Lumen Desk Array delivers tunable correlated-white-point illumination calibrated for sustained cognitive work.",
        &[
            "Tunable correlated white point (2700K-6000K)",
            "Independent task and ambient channel dimming",
            "Photocell auto-dimming for night mode",
            "USB-C powered, 18W output",
        ],
    ),
    product(
        "trm-resonance-05",
        "Resonance Speaker",
        "Aether-AUD-005",
        "Audio",
        129.0,
        Some(159.0),
        4.5,
        76,
        true,
        "images/products/trm-resonance-05.svg",
        "🔊",
        "linear-gradient(135deg, #0d47a1 0%, #111111 100%)",
        "Field-portable 360 speaker with phase-coherent drivers.",
        "The Resonance Speaker is a field-portable 360° speaker with phase-coherent driver pairing and IP67 weather sealing.",
        &[
            "360° phase-coherent driver array",
            "IP67 weather and dust sealing",
            "24h battery, 12W output",
            "Stereo pairing for distributed audio",
        ],
    ),
    product(
        "trm-thermal-06",
        "Sentinel Thermal Camera",
        "Aether-DEF-006",
        "Defense Systems",
        219.0,
        Some(259.0),
        4.8,
        64,
        true,
        "images/products/trm-thermal-06.svg",
        "📷",
        "linear-gradient(135deg, #111111 0%, #3a1515 100%)",
        "Handheld radiometric thermal imaging module.",
        "The Sentinel Thermal Camera is a handheld radiometric imaging module with sub-30mK thermal resolution.",
        &[
            "Sub-30mK thermal resolution (640x512)",
            "Handheld radiometric capture",
            "Wi-Fi streaming + onboard recording",
            "Customizable alert thresholds",
        ],
    ),
    product(
        "trm-terra-07",
        "Terra Recovery Mat",
        "Aether-FIT-007",
        "Fitness",
        69.0,
        Some(89.0),
        4.4,
        52,
        true,
        "images/products/trm-terra-07.svg",
        "🧘",
        "linear-gradient(135deg, #1b5e20 0%, #0a0f1e 100%)",
        "Naturally textured recovery and training mat.",
        "The Terra Recovery Mat uses a naturally textured, high-density polymer surface for joint-friendly grip.",
        &[
            "Naturally textured high-density polymer",
            "Joint-friendly double-sided grip",
            "6mm cushioning, sweat-resistant surface",
            "Carry strap included",
        ],
    ),
    product(
        "trm-signal-08",
        "Signal DAC Amp",
        "Aether-AUD-008",
        "Audio",
        149.0,
        Some(179.0),
        4.7,
        83,
        true,
        "images/products/trm-signal-08.svg",
        "🎛️",
        "linear-gradient(135deg, #0d47a1 0%, #111111 100%)",
        "Desktop DAC and headphone amplifier, 2W class.",
        "The Signal DAC Amp is a desktop-grade DAC and headphone amplifier delivering 2W into high-impedance loads.",
        &[
            "ESS Sabre-class DAC, 32-bit/384kHz",
            "2W class amplifier into 300Ω loads",
            "Fully discrete analog volume stage",
            "RCA + balanced XLR inputs, 4.4mm balanced out",
        ],
    ),
    ]
}

fn product_by_id(id: &str) -> Option<Product> {
    all_products().into_iter().find(|p| p.id == id)
}

fn compute_totals(cart: &Cart) -> Totals {
    let mut subtotal: f64 = 0.0;
    let mut item_count: i64 = 0;
    for it in &cart.items {
        if let Some(p) = product_by_id(&it.id) {
            subtotal += p.price * it.qty as f64;
            item_count += it.qty;
        }
    }
    subtotal = (subtotal * 100.0).round() / 100.0;

    let discount_rate = match cart.promo.as_deref().map(|s| s.trim().to_uppercase()).as_deref() {
        Some("Aether10") | Some("WELCOME10") => 0.10,
        _ => 0.0,
    };
    let discount = (subtotal * discount_rate * 100.0).round() / 100.0;
    let discounted = subtotal - discount;
    let shipping = if discounted <= 0.0 || discounted >= 75.0 { 0.0 } else { 6.99 };
    let tax = (discounted * 0.08 * 100.0).round() / 100.0;
    let total = discounted + shipping + tax;

    Totals {
        item_count,
        subtotal,
        discount,
        shipping,
        tax,
        total: (total * 100.0).round() / 100.0,
    }
}

/* ---------------- Helpers ---------------- */

async fn persist(state: &AppState) {
    let _ = fs::write(
        "ecommerce/data/store.json",
        serde_json::to_vec_pretty(&serde_json::json!({
            "cart": state.cart.lock().unwrap().clone(),
            "orders": state.orders.lock().unwrap().clone(),
        }))
        .unwrap_or_default(),
    );
}

fn iso_now() -> String {
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let days = secs / 86400;
    let rem = secs % 86400;
    let z = days + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = if m <= 2 { y + 1 } else { y };
    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        year,
        m as i64,
        d as i64,
        rem / 3600,
        (rem % 3600) / 60,
        rem % 60
    )
}

fn luhn_valid(digits: &str) -> bool {
    let bytes: Vec<u8> = digits.bytes().filter(|b| b.is_ascii_digit()).collect();
    if bytes.len() < 13 || bytes.len() > 19 {
        return false;
    }
    let mut sum: i64 = 0;
    let mut dbl = false;
    for i in (0..bytes.len()).rev() {
        let mut d = (bytes[i] - b'0') as i64;
        if dbl {
            d *= 2;
            if d > 9 {
                d -= 9;
            }
        }
        sum += d;
        dbl = !dbl;
    }
    sum % 10 == 0
}

fn detect_brand(digits: &str) -> &'static str {
    let d = digits.trim();
    if d.starts_with('4') {
        "Visa"
    } else if d.starts_with("34") || d.starts_with("37") {
        "Amex"
    } else if d.starts_with('6') {
        "Discover"
    } else if d.starts_with("5") && d.len() >= 2 && d.as_bytes()[1] >= b'1' && d.as_bytes()[1] <= b'5' {
        "Mastercard"
    } else if d.starts_with("2") && d.len() >= 4 && d.as_bytes()[1] >= b'2' && d.as_bytes()[1] <= b'9' {
        "Mastercard"
    } else {
        "Card"
    }
}

/* ---------------- Handlers ---------------- */

async fn get_health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
    })
}

async fn get_products() -> Json<Vec<Product>> {
    Json(all_products())
}

async fn get_cart(State(state): State<Arc<AppState>>) -> Json<Cart> {
    Json(state.cart.lock().unwrap().clone())
}

async fn add_item(
    State(state): State<Arc<AppState>>,
    Json(body): Json<AddItemRequest>,
) -> Json<Cart> {
    let mut cart = state.cart.lock().unwrap().clone();
    let qty = body.qty.clamp(1, 99);
    if let Some(existing) = cart.items.iter_mut().find(|i| i.id == body.id) {
        existing.qty = (existing.qty + qty).min(99);
    } else {
        cart.items.push(CartItem { id: body.id, qty });
    }
    *state.cart.lock().unwrap() = cart.clone();
    persist(&state).await;
    Json(cart)
}

async fn set_qty(
    State(state): State<Arc<AppState>>,
    Json(body): Json<QtyUpdateRequest>,
) -> Json<Cart> {
    let mut cart = state.cart.lock().unwrap().clone();
    if body.qty <= 0 {
        cart.items.retain(|i| i.id != body.id);
    } else if let Some(existing) = cart.items.iter_mut().find(|i| i.id == body.id) {
        existing.qty = body.qty;
    }
    *state.cart.lock().unwrap() = cart.clone();
    persist(&state).await;
    Json(cart)
}

async fn remove_item(
    State(state): State<Arc<AppState>>,
    Json(body): Json<RemoveItemRequest>,
) -> Json<Cart> {
    let mut cart = state.cart.lock().unwrap().clone();
    cart.items.retain(|i| i.id != body.id);
    *state.cart.lock().unwrap() = cart.clone();
    persist(&state).await;
    Json(cart)
}

async fn apply_promo(
    State(state): State<Arc<AppState>>,
    Json(body): Json<PromoRequest>,
) -> Json<CartWithMeta> {
    let mut cart = state.cart.lock().unwrap().clone();
    let code = body.code.trim().to_uppercase();
    let promo = if code == "Aether10" || code == "WELCOME10" {
        Some(code)
    } else {
        None
    };
    cart.promo = promo.clone();
    let totals = compute_totals(&cart);
    *state.cart.lock().unwrap() = cart.clone();
    persist(&state).await;
    Json(CartWithMeta { cart, totals })
}

async fn clear_promo(State(state): State<Arc<AppState>>) -> Json<Cart> {
    let mut cart = state.cart.lock().unwrap().clone();
    cart.promo = None;
    *state.cart.lock().unwrap() = cart.clone();
    persist(&state).await;
    Json(cart)
}

async fn clear_cart(State(state): State<Arc<AppState>>) -> Json<Cart> {
    *state.cart.lock().unwrap() = Cart::default();
    persist(&state).await;
    Json(state.cart.lock().unwrap().clone())
}

async fn get_totals(State(state): State<Arc<AppState>>) -> Json<Totals> {
    Json(compute_totals(&state.cart.lock().unwrap()))
}

async fn create_order(
    State(state): State<Arc<AppState>>,
    Json(body): Json<CreateOrderRequest>,
) -> axum::response::Response {
    let totals = compute_totals(&state.cart.lock().unwrap());
    let order = Order {
        id: format!("Aether-{}", &uuid_simple()),
        created_at: iso_now(),
        items: body.items,
        subtotal: totals.subtotal,
        discount: totals.discount,
        shipping: totals.shipping,
        tax: totals.tax,
        total: totals.total,
        shipping_address: body.shipping,
        payment: body.payment,
    };
    state.orders.lock().unwrap().push(order.clone());
    *state.cart.lock().unwrap() = Cart::default();
    persist(&state).await;
    (StatusCode::CREATED, Json(order)).into_response()
}

async fn list_orders(State(state): State<Arc<AppState>>) -> Json<Vec<Order>> {
    Json(state.orders.lock().unwrap().clone())
}

async fn get_order(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> axum::response::Response {
    let order = state
        .orders
        .lock()
        .unwrap()
        .iter()
        .find(|o| o.id.to_uppercase() == id.to_uppercase())
        .cloned();
    match order {
        Some(o) => (StatusCode::OK, Json(o)).into_response(),
        None => {
            (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({ "error": "Order not found." })),
            )
                .into_response()
        }
    }
}

async fn charge(
    _state: State<Arc<AppState>>,
    Json(body): Json<ChargeRequest>,
) -> Json<ChargeResponse> {
    let digits: String = body
        .card_number
        .chars()
        .filter(|c| c.is_ascii_digit())
        .collect();
    let last4: String = digits.chars().skip(digits.len().saturating_sub(4)).collect();
    let brand = detect_brand(&digits);
    if digits == "4000000000000002" {
        return Json(ChargeResponse {
            approved: false,
            brand: brand.to_string(),
            last4,
            message: "Card declined by issuer.".to_string(),
        });
    }
    let approved = luhn_valid(&digits);
    Json(ChargeResponse {
        approved,
        brand: brand.to_string(),
        last4,
        message: if approved {
            "Approved".to_string()
        } else {
            "Invalid card number.".to_string()
        },
    })
}

/* ---------------- Server ---------------- */

pub async fn run() -> std::io::Result<()> {
    let _ = fs::create_dir_all("ecommerce/data");
    let port = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse::<u16>().ok())
        .unwrap_or(8080);
    let state = Arc::new(AppState::default());
    let serve_dir = ServeDir::new(PathBuf::from("ecommerce")).append_index_html_on_directories(true);
    let app = Router::new()
        .route("/api/health", get(get_health))
        .route("/api/products", get(get_products))
        .route("/api/cart", get(get_cart).delete(clear_cart))
        .route("/api/cart/items", post(add_item))
        .route("/api/cart/qty", post(set_qty))
        .route("/api/cart/remove", post(remove_item))
        .route("/api/cart/promo", post(apply_promo).delete(clear_promo))
        .route("/api/cart/totals", get(get_totals))
        .route("/api/orders", post(create_order).get(list_orders))
        .route("/api/orders/{id}", get(get_order))
        .route("/api/payment/charge", post(charge))
        .fallback_service(serve_dir)
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(("0.0.0.0", port)).await?;
    axum::serve(listener, app).await?;
    Ok(())
}

fn uuid_simple() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    format!("{:08x}", nanos)
}

#[tokio::main]
async fn main() -> std::io::Result<()> {
    run().await
}
