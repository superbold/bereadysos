# BeReady SOS — Supabase email templates

Auth emails are sent by **Supabase** over **Resend SMTP**. The app does not call Resend directly.

Paste each template in **Supabase Dashboard → Authentication → Emails** (Confirm signup / Reset password). Use the **Source** tab if the visual editor is limited.

## Before you paste

1. **Site URL** (Authentication → URL Configuration): `https://bereadysos.com`
2. **Redirect URLs** must include `/api/auth/confirm`, `/api/auth/recover`, `/auth/reset-password`, and `/confirm` (plus localhost variants for dev).
3. Links use `token_hash` — **not** `{{ .ConfirmationURL }}` — so links work on phone / different browser.

## Files

| File | Supabase template |
|------|-------------------|
| `confirm-signup.html` | **Confirm signup** |
| `reset-password.html` | **Reset password** |

## Suggested subjects

| Template | Subject |
|----------|---------|
| Confirm signup | `Confirm your BeReady SOS account` |
| Reset password | `Reset your BeReady SOS password` |

## Brand reference (matches the site)

| Token | Value |
|-------|--------|
| Primary | `#00C16A` (green-500) |
| Primary hover | `#00A155` (green-600) |
| Text | `#0f172a` (slate-900) |
| Muted | `#64748b` (slate-500) |
| Background | `#f8fafc` (slate-50) |
| Card | `#ffffff` |
| Font | Public Sans, system UI fallbacks |

After pasting, send a test from Supabase or trigger sign-up / forgot-password in the app.
