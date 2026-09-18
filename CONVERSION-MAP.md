# Hachalu Protocol — DawoLife → Hachalu Conversion Map

Status: **Phases 1–7 implemented.** DawoLife is untouched (original lives in `D:\Dawolife.worktrees\fullstack`).
This working copy: `D:\Dawolife.worktrees\hachalu-protocol` (same git history, branch `store-listing-setup`).

Last verified (2026-09-18): server E2E smoke **30/30 checks pass** (three-role login → catalog → seller product create (Pending) → admin approve → worker-by-email → ready-made order → custom order + measurement save → full order lifecycle to Completed → commission auto-created + Paid → production job assign/start/QC → admin overview). Flutter `flutter analyze` clean (0 errors), `flutter build apk --debug` succeeds. Web `npm run build` passes.

Server fixes made during E2E:
- `workerSchema`: `userId` now optional; `email` optional alternative — route resolves user by email (404 "No account found with that email" if unknown).
- Order status PATCH now accepts any known status (`ALL_ORDER_STATUSES` = flow keys ∪ value targets). Previously `Completed`/`Cancelled` were unreachable because the guard checked only flow *source* keys.
- Prisma interactive-transaction timeout raised to `{ maxWait: 10000, timeout: 20000 }` (Neon round-trip latency).
- Machine status enum: `Available | InUse | Maintenance | Disabled` (no `Retired`).
- Commissions: seller list = `GET /api/commissions/mine`, status patch = `PATCH /api/commissions/:id` body `{status}` (mirrored in Flutter repo).

Decision rules used below: **KEEP** (use as-is / minor rename), **MODIFY** (same shape, property/vehicle fields swapped), **REPLACE** (rebuild with new domain), **REMOVE** (no longer needed), **ADD** (net-new for Hachalu).

---

## 0. Stack (unchanged, retained across all layers)

| Layer | Stack | Location |
|---|---|---|
| Mobile | Flutter (Provider, flutter_map, fl_chart, Firebase, FCM) | `mobile-app-flutter/` |
| Web | Next.js 16, React 19, Tailwind v4, shadcn, Capacitor 8 | `web/` |
| API | Express + Prisma 6 + PostgreSQL + WebSocket (`ws`) | `server/` |
| Auth | email OTP + password, Firebase (Google), JWT (`JWT_SECRET`/`JWT_REFRESH_SECRET`, 7d) | `server/src/routes/auth.ts`, `utils/jwt.ts` |
| Storage | Cloudinary default / local disk (`STORAGE_DRIVER`) | `server/src/utils/storage.ts`, `/api/upload` |
| Payments | Chapa + TeleBirr (ETB, webhook, `Payment` model) | `server/src/routes/chapa.ts`, `telebirr.ts` |
| i18n | en / am / om (web `lib/i18n.tsx`, mobile `app_strings.dart`) | both |
| Deploy | Render (`render.yaml`) + cPanel-ready | root |

Brand: DawoLife orange `#F97316` (web `oklch(0.7 0.19 41)`; mobile `0xFFF97316`). → Hachalu brand palette via `app/globals.css` tokens + `mobile/lib/core/theme/app_colors.dart`.

---

## 1. Data model conversion (`server/prisma/schema.prisma`)

### 1.1 Reused verbatim (KEEP)

| Model | Note |
|---|---|
| `User` (role: `admin/agent/owner/user`) | KEEP shape; role semantics remap (agent→seller/ambassador, owner→wardrobe/wholesaler) |
| `DeviceToken` | unchanged |
| `Payment` | KEEP; change `propertyId/propertyTitle` fields → `orderId/orderTitle` (nullable, no FK) |
| `Notification` | unchanged |
| `Message` | KEEP shape; rename `propertyId` column → `orderId`/`productId` (the "thread key") |
| `Announcement` | unchanged |
| `SavedItem` | KEEP; `SavedItemType` enum `property/vehicle` → `product` |
| `Setting` | unchanged (contact/social) |
| `Review` | KEEP shape; change `agentId` reference semantics to rating target = seller/shop/product |
| `PermissionRequest` | KEEP; enum `PermissionEntityType` `PROPERTY/VEHICLE` → `PRODUCT/ORDER` |

