/** A blocky fill bar. Steps in 5% chunks so it reads as pixels, not a smooth gauge. */
export function StatBar({
  value,
  max,
  colorClass = 'bg-marigold',
}: {
  value: number
  max: number
  colorClass?: string
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const steps = Math.round(pct / 5)
  return (
    <div className="flex h-2 w-full gap-[2px] border border-line bg-night p-[1px]">
      {Array.from({ length: 20 }, (_, i) => (
        <div
          key={i}
          className={`flex-1 transition-colors duration-300 ${i < steps ? colorClass : 'bg-line/40'}`}
        />
      ))}
    </div>
  )
}
