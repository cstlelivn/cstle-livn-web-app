# 🌐 Website Forms → Admin Panel API Guide

## 📡 API Endpoints

Your website forms should POST to Supabase REST API to create leads.

### Base URL
```
https://mlxsfhdzlcxtvqeshgjx.supabase.co/rest/v1/leads
```

### Required Headers
```
apikey: YOUR_SUPABASE_ANON_KEY
Authorization: Bearer YOUR_SUPABASE_ANON_KEY
Content-Type: application/json
Prefer: return=representation
```

---

## 📝 Contact Form Submission

### Example HTML Form
```html
<form id="contactForm">
  <input name="firstName" placeholder="First Name" required>
  <input name="lastName" placeholder="Last Name" required>
  <input name="email" type="email" placeholder="Email" required>
  <input name="phone" type="tel" placeholder="Phone">
  <textarea name="message" placeholder="Your message" required></textarea>
  <button type="submit">Send Message</button>
</form>
```

### JavaScript Handler
```javascript
document.getElementById('contactForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = {
    source_form: 'contact', // Important: identifies as contact form
    first_name: formData.get('firstName'),
    last_name: formData.get('lastName'),
    name: `${formData.get('firstName')} ${formData.get('lastName')}`,
    email: formData.get('email'),
    phone: formData.get('phone'),
    message: formData.get('message'), // Main content field
    source: 'Website - Contact Form',
    status: 'New Lead',
    created_at: new Date().toISOString()
  };

  try {
    const response = await fetch(
      'https://mlxsfhdzlcxtvqeshgjx.supabase.co/rest/v1/leads',
      {
        method: 'POST',
        headers: {
          'apikey': 'YOUR_SUPABASE_ANON_KEY',
          'Authorization': 'Bearer YOUR_SUPABASE_ANON_KEY',
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(data)
      }
    );

    if (response.ok) {
      alert('Thank you! We will contact you soon.');
      e.target.reset();
    } else {
      throw new Error('Submission failed');
    }
  } catch (error) {
    alert('Something went wrong. Please try again.');
    console.error('Error:', error);
  }
});
```

### JSON Payload Example
```json
{
  "source_form": "contact",
  "first_name": "John",
  "last_name": "Doe",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "555-1234",
  "message": "I would like to inquire about your finishing services for my home renovation project.",
  "source": "Website - Contact Form",
  "status": "New Lead"
}
```

### What Admin Sees
```
TAB: Contact Form
┌────────────────────────────────────────┐
│ John Doe                               │
│ john@example.com                       │
│ Status: New Lead                       │
│                                        │
│ Message:                               │
│ "I would like to inquire about your    │
│  finishing services for my home        │
│  renovation project."                  │
│                                        │
│ [Call] [Email] [Update Status]        │
└────────────────────────────────────────┘
```

---

## 📅 Booking Form Submission

### Example HTML Form
```html
<form id="bookingForm">
  <input name="firstName" placeholder="First Name" required>
  <input name="lastName" placeholder="Last Name" required>
  <input name="email" type="email" placeholder="Email" required>
  <input name="phone" type="tel" placeholder="Phone" required>
  <input name="address" placeholder="Project Address" required>
  <input name="consultationDate" type="date" required>
  <select name="serviceType" required>
    <option value="">Select Service</option>
    <option value="Interior Painting">Interior Painting</option>
    <option value="Finishing Installation">Finishing Installation</option>
    <option value="Trim & Molding">Trim & Molding</option>
    <option value="Kitchen Renovation">Kitchen Renovation</option>
  </select>
  <textarea name="projectDetails" placeholder="Project Details"></textarea>
  <button type="submit">Book Consultation</button>
</form>
```

### JavaScript Handler
```javascript
document.getElementById('bookingForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = {
    source_form: 'booking', // Important: identifies as booking form
    first_name: formData.get('firstName'),
    last_name: formData.get('lastName'),
    name: `${formData.get('firstName')} ${formData.get('lastName')}`,
    email: formData.get('email'),
    phone: formData.get('phone'),
    project_address: formData.get('address'), // Specific to booking
    consultation_date: formData.get('consultationDate'), // Specific to booking
    service_type: formData.get('serviceType'), // Specific to booking
    project_details: formData.get('projectDetails'), // Main content field
    source: 'Website - Book Service',
    status: 'New Lead',
    created_at: new Date().toISOString()
  };

  try {
    const response = await fetch(
      'https://mlxsfhdzlcxtvqeshgjx.supabase.co/rest/v1/leads',
      {
        method: 'POST',
        headers: {
          'apikey': 'YOUR_SUPABASE_ANON_KEY',
          'Authorization': 'Bearer YOUR_SUPABASE_ANON_KEY',
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(data)
      }
    );

    if (response.ok) {
      alert('Booking confirmed! We will contact you to schedule your consultation.');
      e.target.reset();
    } else {
      throw new Error('Booking failed');
    }
  } catch (error) {
    alert('Something went wrong. Please try again.');
    console.error('Error:', error);
  }
});
```

### JSON Payload Example
```json
{
  "source_form": "booking",
  "first_name": "Jane",
  "last_name": "Smith",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "555-5678",
  "project_address": "123 Main St, Seattle, WA 98101",
  "consultation_date": "2025-11-15T00:00:00.000Z",
  "service_type": "Interior Painting",
  "project_details": "Need painting for 3 bedrooms, 2 bathrooms, and hallway. Approximately 2000 sq ft.",
  "source": "Website - Book Service",
  "status": "New Lead"
}
```

