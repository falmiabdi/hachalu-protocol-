import { getApiUrl, getImageUrl } from "@/lib/get-api-url"

export type ProductStatus = "Pending" | "Approved" | "Rejected" | "OutOfStock" | "Inactive"

export interface ProductImage {
  position: string
  url: string
}

export interface ProductColor {
  id: string
  name: string
  hex?: string | null
}

export interface ProductSize {
  id: string
  name: string
}

export interface ProductVariant {
  id: string
  sku: string
  productId: string
  sizeId: string
  colorId: string
  price: number
  stock: number
  status: string
  size?: ProductSize | null
  color?: ProductColor | null
}

export interface ProductCategory {
  id: string
  name: string
  slug: string
  gender?: string | null
  sortOrder?: number | null
  active: boolean
  _count?: { products?: number }
}

export interface ProductBrand {
  id: string
  name: string
  country?: string | null
}

export interface Product {
  id: string
  name: string
  slug: string
  description?: string | null
  categoryId?: string | null
  category?: ProductCategory | null
  gender?: string | null
  ageGroup?: string | null
  brandId?: string | null
  brand?: ProductBrand | null
  countryOfOrigin?: string | null
  fabric?: string | null
  isReadyMade: boolean
  isCustomizable: boolean
  featured?: boolean | null
  status: ProductStatus
  rejectionReason?: string | null
  images: ProductImage[]
  videoUrl?: string | null
  sellerId: string
  sellerName?: string | null
  displayPhone?: string | null
  contactMode?: string | null
  contactUserId?: string | null
  views?: number
  favorites?: number
  createdAt: string
  updatedAt: string
  variants?: ProductVariant[]
  seller?: { id: string; username?: string | null; email?: string | null; phone?: string | null; profilePhoto?: string | null; status?: string } | null
}

export type OrderStatus =
  | "PendingPayment"
  | "Paid"
  | "MeasurementPending"
  | "MeasurementConfirmed"
  | "Assigned"
  | "InProduction"
  | "Packed"
  | "Delivered"
  | "Completed"
  | "Cancelled"
  | "Refunded"

export type OrderType = "ready_made" | "custom"

export interface MeasurementTemplateField {
  key: string
  label: string
  unit: string
  required?: boolean
}

export interface MeasurementTemplate {
  id: string
  name: string
  slug?: string | null
  gender?: string | null
  fields: MeasurementTemplateField[]
}

export interface ProductionJobAssignee {
  id: string
  worker: { id: string; user: { id: string; username?: string | null } }
}

export interface ProductionJob {
  id: string
  jobNumber?: string | null
  orderId: string
  orderItemId?: string | null
  productId?: string | null
  status: string
  startTime?: string | null
  endTime?: string | null
  qcStatus?: string | null
  notes?: string | null
  order?: Order | null
  orderItem?: OrderItem | null
  product?: Product | null
  assignees?: ProductionJobAssignee[]
}

export interface OrderItem {
  id: string
  orderId: string
  type: OrderType
  productId?: string | null
  variantId?: string | null
  quantity: number
  unitPrice: number
  subtotal: number
  templateId?: string | null
  measurementId?: string | null
  styleNotes?: Record<string, unknown> | null
  product?: { id: string; name: string; slug?: string | null; images?: ProductImage[] } | null
  variant?: (ProductVariant & { size?: ProductSize | null; color?: ProductColor | null }) | null
  template?: MeasurementTemplate | null
  productionJobs?: ProductionJob[]
}

export interface Order {
  id: string
  orderNumber: string
  type: OrderType
  customerId: string
  sellerId?: string | null
  status: OrderStatus
  totalPrice: number
  paymentStatus?: string | null
  notes?: string | null
  deliveryInfo?: Record<string, unknown> | null
  cancelledReason?: string | null
  createdAt: string
  updatedAt: string
  customer?: { id: string; username?: string | null; email?: string | null; phone?: string | null; profilePhoto?: string | null } | null
  seller?: { id: string; username?: string | null; email?: string | null; phone?: string | null; profilePhoto?: string | null } | null
  items?: OrderItem[]
}

export interface WorkerUser {
  id: string
  username?: string | null
  email?: string | null
  phone?: string | null
  profilePhoto?: string | null
  status?: string
}

export interface Worker {
  id: string
  userId: string
  specialty?: string | null
  phone?: string | null
  status?: string | null
  machineId?: string | null
  user?: WorkerUser | null
  machine?: Machine | null
  stats?: { completedJobs?: number; activeJobs?: number; inProgressJobs?: number }
}

