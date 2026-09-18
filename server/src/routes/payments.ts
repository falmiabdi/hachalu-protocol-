import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { isValidUuid } from '../utils/validation.js'

const router = Router()

router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId
    const isAdmin = req.user!.role === 'admin'

    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50))

    let where: any = {}
    if (!isAdmin) {
      const sellerOrderIds = await prisma.order
        .findMany({ where: { sellerId: userId }, select: { id: true } })
        .then((rows) => rows.map((r) => r.id))

      const orClauses: any[] = []
      if (sellerOrderIds.length > 0) {
        orClauses.push({ orderId: { in: sellerOrderIds } })
      }
      orClauses.push({ buyerEmail: req.user!.email })
      where = { OR: orClauses }
    }

    if (req.query.status && req.query.status !== 'all' && req.query.status !== '') {
      where.status = req.query.status
    }

    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    if (!isAdmin && payments.length > 0) {
      const orderIds = [...new Set(payments.map((p) => p.orderId))]
      const orders = await prisma.order.findMany({
        where: { id: { in: orderIds } },
        select: { id: true, orderNumber: true, status: true },
      })
      const orderMap = new Map(orders.map((o) => [o.id, o]))
      ;(payments as any).forEach((p: any) => {
        const o = orderMap.get(p.orderId)
        p.orderNumber = o?.orderNumber || null
        p.orderStatus = o?.status || null
      })
    }

    const [completedAgg, pendingCount, failedCount] = await Promise.all([
      prisma.payment.aggregate({
        where: { ...where, status: 'Completed' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payment.count({ where: { ...where, status: 'Pending' } }),
      prisma.payment.count({ where: { ...where, status: 'Failed' } }),
    ])

    const stats = {
      totalRevenue: completedAgg._sum.amount || 0,
      completedCount: completedAgg._count,
      pendingCount,
      failedCount,
      totalCount: total,
    }

    res.json({
      payments,
      stats,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch payments' })
  }
})

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(404).json({ message: 'Payment not found' })
    }
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id } })
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' })
    }

    const isAdmin = req.user!.role === 'admin'
    const isBuyer = payment.buyerEmail === req.user!.email

    const order = await prisma.order.findFirst({
      where: { id: payment.orderId },
      select: { id: true, sellerId: true, orderNumber: true, status: true },
    })
    const isSeller = order?.sellerId === req.user!.userId

    if (!isAdmin && !isBuyer && !isSeller) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    res.json({ payment, order: order || null })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch payment' })
  }
})

export default router