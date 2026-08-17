import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function freshMediaUrl(url: string, stamp: string) {
  if (!url || !stamp) return url
  if (url.startsWith('data:') || url.startsWith('blob:')) return url
  if (/youtube\.com|youtu\.be/.test(url)) return url
  const join = url.includes('?') ? '&' : '?'
  return `${url}${join}t=${encodeURIComponent(stamp)}`
}

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`
}

export function formatTaka(amount: number) {
  return `৳ ${amount.toLocaleString('en-BD')}`
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString('bn-BD', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function normalizeBdPhone(raw: string) {
  let phone = raw.replace(/[\s-]/g, '')
  if (phone.startsWith('+880')) phone = `0${phone.slice(4)}`
  else if (phone.startsWith('880')) phone = `0${phone.slice(3)}`
  return phone
}

export function isValidBdPhone(raw: string) {
  return /^01[0-9]{9}$/.test(normalizeBdPhone(raw))
}

export function confirmDelete(label: string) {
  return window.confirm(`Delete ${label}? This cannot be undone.`)
}
