import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Nature Timelapse Creator',
  description: 'Create stunning timelapse videos of nature',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-nature-sky to-nature-lightgreen min-h-screen">
        {children}
      </body>
    </html>
  )
}
