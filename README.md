
# FundiConnect

---
**🚀 URGENT: Key Setup Steps to Run This App 🚀**
---

To run this application, you **must** configure your Firebase credentials and deploy the necessary security rules. Without these steps, the app will fail to start or function correctly, often with an `invalid-api-key` error.

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

### **Step 2: Restart Your Development Server**

**This is a critical step.** Next.js only loads the `.env.local` file when the server starts.

1.  **Stop the server** if it's currently running (usually with `Ctrl+C` in the terminal).
2.  **Restart the server** by running `npm run dev` again.

### **Step 3: Deploy Security Rules**

We have created security rules to protect your Firestore database and Storage bucket. You must deploy them to Firebase before the app can read or write data.

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
**Congratulations!** Once you've completed these steps, your app should be fully configured and ready to run.
---

---
**🛑 URGENT: How to Fix "Cannot find module" Errors (e.g., './447.js', './548.js') 🛑**
---

If your application fails to start and you see an error like `Error: Cannot find module './<some_number>.js'`, it means your Next.js build cache is out of sync. **This is not a bug in the application source code itself.** This is a common issue in development environments and does not indicate a regression in the app's functionality.

**To fix this, you must perform a clean rebuild from your terminal.** This process deletes the temporary build files (`.next` folder) and creates fresh ones. We've added a helper script to make this easy.

**Here are the steps:**

1.  **Stop the server** (if it's running).

2.  **Run the clean rebuild command from your terminal**:
    ```bash
    npm run rebuild
    ```
    *This command will automatically delete the `.next` folder and then run a fresh `npm run build`.*
    *Check the output of this command for any new errors. If the build itself fails, address those first.*

3.  **Start the app again**:
    ```bash
    npm start
    ```

Following these steps should resolve the "Cannot find module" error.

---
## How to Fix Firebase Storage CORS Errors (File Upload Failures)

If you see a `CORS policy` error in your browser's developer console when trying to upload files (e.g., when posting a job), it means your Firebase Storage bucket needs to be configured to accept requests from your web app's domain. **This is a server-side permission issue, not a bug in the client-side code.**

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
    
    > **⚠️ Important Note on Bucket Name:** The correct bucket name format for this command is `gs://<your-project-id>.appspot.com`. The Firebase SDKs are configured to use this specific address. Using other formats like `.firebasestorage.app` in the command or in your app's configuration will not work and will break file uploads.
    
    ```bash
    gcloud storage buckets update gs://myfundi-10db8.appspot.com --cors-file=cors.json
    ```

After running this command successfully, refresh your browser page and try uploading the file again. The error should be resolved. You may need to add your final production domain to the `cors.json` file later if you deploy to a new URL.
