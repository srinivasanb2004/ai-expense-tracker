# WalletIQ Notes — Phase 1

This build adds the first complete Notes experience to WalletIQ.

## Included

- New protected `/notes` workspace
- Notes shortcut in the desktop sidebar
- Notes shortcut in the mobile top bar
- Floating `+` create menu with **Note** and **Checklist**
- Text notes with title and content
- Checklists with add, check/uncheck, and remove item actions
- Automatic saving while editing
- Search across title, content, tags, and checklist items
- Pin / unpin notes
- Archive / restore notes
- Delete confirmation
- Tags
- Card colors
- Responsive card layout for mobile, tablet, and desktop
- Dark and light mode support using the existing WalletIQ theme
- User-scoped database records

## Required database step

The Prisma schema now contains `Note` and `NoteItem` models. After copying your normal environment variables into this project, run:

```bash
npx prisma generate
npx prisma db push
```

Then start the app normally:

```bash
npm run dev
```

For Vercel, make sure the existing `DATABASE_URL` and `DIRECT_URL` environment variables are present. The normal build script already runs `prisma generate`, but the database schema must be pushed before using Notes on the deployed app.

## Phase 2 (not included yet)

Phase 2 is intentionally left out until Phase 1 is tested. Planned ideas include AI organization and converting note content into WalletIQ actions such as Recurring Payments, Budgets, or Borrow & Lend records.
