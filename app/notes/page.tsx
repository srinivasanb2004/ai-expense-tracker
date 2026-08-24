"use client"

import AppShell from "@/components/app-shell"
import ConfirmModal from "@/components/confirm-modal"
import DataErrorState from "@/components/data-error-state"
import Toast, { ToastState } from "@/components/toast"
import {
  Archive,
  ArchiveRestore,
  Bot,
  Check,
  CheckSquare2,
  Palette,
  Pin,
  PinOff,
  Plus,
  Search,
  StickyNote,
  Sparkles,
  Tags,
  Trash2,
  X,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

type NoteItem = {
  id?: string
  text: string
  checked: boolean
  position?: number
}


type AiSuggestion = {
  id: string
  type: "RECURRING" | "BUDGET" | "BORROW_LEND"
  title: string
  confidence: "high" | "medium"
  fields: Record<string, unknown>
}

type AiAnalysis = {
  summary: string
  suggestions: AiSuggestion[]
}

type ActionForm = Record<string, string>

const financeCategories = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Health",
  "Entertainment",
  "Education",
  "Other",
]

const paymentMethods = ["UPI", "Card", "Cash", "Bank Transfer", "Other"]
const recurringFrequencies = ["Weekly", "Monthly", "Yearly"]

type Note = {
  id: string
  title?: string | null
  content?: string | null
  type: "TEXT" | "CHECKLIST"
  pinned: boolean
  archived: boolean
  color: string
  tags: string[]
  createdAt: string
  updatedAt: string
  items: NoteItem[]
}

const noteColors = [
  { key: "default", label: "Default", value: "var(--panel)" },
  { key: "emerald", label: "Emerald", value: "color-mix(in srgb, var(--panel) 87%, #10b981 13%)" },
  { key: "teal", label: "Teal", value: "color-mix(in srgb, var(--panel) 87%, #14b8a6 13%)" },
  { key: "amber", label: "Amber", value: "color-mix(in srgb, var(--panel) 87%, #f59e0b 13%)" },
  { key: "rose", label: "Rose", value: "color-mix(in srgb, var(--panel) 89%, #f43f5e 11%)" },
  { key: "violet", label: "Violet", value: "color-mix(in srgb, var(--panel) 88%, #8b5cf6 12%)" },
]

const noteThemes = [
  {
    key: "theme-forest",
    label: "Forest",
    value:
      "radial-gradient(circle at 16% 18%, color-mix(in srgb, #22c55e 32%, transparent) 0, transparent 40%), radial-gradient(circle at 84% 82%, color-mix(in srgb, #84cc16 24%, transparent) 0, transparent 44%), linear-gradient(135deg, color-mix(in srgb, var(--panel) 78%, #166534 22%), color-mix(in srgb, var(--panel) 82%, #3f6212 18%))",
  },
  {
    key: "theme-sunset",
    label: "Sunset",
    value:
      "radial-gradient(circle at 18% 20%, color-mix(in srgb, #fb7185 32%, transparent) 0, transparent 42%), radial-gradient(circle at 82% 82%, color-mix(in srgb, #f59e0b 28%, transparent) 0, transparent 44%), linear-gradient(135deg, color-mix(in srgb, var(--panel) 82%, #fb7185 18%), color-mix(in srgb, var(--panel) 82%, #f59e0b 18%))",
  },
  {
    key: "theme-paper",
    label: "Paper",
    value:
      "repeating-linear-gradient(to bottom, transparent 0 25px, color-mix(in srgb, var(--text) 8%, transparent) 26px, transparent 27px), linear-gradient(135deg, color-mix(in srgb, var(--panel) 96%, #f59e0b 4%), var(--panel))",
  },
  {
    key: "theme-waves",
    label: "Waves",
    value:
      "radial-gradient(ellipse at 0% 100%, color-mix(in srgb, #14b8a6 18%, transparent) 0 32%, transparent 33%), radial-gradient(ellipse at 35% 110%, color-mix(in srgb, #38bdf8 14%, transparent) 0 34%, transparent 35%), linear-gradient(145deg, color-mix(in srgb, var(--panel) 94%, #14b8a6 6%), var(--panel))",
  },
  {
    key: "theme-ocean",
    label: "Ocean",
    value:
      "radial-gradient(circle at 15% 15%, color-mix(in srgb, #0ea5e9 34%, transparent) 0, transparent 40%), radial-gradient(circle at 85% 80%, color-mix(in srgb, #06b6d4 28%, transparent) 0, transparent 44%), linear-gradient(145deg, color-mix(in srgb, var(--panel) 80%, #0284c7 20%), color-mix(in srgb, var(--panel) 82%, #0891b2 18%))",
  },
]

