import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Smart AI Expense Tracker",
  description:
    "Smart AI Expense Tracker — AI-powered personal finance, recurring payments, receipt scanning and spending insights.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
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

      <body>{children}</body>
    </html>
  )
}