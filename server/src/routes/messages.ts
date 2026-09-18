import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { broadcastToUser } from '../ws/server.js'
import { isValidUuid } from '../utils/validation.js'

const router = Router()

router.get('/unread', authMiddleware, async (req, res) => {
  try {
    const count = await prisma.message.count({
      where: { recipientId: req.user!.userId, read: false },
    })
    res.json({ count })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch unread count' })
  }
})

router.get('/inbox', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId
    const messages = await prisma.message.findMany({
      where: {
        OR: [{ recipientId: userId }, { senderId: userId }],
      },
      orderBy: { createdAt: 'desc' },
    })

    const productIds = [...new Set(messages.map((m) => m.productId))]
    const products: Record<string, string> = {}
    if (productIds.length > 0) {
      const rows = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true },
      })
      for (const row of rows) {
        products[row.id] = row.name
      }
    }

    const userIds = new Set<string>()
    for (const m of messages) {
      userIds.add(m.senderId)
      userIds.add(m.recipientId)
    }
    const users: Record<string, { name: string; phone?: string | null; profilePhoto?: string | null }> = {}
    if (userIds.size > 0) {
      const rows = await prisma.user.findMany({
        where: { id: { in: [...userIds] } },
        select: { id: true, username: true, phone: true, profilePhoto: true },
      })
      for (const row of rows) {
        users[row.id] = {
          name: row.username,
          phone: row.phone,
          profilePhoto: row.profilePhoto,
        }
      }
    }

    const serialized = messages.map((m) => ({
      id: m.id,
      productId: m.productId,
      productTitle: products[m.productId] || 'Product',
      senderId: m.senderId,
      senderName: m.senderName,
      senderRole: m.senderRole,
      recipientId: m.recipientId,
      recipientName: m.recipientName,
      content: m.content,
      read: m.read,
      createdAt: m.createdAt,
    }))

    res.json({ messages: serialized, users })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch inbox' })
  }
})

router.get('/:productId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId
    const messages = await prisma.message.findMany({
      where: {
        productId: req.params.productId,
        OR: [{ senderId: userId }, { recipientId: userId }],
      },
      orderBy: { createdAt: 'asc' },
    })
    res.json({ messages })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch messages' })
  }
})

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { productId, recipientId, content } = req.body

    if (!productId || !recipientId || !content) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    if (recipientId === req.user!.userId) {
      return res.status(400).json({ message: 'You cannot message yourself' })
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, sellerId: true, contactMode: true, contactUserId: true },
    })
    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }

    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { username: true },
    })
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' })
    }

    const sender = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { username: true },
    })

    const msgDoc = await prisma.message.create({
      data: {
        productId,
        senderId: req.user!.userId,
        senderName: sender?.username ?? req.user!.email,
        senderRole: req.user!.role,
        recipientId,
        recipientName: recipient.username,
        content,
      },
    })

    broadcastToUser(recipientId, { type: 'message', message: msgDoc })

    res.status(201).json({ message: 'Message sent', data: msgDoc })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to send message' })
  }
})

router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(404).json({ message: 'Message not found' })
    }
    const message = await prisma.message.findUnique({ where: { id: req.params.id } })
    if (!message) {
      return res.status(404).json({ message: 'Message not found' })
    }
    if (message.recipientId !== req.user!.userId) {
      return res.status(403).json({ message: 'Not authorized' })
    }
    await prisma.message.update({ where: { id: req.params.id }, data: { read: true } })
    res.json({ message: 'Message marked as read' })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to update message' })
  }
})

export default router