import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './ui.css'

/**
 * Task 126 — the design system primitives. Every screen should build hierarchy
 * from these instead of ad-hoc bordered boxes:
 *
 * - `Button` — primary (one per card), secondary (outline), ghost (text).
 * - `Chip` — small sentence-case filter / tag.
 * - `Segmented` — sub-tabs and small either/or controls.
 * - `Card` — title / optional subtitle / body / footer actions.
 * - `ListRow` — icon · title · subtitle · trailing, whole row tappable.
 * - `EmptyState` — one line and one action; render nothing when there is none.
 * - `Kicker` — an eyebrow label, only where it adds meaning.
 */

type Variant = 'primary' | 'secondary' | 'ghost'

export function Button({
  variant = 'secondary',
  small = false,
  danger = false,
  className,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  small?: boolean
  danger?: boolean
}) {
  const cls = [
    'btn',
    variant !== 'secondary' ? `btn--${variant}` : 'btn--secondary',
    small ? 'btn--small' : '',
    danger ? 'btn--danger' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')
  return <button type={type} className={cls} {...rest} />
}

export function Chip({
  on = false,
  warn = false,
  className,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { on?: boolean; warn?: boolean }) {
  const cls = ['chip', on ? 'on' : '', warn ? 'warn' : '', className ?? ''].filter(Boolean).join(' ')
  return <button type={type} className={cls} {...rest} />
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T
  options: { id: T; label: string; hint?: string }[]
  onChange: (id: T) => void
  label?: string
  className?: string
}) {
  return (
    <div className={['subtabs', className ?? ''].filter(Boolean).join(' ')} role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={value === o.id}
          className={value === o.id ? 'active' : ''}
          title={o.hint}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={['kicker', className ?? ''].filter(Boolean).join(' ')}>{children}</div>
}

export function Card({
  title,
  subtitle,
  kicker,
  actions,
  footer,
  children,
  className,
}: {
  title?: ReactNode
  subtitle?: ReactNode
  kicker?: ReactNode
  actions?: ReactNode
  footer?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <section className={['card-ui', className ?? ''].filter(Boolean).join(' ')}>
      {(title || kicker || actions) && (
        <div className="card-ui-head">
          <div>
            {kicker != null && <Kicker>{kicker}</Kicker>}
            {title != null && <h3 className="card-ui-title">{title}</h3>}
            {subtitle != null && <p className="card-ui-sub">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children != null && <div className="card-ui-body">{children}</div>}
      {footer != null && <div className="card-ui-foot">{footer}</div>}
    </section>
  )
}

export function ListRow({
  title,
  subtitle,
  trailing,
  icon,
  onClick,
  className,
  chevron = false,
}: {
  title: ReactNode
  subtitle?: ReactNode
  trailing?: ReactNode
  icon?: ReactNode
  onClick?: () => void
  className?: string
  chevron?: boolean
}) {
  const inner = (
    <>
      {icon != null && <span className="list-row-icon" aria-hidden>{icon}</span>}
      <span className="list-row-main">
        <span className="list-row-title">{title}</span>
        {subtitle != null && <span className="list-row-sub">{subtitle}</span>}
      </span>
      {trailing != null && <span className="list-row-trail">{trailing}</span>}
      {chevron && <span className="list-row-chevron" aria-hidden>›</span>}
    </>
  )
  if (onClick) {
    return (
      <button type="button" className={['list-row', className ?? ''].filter(Boolean).join(' ')} onClick={onClick}>
        {inner}
      </button>
    )
  }
  return <div className={['list-row', className ?? ''].filter(Boolean).join(' ')}>{inner}</div>
}

export function EmptyState({ line, action }: { line: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <span>{line}</span>
      {action}
    </div>
  )
}