export interface Machine {
  id: string
  name: string
  type?: string | null
  code?: string | null
  status?: string | null
  location?: string | null
  maintenanceNotes?: string | null
  _count?: { jobs?: number; workers?: number }
}

export interface Material {
  id: string
  name: string
  category?: string | null
  unit?: string | null
  currentQuantity: number
  minStockLevel?: number | null
  notes?: string | null
}

export interface StockMovement {
  id: string
  materialId: string
  type: string
  quantity: number
  notes?: string | null
  createdAt: string
}

export interface Commission {
  id: string
  sellerId: string
  orderId?: string | null
  productId?: string | null
  scope: string
  rate: number
  amount: number
  status: string
  paidAt?: string | null
  createdAt: string
  seller?: { id: string; username?: string | null; email?: string | null } | null
  order?: { id: string; orderNumber: string; totalPrice: number } | null
  product?: { id: string; name: string; slug?: string | null } | null
}

export interface Payment {
  id: string
  userId: string
  orderTitle?: string | null
  method?: string | null
  paymentType?: string | null
  status?: string | null
  amount: number
  reference?: string | null
  createdAt: string
  metadata?: Record<string, unknown> | null
}

export interface Paginated<T> {
  data: T[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PendingPayment: "Pending Payment",
  Paid: "Paid",
  MeasurementPending: "Awaiting Measurement",
  MeasurementConfirmed: "Measurement Confirmed",
  Assigned: "Assigned",
  InProduction: "In Production",
  Packed: "Packed",
  Delivered: "Delivered",
  Completed: "Completed",
  Cancelled: "Cancelled",
  Refunded: "Refunded",
}

export const ORDER_STATUS_COLORS: Record<string, string> = {
  PendingPayment: "bg-amber-100 text-amber-800",
  Paid: "bg-sky-100 text-sky-800",
  MeasurementPending: "bg-violet-100 text-violet-800",
  MeasurementConfirmed: "bg-indigo-100 text-indigo-800",
  Assigned: "bg-blue-100 text-blue-800",
  InProduction: "bg-orange-100 text-orange-800",
  Packed: "bg-cyan-100 text-cyan-800",
  Delivered: "bg-teal-100 text-teal-800",
  Completed: "bg-green-100 text-green-800",
  Cancelled: "bg-red-100 text-red-800",
  Refunded: "bg-rose-100 text-rose-800",
}

export const JOB_STATUS_LABELS: Record<string, string> = {
  Assigned: "Assigned",
  Started: "Started",
  InProgress25: "In Progress 25%",
  InProgress50: "In Progress 50%",
  InProgress75: "In Progress 75%",
  Ready: "Ready",
  QualityCheck: "Quality Check",
  Completed: "Completed",
}

export const PRODUCT_STATUS_LABELS: Record<string, string> = {
  Pending: "Pending",
  Approved: "Approved",
  Rejected: "Rejected",
  OutOfStock: "Out of Stock",
  Inactive: "Inactive",
}

export const PRODUCT_STATUS_COLORS: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-800",
  Approved: "bg-green-100 text-green-800",
  Rejected: "bg-red-100 text-red-800",
  OutOfStock: "bg-slate-200 text-slate-700",
  Inactive: "bg-slate-200 text-slate-700",
}

export function mediaUrl(url?: string | null): string {
  if (!url) return "/placeholder.svg"
  if (/^https?:\/\//i.test(url)) return getImageUrl(url)
  const base = getApiUrl()
  if (url.startsWith(base)) return url
  const path = url.startsWith("/") ? url : `/${url}`
  return `${base}${path}`
}

export function formatMoney(amount?: number | null): string {
  const value = Number(amount || 0)
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })} ETB`
}

export function formatDate(value?: string | null): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

export function imageFor(product: Product | { images?: ProductImage[] }, position = "front"): string {
  const images = product.images || []
  const found =
    images.find((i) => i.position === position) ||
    images.find((i) => ["left", "right", "back"].includes(i.position)) ||
    images[0]
  return mediaUrl(found?.url)
}

function getToken(): string | null {
  try {
    return sessionStorage.getItem("token") || localStorage.getItem("token")
  } catch {
    return null
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  }
  const token = getToken()
  if (token && !init?.headers?.hasOwnProperty("Authorization")) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${getApiUrl()}${path}`, { ...init, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.message || data.error || `Request failed (${res.status})`)
  }
  return data as T
}

export interface ProductQuery {
  page?: number
  limit?: number
  category?: string
  search?: string
  gender?: string
  isReadyMade?: boolean
  isCustomizable?: boolean
  featured?: boolean
  sellerId?: string
}

