import { WalletCards } from "lucide-react"

export default function Logo() {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="brand-mark"><WalletCards size={19} strokeWidth={2.3} /></div>
      <div className="min-w-0 leading-tight">
        <p className="whitespace-nowrap text-[14px] font-black tracking-tight sm:text-base">Smart AI Expense</p>
        <p className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.18em] accent sm:text-[11px]">Tracker</p>
      </div>
    </div>
  )
}
