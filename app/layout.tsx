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