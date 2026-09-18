import { Router } from 'express'
import { authMiddleware, agentMiddleware, requireActiveUser, getRequestUserId } from '../middleware/auth.js'
import { productSchema, isValidUuid, cleanPayload } from '../utils/validation.js'
import { prisma, withPrismaRetry } from '../lib/prisma.js'
import { notifyAdmins } from '../utils/notifications.js'
import { resolveSystemAdmin } from '../utils/admin-contact.js'
import { assertListingPermissionAllowed } from './permissions.js'

const router = Router()

const ALLOWED_UPDATE_FIELDS = [
  'name', 'description', 'categoryId', 'gender', 'ageGroup', 'brandId',
  'countryOfOrigin', 'fabric', 'isReadyMade', 'isCustomizable', 'featured',
  'images', 'videoUrl',
]

const sellerSelect = { id: true, username: true, email: true, phone: true, profilePhoto: true }

const PUBLIC_STATUSES = ['Approved', 'OutOfStock']

function normalizeImages(raw: any): { position: string; url: string }[] {
  if (!Array.isArray(raw)) return []
  const positions = ['front', 'back', 'left', 'right', 'seatedFront', 'seatedBack']
  return raw
    .map((entry, index) => {
      if (typeof entry === 'string') {
        return { position: positions[index] || `extra${index}`, url: entry.trim() }
      }
      if (entry && typeof entry === 'object' && entry.url) {
        return { position: entry.position || positions[index] || `extra${index}`, url: String(entry.url).trim() }
      }
      return null
    })
    .filter((x: any) => x && x.url) as { position: string; url: string }[]
}


router.get('/', async (req, res) => {
  try {
    const where: any = { status: { in: PUBLIC_STATUSES } }
    if (req.query.category) {
      where.category = { slug: String(req.query.category) }
    }
    if (req.query.categoryId) where.categoryId = String(req.query.categoryId)
    if (req.query.gender) where.gender = String(req.query.gender)
    if (req.query.brandId) where.brandId = String(req.query.brandId)
    if (req.query.sellerId) where.sellerId = String(req.query.sellerId)
    if (req.query.isReadyMade === 'true') where.isReadyMade = true
    if (req.query.isCustomizable === 'true') where.isCustomizable = true
    if (req.query.featured === 'true') where.featured = true
    if (req.query.search) {
      where.OR = [
        { name: { contains: String(req.query.search), mode: 'insensitive' as const } },
        { description: { contains: String(req.query.search), mode: 'insensitive' as const } },
        { fabric: { contains: String(req.query.search), mode: 'insensitive' as const } },
      ]
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 100))

    const [total, products] = await withPrismaRetry(async () => {
      const total = await prisma.product.count({ where })
      const products = await prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true, gender: true } },
          brand: { select: { id: true, name: true, origin: true } },
          seller: { select: sellerSelect },
          variants: {
            where: { stock: { gt: 0 } },
            include: { size: { select: { id: true, name: true } }, color: { select: { id: true, name: true, hex: true } } },
            orderBy: { price: 'asc' as const },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      })
      return [total, products] as const
    })
    res.json({ products, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch products' })
  }
})


router.get('/mine', authMiddleware, agentMiddleware, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { sellerId: req.user!.userId },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        variants: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ products })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch your products' })
  }
})


router.get('/:id', async (req, res) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(404).json({ message: 'Product not found' })
    }
    const product = await withPrismaRetry(() =>
      prisma.product.findUnique({
        where: { id: req.params.id },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, origin: true } },
          seller: { select: sellerSelect },
          variants: {
            where: { status: 'active' },
            include: { size: { select: { id: true, name: true } }, color: { select: { id: true, name: true, hex: true } } },
            orderBy: { price: 'asc' },
          },
          reviews: { select: { id: true, rating: true, comment: true, createdAt: true }, orderBy: { createdAt: 'desc' } },
        },
      })
    )
    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }

    const caller = getRequestUserId(req)
    const isSellerOrAdmin = caller && (caller.role === 'admin' || caller.userId === product.sellerId)
    if (!PUBLIC_STATUSES.includes(product.status) && !isSellerOrAdmin) {
      return res.status(404).json({ message: 'Product not found' })
    }

    if (!isSellerOrAdmin) {
      await prisma.product.update({ where: { id: product.id }, data: { views: { increment: 1 } } }).catch(() => {})
    }

    const rating = product.reviews.length
      ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
      : 0

    res.json({ product: { ...product, rating: Math.round(rating * 10) / 10 } })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch product' })
  }
})


