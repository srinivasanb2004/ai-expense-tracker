import { WalletCards, Sparkles } from "lucide-react"

export default function Logo() {
  return (
    <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
      <div className="brand-mark relative shrink-0">
        <WalletCards size={19} strokeWidth={2.3} />
        <Sparkles
          size={9}
          strokeWidth={2.5}
          className="absolute -right-1 -top-1"
        />
      </div>

      <div className="min-w-0 overflow-hidden leading-tight">
        <p className="truncate whitespace-nowrap text-[14px] font-black tracking-tight sm:text-lg">
          WalletIQ
        </p>

        <p className="truncate whitespace-nowrap text-[8px] font-bold uppercase tracking-[0.16em] accent sm:text-[10px] sm:tracking-[0.2em]">
          AI Tracker
        </p>
      </div>
    </div>
  )
}
