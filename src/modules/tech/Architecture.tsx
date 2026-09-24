interface Stage { id: string; title: string; sub: string; chips?: string[]; tag?: string }

const STAGES: Stage[] = [
  { id: 'clients', title: 'Parent app & Staff web', sub: 'Where photos are viewed, uploads happen and permissions are set' },
  { id: 'gateway', title: 'API gateway', sub: 'Authenticates every request and enforces role-based limits' },
  { id: 'engine', title: 'Permission engine', sub: "Checks each request against the child's current parent choice" },
  { id: 'pipeline', title: 'Media pipeline', sub: 'Face detection → roster matching → automatic blur', chips: ['Face detection', 'Roster matching', 'Blur'] },
  { id: 'ledger', title: 'Evidence ledger', sub: 'Every decision is hash-chained and tamper-evident' },
  { id: 'storage', title: 'Encrypted storage', sub: 'Encrypted at rest and in transit', tag: 'India region' },
]

/** Clean SVG boxes + arrows: clients → gateway → permission engine → media pipeline → evidence ledger → encrypted storage. */
export function ArchitectureDiagram() {
  const boxW = 620, boxH = 92, gap = 46, chipH = 36, padX = 40
  let cursorY = 24
  const positions = STAGES.map((s) => {
    const h = boxH + (s.chips ? chipH + 14 : 0)
    const p = { ...s, x: padX, y: cursorY, w: boxW, h }
    cursorY += h + gap
    return p
  })
  const totalH = cursorY - gap + 24
  const totalW = boxW + padX * 2

  return (
    <svg viewBox={`0 0 ${totalW} ${totalH}`} className="mx-auto h-auto w-full max-w-[680px]" role="img"
      aria-label="Parent app and staff web flow through the API gateway and permission engine, into the media pipeline, evidence ledger and encrypted storage in India">
      <defs>
        <marker id="tech-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="var(--color-ink-3)" />
        </marker>
      </defs>
      {positions.map((p, i) => (
        <g key={p.id}>
          {i > 0 && (
            <line x1={padX + boxW / 2} y1={positions[i - 1].y + positions[i - 1].h} x2={padX + boxW / 2} y2={p.y}
              stroke="var(--color-ink-3)" strokeWidth="1.6" markerEnd="url(#tech-arrow)" />
          )}
          <rect x={p.x} y={p.y} width={p.w} height={boxH} rx="14" fill="var(--color-surface)" stroke="var(--color-line-strong)" strokeWidth="1.3" />
          <text x={p.x + 24} y={p.y + 37} fontSize="17" fontWeight="600" fill="var(--color-ink)">{p.title}</text>
          <text x={p.x + 24} y={p.y + 60} fontSize="12.5" fill="var(--color-ink-2)">{p.sub}</text>
          {p.tag && (
            <g>
              <rect x={p.x + p.w - 134} y={p.y + 15} width="110" height="24" rx="12" fill="var(--color-ok-bg)" />
              <text x={p.x + p.w - 79} y={p.y + 31} fontSize="11" fontWeight="700" fill="var(--color-ok)" textAnchor="middle">{p.tag}</text>
            </g>
          )}
          {p.chips && (
            <g>
              {p.chips.map((c, ci) => {
                const cw = (p.w - 48 - 2 * 12) / 3
                const cx = p.x + 24 + ci * (cw + 12)
                const cy = p.y + boxH + 10
                return (
                  <g key={c}>
                    <rect x={cx} y={cy} width={cw} height={chipH} rx="9" fill="var(--color-azure-50)" />
                    <text x={cx + cw / 2} y={cy + chipH / 2 + 4} fontSize="11.5" fontWeight="600" fill="var(--color-azure)" textAnchor="middle">{c}</text>
                    {ci < 2 && <path d={`M${cx + cw + 3} ${cy + chipH / 2} L${cx + cw + 9} ${cy + chipH / 2}`} stroke="var(--color-line-strong)" strokeWidth="1.4" markerEnd="url(#tech-arrow)" />}
                  </g>
                )
              })}
            </g>
          )}
        </g>
      ))}
    </svg>
  )
}
