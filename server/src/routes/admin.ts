import { Router } from 'express'
import { authMiddleware, adminMiddleware } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { createAndBroadcastNotification } from '../utils/notifications.js'
import { resolveSystemAdmin } from '../utils/admin-contact.js'
import { hashPassword } from '../utils/password.js'
import { isResendConfigured, testResendConnection } from '../services/email.js'
import { initializeFirebaseAdmin } from '../utils/firebase.js'
import { getAuth } from 'firebase-admin/auth'

function flattenAgent(user: any) {
  const profile = user.profile || {}
  const documents = user.documents || []
  const education = user.education || {}
  const professionalInfo = user.professionalInfo || {}

  const docMap: Record<string, string> = {}
  if (Array.isArray(documents)) {
    for (const d of documents) {
      if (d.type && d.url) docMap[d.type] = d.url
    }
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    rejectionReason: user.rejectionReason,
    isRootAdmin: user.isRootAdmin,
    profilePhoto: user.profilePhoto,
    phone: user.phone,
    onboardingComplete: user.onboardingComplete,
    createdAt: user.createdAt,
    fullName: user.username,
    userType: profile.userType || '',
    gender: profile.gender || '',
    dateOfBirth: profile.dateOfBirth || '',
    nationality: profile.nationality || '',
    preferredLanguage: profile.preferredLanguage || '',
    ethPhone: user.phone || '',
    safaricomPhone: profile.safaricomPhone || '',
    region: profile.region || '',
    city: profile.city || '',
    woreda: profile.woreda || '',
    kebele: profile.kebele || '',
    fullAddress: profile.fullAddress || '',
    faydaFront: docMap.faydaFront || '',
    faydaBack: docMap.faydaBack || '',
    selfieFayda: docMap.selfieFayda || '',
    passportPhoto: docMap.passportPhoto || '',
    highestEducation: education.level || '',
    educationCertificate: education.certificate || '',
    agentExperience: professionalInfo.experience || '',
    companyName: professionalInfo.companyName || '',
    officeAddress: professionalInfo.officeAddress || '',
    businessLicenseNumber: professionalInfo.licenseNumber || '',
    businessLicenseFile: professionalInfo.licenseFile || '',
    tinNumber: professionalInfo.tinNumber || '',
  }
}

const router = Router()

router.get('/agents', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const where: any = { role: { in: ['agent', 'owner'] } }

    if (req.query.status && req.query.status !== 'all' && req.query.status !== '') {
      where.status = req.query.status
    }

    if (req.query.search) {
      const search = String(req.query.search)
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 100))
    const [total, agents] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    ])
    res.json({ agents: agents.map(flattenAgent), pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch sellers' })
  }
})

router.post('/agents', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { action, id, rejectionReason } = req.body

    if (!id || !action) {
      return res.status(400).json({ message: 'Missing id or action' })
    }

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      return res.status(404).json({ message: 'Seller not found' })
    }

    if (user.isRootAdmin) {
      return res.status(400).json({ message: 'Cannot delete the root admin account' })
    }

    switch (action) {
      case 'approve':
        await prisma.user.update({ where: { id }, data: { status: 'Approved', rejectionReason: null } })
        createAndBroadcastNotification(
          id,
          'Account Approved',
          'Your seller account has been approved. You can now post products.',
          'success'
        ).catch(() => {})
        break
      case 'reject':
        await prisma.user.update({ where: { id }, data: { status: 'Rejected', rejectionReason: rejectionReason || 'No reason provided' } })
        createAndBroadcastNotification(
          id,
          'Account Rejected',
          `Your seller account has been rejected. Reason: ${rejectionReason || 'No reason provided'}`,
          'error'
        ).catch(() => {})
        break
      case 'suspend':
        await prisma.user.update({ where: { id }, data: { status: 'Suspended' } })
        createAndBroadcastNotification(
          id,
          'Account Suspended',
          'Your seller account has been suspended. Please contact support for more information.',
          'warning'
        ).catch(() => {})
        break
      case 'reactivate':
        await prisma.user.update({ where: { id }, data: { status: 'Approved', rejectionReason: null } })
        createAndBroadcastNotification(
          id,
          'Account Reactivated',
          'Your seller account has been reactivated. You can now post products.',
          'success'
        ).catch(() => {})
        break
      case 'delete':
        await deleteUserCascade(id, req.user!.userId)
        return res.json({ message: 'Seller deleted' })
      default:
        return res.status(400).json({ message: `Unknown action: ${action}` })
    }

    res.json({ message: 'Seller status updated successfully' })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to process action' })
  }
})