router.post('/', authMiddleware, agentMiddleware, requireActiveUser, async (req, res) => {
  try {
    const parsed = productSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation error', errors: parsed.error.flatten() })
    }

    const photos = normalizeImages(parsed.data.images)
    if (photos.length < 4) {
      return res.status(400).json({ message: 'At least 4 product images are required (front, back, left, right).' })
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { username: true, phone: true, profilePhoto: true, role: true },
    })
    const isAdmin = currentUser?.role === 'admin'

    const contactName = parsed.data.contactName?.trim() || ''
    const contactPhone = parsed.data.contactPhone?.trim() || ''
    const { contactName: _cn, contactPhone: _cp, variants, price, stock, ...productData } = parsed.data

    const contactMode = parsed.data.contactMode || 'Admin'
    let sellerName = contactName || currentUser?.username || req.user!.email
    let displayPhone: string | null = contactPhone || currentUser?.phone || null
    let displayPhoto = currentUser?.profilePhoto || null
    let contactUserId: string | null = req.user!.userId
    if (contactMode === 'Admin') {
      const admin = await resolveSystemAdmin()
      sellerName = admin.name
      displayPhone = admin.phone
      displayPhoto = admin.photo || null
      contactUserId = admin.id ?? req.user!.userId
    }

    const slug = (parsed.data.slug?.trim() || parsed.data.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    const product = await prisma.product.create({
      data: {
        ...cleanPayload(productData),
        slug,
        images: photos,
        contactMode,
        sellerId: req.user!.userId,
        sellerName,
        status: isAdmin ? 'Approved' : 'Pending',
        displayPhone,
        contactUserId,
      },
    })

    const variantData = Array.isArray(variants) && variants.length > 0
      ? variants.map((v, index) => ({
          sku: v.sku?.trim() || `${slug.toUpperCase()}-${index}`,
          productId: product.id,
          sizeId: v.sizeId || null,
          colorId: v.colorId || null,
          price: v.price,
          stock: v.stock ?? 0,
        }))
      : [
          {
            sku: `${slug.toUpperCase()}-FREE`,
            productId: product.id,
            sizeId: null,
            colorId: null,
            price: price ?? 0,
            stock: stock ?? 0,
          },
        ]
    await prisma.productVariant.createMany({ data: variantData })

    if (!isAdmin) {
      notifyAdmins(
        'New Product Listing',
        `A new product "${parsed.data.name}" has been posted and needs review.`,
        'info',
        { entityType: 'PRODUCT', entityId: product.id, type: 'product', id: product.id }
      ).catch(() => {})
    }

    res.status(201).json({ message: 'Product created', product })
  } catch (err: any) {
    console.error('[Create Product Error]', err)
    res.status(500).json({ message: err.message || 'Failed to create product' })
  }
})


router.patch('/:id', authMiddleware, agentMiddleware, requireActiveUser, async (req, res) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(404).json({ message: 'Product not found' })
    }
    const product = await prisma.product.findUnique({ where: { id: req.params.id } })
    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }

    if (product.sellerId !== req.user!.userId && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' })
    }

    const permission = await assertListingPermissionAllowed({
      requesterId: req.user!.userId,
      isAdmin: req.user!.role === 'admin',
      entityType: 'PRODUCT',
      entityId: product.id,
      listingStatus: product.status,
      type: 'EDIT',
    })
    if (!permission.allowed) {
      return res.status(403).json({ code: 'PERMISSION_REQUIRED', message: 'Approved products require admin permission to edit.' })
    }

    const parsed = productSchema.partial().safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation error', errors: parsed.error.flatten() })
    }

    const updates: Record<string, any> = {}
    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (parsed.data[field as keyof typeof parsed.data] !== undefined) {
        updates[field] = parsed.data[field as keyof typeof parsed.data]
      }
    }

    if (parsed.data.images !== undefined) {
      const photos = normalizeImages(parsed.data.images)
      if (photos.length < 4) {
        return res.status(400).json({ message: 'At least 4 product images are required.' })
      }
      updates.images = photos
    }

    if (parsed.data.contactMode) {
      if (parsed.data.contactMode === 'Admin') {
        const admin = await resolveSystemAdmin()
        updates.sellerName = admin.name
        updates.displayPhone = admin.phone
        updates.contactUserId = admin.id ?? req.user!.userId
      } else {
        const contactName = parsed.data.contactName?.trim() || ''
        const contactPhone = parsed.data.contactPhone?.trim() || ''
        if (contactName) updates.sellerName = contactName
        if (contactPhone) updates.displayPhone = contactPhone
        updates.contactUserId = req.user!.userId
      }
    }

    if (req.user!.role !== 'admin') {
      updates.status = 'Pending'
      updates.rejectionReason = null
    }

    const updated = await prisma.product.update({ where: { id: req.params.id }, data: updates })

    if (Array.isArray(parsed.data.variants) && parsed.data.variants.length > 0) {
      await prisma.productVariant.deleteMany({ where: { productId: product.id } })
      const variantData = parsed.data.variants.map((v, index) => ({
        sku: v.sku?.trim() || `${product.slug.toUpperCase()}-${index}`,
        productId: product.id,
        sizeId: v.sizeId || null,
        colorId: v.colorId || null,
        price: v.price,
        stock: v.stock ?? 0,
      }))
      await prisma.productVariant.createMany({ data: variantData })
    }

    res.json({ message: 'Product updated', product: updated })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to update product' })
  }
})


router.delete('/:id', authMiddleware, agentMiddleware, requireActiveUser, async (req, res) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(404).json({ message: 'Product not found' })
    }
    const product = await prisma.product.findUnique({ where: { id: req.params.id } })
    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }

    if (product.sellerId !== req.user!.userId && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' })
    }

    const permission = await assertListingPermissionAllowed({
      requesterId: req.user!.userId,
      isAdmin: req.user!.role === 'admin',
      entityType: 'PRODUCT',
      entityId: product.id,
      listingStatus: product.status,
      type: 'DELETE',
    })
    if (!permission.allowed) {
      return res.status(403).json({ code: 'PERMISSION_REQUIRED', message: 'Approved products require admin permission to delete.' })
    }

    await prisma.product.delete({ where: { id: req.params.id } })
    res.json({ message: 'Product deleted' })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to delete product' })
  }
})

export default router