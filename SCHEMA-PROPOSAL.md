# Hachalu Protocol — Proposed Prisma Schema (v1 for approval)

Status: **PROPOSAL — NOT APPLIED.** `server/prisma/schema.prisma` is unchanged.
This is the exact schema to implement in Phase 3 after approval.
All new domain models use `**@map("hachalu_*")` namespacing so a Hachalu DB can coexist cleanly.
Existing reusable models are left structurally intact (only enums/columns listed in §5 change).

---

## 1. Principle

- **REUSE (unchanged):** `User`, `DeviceToken`, `Notification`, `Message`, `Announcement`, `Setting`, `SavedItem`, `PermissionRequest`, `Review`, `Payment`.
- **REDESIGN (deleted):** `Property`, `Vehicle` (replaced by `Product`/`ProductVariant`).
- **ADD (new):** `Category`, `Brand`, `ColorOption`, `SizeOption`, `Product`, `ProductVariant`, `MeasurementTemplate`, `CustomerMeasurement`, `Order`, `OrderItem`, `ProductionJob`, `Worker`, `WorkerAssignment`, `Machine`, `Material`, `StockMovement`, `Commission`, `Shop`, `ProductReview`.
- **Rental:** removed entirely (property/vehicle rental enums, rate fields, `Rented` statuses).

---

## 2. Enums

```prisma
enum UserRole {          // existing + worker
  admin
  agent
  owner
  user
  worker
}

enum UserStatus {         // KEEP
  Pending
  Approved
  Rejected
  Suspended
}

enum ProductStatus {      // replaces PropertyStatus + VehicleStatus
  Draft
  Pending
  Approved
  Rejected
  OutOfStock
  Archived
}

enum ProductGender {
  Male
  Female
  Child
  Unisex
}

// ready-made shipment lifecycle
enum OrderStatus {
  PendingPayment
  Paid
  MeasurementPending      // custom only
  MeasurementConfirmed    // custom only
  InProduction            // custom only
  Assigned
  Packed
  Delivered
  Completed
  Cancelled
  Refunded
}

enum OrderType {
  ready_made
  custom
}

enum PaymentStatus {      // KEEP
  Pending
  Completed
  Failed
  Refunded
  Expired
}

enum PaymentMethod {      // KEEP
  chapa
  telebirr
}

enum SavedItemType {      // amend values
  product
}

// production sub-workflow of a custom order
enum JobStatus {
  Assigned
  Started
  InProgress25
  InProgress50
  InProgress75
  Ready
  QualityCheck
  Completed
}

enum WorkerStatus {
  Available
  Busy
  OnLeave
  Inactive
}

enum MachineStatus {
  Available
  InUse
  Maintenance
  Disabled
}

enum MaterialCategory {
  Fabric
  Thread
  Buttons
  Zippers
  Lining
  Other
}

enum MovementType {
  In
  Out
}

enum CommissionStatus {
  Pending
  Paid
  Void
}

enum PermissionType {     // KEEP
  EDIT
  DELETE
}

enum PermissionStatus {   // KEEP
  Pending
  Approved
  Rejected
}

enum PermissionEntityType { // amend values
  PRODUCT
  ORDER
}

enum ShopStatus {
  Active
  Inactive
}

enum Unit {
  meter
  piece
  roll
  kg
  pack
  other
}

enum MeasurementUnit {
  cm
  inch
  meter
}
```

---

## 3. Existing models — precise changes

### `User` (KEEP, +relations, +`worker` role already in enum)
Add relations:

```prisma
  products           Product[]
  variants           ProductVariant[]         // createdBy? (not needed)
  customOrders       Order[]                  @relation("orderCustomers")
  sellerOrders       Order[]                  @relation("orderSellers")
  measurements       CustomerMeasurement[]
  productionJobs     ProductionJob[]
  workerAssignments  WorkerAssignment[]
  commissions        Commission[]
  stocks             StockMovement[]
  productReviews     ProductReview[]
  worker             Worker?
```

### `SavedItem` (KEEP — enum value changes to `product`)
- `SavedItemType` → only `product`.

