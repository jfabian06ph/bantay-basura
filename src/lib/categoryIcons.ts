import {
  Trash2,
  Truck,
  Waves,
  Flame,
  Construction,
  Recycle,
  type LucideIcon,
} from 'lucide-react'
import type { Category } from '../types'

/**
 * Line-icon per waste category (lucide) — the app's icon language, replacing the
 * emoji set so every screen reads consistently. See CATEGORY_LABELS in types.ts.
 */
export const CATEGORY_ICON: Record<Category, LucideIcon> = {
  household: Trash2,
  dumping: Truck,
  water: Waves,
  burning: Flame,
  construction: Construction,
  recycling: Recycle,
}