### 1.2 Replaced / redesigned (REPLACE)

| DawoLife | → | Hachalu design |
|---|---|---|
| `Property` (sale/rent, location-based) | → | `Product` (garment; categories, gender, brand, color, sizes, stock, ready-made/custom flag) |
| `Vehicle` (sale/rent, 250 fields) | → | merged into `Product` + `ProductVariant` (size × color SKUs) |
| — | → | `ProductCategory` (Men/Women/Child, Suit/Trouser/Shirt/Uniform…) |
| — | → | `MeasurementTemplate` (flexible; e.g. male-suit, female-suit, child) with own measurement list |
| — | → | `CustomerMeasurement` (values per template + optional reference photo) |
| — | → | `Order` + `OrderItem` (ready-made checkout) |
| — | → | `CustomOrder` (measurement + style + fabric + production lifecycle) |
| — | → | `ProductionJob` + `Worker` + `WorkerAssignment` (assign, 0→100% progress, QC) |
| — | → | `Material` + `Inventory` (fabric, thread, buttons, zippers, lining…) |
| — | → | `Machine` (available / in use) |
| — | → | `Commission` / `Payout` (ambassador sales) |

### 1.3 Enum changes

| Enum | Change |
|---|---|
| `PropertyStatus` / `VehicleStatus` | → single `ProductStatus`: `Draft/Pending/Approved/Rejected/OutOfStock` |
| NEW `OrderStatus` | `Pending/PaymentConfirmed/MeasurementConfirmed/InProduction/Ready/QualityCheck/Completed/Cancelled` + `ReadyMade: Pending/Paid/Packed/Delivered/Completed` |
| NEW `ProductionStatus` | `Assigned/Started/25/50/75/Ready/QualityCheck` |
| `UserRole` | keep 4 values; semantic: admin / seller (agent) / wholesale (owner) / buyer (user) |

---

## 2. Backend route conversion (`server/src/routes/*.ts`)

Rules: mounting keep (`/api/*`), middleware (auth/agent/admin/requireActiveUser/rateLimit) reuse untouched. All endpoint auth levels unchanged.

| DawoLife route | Decision | Hachalu route | Notes |
|---|---|---|---|
| `auth.ts` (all 15 endpoints) | KEEP | `/api/auth` | identical — register seller/buyer paths already exist |
| `properties.ts` (list/detail/create/patch/delete) | REPLACE | `/api/products` | same lifecycle; permission gate `assertListingPermissionAllowed` reused for Approved products |
| `vehicles.ts` | REPLACE | merge into `/api/products` | no separate vehicle module |
| `admin.ts` | MODIFY | `/api/admin` | agents→sellers/workers; properties/vehicles queues → products queue + order queue + production |
| `agent.ts` | MODIFY | `/api/seller` (or keep `/api/agent` path) | KYC stays; `properties/vehicles` lists → seller products + ambassador orders + commissions |
| `upload.ts` | KEEP | `/api/upload` | unchanged (single + multiple, Cloudinary/local) |
| `chapa.ts` / `telebirr.ts` | MODIFY | `/api/chapa`, `/api/telebirr` | body `propertyId/propertyTitle` → `orderId/orderTitle`; `paymentType` → `product_sale/custom_order/service_charge` |
| `payments.ts` | MODIFY | `/api/payments` | ownership filter on `orderId` instead of `Property.agentId` |
| `messages.ts` | MODIFY | `/api/messages` | thread key `propertyId` → `orderId`/`productId` |
| `notifications.ts` | KEEP | `/api/notifications` | unchanged |
| `favorites.ts` | KEEP | `/api/favorites` | `SavedItemType` enum update only |
| `reviews.ts` | MODIFY | `/api/reviews` | target = seller/shop or product |
| `announcements.ts` | KEEP | `/api/announcements` | unchanged |
| `contact.ts` | KEEP | `/api/contact` | unchanged |
| `settings.ts` | KEEP | `/api/settings` | unchanged |
| `pushTokens.ts` | KEEP | `/api/push-tokens` | unchanged |
| `permissions.ts` | KEEP | `/api/permissions` | entity enum update |
| `stats.ts` | MODIFY | `/api/stats` | `listedHouses/listedCars` → `products`, `readyMade`, `customOrders`, `activeWorkers` |
| **NEW** | ADD | `/api/categories` | product categories CRUD (admin) |
| **NEW** | ADD | `/api/measurements` | templates + customer values (buyer submit / seller enters) |
| **NEW** | ADD | `/api/orders` | cart / checkout / order lifecycle (buyer + seller + admin) |
| **NEW** | ADD | `/api/production` | production jobs, worker assignment, progress, QC |
| **NEW** | ADD | `/api/workers` | worker registry + machine status (admin) |
| **NEW** | ADD | `/api/inventory` | materials stock in/out (admin) |
| **NEW** | ADD | `/api/commissions` | ambassador earnings/payouts |

