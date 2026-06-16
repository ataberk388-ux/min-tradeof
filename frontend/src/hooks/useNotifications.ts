import { useEffect, useReducer } from 'react'

export interface Notif {
  id: number
  message: string
  time: number
  read: boolean
}

// Modul-seviyesi paylasimli store (alarm tetikleme, emir vb. olaylari toplar)
let items: Notif[] = []
let nextId = 1
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

export function pushNotification(message: string) {
  items = [{ id: nextId++, message, time: Date.now(), read: false }, ...items].slice(0, 50)
  emit()
}

export function markAllRead() {
  items = items.map((n) => ({ ...n, read: true }))
  emit()
}

export function clearNotifications() {
  items = []
  emit()
}

export function useNotifications() {
  const [, force] = useReducer((x) => x + 1, 0)
  useEffect(() => {
    listeners.add(force)
    return () => {
      listeners.delete(force)
    }
  }, [])
  return { items, unread: items.filter((n) => !n.read).length }
}