### `PermissionRequest` (KEEP — enum value changes)
- `PermissionEntityType` → `PRODUCT`, `ORDER`.

### `Payment` (MODIFY — property refs → order refs; no FK enforced, matches existing loose-string style)
```prisma
model Payment {
  ...
  orderId        String?          // replaced propertyId
  orderTitle     String?          // replaced propertyTitle
  notificationData Json?
  ...
}
```
`Payment.paymentType` values used going forward: `product_sale` | `custom_order` | `service_charge`.

### `Message` (MODIFY — thread key productId)
```prisma
model Message {
  id            String @id @default(uuid()) @db.Uuid
  productId     String              // replaced propertyId (thread key, no FK)
  senderId      String @db.Uuid
  ...
}
```

### `Review` (KEEP — seller/agent rating, unchanged)
Product ratings use the new `ProductReview` model (§4.17) so existing agent-review behaviour is untouched.

### `Setting` (MODIFY — add configurable business defaults)
```prisma
model Setting {
  ...
  defaultCommissionRate Float?          // e.g. 0.10 = 10%
  lowStockThreshold     Int?            // default 10 for low-stock alerts
  ...
}
```

### `Notification` / `Announcement` / `DeviceToken` (KEEP — no change)

---

## 4. New models (full definitions)

```prisma
// ── Configurable reference data (admin-managed) ─────────────────────────────
model Category {
  id          String       @id @default(uuid()) @db.Uuid
  name        String       @db.VarChar(100)
  slug        String       @unique
  gender      ProductGender              // Male/Female/Child/Unisex
  description String?
  sortOrder   Int          @default(0)
  active      Boolean      @default(true)
  createdAt   DateTime     @default(now()) @db.Timestamptz(3)
  updatedAt   DateTime     @updatedAt @db.Timestamptz(3)

  products    Product[]
  templates   MeasurementTemplate[]
  @@unique([slug, gender])
  @@map("hachalu_categories")
}

model Brand {
  id        String   @id @default(uuid()) @db.Uuid
  name      String   @unique @db.VarChar(100)
  origin    String?                        // e.g. China/Turkey/Korea/America/Other
  active    Boolean  @default(true)
  createdAt DateTime @default(now()) @db.Timestamptz(3)
  updatedAt DateTime @updatedAt @db.Timestamptz(3)

  products  Product[]
  @@map("hachalu_brands")
}

model ColorOption {
  id       String   @id @default(uuid()) @db.Uuid
  name     String   @unique @db.VarChar(50)   // e.g. Black, Navy
  hex      String?  @db.VarChar(9)
  active   Boolean  @default(true)
  products ProductVariant[]
  @@map("hachalu_color_options")
}

model SizeOption {
  id          String   @id @default(uuid()) @db.Uuid
  name        String   @db.VarChar(30)        // e.g. 38, 40, L, XL
  sortOrder   Int     @default(0)
  active      Boolean  @default(true)
  createdAt   DateTime @default(now()) @db.Timestamptz(3)
  updatedAt   DateTime @updatedAt @db.Timestamptz(3)
  variants    ProductVariant[]
  @@unique([name])
  @@map("hachalu_size_options")
}

// ── Product domain ───────────────────────────────────────────────────────────
model Product {
  id             String          @id @default(uuid()) @db.Uuid
  name           String          @db.VarChar(200)
  slug           String          @unique
  description    String?         @db.Text
  categoryId     String          @db.Uuid
  gender         ProductGender
  ageGroup       String?         // e.g. Adult, Kids (free text, admin-managed)
  brandId        String?         @db.Uuid
  countryOfOrigin String?        // e.g. China, Turkey…
  fabric         String?         // material/fabric, free text
  isReadyMade    Boolean         @default(true)
  isCustomizable Boolean         @default(false)
  featured       Boolean         @default(false)
  status         ProductStatus   @default(Draft)
  rejectionReason String?
  // gallery: [ { position: front|back|left|right|seatedFront|seatedBack, url } ]
  images         Json            @default("[]")
  videoUrl       String?
  sellerId       String          @db.Uuid           // owner/agent who listed
  sellerName     String                             // snapshot for cards
  displayPhone   String?
  contactMode    String?         @default("Admin")  // Admin|Owner|Agent (reused)
  contactUserId  String?         @db.Uuid
  createdAt      DateTime        @default(now()) @db.Timestamptz(3)
  updatedAt      DateTime        @updatedAt @db.Timestamptz(3)

  category      Category      @relation(fields: [categoryId], references: [id])
  brand         Brand?        @relation(fields: [brandId], references: [id])
  seller        User          @relation(fields: [sellerId], references: [id])
  variants      ProductVariant[]
  orderItems    OrderItem[]
  reviews       ProductReview[]
  commissions   Commission[]

  @@index([sellerId])
  @@index([categoryId])
  @@index([status])
  @@index([createdAt])
  @@map("hachalu_products")
}

model ProductVariant {
  id          String    @id @default(uuid()) @db.Uuid
  sku         String    @unique
  productId   String    @db.Uuid
  sizeId      String?   @db.Uuid
  colorId     String?   @db.Uuid
  price       Float
  stock       Int       @default(0)
  status      String    @default("active")   // active | inactive | discontinued
  createdAt   DateTime  @default(now()) @db.Timestamptz(3)
  updatedAt   DateTime  @updatedAt @db.Timestamptz(3)

  product     Product    @relation(fields: [productId], references: [id], onDelete: Cascade)
  size        SizeOption? @relation(fields: [sizeId], references: [id])
  color       ColorOption? @relation(fields: [colorId], references: [id])
  orderItems  OrderItem[]

  @@unique([productId, sizeId, colorId])
  @@index([productId])
  @@map("hachalu_product_variants")
}

// ── Measurement domain ───────────────────────────────────────────────────────
model MeasurementTemplate {
  id         String   @id @default(uuid()) @db.Uuid
  name       String   @db.VarChar(100)     // Male Suit, Female Suit, Child Suit…
  categoryId String?  @db.Uuid
  // fields: [ { key, label, unit: cm|inch, required, min?, max? } ]
  fields     Json     @default("[]")
  active     Boolean  @default(true)
  sortOrder  Int      @default(0)
  createdAt  DateTime @default(now()) @db.Timestamptz(3)
  updatedAt  DateTime @updatedAt @db.Timestamptz(3)

  category      Category?           @relation(fields: [categoryId], references: [id])
  measurements  CustomerMeasurement[]
  @@index([categoryId])
  @@map("hachalu_measurement_templates")
}

model CustomerMeasurement {
  id            String   @id @default(uuid()) @db.Uuid
  templateId    String   @db.Uuid
  customerId    String   @db.Uuid              // buyer (or seller entering for customer)
  enteredById   String?  @db.Uuid              // ambassador who entered on behalf
  orderId       String?  @db.Uuid
  // values: { key: number } derived from template.fields
  values        Json     @default("{}")
  unit          MeasurementUnit @default(cm)
  notes         String?
  referencePhoto String?                        // optional reference image
  createdAt     DateTime @default(now()) @db.Timestamptz(3)
  updatedAt     DateTime @updatedAt @db.Timestamptz(3)

  template  MeasurementTemplate @relation(fields: [templateId], references: [id])
  customer  User                @relation(fields: [customerId], references: [id])
  @@index([customerId])
  @@index([templateId])
  @@index([orderId])
  @@map("hachalu_customer_measurements")
}

// ── Commerce domain ──────────────────────────────────────────────────────────
model Order {
  id           String     @id @default(uuid()) @db.Uuid
  orderNumber  String     @unique               // e.g. HCL-2026-0001
  type         OrderType
  customerId   String     @db.Uuid
  sellerId     String?    @db.Uuid              // ambassador/seller
  shopId       String?    @db.Uuid              // pickup/delivery branch
  status       OrderStatus @default(PendingPayment)
  totalPrice   Float
  paymentStatus String?    @default("Pending")  // mirrors Payment for quick UI
  deliveryInfo Json?                             // address/phone/pickup notes
  notes        String?
  cancelledReason String?
  createdAt    DateTime   @default(now()) @db.Timestamptz(3)
  updatedAt    DateTime   @updatedAt @db.Timestamptz(3)

  customer       User            @relation("orderCustomers", fields: [customerId], references: [id])
  seller         User?           @relation("orderSellers", fields: [sellerId], references: [id])
  shop           Shop?           @relation(fields: [shopId], references: [id])
  items          OrderItem[]
  productionJobs ProductionJob[]
  measurements   CustomerMeasurement[]
  payments       Payment[]       // via orderId string (no FK) — see §3
  commissions    Commission[]

  @@index([customerId])
  @@index([sellerId])
  @@index([status])
  @@index([createdAt])
  @@map("hachalu_orders")
}

model OrderItem {
  id          String   @id @default(uuid()) @db.Uuid
  orderId     String   @db.Uuid
  type        OrderType
  productId   String?  @db.Uuid
  variantId   String?  @db.Uuid
  quantity    Int      @default(1)
  unitPrice   Float
  subtotal    Float
  // custom-only extras
  templateId  String?  @db.Uuid
  measurementId String? @db.Uuid
  styleNotes  Json?                          // fabric/color/style selections (id→name snapshots)
  status      String   @default("active")

  order       Order              @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product     Product?           @relation(fields: [productId], references: [id])
  variant     ProductVariant?    @relation(fields: [variantId], references: [id])
  template    MeasurementTemplate? @relation(fields: [templateId], references: [id])
  measurement CustomerMeasurement? @relation(fields: [measurementId], references: [id])
  productionJobs ProductionJob[]

  @@index([orderId])
  @@index([productId])
  @@map("hachalu_order_items")
}

// ── Production domain ─────────────────────────────────────────────────────────
model Worker {
  id            String      @id @default(uuid()) @db.Uuid
  userId        String      @unique @db.Uuid     // login account (admin-created, role: worker)
  specialty     String?                           // Suit/Trouser/Shirt…
  phone         String?
  status        WorkerStatus @default(Available)
  machineId     String?      @db.Uuid
  createdAt     DateTime    @default(now()) @db.Timestamptz(3)
  updatedAt     DateTime    @updatedAt @db.Timestamptz(3)

  user          User         @relation(fields: [userId], references: [id])
  machine       Machine?     @relation(fields: [machineId], references: [id])
  jobs          WorkerAssignment[]
  productionJobs ProductionJob[]
  @@index([status])
  @@map("hachalu_workers")
}

model Machine {
  id              String        @id @default(uuid()) @db.Uuid
  name            String        @db.VarChar(100)   // e.g. Industrial Overlock
  type            String?
  code            String?       @unique
  status          MachineStatus @default(Available)
  location        String?
  maintenanceNotes String?
  lastMaintenance DateTime?     @db.Timestamptz(3)
  nextMaintenance DateTime?     @db.Timestamptz(3)
  createdAt       DateTime      @default(now()) @db.Timestamptz(3)
  updatedAt       DateTime      @updatedAt @db.Timestamptz(3)

  workers Worker[]
  @@index([status])
  @@map("hachalu_machines")
}

model ProductionJob {
  id            String    @id @default(uuid()) @db.Uuid
  orderId       String    @db.Uuid
  orderItemId   String?   @db.Uuid
  productId     String?   @db.Uuid
  status        JobStatus @default(Assigned)
  startTime     DateTime? @db.Timestamptz(3)
  endTime       DateTime? @db.Timestamptz(3)
  notes         String?
  qcStatus      String?   @default("Pending")   // Pending | Passed | Rework
  createdAt     DateTime  @default(now()) @db.Timestamptz(3)
  updatedAt     DateTime  @updatedAt @db.Timestamptz(3)

  order     Order           @relation(fields: [orderId], references: [id])
  orderItem OrderItem?      @relation(fields: [orderItemId], references: [id])
  product   Product?        @relation(fields: [productId], references: [id])
  assignees WorkerAssignment[]

  @@index([orderId])
  @@index([status])
  @@map("hachalu_production_jobs")
}

model WorkerAssignment {
  id           String   @id @default(uuid()) @db.Uuid
  jobId        String   @db.Uuid
  workerId     String   @db.Uuid
  role         String?  @default("tailor")
  assignedAt   DateTime @default(now()) @db.Timestamptz(3)
  completedAt  DateTime? @db.Timestamptz(3)

  job     ProductionJob @relation(fields: [jobId], references: [id], onDelete: Cascade)
  worker  Worker        @relation(fields: [workerId], references: [id])
  @@unique([jobId, workerId])
  @@index([workerId])
  @@map("hachalu_worker_assignments")
}

// ── Inventory domain ─────────────────────────────────────────────────────────
model Material {
  id             String           @id @default(uuid()) @db.Uuid
  name           String           @db.VarChar(100)
  category       MaterialCategory
  unit           Unit             @default(meter)
  currentQuantity Float            @default(0)
  minStockLevel   Float            @default(10)
  notes          String?
  createdAt      DateTime         @default(now()) @db.Timestamptz(3)
  updatedAt      DateTime         @updatedAt @db.Timestamptz(3)

  movements StockMovement[]
  @@index([category])
  @@map("hachalu_materials")
}

model StockMovement {
  id          String       @id @default(uuid()) @db.Uuid
  materialId  String       @db.Uuid
  type        MovementType          // In / Out
  quantity    Float
  note        String?
  orderId     String?               // linked order when stock-out is for an order
  createdById String?     @db.Uuid
  createdAt   DateTime    @default(now()) @db.Timestamptz(3)

  material Material @relation(fields: [materialId], references: [id], onDelete: Cascade)
  @@index([materialId])
  @@index([createdAt])
  @@map("hachalu_stock_movements")
}

// ── Commission & shops ───────────────────────────────────────────────────────
model Commission {
  id          String           @id @default(uuid()) @db.Uuid
  sellerId    String           @db.Uuid
  orderId     String           @db.Uuid
  productId   String?          @db.Uuid
  rate        Float                             // snapshot of rate used
  amount      Float
  status      CommissionStatus @default(Pending)
  paidAt      DateTime?        @db.Timestamptz(3)
  createdAt   DateTime         @default(now()) @db.Timestamptz(3)
  updatedAt   DateTime         @updatedAt @db.Timestamptz(3)

  seller  User    @relation(fields: [sellerId], references: [id])
  order   Order   @relation(fields: [orderId], references: [id])
  product Product? @relation(fields: [productId], references: [id])
  @@index([sellerId])
  @@index([orderId])
  @@index([status])
  @@map("hachalu_commissions")
}

model Shop {
  id        String     @id @default(uuid()) @db.Uuid
  name      String     @db.VarChar(150)
  city      String?
  address   String?
  phones    Json       @default("[]")
  status    ShopStatus @default(Active)
  createdAt DateTime   @default(now()) @db.Timestamptz(3)
  updatedAt DateTime   @updatedAt @db.Timestamptz(3)

  orders Order[]
  @@map("hachalu_shops")
}

// ── Product reviews (net-new; agent `Review` kept untouched) ────────────────
model ProductReview {
  id          String   @id @default(uuid()) @db.Uuid
  productId   String   @db.Uuid
  orderId     String?  @db.Uuid
  userId      String   @db.Uuid
  rating      Int
  comment     String?
  createdAt   DateTime @default(now()) @db.Timestamptz(3)
  updatedAt   DateTime @updatedAt @db.Timestamptz(3)

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id])
  @@unique([userId, productId])
  @@index([productId])
  @@map("hachalu_product_reviews")
}
```

