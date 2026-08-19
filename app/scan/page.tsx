"use client"

import AppShell from "@/components/app-shell"
import { CheckCircle2, FileText, ScanLine, UploadCloud } from "lucide-react"
import { useState } from "react"

const categories = ["Food", "Transport", "Shopping", "Bills", "Health", "Entertainment", "Education", "Other"]
const payments = ["UPI", "Card", "Cash", "Bank Transfer", "Other"]

type ReceiptData = {
  merchant: string
  amount: number
  date: string | null
  tax: number | null
  category: string
  paymentMethod: string
  notes: string | null
}

export default function Scan() {
  const [file, setFile] = useState<File | null>(null)
  const [data, setData] = useState<ReceiptData | null>(null)
  const [status, setStatus] = useState("")
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)

  async function scan() {
    if (!file || scanning) return
    setScanning(true)
    setStatus("Gemini is reading your receipt...")
    setData(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      const response = await fetch("/api/ocr", { method: "POST", body: formData })
      const text = await response.text()
      const payload = text ? JSON.parse(text) : {}
      if (!response.ok) throw new Error(payload.error || "Receipt scan failed.")
      setData(payload)
      setStatus("Receipt extracted. Review the fields before saving.")
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Receipt scan failed.")
    } finally {
      setScanning(false)
    }
  }

  async function save() {
    if (!data || saving) return
    setSaving(true)
    setStatus("Saving expense...")

    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          source: "receipt_scan",
          date: data.date || new Date().toISOString().slice(0, 10),
          notes: [data.notes, data.tax != null ? `GST/Tax: ₹${data.tax}` : null].filter(Boolean).join(" · "),
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Could not save expense.")
      setStatus("Expense saved successfully.")
      setData(null)
      setFile(null)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save expense.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell>
      <div>
        <p className="eyebrow">Gemini Vision</p>
        <h2 className="mt-2 text-3xl font-black">Scan Receipt</h2>
        <p className="mt-2 muted">Upload a receipt and automatically extract merchant, total, date, tax and category.</p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="soft-panel">
          <label className="grid min-h-80 cursor-pointer place-items-center rounded-[22px] border border-dashed border-emerald-300/35 bg-emerald-300/5 p-6 text-center transition hover:bg-emerald-300/10">
            <div>
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-300/10 accent">
                <UploadCloud size={30} />
              </div>
              <p className="mt-5 font-black">Choose a receipt</p>
              <p className="mt-2 text-sm muted">JPG, PNG, WEBP or PDF · up to 15 MB</p>
              {file && (
                <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-sm accent">
                  <FileText size={15} />
                  <span className="max-w-[260px] truncate">{file.name}</span>
                </div>
              )}
            </div>
            <input
              className="hidden"
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null)
                setData(null)
                setStatus("")
              }}
            />
          </label>

          <button disabled={!file || scanning} onClick={scan} className="btn btn-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50">
            <ScanLine size={18} />
            {scanning ? "Scanning with Gemini..." : "Extract receipt with Gemini"}
          </button>
          {status && <p className="mt-3 text-sm muted">{status}</p>}
        </div>

        <div className="soft-panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Review</p>
              <h3 className="mt-1 text-lg font-black">Extracted data</h3>
            </div>
            {data && <span className="rounded-full bg-emerald-300/10 px-3 py-1 text-xs font-bold accent">Editable</span>}
          </div>

          {!data ? (
            <div className="empty-state mt-5">
              <ScanLine className="mx-auto accent" size={28} />
              <p className="mt-4 font-bold">No receipt scanned yet</p>
              <p className="mt-2 text-sm muted">Gemini results will appear here for you to review before saving.</p>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wider muted">Merchant</span>
                <input className="input mt-1" value={data.merchant} onChange={(e) => setData({ ...data, merchant: e.target.value })} />
              </label>
              <label>
                <span className="text-xs font-bold uppercase tracking-wider muted">Total</span>
                <input className="input mt-1" type="number" step="0.01" value={data.amount} onChange={(e) => setData({ ...data, amount: Number(e.target.value) })} />
              </label>
              <label>
                <span className="text-xs font-bold uppercase tracking-wider muted">Tax / GST</span>
                <input className="input mt-1" type="number" step="0.01" value={data.tax ?? ""} onChange={(e) => setData({ ...data, tax: e.target.value ? Number(e.target.value) : null })} />
              </label>
              <label>
                <span className="text-xs font-bold uppercase tracking-wider muted">Date</span>
                <input className="input mt-1" type="date" value={data.date || ""} onChange={(e) => setData({ ...data, date: e.target.value || null })} />
              </label>
              <label>
                <span className="text-xs font-bold uppercase tracking-wider muted">Category</span>
                <select className="input mt-1" value={data.category} onChange={(e) => setData({ ...data, category: e.target.value })}>
                  {categories.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wider muted">Payment method</span>
                <select className="input mt-1" value={data.paymentMethod} onChange={(e) => setData({ ...data, paymentMethod: e.target.value })}>
                  {payments.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wider muted">Notes</span>
                <input className="input mt-1" value={data.notes || ""} onChange={(e) => setData({ ...data, notes: e.target.value || null })} />
              </label>
              <button onClick={save} disabled={saving || data.amount <= 0} className="btn btn-primary sm:col-span-2 disabled:opacity-50">
                <CheckCircle2 size={18} />
                {saving ? "Saving..." : "Save as expense"}
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
