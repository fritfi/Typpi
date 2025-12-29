# Firebase Setup Guide for Typi

This guide will walk you through setting up Firebase and Google Sign-In for your Typi application.

## Prerequisites

- A Google account
- The Typi application running locally (or deployed)

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** (or **"Create a project"** if this is your first project)
3. Enter a project name (e.g., "Typi" or "Typi Study Notes")
4. (Optional) Disable Google Analytics if you don't need it, or configure it
5. Click **"Create project"** and wait for it to be created
6. Click **"Continue"** when ready

## Step 2: Register Your Web App

1. In your Firebase project, click the **web icon** (`</>`) to add a web app
2. Enter an app nickname (e.g., "Typi Web App")
3. **Do NOT** check "Also set up Firebase Hosting" (unless you plan to use it)
4. Click **"Register app"**
5. You'll see your Firebase configuration - **keep this page open**, you'll need it in Step 5

## Step 3: Enable Google Authentication

1. In the Firebase Console, click **"Authentication"** in the left sidebar
2. Click **"Get started"** (if this is your first time)
3. Click the **"Sign-in method"** tab
4. Find **"Google"** in the list of providers
5. Click on **"Google"** to expand it
6. Toggle the **"Enable"** switch to ON
7. Select a **"Project support email"** (your email address)
8. Click **"Save"**

## Step 4: Configure Authorized Domains

Firebase automatically authorizes `localhost` for local development. If you deploy your app, you'll need to add your domain:

1. In the **Authentication** section, go to the **"Settings"** tab
2. Scroll down to **"Authorized domains"**
3. Click **"Add domain"** and enter your production domain (e.g., `typpi.example.com`)
4. Click **"Add"**

> **Note:** For local development, `localhost` is already authorized by default.

## Step 5: Enable Firestore Database

1. In the Firebase Console, click **"Firestore Database"** in the left sidebar
2. Click **"Create database"**
3. Choose **"Start in production mode"** (we'll add security rules next)
4. Select a Firestore location (choose one closest to your users)
5. Click **"Enable"**

### Set Up Security Rules

1. In Firestore, click the **"Rules"** tab
2. Replace the default rules with the following:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own documents
    match /users/{userId}/documents/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Click **"Publish"**

> **Important:** These rules ensure that users can only access their own documents.

## Step 6: Add Firebase Configuration to Your App

1. Go back to **Project Settings** (click the gear icon ⚙️ next to "Project Overview")
2. Scroll down to **"Your apps"** section
3. You should see your web app - click on it to expand the configuration
4. Copy the Firebase configuration object (it looks like this):

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

### Option A: Add Configuration Directly to Code (Recommended for Production)

1. Open `script.js` in your code editor
2. Find the `DEFAULT_FIREBASE_CONFIG` object (around line 56)
3. Replace the empty values with your Firebase configuration:

```javascript
const DEFAULT_FIREBASE_CONFIG = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

4. Save the file
5. Reload your application

### Option B: Add Configuration via Browser (For Testing)

1. Open your Typi application in a browser
2. Click the **"Sign in with Google"** button
3. When prompted, paste your entire Firebase configuration JSON
4. Click OK - the app will reload with the configuration saved

> **Note:** Option B stores the configuration in localStorage, which is convenient for testing but won't persist if you clear browser data.

## Step 7: Test Google Sign-In

1. Open your Typi application
2. Click the **"Sign in with Google"** button
3. Select your Google account
4. Grant permissions when prompted
5. You should see your profile picture and name in the top-right corner
6. The sync status should show **"Synced ✓"**

## Step 8: Test Cloud Synchronization

1. While signed in, create a new document by pasting some text and clicking **"Start Practice"**
2. Type a few characters to make progress
3. Open the Firebase Console and go to **Firestore Database**
4. Navigate to: `users > [your-user-id] > documents`
5. You should see your document stored in Firestore
6. Try signing in from a different browser or device - your documents should sync automatically!

## Troubleshooting

### "Firebase not configured" Error

- Make sure you've added your Firebase configuration to `script.js` or via the browser prompt
- Check that all configuration values are filled in (no empty strings)
- Reload the page after adding the configuration

### Sign-In Popup Blocked

- Check if your browser is blocking popups
- Allow popups for your application's domain
- Try again

### "Unauthorized domain" Error

- Go to Firebase Console > Authentication > Settings > Authorized domains
- Add your domain (e.g., `localhost` for local development)
- Wait a few minutes for changes to propagate

### Documents Not Syncing

- Check the browser console for errors
- Verify Firestore security rules are set correctly
- Make sure you're signed in (check for profile picture in top-right)
- Check your internet connection

### "Permission denied" in Firestore

- Verify your Firestore security rules match the ones in Step 5
- Make sure you're signed in with a Google account
- Check that the user ID in Firestore matches your authenticated user ID

## Security Considerations

### API Key Security

The Firebase API key in your configuration is **safe to expose in client-side code**. Firebase uses security rules to protect your data, not the API key. However:

- **Do** set up proper Firestore security rules (as shown in Step 5)
- **Do** configure authorized domains in Firebase Console
- **Don't** commit sensitive data to your Firestore database

### Firestore Security Rules

The security rules we set up ensure that:
- Users must be authenticated to access any data
- Users can only read/write their own documents
- No user can access another user's documents

### Production Deployment

When deploying to production:
1. Add your production domain to authorized domains in Firebase Console
2. Consider using environment variables for Firebase config (if using a build process)
3. Monitor usage in Firebase Console to stay within free tier limits

## Firebase Free Tier Limits

Firebase offers a generous free tier:
- **Authentication:** Unlimited users
- **Firestore:** 1 GB storage, 50K reads/day, 20K writes/day
- **Bandwidth:** 10 GB/month

For a personal study notes app, these limits should be more than sufficient.

## Next Steps

Once Google Sign-In is working:
- Your notes will automatically sync across all your devices
- You can access your notes from any browser where you sign in
- Your progress in each document is saved and synced
- You can sign out and sign back in without losing data

## Support

If you encounter issues not covered in this guide:
1. Check the browser console for error messages
2. Review the [Firebase Documentation](https://firebase.google.com/docs)
3. Check the [Firebase Authentication Guide](https://firebase.google.com/docs/auth/web/google-signin)
4. Verify your Firestore security rules
