import { createHash } from 'node:crypto';
import { Prisma } from "@prisma/client";
import { connectDB, prisma } from "./config/database.js";
import { hashPassword } from "./utils/password.js";

const SEED_PASSWORD = "SecurePass@123";

function stableUuid(seed: string): string {
  const hex = createHash('md5').update(seed).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

const IMG = (file: string) => `/uploads/products/${file}`;

const photoFiles = (stamp: string, count: number) =>
  Array.from({ length: count }, (_, i) => `photo_${i + 1}_${stamp}.jpg`);

function galleryFor(files: string[], requiredStart = 0): Prisma.InputJsonValue {
  const positions = ["front", "back", "left", "right", "seatedFront", "seatedBack"];
  return files.map((file, index) => ({
    position: positions[index] ?? `extra${index}`,
    url: IMG(file),
  }));
}

const productImageFiles = {
  "classic-black-suit": photoFiles("2026-09-18_05-56-16", 6),
  "executive-navy-suit": photoFiles("2026-09-18_05-56-16", 6).map((f, i) => `photo_${i + 7}_2026-09-18_05-56-16.jpg`),
  "premium-grey-three-piece-suit": photoFiles("2026-09-18_05-56-16", 6).map((f, i) => `photo_${i + 13}_2026-09-18_05-56-16.jpg`),
  "elegant-womens-tailored-suit": photoFiles("2026-09-18_05-56-16", 6).map((f, i) => `photo_${i + 19}_2026-09-18_05-56-16.jpg`),
  "classic-white-shirt": photoFiles("2026-09-18_05-56-16", 6).map((f, i) => `photo_${i + 25}_2026-09-18_05-56-16.jpg`),
  "school-uniform-blazer": photoFiles("2026-09-18_05-56-16", 6).map((f, i) => `photo_${i + 31}_2026-09-18_05-56-16.jpg`),
  "charcoal-slim-fit-suit": ["photo_37_2026-09-18_05-56-16.jpg", ...photoFiles("2026-09-18_05-57-26", 5).map((f, i) => `photo_${i + 1}_2026-09-18_05-57-26.jpg`)],
  "navy-blazer-casual": photoFiles("2026-09-18_05-57-26", 6).map((f, i) => `photo_${i + 6}_2026-09-18_05-57-26.jpg`),
  "black-trousers": photoFiles("2026-09-18_05-57-26", 6).map((f, i) => `photo_${i + 12}_2026-09-18_05-57-26.jpg`),
  "khaki-chino": photoFiles("2026-09-18_05-57-26", 6).map((f, i) => `photo_${i + 18}_2026-09-18_05-57-26.jpg`),
  "white-church-shirt": photoFiles("2026-09-18_05-57-26", 6).map((f, i) => `photo_${i + 24}_2026-09-18_05-57-26.jpg`),
  "herringbone-overcoat": photoFiles("2026-09-18_05-57-26", 6).map((f, i) => `photo_${i + 30}_2026-09-18_05-57-26.jpg`),
  "beige-suit-set": ["photo_36_2026-09-18_05-57-26.jpg", ...photoFiles("2026-09-18_05-57-25", 4).map((f, i) => `photo_${i + 1}_2026-09-18_05-57-25.jpg`), "photo_4_2026-09-18_05-59-33.jpg"],
};

const USERS = [
  {
    email: "falmitesfaye@gmail.com",
    username: "Hachalu Admin",
    phone: "+251947896869",
    role: "admin" as const,
    roles: ["admin"],
    isRootAdmin: true,
  },
  {
    email: "seller@hachalu.com",
    username: "Hachalu Seller",
    phone: "+251911000002",
    role: "agent" as const,
    roles: ["agent"],
    isRootAdmin: false,
  },
  {
    email: "buyer@hachalu.com",
    username: "Hachalu Buyer",
    phone: "+251911000003",
    role: "user" as const,
    roles: ["user"],
    isRootAdmin: false,
  },
  {
    email: "worker@hachalu.com",
    username: "Lalisa Tailor",
    phone: "+251911000004",
    role: "worker" as const,
    roles: ["worker"],
    isRootAdmin: false,
  },
  {
    email: "worker2@hachalu.com",
    username: "Kenenisa Tailor",
    phone: "+251911000005",
    role: "worker" as const,
    roles: ["worker"],
    isRootAdmin: false,
  },
  {
    email: "hana@hachalu.com",
    username: "Hana Tailor",
    phone: "+251911000006",
    role: "worker" as const,
    roles: ["worker"],
    isRootAdmin: false,
  },
];

const CATEGORIES = [
  { name: "Men's Suits", slug: "men-suits", gender: "Male" as const, description: "Ready-made and custom men's suits", sortOrder: 1 },
  { name: "Women's Suits", slug: "women-suits", gender: "Female" as const, description: "Tailored women's suits and blazers", sortOrder: 2 },
  { name: "Kids' Suits", slug: "kids-suits", gender: "Child" as const, description: "Children's suits and uniforms", sortOrder: 3 },
  { name: "Shirts", slug: "shirts", gender: "Unisex" as const, description: "Classic and custom shirts", sortOrder: 4 },
  { name: "Trousers", slug: "trousers", gender: "Unisex" as const, description: "Dress trousers and trims", sortOrder: 5 },
  { name: "Uniforms", slug: "uniforms", gender: "Unisex" as const, description: "School and corporate uniforms", sortOrder: 6 },
  { name: "Casual Wear", slug: "casual-wear", gender: "Unisex" as const, description: "Casual garments", sortOrder: 7 },
];

const BRANDS = [
  { name: "China", origin: "China" },
  { name: "Turkey", origin: "Turkey" },
  { name: "Korea", origin: "Korea" },
  { name: "America", origin: "America" },
  { name: "Other", origin: "Other" },
];

const COLORS = [
  { name: "Black", hex: "#1a1a1a" },
  { name: "Navy", hex: "#1f2a44" },
  { name: "Grey", hex: "#6b7280" },
  { name: "White", hex: "#f8fafc" },
  { name: "Beige", hex: "#c9a385" },
  { name: "Charcoal", hex: "#36454f" },
];

const SIZES = [
  { name: "S", sortOrder: 1 },
  { name: "M", sortOrder: 2 },
  { name: "L", sortOrder: 3 },
  { name: "XL", sortOrder: 4 },
  { name: "38", sortOrder: 5 },
  { name: "40", sortOrder: 6 },
  { name: "42", sortOrder: 7 },
  { name: "44", sortOrder: 8 },
];

const TEMPLATES = [
  {
    name: "Male Suit",
    fields: [
      { key: "height", label: "Height", unit: "cm", required: true },
      { key: "waist", label: "Waist", unit: "cm", required: true },
      { key: "trouserLength", label: "Trouser length", unit: "cm", required: true },
      { key: "bottomWidth", label: "Bottom width", unit: "cm", required: false },
      { key: "shoulderWidth", label: "Shoulder width", unit: "cm", required: true },
      { key: "chest", label: "Chest", unit: "cm", required: true },
      { key: "sleeveLength", label: "Sleeve length", unit: "cm", required: true },
      { key: "coatLength", label: "Coat length", unit: "cm", required: false },
    ],
  },
  {
    name: "Female Suit",
    fields: [
      { key: "height", label: "Height", unit: "cm", required: true },
      { key: "bust", label: "Bust", unit: "cm", required: true },
      { key: "waist", label: "Waist", unit: "cm", required: true },
      { key: "hip", label: "Hip", unit: "cm", required: true },
      { key: "shoulderWidth", label: "Shoulder width", unit: "cm", required: true },
      { key: "sleeveLength", label: "Sleeve length", unit: "cm", required: true },
      { key: "jacketLength", label: "Jacket length", unit: "cm", required: false },
      { key: "trouserLength", label: "Trouser length", unit: "cm", required: true },
    ],
  },
  {
    name: "Child Suit",
    fields: [
      { key: "height", label: "Height", unit: "cm", required: true },
      { key: "chest", label: "Chest", unit: "cm", required: true },
      { key: "waist", label: "Waist", unit: "cm", required: true },
      { key: "coatLength", label: "Coat length", unit: "cm", required: false },
      { key: "sleeveLength", label: "Sleeve length", unit: "cm", required: true },
      { key: "trouserLength", label: "Trouser length", unit: "cm", required: true },
    ],
  },
  {
    name: "Trouser",
    fields: [
      { key: "waist", label: "Waist", unit: "cm", required: true },
      { key: "seat", label: "Seat/Hip", unit: "cm", required: true },
      { key: "trouserLength", label: "Outseam length", unit: "cm", required: true },
      { key: "thigh", label: "Thigh", unit: "cm", required: false },
      { key: "bottomWidth", label: "Bottom width", unit: "cm", required: true },
    ],
  },
  {
    name: "Shirt",
    fields: [
      { key: "collar", label: "Collar", unit: "cm", required: true },
      { key: "chest", label: "Chest", unit: "cm", required: true },
      { key: "shoulderWidth", label: "Shoulder width", unit: "cm", required: true },
      { key: "sleeveLength", label: "Sleeve length", unit: "cm", required: true },
      { key: "shirtLength", label: "Shirt length", unit: "cm", required: false },
    ],
  },
];

type ProductSeed = {
  name: string;
  slug: string;
  categorySlug: string;
  gender: "Male" | "Female" | "Child" | "Unisex";
  brandName: string;
  countryOfOrigin: string;
  fabric: string;
  isReadyMade: boolean;
  isCustomizable: boolean;
  price: number;
  colors: string[];
  sizes: string[];
  stock: number;
};

const PRODUCTS: ProductSeed[] = [
  {
    name: "Classic Black Suit",
    slug: "classic-black-suit",
    categorySlug: "men-suits",
    gender: "Male",
    brandName: "Turkey",
    countryOfOrigin: "Turkey",
    fabric: "Wool Blend",
    isReadyMade: true,
    isCustomizable: true,
    price: 5500,
    colors: ["Black"],
    sizes: ["38", "40", "42", "44"],
    stock: 6,
  },
  {
    name: "Executive Navy Suit",
    slug: "executive-navy-suit",
    categorySlug: "men-suits",
    gender: "Male",
    brandName: "Turkey",
    countryOfOrigin: "Turkey",
    fabric: "Super 110s Wool",
    isReadyMade: true,
    isCustomizable: true,
    price: 7000,
    colors: ["Navy"],
    sizes: ["38", "40", "42", "44"],
    stock: 4,
  },
  {
    name: "Premium Grey Three-Piece Suit",
    slug: "premium-grey-three-piece-suit",
    categorySlug: "men-suits",
    gender: "Male",
    brandName: "America",
    countryOfOrigin: "America",
    fabric: "Brushed Wool",
    isReadyMade: true,
    isCustomizable: false,
    price: 8500,
    colors: ["Grey"],
    sizes: ["40", "42", "44"],
    stock: 3,
  },
  {
    name: "Elegant Women's Tailored Suit",
    slug: "elegant-womens-tailored-suit",
    categorySlug: "women-suits",
    gender: "Female",
    brandName: "Korea",
    countryOfOrigin: "Korea",
    fabric: "Polyester-Silk Blend",
    isReadyMade: true,
    isCustomizable: true,
    price: 6200,
    colors: ["Navy", "Black"],
    sizes: ["S", "M", "L", "XL"],
    stock: 5,
  },
  {
    name: "Classic White Shirt",
    slug: "classic-white-shirt",
    categorySlug: "shirts",
    gender: "Unisex",
    brandName: "China",
    countryOfOrigin: "China",
    fabric: "100% Cotton",
    isReadyMade: true,
    isCustomizable: true,
    price: 1200,
    colors: ["White"],
    sizes: ["S", "M", "L", "XL"],
    stock: 20,
  },
  {
    name: "School Uniform Blazer",
    slug: "school-uniform-blazer",
    categorySlug: "uniforms",
    gender: "Child",
    brandName: "China",
    countryOfOrigin: "China",
    fabric: "Polyester Blend",
    isReadyMade: true,
    isCustomizable: false,
    price: 1800,
    colors: ["Navy", "Black"],
    sizes: ["S", "M", "L", "XL"],
    stock: 15,
  },
  {
    name: "Charcoal Slim-Fit Suit",
    slug: "charcoal-slim-fit-suit",
    categorySlug: "men-suits",
    gender: "Male",
    brandName: "Turkey",
    countryOfOrigin: "Turkey",
    fabric: "Slim-fit Wool Blend",
    isReadyMade: true,
    isCustomizable: true,
    price: 7800,
    colors: ["Charcoal"],
    sizes: ["40", "42", "44"],
    stock: 5,
  },
  {
    name: "Navy Blazer Casual",
    slug: "navy-blazer-casual",
    categorySlug: "casual-wear",
    gender: "Unisex",
    brandName: "Korea",
    countryOfOrigin: "Korea",
    fabric: "Cotton-Linen Blend",
    isReadyMade: true,
    isCustomizable: true,
    price: 4800,
    colors: ["Navy"],
    sizes: ["S", "M", "L", "XL"],
    stock: 8,
  },
  {
    name: "Classic Black Trousers",
    slug: "black-trousers",
    categorySlug: "trousers",
    gender: "Unisex",
    brandName: "Turkey",
    countryOfOrigin: "Turkey",
    fabric: "Polyester-Wool Blend",
    isReadyMade: true,
    isCustomizable: true,
    price: 1800,
    colors: ["Black"],
    sizes: ["38", "40", "42", "44"],
    stock: 14,
  },
  {
    name: "Khaki Chino Trousers",
    slug: "khaki-chino",
    categorySlug: "trousers",
    gender: "Unisex",
    brandName: "America",
    countryOfOrigin: "America",
    fabric: "Cotton Twill",
    isReadyMade: true,
    isCustomizable: false,
    price: 1600,
    colors: ["Beige"],
    sizes: ["38", "40", "42"],
    stock: 12,
  },
  {
    name: "White Church Shirt",
    slug: "white-church-shirt",
    categorySlug: "shirts",
    gender: "Male",
    brandName: "Turkey",
    countryOfOrigin: "Turkey",
    fabric: "Egyptian Cotton",
    isReadyMade: true,
    isCustomizable: true,
    price: 2500,
    colors: ["White"],
    sizes: ["M", "L", "XL"],
    stock: 10,
  },
  {
    name: "Herringbone Overcoat",
    slug: "herringbone-overcoat",
    categorySlug: "men-suits",
    gender: "Male",
    brandName: "Korea",
    countryOfOrigin: "Korea",
    fabric: "Wool Herringbone",
    isReadyMade: true,
    isCustomizable: true,
    price: 9500,
    colors: ["Grey", "Charcoal"],
    sizes: ["40", "42", "44"],
    stock: 4,
  },
  {
    name: "Beige Suit Set",
    slug: "beige-suit-set",
    categorySlug: "men-suits",
    gender: "Male",
    brandName: "America",
    countryOfOrigin: "America",
    fabric: "Linen-Cotton Blend",
    isReadyMade: true,
    isCustomizable: true,
    price: 6800,
    colors: ["Beige"],
    sizes: ["40", "42", "44"],
    stock: 5,
  },
];

const MATERIALS = [
  { name: "Wool Fabric — Black", category: "Fabric" as const, unit: "meter" as const, currentQuantity: 120, minStockLevel: 40, notes: "Main suit fabric" },
  { name: "Wool Fabric — Navy", category: "Fabric" as const, unit: "meter" as const, currentQuantity: 85, minStockLevel: 40, notes: "Executive suits" },
  { name: "Cotton Fabric — White", category: "Fabric" as const, unit: "meter" as const, currentQuantity: 200, minStockLevel: 60, notes: "Shirts" },
  { name: "Polyester Lining", category: "Lining" as const, unit: "meter" as const, currentQuantity: 90, minStockLevel: 30, notes: "Jacket lining" },
  { name: "Sewing Thread — Black", category: "Thread" as const, unit: "roll" as const, currentQuantity: 25, minStockLevel: 10, notes: "" },
  { name: "Sewing Thread — White", category: "Thread" as const, unit: "roll" as const, currentQuantity: 18, minStockLevel: 10, notes: "" },
  { name: "Buttons — Suit", category: "Buttons" as const, unit: "piece" as const, currentQuantity: 300, minStockLevel: 100, notes: "" },
  { name: "Zippers — Trouser", category: "Zippers" as const, unit: "piece" as const, currentQuantity: 45, minStockLevel: 50, notes: "Low stock: restock soon" },
  { name: "Interfacing", category: "Other" as const, unit: "meter" as const, currentQuantity: 60, minStockLevel: 20, notes: "" },
];

const MACHINES = [
  { name: "Industrial Overlock", type: "Overlock", code: "OVL-01", status: "InUse" as const, location: "Main Hall" },
  { name: "Flatlock Machine", type: "Flatlock", code: "FLT-02", status: "Available" as const, location: "Main Hall" },
  { name: "Buttonhole Machine", type: "Buttonhole", code: "BTH-03", status: "Available" as const, location: "Finishing" },
  { name: "Straight Stitch", type: "Straight Stitch", code: "STS-04", status: "InUse" as const, location: "Main Hall" },
  { name: "Ironing Station", type: "Press", code: "IRN-05", status: "Maintenance" as const, location: "Finishing", maintenanceNotes: "Pressure plate replacement" },
];

async function upsertUser(data: (typeof USERS)[number]) {
  const password = await hashPassword(SEED_PASSWORD);
  const roles = data.roles as Prisma.InputJsonValue;
  const fields = {
    username: data.username,
    phone: data.phone,
    password,
    role: data.role,
    roles,
    status: "Approved" as const,
    isRootAdmin: data.isRootAdmin,
    emailVerified: true,
    onboardingComplete: true,
  };
  return prisma.user.upsert({
    where: { email: data.email },
    update: fields,
    create: { ...fields, email: data.email },
  });
}

function productDescription(name: string, fabric: string, country: string): string {
  return `${name} — premium ${fabric} garment sourced from ${country}. Available ready-made or as a tailored custom order with exact measurements.`;
}

async function seed() {
  await connectDB();

  console.log("🌱 Seeding Hachalu Protocol database...");

  const admin = await upsertUser(USERS[0]);
  const seller = await upsertUser(USERS[1]);
  const buyer = await upsertUser(USERS[2]);
  const workers: { email: string; id: string; userId: string }[] = [];

  for (const wu of USERS.slice(3)) {
    const user = await upsertUser(wu);
    await prisma.worker.upsert({
      where: { userId: user.id },
      update: { specialty: wu.username.split(" ")[0] === "Lalisa" ? "Suits" : "General Tailoring", status: "Available" },
      create: {
        userId: user.id,
        specialty: wu.username.split(" ")[0] === "Lalisa" ? "Suits" : "General Tailoring",
        phone: user.phone,
        status: "Available",
      },
    });
    workers.push({ email: wu.email, id: user.id, userId: user.id });
  }
  console.log(`✅ Users ready (admin, seller=${seller.email}, buyer=${buyer.email}, ${workers.length} workers)`);

  const categories = new Map<string, string>();
  for (const c of CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: {
        name: c.name,
        slug: c.slug,
        gender: c.gender,
        description: c.description,
        sortOrder: c.sortOrder,
        active: true,
      },
    });
    categories.set(c.slug, row.id);
  }

  const brands = new Map<string, string>();
  for (const b of BRANDS) {
    const row = await prisma.brand.upsert({ where: { name: b.name }, update: {}, create: { name: b.name, origin: b.origin, active: true } });
    brands.set(b.name, row.id);
  }

  const colors = new Map<string, string>();
  for (const c of COLORS) {
    const row = await prisma.colorOption.upsert({ where: { name: c.name }, update: {}, create: { name: c.name, hex: c.hex, active: true } });
    colors.set(c.name, row.id);
  }

  const sizes = new Map<string, string>();
  for (const s of SIZES) {
    const row = await prisma.sizeOption.upsert({ where: { name: s.name }, update: {}, create: { name: s.name, sortOrder: s.sortOrder, active: true } });
    sizes.set(s.name, row.id);
  }
  console.log(`✅ ${CATEGORIES.length} categories, ${BRANDS.length} brands, ${COLORS.length} colors, ${SIZES.length} sizes`);

  for (const t of TEMPLATES) {
    await prisma.measurementTemplate.upsert({
      where: { name: t.name },
      update: { fields: t.fields as Prisma.InputJsonValue },
      create: { name: t.name, fields: t.fields as Prisma.InputJsonValue, active: true },
    });
  }
  console.log(`✅ ${TEMPLATES.length} measurement templates`);

  const productIds: Record<string, string> = {};
  for (const p of PRODUCTS) {
    const categoryId = categories.get(p.categorySlug);
    if (!categoryId) throw new Error(`Missing category ${p.categorySlug} for product ${p.slug}`);
    const brandId = brands.get(p.brandName);
    const fields: any = {
      name: p.name,
      slug: p.slug,
      description: productDescription(p.name, p.fabric, p.countryOfOrigin),
      categoryId,
      gender: p.gender,
      ageGroup: p.gender === "Child" ? "Kids" : "Adult",
      brandId,
      countryOfOrigin: p.countryOfOrigin,
      fabric: p.fabric,
      isReadyMade: p.isReadyMade,
      isCustomizable: p.isCustomizable,
      featured: p.price >= 6000,
      status: "Approved",
      images: galleryFor(productImageFiles[p.slug as keyof typeof productImageFiles] ?? productImageFiles["classic-black-suit"]),
      sellerId: seller.id,
      sellerName: seller.username,
      displayPhone: seller.phone,
      contactMode: "Admin",
      views: Math.floor(Math.random() * 90) + 10,
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 3600 * 1000)),
    };

    const product = await prisma.product.upsert({ where: { slug: p.slug }, update: fields, create: fields });
    productIds[p.slug] = product.id;

    const variantData = p.colors.flatMap((colorName) =>
      p.sizes.map((sizeName, index) => ({
        sku: `${p.slug.toUpperCase()}-${sizeName}-${colorName}`,
        productId: product.id,
        sizeId: sizes.get(sizeName) ?? null,
        colorId: colors.get(colorName) ?? null,
        price: p.price,
        stock: Math.max(1, p.stock - index),
      }))
    );
    await prisma.productVariant.deleteMany({ where: { productId: product.id } });
    await prisma.productVariant.createMany({ data: variantData });
  }
  console.log(`✅ ${PRODUCTS.length} products with local images + variants`);

  for (const m of MATERIALS) {
    const existing = await prisma.material.findFirst({ where: { name: m.name } });
    if (existing) {
      await prisma.material.update({ where: { id: existing.id }, data: m });
    } else {
      await prisma.material.create({ data: m });
    }
  }
  console.log(`✅ ${MATERIALS.length} materials`);

  for (const mac of MACHINES) {
    await prisma.machine.upsert({ where: { code: mac.code }, update: mac, create: mac });
  }
  console.log(`✅ ${MACHINES.length} machines`);

  const measurementTemplates = await prisma.measurementTemplate.findMany();
  const maleSuitTemplate = measurementTemplates.find((t) => t.name === "Male Suit");
  if (maleSuitTemplate && buyer) {
    await prisma.customerMeasurement.upsert({
      where: { id: stableUuid('seed-measurement-1') },
      update: {},
      create: {
        id: stableUuid('seed-measurement-1'),
        templateId: maleSuitTemplate.id,
        customerId: buyer.id,
        values: {
          height: 178, waist: 86, trouserLength: 104, bottomWidth: 20,
          shoulderWidth: 46, chest: 100, sleeveLength: 62, coatLength: 74,
        },
        unit: "cm",
        notes: "Standard build — prefer slim fit.",
      },
    });
  }

  await prisma.setting.upsert({
    where: { id: "default" },
    update: { lowStockThreshold: 10, defaultCommissionRate: 0.1 },
    create: {
      id: "default",
      contactPhone1: "+251947896869",
      contactEmail: "info@hachalu.com",
      lowStockThreshold: 10,
      defaultCommissionRate: 0.1,
    },
  });

  // ── Demo orders to power dashboards (ready-made + custom + production) ──
  const classicBlack = await prisma.product.findUnique({ where: { slug: "classic-black-suit" } });
  const whiteShirt = await prisma.product.findUnique({ where: { slug: "classic-white-shirt" } });
  const navyBlazer = await prisma.product.findUnique({ where: { slug: "navy-blazer-casual" } });
  const maleSuit = measurementTemplates.find((t) => t.name === "Male Suit");
  const trouserTemplate = measurementTemplates.find((t) => t.name === "Trouser");

  const seedOrder = async (slug: string, type: "ready_made" | "custom", status: string, productId?: string, templateId?: string, variantId?: string) => {
    try {
      const existing = await prisma.order.findUnique({ where: { id: stableUuid(`seed-order-${slug}`) } });
      if (existing) return existing;
      if (!productId) return null;
      const variant = variantId ? await prisma.productVariant.findUnique({ where: { id: variantId } }) : null;
      const unitPrice = variant?.price ?? 5000;
      return await prisma.order.create({
        data: {
          id: stableUuid(`seed-order-${slug}`),
          orderNumber: slug.toUpperCase(),
          type,
          customerId: buyer.id,
          sellerId: seller.id,
          status: status as any,
          totalPrice: type === "custom" ? unitPrice + 1500 : unitPrice,
          paymentStatus: status === "PendingPayment" ? "Pending" : "Completed",
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 14 * 24 * 3600 * 1000)),
          items: {
            create: [
              {
                type,
                productId,
                variantId: variantId || null,
                quantity: 1,
                unitPrice,
                subtotal: unitPrice,
                templateId: type === "custom" ? templateId || null : null,
                styleNotes: type === "custom" ? { fabric: "Wool", color: "Black", notes: "Pickup at shop" } : undefined,
              },
            ],
          },
        },
      });
    } catch (e: any) {
      console.log(`  - skipped seed order ${slug}: ${e.message}`);
      return null;
    }
  };

  const firstVariant = async (productId?: string) => {
    if (!productId) return undefined;
    const v = await prisma.productVariant.findFirst({ where: { productId } });
    return v?.id;
  };

  const order1 = await seedOrder("ORD-1001", "ready_made", "Completed", classicBlack?.id, undefined, await firstVariant(classicBlack?.id));
  const order2 = await seedOrder("ORD-1002", "ready_made", "Delivered", whiteShirt?.id, undefined, await firstVariant(whiteShirt?.id));
  const order3 = await seedOrder("ORD-1003", "custom", "InProduction", navyBlazer?.id, maleSuit?.id, undefined);
  const order4 = await seedOrder("ORD-1004", "custom", "MeasurementConfirmed", classicBlack?.id, maleSuit?.id, undefined);
  const order5 = await seedOrder("ORD-1005", "ready_made", "Packed", navyBlazer?.id, undefined, await firstVariant(navyBlazer?.id));

  if (order1?.sellerId) {
    const existing = await prisma.commission.findFirst({ where: { orderId: order1.id } });
    if (!existing) {
      await prisma.commission.create({
        data: {
          sellerId: order1.sellerId,
          orderId: order1.id,
          scope: "Order",
          rate: 0.1,
          amount: Math.round(order1.totalPrice * 0.1 * 100) / 100,
          status: "Paid",
          paidAt: new Date(),
        },
      });
    }
  }

  // Production jobs for custom orders
  if (order3 && order3.id) {
    const existingJob = await prisma.productionJob.findFirst({ where: { orderId: order3.id } });
    if (!existingJob) {
      const orderItem = await prisma.orderItem.findFirst({ where: { orderId: order3.id } });
      const worker = await prisma.worker.findFirst({ where: { user: { email: "worker@hachalu.com" } } });
      await prisma.productionJob.create({
        data: {
          id: stableUuid('seed-job-1'),
          orderId: order3.id,
          orderItemId: orderItem?.id ?? null,
          productId: navyBlazer?.id ?? null,
          status: "InProgress50",
          startTime: new Date(Date.now() - 3 * 24 * 3600 * 1000),
          notes: "Holding stitch initial stage",
          qcStatus: "Pending",
          assignees: worker ? { create: [{ workerId: worker.id, role: "tailor" }] } : undefined,
        },
      });
    }
  }
  if (order4 && order4.id) {
    const existingJob = await prisma.productionJob.findFirst({ where: { orderId: order4.id } });
    if (!existingJob) {
      const orderItem = await prisma.orderItem.findFirst({ where: { orderId: order4.id } });
      const worker = await prisma.worker.findFirst({ where: { user: { email: "worker2@hachalu.com" } } });
      await prisma.productionJob.create({
        data: {
          id: stableUuid('seed-job-2'),
          orderId: order4.id,
          orderItemId: orderItem?.id ?? null,
          productId: classicBlack?.id ?? null,
          status: "Assigned",
          startTime: new Date(),
          notes: "Awaiting start",
          qcStatus: "Pending",
          assignees: worker ? { create: [{ workerId: worker.id, role: "tailor" }] } : undefined,
        },
      });
    }
  }

  await prisma.$disconnect();
  console.log("🎉 Seed complete. All accounts share password: " + SEED_PASSWORD);
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});