function colorValue(key: string) {
  return (
    noteColors.find((item) => item.key === key)?.value ||
    noteThemes.find((item) => item.key === key)?.value ||
    noteColors[0].value
  )
}

function emptyNote(note: Note) {
  return !note.title?.trim() && !note.content?.trim() && !note.items.some((item) => item.text.trim())
}

function ActionDateField({
  value,
  placeholder,
  onChange,
  max,
}: {
  value: string
  placeholder: string
  onChange: (value: string) => void
  max?: string
}) {
  const [focused, setFocused] = useState(false)
  const showDate = focused || Boolean(value)

  return (
    <input
      type={showDate ? "date" : "text"}
      value={value}
      placeholder={placeholder}
      readOnly={!showDate}
      max={showDate ? max : undefined}
      onFocus={(event) => {
        setFocused(true)
        requestAnimationFrame(() => {
          try {
            event.currentTarget.showPicker?.()
          } catch {}
        })
      }}
      onClick={(event) => {
        setFocused(true)
        requestAnimationFrame(() => {
          try {
            event.currentTarget.showPicker?.()
          } catch {}
        })
      }}
      onBlur={() => {
        if (!value) setFocused(false)
      }}
      onChange={(event) => onChange(event.target.value)}
      className="input w-full"
    />
  )
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<"all" | "pinned" | "checklists" | "archive">("all")
  const [plusOpen, setPlusOpen] = useState(false)
  const [editing, setEditing] = useState<Note | null>(null)
  const [draft, setDraft] = useState<Note | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved")
  const [tagInput, setTagInput] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [aiError, setAiError] = useState("")
  const [actionSuggestion, setActionSuggestion] = useState<AiSuggestion | null>(null)
  const [actionForm, setActionForm] = useState<ActionForm>({})
  const [creatingAction, setCreatingAction] = useState(false)
  const [actionError, setActionError] = useState("")
  const [createdSuggestionIds, setCreatedSuggestionIds] = useState<string[]>([])
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firstDraftRender = useRef(true)

  function say(message: string, type: "success" | "error" = "success") {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2400)
  }

  async function load() {
    setLoading(true)
    setLoadError(false)
    try {
      const response = await fetch("/api/notes", { cache: "no-store" })
      if (!response.ok) throw new Error()
      setNotes(await response.json())
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function create(type: "TEXT" | "CHECKLIST") {
    setPlusOpen(false)
    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      })
      const note = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(note.error || "Could not create note.")
      setNotes((current) => [note, ...current])
      openEditor(note)
    } catch (error) {
      say(error instanceof Error ? error.message : "Could not create note.", "error")
    }
  }

  function openEditor(note: Note) {
    firstDraftRender.current = true
    setEditing(note)
    setDraft({ ...note, items: note.items.map((item) => ({ ...item })) })
    setTagInput("")
    setSaveState("saved")
    setAiAnalysis(null)
    setAiError("")
    setActionSuggestion(null)
    setActionForm({})
    setActionError("")
    setCreatedSuggestionIds([])
  }

  async function persist(
    note: Note,
    syncEditor = true
  ) {
    setSaveState("saving")
    try {
      const response = await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: note.title || "",
          content: note.content || "",
          pinned: note.pinned,
          archived: note.archived,
          color: note.color,
          tags: note.tags,
          items: note.items,
        }),
      })
      const updated = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(updated.error || "Could not save note.")
      setNotes((current) =>
        current.map((item) =>
          item.id === updated.id
            ? updated
            : item
        )
      )

      if (syncEditor) {
        setEditing(updated)

        setDraft((current) => {
          if (!current) return null

          if (current.id !== updated.id) {
            return current
          }

          return {
            ...current,
            updatedAt: updated.updatedAt,
          } as Note
        })
      }

      setSaveState("saved")
    } catch {
      setSaveState("error")
    }
  }

  useEffect(() => {
    if (!draft) return
    if (firstDraftRender.current) {
      firstDraftRender.current = false
      return
    }
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => persist(draft), 650)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [draft?.title, draft?.content, draft?.pinned, draft?.archived, draft?.color, JSON.stringify(draft?.tags), JSON.stringify(draft?.items)])

  async function closeEditor() {
    if (!draft) {
      setEditing(null)
      return
    }

    const noteToClose = {
      ...draft,
      items: draft.items.map((item) => ({
        ...item,
      })),
    }

    const needsSave =
      saveState === "saving" ||
      saveState === "error" ||
      JSON.stringify(noteToClose) !==
        JSON.stringify(editing)

    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }

    /*
      Close the editor immediately.

      Previously we waited for persist() before
      clearing draft/editing. On a slower network,
      the user had to press X multiple times because
      the modal stayed visible while the save request
      was completing.
    */
    setEditing(null)
    setDraft(null)
    setTagInput("")
    setAiAnalysis(null)
    setAiError("")
    setActionSuggestion(null)
    setActionForm({})
    setActionError("")

    if (emptyNote(noteToClose)) {
      await fetch(
        `/api/notes/${noteToClose.id}`,
        {
          method: "DELETE",
        }
      ).catch(() => null)

      setNotes((current) =>
        current.filter(
          (item) =>
            item.id !== noteToClose.id
        )
      )

      return
    }

    if (needsSave) {
      /*
        Save the final snapshot without syncing the
        closed editor state back into the modal.
      */
      await persist(
        noteToClose,
        false
      )
    }
  }

  async function quickPatch(note: Note, patch: Partial<Note>) {
    const optimistic = { ...note, ...patch }
    setNotes((current) => current.map((item) => (item.id === note.id ? optimistic : item)))
    try {
      const response = await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      const updated = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error()
      setNotes((current) => current.map((item) => (item.id === note.id ? updated : item)))
    } catch {
      setNotes((current) => current.map((item) => (item.id === note.id ? note : item)))
      say("Could not update note.", "error")
    }
  }

  async function remove(note: Note) {
    setDeleteTarget(null)
    const previous = notes
    setNotes((current) => current.filter((item) => item.id !== note.id))
    if (editing?.id === note.id) {
      setEditing(null)
      setDraft(null)
    }
    try {
      const response = await fetch(`/api/notes/${note.id}`, { method: "DELETE" })
      if (!response.ok) throw new Error()
      say("Note deleted")
    } catch {
      setNotes(previous)
      say("Could not delete note.", "error")
    }
  }

  const shown = useMemo(() => {
    const search = query.trim().toLowerCase()
    return notes
      .filter((note) => {
        if (filter === "archive") return note.archived
        if (note.archived) return false
        if (filter === "pinned" && !note.pinned) return false
        if (filter === "checklists" && note.type !== "CHECKLIST") return false
        return true
      })
      .filter((note) => {
        if (!search) return true
        const haystack = [note.title, note.content, ...note.tags, ...note.items.map((item) => item.text)].filter(Boolean).join(" ").toLowerCase()
        return haystack.includes(search)
      })
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [notes, query, filter])

  function updateDraft(patch: Partial<Note>) {
    setDraft((current) => (current ? { ...current, ...patch } : current))
  }

  function addChecklistItem() {
    if (!draft) return
    updateDraft({ items: [...draft.items, { text: "", checked: false }] })
  }

  function updateChecklistItem(index: number, patch: Partial<NoteItem>) {
    if (!draft) return
    updateDraft({ items: draft.items.map((item, i) => (i === index ? { ...item, ...patch } : item)) })
  }

  function removeChecklistItem(index: number) {
    if (!draft) return
    updateDraft({ items: draft.items.filter((_, i) => i !== index) })
  }

  function addTag() {
    if (!draft) return
    const tag = tagInput.trim().replace(/^#/, "")
    if (!tag || draft.tags.includes(tag)) return setTagInput("")
    updateDraft({ tags: [...draft.tags, tag].slice(0, 8) })
    setTagInput("")
  }

  async function analyzeNote() {
    if (!draft || analyzing) return

    const hasContent =
      Boolean(draft.title?.trim()) ||
      Boolean(draft.content?.trim()) ||
      draft.items.some((item) => item.text.trim())

    if (!hasContent) {
      setAiError("Add some note content before analyzing it.")
      return
    }

    setAnalyzing(true)
    setAiError("")
    setAiAnalysis(null)

    try {
      const response = await fetch("/api/notes/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title || "",
          content: draft.content || "",
          items: draft.items.map((item) => ({
            text: item.text,
            checked: item.checked,
          })),
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || "Could not analyze this note.")
      }

      setAiAnalysis({
        summary: String(data.summary || "Analysis complete."),
        suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
      })
    } catch (error) {
      setAiError(
        error instanceof Error ? error.message : "Could not analyze this note."
      )
    } finally {
      setAnalyzing(false)
    }
  }

  function suggestionLabel(type: AiSuggestion["type"]) {
    if (type === "RECURRING") return "Recurring payment"
    if (type === "BUDGET") return "Budget"
    return "Borrow / Lend"
  }

  function suggestionIcon(type: AiSuggestion["type"]) {
    if (type === "RECURRING") return "🔁"
    if (type === "BUDGET") return "💰"
    return "🤝"
  }

  function displayField(value: unknown) {
    if (value === null || value === undefined || value === "") return "Not specified"
    if (typeof value === "number") return `₹${value.toLocaleString("en-IN")}`
    return String(value)
  }

  function fieldString(value: unknown) {
    return value === null || value === undefined ? "" : String(value)
  }

  function indiaTodayInput() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date())

    const year = parts.find((part) => part.type === "year")?.value || ""
    const month = parts.find((part) => part.type === "month")?.value || ""
    const day = parts.find((part) => part.type === "day")?.value || ""
    return `${year}-${month}-${day}`
  }

  function openActionReview(suggestion: AiSuggestion) {
    const fields = suggestion.fields || {}
    setActionSuggestion(suggestion)
    setActionError("")

    if (suggestion.type === "RECURRING") {
      setActionForm({
        merchant: fieldString(fields.merchant),
        amount: fieldString(fields.amount),
        category: financeCategories.includes(fieldString(fields.category)) ? fieldString(fields.category) : "Other",
        paymentMethod: paymentMethods.includes(fieldString(fields.paymentMethod)) ? fieldString(fields.paymentMethod) : "Other",
        frequency: recurringFrequencies.includes(fieldString(fields.frequency)) ? fieldString(fields.frequency) : "",
        nextDate: fieldString(fields.nextDate),
      })
      return
    }

    if (suggestion.type === "BUDGET") {
      setActionForm({
        category: financeCategories.includes(fieldString(fields.category)) ? fieldString(fields.category) : "Other",
        amount: fieldString(fields.amount),
      })
      return
    }

    setActionForm({
      person: fieldString(fields.person),
      type: ["BORROWED", "LENT"].includes(fieldString(fields.type)) ? fieldString(fields.type) : "",
      amount: fieldString(fields.amount),
      startDate: fieldString(fields.startDate),
      dueDate: fieldString(fields.dueDate),
      phone: fieldString(fields.phone),
      notes: fieldString(fields.notes),
    })
  }

  function updateActionField(name: string, value: string) {
    setActionForm((current) => ({ ...current, [name]: value }))
  }

  async function createSuggestedAction() {
    if (!actionSuggestion || creatingAction) return

    setCreatingAction(true)
    setActionError("")

    try {
      let url = ""
      let payload: Record<string, unknown> = {}

      if (actionSuggestion.type === "RECURRING") {
        const amount = Number(actionForm.amount)
        if (!actionForm.merchant || !Number.isFinite(amount) || amount <= 0 || !actionForm.frequency || !actionForm.nextDate) {
          throw new Error("Complete merchant, amount, frequency and next due date before creating the recurring payment.")
        }

        url = "/api/recurring"
        payload = {
          merchant: actionForm.merchant.trim(),
          amount,
          category: actionForm.category || "Other",
          paymentMethod: actionForm.paymentMethod || "Other",
          frequency: actionForm.frequency,
          nextDate: actionForm.nextDate,
          active: true,
        }
      } else if (actionSuggestion.type === "BUDGET") {
        const amount = Number(actionForm.amount)
        if (!actionForm.category || !Number.isFinite(amount) || amount <= 0) {
          throw new Error("Choose a budget category and enter a valid amount.")
        }

        url = "/api/budgets"
        payload = {
          category: actionForm.category,
          amount,
        }
      } else {
        const amount = Number(actionForm.amount)
        if (!actionForm.person || !["BORROWED", "LENT"].includes(actionForm.type) || !Number.isFinite(amount) || amount <= 0 || !actionForm.startDate) {
          throw new Error("Complete person, type, amount and start date before creating the Borrow/Lend record.")
        }

        if (actionForm.dueDate && actionForm.dueDate < actionForm.startDate) {
          throw new Error("Due date cannot be before the start date.")
        }

        url = "/api/borrow-lend"
        payload = {
          person: actionForm.person.trim(),
          type: actionForm.type,
          amount,
          startDate: actionForm.startDate,
          dueDate: actionForm.dueDate || null,
          phone: actionForm.phone?.trim() || null,
          notes: actionForm.notes?.trim() || null,
        }
      }

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || "Could not create this WalletIQ record.")
      }

      setCreatedSuggestionIds((current) =>
        current.includes(actionSuggestion.id) ? current : [...current, actionSuggestion.id]
      )
      const label = suggestionLabel(actionSuggestion.type)
      setActionSuggestion(null)
      setActionForm({})
      say(`${label} added successfully.`)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not create this WalletIQ record.")
    } finally {
      setCreatingAction(false)
    }
  }

  return (
    <AppShell>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Workspace</p>
          <h2 className="mt-1 text-3xl font-black">Notes</h2>
          <p className="mt-2 text-sm muted">Capture ideas, money plans, reminders and checklists in one place.</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1 lg:max-w-2xl">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="input w-full !pl-12" placeholder="Search your notes..." />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {([
            ["all", "All"],
            ["pinned", "Pinned"],
            ["checklists", "Checklists"],
            ["archive", "Archive"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`btn whitespace-nowrap ${filter === key ? "btn-primary" : "btn-secondary"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loadError && <DataErrorState title="Unable to load notes" onRetry={load} />}

      {!loadError && loading && (
        <div className="mt-6 columns-1 gap-4 sm:columns-2 xl:columns-3">
          {[1, 2, 3, 4].map((item) => <div key={item} className="skeleton mb-4 h-40 break-inside-avoid rounded-3xl" />)}
        </div>
      )}

      {!loading && !loadError && shown.length > 0 && (
        <div className="mt-6 columns-1 gap-4 sm:columns-2 xl:columns-3 2xl:columns-4">
          {shown.map((note) => (
            <article
              key={note.id}
              className="note-card mb-4 break-inside-avoid rounded-3xl border p-4 transition hover:-translate-y-0.5"
              style={{ background: colorValue(note.color), borderColor: note.pinned ? "rgba(110,231,183,.48)" : "var(--line)" }}
            >
              <div className="flex items-start gap-2">
                <button type="button" onClick={() => openEditor(note)} className="min-w-0 flex-1 text-left">
                  <div className="flex items-center gap-2">
                    {note.type === "CHECKLIST" ? <CheckSquare2 size={16} className="accent" /> : <StickyNote size={16} className="accent" />}
                    <h3 className="truncate font-black">{note.title?.trim() || (note.type === "CHECKLIST" ? "Checklist" : "Untitled note")}</h3>
                  </div>

                  {note.type === "TEXT" ? (
                    note.content?.trim() && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 muted line-clamp-7">{note.content}</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {note.items.slice(0, 7).map((item, index) => (
                        <div key={`${note.id}-${index}`} className="flex items-start gap-2 text-sm">
                          <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border ${item.checked ? "border-emerald-400 bg-emerald-400 text-emerald-950" : ""}`} style={!item.checked ? { borderColor: "var(--line)" } : undefined}>
                            {item.checked && <Check size={11} strokeWidth={3} />}
                          </span>
                          <span className={item.checked ? "muted line-through" : ""}>{item.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </button>

                <button type="button" onClick={() => quickPatch(note, { pinned: !note.pinned })} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg transition hover:bg-white/5" aria-label={note.pinned ? "Unpin note" : "Pin note"}>
                  {note.pinned ? <PinOff size={15} className="accent" /> : <Pin size={15} className="muted" />}
                </button>
              </div>

              {!!note.tags.length && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {note.tags.map((tag) => <span key={tag} className="rounded-full border px-2 py-1 text-[10px] font-bold muted" style={{ borderColor: "var(--line)" }}>#{tag}</span>)}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between border-t pt-3" style={{ borderColor: "var(--line)" }}>
                <span className="text-[10px] muted">Edited {new Date(note.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
                <div className="flex gap-1">
                  <button type="button" onClick={() => quickPatch(note, { archived: !note.archived })} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/5" aria-label={note.archived ? "Restore note" : "Archive note"}>
                    {note.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
                  </button>
                  <button type="button" onClick={() => setDeleteTarget(note)} className="grid h-8 w-8 place-items-center rounded-lg text-rose-400 hover:bg-rose-500/10" aria-label="Delete note"><Trash2 size={15} /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && !loadError && !shown.length && (
        <div className="empty-state mt-8 min-h-64">
          <StickyNote className="mx-auto accent" size={32} />
          <p className="mt-4 text-lg font-black">{query ? "No matching notes" : filter === "archive" ? "Archive is empty" : "No notes yet"}</p>
          <p className="mt-2 text-sm muted">{query ? "Try another search." : "Tap the + button to create a note or checklist."}</p>
        </div>
      )}

      <div className="fixed bottom-24 right-5 z-40 flex flex-col items-end gap-2 md:bottom-8 md:right-8">
        {plusOpen && (
          <>
            <button type="button" onClick={() => create("CHECKLIST")} className="notes-fab-option"><CheckSquare2 size={18} /> Checklist</button>
            <button type="button" onClick={() => create("TEXT")} className="notes-fab-option"><StickyNote size={18} /> Note</button>
          </>
        )}
        <button type="button" onClick={() => setPlusOpen((value) => !value)} className="notes-fab" aria-label={plusOpen ? "Close create menu" : "Create note"}>
          {plusOpen ? <X size={27} /> : <Plus size={28} />}
        </button>
      </div>

      {draft && editing && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 px-3 py-[max(14px,env(safe-area-inset-top))] backdrop-blur-sm sm:p-4">
          <div
            className="note-editor flex h-[calc(100dvh-28px)] max-h-[760px] w-full min-w-0 max-w-2xl flex-col overflow-hidden rounded-[26px] border shadow-2xl sm:h-auto sm:max-h-[94vh] sm:rounded-[30px]"
            style={{
              background: colorValue(draft.color),
              borderColor: "var(--line)",
            }}
          >
            <div
              className="flex shrink-0 items-center justify-between gap-3 border-b px-3 py-3 sm:px-4"
              style={{ borderColor: "var(--line)" }}
            >
              <button
                type="button"
                onClick={closeEditor}
                className="icon-button shrink-0"
                aria-label="Close note"
                title="Close note"
              >
                <X size={18} />
              </button>
              <span className={`min-w-0 flex-1 truncate text-center text-xs font-bold ${saveState === "error" ? "text-rose-400" : "muted"}`}>
                {saveState === "saving" ? "Saving..." : saveState === "error" ? "Save failed" : "Saved"}
              </span>
              <button
                type="button"
                onClick={() => updateDraft({ pinned: !draft.pinned })}
                className="icon-button shrink-0"
                aria-label={draft.pinned ? "Unpin note" : "Pin note"}
                title={draft.pinned ? "Unpin note" : "Pin note"}
              >
                {draft.pinned ? <PinOff size={18} className="accent" /> : <Pin size={18} />}
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:p-5">
              <input
                value={draft.title || ""}
                onChange={(e) => updateDraft({ title: e.target.value })}
                className="w-full min-w-0 bg-transparent text-xl font-black outline-none placeholder:muted sm:text-2xl"
                placeholder="Title"
              />

              {draft.type === "TEXT" ? (
                <textarea
                  value={draft.content || ""}
                  onChange={(e) => updateDraft({ content: e.target.value })}
                  className="mt-4 min-h-[220px] w-full resize-none bg-transparent text-base leading-7 outline-none placeholder:muted sm:min-h-[280px] sm:text-sm"
                  placeholder="Take a note..."
                  autoFocus
                />
              ) : (
                <div className="mt-5 space-y-2">
                  {draft.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input type="checkbox" checked={item.checked} onChange={(e) => updateChecklistItem(index, { checked: e.target.checked })} className="h-4 w-4 shrink-0" />
                      <input
                        value={item.text}
                        onChange={(e) => updateChecklistItem(index, { text: e.target.value })}
                        className={`min-w-0 flex-1 border-b bg-transparent py-2 text-sm outline-none ${item.checked ? "muted line-through" : ""}`}
                        style={{ borderColor: "var(--line)" }}
                        placeholder="List item"
                        autoFocus={index === draft.items.length - 1}
                      />
                      <button type="button" onClick={() => removeChecklistItem(index)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg muted hover:bg-white/5"><X size={14} /></button>
                    </div>
                  ))}
                  <button type="button" onClick={addChecklistItem} className="btn btn-secondary mt-2"><Plus size={15} /> List item</button>
                </div>
              )}

              <div className="mt-7 border-t pt-5" style={{ borderColor: "var(--line)" }}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="accent" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider muted">WalletIQ AI</p>
                      <p className="mt-1 text-xs muted">Detect financial actions in this note, then review before creating anything.</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={analyzeNote}
                    disabled={analyzing}
                    className="btn btn-primary shrink-0 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {analyzing ? <Bot size={16} className="animate-pulse" /> : <Sparkles size={16} />}
                    {analyzing ? "Analyzing..." : "Analyze with WalletIQ AI"}
                  </button>
                </div>

                {aiError && (
                  <div className="mt-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-bold text-rose-300">
                    {aiError}
                  </div>
                )}

                {aiAnalysis && (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl border p-3" style={{ borderColor: "var(--line)", background: "var(--secondary)" }}>
                      <p className="text-sm font-bold">{aiAnalysis.summary}</p>
                    </div>

                    {aiAnalysis.suggestions.length === 0 ? (
                      <div className="rounded-2xl border p-4 text-sm muted" style={{ borderColor: "var(--line)" }}>
                        WalletIQ AI did not clearly detect a recurring payment, budget, or Borrow/Lend action in this note.
                      </div>
                    ) : (
                      aiAnalysis.suggestions.map((suggestion) => (
                        <div
                          key={suggestion.id}
                          className="rounded-2xl border p-4"
                          style={{ borderColor: "var(--line)", background: "var(--secondary)" }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-black uppercase tracking-wider accent">
                                {suggestionIcon(suggestion.type)} {suggestionLabel(suggestion.type)}
                              </p>
                              <p className="mt-1 font-black">{suggestion.title}</p>
                            </div>
                            <span className="rounded-full border px-2 py-1 text-[10px] font-bold muted" style={{ borderColor: "var(--line)" }}>
                              {suggestion.confidence} confidence
                            </span>
                          </div>

                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {Object.entries(suggestion.fields)
                              .filter(([, value]) => value !== null && value !== undefined && value !== "")
                              .map(([key, value]) => (
                                <div key={key} className="rounded-xl border px-3 py-2" style={{ borderColor: "var(--line)" }}>
                                  <p className="text-[10px] font-black uppercase tracking-wider muted">
                                    {key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())}
                                  </p>
                                  <p className="mt-1 break-words text-sm font-bold">{displayField(value)}</p>
                                </div>
                              ))}
                          </div>

                          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[11px] muted">
                              Review and edit WalletIQ AI’s detected details before creating anything.
                            </p>

                            {createdSuggestionIds.includes(suggestion.id) ? (
                              <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-300">
                                <Check size={14} strokeWidth={3} /> Added to WalletIQ
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openActionReview(suggestion)}
                                className="btn btn-primary"
                              >
                                Review & create
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="mt-7 border-t pt-5" style={{ borderColor: "var(--line)" }}>
                <div className="flex items-center gap-2"><Tags size={16} className="accent" /><p className="text-xs font-black uppercase tracking-wider muted">Tags</p></div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {draft.tags.map((tag) => (
                    <button key={tag} type="button" onClick={() => updateDraft({ tags: draft.tags.filter((item) => item !== tag) })} className="rounded-full border px-3 py-1.5 text-xs font-bold" style={{ borderColor: "var(--line)" }}>#{tag} ×</button>
                  ))}
                </div>
                <div className="mt-3 flex min-w-0 gap-2">
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addTag()
                      }
                    }}
                    className="input min-w-0 flex-1"
                    placeholder="Add tag"
                  />
                  <button type="button" onClick={addTag} className="btn btn-secondary shrink-0 px-4">
                    Add
                  </button>
                </div>
              </div>

              <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--line)" }}>
                <div className="flex items-center gap-2">
                  <Palette size={16} className="accent" />
                  <p className="text-xs font-black uppercase tracking-wider muted">Note appearance</p>
                </div>

                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] muted">Colors</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {noteColors.map((color) => (
                    <button
                      key={color.key}
                      type="button"
                      title={color.label}
                      aria-label={`Use ${color.label} color`}
                      onClick={() => updateDraft({ color: color.key })}
                      className={`h-9 w-9 rounded-full border-2 transition hover:-translate-y-0.5 ${
                        draft.color === color.key
                          ? "ring-2 ring-emerald-300/60 ring-offset-2 ring-offset-transparent"
                          : ""
                      }`}
                      style={{
                        background: color.value,
                        borderColor: draft.color === color.key ? "var(--accent)" : "var(--line)",
                      }}
                    />
                  ))}
                </div>

                <p className="mt-5 text-[10px] font-black uppercase tracking-[0.16em] muted">Background themes</p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {noteThemes.map((theme) => (
                    <button
                      key={theme.key}
                      type="button"
                      onClick={() => updateDraft({ color: theme.key })}
                      className={`group relative min-h-16 overflow-hidden rounded-2xl border p-2 text-left transition hover:-translate-y-0.5 ${
                        draft.color === theme.key
                          ? "ring-2 ring-emerald-300/60 ring-offset-2 ring-offset-transparent"
                          : ""
                      }`}
                      style={{
                        background: theme.value,
                        backgroundSize: theme.key === "theme-finance" ? "18px 18px, 18px 18px, auto" : undefined,
                        borderColor: draft.color === theme.key ? "var(--accent)" : "var(--line)",
                        color: "var(--text)",
                      }}
                      aria-label={`Use ${theme.label} theme`}
                    >
                      <span
                        className="inline-flex rounded-lg px-2 py-1 text-[10px] font-black"
                        style={{
                          background: "color-mix(in srgb, var(--panel) 72%, transparent)",
                          border: "1px solid var(--line)",
                        }}
                      >
                        {theme.label}
                      </span>
                    </button>
                  ))}
                </div>

                <p className="mt-3 text-[11px] leading-5 muted">
                  Themes are lightweight CSS backgrounds and are saved with each note just like colors.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t p-4" style={{ borderColor: "var(--line)" }}>
              <button
                type="button"
                onClick={async () => {
                  const next = { ...draft, archived: !draft.archived }
                  if (saveTimer.current) clearTimeout(saveTimer.current)
                  await persist(next)
                  setEditing(null)
                  setDraft(null)
                }}
                className="btn btn-secondary min-w-0 flex-1 justify-center sm:flex-none"
              >
                {draft.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                <span>{draft.archived ? "Restore" : "Archive"}</span>
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(draft)}
                className="btn btn-secondary min-w-0 flex-1 justify-center text-rose-400 sm:flex-none"
              >
                <Trash2 size={16} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {actionSuggestion && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-4">
          <div
            className="w-full max-w-lg overflow-hidden rounded-[26px] border shadow-2xl"
            style={{ background: "var(--panel)", borderColor: "var(--line)" }}
          >
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: "var(--line)" }}>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wider accent">
                  {suggestionIcon(actionSuggestion.type)} {suggestionLabel(actionSuggestion.type)}
                </p>
                <h3 className="mt-1 truncate text-lg font-black">Review before creating</h3>
              </div>
              <button
                type="button"
                className="icon-button shrink-0"
                onClick={() => {
                  if (!creatingAction) {
                    setActionSuggestion(null)
                    setActionError("")
                  }
                }}
                aria-label="Close review"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-4">
              {actionSuggestion.type === "RECURRING" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <input className="input sm:col-span-2" value={actionForm.merchant || ""} onChange={(e) => updateActionField("merchant", e.target.value)} placeholder="Merchant" />
                  <input className="input" type="number" min="0.01" step="0.01" value={actionForm.amount || ""} onChange={(e) => updateActionField("amount", e.target.value)} placeholder="Amount ₹" />
                  <select className="input" value={actionForm.category || "Other"} onChange={(e) => updateActionField("category", e.target.value)}>
                    {financeCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                  <select className="input" value={actionForm.paymentMethod || "Other"} onChange={(e) => updateActionField("paymentMethod", e.target.value)}>
                    {paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
                  </select>
                  <select className="input" value={actionForm.frequency || ""} onChange={(e) => updateActionField("frequency", e.target.value)}>
                    <option value="">Frequency</option>
                    {recurringFrequencies.map((frequency) => <option key={frequency} value={frequency}>{frequency}</option>)}
                  </select>
                  <div className="sm:col-span-2">
                    <ActionDateField
                      value={actionForm.nextDate || ""}
                      placeholder="Next due date"
                      onChange={(value) => updateActionField("nextDate", value)}
                    />
                  </div>
                </div>
              )}

              {actionSuggestion.type === "BUDGET" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <select className="input" value={actionForm.category || "Other"} onChange={(e) => updateActionField("category", e.target.value)}>
                    {financeCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                  <input className="input" type="number" min="1" step="0.01" value={actionForm.amount || ""} onChange={(e) => updateActionField("amount", e.target.value)} placeholder="Monthly budget ₹" />
                  <p className="sm:col-span-2 rounded-xl border p-3 text-xs muted" style={{ borderColor: "var(--line)" }}>
                    WalletIQ will save this budget for the current month.
                  </p>
                </div>
              )}

              {actionSuggestion.type === "BORROW_LEND" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <input className="input sm:col-span-2" value={actionForm.person || ""} onChange={(e) => updateActionField("person", e.target.value)} placeholder="Friend / person name" />
                  <select className="input" value={actionForm.type || ""} onChange={(e) => updateActionField("type", e.target.value)}>
                    <option value="">Borrow or lend?</option>
                    <option value="BORROWED">I borrowed money</option>
                    <option value="LENT">I lent money</option>
                  </select>
                  <input className="input" type="number" min="0.01" step="0.01" value={actionForm.amount || ""} onChange={(e) => updateActionField("amount", e.target.value)} placeholder="Amount ₹" />
                  <ActionDateField
                    value={actionForm.startDate || ""}
                    placeholder="Start date"
                    max={indiaTodayInput()}
                    onChange={(value) => updateActionField("startDate", value)}
                  />
                  <ActionDateField
                    value={actionForm.dueDate || ""}
                    placeholder="Due date"
                    onChange={(value) => updateActionField("dueDate", value)}
                  />
                  <input className="input sm:col-span-2" value={actionForm.phone || ""} onChange={(e) => updateActionField("phone", e.target.value)} placeholder="Phone / contact (optional)" />
                  <input className="input sm:col-span-2" value={actionForm.notes || ""} onChange={(e) => updateActionField("notes", e.target.value)} placeholder="Notes (optional)" />
                </div>
              )}

              {actionError && (
                <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm font-bold text-rose-300">
                  {actionError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t p-4" style={{ borderColor: "var(--line)" }}>
              <button type="button" className="btn btn-secondary" disabled={creatingAction} onClick={() => { setActionSuggestion(null); setActionError("") }}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" disabled={creatingAction} onClick={createSuggestedAction}>
                {creatingAction ? "Creating..." : `Create ${suggestionLabel(actionSuggestion.type)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete note?"
        message="This note will be permanently deleted."
        confirmLabel="Delete note"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && remove(deleteTarget)}
      />
    </AppShell>
  )
}
