"use client"

import AppShell from "@/components/app-shell"
import DataErrorState from "@/components/data-error-state"
import { Bot, Send, Sparkles } from "lucide-react"
import { useState } from "react"

type Message = { role: "user" | "ai"; text: string }
const prompts = ["How much did I spend on food?", "What are my top 3 spending categories?", "Where can I realistically cut spending?"]

export default function Assistant() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", text: "Ask me about the expenses and income stored in your account." },
  ])
  const [question, setQuestion] = useState("")
  const [busy, setBusy] = useState(false)
  const [connectionError, setConnectionError] = useState(false)

  async function ask(text = question) {
    const q = text.trim()
    if (!q || busy) return
    setMessages((items) => [...items, { role: "user", text: q }])
    setQuestion("")
    setBusy(true)
    setConnectionError(false)

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      })
      const raw = await response.text()
      if (!raw) throw new Error(`AI API returned an empty response (${response.status}).`)
      const data = JSON.parse(raw)
      if (!response.ok) { if(response.status >= 500) setConnectionError(true); throw new Error(data.error || "Failed to get AI response.") }
      setMessages((items) => [...items, { role: "ai", text: data.answer || "I could not generate an answer." }])
    } catch (error) {
      if(!navigator.onLine || (error instanceof TypeError)) setConnectionError(true)
      setMessages((items) => [...items, { role: "ai", text: error instanceof Error ? error.message : "Something went wrong." }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell>
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-300 text-emerald-950"><Bot /></div>
        <div><p className="eyebrow">WalletIQ AI</p><h2 className="mt-1 text-3xl font-black">AI Assistant</h2><p className="muted">Ask WalletIQ AI questions about your money.</p></div>
      </div>

      {connectionError && <DataErrorState title="AI Assistant is unavailable" message="Check your internet connection and try your question again." onRetry={()=>setConnectionError(false)} />}

      <div className="soft-panel mt-6">
        <div className="flex flex-wrap gap-2">
          {prompts.map((prompt) => (
            <button key={prompt} onClick={() => ask(prompt)} disabled={busy} className="btn btn-secondary text-sm disabled:opacity-50"><Sparkles size={14} />{prompt}</button>
          ))}
        </div>

        <div className="mt-6 min-h-[360px] space-y-4">
          {messages.map((message, index) => (
            <div key={index} className={`max-w-2xl rounded-2xl p-4 ${message.role === "user" ? "ml-auto bg-emerald-300 text-emerald-950" : "bg-white/5"}`}>
              <p className="whitespace-pre-wrap leading-7">{message.text}</p>
            </div>
          ))}
          {busy && <p className="muted">Analyzing your transactions…</p>}
        </div>

        <div className="flex gap-2">
          <input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} disabled={busy} className="input" placeholder="Ask about your expenses..." />
          <button onClick={() => ask()} disabled={busy || !question.trim()} className="btn btn-primary disabled:opacity-50"><Send size={17} /></button>
        </div>
      </div>
    </AppShell>
  )
}
