/**
 * Authentication Service (Local Adapter)
 * 
 * Manages user login and security.
 * 
 * MODE: LOCAL (Unlocked)
 * Currently allows any access since we haven't connected Firebase yet.
 * 
 * TO MIGRATE TO CLOUD:
 * 1. Import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
 * 2. Implement the actual 'loginWithGoogle' function.
 */

import { auth } from './firebase'; // Will be null in local mode
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";

const ALLOWED_EMAIL = import.meta.env.VITE_ALLOWED_EMAIL;

export const authService = {
    // Get current user (simple wrapper)
    get currentUser() {
        return auth?.currentUser || { uid: "local_user", email: ALLOWED_EMAIL || "local@user.com" };
    },

    /**
     * Login with Google
     * Use this to strictly enforce the "Allow List"
     */
    async loginWithGoogle() {
        if (!auth) {
            console.log("Auth not configured (Local Mode). Allowing access.");
            return { uid: "local_user", email: "local@example.com" };
        }

        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // SECURITY CHECK: Email Allow-List
            if (ALLOWED_EMAIL && user.email !== ALLOWED_EMAIL) {
                await signOut(auth); // Immediately kick them out
                throw new Error("Access Denied: This email is not authorized.");
            }

            return user;
        } catch (error) {
            console.error("Login failed:", error);
            throw error;
        }
    },

    /**
     * Logout
     */
    async logout() {
        if (auth) {
            await signOut(auth);
        }
        window.location.reload();
    }
};
