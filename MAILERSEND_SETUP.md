# MailerSend Setup Guide

## Current Status
✅ MailerSend integration is complete and working
⚠️ Sender domain verification required for production use

## Setup Steps Required

### 1. Verify Your Sender Domain
1. Go to [MailerSend Dashboard](https://app.mailersend.com/)
2. Navigate to **Domains** section
3. Add your domain (e.g., `yourdomain.com`)
4. Follow DNS verification steps:
   - Add TXT record for domain verification
   - Add DKIM records for email authentication
   - Add SPF record for sender verification

### 2. Update Environment Variables
Once domain is verified, update your `.env` file:

```env
# Use verified domain email
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Apparcus

# MailerSend API Key (already configured)
MAILERSEND_API_KEY=mlsn.56192d4acb8331b3653f1e5d763d521094a4adbed209ea83992db5591c6e365f
```

### 3. Trial Account Limitations
- Can only send to administrator's verified email
- Limited to 100 emails per month
- Upgrade to paid plan for production use

### 4. Testing
For testing purposes, you can:
1. Send emails to your verified admin email
2. Use the dev mode: `EMAIL_SERVICE=dev`
3. Use Ethereal for testing: `EMAIL_SERVICE=ethereal`

## Current Configuration
- **Provider**: MailerSend
- **API Key**: Configured ✅
- **Integration**: Complete ✅
- **Domain**: Needs verification ⚠️

## Alternative Testing Options
If you want to test immediately without domain verification:

```env
# Switch to Ethereal for testing
EMAIL_SERVICE=ethereal
```

Or for development logging:
```env
# Switch to dev mode (logs emails instead of sending)
EMAIL_SERVICE=dev
```
