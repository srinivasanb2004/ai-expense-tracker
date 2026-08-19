"use client"
import { CheckCircle2, X, AlertCircle } from "lucide-react"

export type ToastState = { message: string; type?: "success" | "error" } | null
export default function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  if (!toast) return null
  const error = toast.type === "error"
  return <div className={`toast-card ${error ? "toast-error" : "toast-success"}`} role="status">
    {error ? <AlertCircle size={18}/> : <CheckCircle2 size={18}/>}<span>{toast.message}</span>
    <button onClick={onClose} aria-label="Close notification"><X size={15}/></button>
  </div>
}
