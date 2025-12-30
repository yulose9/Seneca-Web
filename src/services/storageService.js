import imageCompression from 'browser-image-compression';

/**
 * Storage Service
 * 
 * Abstraction layer for file storage.
 * 
 * MODE: LOCAL (Adapter)
 * This currently simulates a cloud upload by returning a Base64 string.
 * This allows the UI components to be "Cloud Ready" (expecting async URL return)
 * while we still use local storage.
 * 
 * TO MIGRATE TO CLOUD:
 * 1. Import 'storage' from './firebase'
 * 2. Update 'uploadImage' to use 'ref', 'uploadBytes', and 'getDownloadURL' from 'firebase/storage'
 */

// Helper to convert file to Base64 (Local Mode only)
const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });
};

export const storageService = {
    /**
     * Uploads an image file.
     * @param {File} file - The file object to upload
     * @param {string} path - The target path (e.g., 'users/123/images/photo.jpg') - IDLE in Local Mode
     * @returns {Promise<string>} - Resolves with the public URL (or Base64 in local mode)
     */
    async uploadImage(file, path) {
        console.log(`[Storage] Processing: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

        // 1. COMPRESS (Client-Side Optimization)
        const options = {
            maxSizeMB: 0.5,         // Max size ~500KB
            maxWidthOrHeight: 1920, // max width/height
            useWebWorker: true,
            fileType: "image/jpeg"
        };

        try {
            const compressedFile = await imageCompression(file, options);
            console.log(`[Storage] Compressed to: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);

            // 2. UPLOAD (Simulated)
            // In Cloud Mode, we would do: await uploadBytes(ref(storage, path), compressedFile);

            // Return Base64 as the "URL"
            return await fileToBase64(compressedFile);
        } catch (error) {
            console.error("Compression failed, keeping original", error);
            return await fileToBase64(file);
        }
    }
};
