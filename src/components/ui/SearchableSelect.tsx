import { ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  value: string
  options: readonly string[]
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchableSelect({ value, options, onChange, placeholder = 'জেলা খুঁজুন...' }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((item) => item.toLowerCase().includes(q))
  }, [options, query])

  function placeMenu() {
    const box = buttonRef.current?.getBoundingClientRect()
    if (!box) return
    setMenuPos({ top: box.bottom + 4, left: box.left, width: box.width })
  }

  useEffect(() => {
    if (!open) return
    placeMenu()
    inputRef.current?.focus()
    function onScroll() {
      placeMenu()
    }
    window.addEventListener('resize', onScroll)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onDoc(event: PointerEvent) {
      const target = event.target as Node
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
      setQuery('')
    }
    document.addEventListener('pointerdown', onDoc)
    return () => document.removeEventListener('pointerdown', onDoc)
  }, [open])

  function pick(item: string) {
    onChange(item)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="text-left">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setOpen((prev) => !prev)
          setQuery('')
        }}
        className="flex w-full items-center justify-between rounded-xl border border-leaf/20 bg-white px-4 py-3 text-ink"
      >
        <span>{value}</span>
        <ChevronDown className={`size-4 shrink-0 text-ink/50 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
              className="fixed z-[1100] overflow-hidden rounded-xl border border-leaf/20 bg-white shadow-lg"
            >
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    if (filtered[0]) pick(filtered[0])
                  }
                  if (event.key === 'Escape') {
                    setOpen(false)
                    setQuery('')
                  }
                }}
                placeholder={placeholder}
                autoComplete="off"
                className="w-full border-b border-leaf/10 px-4 py-3 text-ink outline-none"
              />
              <ul className="max-h-56 overflow-y-auto">
                {filtered.map((item) => (
                  <li key={item}>
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => pick(item)}
                      className={`block w-full px-4 py-2.5 text-left hover:bg-cream ${item === value ? 'bg-cream font-semibold text-leaf' : 'text-ink'}`}
                    >
                      {item}
                    </button>
                  </li>
                ))}
                {filtered.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-ink/50">কোনো জেলা পাওয়া যায়নি</li>
                ) : null}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
