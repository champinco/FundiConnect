
# FundiConnect

**IMPORTANT NOTE:** If you are seeing an error like `Error: Cannot find module './548.js'` or `Error: Cannot find module './447.js'` (or similar), please follow the instructions in the section below. This is a Next.js build cache issue and requires a manual fix in your terminal.

## How to Fix "Cannot find module" Errors (e.g., './548.js', './447.js')

If your application fails to start and you see an error like `Error: Cannot find module './<some_number>.js'`, it means your build cache is out of sync. This is a common issue with Next.js development and is **not a bug in the application source code itself**.

**To fix this, you must perform a clean rebuild from your terminal.** This process deletes the temporary build files and creates fresh ones.

Here are the steps:

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

## How to Fix Firebase Storage CORS Errors (File Upload Failures)

If you see a `CORS policy` error in your browser's developer console when trying to upload files (e.g., when posting a job), it means your Firebase Storage bucket needs to be configured to accept requests from your web app's domain.

This is a one-time setup. This project now includes a `cors.json` file with the necessary configuration.

**To fix this, run the following `gcloud` command in your terminal from the project's root directory:**

1.  **Make sure you are authenticated with Google Cloud:**
    ```bash
    gcloud auth login
    ```

2.  **Set your project context:**
    ```bash
    gcloud config set project myfundi-10db8
    ```

3.  **Apply the CORS configuration to your storage bucket:**
    ```bash
    gcloud storage buckets update gs://myfundi-10db8.appspot.com --cors-file=cors.json
    ```

After running this command, refresh your browser page and try uploading the file again. The error should be resolved. You may need to add your final production domain to the `cors.json` file later.
