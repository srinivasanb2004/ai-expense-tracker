import Sidebar from "./sidebar"
import Topbar from "./topbar"

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell min-h-screen">
      <Sidebar />
      <div className="min-h-screen md:pl-72">
        <Topbar />
        <main className="relative mx-auto max-w-[1500px] px-4 pb-28 pt-5 sm:px-6 md:px-8 md:pb-10 md:pt-7">
          <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
            <div className="ambient-orb ambient-orb-one" />
            <div className="ambient-orb ambient-orb-two" />
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}
