# Cloudflare R2 task media setup

The code is implemented, but it will return `R2 credentials are not
configured` until these infrastructure and deployment steps are completed.

## 1. Create the private bucket

In Cloudflare Dashboard, open **Storage & databases → R2 → Create bucket**.

- Bucket name: `cstle-task-media`
- Storage class: Standard
- Public access: disabled

## 2. Create bucket-scoped S3 credentials

From the R2 overview, open **Manage R2 API Tokens** and create a token with
**Object Read & Write** access restricted to `cstle-task-media`. Copy the
Account ID, Access Key ID, and Secret Access Key when shown. Never put these
values in a `VITE_` variable, browser code, or the repository.

## 3. Configure browser upload CORS

Add this policy under the bucket's CORS settings. Replace/add the exact live
web-app origin before production deployment.

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:5173",
      "https://admin.cstlelivn.ca"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

## 4. Add Supabase Edge Function secrets

In Supabase Dashboard, open **Project Settings → Edge Functions → Secrets**
and add:

```text
R2_ACCOUNT_ID=<Cloudflare account ID>
R2_ACCESS_KEY_ID=<bucket-scoped access key ID>
R2_SECRET_ACCESS_KEY=<bucket-scoped secret access key>
R2_BUCKET_NAME=cstle-task-media
```

## 5. Deploy in this order

1. Deploy Edge Function `make-server-bcab437c` from
   `supabase/functions/make-server-bcab437c`.
2. Deploy the Vite frontend.
3. Sign in as an assigned onsite worker and upload one small photo on a task.
4. Confirm the photo appears in R2 under `projects/<project id>/tasks/...`.
5. Confirm a user who cannot access that task cannot list its media.
6. Test photo, video, audio, PDF, approval toggles, and deletion.

The Edge Function generates ten-minute signed PUT URLs for direct browser-to-R2
uploads and one-hour signed GET URLs for viewing. Only the object key is stored
in Postgres. Photos are optimized in the browser before upload: the longest
edge is reduced to at most 1920 pixels and WebP quality 0.78 is used only when
the result is smaller. Current server-enforced limits are 12 MB for photos,
50 MB for video, 20 MB for audio, and 25 MB for PDFs.

Video is not transcoded in the browser. Full video transcoding is expensive on
phone CPU/battery and unreliable on weak jobsite connections; a future in-app
camera flow should record at 720p instead of downloading a large FFmpeg/WASM
transcoder into every worker's browser.

## Free-tier guardrail

Before preparing every upload, the Edge Function totals the objects currently
stored in the bucket. It refuses the upload when the new total would exceed
8 GB (`R2_FREE_STORAGE_GUARD_BYTES`), leaving 2 GB of headroom below R2's
10 GB-month free storage allowance. The response code is
`R2_FREE_TIER_GUARD`, and the frontend displays the pause message to the user.

This guard protects storage volume. Cloudflare's included operation limits
(1 million Class A and 10 million Class B operations monthly) must still be
monitored in the dashboard, although those limits are much higher than the
expected internal-team workload.
