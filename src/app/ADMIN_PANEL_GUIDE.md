# 📊 Admin Panel Guide - CRM Module

## 🎯 Overview

Your admin panel now reads from `public.leads` table and separates Contact Form and Booking submissions into dedicated tabs.

---

## 📑 Tab Structure

```
┌─────────────────────────────────────────────────────────────┐
│  CRM MODULE                                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┬───────────────┬──────────────┬─────────────┐  │
│  │All Leads │ Contact Form  │ Book Service │  Clients    │  │
│  │  (45)    │     (12)      │     (33)     │    (28)     │  │
│  └──────────┴───────────────┴──────────────┴─────────────┘  │
│                                                              │
│  Currently showing: All Leads                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Name     Status  Value  Source      Contact   Actions  │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │ John Doe  New    $25k   Contact...  john@...  [Call]  │ │
│  │ Jane...   New    $40k   Book Se...  jane@...  [Call]  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 Data Flow

### Website Form → Admin Panel

```
Website Contact Form                    Admin Panel
┌─────────────────────┐                ┌──────────────────┐
│ Name: John Doe      │                │ TAB: Contact Form│
│ Email: john@...     │   Supabase     │                  │
│ Phone: 555-1234     │─────REST──────▶│ • John Doe       │
│ Message: "I need    │   Realtime     │   john@...       │
│  finishing work"    │◀────WS─────────│   "I need..."    │
└─────────────────────┘                └──────────────────┘

Website Booking Form                    Admin Panel
┌─────────────────────┐                ┌──────────────────┐
│ Name: Jane Smith    │                │ TAB: Book Service│
│ Email: jane@...     │   Supabase     │                  │
│ Address: 123 Main   │─────REST──────▶│ • Jane Smith     │
│ Service: Painting   │   Realtime     │   jane@...       │
│ Date: June 15       │◀────WS─────────│   123 Main St    │
│ Details: "3 rooms"  │                │   Painting       │
└─────────────────────┘                └──────────────────┘
```

---

## 📋 Field Mapping

### Contact Form Submissions
```
Database Field         Display Location
─────────────────────  ──────────────────────────────
source_form = 'contact'  → Filters to Contact Form tab
first_name              → Name field (combined)
last_name               → Name field (combined)
name                    → Main identifier
email                   → Contact section
phone                   → Contact section
message                 → Lead Details Dialog (prominent)
notes                   → Admin internal notes
status                  → Badge (New/Contacted/etc)
created_at              → Date Added
```

### Booking Form Submissions
```
Database Field         Display Location
─────────────────────  ──────────────────────────────
source_form = 'booking'  → Filters to Book Service tab
first_name              → Name field (combined)
last_name               → Name field (combined)
name                    → Main identifier
email                   → Contact section
phone                   → Contact section
project_address         → Lead Details Dialog (prominent)
consultation_date       → Lead Details Dialog
service_type            → Service/Project Type field
project_details         → Lead Details Dialog (prominent)
links                   → Rendered as clickable URLs
notes                   → Admin internal notes
status                  → Badge (New/Contacted/etc)
created_at              → Date Added
```

---

## 🎨 UI Components

### List View (Default)
```
┌────────────────────────────────────────────────────────┐
│ Name       Status    Value   Source          Contact   │
├────────────────────────────────────────────────────────┤
│ John Doe   [New]     $25k    Contact Form    john@...  │
│ │                                            [Call] [View]│
│ └──[Delete]──(hover to show)                           │
└────────────────────────────────────────────────────────┘
```

### Grid View (Toggle)
```
┌──────────────────────┐  ┌──────────────────────┐
│ John Doe      $25k   │  │ Jane Smith    $40k   │
│ [New]                │  │ [Contacted]          │
│                      │  │                      │
│ 📧 john@example.com  │  │ 📧 jane@example.com  │
│ 📞 555-1234          │  │ 📞 555-5678          │
│ 🏷️  Contact Form     │  │ 🏷️  Book Service     │
│                      │  │                      │
│ [Call] [Email] [...]  │  │ [Call] [Email] [...]  │
└──────────────────────┘  └──────────────────────┘
```

### Lead Details Dialog
```
┌─────────────────────────────────────────────┐
│ Lead Details                          [×]   │
├─────────────────────────────────────────────┤
│                                             │
│ 👤 Contact Information                      │
│ ┌─────────────────────────────────────────┐ │
│ │ Name: John Doe                          │ │
│ │ Email: john@example.com                 │ │
│ │ Phone: 555-1234                         │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ 📋 Project Information                      │
│ ┌─────────────────────────────────────────┐ │
│ │ Source: Website - Contact Form          │ │
│ │ Message: "I would like to inquire       │ │
│ │          about your finishing services."│ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ 📝 Admin Notes                              │
│ ┌─────────────────────────────────────────┐ │
│ │ [Internal notes field]                  │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ 📊 Status: [New ▼]                          │
│                                             │
│ [Convert to Client]  [Save]  [Delete]      │
└─────────────────────────────────────────────┘
```

---

## 🔄 Real-time Updates

### What Updates Automatically?

✅ **New leads** - Appear instantly when website form is submitted
✅ **Status changes** - When you update a lead status
✅ **Deletions** - Lead removed from all admin sessions
✅ **Conversions** - Lead moved to Clients tab
✅ **Tab counts** - Badge numbers update live
✅ **Pipeline stats** - Dashboard numbers refresh

### How it Works

```
Browser 1                 Supabase                Browser 2
┌─────────┐              ┌─────────┐             ┌─────────┐
│ Admin   │              │Database │             │ Admin   │
│ Panel   │              │         │             │ Panel   │
│         │              │         │             │         │
│ Updates │─────POST────▶│  leads  │             │         │
│ Lead    │              │  table  │────WS──────▶│ Auto    │
│         │              │         │             │ Refresh │
└─────────┘              └─────────┘             └─────────┘
          Both see changes immediately via WebSocket
