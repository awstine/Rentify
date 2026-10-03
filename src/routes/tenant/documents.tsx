export default function TenantDocumentsScreen() {
  return (
    <div className="mx-auto max-w-[1180px]">
      <h1 className="text-[2.5rem] font-black tracking-[-0.06em] text-slate-800">Documents</h1>
      <p className="mt-2 text-xl text-slate-500">Your uploaded tenancy documents and records.</p>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-xl text-slate-500 shadow-sm">
        No documents uploaded yet.
      </div>
    </div>
  )
}
