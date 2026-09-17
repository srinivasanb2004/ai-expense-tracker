export default function Loading() {
  return <main role="status" aria-label="Loading page" className="mx-auto max-w-7xl space-y-8 p-6">
    <div className="skeleton h-12 w-48" />
    <div className="grid gap-8 py-12 lg:grid-cols-2">
      <div className="space-y-5"><div className="skeleton h-16 w-full" /><div className="skeleton h-16 w-4/5" /><div className="skeleton h-24 w-full" /></div>
      <div className="skeleton h-80" />
    </div>
  </main>
}
