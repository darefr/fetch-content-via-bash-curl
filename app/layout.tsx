import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans, IBM_Plex_Sans_Devanagari } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const plex = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex',
  display: 'swap',
})

const deva = IBM_Plex_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '500', '600'],
  variable: '--font-deva',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'FeriStock | Stock and restock for shops and suppliers in Nepal',
    template: '%s | FeriStock',
  },
  description:
    'FeriStock keeps a shop’s live stock and its wholesalers’ orders in one place: low-stock alerts, 1-click reorders, bilti tracking, and direct payment by eSewa, Khalti, QR or udharo.',
  applicationName: 'FeriStock',
  generator: 'v0.app',
  icons: { icon: '/icon.svg', apple: '/apple-icon.png' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light',
  themeColor: '#0e1d4a',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${plex.variable} ${deva.variable} bg-background`}>
      <body className="min-h-dvh antialiased">
        {children}
        <Toaster theme="light" position="top-center" richColors closeButton />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
