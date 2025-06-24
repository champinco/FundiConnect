
# FundiConnect

---
**🛑 URGENT: How to Fix "Cannot find module" Errors (e.g., './447.js', './548.js') 🛑**
---

If your application fails to start and you see an error like `Error: Cannot find module './<some_number>.js'`, it means your Next.js build cache is out of sync. **This is not a bug in the application source code itself.** This is a common issue in development environments and does not indicate a regression in the app's functionality.

**To fix this, you must perform a clean rebuild from your terminal.** This process deletes the temporary build files (`.next` folder) and creates fresh ones.

**Here are the steps:**

1.  **Stop the server** (if it's running).

2.  **Delete the `.next` folder**:
    ```bash
    rm -rf .next
    ```
    *(On Windows, use `rd /s /q .next` in Command Prompt or `Remove-Item -Recurse -Force .next` in PowerShell).*

3.  **Rebuild the app**:
    ```bash
    npm run build
    ```
    *Check the output of this command for any new errors. If the build itself fails, address those first.*

4.  **Start the app again**:
    ```bash
    npm start
    ```

Following these steps should resolve the "Cannot find module" error.

---
**🚀 Final Deployment Steps 🚀**
---

Your app's code is now production-ready! Before you deploy it to the world, complete these two final steps to ensure your application is secure and configured correctly.

### **Step 1: Set Up Your Environment Variables**

Your Firebase API keys are secrets and should not be stored directly in the code. We've created a template file at `src/.env` to hold them. You now need to create a local environment file and populate it with your actual keys.

1.  **Create the local environment file:**
    In your project's root directory, create a new file named `.env.local`.

2.  **Copy and Paste the Content:**
    Copy the entire contents of the `src/.env` file and paste it into your new `.env.local` file.

3.  **Fill in Your Firebase Keys:**
    Replace the placeholder values (like `your_api_key_here`) in `.env.local` with your actual Firebase project's "Web app" configuration keys. You can find these in your Firebase project settings:
    *Project Settings* > *General* > *Your apps* > *Web app*.

    Your final `.env.local` file should look like this, but with your real keys:
    ```
    NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
    NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
    NEXT_PUBLIC_FIREBASE_APP_ID=1:...:web:...
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-...
    ```

### **Step 2: Deploy Security Rules**

We have created security rules to protect your Firestore database and Storage bucket. You must deploy them to Firebase.

1.  **Open your terminal** in the project's root directory.

2.  **Make sure you are logged into Firebase:**
    ```bash
    firebase login
    ```

3.  **Ensure you are using the correct project:**
    ```bash
    firebase use myfundi-10db8
    ```
    *(Replace `myfundi-10db8` with your project ID if it's different).*

4.  **Deploy the rules:**
    Run the following command to deploy *only* the Firestore and Storage rules:
    ```bash
    firebase deploy --only firestore,storage
    ```

---
**Congratulations!** Once you've completed these steps, your app is fully configured, secure, and ready to be published to your hosting provider (like Firebase App Hosting or Vercel).
---

---

## How to Fix Firebase Storage CORS Errors (File Upload Failures)

If you see a `CORS policy` error in your browser's developer console when trying to upload files (e.g., when posting a job), it means your Firebase Storage bucket needs to be configured to accept requests from your web app's domain.

This is a one-time setup. This project now includes a `cors.json` file with the necessary configuration.

**To fix this, run the following `gcloud` command in your terminal from the project's root directory:**

1.  **Open your terminal (like Command Prompt or PowerShell on Windows).**

2.  **Navigate to your project's root directory.** This is the main folder containing the `package.json` file. You can use the `cd` (change directory) command. For example: `cd path\to\your\project\folder`.

3.  **Make sure you are authenticated with Google Cloud:**
    ```bash
    gcloud auth login
    ```
    *A browser window will open for you to log in.*

4.  **Set your project context:**
    ```bash
    gcloud config set project myfundi-10db8
    ```

5.  **Apply the CORS configuration to your storage bucket.** Because you are now in the correct directory, the command will find `cors.json`:
    
    **Important Note on Bucket Name:** The correct bucket name format for this command is `gs://<your-project-id>.appspot.com`. Do not use other formats like `firebasestorage.app`.
    
    ```bash
    gcloud storage buckets update gs://myfundi-10db8.appspot.com --cors-file=cors.json
    ```

After running this command successfully, refresh your browser page and try uploading the file again. The error should be resolved. You may need to add your final production domain to the `cors.json` file later.
