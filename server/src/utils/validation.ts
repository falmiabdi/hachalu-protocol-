import { z } from 'zod'
function toNumber(value: unknown): unknown {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'string') {
    const n = Number(value)
    return Number.isNaN(n) ? value : n
  }
  return value
}
export const num = (schema: z.ZodNumber) => z.preprocess(toNumber, schema)
export const optNum = (schema: z.ZodNumber) => z.preprocess(toNumber, schema.optional())
export const requiredStr = z.string().min(1)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isValidUuid = (value: unknown): boolean =>
  typeof value === 'string' && UUID_RE.test(value)



const strip = (value: unknown) => (value === undefined || value === null || value === '' ? undefined : value)






export function cleanPayload<T extends object>(input: T): T {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === '') continue
    out[key] = value
  }
  return out as T
}
export const optStr = z.preprocess(strip, z.string().optional())
export const optBool = z.preprocess(strip, z.boolean().optional())
export const optArr = z.preprocess(strip, z.array(z.string()).optional())

export const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z.enum(['agent', 'owner']).optional(),
  phone: optStr,
  profilePhoto: z.string().url().optional(),
})

export const buyerRegisterSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  phone: z.string().min(6).max(30),
  password: z.string().min(8).max(100),
  profilePhoto: z.string().url().optional(),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().min(4).max(6),
  newPassword: z.string().min(8).max(100),
})

export const productSchema = z.object({
  name: requiredStr.max(200),
  slug: optStr,
  description: optStr,
  categoryId: requiredStr,
  gender: z.enum(['Male', 'Female', 'Child', 'Unisex']),
  ageGroup: optStr,
  brandId: optStr,
  countryOfOrigin: optStr,
  fabric: optStr,
  isReadyMade: optBool,
  isCustomizable: optBool,
  featured: optBool,
  price: num(z.number().positive()),
  stock: optNum(z.number().int().min(0)),
  images: z
    .union([z.array(z.object({ position: optStr, url: z.string().min(1) })), z.array(z.string().min(1))])
    .optional(),
  videoUrl: optStr,
  variants: z
    .array(
      z.object({
        sku: optStr,
        sizeId: optStr,
        colorId: optStr,
        price: z.preprocess(toNumber, z.number().positive()),
        stock: z.preprocess(toNumber, z.number().int().min(0).default(0)),
      })
    )
    .optional(),
  contactName: optStr,
  contactPhone: optStr,
  contactMode: z.enum(['Admin', 'Owner', 'Agent']).optional(),
})

export const orderLineSchema = z.object({
  productId: optStr,
  variantId: optStr,
  quantity: z.preprocess(toNumber, z.number().int().min(1).default(1)),
  templateId: optStr,
  measurementValues: z.record(z.string(), z.unknown()).optional(),
  styleNotes: optStr,
  unitPrice: optNum(z.number().positive()),
})

export const createOrderSchema = z.object({
  type: z.enum(['ready_made', 'custom']),
  items: z.array(orderLineSchema).min(1),
  notes: optStr,
  deliveryInfo: z.record(z.string(), z.unknown()).optional(),
})

export const measurementSchema = z.object({
  templateId: requiredStr,
  values: z.record(z.string(), z.unknown()),
  unit: z.enum(['cm', 'inch', 'meter']).optional(),
  notes: optStr,
  referencePhoto: optStr,
  orderId: optStr,
})

export const materialSchema = z.object({
  name: requiredStr.max(100),
  category: z.enum(['Fabric', 'Thread', 'Buttons', 'Zippers', 'Lining', 'Other']),
  unit: z.enum(['meter', 'piece', 'roll', 'kg', 'pack', 'other']).optional(),
  currentQuantity: optNum(z.number().min(0)),
  minStockLevel: optNum(z.number().min(0)),
  notes: optStr,
})

export const movementSchema = z.object({
  materialId: requiredStr,
  type: z.enum(['In', 'Out']),
  quantity: num(z.number().positive()),
  note: optStr,
  orderId: optStr,
})

export const machineSchema = z.object({
  name: requiredStr.max(100),
  type: optStr,
  code: optStr,
  status: z.enum(['Available', 'InUse', 'Maintenance', 'Disabled']).optional(),
  location: optStr,
  maintenanceNotes: optStr,
})

export const workerSchema = z.object({
  userId: optStr,
  email: optStr,
  specialty: optStr,
  phone: optStr,
  status: z.enum(['Available', 'Busy', 'OnLeave', 'Inactive']).optional(),
  machineId: optStr,
})

export const productionJobSchema = z.object({
  orderId: requiredStr,
  orderItemId: optStr,
  productId: optStr,
  notes: optStr,
})
