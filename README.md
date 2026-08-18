# Smart Expense Tracker

Full-stack personal finance tracker built with Next.js, Prisma/PostgreSQL, Auth.js and Gemini.

## Included
- Authentication and per-user data
- Expenses, income and budgets
- Gemini receipt OCR (merchant, total, date, tax, category)
- Gemini finance assistant
- Advanced analytics: spending trend, category donut, income vs expense, savings trend, highest-spend day, top merchants
- Date filters: this month, last month, last 3 months and custom range
- Monthly summary-ready notifications
- CSV export, light/dark mode and clear-all-data control
- Responsive mobile navigation

## Setup
1. `npm install`
2. Copy `.env.example` to `.env`
3. Add your Supabase transaction-pooler `DATABASE_URL`, `AUTH_SECRET`, and Gemini key
4. `npm run db:generate`
5. `npm run db:push` (only if your database schema is not already created)
6. `npm run dev`

If your schema was already pushed previously, you normally only need `npm run db:generate` after extracting this ZIP.
