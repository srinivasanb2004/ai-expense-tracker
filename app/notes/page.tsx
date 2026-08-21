"use client"

import AppShell from "@/components/app-shell"
import ConfirmModal from "@/components/confirm-modal"
import DataErrorState from "@/components/data-error-state"
import Toast, { ToastState } from "@/components/toast"
import {
  Archive,
  ArchiveRestore,
  Check,
  CheckSquare2,
  Palette,
  Pin,
  PinOff,
  Plus,
  Search,
  StickyNote,
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
  { key: "emerald", label: "Emerald", value: "rgba(16,185,129,.13)" },
  { key: "teal", label: "Teal", value: "rgba(20,184,166,.13)" },
  { key: "amber", label: "Amber", value: "rgba(245,158,11,.13)" },
  { key: "rose", label: "Rose", value: "rgba(244,63,94,.11)" },
  { key: "violet", label: "Violet", value: "rgba(139,92,246,.12)" },
]

function colorValue(key: string) {
  return noteColors.find((item) => item.key === key)?.value || noteColors[0].value
}

function emptyNote(note: Note) {
  return !note.title?.trim() && !note.content?.trim() && !note.items.some((item) => item.text.trim())
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
  }

  async function persist(note: Note) {
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
      setNotes((current) => current.map((item) => (item.id === updated.id ? updated : item)))
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

    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }

    if (emptyNote(draft)) {
      await fetch(`/api/notes/${draft.id}`, { method: "DELETE" }).catch(() => null)
      setNotes((current) => current.filter((item) => item.id !== draft.id))
    } else if (saveState === "saving" || saveState === "error" || JSON.stringify(draft) !== JSON.stringify(editing)) {
      await persist(draft)
    }

    setEditing(null)
    setDraft(null)
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
                <div className="flex items-center gap-2"><Palette size={16} className="accent" /><p className="text-xs font-black uppercase tracking-wider muted">Card color</p></div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {noteColors.map((color) => (
                    <button key={color.key} type="button" title={color.label} onClick={() => updateDraft({ color: color.key })} className={`h-9 w-9 rounded-full border-2 ${draft.color === color.key ? "ring-2 ring-emerald-300/60 ring-offset-2 ring-offset-transparent" : ""}`} style={{ background: color.value, borderColor: draft.color === color.key ? "var(--accent)" : "var(--line)" }} />
                  ))}
                </div>
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
