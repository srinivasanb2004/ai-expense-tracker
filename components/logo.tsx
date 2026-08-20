import { WalletCards, Sparkles } from "lucide-react"

export default function Logo() {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="brand-mark relative"><WalletCards size={19} strokeWidth={2.3} /><Sparkles size={9} strokeWidth={2.5} className="absolute -right-1 -top-1" /></div>
      <div className="min-w-0 leading-tight">
        <p className="whitespace-nowrap text-[15px] font-black tracking-tight sm:text-lg">WalletIQ</p>
        <p className="whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.2em] accent sm:text-[10px]">AI Expense Tracker</p>
      </div>
    </div>
  )
}
