// api/inquire.js  — Vercel serverless function
// Receives rental inquiry form data, saves to Supabase, emails dorfmansam@gmail.com

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

const NOTIFY_EMAIL = 'dorfmansam@gmail.com';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    item,
    first_name,
    last_name,
    phone,
    email,
    pickup_date,
    pickup_time,
    dropoff_date,
    dropoff_time,
    delivery,
    delivery_address,
    delivery_city,
    delivery_zip,
    use_case,
    submitted_at,
  } = req.body;

  // Basic server-side validation
  if (!item || !first_name || !last_name || !phone || !email) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  // 1️⃣  Save to Supabase
  const { error: dbError } = await supabase.from('rental_inquiries').insert([{
    item,
    first_name,
    last_name,
    phone,
    email,
    pickup_date:      pickup_date || null,
    pickup_time:      pickup_time || null,
    dropoff_date:     dropoff_date || null,
    dropoff_time:     dropoff_time || null,
    delivery:         !!delivery,
    delivery_address: delivery ? delivery_address : null,
    delivery_city:    delivery ? delivery_city    : null,
    delivery_zip:     delivery ? delivery_zip     : null,
    use_case:         use_case || null,
    submitted_at,
    status:           'new',
  }]);

  if (dbError) {
    console.error('Supabase insert error:', dbError);
    return res.status(500).json({ error: 'Failed to save inquiry. Please try again.' });
  }

  // 2️⃣  Send notification email via Resend
  const scheduleBlock = delivery
    ? `<tr><td style="padding:6px 0;color:#8a9bab;font-size:13px;">Delivery Address</td><td style="padding:6px 0;font-size:13px;">${delivery_address}, ${delivery_city} ${delivery_zip}</td></tr>`
    : `<tr><td style="padding:6px 0;color:#8a9bab;font-size:13px;">Pickup</td><td style="padding:6px 0;font-size:13px;">${pickup_date || '—'} at ${pickup_time || '—'}</td></tr>
       <tr><td style="padding:6px 0;color:#8a9bab;font-size:13px;">Drop-off</td><td style="padding:6px 0;font-size:13px;">${dropoff_date || '—'} at ${dropoff_time || '—'}</td></tr>`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#151a20;padding:24px 32px;">
            <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:0.04em;text-transform:uppercase;">
              Peak<span style="color:#f5600a;">Power</span> Rentals
            </span>
          </td>
        </tr>

        <!-- Alert bar -->
        <tr>
          <td style="background:#f5600a;padding:10px 32px;">
            <span style="color:#fff;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">
              ⚡ New Rental Inquiry
            </span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 24px;font-size:15px;color:#374151;">
              A new inquiry just came in. Here are the details:
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e7eb;">

              <tr><td style="padding:6px 0;color:#8a9bab;font-size:13px;width:140px;">Item</td><td style="padding:6px 0;font-size:13px;font-weight:600;color:#f5600a;">${item}</td></tr>
              <tr><td colspan="2" style="border-top:1px solid #f3f4f6;padding:0;"></td></tr>

              <tr><td style="padding:6px 0;color:#8a9bab;font-size:13px;">Name</td><td style="padding:6px 0;font-size:13px;">${first_name} ${last_name}</td></tr>
              <tr><td style="padding:6px 0;color:#8a9bab;font-size:13px;">Phone</td><td style="padding:6px 0;font-size:13px;"><a href="tel:${phone}" style="color:#151a20;">${phone}</a></td></tr>
              <tr><td style="padding:6px 0;color:#8a9bab;font-size:13px;">Email</td><td style="padding:6px 0;font-size:13px;"><a href="mailto:${email}" style="color:#f5600a;">${email}</a></td></tr>
              <tr><td colspan="2" style="border-top:1px solid #f3f4f6;padding:0;"></td></tr>

              ${scheduleBlock}
              <tr><td style="padding:6px 0;color:#8a9bab;font-size:13px;">Delivery?</td><td style="padding:6px 0;font-size:13px;">${delivery ? 'Yes' : 'No — self pickup/dropoff'}</td></tr>
              <tr><td colspan="2" style="border-top:1px solid #f3f4f6;padding:0;"></td></tr>

              <tr>
                <td style="padding:6px 0;color:#8a9bab;font-size:13px;vertical-align:top;">Use case</td>
                <td style="padding:6px 0;font-size:13px;">${use_case || '<em style="color:#9ca3af;">Not provided</em>'}</td>
              </tr>

            </table>

            <div style="margin-top:28px;text-align:center;">
              <a href="mailto:${email}?subject=Re: Your Peak Power Rentals inquiry"
                 style="display:inline-block;background:#f5600a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:4px;font-weight:700;font-size:14px;letter-spacing:0.06em;text-transform:uppercase;">
                Reply to ${first_name} →
              </a>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
              Peak Power Rentals · Boulder County, CO · Submitted ${new Date(submitted_at).toLocaleString('en-US', { timeZone: 'America/Denver' })} MT
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const { error: emailError } = await resend.emails.send({
    from:    'Peak Power Rentals <notifications@yourdomain.com>', // ← update once domain verified
    to:      NOTIFY_EMAIL,
    subject: `⚡ New Rental Inquiry — ${first_name} ${last_name} (${item})`,
    html,
  });

  if (emailError) {
    // Don't fail the request — inquiry is already saved. Just log.
    console.error('Resend email error:', emailError);
  }

  return res.status(200).json({ success: true });
}
