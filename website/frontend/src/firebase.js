import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

/**
 * Dynamically initialize Firebase auth client
 */
export function initializeFirebase(config) {
  try {
    const app = initializeApp(config);
    return getAuth(app);
  } catch (error) {
    console.error('[FirebaseClient] Failed to initialize Firebase client:', error);
    return null;
  }
}
