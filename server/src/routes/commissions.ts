import { Router } from 'express'
import { authMiddleware, adminMiddleware } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { isValidUuid } from '../utils/validation.js'

const router = Router()

const commissionInclude = {
  seller: { select: { id: true, username: true, email: true, phone: true, profilePhoto: true } },
  order: { select: { id: true, orderNumber: true, totalPrice: true, type: true, status: true } },
  product: { select: { id: true, name: true, slug: true, images: true } },
}

router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const where: any = {}
    if (req.query.sellerId) where.sellerId = String(req.query.sellerId)
    if (req.query.status && req.query.status !== 'all') where.status = String(req.query.status)

    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 100))

    const [total, commissions] = await Promise.all([
      prisma.commission.count({ where }),
      prisma.commission.findMany({
        where,
        include: commissionInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])
    res.json({ commissions, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch commissions' })
  }
})

router.get('/mine', authMiddleware, async (req, res) => {
  try {
    if (req.user!.role !== 'agent' && req.user!.role !== 'owner') {
      return res.status(403).json({ message: 'Seller access required' })
    }
    const commissions = await prisma.commission.findMany({
      where: { sellerId: req.user!.userId },
      include: commissionInclude,
      orderBy: { createdAt: 'desc' },
    })
    res.json({ commissions })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch your commissions' })
  }
})

router.patch('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if (!isValidUuid(req.params.id)) return res.status(404).json({ message: 'Commission not found' })
    const commission = await prisma.commission.findUnique({ where: { id: req.params.id } })
    if (!commission) return res.status(404).json({ message: 'Commission not found' })

    const status = String(req.body.status || commission.status)
    const updates: any = { status }
    if (status === 'Paid') updates.paidAt = new Date()
    if (status === 'Pending') updates.paidAt = null

    const updated = await prisma.commission.update({
      where: { id: commission.id },
      data: updates,
      include: commissionInclude,
    })
    res.json({ message: 'Commission updated', commission: updated })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to update commission' })
  }
})

export default router