---

## 5. Full inventory of schema changes to `schema.prisma`

| Action | Item |
|---|---|
| MODIFY enum | `UserRole` + `worker` |
| MODIFY enum | `SavedItemType` → `product` only |
| MODIFY enum | `PermissionEntityType` → `PRODUCT`, `ORDER` |
| DELETE enum | `PropertyStatus`, `VehicleStatus` |
| KEEP enum | `UserStatus`, `PaymentStatus`, `PaymentMethod`, `PermissionType`, `PermissionStatus` |
| DELETE model | `Property`, `Vehicle` |
| MODIFY model | `Payment`: `propertyId/PropertyTitle` → `orderId/orderTitle` |
| MODIFY model | `Message`: `propertyId` → `productId` |
| MODIFY model | `Setting`: + `defaultCommissionRate`, `lowStockThreshold` |
| KEEP model | `User` (+relations), `DeviceToken`, `Notification`, `Announcement`, `SavedItem`, `PermissionRequest`, `Review` |
| ADD model | `Category`, `Brand`, `ColorOption`, `SizeOption`, `Product`, `ProductVariant`, `MeasurementTemplate`, `CustomerMeasurement`, `Order`, `OrderItem`, `ProductionJob`, `Worker`, `WorkerAssignment`, `Machine`, `Material`, `StockMovement`, `Commission`, `Shop`, `ProductReview` |

