import imageCompression from 'browser-image-compression';
import { storage, auth } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Storage Service
 * 
 * Handles file uploads to Firebase Cloud Storage.
 * Includes client-side compression to save bandwidth and storage costs.
 */

export const storageService = {
    /**
     * Uploads an image file to Firebase Storage.
     * @param {File} file - The file object to upload
     * @param {string} folder - The target folder (e.g., 'journal_images')
     * @returns {Promise<string>} - Resolves with the public Download URL
     */
    async uploadImage(file, folder = 'uploads') {
        if (!auth.currentUser) {
            console.error("Storage Error: User not logged in");
            // For safety during initial migration, we could return base64 if no user
            // But strict mode is better.
            throw new Error("Must be logged in to upload files.");
        }

        console.log(`[Storage] Processing: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

        // 1. COMPRESS (Client-Side Optimization)
        const options = {
            maxSizeMB: 0.5,         // Max size ~500KB
            maxWidthOrHeight: 1920, // max width/height
            useWebWorker: true,
            fileType: "image/jpeg"
        };

        try {
            let fileToUpload = file;
            try {
                fileToUpload = await imageCompression(file, options);
                console.log(`[Storage] Compressed to: ${(fileToUpload.size / 1024 / 1024).toFixed(2)} MB`);
            } catch (cError) {
                console.warn("Compression failed, uploading original:", cError);
            }

            // 2. UPLOAD to Firebase Storage
            const timestamp = Date.now();
            // Sanitize filename
            const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
            const storagePath = `users/${auth.currentUser.uid}/${folder}/${timestamp}_${cleanName}`;

            const storageRef = ref(storage, storagePath);

            console.log(`[Storage] Uploading to: ${storagePath}`);
            const snapshot = await uploadBytes(storageRef, fileToUpload);

            // 3. GET URL
            const downloadURL = await getDownloadURL(snapshot.ref);
            console.log(`[Storage] Upload success! URL: ${downloadURL}`);

            return downloadURL;

        } catch (error) {
            console.error("Upload failed:", error);
            throw error;
        }
    }
};
