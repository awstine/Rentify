import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Upload } from 'lucide-react'
import { createPropertyListing, uploadPropertyImage } from '../lib/properties'

interface RoomInput {
  room_number: string
  monthly_rent: number
}

interface AddPropertyModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const MAX_IMAGES = 6
const MAX_IMAGE_MB = 5

export function AddPropertyModal({ isOpen, onClose, onSuccess }: AddPropertyModalProps) {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [rooms, setRooms] = useState<RoomInput[]>([{ room_number: 'A101', monthly_rent: 15000 }])
  const [images, setImages] = useState<{ file: File; preview: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const handleAddRoomRow = () => {
    setRooms([...rooms, { room_number: '', monthly_rent: 15000 }])
  }

  const handleRemoveRoomRow = (index: number) => {
    setRooms(rooms.filter((_, idx) => idx !== index))
  }

  const handleRoomChange = (index: number, field: keyof RoomInput, value: string | number) => {
    const updated = [...rooms]
    updated[index] = {
      ...updated[index],
      [field]: field === 'monthly_rent' ? Number(value) : value,
    }
    setRooms(updated)
  }

  const handleFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    const next = [...images]
    for (const file of files) {
      if (next.length >= MAX_IMAGES) break
      if (!file.type.startsWith('image/')) { setErrorMsg('Only image files are allowed'); continue }
      if (file.size > MAX_IMAGE_MB * 1024 * 1024) { setErrorMsg(`Each image must be under ${MAX_IMAGE_MB}MB`); continue }
      next.push({ file, preview: URL.createObjectURL(file) })
    }
    setImages(next)
    setErrorMsg(null)
  }

  const removeImage = (index: number) => {
    setImages((prev) => {
      const target = prev[index]
      if (target) URL.revokeObjectURL(target.preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    try {
      const imageUrls: string[] = []
      for (const { file } of images) {
        const result = await uploadPropertyImage(file)
        if (!result.success || !result.path) throw new Error(result.error || 'Failed to upload image')
        imageUrls.push(result.path)
      }

      const result = await createPropertyListing({ name, location, description, rooms, imageUrls })
      if (!result.success) throw new Error(result.error || 'Failed to create property')

      setName('')
      setLocation('')
      setDescription('')
      setRooms([{ room_number: 'A101', monthly_rent: 15000 }])
      setImages([])
      onSuccess()
      onClose()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create property'
      setErrorMsg(message)
    } finally {
      setLoading(false)
    }
  }
return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
          <h2 className="text-xl font-bold text-gray-900">Add New Property</h2>
          <button type="button" onClick={onClose} className="text-lg font-bold text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorMsg}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Property Name</label>
            <input
              required
              type="text"
              placeholder="e.g. Sunridge Apartments"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Location / Area</label>
            <input
              required
              type="text"
              placeholder="e.g. Westlands, Nairobi"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              placeholder="Short description shown to tenants once the listing is approved..."
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
<div className="border-t border-gray-100 pt-2">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700">Photos ({images.length}/{MAX_IMAGES})</label>
              {images.length < MAX_IMAGES && (
                <label className="cursor-pointer text-xs font-bold text-emerald-600 hover:text-emerald-700">
                  Upload Photos
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFilesSelected}
                  />
                </label>
              )}
            </div>
            {images.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {images.map((img, index) => (
                  <div key={img.preview} className="group relative">
                    <img src={img.preview} alt={`Property photo ${index + 1}`} className="h-16 w-16 rounded-lg border border-gray-200 object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100"
                      aria-label="Remove photo"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-2 flex aspect-video items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400">
                <Upload className="mr-1.5 h-4 w-4" /> Add a few clear photos to make the listing credible
              </div>
            )}
          </div>
<div className="border-t border-gray-100 pt-2">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700">Initial Units / Rooms</label>
              <button
                type="button"
                onClick={handleAddRoomRow}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
              >
                + Add Another Unit
              </button>
            </div>

            <div className="space-y-2">
              {rooms.map((room, index) => (
                <div key={`${room.room_number}-${index}`} className="flex items-center gap-2">
                  <input
                    required
                    type="text"
                    placeholder="Unit (e.g. B1)"
                    value={room.room_number}
                    onChange={(event) => handleRoomChange(index, 'room_number', event.target.value)}
                    className="w-1/2 rounded-lg border border-gray-300 p-2 text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <input
                    required
                    min="1"
                    type="number"
                    placeholder="Rent (KES)"
                    value={room.monthly_rent}
                    onChange={(event) => handleRoomChange(index, 'monthly_rent', event.target.value)}
                    className="w-1/2 rounded-lg border border-gray-300 p-2 text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  {rooms.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRoomRow(index)}
                      className="px-1 text-sm text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-amber-100">
            Your property will be reviewed by our team before going live. This usually takes less than 24 hours.
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}