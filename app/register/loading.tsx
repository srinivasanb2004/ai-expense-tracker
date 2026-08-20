import Logo from "@/components/logo"

export default function LoadingRegister() {
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <div className="glass w-full max-w-md rounded-3xl p-7" aria-label="Loading registration page">
        <Logo />
        <div className="skeleton mt-8 h-10 w-3/4" />
        <div className="mt-6 space-y-4">
          <div className="skeleton h-12 w-full" />
          <div className="skeleton h-12 w-full" />
          <div className="skeleton h-12 w-full" />
          <div className="skeleton h-12 w-full" />
        </div>
      </div>
    </main>
  )
}
