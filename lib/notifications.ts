import { prisma } from "@/lib/prisma"

function money(value: number) {
  return `₹${Math.round(value).toLocaleString("en-IN")}`
}

function monthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1)
  return { start, end }
}

async function createOnce(
  userId: string,
  title: string,
  body: string,
  options?: { since?: Date }
) {
  const existing = await prisma.notification.findFirst({
    where: {
      userId,
      title,
      ...(options?.since ? { createdAt: { gte: options.since } } : {}),
    },
  })

  if (existing) return existing

  return prisma.notification.create({ data: { userId, title, body } })
}

export async function createIncomeAddedNotification(
  userId: string,
  source: string,
  amount: number
) {
  return prisma.notification.create({
    data: {
      userId,
      title: "Income added",
      body: `${source} of ${money(amount)} was added successfully.`,
    },
  })
}

export async function createReceiptSavedNotification(
  userId: string,
  merchant: string,
  amount: number
) {
  return prisma.notification.create({
    data: {
      userId,
      title: "Receipt scan saved",
      body: `Receipt from ${merchant} was added as ${money(amount)}.`,
    },
  })
}

export async function syncBudgetNotifications(userId: string, now = new Date()) {
  const { start, end } = monthRange(now)
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const [budgets, expenses] = await Promise.all([
    prisma.budget.findMany({ where: { userId, month, year } }),
    prisma.expense.findMany({ where: { userId, date: { gte: start, lt: end } } }),
  ])

  for (const budget of budgets) {
    const limit = Number(budget.amount)
    const spent = expenses
      .filter((expense) => expense.category === budget.category)
      .reduce((sum, expense) => sum + Number(expense.amount), 0)

    if (!limit) continue

    if (spent > limit) {
      await createOnce(
        userId,
        `${budget.category} budget exceeded`,
        `You exceeded your ${budget.category} budget by ${money(spent - limit)}.`,
        { since: start }
      )
    } else if (spent >= limit * 0.9) {
      const used = Math.floor((spent / limit) * 100)
      await createOnce(
        userId,
        `${budget.category} budget almost reached`,
        `You've used ${used}% of your ${money(limit)} ${budget.category} budget.`,
        { since: start }
      )
    }
  }
}

export async function syncRecurringReminders(userId: string, now = new Date()) {
  // Resolve "today" in India so due reminders stay correct on Vercel even
  // when the server itself is running in UTC.
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now)

  const year = Number(parts.find((part) => part.type === "year")?.value)
  const month = Number(parts.find((part) => part.type === "month")?.value)
  const day = Number(parts.find((part) => part.type === "day")?.value)
  const todayUtc = Date.UTC(year, month - 1, day)

  const recurring = await prisma.recurringExpense.findMany({
    where: {
      userId,
      active: true,
    },
    orderBy: { nextDate: "asc" },
  })

  for (const item of recurring) {
    const due = new Date(item.nextDate)
    const dueUtc = Date.UTC(
      due.getUTCFullYear(),
      due.getUTCMonth(),
      due.getUTCDate()
    )

    const diffDays = Math.round((dueUtc - todayUtc) / 86400000)
    const dateLabel = due.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    })
    const amount = money(Number(item.amount))

    // We only begin reminders the day before the due date. Once overdue,
    // a new reminder is created once for each overdue-day count until paid.
    if (diffDays > 1) continue

    if (diffDays === 1) {
      const title = `${item.merchant} payment due tomorrow`
      const body = `${item.merchant} recurring payment of ${amount} is due tomorrow (${dateLabel}).`
      await createOnce(userId, title, body)
      continue
    }

    if (diffDays === 0) {
      const title = `${item.merchant} payment due today`
      const body = `${item.merchant} payment of ${amount} is due today. Payment is pending — please pay it.`
      await createOnce(userId, title, body)
      continue
    }

    const overdueDays = Math.abs(diffDays)
    const title = `${item.merchant} payment pending · ${overdueDays}d overdue`
    const body = `${item.merchant} payment of ${amount} is pending and overdue by ${overdueDays} ${overdueDays === 1 ? "day" : "days"}. Please pay it. Due since ${dateLabel}.`
    await createOnce(userId, title, body)
  }
}

export async function syncMonthlySummaryNotification(userId: string, now = new Date()) {
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const { start, end } = monthRange(previous)
  const label = previous.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
  const title = `${label} spending summary ready`

  const [expenses, incomes] = await Promise.all([
    prisma.expense.findMany({ where: { userId, date: { gte: start, lt: end } } }),
    prisma.income.findMany({ where: { userId, date: { gte: start, lt: end } } }),
  ])

  if (!expenses.length && !incomes.length) return

  const spent = expenses.reduce((sum, item) => sum + Number(item.amount), 0)
  const income = incomes.reduce((sum, item) => sum + Number(item.amount), 0)
  await createOnce(userId, title, `Your ${label} spending summary is ready. You spent ${money(spent)} and recorded ${money(income)} income.`)
}

