import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, Search, Filter, Globe, Navigation, Tag, Package, Home, ShoppingCart, CreditCard } from "lucide-react";

interface Scenario {
  testId: string;
  scenario: string;
  priority: "must" | "should" | "could";
}

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

const MODULE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  home:       { label: "Home",       icon: Home,              color: "text-sky-400" },
  navigation: { label: "Navigation", icon: Navigation,        color: "text-indigo-400" },
  search:     { label: "Search",     icon: Search,            color: "text-blue-400" },
  category:   { label: "Category",   icon: Tag,               color: "text-teal-400" },
  plp:        { label: "Product List (PLP)",    icon: Filter,       color: "text-emerald-400" },
  pdp:        { label: "Product Detail (PDP)",  icon: Package,      color: "text-green-400" },
  cart:       { label: "Cart",                  icon: ShoppingCart, color: "text-orange-400" },
  checkout:   { label: "Checkout",              icon: CreditCard,   color: "text-violet-400" },
};

const PRIORITY_BADGE: Record<string, { label: string; class: string }> = {
  must:   { label: "Must",   class: "bg-rose-500/15 text-rose-400 border-rose-500/30" },
  should: { label: "Should", class: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  could:  { label: "Could",  class: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
};

const ALL_MODULES = Object.keys(MODULE_SCENARIOS);
const TOTAL_CASES = ALL_MODULES.reduce((n, m) => n + MODULE_SCENARIOS[m].length, 0);
const MUST_COUNT  = ALL_MODULES.reduce((n, m) => n + MODULE_SCENARIOS[m].filter(s => s.priority === "must").length, 0);

export default function TestCases() {
  const [query, setQuery] = useState("");

  const filtered = ALL_MODULES.reduce<Record<string, Scenario[]>>((acc, mod) => {
    const q = query.toLowerCase();
    const matches = MODULE_SCENARIOS[mod].filter(
      (s) =>
        !q ||
        s.testId.toLowerCase().includes(q) ||
        s.scenario.toLowerCase().includes(q) ||
        mod.includes(q) ||
        MODULE_META[mod]?.label.toLowerCase().includes(q)
    );
    if (matches.length) acc[mod] = matches;
    return acc;
  }, {});

  const visibleModules = Object.keys(filtered);
  const visibleTotal   = visibleModules.reduce((n, m) => n + filtered[m].length, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Cases</h1>
          <p className="text-muted-foreground mt-1">
            Full catalogue of sanity scenarios executed on every B2C storefront run.
          </p>
        </div>

        {/* Stats chips */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-sm">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span className="font-semibold">{TOTAL_CASES}</span>
            <span className="text-muted-foreground">total cases</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-sm">
            <Globe className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold">{ALL_MODULES.length}</span>
            <span className="text-muted-foreground">modules</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-sm">
            <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
            <span className="font-semibold">{MUST_COUNT}</span>
            <span className="text-muted-foreground">must-pass</span>
          </div>
        </div>
      </div>

      {/* Priority legend */}
      <Card className="bg-card/50">
        <CardContent className="p-4 flex flex-wrap gap-6 items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Priority</p>
            <div className="flex gap-3">
              {Object.entries(PRIORITY_BADGE).map(([key, v]) => (
                <span key={key} className={`text-xs px-2.5 py-1 rounded border font-medium ${v.class}`}>
                  {v.label}
                </span>
              ))}
            </div>
          </div>
          <div className="flex-1 min-w-48">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Legend</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li><span className="text-rose-400 font-medium">Must</span> — blocking; a failure causes the run to be marked Failed</li>
              <li><span className="text-amber-400 font-medium">Should</span> — important but non-blocking; surfaces as Warning</li>
              <li><span className="text-slate-400 font-medium">Could</span> — nice-to-have; failure is informational only</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by test ID, scenario description, or module…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {visibleTotal} result{visibleTotal !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Modules accordion */}
      {visibleModules.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          No test cases match <span className="font-mono text-foreground">"{query}"</span>
        </div>
      ) : (
        <Accordion type="multiple" defaultValue={visibleModules} className="space-y-3">
          {visibleModules.map((mod) => {
            const meta   = MODULE_META[mod];
            const cases  = filtered[mod];
            const Icon   = meta?.icon ?? CheckCircle2;
            const must   = cases.filter(s => s.priority === "must").length;
            const should = cases.filter(s => s.priority === "should").length;
            const could  = cases.filter(s => s.priority === "could").length;

            return (
              <AccordionItem
                key={mod}
                value={mod}
                className="border border-border rounded-xl overflow-hidden bg-card"
              >
                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-accent/40 data-[state=open]:bg-accent/40">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${meta?.color ?? "text-primary"}`} />
                      <span className="font-semibold text-base">{meta?.label ?? mod}</span>
                      <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider hidden sm:block">
                        {cases[0].testId.split("-").slice(0, 2).join("-")} series
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {must   > 0 && <span className={`px-2 py-0.5 rounded border ${PRIORITY_BADGE.must.class}`}>{must} must</span>}
                      {should > 0 && <span className={`px-2 py-0.5 rounded border ${PRIORITY_BADGE.should.class}`}>{should} should</span>}
                      {could  > 0 && <span className={`px-2 py-0.5 rounded border ${PRIORITY_BADGE.could.class}`}>{could} could</span>}
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="p-0 border-t border-border">
                  <div className="divide-y divide-border">
                    {cases.map((sc, idx) => (
                      <div
                        key={sc.testId}
                        className="flex items-start gap-4 px-6 py-4 hover:bg-accent/20 transition-colors"
                      >
                        {/* Row number + test ID */}
                        <div className="flex flex-col items-center gap-1 min-w-[4.5rem]">
                          <span className="text-[10px] text-muted-foreground font-mono">
                            #{String(idx + 1).padStart(2, "0")}
                          </span>
                          <Badge
                            variant="outline"
                            className="font-mono text-[11px] px-1.5 py-0.5 rounded-sm border-border text-muted-foreground"
                          >
                            {sc.testId}
                          </Badge>
                        </div>

                        {/* Scenario text */}
                        <p className="flex-1 text-sm leading-relaxed pt-0.5">{sc.scenario}</p>

                        {/* Priority */}
                        <span
                          className={`text-xs px-2.5 py-1 rounded border font-medium shrink-0 ${PRIORITY_BADGE[sc.priority].class}`}
                        >
                          {PRIORITY_BADGE[sc.priority].label}
                        </span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
