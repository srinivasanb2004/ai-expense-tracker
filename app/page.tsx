import Link from "next/link"
import Logo from "@/components/logo"
import { auth } from "@/auth"

import {
  ArrowRight,
  BrainCircuit,
  ScanLine,
  ChartPie,
} from "lucide-react"

export default async function Home() {
  const session = await auth()

  const getStartedHref = session?.user
    ? "/dashboard"
    : "/register"

  return (
    <main className="min-h-screen">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 p-5 sm:p-6">
        <Logo />

        <div className="flex gap-2">
          {/* Login should always open login */}
          <Link
            className="btn btn-secondary"
            href="/login"
          >
            Login
          </Link>

          {/* Get Started depends on session */}
          <Link
            className="btn btn-primary"
            href={getStartedHref}
          >
            Get started
          </Link>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
        <div>
          <div className="mb-5 inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-sm accent">
            AI-powered personal finance
          </div>

          <h1 className="text-5xl font-black leading-[1.05] md:text-7xl">
            Know where your money goes.{" "}
            <span className="accent">
              Before it disappears.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg muted">
            Track expenses, scan receipts with Gemini,
            understand spending patterns and get useful
            AI guidance from one private dashboard.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {/* Same smart behavior as Get Started */}
            <Link
              href={getStartedHref}
              className="btn btn-primary"
            >
              {session?.user
                ? "Open dashboard"
                : "Create your account"}

              <ArrowRight size={18} />
            </Link>

            {/* Always open login page */}
            <Link
              href="/login"
              className="btn btn-secondary"
            >
              I already have an account
            </Link>
          </div>
        </div>

        <div className="soft-panel">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              [
                BrainCircuit,
                "AI insights",
                "Ask questions about your real spending",
              ],
              [
                ScanLine,
                "Gemini OCR",
                "Turn receipts into editable expenses",
              ],
              [
                ChartPie,
                "Analytics",
                "Trends, categories, savings and merchants",
              ],
            ].map(([Icon, title, description]: any) => (
              <div
                key={title}
                className="stat-card"
              >
                <Icon className="accent" />

                <h3 className="mt-8 font-bold">
                  {title}
                </h3>

                <p className="mt-2 text-sm muted">
                  {description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-6">
            <p className="text-sm font-black accent">
              START FRESH
            </p>

            <p className="mt-2 text-2xl font-black">
              Your dashboard begins at ₹0.
            </p>

            <p className="mt-3 text-sm muted">
              Only the expenses, income and budgets
              you add will appear in your account.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}