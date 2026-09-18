import type { Metadata, Viewport } from 'next'
import { ToastProvider } from '@/components/ui/toast-provider'
import { AuthProvider } from '@/components/auth/auth-guard'
import { CartProvider } from '@/lib/cart'
import { SmoothScroll } from '@/components/smooth-scroll'
import { BottomNav } from '@/components/bottom-nav'
import { CapacitorInit } from '@/components/capacitor-init'
import { I18nProvider } from '@/lib/i18n'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hachalu Protocol — Ethiopian Garments & Custom Tailoring',
  description:
    'Shop ready-made garments and commission made-to-measure tailoring in Ethiopia. Order tracking, quality checks and production management on Hachalu Protocol.',
  generator: 'v0.app',
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#F97316',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="light bg-background">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="font-sans antialiased overflow-x-hidden">
        <ToastProvider />
        <I18nProvider>
          <AuthProvider>
            <CartProvider>
              <CapacitorInit />
              <SmoothScroll>
                <div className="max-lg:pb-[calc(env(safe-area-inset-bottom,0px)+4rem)]">{children}</div>
              </SmoothScroll>
              <BottomNav />
            </CartProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
