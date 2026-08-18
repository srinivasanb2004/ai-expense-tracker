import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Smart Expense Tracker",
  description:
    "AI-powered personal finance and expense tracking application.",

  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}