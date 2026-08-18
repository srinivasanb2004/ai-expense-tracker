"use client"

import Link from "next/link"
import { Bell, Plus, ScanLine } from "lucide-react"
import Logo from "./logo"

export default function Topbar() {
  return (
    <header
      className="
        sticky top-0 z-30
        flex h-[76px] w-full
        items-center justify-between
        gap-3 border-b
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
      <div className="min-w-0 md:hidden">
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

      {/* Actions */}
      <div className="ml-auto flex shrink-0 items-center gap-2">

        {/* Scan */}
        <Link
          href="/scan"
          aria-label="Scan receipt"
          className="
            flex h-11 shrink-0
            items-center justify-center
            gap-2 whitespace-nowrap
            rounded-xl border
            px-4 text-sm font-bold
            transition
            hover:-translate-y-0.5
          "
          style={{
            borderColor: "var(--line)",
            background: "var(--secondary-bg)",
            color: "var(--text)",
          }}
        >
          <ScanLine size={17} className="shrink-0" />

          <span className="hidden sm:inline">
            Scan
          </span>
        </Link>

        {/* Add Expense */}
        <Link
          href="/expenses?new=1"
          aria-label="Add expense"
          className="
            flex h-11 shrink-0
            items-center justify-center
            gap-2 whitespace-nowrap
            rounded-xl
            px-4 text-sm font-bold
            transition
            hover:-translate-y-0.5
          "
          style={{
            background:
              "linear-gradient(135deg, #6ee7b7, #22c55e)",
            color: "#052018",
            boxShadow:
              "0 8px 25px rgba(34,197,94,.18)",
          }}
        >
          <Plus size={17} className="shrink-0" />

          <span className="hidden sm:inline">
            Add expense
          </span>
        </Link>

        {/* Notifications */}
        <button
          type="button"
          aria-label="Notifications"
          className="
            grid h-11 w-11 shrink-0
            place-items-center
            rounded-xl border
            transition
            hover:-translate-y-0.5
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