async function deleteUserCascade(userId: string, actingAdminId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('User not found')

  const products = await prisma.product.findMany({
    where: { sellerId: userId },
    select: { id: true, status: true },
  })

  const POSTED = ['Approved', 'OutOfStock']
  const postedProductIds = products.filter((p) => POSTED.includes(p.status)).map((p) => p.id)
  const deleteProductIds = products.filter((p) => !POSTED.includes(p.status)).map((p) => p.id)

  if (postedProductIds.length > 0) {
    const admin = await resolveAdminContact(actingAdminId)
    await prisma.product.updateMany({
      where: { id: { in: postedProductIds } },
      data: {
        sellerId: actingAdminId,
        sellerName: admin.name,
        displayPhone: admin.phone,
        contactMode: 'Admin',
        contactUserId: admin.id ?? actingAdminId,
      },
    })
  }

  if (deleteProductIds.length > 0) {
    await prisma.product.deleteMany({ where: { id: { in: deleteProductIds } } })
  }

  const messageOr: any[] = [{ senderId: userId }, { recipientId: userId }]
  if (deleteProductIds.length > 0) {
    messageOr.push({ productId: { in: deleteProductIds } })
  }
  await prisma.message.deleteMany({ where: { OR: messageOr } })
  await prisma.savedItem.deleteMany({ where: { userId } })
  await prisma.notification.deleteMany({ where: { userId } })
  await prisma.worker.deleteMany({ where: { userId } })

  if (user.firebaseUid) {
    try {
      await getAuth(initializeFirebaseAdmin()).deleteUser(user.firebaseUid)
    } catch (err: any) {
      console.warn(`[Delete User] Firebase account deletion skipped: ${err?.message}`)
    }
  }

  await prisma.user.delete({ where: { id: userId } })
}

async function resolveAdminContact(_userId: string) {
  return resolveSystemAdmin()
}


router.patch('/products/:id/contact', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { seller: { select: { id: true, username: true, phone: true, profilePhoto: true } } },
    })
    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }

    const admin = await resolveAdminContact(req.user!.userId)
    const seller = product.seller

    const showingAdmin =
      (product.sellerName?.trim() || '') === admin.name &&
      (product.displayPhone?.trim() || '') === admin.phone

    const nextAdmin = !showingAdmin
    await prisma.product.update({
      where: { id: req.params.id },
      data: {
        sellerName: nextAdmin ? admin.name : seller?.username?.trim() || admin.name,
        displayPhone: nextAdmin ? admin.phone : seller?.phone?.trim() || admin.phone,
        contactMode: nextAdmin ? 'Admin' : 'Owner',
        contactUserId: nextAdmin ? admin.id ?? req.user!.userId : seller?.id || null,
      },
    })
    const updated = await prisma.product.findUnique({
      where: { id: req.params.id },
      select: { sellerName: true, displayPhone: true, contactMode: true },
    })

    res.json({ message: 'Contact updated', contact: nextAdmin ? 'admin' : 'seller', ...updated })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to update contact' })
  }
})


router.get('/products', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const where: any = {}
    if (req.query.status && req.query.status !== 'all' && req.query.status !== '') {
      where.status = req.query.status
    }
    if (req.query.search) {
      where.name = { contains: String(req.query.search), mode: 'insensitive' }
    }
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 100))
    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          seller: { select: { id: true, username: true, email: true, phone: true, profilePhoto: true, role: true } },
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true } },
          _count: { select: { variants: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])
    res.json({ products, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch products' })
  }
})

router.patch('/products/:id/approve', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } })
    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }
    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: { status: 'Approved', rejectionReason: null },
    })
    createAndBroadcastNotification(
      product.sellerId,
      'Product Approved',
      `Your product "${product.name}" has been approved and is now live.`,
      'success',
      { type: 'product', id: product.id }
    ).catch(() => {})
    res.json({ message: 'Product approved', product: updated })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to approve product' })
  }
})

router.patch('/products/:id/reject', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } })
    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }
    const reason = (req.body?.reason as string) || (req.body?.rejectionReason as string) || 'No reason provided'
    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: { status: 'Rejected', rejectionReason: reason },
    })
    createAndBroadcastNotification(
      product.sellerId,
      'Product Rejected',
      `Your product "${product.name}" was rejected. Reason: ${reason}`,
      'error',
      { type: 'product', id: product.id }
    ).catch(() => {})
    res.json({ message: 'Product rejected', product: updated })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to reject product' })
  }
})

