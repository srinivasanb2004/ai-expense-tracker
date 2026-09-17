import type { Metadata, Viewport } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "WalletIQ",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "WalletIQ", statusBarStyle: "default" },
  description:
    "WalletIQ — AI-powered personal finance, expense tracking, budgets, recurring payments, receipt scanning and spending insights.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#101b1a",
}

const themeScript = `
(function () {
  try {
    const savedTheme = localStorage.getItem("theme") || "dark";

    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(savedTheme);
  } catch (e) {
    document.documentElement.classList.add("dark");
  }
})();
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: themeScript,
          }}
        />
      </head>

      <body>
        {children}
      </body>
    </html>
  )
}
