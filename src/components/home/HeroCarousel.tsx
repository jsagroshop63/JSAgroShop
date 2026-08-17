import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useStore } from '@/context/StoreContext'

export function HeroCarousel() {
  const { slides } = useStore()
  const active = slides.filter((slide) => slide.active).sort((a, b) => a.sortOrder - b.sortOrder)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (active.length < 2) return
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % active.length)
    }, 4500)
    return () => window.clearInterval(timer)
  }, [active.length])

  if (!active.length) return null
  const safeIndex = index < active.length ? index : 0
  const slide = active[safeIndex] ?? active[0]

  return (
    <section className="relative h-[210px] overflow-hidden bg-leaf-deep sm:h-[240px] md:h-[36vh] md:min-h-[260px] lg:h-[72vh] lg:min-h-[520px]">
      {active.map((item, i) => (
        <img
          key={item.id}
          src={item.image}
          alt={item.title}
          className="absolute inset-0 size-full object-cover transition-opacity duration-700"
          style={{ opacity: i === safeIndex ? 1 : 0 }}
          onError={(event) => {
            event.currentTarget.src = '/images/hero-garden.jpg'
          }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-leaf-deep/90 via-leaf-deep/50 to-black/20" />

      <div className="relative z-10 mx-auto flex h-full max-w-6xl items-center justify-center px-10 text-center sm:px-14 md:px-16">
        <div className="max-w-xl text-white">
          <p className="mb-1 inline-block rounded-full bg-gold px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-leaf-deep sm:mb-2 sm:px-3 sm:py-1 sm:text-xs lg:mb-3">
            JS Agro Shop
          </p>
          <h1 className="text-lg font-extrabold leading-snug text-cream sm:text-2xl md:text-3xl lg:font-display lg:text-6xl lg:leading-tight">
            {slide.title}
          </h1>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-cream/90 sm:mt-2 sm:text-sm lg:mt-4 lg:line-clamp-none lg:text-lg">
            {slide.subtitle}
          </p>
          <Link
            to={slide.ctaLink}
            className="mt-2 inline-flex rounded-full bg-gold px-4 py-1.5 text-xs font-bold text-leaf-deep shadow-lg hover:bg-gold-dark sm:mt-3 sm:px-5 sm:py-2 sm:text-sm lg:mt-8 lg:px-7 lg:py-3 lg:text-base"
          >
            {slide.ctaText}
          </Link>
        </div>
      </div>

      {active.length > 1 && (
        <>
          <button
            type="button"
            className="absolute left-1.5 top-1/2 z-20 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur sm:left-3 sm:size-8 lg:left-4 lg:size-11"
            onClick={() => setIndex((current) => (current - 1 + active.length) % active.length)}
            aria-label="আগের ছবি"
          >
            <ChevronLeft className="size-4 sm:size-5" />
          </button>
          <button
            type="button"
            className="absolute right-1.5 top-1/2 z-20 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur sm:right-3 sm:size-8 lg:right-4 lg:size-11"
            onClick={() => setIndex((current) => (current + 1) % active.length)}
            aria-label="পরের ছবি"
          >
            <ChevronRight className="size-4 sm:size-5" />
          </button>
          <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 gap-1.5 sm:bottom-3 lg:bottom-5 lg:gap-2">
            {active.map((item, i) => (
              <button
                key={item.id}
                type="button"
                className={`h-1.5 rounded-full transition-all sm:h-2 ${i === safeIndex ? 'w-6 bg-gold sm:w-8' : 'w-1.5 bg-white/60 sm:w-2'}`}
                onClick={() => setIndex(i)}
                aria-label={`স্লাইড ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
