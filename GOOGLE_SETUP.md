# 🔐 Google OAuth Setup Guide

This guide will help you set up Google OAuth for Gmail and Drive integration.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "Pocketknife")
5. Click "Create"

## Step 2: Enable Required APIs

1. Go to [APIs & Services > Library](https://console.cloud.google.com/apis/library)
2. Search for and enable these APIs:
   - **Gmail API**
   - **Google Drive API**

## Step 3: Configure OAuth Consent Screen

1. Go to [APIs & Services > OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. Select **External** (unless you have Google Workspace)
3. Click "Create"
4. Fill in the required fields:
   - **App name**: Pocketknife
   - **User support email**: Your email
   - **Developer contact**: Your email
5. Click "Save and Continue"
6. **Scopes**: Click "Add or Remove Scopes" and add:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/drive.file`
7. Click "Save and Continue"
8. **Test users**: Add your email address
9. Click "Save and Continue"

## Step 4: Create OAuth Credentials

1. Go to [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Click "Create Credentials" > "OAuth client ID"
3. Select **Web application**
4. Enter a name (e.g., "Pocketknife Web Client")
5. Add **Authorized JavaScript origins**:
   ```
   http://localhost:5173
   http://localhost:5000
   ```
6. Add **Authorized redirect URIs**:
   ```
   http://localhost:5000/api/auth/google/callback
   ```
7. Click "Create"
8. **Copy the Client ID and Client Secret** - you'll need these!

## Step 5: Update Your .env File

Edit `backend/.env` and add your credentials:

```env
GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
```

## Step 6: Restart the Backend

```powershell
cd backend
npm run dev
```

## Step 7: Connect Your Account

1. Open http://localhost:5173
2. Go to Email Agent tab
3. Click "Connect with Google"
4. Sign in with the email you added as a test user
5. Grant permissions
6. You're connected!

## Troubleshooting

### Error: "Missing required parameter: client_id"
- Your `GOOGLE_CLIENT_ID` is not set or empty in `.env`
- Make sure there are no extra spaces around the value

### Error: "redirect_uri_mismatch"
- The redirect URI in Google Console doesn't match
- Make sure it's exactly: `http://localhost:5000/api/auth/google/callback`

### Error: "Access blocked: This app's request is invalid"
- OAuth consent screen not configured
- Or you're not added as a test user

### Error: "This app isn't verified"
- This is normal for development
- Click "Advanced" > "Go to Pocketknife (unsafe)" to continue

## Quick Reference

| Setting | Value |
|---------|-------|
| Authorized JavaScript Origins | `http://localhost:5173`, `http://localhost:5000` |
| Authorized Redirect URI | `http://localhost:5000/api/auth/google/callback` |
| Required Scopes | Gmail (read/modify), Drive (file) |

## Need Help?

- [Google Cloud Console](https://console.cloud.google.com/)
- [OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)




