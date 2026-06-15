import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** shadcn standardi: Tailwind siniflarini cakismadan birlestirir. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
