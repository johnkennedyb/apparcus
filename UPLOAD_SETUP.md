# Upload Configuration for Production

## Current Issue
Profile images are not persisting in production due to ephemeral filesystem storage.

## Environment Variables Needed

Add these to your production environment (Render, Heroku, etc.):

```bash
# Base URL for file serving (should match your production domain)
API_BASE_URL=https://your-production-domain.com
# OR
BACKEND_URL=https://your-production-domain.com

# Example for Render:
API_BASE_URL=https://apparcus.onrender.com
```

## Temporary Solution Applied
- Updated URL generation to use environment variables
- Fallback to dynamic host detection if env vars not set
- Improved CORS headers for static file serving

## Long-term Solution Needed
For persistent file storage in production, consider:

1. **AWS S3** - Most popular, reliable cloud storage
2. **Google Cloud Storage** - Good integration with other Google services
3. **Azure Blob Storage** - If using Microsoft ecosystem
4. **Local Database Storage** - Store files as base64 in MongoDB (for smaller files)

## Files Modified
- `backend/routes/upload.js` - Updated URL generation
- `backend/server.js` - Already configured for static file serving

## Next Steps
1. Set the `API_BASE_URL` environment variable in production
2. Consider implementing cloud storage for permanent solution
3. Test file uploads after setting environment variables
