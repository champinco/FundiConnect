
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';

/**
 * @fileOverview Service functions for interacting with Firebase Storage.
 */

/**
 * Uploads a file to Firebase Storage.
 * @param file The file to upload.
 * @param path The base path in Firebase Storage where the file should be stored (e.g., 'job-attachments/jobId').
 *             A unique ID will be appended to the filename.
 * @returns A promise that resolves with the download URL of the uploaded file.
 */
export async function uploadFileToStorage(file: File, path: string): Promise<string> {
  if (!file) {
    throw new Error('No file provided for upload.');
  }
  if (!path) {
    throw new Error('No path provided for upload.');
  }

  // Create a unique filename to avoid overwrites, but keep original extension
  const fileExtension = file.name.split('.').pop() || 'bin'; // Default to 'bin' if no extension
  const uniqueFileName = `${uuidv4()}.${fileExtension}`;
  const fullPath = `${path}/${uniqueFileName}`;
  const storageRef = ref(storage, fullPath);

  try {
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error: any) {
    console.error('Error uploading file to Firebase Storage:', error);
    // It's good to throw a new error or a more specific one if needed
    throw new Error(`Failed to upload file: ${error.message || 'Unknown error'}`);
  }
}
