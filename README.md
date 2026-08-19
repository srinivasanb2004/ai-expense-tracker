# Smart AI Expense Tracker

AI-powered personal finance tracker built with Next.js, Auth.js, Prisma, Supabase/PostgreSQL and Gemini.

## Core features

- Authentication and per-user financial data
- Expenses, income and category budgets
- Recurring payments with weekly/monthly/yearly schedules
- Mark recurring payment as paid to create an expense and advance the next due date
- Gemini receipt OCR and AI finance assistant
- Advanced analytics and date filters
- Dark/light theme persistence
- CSV export and clear-all-data controls
- Responsive mobile navigation

## Smart notifications

- Budget warning at 90% usage
- Budget exceeded alert
- Recurring payment due tomorrow / due today reminders
- Persistent overdue recurring-payment reminders with overdue day count until marked paid
- Receipt scan saved
- Income added
- Previous-month summary ready
- Unusual category spending (35%+ over previous month, with a minimum prior baseline)
- Low remaining balance when less than or equal to 10% of monthly income remains

Desktop notifications are available from the topbar bell. On mobile, notifications are available in Settings.

## Environment variables

Copy `.env.example` to `.env` and configure:

```env
DATABASE_URL="your-supabase-transaction-pooler-url"
AUTH_SECRET="your-auth-secret"
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-2.5-flash"
```

## Run locally

```bash
npm install
npm run db:generate
npm run dev
```

The Prisma schema already contains the recurring payment and notification models. If your existing Supabase database came from the current project schema, no new model is required for these features.


## Borrow & Lend Tracker
- Track money you borrowed and money you lent without treating loans as normal income/expenses.
- Due-today and overdue reminders with in-app notifications.
- Partial repayments, full settlement, optional expense creation for borrowed-money repayments, and person-wise history.