router.patch('/products/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const status = req.body?.status as string
    const allowed = ['Approved', 'OutOfStock', 'Archived']
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Allowed: Approved, OutOfStock, Archived.' })
    }
    const product = await prisma.product.findUnique({ where: { id: req.params.id } })
    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }
    if (product.status === status) {
      return res.json({ message: 'Product status unchanged', product: { ...product, status } })
    }
    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: { status: status as any, rejectionReason: status === 'Approved' ? null : product.rejectionReason },
    })
    createAndBroadcastNotification(
      product.sellerId,
      'Product Status Updated',
      `Your product "${product.name}" is now ${status.replace(/([A-Z])/g, ' $1').trim()}.`,
      status === 'Approved' ? 'success' : 'info',
      { type: 'product', id: product.id }
    ).catch(() => {})
    res.json({ message: 'Product status updated', product: updated })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to update product status' })
  }
})


router.get('/orders', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const where: any = {}
    if (req.query.status && req.query.status !== 'all' && req.query.status !== '') {
      where.status = req.query.status
    }
    if (req.query.type && req.query.type !== 'all') {
      where.type = req.query.type
    }
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 100))
    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          customer: { select: { id: true, username: true, email: true, phone: true } },
          seller: { select: { id: true, username: true, email: true, phone: true } },
          items: { include: { product: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])
    res.json({ orders, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch orders' })
  }
})

router.patch('/orders/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } })
    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }
    const status = String(req.body.status || '')
    if (!status) {
      return res.status(400).json({ message: 'status is required' })
    }
    const updated = await prisma.order.update({ where: { id: order.id }, data: { status: status as any } })
    createAndBroadcastNotification(
      order.customerId,
      'Order Status Updated',
      `Your order ${order.orderNumber} is now ${status.replace(/([A-Z])/g, ' $1').trim()}.`,
      'info',
      { orderId: order.id }
    ).catch(() => {})
    res.json({ message: 'Order status updated', order: updated })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to update order status' })
  }
})


router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 100))
    const [total, users] = await Promise.all([
      prisma.user.count(),
      prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          roles: true,
          status: true,
          rejectionReason: true,
          isRootAdmin: true,
          profilePhoto: true,
          phone: true,
          onboardingComplete: true,
          emailVerified: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])
    res.json({ users, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch users' })
  }
})

router.post('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { action, id } = req.body

    if (!id || !action) {
      return res.status(400).json({ message: 'Missing id or action' })
    }

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    if (user.isRootAdmin) {
      return res.status(400).json({ message: 'Cannot delete the root admin account' })
    }

    switch (action) {
      case 'suspend':
        await prisma.user.update({ where: { id }, data: { status: 'Suspended' } })
        break
      case 'activate':
        await prisma.user.update({ where: { id }, data: { status: 'Approved' } })
        break
      case 'delete':
        await deleteUserCascade(id, req.user!.userId)
        return res.json({ message: 'User deleted' })
      default:
        return res.status(400).json({ message: `Unknown action: ${action}` })
    }

    res.json({ message: 'User status updated successfully' })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to process action' })
  }
})

router.put('/profile', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { phone, profilePhoto, email } = req.body
    const updateData: Record<string, any> = {}
    if (phone !== undefined) updateData.phone = phone
    if (profilePhoto !== undefined) updateData.profilePhoto = profilePhoto
    if (email !== undefined) {
      const existing = await prisma.user.findFirst({ where: { email } })
      if (existing && existing.id !== req.user!.userId) {
        return res.status(409).json({ message: 'Email already in use' })
      }
      updateData.email = email
    }
    await prisma.user.update({ where: { id: req.user!.userId }, data: updateData })
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, username: true, email: true, phone: true, profilePhoto: true, role: true, isRootAdmin: true },
    })
    res.json({ message: 'Profile updated', user })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to update profile' })
  }
})

router.post('/create', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { id: req.user!.userId } })
    if (!currentUser?.isRootAdmin) {
      return res.status(403).json({ message: 'Only root admin can create new admins' })
    }
    const { username, email, password } = req.body
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' })
    }
    const existing = await prisma.user.findFirst({ where: { email } })
    if (existing) {
      return res.status(409).json({ message: 'Email already in use' })
    }
    const hashedPassword = await hashPassword(password)
    const admin = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: 'admin',
        roles: ['admin'],
        status: 'Approved',
      },
    })
    res.status(201).json({ message: 'Admin created', admin: { id: admin.id, username, email, role: 'admin' } })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to create admin' })
  }
})

