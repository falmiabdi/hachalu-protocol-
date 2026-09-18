import { Router } from 'express'
import { authMiddleware, adminMiddleware, requireActiveUser } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { createOrderSchema, isValidUuid } from '../utils/validation.js'
import { notifyAdmins, createAndBroadcastNotification } from '../utils/notifications.js'

const router = Router()

function generateOrderNumber(): string {
  const now = new Date()
  const d = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const rand = Math.floor(Math.random() * 9000 + 1000)
  return `HACH-${d}-${rand}`
}

const orderInclude = {
  customer: { select: { id: true, username: true, email: true, phone: true, profilePhoto: true } },
  seller: { select: { id: true, username: true, email: true, phone: true, profilePhoto: true } },
  items: {
    include: {
      product: { select: { id: true, name: true, slug: true, images: true } },
      variant: { include: { size: { select: { id: true, name: true } }, color: { select: { id: true, name: true, hex: true } } } },
      template: { select: { id: true, name: true, fields: true } },
      productionJobs: { include: { assignees: { include: { worker: { include: { user: { select: { id: true, username: true } } } } } } } },
    },
  },
}

router.post('/', authMiddleware, requireActiveUser, async (req, res) => {
  try {
    const parsed = createOrderSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation error', errors: parsed.error.flatten() })
    }

    const items = parsed.data.items
    const allCustom = items.every((i) => !i.variantId)
    if (parsed.data.type === 'ready_made' && allCustom) {
      return res.status(400).json({ message: 'Ready-made orders require a chosen variant for each item.' })
    }

    const order = await prisma.$transaction(async (tx) => {
      let totalPrice = 0
      let sellerId: string | null = null

      const orderItems = []
      for (const line of items) {
        let productId = line.productId || null
        let unitPrice = line.unitPrice ?? 0
        let variantId = line.variantId || null

        if (variantId) {
          const variant = await tx.productVariant.findUnique({
            where: { id: variantId },
            include: { product: { select: { id: true, sellerId: true, slug: true } } },
          })
          if (!variant) throw new Error('Variant not found')
          variantId = variant.id
          productId = variant.productId
          unitPrice = unitPrice || variant.price
          sellerId = variant.product.sellerId
        } else if (productId) {
          const product = await tx.product.findUnique({ where: { id: productId } })
          if (!product) throw new Error('Product not found')
          sellerId = product.sellerId
        }

        let templateId = line.templateId || null
        if (parsed.data.type === 'custom' && line.measurementValues) {
          if (!templateId) throw new Error('A measurement template is required for custom orders')
          const template = await tx.measurementTemplate.findUnique({ where: { id: templateId } })
          if (!template) throw new Error('Measurement template not found')
        }

        const subtotal = unitPrice * line.quantity
        totalPrice += subtotal
        orderItems.push({
          type: parsed.data.type,
          productId,
          variantId,
          quantity: line.quantity,
          unitPrice,
          subtotal,
          templateId,
          measurementId: null,
          styleNotes: line.styleNotes ? (JSON.parse(JSON.stringify(line.styleNotes)) as any) : undefined,
        })
      }

      const created = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          type: parsed.data.type,
          customerId: req.user!.userId,
          sellerId:
            items.length === 1 && sellerId
              ? sellerId
              : (req.user!.role === 'admin' ? null : sellerId),
          status: 'PendingPayment',
          totalPrice,
          paymentStatus: 'Pending',
          notes: parsed.data.notes || null,
          deliveryInfo: parsed.data.deliveryInfo ? (parsed.data.deliveryInfo as any) : undefined,
          items: { create: orderItems },
        },
        include: orderInclude,
      })

      for (const line of items) {
        const { variantId: vId, quantity } = line
        if (vId) {
          const variant = await tx.productVariant.findUnique({ where: { id: vId } })
          if (variant && variant.stock < quantity) throw new Error('Insufficient stock')
          await tx.productVariant.update({
            where: { id: vId },
            data: { stock: { decrement: quantity }, status: 'active' },
          }).catch(() => {})
        }
      }

      return created
    })

    notifyAdmins(
      'New Order',
      `Order ${order.orderNumber} (${order.totalPrice} ETB) was placed.`,
      'info',
      { entityType: 'ORDER', entityId: order.id, orderId: order.id, type: 'order' }
    ).catch(() => {})

    res.status(201).json({ message: 'Order created', order })
  } catch (err: any) {
    console.error('[Create Order Error]', err)
    res.status(500).json({ message: err.message || 'Failed to create order' })
  }
})


router.get('/my-orders', authMiddleware, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { customerId: req.user!.userId },
          ...(req.user!.role === 'admin' ? [] : [{ sellerId: req.user!.userId }]),
        ],
      },
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    })
    res.json({ orders })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch your orders' })
  }
})


