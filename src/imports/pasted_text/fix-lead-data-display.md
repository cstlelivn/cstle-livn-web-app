Fix the Cstle Livn Web App so website leads retain and display all submitted information consistently.

Do not redesign the app or change its aesthetics. Preserve the current CRM layout, typography, colors, cards, dialogs, navigation, and responsive behavior.

The website and web app share the same Supabase `leads` table. The objective is to ensure that every field submitted from the website is:

1. Stored in Supabase
2. Read by the web app
3. Displayed in the lead-details dialog
4. Included in notification emails
5. Included in lead exports

## Current problem

A website booking notification currently shows:

- Name
- Email
- Phone
- Service type
- Project address
- Preferred date
- Project details

However, it is missing or incorrectly handling:

- Province
- Preferred consultation time
- Correct source page
- Complete booking/contact-form identification
- Other available submitted fields

The CRM lead-details dialog also does not display all the information available in the Supabase lead record.

## Canonical Supabase fields

Use these exact shared fields in the `leads` table:

- `source_form` — `booking` or `contact`
- `source_page` — `/book` or `/contact`
- `first_name`
- `last_name`
- `name`
- `email`
- `phone`
- `project_address`
- `province`
- `service_type`
- `project_type`
- `consultation_date`
- `consultation_time`
- `project_details`
- `message`
- `links`
- `company`
- `status`
- `source`
- `created_at`
- `updated_at`
- `internal_notes`

Do not create database enums for service types or provinces. Store them as text.

Preserve both `service_type` and `project_type` for compatibility:

- Booking submissions should normally use `service_type`.
- Contact submissions may use `project_type`.
- When displaying a service, use `service_type || project_type`.
- Do not delete either column.

## Safe database migration

Inspect the existing live Supabase schema before making changes.

If any required fields are missing, create a separate, safe, idempotent SQL migration using `ADD COLUMN IF NOT EXISTS`.

The migration may add:

```sql
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS service_type text,
  ADD COLUMN IF NOT EXISTS project_type text,
  ADD COLUMN IF NOT EXISTS project_address text,
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS consultation_date timestamptz,
  ADD COLUMN IF NOT EXISTS consultation_time text,
  ADD COLUMN IF NOT EXISTS project_details text,
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS source_form text,
  ADD COLUMN IF NOT EXISTS source_page text,
  ADD COLUMN IF NOT EXISTS internal_notes text;
```

Do not drop, rename, overwrite, or clear existing columns or lead records.

## Lead data model

Update every Lead and LeadInput interface/type in the web app to support:

```ts
source_form?: string | null;
source_page?: string | null;
project_address?: string | null;
province?: string | null;
consultation_date?: string | null;
consultation_time?: string | null;
service_type?: string | null;
project_type?: string | null;
project_details?: string | null;
message?: string | null;
links?: string | null;
internal_notes?: string | null;
```

Ensure the Supabase lead query continues using `select('*')` or explicitly includes all these fields.

Do not discard fields while transforming Supabase records for the CRM interface.

## Lead-details dialog

Keep the existing dialog design.

Display all available customer-submitted information in logical sections.

### Contact Information

Show:

- Full name
- Email
- Phone
- Company, when provided

### Project Location

Show:

- Project address, when provided
- Province

If the address is empty, still show the province.

Do not display “Not provided” as the only prominent location if a province exists.

### Service Information

Show:

- Service type
- Preferred consultation date
- Preferred consultation time

Use:

```ts
lead.service_type || lead.project_type
```

Do not combine the selected date and time incorrectly.

If `consultation_date` contains midnight because the website stores the date separately, do not display `00:00` as the requested time. Only show the actual `consultation_time` value.

Format consultation time for customers and staff in 12-hour format:

- `08:00` → `8:00 AM`
- `14:30` → `2:30 PM`

### Customer Project Details

For booking forms, show:

```ts
lead.project_details
```

For contact forms, show:

```ts
lead.message
```

Do not place customer-submitted project details inside internal admin notes.

### Submission Information

Show:

- Form: Booking Request or Contact Form
- Source page
- Submission date and time
- Submitted links, when provided

Interpret:

- `source_form === "booking"` as “Booking Request”
- `source_form === "contact"` as “Contact Form”

Keep `internal_notes` private and visually separate from customer-submitted information.

## Editing leads

When a lead is edited in the CRM, preserve and allow updates to:

- Project address
- Province
- Service type
- Consultation date
- Consultation time
- Project details or message
- Internal notes

Do not accidentally overwrite customer project details with internal notes.

## Notification email

Search the complete Cstle Livn Web App project for:

- `New Booking Request`
- `New Lead Notification`
- `notifications/new-lead`
- `RESEND_API_KEY`
- `api.resend.com/emails`
- Any Supabase function or server route that sends lead emails

Update the actual notification sender used by this project.

The booking email must include:

### Personal Information

- Name
- Email
- Phone

### Project Information

- Service type
- Project address
- Province
- Preferred consultation date
- Preferred consultation time
- Complete project details

### Submission Information

- Form type
- Source page
- Submission date and time
- Lead ID, if available

Only show optional fields when they have values. Province should always be shown for new booking submissions if it exists.

Use the customer’s submitted `project_details` for booking emails. Do not substitute internal `notes`.

Include clickable email and phone links.

Escape all customer-provided content before inserting it into HTML email to prevent malformed or unsafe email markup.

Use a clear email subject:

```text
New Estimate Request: [Customer Name] — [Service Type]
```

Include a plain-text email version containing the same information as the HTML version.

## Important system boundary

The current email may be generated by the website project’s Supabase `notify-admin` database-webhook function rather than by the web app.

Determine which function actually produces the email headed “New Booking Request.”

If that sender does not exist inside the Cstle Livn Web App project:

1. Do not create a duplicate notification system.
2. Do not send two emails for one lead.
3. Complete the CRM data-model and display fixes in this project.
4. Clearly identify the exact external function that must be updated.
5. Provide the exact field mapping and replacement code required for that function.

There must be one notification email per new lead, not one email from the website and another from the web app.

## CSV export

Update lead CSV exports to include:

- Name
- Email
- Phone
- Status
- Source
- Source page
- Form type
- Province
- Project address
- Service type
- Consultation date
- Consultation time
- Project details or message
- Submitted date
- Internal notes

Escape commas, quotation marks, and line breaks correctly.

## Verification

Test with one booking lead containing:

- First name: Test
- Last name: Booking
- Email: a valid test email
- Phone: a valid test number
- Address: optional
- Province: British Columbia
- Service type: Interior Renovation
- Preferred date: a future date
- Preferred time: 2:30 PM
- Project details: Test booking with complete information

Confirm that:

1. The Supabase row contains every submitted value.
2. `source_form` is `booking`.
3. `source_page` is `/book`.
4. The CRM displays province.
5. The CRM displays `2:30 PM`, not `00:00`.
6. The CRM displays the complete project details.
7. The email contains all submitted information.
8. The email and CRM show the same values.
9. The CSV export contains the same values.
10. Exactly one notification email is sent.

When finished, report:

- Files changed
- Database fields added
- Whether a migration must be run
- Which function actually sends the email
- Whether that function belongs to this web app or the separate website project
- Deployment steps still required
- Results of the end-to-end test