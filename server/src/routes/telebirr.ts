import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { v4 as uuidv4 } from 'uuid'
import { createAndBroadcastNotification } from '../utils/notifications.js'

const router = Router()

function isNotifyAuthorized(req: any): boolean {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[TeleBirr] PAYMENT_WEBHOOK_SECRET not set — notify rejected')
      return false
    }
    console.warn('[TeleBirr] PAYMENT_WEBHOOK_SECRET not set — notify not authenticated (dev only)')
    return true
  }
  const header = req.headers['x-webhook-secret'] || req.headers['x-telebirr-signature']
  return header === secret
}

router.post('/create-order', async (req, res) => {
  try {
    const { orderId, amount, paymentType } = req.body

    if (!orderId || !amount) {
      return res.status(400).json({ message: 'Missing orderId or amount' })
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }

    const paymentTypeVal = paymentType || 'order_payment'

    const existing = await prisma.payment.findUnique({ where: { orderId } })
    if (existing && existing.status === 'Completed') {
      return res.status(409).json({ message: 'Payment already completed for this order' })
    }
    if (existing && existing.status === 'Pending') {
      return res.json({
        toPayUrl: `https://app.ethiotelebirr.et/payment/h5/?merch_order_id=${existing.merchOrderId}`,
        merchOrderId: existing.merchOrderId,
        orderId: existing.orderId,
        duplicate: true,
      })
    }

    const merchOrderId = `TB-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    let payment
    if (existing && existing.status === 'Failed') {
      payment = await prisma.payment.update({
        where: { id: existing.id },
        data: {
          status: 'Pending',
          merchOrderId,
          txRef: merchOrderId,
          amount: Number(amount),
          currency: 'ETB',
          paymentType: paymentTypeVal,
        } as any,
      })
    } else {
      payment = await prisma.payment.create({
        data: {
          orderId,
          merchOrderId,
          txRef: merchOrderId,
          status: 'Pending',
          amount: Number(amount),
          currency: 'ETB',
          method: 'telebirr',
          paymentType: paymentTypeVal,
          buyerName: 'TeleBirr User',
          buyerEmail: 'customer@telebirr.et',
          buyerPhone: '0900000000',
          orderTitle: `Order ${order.orderNumber}`,
        },
      })
    }

    res.json({
      toPayUrl: `https://app.ethiotelebirr.et/payment/h5/?merch_order_id=${payment.merchOrderId}`,
      merchOrderId: payment.merchOrderId,
      orderId: payment.orderId,
    })
  } catch (err: any) {
    console.error('[TeleBirr Create Order Error]', err)
    res.status(500).json({ message: err.message || 'Failed to create order' })
  }
})

router.get('/status', async (req, res) => {
  try {
    const { merchOrderId } = req.query
    if (!merchOrderId) return res.status(400).json({ message: 'merchOrderId required' })

    const payment = await prisma.payment.findFirst({ where: { merchOrderId: String(merchOrderId) } })
    if (!payment) return res.status(404).json({ message: 'Payment not found' })

    res.json({
      status: payment.status,
      merchOrderId: payment.merchOrderId,
      amount: payment.amount,
      method: payment.method,
      orderId: payment.orderId,
    })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Status check failed' })
  }
})

router.post('/notify', async (req, res) => {
  try {
    const { merch_order_id, status } = req.body
    if (!merch_order_id) return res.status(400).json({ message: 'merch_order_id required' })

    if (!isNotifyAuthorized(req)) {
      return res.status(401).json({ message: 'Unauthorized notification' })
    }

    const payment = await prisma.payment.findFirst({ where: { merchOrderId: merch_order_id } })
    if (payment) {
      const newStatus = status === 'success' || status === 'SUCCESS' ? 'Completed' : 'Failed'
      await prisma.payment.update({ where: { id: payment.id }, data: { status: newStatus } })

      if (newStatus === 'Completed') {
        const order = await prisma.order.findUnique({ where: { id: payment.orderId } })
        if (order && order.status === 'PendingPayment') {
          await prisma.order.update({
            where: { id: order.id },
            data: { status: 'Paid', paymentStatus: 'Completed' },
          })
          createAndBroadcastNotification(
            order.customerId,
            'Payment Received',
            `Payment for order ${order.orderNumber} (${payment.amount} ETB) via TeleBirr was successful.`,
            'success',
            { orderId: order.id }
          ).catch(() => {})
        }
      }
    }

    res.json({ message: 'Notification received' })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Notification processing failed' })
  }
})

export default router