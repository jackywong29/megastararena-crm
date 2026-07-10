// Instant navigation feedback: this skeleton paints the moment a nav link is
// tapped, while the server streams the real page. The sidebar/bottom nav stay
// mounted (they live in the layout above this boundary) — only the content
// area swaps. Shapes approximate the common page anatomy: header bar, a hero
// block, a stats row, and list rows.
export default function DashboardLoading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading">
      {/* Header bar */}
      <div className="h-14 md:h-16 border-b border-zinc-800 flex items-center px-4 md:px-6">
        <div className="h-5 w-28 bg-zinc-800 rounded" />
        <div className="ml-auto flex items-center gap-3">
          <div className="h-8 w-8 bg-zinc-800 rounded-full" />
          <div className="h-8 w-8 bg-zinc-800 rounded-full" />
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto w-full">
        {/* Title / hero */}
        <div className="space-y-2">
          <div className="h-6 w-48 bg-zinc-800 rounded" />
          <div className="h-4 w-64 bg-zinc-900 rounded" />
        </div>
        <div className="h-40 bg-zinc-900 border border-zinc-800 rounded-2xl" />

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-zinc-900 border border-zinc-800 rounded-xl" />
          ))}
        </div>

        {/* List rows */}
        <div className="space-y-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-16 bg-zinc-900 border border-zinc-800 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
