import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { isValidUuid } from '../utils/validation.js'

const router = Router()

const sellerSelect = { id: true, username: true, email: true, phone: true, profilePhoto: true }

router.get('/', authMiddleware, async (req, res) => {
  try {
    const saved = await prisma.savedItem.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
    })

    const items = []
    for (const row of saved) {
      const item: any = await prisma.product.findUnique({
        where: { id: row.itemId },
        include: {
          seller: { select: sellerSelect },
          category: { select: { id: true, name: true, slug: true } },
        },
      })

      if (!item) {
        await prisma.savedItem.deleteMany({ where: { id: row.id } }).catch(() => {})
        continue
      }

      const { status } = item
      if (!['Approved', 'OutOfStock'].includes(status)) continue

      items.push({
        itemType: row.itemType,
        itemId: row.itemId,
        savedAt: row.createdAt,
        item,
      })
    }

    res.json({ items })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch saved items' })
  }
})

router.get('/status', authMiddleware, async (req, res) => {
  try {
    const { itemId } = req.query
    if (!itemId) {
      return res.status(400).json({ message: 'Missing itemId' })
    }
    const exists = await prisma.savedItem.findUnique({
      where: {
        userId_itemType_itemId: {
          userId: req.user!.userId,
          itemType: 'product',
          itemId: String(itemId),
        },
      },
    })
    res.json({ saved: !!exists })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to check saved status' })
  }
})

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { itemType, itemId } = req.body
    if (itemType !== 'product') {
      return res.status(400).json({ message: 'itemType must be "product"' })
    }
    if (!itemId) {
      return res.status(400).json({ message: 'itemId is required' })
    }
    if (!isValidUuid(itemId)) {
      return res.status(400).json({ message: 'itemId must be a valid id' })
    }

    const product: any = await prisma.product.findUnique({ where: { id: itemId } })
    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }

    const userId = req.user!.userId
    const existing = await prisma.savedItem.findUnique({
      where: { userId_itemType_itemId: { userId, itemType: 'product', itemId } },
    })

    let savedItem
    if (existing) {
      savedItem = existing
    } else {
      savedItem = await prisma.savedItem.create({
        data: { userId, itemType: 'product', itemId },
      })
      await prisma.product.update({ where: { id: itemId }, data: { favorites: { increment: 1 } } })
    }

    res.status(201).json({ message: 'Item saved', saved: true, savedItem })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to save item' })
  }
})

router.delete('/', authMiddleware, async (req, res) => {
  try {
    const { itemType, itemId } = req.body
    if (itemType !== 'product' || !itemId) {
      return res.status(400).json({ message: 'product itemType and itemId are required' })
    }
    if (!isValidUuid(itemId)) {
      return res.status(400).json({ message: 'itemId must be a valid id' })
    }

    const deleted = await prisma.savedItem.deleteMany({
      where: { userId: req.user!.userId, itemType: 'product', itemId },
    })

    if (deleted.count > 0) {
      const product: any = await prisma.product.findUnique({ where: { id: itemId } })
      if (product) {
        const favorites = Number(product.favorites || 0)
        await prisma.product.update({ where: { id: itemId }, data: { favorites: Math.max(0, favorites - 1) } })
      }
    }

    res.json({ message: 'Item removed', saved: false })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to remove item' })
  }
})

export default router