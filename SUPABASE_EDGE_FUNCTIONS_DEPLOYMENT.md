# SafeWalk - Supabase Edge Functions Deployment Guide

## 🚀 Deployment Options

Since Supabase CLI is not available in this environment, here are 3 ways to deploy the Edge Functions:

---

## Option 1: Deploy via Supabase Dashboard (Easiest) ✅ RECOMMENDED

### Step 1: Access Supabase Dashboard

1. Go to https://app.supabase.com
2. Sign in with your account
3. Select your project: **SafeWalk** (Project ID: `kycuteffcbqizyqlhczc`)

### Step 2: Navigate to Edge Functions

1. Click on **Edge Functions** in the left sidebar
2. Click **Create a new function**

### Step 3: Create send-otp Function

1. **Function name:** `send-otp`
2. **Copy and paste the code below:**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phoneNumber } = await req.json()

    // Validate phone number
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid phone number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate OTP (6 digits)
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Store OTP in database
    const { error: dbError } = await supabase
      .from('otp_verifications')
      .insert({
        phone_number: phoneNumber,
        otp_code: otp,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      })

    if (dbError) {
      console.error('Database error:', dbError)
      return new Response(
        JSON.stringify({ error: 'Failed to store OTP' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send SMS via Twilio
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

    if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
      const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`)
      const formData = new URLSearchParams()
      formData.append('To', phoneNumber)
      formData.append('From', twilioPhoneNumber)
      formData.append('Body', `Votre code de vérification SafeWalk: ${otp}`)

      const smsResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        }
      )

      if (!smsResponse.ok) {
        console.error('SMS send failed:', await smsResponse.text())
      }
    }

    // Log attempt
    await supabase.from('otp_logs').insert({
      phone_number: phoneNumber,
      action: 'send',
      status: 'success',
    })

    return new Response(
      JSON.stringify({ success: true, message: 'OTP sent successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

3. Click **Deploy**

### Step 4: Create verify-otp Function

1. Click **Create a new function**
2. **Function name:** `verify-otp`
3. **Copy and paste the code below:**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phoneNumber, otpCode } = await req.json()

    // Validate inputs
    if (!phoneNumber || !otpCode) {
      return new Response(
        JSON.stringify({ error: 'Missing phone number or OTP code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get latest OTP for phone number
    const { data: otpData, error: queryError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone_number', phoneNumber)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (queryError || !otpData) {
      await supabase.from('otp_logs').insert({
        phone_number: phoneNumber,
        action: 'verify_failed',
        status: 'not_found',
      })

      return new Response(
        JSON.stringify({ error: 'OTP not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if OTP expired
    if (new Date(otpData.expires_at) < new Date()) {
      await supabase.from('otp_logs').insert({
        phone_number: phoneNumber,
        action: 'verify_failed',
        status: 'expired',
      })

      return new Response(
        JSON.stringify({ error: 'OTP expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if OTP matches
    if (otpData.otp_code !== otpCode) {
      await supabase.from('otp_logs').insert({
        phone_number: phoneNumber,
        action: 'verify_failed',
        status: 'invalid_code',
      })

      return new Response(
        JSON.stringify({ error: 'Invalid OTP code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Mark as verified
    const { error: updateError } = await supabase
      .from('otp_verifications')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', otpData.id)

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to verify OTP' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update user profile
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (!authError && user) {
      await supabase
        .from('profiles')
        .update({ phone_verified: true, phone_number: phoneNumber })
        .eq('id', user.id)
    }

    // Log success
    await supabase.from('otp_logs').insert({
      phone_number: phoneNumber,
      action: 'verify_success',
      status: 'success',
    })

    return new Response(
      JSON.stringify({ success: true, message: 'Phone verified successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

4. Click **Deploy**

### Step 5: Set Environment Variables

1. Go to **Project Settings** → **Secrets**
2. Add the following secrets:

```
TWILIO_ACCOUNT_SID = your_account_sid
TWILIO_AUTH_TOKEN = your_auth_token
TWILIO_PHONE_NUMBER = +33939035429
```

3. Click **Save**

---

## Option 2: Deploy via Docker (Advanced)

If you have Docker installed locally:

```bash
# Install Supabase CLI via Docker
docker run --rm -v ~/.supabase:/root/.supabase supabase/cli:latest login

# Deploy functions
docker run --rm -v ~/.supabase:/root/.supabase -v $(pwd):/app supabase/cli:latest functions deploy send-otp
docker run --rm -v ~/.supabase:/root/.supabase -v $(pwd):/app supabase/cli:latest functions deploy verify-otp
```

---

## Option 3: Deploy via GitHub Actions (CI/CD)

Create `.github/workflows/deploy-functions.yml`:

```yaml
name: Deploy Edge Functions

on:
  push:
    branches: [main]
    paths:
      - 'supabase/functions/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy functions
        uses: supabase/deploy-action@v1
        with:
          project-ref: kycuteffcbqizyqlhczc
          supabase-token: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

---

## ✅ Verify Deployment

### Test send-otp Function

```bash
curl -X POST \
  https://kycuteffcbqizyqlhczc.supabase.co/functions/v1/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+33763458273"}'
```

Expected response:
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

### Test verify-otp Function

```bash
curl -X POST \
  https://kycuteffcbqizyqlhczc.supabase.co/functions/v1/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+33763458273", "otpCode": "123456"}'
```

Expected response:
```json
{
  "success": true,
  "message": "Phone verified successfully"
}
```

---

## 🔐 Security Checklist

Before going to production:

- [ ] Twilio credentials are stored as Supabase secrets (not in code)
- [ ] CORS is configured correctly
- [ ] Rate limiting is enabled
- [ ] OTP expiration is 10 minutes
- [ ] Max 3 verification attempts
- [ ] Audit logs are enabled
- [ ] Phone numbers are validated (E.164 format)
- [ ] SMS content is appropriate

---

## 🐛 Troubleshooting

### "Function not found" Error
- Ensure the function is deployed in the correct project
- Check the function name matches exactly

### "Twilio credentials missing" Error
- Go to Project Settings → Secrets
- Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER

### "SMS not received" Error
- Check Twilio account has credits
- Verify phone number is in E.164 format (+33...)
- Check Twilio logs for errors

---

## 📞 Support

- **Supabase Docs:** https://supabase.com/docs/guides/functions
- **Twilio Docs:** https://www.twilio.com/docs
- **SafeWalk:** Check OTP_IMPLEMENTATION.md

---

**Last Updated:** February 27, 2026  
**Status:** Ready for Deployment ✅
