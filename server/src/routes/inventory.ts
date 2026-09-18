import { Router } from 'express'
import { authMiddleware, adminMiddleware } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { materialSchema, movementSchema, isValidUuid } from '../utils/validation.js'

const router = Router()


router.get('/materials', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const where: any = {}
    if (req.query.category && req.query.category !== 'all') where.category = String(req.query.category)
    const set = await prisma.setting.findUnique({ where: { id: 'default' } })
    const lowStockThreshold = set?.lowStockThreshold ?? 10

    const materials = await prisma.material.findMany({
      where,
      include: { _count: { select: { movements: true } } },
      orderBy: { name: 'asc' },
    })
    const lowStock = materials.filter((m) => m.currentQuantity <= m.minStockLevel && m.minStockLevel > 0)
    const lowStockCount = await prisma.material.count({
      where: { ...where, currentQuantity: { lte: lowStockThreshold } },
    })

    res.json({ materials, lowStock, lowStockCount })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch materials' })
  }
})


router.post('/materials', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const parsed = materialSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation error', errors: parsed.error.flatten() })
    }
    const material = await prisma.material.create({
      data: {
        name: parsed.data.name,
        category: parsed.data.category,
        unit: parsed.data.unit ?? 'meter',
        currentQuantity: parsed.data.currentQuantity ?? 0,
        minStockLevel: parsed.data.minStockLevel ?? 10,
        notes: parsed.data.notes || null,
      },
    })
    res.status(201).json({ message: 'Material created', material })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to create material' })
  }
})


router.patch('/materials/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if (!isValidUuid(req.params.id)) return res.status(404).json({ message: 'Material not found' })
    const updates: Record<string, any> = {}
    const { name, category, unit, currentQuantity, minStockLevel, notes } = req.body
    if (name !== undefined) updates.name = name
    if (category !== undefined) updates.category = category
    if (unit !== undefined) updates.unit = unit
    if (currentQuantity !== undefined) updates.currentQuantity = currentQuantity
    if (minStockLevel !== undefined) updates.minStockLevel = minStockLevel
    if (notes !== undefined) updates.notes = notes
    const material = await prisma.material.update({ where: { id: req.params.id }, data: updates })
    res.json({ message: 'Material updated', material })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to update material' })
  }
})


router.get('/movements', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const where: any = {}
    if (req.query.materialId) where.materialId = String(req.query.materialId)
    if (req.query.type && req.query.type !== 'all') where.type = String(req.query.type)

    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50))

    const [total, movements] = await Promise.all([
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.findMany({
        where,
        include: {
          material: { select: { id: true, name: true, category: true, unit: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])
    res.json({ movements, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch movements' })
  }
})


router.post('/movements', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const parsed = movementSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation error', errors: parsed.error.flatten() })
    }

    const movement = await prisma.$transaction(async (tx) => {
      const material = await tx.material.findUnique({ where: { id: parsed.data.materialId } })
      if (!material) throw new Error('Material not found')

      const quantity = parsed.data.type === 'Out' ? -Math.abs(parsed.data.quantity) : Math.abs(parsed.data.quantity)
      const nextQuantity = Math.max(0, material.currentQuantity + quantity)

      const created = await tx.stockMovement.create({
        data: {
          materialId: material.id,
          type: parsed.data.type,
          quantity: Math.abs(parsed.data.quantity),
          note: parsed.data.note || null,
          orderId: parsed.data.orderId || null,
          createdById: req.user!.userId,
        },
      })
      await tx.material.update({ where: { id: material.id }, data: { currentQuantity: nextQuantity } })
      return created
    })

    res.status(201).json({ message: 'Stock movement recorded', movement })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to record movement' })
  }
})

export default router