---

## 6. Decisions requiring your confirmation

| # | Decision | Recommendation | Alternatives |
|---|---|---|---|
| D1 | **Database target** | Create new local Docker Postgres `hachalu` (uncomment `db` service in `docker-compose.yml`) + dedicated `server/.env` with `DATABASE_URL=hachalu`. Keep Neon/DawoLife prod untouched. | Neon dev project (needs account/credentials); reuse existing prod DB (NOT recommended) |
| D2 | **Cart persistence** | Client-side cart (web localStorage, Flutter memory+prefs) → `OrderItem` only at checkout. No `Cart` tables. | Server-side `Cart`/`CartItem` tables |
| D3 | **Worker accounts** | Add `worker` to `UserRole`; admin creates a `User` (worker login) + `Worker` profile row. Required because Phase 7 tests "Worker: Login". | Standalone `Worker` rows with no login |
| D4 | **Commission trigger** | `Commission` row auto-created when order → `Completed`; `rate` snapshot taken from `Setting.defaultCommissionRate` (overridable per-order by admin). | Per-seller override column on `User` |
| D5 | **Ready vs Custom orders** | One `Order` model with `type` enum (+ `OrderItem.type`); custom items carry `templateId`/`measurementId`/`styleNotes`. Avoids duplicated order system. | Separate `CustomOrder`, `ReadyOrder` tables |
| D6 | **Measurement values** | `values Json { key: number }` derived from `template.fields` (flexible, no hard-coded columns). | Static columns per template (rejected — violates §12) |
| D7 | **Payment ↔ Order link** | Loose `orderId` string on `Payment` (mirrors existing `propertyId` pattern, simplest migration). | Real FK from `Payment.orderId` → `Order.id` (needs typed join; can upgrade later) |
| D8 | **Product gallery rule** | Enforce `images.length >= 4` server-side on create when `isReadyMade`; positions `front/back/left/right`, optional `seatedFront/seatedBack`. | No enforcement |
| D9 | **Shop/branch** | Lightweight `Shop` model (order source/pickup). Optional in v1 — defer if not needed. | Defer entirely |

---

## 7. Pending open questions (need answers before writing migration)

1. Confirm D1: local Docker Postgres OK? Do you have Docker available? If not, we need a Neon/dev `DATABASE_URL` for Hachalu.
2. Confirm D3: workers get real login accounts (role `worker`, admin-created)? 
3. Confirm D4: commission created at `Completed` only; rate = global default in `Setting` for v1?
4. Confirm D9: include `Shop` in v1 or defer?
5. Anything in §2 enums / §4 fields you want renamed, removed, or added before approval?

---

## 8. Phase 3 execution plan (after approval)

1. `npm install` in `server/` (deps not present in clean clone).
2. Create local `server/.env` (DATABASE_URL → `hachalu` DB, dev JWT/secrets, `ALLOW_ALL_ORIGINS=1`).
3. Apply this schema to `server/prisma/schema.prisma`.
4. `npx prisma migrate dev --name hachalu_domain` (fresh Hachalu DB — no reset against any existing DB).
5. `npx prisma generate`.
6. Update `server/src/seed.ts` → Hachalu seed (admin, sample categories/brands/colors/sizes, measurement templates, sample products).
7. `npm run build` (tsc typecheck) — fix compile errors.
8. Verify `/api/health` + `prisma migrate status` clean.