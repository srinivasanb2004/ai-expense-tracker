"use client"

import Link from "next/link"
import {
  Bell,
  Plus,
  ScanLine,
  Bot,
  Settings,
} from "lucide-react"

import Logo from "./logo"

export default function Topbar() {
  return (
    <header
      className="
        sticky top-0 z-30
        flex h-[76px] w-full
        items-center justify-between
        gap-2 border-b
        px-4 md:h-20 md:px-8
        backdrop-blur-xl
      "
      style={{
        background:
          "color-mix(in srgb, var(--bg) 88%, transparent)",
        borderColor: "var(--line)",
        color: "var(--text)",
      }}
    >
      {/* Mobile Logo */}
      <div className="min-w-0 flex-1 md:hidden">
        <Logo />
      </div>

      {/* Desktop Heading */}
      <div className="hidden min-w-0 md:block">
        <p
          className="text-xs font-bold uppercase tracking-[0.18em]"
          style={{ color: "var(--muted)" }}
        >
          Finance workspace
        </p>

        <h1 className="mt-1 text-xl font-black">
          Your money, made clearer.
        </h1>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">

        {/* Scan */}
        <Link
          href="/scan"
          aria-label="Scan receipt"
          className="
            grid h-11 w-11 shrink-0
            place-items-center rounded-xl border
            transition hover:-translate-y-0.5
            md:flex md:w-auto md:gap-2 md:px-4
          "
          style={{
            borderColor: "var(--line)",
            background: "var(--secondary-bg)",
            color: "var(--text)",
          }}
        >
          <ScanLine size={18} />

          <span className="hidden md:inline">
            Scan
          </span>
        </Link>

        {/* AI - Mobile */}
        <Link
          href="/assistant"
          aria-label="AI Assistant"
          className="
            grid h-11 w-11 shrink-0
            place-items-center rounded-xl border
            transition hover:-translate-y-0.5
            md:hidden
          "
          style={{
            borderColor: "var(--line)",
            background:
              "linear-gradient(135deg,#6ee7b7,#22c55e)",
            color: "#052018",
          }}
        >
          <Bot size={19} />
        </Link>

        {/* Settings - Mobile */}
        <Link
          href="/settings"
          aria-label="Settings"
          className="
            grid h-11 w-11 shrink-0
            place-items-center rounded-xl border
            transition hover:-translate-y-0.5
            md:hidden
          "
          style={{
            borderColor: "var(--line)",
            background: "var(--secondary-bg)",
            color: "var(--text)",
          }}
        >
          <Settings size={19} />
        </Link>

        {/* Add Expense - Desktop */}
        <Link
          href="/expenses?new=1"
          className="
            hidden h-11 shrink-0
            items-center justify-center
            gap-2 whitespace-nowrap
            rounded-xl px-4
            text-sm font-bold
            transition
            hover:-translate-y-0.5
            md:flex
          "
          style={{
            background:
              "linear-gradient(135deg,#6ee7b7,#22c55e)",
            color: "#052018",
          }}
        >
          <Plus size={17} />

          Add expense
        </Link>

        {/* Notification - Desktop only */}
        <button
          type="button"
          aria-label="Notifications"
          className="
            hidden h-11 w-11 shrink-0
            place-items-center rounded-xl border
            transition hover:-translate-y-0.5
            md:grid
          "
          style={{
            borderColor: "var(--line)",
            background: "var(--secondary-bg)",
            color: "var(--text)",
          }}
        >
          <Bell size={18} />
        </button>
      </div>
    </header>
  )
}