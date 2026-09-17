import AppShell from "@/components/app-shell"

type Variant = "list" | "cards" | "form" | "dashboard"

export default function PageSkeleton({ variant = "cards" }: { variant?: Variant }) {
  return (
    <AppShell>
      <div role="status" aria-label="Loading page" className="space-y-5">
        <div className="skeleton h-5 w-32" />
        <div className="skeleton h-10 w-64 max-w-full" />
        <div className="skeleton h-5 w-80 max-w-full" />
        {variant === "dashboard" && <>
          <div className="flex flex-wrap gap-2">{[1, 2, 3, 4].map((x) => <div key={x} className="skeleton h-11 w-32" />)}</div>
          <div className="skeleton h-56 rounded-[30px]" />
          <div className="grid gap-4 sm:grid-cols-3">{[1, 2, 3].map((x) => <div key={x} className="skeleton h-28" />)}</div>
        </>}
        {variant === "form" && <div className="soft-panel space-y-4">{[1, 2, 3].map((x) => <div key={x} className="skeleton h-12" />)}<div className="skeleton h-11 w-36" /></div>}
        {variant === "cards" && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((x) => <div key={x} className="skeleton h-40" />)}</div>}
        {(variant === "list" || variant === "dashboard") && <div className="grid gap-5 xl:grid-cols-2"><div className="soft-panel space-y-3">{[1, 2, 3, 4, 5].map((x) => <div key={x} className="skeleton h-14" />)}</div><div className="skeleton h-80" /></div>}
      </div>
    </AppShell>
  )
}
