# WalletIQ Notes Phase 2 - Step 2

This step turns AI note suggestions into reviewed WalletIQ actions.

## Added
- Review & Create button for AI suggestions.
- Editable review form before creation.
- Recurring Payment creation through the existing `/api/recurring` API.
- Budget creation through the existing `/api/budgets` API.
- Borrow/Lend creation through the existing `/api/borrow-lend` API.
- Required-field validation before creation.
- Success state (`Added`) to prevent accidental repeat clicks for the same analyzed suggestion during the current note session.
- Mobile-friendly date inputs in review forms.

## Important behavior
- Nothing is created automatically by Gemini.
- The user must click Review & Create, inspect/edit the fields, and explicitly confirm creation.
- Budget suggestions are saved to WalletIQ's current-month budget because the existing Budget API is current-month based.
- Existing Recurring/Budget/Borrow-Lend APIs and notification behavior are reused.

## Test examples
Use a note such as:

Netflix ₹649 every month on 25th.
Need to repay Arun ₹2000 tomorrow.
Keep Food spending below ₹5000 this month.

Analyze the note, then test each suggestion separately.
