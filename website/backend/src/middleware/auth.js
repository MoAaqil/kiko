import jwt from 'jsonwebtoken';
import { isFirebaseEnabled, verifyFirebaseToken } from '../firebaseAdmin.js';
import prisma from '../prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'kiko_secret_jwt_key_9918231';

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required.' });
  }

  // 1. Try verifying as local JWT first
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!/^[0-9a-fA-F]{24}$/.test(decoded.id)) {
      throw new Error('Malformed token ID');
    }
    req.user = decoded;
    return next();
  } catch (localErr) {
    // 2. If local verify fails and Firebase is enabled, verify as Firebase ID Token
    if (isFirebaseEnabled) {
      try {
        const decodedFirebase = await verifyFirebaseToken(token);
        
        // Find or create local user record matching the Firebase email
        let localUser = await prisma.user.findUnique({
          where: { email: decodedFirebase.email }
        });

        if (!localUser) {
          // Extract a username from email
          const baseUsername = decodedFirebase.email.split('@')[0];
          let uniqueUsername = baseUsername;
          let counter = 1;
          while (await prisma.user.findUnique({ where: { username: uniqueUsername } })) {
            uniqueUsername = `${baseUsername}${counter}`;
            counter++;
          }

          localUser = await prisma.user.create({
            data: {
              email: decodedFirebase.email,
              username: uniqueUsername,
              displayName: decodedFirebase.name || uniqueUsername,
              avatarUrl: decodedFirebase.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${uniqueUsername}`,
              passwordHash: 'firebase_auth_managed',
            }
          });
        }

        req.user = {
          id: localUser.id,
          email: localUser.email,
          username: localUser.username,
          displayName: localUser.displayName
        };
        return next();
      } catch (firebaseErr) {
        console.error('[AuthMiddleware] Firebase Token Verification Failed:', firebaseErr);
      }
    }

    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
}
