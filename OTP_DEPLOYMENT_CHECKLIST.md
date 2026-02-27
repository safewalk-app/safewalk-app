# SafeWalk OTP - Deployment Checklist

## ✅ Status: READY FOR PRODUCTION

SafeWalk OTP authentication is fully implemented and ready to deploy. All components are in place:

### Client-Side (Mobile App) ✅
- [x] `phone-verification.tsx` - Phone input screen with validation
- [x] `otp-verification.tsx` - OTP code input screen with timer
- [x] `otp-service.ts` - Supabase Edge Functions client
- [x] `otp-guard.ts` - OTP state management
- [x] `OtpInput.tsx` - 6-digit input component
- [x] Integration in `new-session.tsx` - Blocking logic for unverified phones
- [x] Rate limiting, error handling, user feedback

### Server-Side (Supabase) ⏳ NEEDS DEPLOYMENT
- [x] `supabase/functions/send-otp/index.ts` - Send OTP via Twilio
- [x] `supabase/functions/verify-otp/index.ts` - Verify OTP code
- [x] Database migrations - `otp_verifications`, `otp_logs` tables
- [ ] **DEPLOY Edge Functions** (manual step required)
- [ ] **Configure Twilio credentials** (manual step required)

---

## 🚀 Deployment Steps

### Step 1: Authenticate with Supabase CLI

```bash
cd /home/ubuntu/safewalk-app

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref kycuteffcbqizyqlhczc
```

### Step 2: Set Twilio Credentials

```bash
# Get credentials from Twilio dashboard
# https://www.twilio.com/console

supabase secrets set TWILIO_ACCOUNT_SID=your_account_sid
supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token
supabase secrets set TWILIO_PHONE_NUMBER=+33939035429
```

### Step 3: Deploy Edge Functions

```bash
# Deploy send-otp function
supabase functions deploy send-otp

# Deploy verify-otp function
supabase functions deploy verify-otp

# View logs
supabase functions logs send-otp --tail
supabase functions logs verify-otp --tail
```

### Step 4: Run Database Migrations

```bash
# Push migrations to Supabase
supabase db push

# Verify tables were created
supabase db list
```

### Step 5: Test Edge Functions

```bash
# Test send-otp
curl -X POST \
  https://kycuteffcbqizyqlhczc.supabase.co/functions/v1/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+33763458273"}'

# Test verify-otp
curl -X POST \
  https://kycuteffcbqizyqlhczc.supabase.co/functions/v1/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+33763458273", "otpCode": "123456"}'
```

---

## 🔐 Security Checklist

Before deploying to production:

- [ ] Twilio credentials are stored as Supabase secrets (not in code)
- [ ] CORS is configured correctly for your app domain
- [ ] Rate limiting is enabled (max 5 requests/hour per IP)
- [ ] OTP expiration is set to 10 minutes
- [ ] Max 3 verification attempts before lockout
- [ ] Audit logs are enabled in `otp_logs` table
- [ ] Phone numbers are validated in E.164 format (+33...)
- [ ] SMS content does not contain sensitive data

---

## 📱 Testing in Development

### Test OTP Flow on Expo

1. **Start the app:**
   ```bash
   npm run dev
   ```

2. **Scan QR code with Expo Go**

3. **Navigate to "Je sors" screen**

4. **Click "Démarrer une sortie"**

5. **You should be redirected to phone verification** (if phone not verified)

6. **Enter your phone number:**
   - Format: +33 6 12 34 56 78
   - Or: 06 12 34 56 78 (auto-formats to +33)

7. **Click "Envoyer le code"**

8. **Wait for SMS** (if Twilio is configured)

9. **Enter the 6-digit code** in the OTP verification screen

10. **Click "Vérifier"**

11. **You should be redirected back to "Je sors"** and can now start a session

### Test Without Twilio (Mock Mode)

If Twilio is not configured, the Edge Functions will return mock OTP codes:

```
Test phone: +33763458273
Mock OTP code: 123456
```

Use these for testing without sending real SMS.

---

## 🐛 Troubleshooting

### "Edge Function not found" Error

**Solution:** Ensure functions are deployed:
```bash
supabase functions deploy send-otp
supabase functions deploy verify-otp
```

### "Twilio credentials missing" Error

**Solution:** Set Twilio secrets:
```bash
supabase secrets set TWILIO_ACCOUNT_SID=...
supabase secrets set TWILIO_AUTH_TOKEN=...
supabase secrets set TWILIO_PHONE_NUMBER=...
```

### "SMS not received" Error

**Solution:** Check:
1. Twilio account has credits
2. Phone number is valid (E.164 format)
3. Twilio number is verified for sending
4. Check Twilio logs for errors

### "OTP code expired" Error

**Solution:** OTP codes expire after 10 minutes. User must request a new code.

### "Too many attempts" Error

**Solution:** User has exceeded 3 verification attempts. Wait 10 minutes or request new OTP.

---

## 📊 Monitoring

### View OTP Logs

```sql
-- Check all OTP attempts
SELECT * FROM otp_logs ORDER BY created_at DESC LIMIT 100;

-- Check failed attempts
SELECT * FROM otp_logs WHERE action = 'verify_failed' ORDER BY created_at DESC;

-- Check rate limit violations
SELECT phone_number, COUNT(*) as attempts FROM otp_logs 
WHERE action = 'send' AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY phone_number
ORDER BY attempts DESC;
```

### View Verified Phones

```sql
-- Check verified phone numbers
SELECT phone_number, verified_at FROM otp_verifications 
WHERE verified_at IS NOT NULL
ORDER BY verified_at DESC;
```

---

## 🎯 Next Steps

1. **Deploy Edge Functions** - Follow steps 1-4 above
2. **Test OTP flow** - Use testing steps above
3. **Monitor logs** - Use SQL queries to monitor usage
4. **Adjust rate limits** - If needed, modify limits in Edge Functions
5. **Add Captcha** - Optional: Add reCAPTCHA after 3 failed attempts

---

## 📞 Support

For issues with:
- **Supabase:** https://supabase.com/docs
- **Twilio:** https://www.twilio.com/docs
- **SafeWalk:** Check OTP_IMPLEMENTATION.md

---

**Last Updated:** February 27, 2026  
**Status:** Ready for Production ✅