```

---

## 🎯 Use Cases

### 1. Contact Form Submission
```
1. User fills out contact form on website
2. Form POSTs to: /rest/v1/leads with source_form='contact'
3. Lead appears in "Contact Form" tab instantly
4. Admin clicks lead → sees message
5. Admin calls/emails customer
6. Admin updates status to "Contacted"
7. All open admin panels see status update
```

### 2. Booking Service Submission
```
1. User books service on website
2. Form POSTs to: /rest/v1/leads with source_form='booking'
3. Lead appears in "Book Service" tab instantly
4. Admin clicks lead → sees project details, address, date
5. Admin schedules consultation
6. Admin updates status to "Proposal"
7. Eventually converts to Client when deal closes
```

### 3. Lead Management
```
1. View all leads in "All Leads" tab
2. Filter by source using tabs
3. Search by name, email, or project type
4. Sort by date, status, or value
5. Click lead to see full details
6. Update status or add notes
7. Convert to client when deal closes
8. Lead moves to Clients tab
```

---

## 📊 Tab Filtering Logic

```javascript
// All Leads tab - shows everything
leads.filter(lead => true) // No filter

// Contact Form tab
leads.filter(lead => lead.source === "Website - Contact Form")

// Book Service tab  
leads.filter(lead => lead.source === "Website - Book Service")

// Clients tab - separate table
clients.filter(client => true) // Different data source
```

---

## 🔧 Customization Options

### Change Tab Labels
Edit `/components/CRMModule.tsx`:
```jsx
<TabsTrigger value="contact-form">
  📨 Contact Inquiries ({count})
</TabsTrigger>
```

### Add More Filters
Add to `leadsFilterConfig`:
```javascript
{
  type: "select",
  field: "service_type",
  label: "Service Type",
  options: serviceTypes.map(t => ({ value: t, label: t }))
}
```

### Custom Status Colors
Edit `getStatusColor()` function:
```javascript
if (status === "Hot Lead") return "bg-orange-500 text-white";
```

---

## 🎉 Benefits

✅ **Automatic separation** - Contact vs Booking forms in separate tabs
✅ **All fields captured** - Every form field stored and displayed
✅ **Real-time sync** - No manual refresh needed
✅ **Clean UI** - Data-focused with progress bars and charts
✅ **Design system** - Uses your CSS variables for consistency
✅ **Scalable** - Easy to add more form types or fields

---

## 🚀 Next Steps

1. Run the SQL scripts from `/RUN_THIS_FIRST.md`
2. Hard refresh your admin panel
3. Verify all 4 tabs are visible
4. Test by inserting a lead via SQL
5. Configure your website forms to POST to:
   ```
   POST https://mlxsfhdzlcxtvqeshgjx.supabase.co/rest/v1/leads
   Headers:
     apikey: YOUR_ANON_KEY
     Authorization: Bearer YOUR_ANON_KEY
     Content-Type: application/json
   Body: { name, email, phone, source_form, ... }
   ```

**Enjoy your real-time admin panel!** 🎊
