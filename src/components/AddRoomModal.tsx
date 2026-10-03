import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

interface AddRoomModalProps {
  propertyId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface GeneratedRoom {
  room_number: string
  monthly_rent: number
}

const MAX_BULK = 100

export function AddRoomModal({ propertyId, isOpen, onClose, onSuccess }: AddRoomModalProps) {
  const [mode, setMode] = useState<'single' | 'bulk'>('single')

  // Single mode
  const [roomNumber, setRoomNumber] = useState('')
  const [monthlyRent, setMonthlyRent] = useState('')

  // Bulk mode
  const [bulkPrefix, setBulkPrefix] = useState('A')
  const [bulkStart, setBulkStart] = useState('1')
  const [bulkCount, setBulkCount] = useState('10')
  const [bulkRent, setBulkRent] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const buildBulkRooms = (): GeneratedRoom[] => {
    const prefix = bulkPrefix.trim().toUpperCase().replace(/\s+/g, '')
    const start = Number(bulkStart) || 1
    const count = Math.min(Math.max(Number(bulkCount) || 0, 1), MAX_BULK)
    const rent = Number(bulkRent)
    const rooms: GeneratedRoom[] = []
    for (let i = 0; i < count; i++) {
      rooms.push({ room_number: `${prefix}${start + i}`, monthly_rent: rent })
    }
    return rooms
  }

  const resetForm = () => {
    setRoomNumber('')
    setMonthlyRent('')
    setBulkPrefix('A')
    setBulkStart('1')
    setBulkCount('10')
    setBulkRent('')
  }
const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    let roomsToInsert: GeneratedRoom[]

    if (mode === 'single') {
      if (!roomNumber.trim()) {
        setError('Enter a room or unit number')
        setLoading(false)
        return
      }
      if (!(Number(monthlyRent) >= 1)) {
        setError('Enter a valid monthly rent (KES)')
        setLoading(false)
        return
      }
      roomsToInsert = [{ room_number: roomNumber.trim(), monthly_rent: Number(monthlyRent) }]
    } else {
      if (!(Number(bulkCount) >= 1)) {
        setError('Enter how many rooms to generate')
        setLoading(false)
        return
      }
      if (!(Number(bulkRent) >= 1)) {
        setError('Enter the monthly rent (KES) for these rooms')
        setLoading(false)
        return
      }
      roomsToInsert = buildBulkRooms()
    }

    // Skip room numbers that already exist for this property
    const { data: existingRooms, error: existingError } = await supabase
      .from('rooms')
      .select('room_number')
      .eq('property_id', propertyId)
    if (existingError) {
      setError(existingError.message)
      setLoading(false)
      return
    }
    const existing = new Set((existingRooms ?? []).map((r: any) => r.room_number))
    const newRooms = roomsToInsert.filter((r) => !existing.has(r.room_number))
    const skipped = roomsToInsert.length - newRooms.length

    if (newRooms.length === 0) {
      setError('All of those room numbers already exist for this property.')
      setLoading(false)
      return
    }

    const rows = newRooms.map((r) => ({
      property_id: propertyId,
      room_number: r.room_number,
      monthly_rent: r.monthly_rent,
      status: 'available',
    }))

    const { error: insertError } = await supabase.from('rooms').insert(rows)
    setLoading(false)

    if (insertError) {
      setError(`${insertError.message}${skipped > 0 ? ` (${skipped} existing room${skipped === 1 ? "" : "s"} were skipped)` : ""}`)
      return
    }

    resetForm()
    onSuccess()
    if (skipped > 0) {
      alert(`${newRooms.length} room${newRooms.length === 1 ? "" : "s"} added. ${skipped} existing room${skipped === 1 ? "" : "s"} were skipped.`)
    }
    onClose()
  }

  const previewRooms = mode === 'bulk' ? buildBulkRooms() : []
return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Add rooms</h2>
            <p className="mt-1 text-sm text-slate-500">Create one unit or generate many at once.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">×</button>
        </div>

        <div className="mt-4 flex rounded-lg bg-slate-100 p-1">
          {(['single', 'bulk'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition ${mode === m ? "bg-emerald-700 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              {m === 'single' ? 'One room' : 'Generate many (bulk)'}
            </button>
          ))}
        </div>

        {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {mode === 'single' ? (
            <>
              <label className="block text-sm font-semibold text-slate-700">
                Room or unit number
                <input required autoFocus value={roomNumber} onChange={(event) => setRoomNumber(event.target.value)} placeholder="e.g. A101" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Monthly rent (KES)
                <input required min="1" type="number" value={monthlyRent} onChange={(event) => setMonthlyRent(event.target.value)} placeholder="e.g. 15000" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
              </label>
            </>
          ) : (
            <BulkFields
              bulkPrefix={bulkPrefix}
              onPrefix={setBulkPrefix}
              bulkStart={bulkStart}
              onStart={setBulkStart}
              bulkCount={bulkCount}
              onCount={setBulkCount}
              bulkRent={bulkRent}
              onRent={setBulkRent}
              previewRooms={previewRooms}
              maxBulk={MAX_BULK}
            />
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
            <button disabled={loading} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
              {loading ? 'Adding…' : mode === 'single' ? 'Add room' : `Generate ${Math.min(Number(bulkCount) || 0, MAX_BULK)} rooms`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
interface BulkFieldsProps {
  bulkPrefix: string
  onPrefix: (v: string) => void
  bulkStart: string
  onStart: (v: string) => void
  bulkCount: string
  onCount: (v: string) => void
  bulkRent: string
  onRent: (v: string) => void
  previewRooms: GeneratedRoom[]
  maxBulk: number
}

function BulkFields({ bulkPrefix, onPrefix, bulkStart, onStart, bulkCount, onCount, bulkRent, onRent, previewRooms, maxBulk }: BulkFieldsProps) {
  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Auto-generate a series</p>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="block text-sm font-semibold text-slate-700">
            Prefix
            <input value={bulkPrefix} onChange={(e) => onPrefix(e.target.value)} placeholder="A" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Start at
            <input min="1" type="number" value={bulkStart} onChange={(e) => onStart(e.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            How many
            <input required min="1" max={maxBulk} type="number" value={bulkCount} onChange={(e) => onCount(e.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
          </label>
        </div>

        <label className="mt-3 block text-sm font-semibold text-slate-700">
          Monthly rent for all (KES)
          <input required min="1" type="number" value={bulkRent} onChange={(e) => onRent(e.target.value)} placeholder="e.g. 15000" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
        </label>
      </div>

      <div className="rounded-lg bg-sky-50 px-3 py-2.5 text-xs text-sky-800 ring-1 ring-sky-100">
        <p className="font-semibold">Preview ({Math.min(previewRooms.length, maxBulk)} units{Number(bulkCount) > maxBulk ? ` — capped at ${maxBulk}` : ""}):</p>
        <p className="mt-0.5 font-mono">
          {previewRooms.length === 0
            ? "Enter a count to see the generated room numbers"
            : previewRooms.slice(0, 8).map((r) => r.room_number).join(", ") + (previewRooms.length > 8 ? ` … ${previewRooms[previewRooms.length - 1].room_number}` : "")}
        </p>
      </div>
    </>
  )
}