### What Admin Sees
```
TAB: Book Service
┌────────────────────────────────────────┐
│ Jane Smith                             │
│ jane@example.com • 555-5678            │
│ Status: New Lead                       │
│                                        │
│ 📍 Project Address:                    │
│    123 Main St, Seattle, WA 98101      │
│                                        │
│ 📅 Consultation: Nov 15, 2025          │
│                                        │
│ 🛠️  Service: Interior Painting         │
│                                        │
│ 📋 Project Details:                    │
│    "Need painting for 3 bedrooms,      │
│     2 bathrooms, and hallway.          │
│     Approximately 2000 sq ft."         │
│                                        │
│ [Call] [Email] [Schedule] [Convert]   │
└────────────────────────────────────────┘
```

---

## 🔍 Field Reference

### Required Fields (Both Forms)
| Field | Type | Description |
|-------|------|-------------|
| `source_form` | string | `'contact'` or `'booking'` - determines tab |
| `name` | string | Full name (or combine first + last) |
| `email` | string | Email address |
| `source` | string | `'Website - Contact Form'` or `'Website - Book Service'` |
| `status` | string | Usually `'New Lead'` |

### Contact Form Specific
| Field | Type | Description |
|-------|------|-------------|
| `first_name` | string | Optional but recommended |
| `last_name` | string | Optional but recommended |
| `phone` | string | Optional |
| `message` | text | Main message content |

### Booking Form Specific
| Field | Type | Description |
|-------|------|-------------|
| `first_name` | string | Required for personalization |
| `last_name` | string | Required for personalization |
| `phone` | string | Required for booking |
| `project_address` | string | Where the work will be done |
| `consultation_date` | timestamp | Preferred consultation date |
| `service_type` | string | Type of service requested |
| `project_details` | text | Description of the project |
| `links` | string | Optional: portfolio links, inspiration images |

### Optional Fields (Both Forms)
| Field | Type | Description |
|-------|------|-------------|
| `company` | string | If B2B lead |
| `notes` | text | Admin-only internal notes |
| `last_contact` | timestamp | Automatically set to now |

---

## 🔐 Security Notes

### ⚠️ Important
- Use `SUPABASE_ANON_KEY` (not SERVICE_ROLE_KEY) in website forms
- This is safe to expose on the frontend
- RLS policies control what users can do
- Never include sensitive API keys in client-side code

### Row Level Security (RLS)
Your RLS policies should allow:
```sql
-- Allow anyone to insert leads (website forms)
CREATE POLICY "Anyone can insert leads" ON public.leads
  FOR INSERT WITH CHECK (true);

-- Only authenticated users can read/update/delete
CREATE POLICY "Authenticated users can read leads" ON public.leads
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update leads" ON public.leads
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete leads" ON public.leads
  FOR DELETE USING (auth.role() = 'authenticated');
```

---

## 🧪 Testing

### Test with cURL
```bash
# Contact Form
curl -X POST 'https://mlxsfhdzlcxtvqeshgjx.supabase.co/rest/v1/leads' \
  -H 'apikey: YOUR_SUPABASE_ANON_KEY' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -H 'Prefer: return=representation' \
  -d '{
    "source_form": "contact",
    "name": "Test User",
    "email": "test@example.com",
    "phone": "555-0000",
    "message": "This is a test message",
    "source": "Website - Contact Form",
    "status": "New Lead"
  }'

# Booking Form
curl -X POST 'https://mlxsfhdzlcxtvqeshgjx.supabase.co/rest/v1/leads' \
  -H 'apikey: YOUR_SUPABASE_ANON_KEY' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -H 'Prefer: return=representation' \
  -d '{
    "source_form": "booking",
    "name": "Test Booking",
    "email": "booking@example.com",
    "phone": "555-1111",
    "project_address": "123 Test St",
    "consultation_date": "2025-12-01",
    "service_type": "Interior Painting",
    "project_details": "Test booking details",
    "source": "Website - Book Service",
    "status": "New Lead"
  }'
```

### Test with Postman
1. Create new POST request
2. URL: `https://mlxsfhdzlcxtvqeshgjx.supabase.co/rest/v1/leads`
3. Headers:
   - `apikey`: Your Supabase anon key
   - `Authorization`: Bearer YOUR_ANON_KEY
   - `Content-Type`: application/json
   - `Prefer`: return=representation
4. Body (raw JSON): Use examples above
5. Send request
6. Check admin panel - lead should appear instantly!

---

## ✅ Verification Checklist

After implementing website forms:

- [ ] Forms POST to correct Supabase endpoint
- [ ] Headers include apikey and Authorization
- [ ] `source_form` field is set correctly
- [ ] Contact form leads appear in "Contact Form" tab
- [ ] Booking leads appear in "Book Service" tab
- [ ] All fields are captured and visible in admin
- [ ] Leads appear instantly (real-time)
- [ ] Status can be updated by admin
- [ ] Leads can be converted to clients

---

## 🚀 Go Live

1. Replace `YOUR_SUPABASE_ANON_KEY` with your actual key from Supabase dashboard
2. Test forms on staging environment
3. Verify leads appear in admin panel correctly
4. Monitor Supabase logs for any errors
5. Deploy to production

**Your website forms are now connected to your admin panel with real-time updates!** 🎉
