import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  src: string
  alt: string
  className?: string
  fallback?: string | null
}

export function SafeImage({ src, alt, className, fallback = '/images/fruits.jpg' }: Props) {
  const [current, setCurrent] = useState(src || fallback || '')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
    setCurrent(src || fallback || '')
  }, [src, fallback])

  if (!current || failed) {
    return <div className={cn('bg-leaf-light', className)} aria-hidden="true" />
  }

  return (
    <img
      src={current}
      alt={alt}
      className={cn('bg-leaf-light object-cover', className)}
      onError={() => {
        if (fallback && current !== fallback) {
          setCurrent(fallback)
          return
        }
        setFailed(true)
      }}
    />
  )
}
