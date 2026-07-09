/**
 * Lazily initialize Firebase auth client only when the backend enables it.
 */
export async function initializeFirebase(config) {
  try {
    const [{ initializeApp, getApps, getApp }, { getAuth }] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
    ]);
    const app = getApps().length > 0 ? getApp() : initializeApp(config);
    return getAuth(app);
  } catch (error) {
    console.error('[FirebaseClient] Failed to initialize Firebase client:', error);
    return null;
  }
}