---

## 3. Web app conversion (`web/app`, `web/components`)

### 3.1 Auth / shared UX (KEEP except copy)

`auth/*`, `verify`, `verify-email`, `forgot-password`, `reset-password`, `saved`, `messages`, `notifications`, `news`, `payment-success`, `privacy`, `account-deletion`, `components/auth/*`, `components/ui/*`, `components/site-header.tsx`, `bottom-nav.tsx`, `language-dropdown.tsx`, `smooth-scroll.tsx`, `capacitor-*`, `logo.tsx`. Copy/labels rebrand to Hachalu.

### 3.2 Home → Shop (MODIFY)

| DawoLife | → | Hachalu |
|---|---|---|
| `web-home.tsx` (Hero/video) | replace hero copy + video asset; headline "Own the cloth that defines you" / apparel imagery |
| `latest-properties.tsx` / `latest-vehicles.tsx` | → `latest-products.tsx` (ready-made + custom tabs) |
| `property-card.tsx` / `vehicle-card.tsx` | → `product-card.tsx` (image, price, gender/brand/size chips, status) |
| `home/categories.tsx` (dead pills) | → live category links (Men/Women/Child → Suit/Shirt/Trouser/Uniform/Kids) |
| `home/services.tsx` | → services: measure, custom-tailoring, bulk/wholesale, delivery, uniform supply |
| `home/how-to-buy.tsx` / `how-to-sell.tsx` | → how-to-buy (ready-made vs custom) / become-a-seller |
| `home/map-banner.tsx` | → shop-locations banner (multi-branch map) or REPLACE with ambassador CTA |
| `home/search-summary.tsx`, `lib/search.ts` | → product search: `?search=&category=&gender=&brand=&size=` |

### 3.3 Listing detail → Product detail (REPLACE)

| DawoLife | → | Hachalu |
|---|---|---|
| `listings/view/{page,view-listing}.tsx` | → `/products/[?id]`: gallery (required Front/Back/Left/Right, optional Seated), price, size/color/brand selectors, stock, ready-made “Buy” | custom “Order with measurements”, description, material/fabric, reviews, seller card, MessageSeller |
| `listings/vehicle/{page,vehicle-listing}.tsx` | merge into product detail | — |
| `listing/gallery.tsx` | KEEP, enhance swipe | — |

### 3.4 Wizards → Product + Order wizard (REPLACE)

| DawoLife | → | Hachalu |
|---|---|---|
| `post-wizard.tsx` (property 5-step) | → `product-wizard.tsx`: Basic (name/category/gender/age/brand/country/fabric) → Variants (sizes×colors×stock, price) → Photos (≥4: front/back/left/right) → Pricing/Rent? (ready-made vs custom, custom base price) → Review |
| `post-vehicle-wizard.tsx` | merge into product wizard | — |
| `apps: sell`, `post/{page,vehicle}` | → `/sell` (chooser ready-made/custom) + `/sell/products` + `/sell/custom` |
| **NEW** | ADD | measurement form (template-driven, photo upload optional), cart, checkout |

### 3.5 Admin portal (MODIFY)

