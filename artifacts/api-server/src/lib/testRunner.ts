/**
 * Simulated test runner that generates realistic pass/fail/warning results
 * for each B2C ecommerce module. In production this would drive real Playwright
 * sessions against any storefront URL; for the MVP it produces deterministic-ish
 * results so the dashboard is fully interactive from day one.
 */

import { db, testRunsTable, testResultsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

interface Scenario {
  testId: string;
  scenario: string;
  priority: "must" | "should" | "could";
}

interface ScenarioMeta {
  apisCalled: string[];
  productName: string | null;
  productCode: string | null;
}

// ── Sample product pool ───────────────────────────────────────────────────────
const SAMPLE_PRODUCTS = [
  { name: "Men's Classic Oxford Shirt",           code: "SHIRT-MCO-001", category: "Clothing",     categoryId: "c0001" },
  { name: "Women's Running Shoes Air Pro",         code: "SHOES-WRA-042", category: "Footwear",     categoryId: "c0002" },
  { name: "Unisex Leather Watch Series 7",         code: "WATCH-UL-007",  category: "Accessories",  categoryId: "c0003" },
  { name: "Kids' Explorer Backpack",               code: "BAG-KBE-023",   category: "Bags",         categoryId: "c0004" },
  { name: "Smart Home Speaker Mini",               code: "ELEC-SHS-011",  category: "Electronics",  categoryId: "c0005" },
  { name: "Yoga Mat Pro Ultra Grip",               code: "SPORT-YMP-008", category: "Sports",       categoryId: "c0006" },
  { name: "Wireless Noise-Cancelling Headphones",  code: "ELEC-WNC-034",  category: "Electronics",  categoryId: "c0005" },
];

function pickProduct(runId: string) {
  // Deterministic pick based on run ID so re-reads are consistent
  let hash = 0;
  for (let i = 0; i < runId.length; i++) hash = (hash * 31 + runId.charCodeAt(i)) >>> 0;
  return SAMPLE_PRODUCTS[hash % SAMPLE_PRODUCTS.length];
}

// ── Per-scenario API + product metadata ──────────────────────────────────────
function getScenarioMeta(
  testId: string,
  product: (typeof SAMPLE_PRODUCTS)[0]
): ScenarioMeta {
  const p = product;
  const enc = (s: string) => encodeURIComponent(s);
  const keyword = enc(p.name.split(" ")[0]);

  const map: Record<string, ScenarioMeta> = {
    // Home
    "TC-HP-01": { apisCalled: ["GET /", "GET /api/cms/homepage"],                                                          productName: null, productCode: null },
    "TC-HP-02": { apisCalled: ["GET /api/navigation/header", "GET /api/cms/logo"],                                         productName: null, productCode: null },
    "TC-HP-03": { apisCalled: ["GET /api/cms/carousel", "GET /api/cms/banners"],                                           productName: null, productCode: null },
    "TC-HP-04": { apisCalled: ["GET /api/cms/footer", "GET /api/navigation/footer"],                                        productName: null, productCode: null },
    "TC-HP-05": { apisCalled: ["GET /api/cart/mini", "GET /api/users/current"],                                            productName: null, productCode: null },
    // Navigation
    "TC-NV-01": { apisCalled: ["GET /api/categories", "GET /api/navigation/mega-menu"],                                    productName: null, productCode: null },
    "TC-NV-02": { apisCalled: ["GET /api/categories", `GET /api/navigation/mega-menu/${p.categoryId}`],                    productName: null, productCode: null },
    "TC-NV-03": { apisCalled: [`GET /api/categories/${p.categoryId}`, "GET /api/cms/category-banner"],                     productName: null, productCode: null },
    "TC-NV-04": { apisCalled: ["GET /api/navigation/mega-menu"],                                                           productName: null, productCode: null },
    "TC-NV-05": { apisCalled: ["GET /api/navigation/header", "GET /api/categories"],                                       productName: null, productCode: null },
    // Search
    "TC-SR-01": { apisCalled: [`GET /api/search?q=${keyword}`],                                                            productName: p.name, productCode: p.code },
    "TC-SR-02": { apisCalled: [`GET /api/search/suggest?q=${keyword}&max=5`],                                              productName: p.name, productCode: p.code },
    "TC-SR-03": { apisCalled: [`GET /api/search?q=${enc(p.name)}&pageSize=20&sort=relevance`],                             productName: p.name, productCode: p.code },
    "TC-SR-04": { apisCalled: ["GET /api/search?q=xyznotfound&pageSize=20"],                                               productName: null, productCode: null },
    "TC-SR-05": { apisCalled: [`GET /api/search?q=${keyword}&pageSize=20&sort=price-asc&page=2`],                         productName: p.name, productCode: p.code },
    // Category
    "TC-CT-01": { apisCalled: [`GET /api/categories/${p.categoryId}`, `GET /api/cms/category/${p.categoryId}`],            productName: null, productCode: null },
    "TC-CT-02": { apisCalled: [`GET /api/categories/${p.categoryId}/subcategories`],                                       productName: null, productCode: null },
    "TC-CT-03": { apisCalled: [`GET /api/products?category=${p.categoryId}&pageSize=24`],                                  productName: p.name, productCode: p.code },
    "TC-CT-04": { apisCalled: [`GET /api/cms/category-banner/${p.categoryId}`],                                            productName: null, productCode: null },
    // Cart
    "TC-CART-01": { apisCalled: ["GET /api/cart"],                                                                         productName: p.name, productCode: p.code },
    "TC-CART-02": { apisCalled: ["PATCH /api/cart/entries/{entryId}", "GET /api/cart"],                                    productName: p.name, productCode: p.code },
    "TC-CART-03": { apisCalled: ["DELETE /api/cart/entries/{entryId}", "GET /api/cart"],                                   productName: p.name, productCode: p.code },
    "TC-CART-04": { apisCalled: ["POST /api/cart/vouchers", "GET /api/cart"],                                              productName: p.name, productCode: p.code },
    "TC-CART-05": { apisCalled: ["POST /api/cart/vouchers", "GET /api/cart"],                                              productName: p.name, productCode: p.code },
    "TC-CART-06": { apisCalled: ["GET /api/cart", "GET /api/cart/delivery-modes"],                                         productName: p.name, productCode: p.code },
    "TC-CART-07": { apisCalled: ["GET /api/cart", "GET /api/checkout/init"],                                               productName: p.name, productCode: p.code },
    "TC-CART-08": { apisCalled: ["GET /api/cart/mini", "GET /api/cart"],                                                   productName: p.name, productCode: p.code },
    // Checkout
    "TC-CO-01": { apisCalled: ["GET /api/checkout/init", "GET /api/cart"],                                                 productName: p.name, productCode: p.code },
    "TC-CO-02": { apisCalled: ["GET /api/checkout/delivery-address", "POST /api/checkout/delivery-address"],               productName: p.name, productCode: p.code },
    "TC-CO-03": { apisCalled: ["GET /api/checkout/delivery-modes", "PUT /api/checkout/delivery-mode"],                    productName: p.name, productCode: p.code },
    "TC-CO-04": { apisCalled: ["POST /api/checkout/payment-details", "GET /api/checkout/payment-details"],                 productName: p.name, productCode: p.code },
    "TC-CO-05": { apisCalled: ["GET /api/checkout/review", "POST /api/checkout/place-order"],                              productName: p.name, productCode: p.code },
    "TC-CO-06": { apisCalled: ["GET /api/orders/{orderId}/confirmation"],                                                  productName: p.name, productCode: p.code },
    // PLP
    "TC-PLP-01": { apisCalled: [`GET /api/products?category=${p.categoryId}&pageSize=24&sort=relevance`],                  productName: p.name, productCode: p.code },
    "TC-PLP-02": { apisCalled: [`GET /api/products?category=${p.categoryId}&pageSize=24&sort=price-asc`, `GET /api/products?category=${p.categoryId}&pageSize=24&sort=newest`], productName: p.name, productCode: p.code },
    "TC-PLP-03": { apisCalled: [`GET /api/products?category=${p.categoryId}&pageSize=24&page=2`],                          productName: p.name, productCode: p.code },
    "TC-PLP-04": { apisCalled: ["POST /api/cart/entries", "GET /api/cart/mini"],                                           productName: p.name, productCode: p.code },
    "TC-PLP-05": { apisCalled: [`GET /api/products/${p.code}/stock`, `GET /api/products?category=${p.categoryId}&filter[availability]=instock`], productName: p.name, productCode: p.code },
    // PDP
    "TC-PDP-01": { apisCalled: [`GET /api/products/${p.code}`],                                                            productName: p.name, productCode: p.code },
    "TC-PDP-02": { apisCalled: [`GET /api/products/${p.code}/images`],                                                     productName: p.name, productCode: p.code },
    "TC-PDP-03": { apisCalled: [`GET /api/products/${p.code}/variants`, `GET /api/products/${p.code}/stock`],              productName: p.name, productCode: p.code },
    "TC-PDP-04": { apisCalled: ["POST /api/cart/entries", "GET /api/cart/mini"],                                           productName: p.name, productCode: p.code },
    "TC-PDP-05": { apisCalled: [`GET /api/products/${p.code}/reviews`, `GET /api/products/${p.code}/specifications`],      productName: p.name, productCode: p.code },
    "TC-PDP-06": { apisCalled: [`GET /api/products/${p.code}/related?type=cross-sell`],                                    productName: p.name, productCode: p.code },
  };

  return map[testId] ?? { apisCalled: [], productName: null, productCode: null };
}

// ── Module scenario definitions ───────────────────────────────────────────────
const MODULE_SCENARIOS: Record<string, Scenario[]> = {
  home: [
    { testId: "TC-HP-01", scenario: "Page loads with HTTP 200 and no console/JS errors", priority: "must" },
    { testId: "TC-HP-02", scenario: "Header, logo, and top navigation render", priority: "must" },
    { testId: "TC-HP-03", scenario: "Hero banner / promotional carousel loads", priority: "should" },
    { testId: "TC-HP-04", scenario: "Footer links and content render", priority: "should" },
    { testId: "TC-HP-05", scenario: "Mini-cart icon and account icon present", priority: "must" },
  ],
  navigation: [
    { testId: "TC-NV-01", scenario: "Top-level menu items render per category structure", priority: "must" },
    { testId: "TC-NV-02", scenario: "Mega-menu / flyout opens on hover/click", priority: "must" },
    { testId: "TC-NV-03", scenario: "Navigation links route to correct category pages", priority: "must" },
    { testId: "TC-NV-04", scenario: "Navigation is keyboard-accessible", priority: "could" },
    { testId: "TC-NV-05", scenario: "Mobile hamburger menu opens/closes correctly", priority: "should" },
  ],
  search: [
    { testId: "TC-SR-01", scenario: "Search box accepts input and submits on Enter/click", priority: "must" },
    { testId: "TC-SR-02", scenario: "Autosuggest/predictive results appear for valid query", priority: "should" },
    { testId: "TC-SR-03", scenario: "Search results page returns relevant products", priority: "must" },
    { testId: "TC-SR-04", scenario: "No-results state shows appropriate messaging", priority: "should" },
    { testId: "TC-SR-05", scenario: "Search results are paginated/sortable", priority: "could" },
  ],
  category: [
    { testId: "TC-CT-01", scenario: "Category page loads with correct title/breadcrumb", priority: "must" },
    { testId: "TC-CT-02", scenario: "Sub-category tiles/links render correctly", priority: "should" },
    { testId: "TC-CT-03", scenario: "Product grid renders with images, price, and title", priority: "must" },
    { testId: "TC-CT-04", scenario: "Category-level banner/content (WCMS) renders", priority: "could" },
  ],
  plp: [
    { testId: "TC-PLP-01", scenario: "Products render with image, title, price, and rating", priority: "must" },
    { testId: "TC-PLP-02", scenario: "Sort options (price, relevance, newest) function correctly", priority: "must" },
    { testId: "TC-PLP-03", scenario: "Pagination / infinite scroll / 'Load more' works", priority: "must" },
    { testId: "TC-PLP-04", scenario: "'Add to Cart' / 'Quick View' from PLP functions", priority: "should" },
    { testId: "TC-PLP-05", scenario: "Out-of-stock products display correct badge/state", priority: "could" },
  ],
  pdp: [
    { testId: "TC-PDP-01", scenario: "Product title, price, SKU, and images render correctly", priority: "must" },
    { testId: "TC-PDP-02", scenario: "Image gallery/zoom functions correctly", priority: "should" },
    { testId: "TC-PDP-03", scenario: "Variant selectors (size/color) update price, image, and availability", priority: "must" },
    { testId: "TC-PDP-04", scenario: "'Add to Cart' adds correct item/quantity and updates mini-cart", priority: "must" },
    { testId: "TC-PDP-05", scenario: "Product description, specifications, and reviews tabs render", priority: "should" },
    { testId: "TC-PDP-06", scenario: "Related/cross-sell products carousel renders", priority: "could" },
  ],
  cart: [
    { testId: "TC-CART-01", scenario: "Cart page loads and displays all added line items correctly", priority: "must" },
    { testId: "TC-CART-02", scenario: "Item quantity can be increased and decreased; totals update", priority: "must" },
    { testId: "TC-CART-03", scenario: "Item can be removed; cart updates and shows empty state when last item removed", priority: "must" },
    { testId: "TC-CART-04", scenario: "Promo/coupon code field accepts valid codes and applies discount", priority: "should" },
    { testId: "TC-CART-05", scenario: "Invalid coupon shows appropriate error message", priority: "should" },
    { testId: "TC-CART-06", scenario: "Order summary (subtotal, shipping, tax, total) renders and is accurate", priority: "must" },
    { testId: "TC-CART-07", scenario: "'Proceed to Checkout' CTA navigates to checkout page", priority: "must" },
    { testId: "TC-CART-08", scenario: "Mini-cart reflects same quantities as full cart page", priority: "could" },
  ],
  checkout: [
    { testId: "TC-CO-01", scenario: "Checkout flow initialises and displays correct cart summary", priority: "must" },
    { testId: "TC-CO-02", scenario: "Delivery address form validates and saves correctly", priority: "must" },
    { testId: "TC-CO-03", scenario: "Delivery method selection updates order total", priority: "must" },
    { testId: "TC-CO-04", scenario: "Payment details form accepts valid card and saves", priority: "must" },
    { testId: "TC-CO-05", scenario: "Order review page shows correct summary before placement", priority: "must" },
    { testId: "TC-CO-06", scenario: "Order confirmation page loads with order number after placement", priority: "must" },
  ],
};

// ── Simulation helpers ────────────────────────────────────────────────────────
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function simulateResult(priority: "must" | "should" | "could"): "pass" | "fail" | "warning" {
  const rand = Math.random();
  if (priority === "must") {
    if (rand < 0.82) return "pass";
    if (rand < 0.93) return "fail";
    return "warning";
  } else if (priority === "should") {
    if (rand < 0.75) return "pass";
    if (rand < 0.87) return "warning";
    return "fail";
  } else {
    if (rand < 0.7) return "pass";
    if (rand < 0.85) return "warning";
    return "fail";
  }
}

// ── Main executor ─────────────────────────────────────────────────────────────
export async function executeTestRun(runId: string): Promise<void> {
  logger.info({ runId }, "Starting simulated test run");

  await db
    .update(testRunsTable)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(testRunsTable.id, runId));

  const [run] = await db
    .select()
    .from(testRunsTable)
    .where(eq(testRunsTable.id, runId));

  if (!run) {
    logger.error({ runId }, "Run not found, aborting");
    return;
  }

  const product = pickProduct(runId);
  const modules = run.moduleSelection as string[];

  try {
    for (const mod of modules) {
      const scenarios = MODULE_SCENARIOS[mod] ?? [];
      for (const sc of scenarios) {
        const status = simulateResult(sc.priority);
        const durationMs = randomBetween(200, 4500);
        const meta = getScenarioMeta(sc.testId, product);

        await db.insert(testResultsTable).values({
          runId,
          module: mod as "home" | "navigation" | "search" | "category" | "plp" | "pdp" | "cart" | "checkout",
          scenario: sc.scenario,
          testId: sc.testId,
          status,
          durationMs,
          errorMessage:
            status === "fail"
              ? `Element not found or assertion failed: ${sc.scenario}`
              : status === "warning"
              ? `Slow response or non-critical element missing: ${sc.scenario}`
              : null,
          apisCalled: meta.apisCalled,
          productName: meta.productName,
          productCode: meta.productCode,
        });
        await new Promise((r) => setTimeout(r, 20));
      }
    }

    await db
      .update(testRunsTable)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(testRunsTable.id, runId));

    logger.info({ runId }, "Test run completed");
  } catch (err) {
    logger.error({ runId, err }, "Test run failed");
    await db
      .update(testRunsTable)
      .set({ status: "failed", completedAt: new Date() })
      .where(eq(testRunsTable.id, runId));
  }
}
