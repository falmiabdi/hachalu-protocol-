-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'agent', 'owner', 'user', 'worker');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('Pending', 'Approved', 'Rejected', 'Suspended');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('Draft', 'Pending', 'Approved', 'Rejected', 'OutOfStock', 'Archived');

-- CreateEnum
CREATE TYPE "ProductGender" AS ENUM ('Male', 'Female', 'Child', 'Unisex');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PendingPayment', 'Paid', 'MeasurementPending', 'MeasurementConfirmed', 'Assigned', 'InProduction', 'Packed', 'Delivered', 'Completed', 'Cancelled', 'Refunded');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('ready_made', 'custom');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('Pending', 'Completed', 'Failed', 'Refunded', 'Expired');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('chapa', 'telebirr');

-- CreateEnum
CREATE TYPE "SavedItemType" AS ENUM ('product');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('Assigned', 'Started', 'InProgress25', 'InProgress50', 'InProgress75', 'Ready', 'QualityCheck', 'Completed');

-- CreateEnum
CREATE TYPE "WorkerStatus" AS ENUM ('Available', 'Busy', 'OnLeave', 'Inactive');

-- CreateEnum
CREATE TYPE "MachineStatus" AS ENUM ('Available', 'InUse', 'Maintenance', 'Disabled');

-- CreateEnum
CREATE TYPE "MaterialCategory" AS ENUM ('Fabric', 'Thread', 'Buttons', 'Zippers', 'Lining', 'Other');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('In', 'Out');

-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('meter', 'piece', 'roll', 'kg', 'pack', 'other');

-- CreateEnum
CREATE TYPE "MeasurementUnit" AS ENUM ('cm', 'inch', 'meter');

-- CreateEnum
CREATE TYPE "PermissionType" AS ENUM ('EDIT', 'DELETE');

-- CreateEnum
CREATE TYPE "PermissionStatus" AS ENUM ('Pending', 'Approved', 'Rejected');

