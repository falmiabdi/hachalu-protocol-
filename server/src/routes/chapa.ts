import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { v4 as uuidv4 } from 'uuid'
import { createAndBroadcastNotification } from '../utils/notifications.js'

const router = Router()

function isWebhookAuthorized(req: any): boolean {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Chapa] PAYMENT_WEBHOOK_SECRET not set — webhooks rejected')
      return false
    }
    console.warn('[Chapa] PAYMENT_WEBHOOK_SECRET not set — webhook not authenticated (dev only)')
    return true
  }
  const header = req.headers['x-webhook-secret'] || req.headers['x-chapa-signature']
  return header === secret
}

async function verifyChapaTransaction(txRef: string): Promise<boolean | null> {
  const key = process.env.CHAPA_SECRET_KEY
  if (!key) return null
  const res = await fetch(`https://api.chapa.co/v1/transaction/verify/${txRef}`, {
    headers: { Authorization: `Bearer ${key}` },
  })
  if (!res.ok) return false
  const data: any = await res.json()
  return data?.data?.status === 'success'
}

router.post('/initialize', async (req, res) => {
  try {
    const { orderId, amount, paymentType, email, firstName, lastName, phoneNumber } = req.body

    if (!orderId || !amount || !email || !firstName || !lastName || !phoneNumber) {
      return res.status(400).json({ message: 'Missing required fields' })
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
        checkoutUrl: `https://checkout.chapa.co/checkout/payment/${existing.txRef}`,
        txRef: existing.txRef,
        orderId: existing.orderId,
        duplicate: true,
      })
    }

    const txRef = `CHAPA-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    let payment
    if (existing && existing.status === 'Failed') {
      payment = await prisma.payment.update({
        where: { id: existing.id },
        data: {
          status: 'Pending',
          txRef,
          merchOrderId: txRef,
          amount: Number(amount),
          currency: 'ETB',
          paymentType: paymentTypeVal,
          buyerName: `${firstName} ${lastName}`,
          buyerEmail: email,
          buyerPhone: phoneNumber,
        } as any,
      })
    } else {
      payment = await prisma.payment.create({
        data: {
          orderId,
          merchOrderId: txRef,
          txRef,
          status: 'Pending',
          amount: Number(amount),
          currency: 'ETB',
          method: 'chapa',
          paymentType: paymentTypeVal,
          buyerName: `${firstName} ${lastName}`,
          buyerEmail: email,
          buyerPhone: phoneNumber,
          orderTitle: `Order ${order.orderNumber}`,
        },
      })
    }

    res.json({
      checkoutUrl: `https://checkout.chapa.co/checkout/payment/${payment.txRef}`,
      txRef: payment.txRef,
      orderId: payment.orderId,
    })
  } catch (err: any) {
    console.error('[Chapa Initialize Error]', err)
    res.status(500).json({ message: err.message || 'Failed to initialize payment' })
  }
})

router.get('/verify', async (req, res) => {
  try {
    const { txRef } = req.query
    if (!txRef) return res.status(400).json({ message: 'txRef required' })

    const payment = await prisma.payment.findFirst({ where: { txRef: String(txRef) } })
    if (!payment) return res.status(404).json({ message: 'Payment not found' })

    res.json({
      status: payment.status,
      txRef: payment.txRef,
      amount: payment.amount,
      method: payment.method,
      orderId: payment.orderId,
    })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Verification failed' })
  }
})

router.post('/webhook', async (req, res) => {
  try {
    const { trx_ref, status } = req.body
    if (!trx_ref) return res.status(400).json({ message: 'trx_ref required' })

    if (!isWebhookAuthorized(req)) {
      return res.status(401).json({ message: 'Unauthorized webhook' })
    }

    const payment = await prisma.payment.findFirst({ where: { txRef: trx_ref } })
    if (payment) {
      let newStatus: any = status === 'success' ? 'Completed' : 'Failed'
      const verified = await verifyChapaTransaction(String(trx_ref))
      if (verified !== null) {
        newStatus = verified ? 'Completed' : 'Failed'
      }
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
            `Payment for order ${order.orderNumber} (${payment.amount} ETB) via Chapa was successful.`,
            'success',
            { orderId: order.id }
          ).catch(() => {})
        }
      }
    }

    res.json({ message: 'Webhook received' })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Webhook processing failed' })
  }
})

export default router