router.get('/overview', authMiddleware, adminMiddleware, async (_req, res) => {
  try {
    const [sellerCount, pendingSellerCount, productCount, pendingProductCount, orderCount, workerCount] =
      await Promise.all([
        prisma.user.count({ where: { role: 'agent' } }),
        prisma.user.count({ where: { role: 'agent', status: 'Pending' } }),
        prisma.product.count(),
        prisma.product.count({ where: { status: 'Pending' } }),
        prisma.order.count(),
        prisma.worker.count(),
      ])

    const rawStats = await prisma.$queryRaw<
      { status: string; count: number; totalAmount: string }[]
    >`SELECT status, COUNT(*)::int AS count, COALESCE(SUM(amount), 0) AS "totalAmount" FROM payments GROUP BY status`

    const statsArr = rawStats as { status: string; count: number; totalAmount: string }[]
    const paymentStats = { totalRevenue: 0, completedCount: 0, pendingCount: 0, failedCount: 0 }
    for (const row of statsArr) {
      const amount = Number(row.totalAmount) || 0
      const count = Number(row.count) || 0
      if (row.status === 'Completed') { paymentStats.completedCount = count; paymentStats.totalRevenue += amount }
      else if (row.status === 'Pending') { paymentStats.pendingCount = count }
      else if (row.status === 'Failed') { paymentStats.failedCount = count }
    }

    const [recentSellers, recentPayments, recentProducts, recentOrders] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'agent' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, username: true, email: true, status: true, createdAt: true },
      }),
      prisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, orderTitle: true, method: true, paymentType: true, status: true, amount: true },
      }),
      prisma.product.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true, name: true, status: true, createdAt: true,
          seller: { select: { username: true, email: true } },
        },
      }),
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true, orderNumber: true, totalPrice: true, status: true, createdAt: true,
          customer: { select: { username: true, email: true } },
        },
      }),
    ])

    res.json({
      counts: {
        sellers: sellerCount, pendingSellers: pendingSellerCount,
        products: productCount, pendingProducts: pendingProductCount,
        orders: orderCount, workers: workerCount,
      },
      paymentStats,
      recentSellers,
      recentPayments,
      recentProducts,
      recentOrders,
    })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch overview' })
  }
})

router.get('/stats', authMiddleware, adminMiddleware, async (_req, res) => {
  try {
    const [userCount, productCount, orderCount, paymentCount] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.order.count(),
      prisma.payment.count(),
    ])

    const rawStats = await prisma.$queryRaw<
      { status: string; count: number; totalAmount: string }[]
    >`SELECT status, COUNT(*)::int AS count, COALESCE(SUM(amount), 0) AS "totalAmount" FROM payments GROUP BY status`

    const statsArr = rawStats as { status: string; count: number; totalAmount: string }[]
    const paymentStats = {
      totalRevenue: 0,
      completedCount: 0,
      pendingCount: 0,
      failedCount: 0,
      totalCount: paymentCount,
    }
    for (const row of statsArr) {
      const amount = Number(row.totalAmount) || 0
      const count = Number(row.count) || 0
      if (row.status === 'Completed') {
        paymentStats.completedCount = count
        paymentStats.totalRevenue += amount
      } else if (row.status === 'Pending') {
        paymentStats.pendingCount = count
      } else if (row.status === 'Failed') {
        paymentStats.failedCount = count
      }
    }

    res.json({
      users: userCount,
      products: productCount,
      orders: orderCount,
      payments: paymentCount,
      paymentStats,
    })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch stats' })
  }
})

router.post('/resend-test', authMiddleware, async (_req, res) => {
  try {
    const to = process.env.RESEND_FROM_EMAIL || process.env.RESEND_FORCE_TO
    if (!to) {
      return res.status(400).json({ ok: false, message: 'Resend from email is not set (RESEND_FROM_EMAIL).' })
    }
    const result = await testResendConnection(to)
    if (!result.ok) {
      return res.status(502).json({ ok: false, message: result.message })
    }
    res.json({ ok: true, message: result.message, sentTo: maskEmail(to) })
  } catch (err: any) {
    res.status(502).json({ ok: false, message: err?.message || 'Failed to send Resend test email.' })
  }
})

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return '***'
  const visible = local.slice(0, Math.min(2, local.length))
  return `${visible}${'*'.repeat(Math.max(1, local.length - 2))}@${domain}`
}

export default router