| DawoLife page | → | Hachalu admin |
|---|---|---|
| `properties` / `vehicles` (review queues) | → `products` (approve/reject/sold/out-of-stock/contact switch) |
| `agents` (KYC) | → `sellers` (KYC keep) + NEW **workers** tab (tailors: create, availability, assign) |
| `payments` | KEEP pattern; order-linked |
| `permissions` | KEEP; entity enum product/order |
| `users/messages/notifications/announcements/settings` | KEEP |
| `post/property`, `post/vehicle` | → `post/product` |
| **NEW** | ADD | `orders` (all orders, status transitions incl. production lifecycle) |
| **NEW** | ADD | `production` (job board: worker × job × progress table, QC queue) |
| **NEW** | ADD | `inventory` & `machines` dashboards |
| **NEW** | ADD | `commissions` (ambassador payouts) |
| dashboard `overview-chart.tsx`, `stats-card.tsx` | MODIFY | revenue by product, orders by status, production throughput |

### 3.6 Agent portal → Seller/Ambassador portal (MODIFY)

Dashboard, post wizard, products list (+edit/delete permission gate kept), payments, commissions, orders (create customer order, enter measurements), profile, settings, news, messages, notifications, onboarding (KYC), terms/privacy. `components/agent/*` reused; add `components/agent/measurement-form.tsx`, `order-card.tsx`, `commission-summary.tsx`.

---

## 4. Flutter conversion (`mobile-app-flutter/lib`)

| Layer | Decision | Notes |
|---|---|---|
| `main.dart`, `app.dart` (5-tab shell), splash/onboarding | KEEP | tabs Home/Saved/Sell/Messages/More → Home/Shop–Saved–Sell/Orders–Inbox–More |
| `core/network/api_client.dart`, `websocket_service.dart`, `token_storage.dart` | KEEP | single API contract, bearer, multipart, WS — untouched |
| `core/theme/*`, `core/config/app_config.dart` | KEEP | swap palette + tagline/packageId to Hachalu |
| `core/constants/listing_options.dart` | REPLACE | regions→ genders, brands, countries (China/Turkey/Korea/America/Other), sizes, categories, fabrics |
| `data/models/property.dart`, `vehicle.dart`, `listing_item.dart` | REPLACE | → `product.dart`, `product_variant.dart`, `product_item.dart` |
| `data/models/user.dart`, `payment.dart`, `message.dart`, `notification.dart`, `review.dart`, `announcement.dart`, `listing_agent.dart` | KEEP | seller/merchant contact model |
| `data/models/admin.dart` | MODIFY | KYC stays; add worker, material, machine models |
| **NEW models** | ADD | `order.dart`, `order_item.dart`, `measurement.dart`, `measurement_template.dart`, `production_job.dart`, `commission.dart` |
| `data/repositories/*` | MODIFY | endpoints swapped to `/api/products`, `/api/orders`, `/api/measurements`, `/api/production`, `/api/inventory`, `/api/commissions`; auth/message/notification/review/settings/announcement repos kept |
| `features/home/*` | MODIFY | home = product feed (ready-made + custom), categories = gender/brand/category, about/how-to/hire guide rewritten |
| `features/listings/listing_detail_screen.dart`, `agent_rating_section.dart` | REPLACE | → product detail (gallery, size/color, buy / custom-order, reviews, chat) |
| `features/saved`, `features/sell` | MODIFY | saved = products; sell = product/custom chooser |
| `features/agent/*` | MODIFY | seller/ambassador portal: products + orders + measurements + commissions + KYC kept |
| `features/admin/*` | MODIFY | add orders, production (job board, machine/inventory placeholders), commissions tabs |
| `providers/*` | MODIFY | add `CartProvider`, `OrderProvider`, `ProductProvider`; keep AuthProvider/HomeProvider/SavedProvider |
| `core/i18n/app_strings.dart` | MODIFY | real-estate strings → garment domain (keep en/am/om; rewrite `*_full` legal texts) |
| `core/notifications/push_notification_service.dart` | KEEP | deep-links `entityType/entityId` → product/order |

---

## 5. Roles & portals

