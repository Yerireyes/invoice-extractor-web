import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

/**
 * Signature illustration: paper becomes a table.
 * While files are dragged over the drop zone (`active`), three invoice lines travel across the arrow
 * and land as the first column of the table; the remaining cells then fill in green, staggered.
 * Motion is gated with `motion-safe:`; with reduced motion only the colour change remains.
 * Decorative: hidden from assistive technology.
 */

const EASE = 'ease-[cubic-bezier(0.16,1,0.3,1)]' // exponential ease-out

/** Table geometry (user units). */
const TABLE = { x: 114, y: 21, width: 76, height: 50, header: 11.5 }
const COLUMNS = [120, 145, 170]
const ROWS = [39, 52, 64.5]
const CELL_WIDTH = 10

/** Invoice lines; the first three travel to column 0 of each table row. */
const LINES = [
  { y: 30, width: 40 },
  { y: 37, width: 34 },
  { y: 44, width: 38 },
  { y: 51, width: 28 },
]
const LINE_X = 20

type TravelStyle = CSSProperties & Record<'--dx' | '--dy' | '--sx', string>

export function PaperToTable({
  active = false,
  className,
}: {
  active?: boolean
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 200 92"
      fill="none"
      aria-hidden="true"
      focusable="false"
      data-active={active || undefined}
      className={cn('group/paper h-auto w-48 overflow-visible sm:w-56', className)}
    >
      {/* Back sheet */}
      <rect
        x="14"
        y="10"
        width="56"
        height="74"
        rx="3"
        transform="rotate(-5 42 47)"
        className="fill-card stroke-zone-border"
        strokeWidth="1"
      />

      {/* Front sheet */}
      <rect
        x="12"
        y="8"
        width="58"
        height="76"
        rx="3"
        className="fill-card stroke-zone-border"
        strokeWidth="1"
      />
      <rect x={LINE_X} y="18" width="22" height="3" rx="1" className="fill-foreground/75" />
      <rect x={LINE_X} y="68" width="18" height="2" rx="1" className="fill-muted-foreground/35" />
      <rect x="48" y="67" width="14" height="3" rx="1" className="fill-foreground/75" />

      {/* Arrow */}
      <g
        className={cn(
          'stroke-muted-foreground transition-[stroke,transform] duration-300',
          EASE,
          'group-data-active/paper:stroke-primary motion-safe:group-data-active/paper:translate-x-1',
        )}
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M86 46h14" />
        <path d="M96 42l4 4-4 4" />
      </g>

      {/* Table */}
      <rect
        x={TABLE.x}
        y={TABLE.y}
        width={TABLE.width}
        height={TABLE.height}
        rx="2"
        className="fill-card stroke-primary/45 transition-colors duration-300 group-data-active/paper:stroke-primary"
        strokeWidth="1"
      />
      <rect
        x={TABLE.x + 0.5}
        y={TABLE.y + 0.5}
        width={TABLE.width - 1}
        height={TABLE.header - 0.5}
        className="fill-accent transition-colors duration-300 group-data-active/paper:fill-primary/25"
      />
      <g className="stroke-primary/35" strokeWidth="1">
        <path d="M139.3 21v50M164.6 21v50" />
        <path d="M114 33h76M114 46h76M114 58.5h76" />
      </g>

      {/* Cells: columns 1–2 fill in after the lines land in column 0 */}
      {ROWS.map((y, row) =>
        COLUMNS.slice(1).map((x, index) => {
          const col = index + 1
          return (
            <rect
              key={`${String(x)}-${String(y)}`}
              x={x}
              y={y - 1}
              width={col === 2 ? CELL_WIDTH + 2 : CELL_WIDTH}
              height="2"
              rx="1"
              style={{ transitionDelay: `${String(260 + row * 60 + col * 40)}ms` }}
              className={cn(
                'origin-left transition-[fill,transform] duration-300 [transform-box:fill-box]',
                EASE,
                col === 2 ? 'fill-primary' : 'fill-muted-foreground/40',
                'group-data-active/paper:fill-primary',
                'motion-safe:group-data-active/paper:scale-x-125',
              )}
            />
          )
        }),
      )}
      {/* Column 0 at rest; hidden while the travelling lines take its place */}
      {ROWS.map((y) => (
        <rect
          key={`col0-${String(y)}`}
          x={COLUMNS[0]}
          y={y - 1}
          width={CELL_WIDTH}
          height="2"
          rx="1"
          className="fill-muted-foreground/40 transition-opacity duration-150 motion-safe:group-data-active/paper:opacity-0"
        />
      ))}

      {/* Invoice lines; the first three travel into column 0 */}
      {LINES.map((line, index) => {
        const target = ROWS[index]
        const travels = target !== undefined
        const style: TravelStyle | undefined = travels
          ? {
              '--dx': `${String((COLUMNS[0] ?? 0) - LINE_X)}px`,
              '--dy': `${String(target - 1 - line.y)}px`,
              '--sx': String(CELL_WIDTH / line.width),
              transitionDelay: `${String(index * 60)}ms`,
            }
          : undefined
        return (
          <rect
            key={line.y}
            x={LINE_X}
            y={line.y}
            width={line.width}
            height="2"
            rx="1"
            style={style}
            className={cn(
              'origin-left fill-muted-foreground/40 transition-[transform,fill,opacity] duration-500 [transform-box:fill-box]',
              EASE,
              travels
                ? 'group-data-active/paper:fill-primary/70 motion-safe:group-data-active/paper:[transform:translate(var(--dx),var(--dy))_scaleX(var(--sx))]'
                : 'motion-safe:group-data-active/paper:opacity-30',
            )}
          />
        )
      })}
    </svg>
  )
}
