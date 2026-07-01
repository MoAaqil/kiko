import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

/**
 * Dynamically initialize Firebase auth client
 */
export function initializeFirebase(config) {
  try {
    const app = getApps().length > 0 ? getApp() : initializeApp(config);
    return getAuth(app);
  } catch (error) {
    console.error('[FirebaseClient] Failed to initialize Firebase client:', error);
    return null;
  }
}