| DawoLife | → | Hachalu | Entry points |
|---|---|---|---|
| `admin` | Admin (business manager) | web `/admin`, mobile AdminPortal | products, orders, sellers, workers, production, inventory, machines, payments, commissions, settings |
| `agent` | Seller / Ambassador | web `/seller`, mobile AgentPortal | product mgmt, customer orders + measurements, sales, commissions |
| `owner` | Wholesale / wardrobe owner | same as seller + bulk | list products, wholesale |
| `user` | Buyer / Customer | web shop `/`, mobile AppShell | browse, cart, buy, custom-order (measurements), track, review, chat |
| **NEW** | `worker` (tailor) | admin-managed (no self signup) OR role | production job list, progress, QC |

`PermissionRequest` approval flow reused for edit/delete of Approved products; ADD one for order cancellation.

---

## 6. Key flows to implement (ADD)

1. **Ready-made checkout**: Product → Cart (web) / direct buy → Order → Payment (Chapa/TeleBirr) → PaymentConfirmed → Packed → Delivered → Completed. Reviews optional.
2. **Custom order**: product/design selection → customer or ambassador enters measurement (template-driven) + upload reference photo → CustomOrder created → Payment (`custom_order`) → MeasurementConfirmed → admin assigns Worker → ProductionStarted → 25/50/75 → Ready → QualityCheck → Shop/Delivery → Completed.
3. **Production board**: `ProductionJob` per custom order; admin assigns worker(s), worker updates progress; admin sees worker × job × progress table + machines available/in-use + material inventory.
4. **Measurement system**: `MeasurementTemplate` (name, fields JSON) → `CustomerMeasurement` (templateId + values JSON + photo). Templates seeded: Male Suit, Female Suit, Child Suit, Trouser, Shirt. Flexible (not hard-coded).
5. **Commission**: `Commission` rows on order completion for ambassador (`rate` configurable in `Setting` or per-seller), shown in seller dashboard + admin payouts.
6. **Product gallery requirement**: ≥4 images (front/back/left/right) enforced on create (`images.length >= 4`); seated front/back optional.
7. **Brands & categories configurable** from admin (no hard-coding of China/Turkey/Korea/America/Other).

---

## 7. Build order (phases)

| Phase | Scope | Definition of done | Status |
|---|---|---|---|
| 1 | Clone & protect | `hachalu-protocol/` created, git clean, DawoLife untouched | ✅ |
| 2 | Audit + conversion map | this file | ✅ |
| 3 | DB design | rewrite `schema.prisma` (+ seed), migration, `prisma generate` | ✅ |
| 4 | Backend | products/categories/orders/measurements/production/workers/inventory/commissions routes; rebrand constants; keep auth/uploads/messages/notifications/payments | ✅ (admin orders/production/inventory/machines/commissions + seller routes verified live) |
| 5 | Web | home→shop, product detail, wizards, admin+seller portals, cart/checkout, measurement form | ✅ (all routes build; admin workers/machines/inventory/commissions + agent dashboard/products/orders/commissions implemented; some legacy DawoLife pages remain reachable but hidden) |
| 6 | Flutter | models/repos/screens per §4 | ✅ (`flutter analyze` 0 errors, debug APK builds) |
| 7 | E2E test | buyer→order→payment→production→QC→delivery (web + mobile) | ✅ (server smoke 30/30; mobile device smoke still manual) |
| 8 | Deploy | Render/cPanel parity: envs, DB reset, seed | ⏳ pending go-ahead |

Notes / known gaps at end of Phase 7:
- Payments remain read-only: `deliveryInfo.paymentMethod` records Chapa/TeleBirr/Cash; no gateway transaction is initiated on order create.
- `app/admin/users` and `app/admin/settings` still render the DawoLife property/vehicle admin surface (sidebar-hidden).
- Mobile-launch icons/plash assets are Stale-brand leftovers; splash screen now uses a text-based Hachalu brand mark; `louncher_icon.png` and related images were removed.
- E2E runs accumulate dev-data rows (smoke products/orders/workers in the dev DB) — safe to reset.

---

## 8. Do NOT touch (in this worktree)

- `D:\Dawolife.worktrees\fullstack` — the original DawoLife repo stays untouched.
- All work proceeds from `D:\Dawolife.worktrees\hachalu-protocol`.

Next step if continuing: **Phase 8 (deploy)** — Hachalu env vars, DB reset + reseed, Render/cPanel parity, then manual mobile E2E against the live URL.