export async function syncUnusualSpendingNotifications(userId: string, now = new Date()) {
  const current = monthRange(now)
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const previous = monthRange(prevDate)

  const [currentExpenses, previousExpenses] = await Promise.all([
    prisma.expense.findMany({ where: { userId, date: { gte: current.start, lt: current.end } } }),
    prisma.expense.findMany({ where: { userId, date: { gte: previous.start, lt: previous.end } } }),
  ])

  const currentByCategory: Record<string, number> = {}
  const previousByCategory: Record<string, number> = {}

  currentExpenses.forEach((item) => {
    currentByCategory[item.category] = (currentByCategory[item.category] || 0) + Number(item.amount)
  })
  previousExpenses.forEach((item) => {
    previousByCategory[item.category] = (previousByCategory[item.category] || 0) + Number(item.amount)
  })

  for (const [category, currentAmount] of Object.entries(currentByCategory)) {
    const previousAmount = previousByCategory[category] || 0
    if (previousAmount < 500 || currentAmount < previousAmount * 1.35) continue

    const increase = Math.round(((currentAmount - previousAmount) / previousAmount) * 100)
    await createOnce(
      userId,
      `Unusual ${category} spending`,
      `Your ${category.toLowerCase()} spend is ${increase}% higher than last month.`,
      { since: current.start }
    )
  }
}

export async function syncLowBalanceNotification(userId: string, now = new Date()) {
  const { start, end } = monthRange(now)
  const [expenses, incomes] = await Promise.all([
    prisma.expense.findMany({ where: { userId, date: { gte: start, lt: end } } }),
    prisma.income.findMany({ where: { userId, date: { gte: start, lt: end } } }),
  ])

  const spent = expenses.reduce((sum, item) => sum + Number(item.amount), 0)
  const income = incomes.reduce((sum, item) => sum + Number(item.amount), 0)
  const remaining = income - spent
  if (income <= 0 || remaining <= 0 || remaining > income * 0.1) return

  const label = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
  await createOnce(
    userId,
    `Low remaining balance · ${label}`,
    `Only ${money(remaining)} remains from this month's income.`,
    { since: start }
  )
}

export async function syncBorrowLendNotifications(userId: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now)
  const year = Number(parts.find((part) => part.type === "year")?.value)
  const month = Number(parts.find((part) => part.type === "month")?.value)
  const day = Number(parts.find((part) => part.type === "day")?.value)
  const todayUtc = Date.UTC(year, month - 1, day)

  const records = await prisma.borrowLend.findMany({
    where: { userId, status: { not: "SETTLED" }, dueDate: { not: null } },
    include: { repayments: true },
  })

  for (const record of records) {
    if (!record.dueDate) continue
    const repaid = record.repayments.reduce((sum, item) => sum + Number(item.amount), 0)
    const remaining = Math.max(Number(record.amount) - repaid, 0)
    if (remaining <= 0) continue

    const due = new Date(record.dueDate)
    const dueUtc = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate())
    const diffDays = Math.round((dueUtc - todayUtc) / 86400000)
    if (diffDays > 1) continue

    const amount = money(remaining)
    const dateLabel = due.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
    let title = ""
    let body = ""

    if (record.type === "BORROWED") {
      if (diffDays === 1) {
        title = `Repayment due tomorrow · ${record.person}`
        body = `You need to repay ${amount} to ${record.person} tomorrow (${dateLabel}).`
      } else if (diffDays === 0) {
        title = `Repayment due today · ${record.person}`
        body = `You need to repay ${amount} to ${record.person} today. Payment is still pending.`
      } else {
        const days = Math.abs(diffDays)
        title = `Repayment pending · ${record.person} · ${days}d overdue`
        body = `${amount} owed to ${record.person} is overdue by ${days} ${days === 1 ? "day" : "days"}. Please repay it. Due since ${dateLabel}.`
      }
    } else {
      if (diffDays === 1) {
        title = `Money expected tomorrow · ${record.person}`
        body = `${amount} lent to ${record.person} is expected tomorrow (${dateLabel}).`
      } else if (diffDays === 0) {
        title = `Money expected today · ${record.person}`
        body = `${amount} from ${record.person} is expected today and is still pending.`
      } else {
        const days = Math.abs(diffDays)
        title = `Money still pending · ${record.person} · ${days}d overdue`
        body = `${amount} from ${record.person} is overdue by ${days} ${days === 1 ? "day" : "days"}. Due since ${dateLabel}.`
      }
    }

    const exists = await prisma.notification.findFirst({ where: { userId, title, body } })
    if (!exists) await prisma.notification.create({ data: { userId, title, body } })
  }
}

export async function syncAllNotifications(userId: string) {
  await syncBudgetNotifications(userId)
  await syncRecurringReminders(userId)
  await syncMonthlySummaryNotification(userId)
  await syncUnusualSpendingNotifications(userId)
  await syncLowBalanceNotification(userId)
  await syncBorrowLendNotifications(userId)
}