export async function fetchProducts(query: ProductQuery = {}): Promise<{ products: Product[]; pagination?: { total: number; totalPages: number; page: number; limit: number } }> {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v))
  })
  return apiFetch(`/api/products?${params.toString()}`)
}

export async function fetchProduct(id: string): Promise<Product> {
  const data = await apiFetch<{ product: Product }>(`/api/products/${id}`)
  return data.product
}

export async function fetchCategories(): Promise<ProductCategory[]> {
  const data = await apiFetch<{ categories: ProductCategory[] }>(`/api/catalog/categories`)
  return data.categories
}

export async function fetchBrands(): Promise<ProductBrand[]> {
  const data = await apiFetch<{ brands: ProductBrand[] }>(`/api/catalog/brands`)
  return data.brands
}

export async function fetchMeasurementTemplates(): Promise<MeasurementTemplate[]> {
  const data = await apiFetch<{ templates: MeasurementTemplate[] }>(`/api/catalog/templates`)
  return data.templates
}

export async function fetchColors(): Promise<ProductColor[]> {
  const data = await apiFetch<{ colors: ProductColor[] }>(`/api/catalog/colors`)
  return data.colors
}

export async function fetchSizes(): Promise<ProductSize[]> {
  const data = await apiFetch<{ sizes: ProductSize[] }>(`/api/catalog/sizes`)
  return data.sizes
}

export interface OrderLineInput {
  productId?: string
  variantId?: string
  quantity: number
  unitPrice?: number
  templateId?: string
  measurementValues?: Record<string, string | number> | null
  styleNotes?: Record<string, number | string> | null
}

export interface CreateOrderInput {
  type: OrderType
  items: OrderLineInput[]
  notes?: string | null
  deliveryInfo?: Record<string, unknown> | null
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const data = await apiFetch<{ order: Order }>(`/api/orders`, {
    method: "POST",
    body: JSON.stringify(input),
  })
  return data.order
}

export async function fetchMyOrders(): Promise<Order[]> {
  const data = await apiFetch<{ orders: Order[] }>(`/api/orders/my-orders`)
  return data.orders
}

export async function fetchAdminOrders(params: { status?: string; type?: string; page?: number; limit?: number } = {}): Promise<{ orders: Order[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && v !== null) q.set(k, String(v))
  })
  return apiFetch(`/api/orders?${q.toString()}`)
}

export async function fetchOrder(id: string): Promise<Order> {
  const data = await apiFetch<{ order: Order }>(`/api/orders/${id}`)
  return data.order
}

export async function updateOrderStatus(id: string, status: string): Promise<Order> {
  const data = await apiFetch<{ order: Order }>(`/api/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  })
  return data.order
}

export async function cancelOrder(id: string, reason: string): Promise<Order> {
  const data = await apiFetch<{ order: Order }>(`/api/orders/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  })
  return data.order
}

export async function fetchWorkers(): Promise<Worker[]> {
  const data = await apiFetch<{ workers: Worker[] }>(`/api/production/workers`)
  return data.workers
}

export async function fetchMachines(): Promise<Machine[]> {
  const data = await apiFetch<{ machines: Machine[] }>(`/api/production/machines`)
  return data.machines
}

export async function fetchProductionJobs(params: { status?: string; limit?: number } = {}): Promise<{ jobs: ProductionJob[]; pagination?: { total: number } }> {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && v !== null) q.set(k, String(v))
  })
  return apiFetch(`/api/production/jobs?${q.toString()}`)
}

export async function createProductionJob(input: { orderId: string; orderItemId?: string; productId?: string; notes?: string }): Promise<ProductionJob> {
  const data = await apiFetch<{ job: ProductionJob }>(`/api/production/jobs`, {
    method: "POST",
    body: JSON.stringify(input),
  })
  return data.job
}

