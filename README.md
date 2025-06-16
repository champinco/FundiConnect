# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.
# FundiConnect
# FundiConnect

## Troubleshooting Build Issues

If you encounter errors like "Cannot find module" (e.g., "Cannot find module './548.js'") after building or starting the application, it usually indicates that your `.next` build directory is corrupted or in an inconsistent state.

To resolve this, perform a clean rebuild:

1.  **Stop the Next.js server** if it's running.
2.  **Delete the `.next` directory** from your project root. This folder contains all build artifacts.
    ```bash
    rm -rf .next
    ```
    (On Windows, you can use `rd /s /q .next` in Command Prompt or `Remove-Item -Recurse -Force .next` in PowerShell).
3.  **Rebuild the application**:
    ```bash
    npm run build
    ```
    Carefully check the output of this command for any build errors.
4.  **Start the server**:
    ```bash
    npm start
    ```

This process ensures that all build artifacts are freshly generated and should resolve "Cannot find module" errors related to the build.
