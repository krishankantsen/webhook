import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HookCapture - Webhook Testing Tool',
  description: 'Create webhook endpoints and capture incoming requests in real-time',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}