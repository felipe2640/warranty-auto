import { addDaysDateOnly, toDateOnlyString } from "@/lib/date"

export function computeDueDate(deliveredAt: Date | string, slaDays: number) {
  const base = toDateOnlyString(deliveredAt)
  return addDaysDateOnly(base, slaDays)
}

export function computeIsOverdue(dueDate: string, today: string) {
  return dueDate < today
}
