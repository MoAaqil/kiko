import admin from 'firebase-admin';

let isFirebaseEnabled = false;

try {
  // Check if Firebase service account key is available in environment
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  if (serviceAccountKey) {
    const serviceAccount = JSON.parse(serviceAccountKey);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    isFirebaseEnabled = true;
    console.log('[FirebaseAdmin] Firebase Admin initialized successfully.');
  } else {
    console.warn('[FirebaseAdmin] FIREBASE_SERVICE_ACCOUNT not set in .env. Firebase authentication will fall back to local mode.');
  }
} catch (error) {
  console.error('[FirebaseAdmin] Failed to initialize Firebase Admin SDK:', error);
}

/**
 * Verify a Firebase ID token.
 * Returns decoded user info if valid, otherwise throws an error.
 */
export async function verifyFirebaseToken(idToken) {
  if (!isFirebaseEnabled) {
    throw new Error('Firebase Admin SDK is not initialized.');
  }
  return await admin.auth().verifyIdToken(idToken);
}

export { isFirebaseEnabled };
