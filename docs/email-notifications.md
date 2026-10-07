# Progress-update emails (students)

Staff open the stage email from the Mail button (student list or Emails tab); a popup prefills the stage's email, they review/edit it and press Gửi. Moving a student to a later stage no longer opens the popup on its own (`OPEN_EMAIL_ON_STAGE_MOVE` in `StageSelect.tsx`). Sent via Resend, branded no-reply letterhead. Students only — travelers have no emails.

## Map

| Concern | File |
|---|---|
| 8 preset texts (GĐ1–GĐ7A/B), placeholder fields, Canada/NZ variants, US-only phases | `src/lib/notifications/templates.ts` |
| HTML/text rendering, progress bar, info card, footer, `{{var}}` filling | `src/lib/notifications/render.ts` |
| Server send: vars from the student, case code, logging | `src/lib/notifications/send.ts` |
| Resend / dev outbox / test-mode redirect / inline images | `src/lib/email/mailer.ts` |
| Popup (prefill, country & school selects, preview) | `src/features/notifications/ProgressEmailModal.tsx` |
| Undo queue (5 s delay, toast) mounted in `providers.tsx` | `src/features/notifications/SendQueue.tsx` |
| Country display names | `src/lib/countries.ts` |
| Brand images (logo, social icons) | `public/email/*.png` |
| API | `src/app/api/students/[id]/notifications`, `api/cron/interview-reminders`, `api/webhooks/resend`, `api/unsubscribe/[token]`, page `app/huy-nhan/[token]` |

## Reusable email library

The separate `/email-templates` dashboard page is a general-purpose library for staff to store, edit, preview and copy complete HTML emails into Gmail or Outlook. It does not send mail through Resend and does not replace the stage-progress email flow above.

- Mongo model: `src/models/EmailTemplate.ts`
- CRUD API: `src/app/api/email-templates`
- Dashboard UI: `src/features/email-templates/EmailTemplatesPage.tsx`
- Original HTML sources: `email-templates/*.html`
- On the first API read, `src/lib/email-templates/defaults.ts` imports the two original files and replaces their example data with editable placeholders.
- Supported preview fields are `{{tenHocSinh}}`, `{{tenPhuHuynh}}`, `{{maHoSo}}`, `{{tenTruong}}`, `{{quocGia}}`, `{{ngayTiepNhan}}`, and `{{ngayCapThu}}`. In the thank-you template, the service is rendered as `Hồ sơ du học {{quocGia}}` rather than being fixed to Mỹ.
- Structured composer: `practice-schedule` opens `ComposerDialog` (not the flat field form) when its HTML still has the `<!--ROWS-->` marker. Form → email logic (sessions sorted by date, weekday, auto week range, subject, preheader, warnings) lives in `src/lib/email-templates/composers.ts`; repeated rows, `<!--MEET-->` button and `<!--PREHEADER-->` are marker blocks in `email-templates/thong-bao-lich-luyen-tap-phong-van.html`. A copy edited so the markers are gone falls back to the flat form. The old 3-session copy (`{{ngayBuoi1}}`) is replaced on the next API read.
- Built-in templates can be edited but not deleted. User-created templates can be deleted.

## Library templates in the popup

Stages mapped in `STAGE_LIBRARY_KEY` (`src/lib/email-templates/stage-library.ts`) send the matching `/email-templates` library template instead of the built-in letter: GĐ1 → thank-you, GĐ3 → progress-preview, GĐ5 → interview-schedule. Popup preview and server send share `libraryValues()` (dates dd/mm/yyyy, interview time "10:30 sáng", country, case code), so they match. The text is edited in `/email-templates` (popup hides "Sửa nội dung" for these stages). Other stages still use `render.ts`. Data-URI images in library HTML are sent as inline attachments by `mailer.ts`.

## Single sources of truth

Each value has one home; the email reads it, never a copy.

- **Country** (`quocGia`) → `student.destinationCountry`. DB stores `USA`, `Canada`, `NewZealand`, `Germany`, `France`; API/UI use `USA`, `Canada`, `New Zealand`, `Germany`, `France`; `countryKey()` / `COUNTRY_LABELS` handle both.
- **School** (`truong`) → `student.preferredUniversities[0]`. The popup select reorders that list.
- **Email-only details** (parent, staff, key dates, interview) → `student.notifyInfo` (Mongo Map). Editable in Hồ sơ tab ("Thông tin gửi mail") and the popup; keys restricted to `NOTIFY_FIELDS`.
- **Company contact, offices, social links** → constants in `render.ts` (the user's HTML design is authoritative; there are no env vars for them).
- **Stage email text** → `StageTemplate.emailTemplate` in the DB, seeded from presets. Editing a preset in code does NOT change existing DBs: run `npx tsx scripts/refresh-email-templates.ts --yes` (overwrites stage templates, leaves students alone).

## Country rules

- Canada / NZ / Đức / Pháp: GĐ2 & GĐ3 use the variant text (LOA / Offer of Place / Zulassungsbescheid / Attestation) via `resolveTemplate()`; stage titles shown in emails swap "I-20" via `localizeStageTitle()`.
- Phases GĐ4–6 (interview) are US-only: `presetAppliesTo()` hides the popup/mail button, drops them from the progress bar, and the cron skips non-US students.
- Visa outcome stages (7A/7B) collapse into one "Kết quả visa" step until reached.

## Environment & gotchas

- Emails carry no unsubscribe link or `List-Unsubscribe` header (product decision: these are service updates families must receive). The `/huy-nhan/[token]` page and `notifyOptOut` flag still exist but nothing links to them.

- `.env.local`: `RESEND_API_KEY` (empty → mails are written to `.mail-outbox/*.html`), `MAIL_FROM`, `MAIL_TEST_RECIPIENT` (set → every mail goes there with `[TEST]` prefix), `APP_URL`, `CRON_SECRET`, `RESEND_WEBHOOK_SECRET`.
- Sender `onboarding@resend.dev` only delivers to the Resend account owner's address; real customers need a verified domain in Resend (planned: `no-reply@mail.catholicmta.edu.vn`).
- Images: `APP_URL` on `https://` → absolute `/email/*.png` URLs; otherwise attached inline (`cid:`), which Gmail shows as an attachment chip. Never use `data:` URIs (Gmail blocks them) or SVG.
- Font is `'Segoe UI',Helvetica,Arial` — Georgia renders Vietnamese diacritics detached on Windows. Text is NFC-normalised before rendering.
- Undo queue sends by wall-clock `sendAt`, outside React state updaters (an earlier version never sent / double-sent). Closing the tab within 5 s cancels the send.
- Mail for one student threads in Gmail (shared `References` header + `[MTA-YYYY-NNNN]` subject); deleting one message trashes the whole thread.
- Send test mail from a `npx tsx` script, not `curl` — Windows terminals mangle Vietnamese in curl bodies.
- Local DB: Docker container `thucsys-mongo` on 27017, `DATABASE_URL=mongodb://localhost:27017/thucsys`. Test students: Nguyễn Văn Test, Phan Minh Long (NZ), Trần Gia Hân (Canada); all emails point at the tester's inbox.
