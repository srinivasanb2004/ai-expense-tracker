"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard,
  ReceiptText,
  ScanLine,
  Repeat2,
  ChartNoAxesCombined,
  WalletCards,
  Bot,
  Settings,
  LogOut,
  ArrowUpCircle,
  HandCoins,
} from "lucide-react"

import Logo from "./logo"

const items = [
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/expenses", "Expenses", ReceiptText],
  ["/recurring", "Recurring Payments", Repeat2],
  ["/borrow-lend", "Borrow & Lend", HandCoins],
  ["/income", "Income", ArrowUpCircle],
  ["/budgets", "Budgets", WalletCards],
  ["/analytics", "Analytics", ChartNoAxesCombined],
  ["/assistant", "AI Assistant", Bot],
  ["/scan", "Scan Receipt", ScanLine],
  ["/settings", "Settings", Settings],
] as const

/* Mobile bottom navigation */
const mobileItems = [
  ["/dashboard", "Home", LayoutDashboard],
  ["/expenses", "Expenses", ReceiptText],
  ["/income", "Income", ArrowUpCircle],
  ["/budgets", "Budgets", WalletCards],
  ["/analytics", "Analytics", ChartNoAxesCombined],
] as const

export default function Sidebar() {
  const pathname = usePathname()

  const active = (href: string) =>
    pathname === href ||
    pathname.startsWith(`${href}/`)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sidebar-surface fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r p-5 md:flex">
        <div className="px-2 py-2">
          <Logo />
        </div>

        <nav className="mt-8 flex-1 space-y-1 overflow-y-auto">
          {items.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              className={`nav-item ${
                active(href) ? "nav-item-active" : ""
              }`}
            >
              <span
                className={`nav-icon ${
                  active(href) ? "nav-icon-active" : ""
                }`}
              >
                <Icon size={17} />
              </span>

              <span className="flex-1">
                {label}
              </span>
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={() =>
            signOut({ callbackUrl: "/" })
          }
          className="nav-item mt-4 w-full"
        >
          <span className="nav-icon">
            <LogOut size={17} />
          </span>

          Logout
        </button>
      </aside>

      {/* Mobile bottom navigation */}
      <nav className="mobile-nav fixed bottom-3 left-3 right-3 z-50 grid grid-cols-5 gap-1 rounded-[22px] border p-2 md:hidden">
        {mobileItems.map(([href, label, Icon]) => (
          <Link
            key={href}
            href={href}
            className={`mobile-nav-item ${
              active(href) ? "mobile-nav-active" : ""
            }`}
          >
            <Icon size={18} />

            <span className="mt-1 text-[9px] font-bold">
              {label}
            </span>
          </Link>
        ))}
      </nav>
    </>
  )
}