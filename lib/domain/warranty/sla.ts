export function computeDueDate(deliveredAt: Date, slaDays: number) {
  const dueDate = new Date(deliveredAt)
  dueDate.setDate(dueDate.getDate() + slaDays)
  return dueDate
}

export function computeIsOverdue(dueDate: Date, now: Date) {
  return dueDate < now
}
