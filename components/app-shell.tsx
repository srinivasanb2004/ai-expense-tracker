import Sidebar from "./sidebar"
import Topbar from "./topbar"
import NetworkStatus from "./network-status"

export default function AppShell({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="app-shell relative min-h-screen overflow-x-hidden">
      {/* Global finance background */}
      <div
        className="finance-background pointer-events-none fixed inset-0 z-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="finance-grid" />

        <div className="finance-chart-line finance-chart-line-one" />
        <div className="finance-chart-line finance-chart-line-two" />

        <div className="finance-ring finance-ring-one" />
        <div className="finance-ring finance-ring-two" />

        <div className="ambient-orb ambient-orb-one" />
        <div className="ambient-orb ambient-orb-two" />
        <div className="ambient-orb ambient-orb-three" />
      </div>

      {/* App UI */}
      <div className="relative z-10">
        <Sidebar />

        <div className="min-h-screen md:pl-72">
          <Topbar />

          {/* Global network status */}
          <NetworkStatus />

          <main className="relative mx-auto max-w-[1500px] px-4 pb-28 pt-5 sm:px-6 md:px-8 md:pb-10 md:pt-7">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}