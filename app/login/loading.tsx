import Logo from "@/components/logo"

export default function LoadingLogin() {
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <div className="glass w-full max-w-md rounded-3xl p-7" aria-label="Loading login page">
        <Logo />
        <div className="skeleton mt-8 h-10 w-2/3" />
        <div className="skeleton mt-3 h-5 w-1/2" />
        <div className="mt-6 space-y-4">
          <div className="skeleton h-12 w-full" />
          <div className="skeleton h-12 w-full" />
          <div className="skeleton h-12 w-full" />
        </div>
      </div>
    </main>
  )
}