export async function updateJobStatus(id: string, status: string): Promise<ProductionJob> {
  const data = await apiFetch<{ job: ProductionJob }>(`/api/production/jobs/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  })
  return data.job
}

export async function assignJobWorkers(id: string, workerIds: string[]): Promise<ProductionJob> {
  const data = await apiFetch<{ job: ProductionJob }>(`/api/production/jobs/${id}/assign`, {
    method: "POST",
    body: JSON.stringify({ workerIds }),
  })
  return data.job
}

export async function updateJobQc(id: string, qcStatus: string, notes?: string): Promise<ProductionJob> {
  const data = await apiFetch<{ job: ProductionJob }>(`/api/production/jobs/${id}/qc`, {
    method: "PATCH",
    body: JSON.stringify({ qcStatus, notes }),
  })
  return data.job
}

export async function createWorker(input: { name: string; email: string; phone?: string; specialty?: string; password?: string }): Promise<{ worker: Worker }> {
  return apiFetch(`/api/workers`, {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function createMachine(input: { name: string; type?: string; code?: string; status?: string; location?: string; maintenanceNotes?: string }): Promise<{ machine: Machine }> {
  return apiFetch(`/api/production/machines`, {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function createMaterial(input: { name: string; category?: string; unit?: string; currentQuantity?: number; minStockLevel?: number; notes?: string }): Promise<{ material: Material }> {
  return apiFetch(`/api/inventory/materials`, {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function addStockMovement(input: { materialId: string; type: string; quantity: number; notes?: string }): Promise<StockMovement> {
  const data = await apiFetch<{ movement: StockMovement }>(`/api/inventory/movements`, {
    method: "POST",
    body: JSON.stringify(input),
  })
  return data.movement
}

export async function fetchMaterials(): Promise<{ materials: Material[]; lowStock: Material[]; lowStockCount: number }> {
  return apiFetch(`/api/inventory/materials`)
}

export async function fetchCommissions(): Promise<{ commissions: Commission[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
  return apiFetch(`/api/commissions`)
}

export async function fetchMyCommissions(): Promise<Commission[]> {
  const data = await apiFetch<{ commissions: Commission[] }>(`/api/commissions/mine`)
  return data.commissions
}

export async function updateCommissionStatus(id: string, status: "Paid" | "Void"): Promise<Commission> {
  const data = await apiFetch<{ commission: Commission }>(`/api/commissions/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  })
  return data.commission
}

export async function fetchAdminOverview(): Promise<{
  counts: { sellers: number; pendingSellers: number; products: number; pendingProducts: number; orders: number; workers: number }
  paymentStats: { totalRevenue: number; completedCount: number; pendingCount: number; failedCount: number }
  recentSellers: { id: string; username: string; email: string; status: string; createdAt: string }[]
  recentProducts: { id: string; name: string; status: string; createdAt: string; seller: { username: string; email: string } | null }[]
  recentOrders: { id: string; orderNumber: string; totalPrice: number; status: string; createdAt: string; customer: { username: string; email: string } | null }[]
}> {
  return apiFetch(`/api/admin/overview`)
}

export interface ProductInput {
  name: string
  description?: string
  categoryId?: string
  gender?: string
  ageGroup?: string
  brandId?: string
  countryOfOrigin?: string
  fabric?: string
  isReadyMade: boolean
  isCustomizable: boolean
  images: { position: string; url: string }[]
  videoUrl?: string
  displayPhone?: string
  contactMode?: string
  variants: { sizeId?: string; colorId?: string; price: number; stock: number; sku?: string }[]
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const data = await apiFetch<{ product: Product }>(`/api/products`, {
    method: "POST",
    body: JSON.stringify(input),
  })
  return data.product
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<Product> {
  const data = await apiFetch<{ product: Product }>(`/api/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  })
  return data.product
}

export async function deleteProduct(id: string): Promise<void> {
  await apiFetch(`/api/products/${id}`, { method: "DELETE" })
}

export async function adminApproveProduct(id: string): Promise<void> {
  await apiFetch(`/api/admin/products/${id}/approve`, { method: "PATCH" })
}

export async function adminRejectProduct(id: string, reason: string): Promise<void> {
  await apiFetch(`/api/admin/products/${id}/reject`, { method: "PATCH", body: JSON.stringify({ reason }) })
}

export async function adminSetProductStatus(id: string, status: string): Promise<void> {
  await apiFetch(`/api/admin/products/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) })
}

export async function fetchAdminProducts(params: { status?: string; page?: number; limit?: number } = {}): Promise<{ products: Product[]; pagination?: { total: number } }> {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && v !== null) q.set(k, String(v))
  })
  return apiFetch(`/api/admin/products?${q.toString()}`)
}

export async function fetchAdminUsers(): Promise<any[]> {
  const data = await apiFetch<{ users: any[] }>(`/api/admin/users`)
  return data.users
}

export async function fetchAdminPayments(): Promise<Payment[]> {
  const data = await apiFetch<{ payments: Payment[] }>(`/api/admin/payments`, {})
  if (Array.isArray(data)) return data as unknown as Payment[]
  return (data as { payments?: Payment[] }).payments || []
}

export async function fetchSellerProducts(): Promise<Product[]> {
  const data = await apiFetch<{ products: Product[] }>(`/api/products/mine`)
  return data.products
}