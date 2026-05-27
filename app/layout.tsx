import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WBCO WMS',
  description: 'Wreath & Bow Co Warehouse Management System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
