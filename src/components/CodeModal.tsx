import { useState } from "react"
import { Copy, Download, Check, QrCode, X } from "lucide-react"
import QRCode from "qrcode"

interface CodeModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  code: string
  joinUrl: string
  onGenerate?: () => Promise<string | null>
}

export function CodeModal({ isOpen, onClose, title, subtitle, code, joinUrl, onGenerate }: CodeModalProps) {
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  if (!isOpen) return null

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // fallback for older browsers
    }
  }

  const generateQr = async () => {
    setGenerating(true)
    try {
      // If we already have a join URL use it, otherwise create the code first
      let url = joinUrl
      if (!url && onGenerate) {
        url = (await onGenerate()) ?? ""
      }
      if (!url) return
      const dataUrl = await QRCode.toDataURL(url, { width: 320, margin: 2 })
      setQrDataUrl(dataUrl)
    } catch (error) {
      console.error("Failed to generate QR:", error)
    } finally {
      setGenerating(false)
    }
  }

  const downloadQr = () => {
    if (!qrDataUrl) return
    const link = document.createElement("a")
    link.href = qrDataUrl
    link.download = `${title.toLowerCase().replace(/\s+/g, "-")}-qrcode.png`
    link.click()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 flex flex-col items-center">
          {qrDataUrl ? (
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <img src={qrDataUrl} alt={`${title} QR code`} className="h-48 w-48" />
            </div>
          ) : (
            <button
              type="button"
              onClick={generateQr}
              disabled={generating}
              className="flex h-48 w-48 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 transition hover:border-emerald-300 hover:text-emerald-600 disabled:opacity-50"
            >
              <QrCode className="h-10 w-10" />
              <span className="mt-2 text-sm font-semibold">{generating ? "Generating..." : "Tap to Generate QR"}</span>
            </button>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Invitation code</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <code className="rounded-lg bg-white px-3 py-2 text-sm font-bold tracking-widest text-slate-800 ring-1 ring-slate-200">{code}</code>
            <div className="flex items-center gap-2">
              <button type="button" onClick={copyCode} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
              {qrDataUrl && (
                <button type="button" onClick={downloadQr} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50">
                  <Download className="h-3.5 w-3.5" /> Save
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Share this code or QR with a tenant to let them book this unit.
        </p>
      </div>
    </div>
  )
}