-- CreateEnum
CREATE TYPE "PermissionEntityType" AS ENUM ('PRODUCT', 'ORDER');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "roles" JSONB NOT NULL DEFAULT '[]',
    "status" "UserStatus" NOT NULL DEFAULT 'Pending',
    "rejectionReason" TEXT,
    "isRootAdmin" BOOLEAN NOT NULL DEFAULT false,
    "profilePhoto" TEXT,
    "phone" TEXT,
    "documents" JSONB NOT NULL DEFAULT '[]',
    "education" JSONB NOT NULL DEFAULT '[]',
    "professionalInfo" JSONB,
    "profile" JSONB NOT NULL DEFAULT '{}',
    "firebaseUid" TEXT,
    "authProvider" TEXT DEFAULT 'email',
    "lastLoginAt" TIMESTAMPTZ(3),
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMPTZ(3),
    "verificationToken" TEXT,
    "otp" VARCHAR(6),
    "otpExpiresAt" TIMESTAMPTZ(3),
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'android',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hachalu_categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" TEXT NOT NULL,
    "gender" "ProductGender" NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "hachalu_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hachalu_brands" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "origin" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "hachalu_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hachalu_color_options" (
    "id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "hex" VARCHAR(9),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "hachalu_color_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hachalu_size_options" (
    "id" UUID NOT NULL,
    "name" VARCHAR(30) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "hachalu_size_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hachalu_products" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" UUID NOT NULL,
    "gender" "ProductGender" NOT NULL,
    "ageGroup" TEXT,
    "brandId" UUID,
    "countryOfOrigin" TEXT,
    "fabric" TEXT,
    "isReadyMade" BOOLEAN NOT NULL DEFAULT true,
    "isCustomizable" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" "ProductStatus" NOT NULL DEFAULT 'Draft',
    "rejectionReason" TEXT,
    "images" JSONB NOT NULL DEFAULT '[]',
    "videoUrl" TEXT,
    "sellerId" UUID NOT NULL,
    "sellerName" TEXT NOT NULL,
    "displayPhone" TEXT,
    "contactMode" TEXT DEFAULT 'Admin',
    "contactUserId" UUID,
    "views" INTEGER NOT NULL DEFAULT 0,
    "favorites" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "hachalu_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hachalu_product_variants" (
    "id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "productId" UUID NOT NULL,
    "sizeId" UUID,
    "colorId" UUID,
    "price" DOUBLE PRECISION NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "hachalu_product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hachalu_measurement_templates" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "categoryId" UUID,
    "fields" JSONB NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "hachalu_measurement_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hachalu_customer_measurements" (
    "id" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "enteredById" UUID,
    "orderId" TEXT,
    "values" JSONB NOT NULL DEFAULT '{}',
    "unit" "MeasurementUnit" NOT NULL DEFAULT 'cm',
    "notes" TEXT,
    "referencePhoto" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "hachalu_customer_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hachalu_orders" (
    "id" UUID NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "type" "OrderType" NOT NULL,
    "customerId" UUID NOT NULL,
    "sellerId" UUID,
    "status" "OrderStatus" NOT NULL DEFAULT 'PendingPayment',
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "paymentStatus" TEXT DEFAULT 'Pending',
    "deliveryInfo" JSONB,
    "notes" TEXT,
    "cancelledReason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "hachalu_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hachalu_order_items" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "type" "OrderType" NOT NULL,
    "productId" UUID,
    "variantId" UUID,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "templateId" UUID,
    "measurementId" TEXT,
    "styleNotes" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "hachalu_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hachalu_workers" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "specialty" TEXT,
    "phone" TEXT,
    "status" "WorkerStatus" NOT NULL DEFAULT 'Available',
    "machineId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "hachalu_workers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hachalu_machines" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" TEXT,
    "code" TEXT,
    "status" "MachineStatus" NOT NULL DEFAULT 'Available',
    "location" TEXT,
    "maintenanceNotes" TEXT,
    "lastMaintenance" TIMESTAMPTZ(3),
    "nextMaintenance" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "hachalu_machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hachalu_production_jobs" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "orderItemId" UUID,
    "productId" UUID,
    "status" "JobStatus" NOT NULL DEFAULT 'Assigned',
    "startTime" TIMESTAMPTZ(3),
    "endTime" TIMESTAMPTZ(3),
    "notes" TEXT,
    "qcStatus" TEXT DEFAULT 'Pending',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "hachalu_production_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hachalu_worker_assignments" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "role" TEXT DEFAULT 'tailor',
    "assignedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),

    CONSTRAINT "hachalu_worker_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hachalu_materials" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "category" "MaterialCategory" NOT NULL,
    "unit" "Unit" NOT NULL DEFAULT 'meter',
    "currentQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minStockLevel" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "hachalu_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hachalu_stock_movements" (
    "id" UUID NOT NULL,
    "materialId" UUID NOT NULL,
    "type" "MovementType" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "orderId" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hachalu_stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "orderId" TEXT NOT NULL,
    "merchOrderId" TEXT NOT NULL,
    "txRef" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'Pending',
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "method" "PaymentMethod" NOT NULL,
    "paymentType" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "buyerPhone" TEXT NOT NULL,
    "orderTitle" TEXT,
    "notificationData" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMPTZ(3),
    "data" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "productId" TEXT NOT NULL,
    "senderId" UUID NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "recipientId" UUID NOT NULL,
    "recipientName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_items" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "itemType" "SavedItemType" NOT NULL,
    "itemId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "saved_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "contactPhone1" TEXT,
    "contactPhone2" TEXT,
    "contactPhone3" TEXT,
    "contactEmail" TEXT,
    "socialFacebook" TEXT,
    "socialTelegram" TEXT,
    "socialWhatsapp" TEXT,
    "socialTiktok" TEXT,
    "socialLinkedin" TEXT,
    "socialInstagram" TEXT,
    "socialYoutube" TEXT,
    "lowStockThreshold" INTEGER DEFAULT 10,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "reviewerId" UUID NOT NULL,
    "agentId" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hachalu_product_reviews" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "orderId" UUID,
    "userId" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "hachalu_product_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_requests" (
    "id" UUID NOT NULL,
    "type" "PermissionType" NOT NULL,
    "entityType" "PermissionEntityType" NOT NULL,
    "entityId" UUID NOT NULL,
    "requesterId" UUID NOT NULL,
    "status" "PermissionStatus" NOT NULL DEFAULT 'Pending',
    "reason" TEXT,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMPTZ(3),
    "decidedById" UUID,

    CONSTRAINT "permission_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_firebaseUid_key" ON "users"("firebaseUid");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");

-- CreateIndex
CREATE INDEX "device_tokens_userId_idx" ON "device_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "hachalu_categories_slug_key" ON "hachalu_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "hachalu_categories_slug_gender_key" ON "hachalu_categories"("slug", "gender");

-- CreateIndex
CREATE UNIQUE INDEX "hachalu_brands_name_key" ON "hachalu_brands"("name");

-- CreateIndex
CREATE UNIQUE INDEX "hachalu_color_options_name_key" ON "hachalu_color_options"("name");

-- CreateIndex
CREATE UNIQUE INDEX "hachalu_size_options_name_key" ON "hachalu_size_options"("name");

-- CreateIndex
CREATE UNIQUE INDEX "hachalu_products_slug_key" ON "hachalu_products"("slug");

-- CreateIndex
CREATE INDEX "hachalu_products_sellerId_idx" ON "hachalu_products"("sellerId");

-- CreateIndex
CREATE INDEX "hachalu_products_categoryId_idx" ON "hachalu_products"("categoryId");

-- CreateIndex
CREATE INDEX "hachalu_products_status_idx" ON "hachalu_products"("status");

-- CreateIndex
CREATE INDEX "hachalu_products_createdAt_idx" ON "hachalu_products"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "hachalu_product_variants_sku_key" ON "hachalu_product_variants"("sku");

-- CreateIndex
CREATE INDEX "hachalu_product_variants_productId_idx" ON "hachalu_product_variants"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "hachalu_product_variants_productId_sizeId_colorId_key" ON "hachalu_product_variants"("productId", "sizeId", "colorId");

-- CreateIndex
CREATE INDEX "hachalu_measurement_templates_categoryId_idx" ON "hachalu_measurement_templates"("categoryId");

-- CreateIndex
CREATE INDEX "hachalu_customer_measurements_customerId_idx" ON "hachalu_customer_measurements"("customerId");

-- CreateIndex
CREATE INDEX "hachalu_customer_measurements_templateId_idx" ON "hachalu_customer_measurements"("templateId");

-- CreateIndex
CREATE INDEX "hachalu_customer_measurements_orderId_idx" ON "hachalu_customer_measurements"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "hachalu_orders_orderNumber_key" ON "hachalu_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "hachalu_orders_customerId_idx" ON "hachalu_orders"("customerId");

-- CreateIndex
CREATE INDEX "hachalu_orders_sellerId_idx" ON "hachalu_orders"("sellerId");

-- CreateIndex
CREATE INDEX "hachalu_orders_status_idx" ON "hachalu_orders"("status");

-- CreateIndex
CREATE INDEX "hachalu_orders_createdAt_idx" ON "hachalu_orders"("createdAt");

-- CreateIndex
CREATE INDEX "hachalu_order_items_orderId_idx" ON "hachalu_order_items"("orderId");

-- CreateIndex
CREATE INDEX "hachalu_order_items_productId_idx" ON "hachalu_order_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "hachalu_workers_userId_key" ON "hachalu_workers"("userId");

-- CreateIndex
CREATE INDEX "hachalu_workers_status_idx" ON "hachalu_workers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "hachalu_machines_code_key" ON "hachalu_machines"("code");

-- CreateIndex
CREATE INDEX "hachalu_machines_status_idx" ON "hachalu_machines"("status");

-- CreateIndex
CREATE INDEX "hachalu_production_jobs_orderId_idx" ON "hachalu_production_jobs"("orderId");

-- CreateIndex
CREATE INDEX "hachalu_production_jobs_status_idx" ON "hachalu_production_jobs"("status");

-- CreateIndex
CREATE INDEX "hachalu_worker_assignments_workerId_idx" ON "hachalu_worker_assignments"("workerId");

-- CreateIndex
CREATE UNIQUE INDEX "hachalu_worker_assignments_jobId_workerId_key" ON "hachalu_worker_assignments"("jobId", "workerId");

-- CreateIndex
CREATE INDEX "hachalu_materials_category_idx" ON "hachalu_materials"("category");

-- CreateIndex
CREATE INDEX "hachalu_stock_movements_materialId_idx" ON "hachalu_stock_movements"("materialId");

-- CreateIndex
CREATE INDEX "hachalu_stock_movements_createdAt_idx" ON "hachalu_stock_movements"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "payments_orderId_key" ON "payments"("orderId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_createdAt_idx" ON "payments"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_readAt_idx" ON "notifications"("readAt");

-- CreateIndex
CREATE INDEX "messages_productId_idx" ON "messages"("productId");

-- CreateIndex
CREATE INDEX "messages_senderId_idx" ON "messages"("senderId");

-- CreateIndex
CREATE INDEX "messages_recipientId_idx" ON "messages"("recipientId");

-- CreateIndex
CREATE INDEX "messages_createdAt_idx" ON "messages"("createdAt");

-- CreateIndex
CREATE INDEX "announcements_authorId_idx" ON "announcements"("authorId");

-- CreateIndex
CREATE INDEX "announcements_createdAt_idx" ON "announcements"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "saved_items_userId_itemType_itemId_key" ON "saved_items"("userId", "itemType", "itemId");

-- CreateIndex
CREATE INDEX "reviews_agentId_idx" ON "reviews"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_reviewerId_agentId_key" ON "reviews"("reviewerId", "agentId");

-- CreateIndex
CREATE INDEX "hachalu_product_reviews_productId_idx" ON "hachalu_product_reviews"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "hachalu_product_reviews_userId_productId_key" ON "hachalu_product_reviews"("userId", "productId");

-- CreateIndex
CREATE INDEX "permission_requests_entityType_entityId_idx" ON "permission_requests"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "permission_requests_requesterId_idx" ON "permission_requests"("requesterId");

-- CreateIndex
CREATE INDEX "permission_requests_status_idx" ON "permission_requests"("status");

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hachalu_products" ADD CONSTRAINT "hachalu_products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "hachalu_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hachalu_products" ADD CONSTRAINT "hachalu_products_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "hachalu_brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hachalu_products" ADD CONSTRAINT "hachalu_products_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hachalu_product_variants" ADD CONSTRAINT "hachalu_product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "hachalu_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hachalu_product_variants" ADD CONSTRAINT "hachalu_product_variants_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "hachalu_size_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hachalu_product_variants" ADD CONSTRAINT "hachalu_product_variants_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "hachalu_color_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hachalu_measurement_templates" ADD CONSTRAINT "hachalu_measurement_templates_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "hachalu_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hachalu_customer_measurements" ADD CONSTRAINT "hachalu_customer_measurements_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "hachalu_measurement_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hachalu_customer_measurements" ADD CONSTRAINT "hachalu_customer_measurements_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hachalu_orders" ADD CONSTRAINT "hachalu_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hachalu_orders" ADD CONSTRAINT "hachalu_orders_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hachalu_order_items" ADD CONSTRAINT "hachalu_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "hachalu_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hachalu_order_items" ADD CONSTRAINT "hachalu_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "hachalu_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hachalu_order_items" ADD CONSTRAINT "hachalu_order_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "hachalu_product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hachalu_order_items" ADD CONSTRAINT "hachalu_order_items_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "hachalu_measurement_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hachalu_workers" ADD CONSTRAINT "hachalu_workers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hachalu_workers" ADD CONSTRAINT "hachalu_workers_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "hachalu_machines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hachalu_production_jobs" ADD CONSTRAINT "hachalu_production_jobs_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "hachalu_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hachalu_production_jobs" ADD CONSTRAINT "hachalu_production_jobs_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "hachalu_order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hachalu_production_jobs" ADD CONSTRAINT "hachalu_production_jobs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "hachalu_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hachalu_worker_assignments" ADD CONSTRAINT "hachalu_worker_assignments_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "hachalu_production_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hachalu_worker_assignments" ADD CONSTRAINT "hachalu_worker_assignments_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "hachalu_workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hachalu_stock_movements" ADD CONSTRAINT "hachalu_stock_movements_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "hachalu_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_items" ADD CONSTRAINT "saved_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hachalu_product_reviews" ADD CONSTRAINT "hachalu_product_reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "hachalu_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hachalu_product_reviews" ADD CONSTRAINT "hachalu_product_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_requests" ADD CONSTRAINT "permission_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_requests" ADD CONSTRAINT "permission_requests_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
