// src/config/admin.ts

/**
 * List of Firebase User UIDs who are considered administrators.
 * IMPORTANT: For a real application, manage this list securely, potentially via a database role or environment variables.
 * For MVP, hardcoding here is a starting point.
 *
 * Replace 'ADMIN_USER_UID_1', 'ADMIN_USER_UID_2' with actual Firebase UIDs of your admin users.
 */
export const ADMIN_USER_UIDS: string[] = [
  "xiqOOUA8IqQxfm7NTE0QZGt5JcN2", // Admin UID set
  // Example: "anotherAdminUIDIfYouHaveOne", 
];

if (ADMIN_USER_UIDS.includes("PLEASE_REPLACE_WITH_ACTUAL_ADMIN_UID") && process.env.NODE_ENV === "production") {
  console.error("CRITICAL SECURITY WARNING: Default admin UID placeholder is still present in production configuration. Please update src/config/admin.ts with actual admin UIDs.");
} else if (ADMIN_USER_UIDS.includes("PLEASE_REPLACE_WITH_ACTUAL_ADMIN_UID")) {
   console.warn("WARNING: Default admin UID placeholder is present. Ensure this is updated for a real deployment. File: src/config/admin.ts");
} else if (ADMIN_USER_UIDS.length === 0 && process.env.NODE_ENV !== "test" /* Avoid warning in test environments if no admins needed */) {
  console.warn("WARNING: ADMIN_USER_UIDS array is empty. No users will have admin privileges for the admin panel. File: src/config/admin.ts");
}