router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const where: any = {}
    if (req.query.status && req.query.status !== 'all' && req.query.status !== '') {
      where.status = String(req.query.status)
    }
    if (req.query.type && req.query.type !== 'all') {
      where.type = String(req.query.type)
    }
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 100))
    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({ where, include: orderInclude, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    ])
    res.json({ orders, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch orders' })
  }
})


router.get('/:id', authMiddleware, async (req, res) => {
  try {
    if (!isValidUuid(req.params.id)) return res.status(404).json({ message: 'Order not found' })
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: orderInclude })
    if (!order) return res.status(404).json({ message: 'Order not found' })

    const isAdmin = req.user!.role === 'admin'
    const isCustomer = order.customerId === req.user!.userId
    const isSeller = order.sellerId === req.user!.userId
    if (!isAdmin && !isCustomer && !isSeller) {
      return res.status(403).json({ message: 'Not authorized' })
    }
    res.json({ order })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch order' })
  }
})


const STATUS_FLOW: Record<string, string[]> = {
  PendingPayment: ['Paid', 'Cancelled'],
  Paid: ['MeasurementPending', 'MeasurementConfirmed', 'Assigned', 'InProduction', 'Cancelled'],
  MeasurementPending: ['MeasurementConfirmed', 'Cancelled'],
  MeasurementConfirmed: ['Assigned', 'Cancelled'],
  Assigned: ['InProduction', 'Cancelled'],
  InProduction: ['Packed', 'Cancelled'],
  Packed: ['Delivered'],
  Delivered: ['Completed'],
}

const ALL_ORDER_STATUSES = new Set<string>([
  ...Object.keys(STATUS_FLOW),
  ...Object.values(STATUS_FLOW).flat(),
])

router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    if (!isValidUuid(req.params.id)) return res.status(404).json({ message: 'Order not found' })
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { seller: { select: { id: true, role: true } } } })
    if (!order) return res.status(404).json({ message: 'Order not found' })

    const next = String(req.body.status || '')
    if (!next || !ALL_ORDER_STATUSES.has(next)) {
      return res.status(400).json({ message: 'Invalid target status' })
    }

    const isAdmin = req.user!.role === 'admin'
    const isSeller = order.sellerId === req.user!.userId
    const allowed = STATUS_FLOW[order.status] || []
    if (!isAdmin) {
      if (!isSeller || !allowed.includes(next)) {
        return res.status(403).json({ message: `Cannot move order from ${order.status} to ${next}` })
      }
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: next as any },
    })

    if (next === 'Completed' && order.sellerId) {
      try {
        const setting = await prisma.setting.findUnique({ where: { id: 'default' } })
        const rate = setting?.defaultCommissionRate ?? 0.10
        const amount = Math.round(order.totalPrice * rate * 100) / 100
        const existing = await prisma.commission.findFirst({ where: { orderId: order.id, sellerId: order.sellerId } })
        if (existing) {
          await prisma.commission.update({ where: { id: existing.id }, data: { amount, rate } })
        } else {
          await prisma.commission.create({
            data: {
              sellerId: order.sellerId,
              orderId: order.id,
              scope: 'Order',
              rate,
              amount,
              status: 'Pending',
            },
          })
        }
        createAndBroadcastNotification(
          order.sellerId,
          'Commission Earned',
          `You earned a commission of ${amount} ETB on order ${order.orderNumber}.`,
          'success',
          { orderId: order.id, type: 'commission' }
        ).catch(() => {})
      } catch (e) {
        console.error('[Commission Create Error]', e)
      }
    }

    createAndBroadcastNotification(
      order.customerId,
      'Order Status Updated',
      `Your order ${order.orderNumber} is now ${next.replace(/([A-Z])/g, ' $1').trim()}.`,
      'info',
      { orderId: order.id }
    ).catch(() => {})

    res.json({ message: 'Order status updated', order: updated })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to update order status' })
  }
})


router.post('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    if (!isValidUuid(req.params.id)) return res.status(404).json({ message: 'Order not found' })
    const order = await prisma.order.findUnique({ where: { id: req.params.id } })
    if (!order) return res.status(404).json({ message: 'Order not found' })

    const canCancel =
      req.user!.role === 'admin' ||
      order.customerId === req.user!.userId &&
      ['PendingPayment', 'Paid', 'MeasurementPending'].includes(order.status)

    if (!canCancel) {
      return res.status(403).json({ message: 'This order cannot be cancelled' })
    }

    const reason = String(req.body.reason || 'Cancelled by customer')
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'Cancelled', cancelledReason: reason },
    })

    notifyAdmins(
      'Order Cancelled',
      `Order ${order.orderNumber} was cancelled. Reason: ${reason}`,
      'info',
      { entityType: 'ORDER', entityId: order.id, orderId: order.id, type: 'order' }
    ).catch(() => {})

    res.json({ message: 'Order cancelled', order: updated })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to cancel order' })
  }
})

export default router