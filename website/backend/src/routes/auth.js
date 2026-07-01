import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { isFirebaseEnabled } from '../firebaseAdmin.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'kiko_secret_jwt_key_9918231';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'kiko_refresh_jwt_key_9283749';

// GET FIREBASE / AUTH CONFIGURATION FOR THE CLIENT
// Firebase client config is always served (it's public-safe public data)
router.get('/config', (req, res) => {
  res.json({
    firebaseEnabled: true,  // Always enable client-side Firebase
    firebaseConfig: {
      apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyDi6BPMRZtsEbvYXZgltDzcRkwu45FqCZk",
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "kiko-3a5dc.firebaseapp.com",
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || "kiko-3a5dc",
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "kiko-3a5dc.firebasestorage.app",
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "529200125167",
      appId: process.env.VITE_FIREBASE_APP_ID || "1:529200125167:web:96faac6b09913abde4771a"
    }
  });
});

// Helper to generate access and refresh tokens
function generateTokens(user) {
  const payload = { id: user.id, email: user.email, username: user.username };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

// Helper to format user response consistently
function formatUserResponse(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bannerUrl: user.bannerUrl,
    bio: user.bio,
    status: user.status,
    customStatus: user.customStatus,
    bannerColor: user.bannerColor,
    avatarDecoration: user.avatarDecoration,
    profileEffect: user.profileEffect,
    favoriteGame: user.favoriteGame,
    gamesInRotation: user.gamesInRotation,
    autoDeleteDuration: user.autoDeleteDuration,
    theme: user.theme,
    bgWallpaper: user.bgWallpaper,
    messageDensity: user.messageDensity,
    reducedMotion: user.reducedMotion,
    devMode: user.devMode,
    fontScale: user.fontScale,
    createdAt: user.createdAt,
  };
}

// Helper to manually verify Firebase ID token (JWT) using Google public certificates
async function verifyFirebaseIdTokenManually(firebaseToken) {
  try {
    // 1. Decode token to get Key ID (kid)
    const decodedToken = jwt.decode(firebaseToken, { complete: true });
    if (!decodedToken || !decodedToken.header || !decodedToken.header.kid) {
      throw new Error('Invalid token format or missing key ID (kid).');
    }

    const kid = decodedToken.header.kid;

    // 2. Fetch public certificates
    const certsRes = await fetch(
      'https://www.googleapis.com/robot/v1/metadata/x509/securetoken-system@system.gserviceaccount.com'
    );
    if (!certsRes.ok) {
      throw new Error('Failed to fetch Firebase public certificates.');
    }
    const publicCerts = await certsRes.json();

    // 3. Get certificate for kid
    const publicCert = publicCerts[kid];
    if (!publicCert) {
      throw new Error(`Public key not found for kid: ${kid}`);
    }

    // 4. Verify signature
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'kiko-3a5dc';
    const decoded = jwt.verify(firebaseToken, publicCert, {
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
      algorithms: ['RS256'],
    });

    return {
      uid: decoded.sub,
      email: decoded.email,
      name: decoded.name || decoded.email.split('@')[0],
      picture: decoded.picture || '',
    };
  } catch (err) {
    throw new Error(err.message);
  }
}


// EMAIL LOOKUP BY USERNAME (For Firebase email resolution)
router.get('/email-by-username', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'Username is required.' });
    
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    
    return res.json({ email: user.email });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { email, username, password, displayName } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, username, and password are required.' });
    }

    // Check if email is already registered
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    // Auto-generate unique Discord-style username tag (e.g. name#1234)
    let isTaken = true;
    let finalUsername = username;
    let attempts = 0;
    while (isTaken && attempts < 15) {
      const base = username.split('#')[0].replace(/\s+/g, '').toLowerCase();
      const tag = Math.floor(1000 + Math.random() * 9000);
      finalUsername = `${base}#${tag}`;
      const existing = await prisma.user.findUnique({ where: { username: finalUsername } });
      if (!existing) isTaken = false;
      attempts++;
    }

    if (isTaken) {
      return res.status(400).json({ error: 'Could not generate a unique username tag. Please try a different username.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        username: finalUsername,
        displayName: displayName || username,
        passwordHash,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${finalUsername}`, // Default premium bottts avatars
        bannerUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=800&h=200',
        bio: 'Welcome to my Kiko profile!',
      },
    });

    const { accessToken, refreshToken } = generateTokens(user);

    return res.status(201).json({
      accessToken,
      refreshToken,
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error('[Auth Register Error]', error);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: 'Credentials and password are required.' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername },
          { username: emailOrUsername },
        ],
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }

    // Set online status upon logging in
    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'online', lastSeen: new Date() },
    });

    const { accessToken, refreshToken } = generateTokens(user);

    return res.json({
      accessToken,
      refreshToken,
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error('[Auth Login Error]', error);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// REFRESH TOKEN
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token is required.' });
  }

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    if (!/^[0-9a-fA-F]{24}$/.test(decoded.id)) {
      throw new Error('Malformed token ID');
    }
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user) {
      return res.status(403).json({ error: 'User does not exist.' });
    }

    const tokens = generateTokens(user);
    return res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired refresh token.' });
  }
});

// PASSWORD RESET
router.post('/reset-password', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and new password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User with this email does not exist.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { email },
      data: { passwordHash },
    });

    return res.json({ message: 'Password reset successful.' });
  } catch (error) {
    console.error('[Auth Reset Password Error]', error);
    return res.status(500).json({ error: 'Internal server error during password reset.' });
  }
});

// FIREBASE SIGN-IN SYNC
// Accepts a Firebase ID token in Authorization header, verifies it with
// Google's public JWT key endpoint (no Admin SDK required), then
// finds or creates the matching Kiko user account and returns app tokens.
router.post('/firebase-sync', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const firebaseToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!firebaseToken) {
      return res.status(401).json({ error: 'No Firebase token provided.' });
    }

    // If Admin SDK is available, use it; otherwise verify manually
    let decodedFirebase;
    if (isFirebaseEnabled) {
      try {
        const { verifyFirebaseToken } = await import('../firebaseAdmin.js');
        decodedFirebase = await verifyFirebaseToken(firebaseToken);
      } catch (e) {
        return res.status(401).json({ error: 'Firebase token verification failed: ' + e.message });
      }
    } else {
      // Fallback: verify Firebase ID token manually using public certificates
      try {
        decodedFirebase = await verifyFirebaseIdTokenManually(firebaseToken);
      } catch (fetchErr) {
        return res.status(401).json({ error: 'Google token verification failed: ' + fetchErr.message });
      }
    }

    const { email, name, picture } = decodedFirebase;
    if (!email) {
      return res.status(400).json({ error: 'Firebase token has no email claim.' });
    }

    // Find or create Kiko user by email
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const baseUsername = email.split('@')[0].replace(/[^a-z0-9_]/gi, '').toLowerCase();
      let uniqueUsername = baseUsername || 'user';
      let counter = 1;
      while (await prisma.user.findUnique({ where: { username: uniqueUsername } })) {
        uniqueUsername = `${baseUsername}${counter++}`;
      }
      user = await prisma.user.create({
        data: {
          email,
          username: uniqueUsername,
          displayName: name || uniqueUsername,
          avatarUrl: picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${uniqueUsername}`,
          passwordHash: 'firebase_managed',
        },
      });
    }

    // Set online status
    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'online', lastSeen: new Date() }
    });

    const payload = { id: user.id, email: user.email, username: user.username };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
    const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });

    return res.json({
      accessToken,
      refreshToken,
      user: formatUserResponse(user)
    });
  } catch (error) {
    console.error('[Firebase Sync Error]', error);
    return res.status(500).json({ error: 'Failed to synchronize Firebase session.' });
  }
});

// GET CURRENT USER PROFILE
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json(formatUserResponse(user));
  } catch (error) {
    console.error('[Auth Me Error]', error);
    return res.status(500).json({ error: 'Internal server error fetching self.' });
  }
});

// UPDATE PROFILE
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { 
      displayName, avatarUrl, bannerUrl, bio, status, customStatus,
      bannerColor, avatarDecoration, profileEffect, favoriteGame, gamesInRotation,
      autoDeleteDuration, theme, bgWallpaper, messageDensity, reducedMotion,
      devMode, fontScale
    } = req.body;

    const dataToUpdate = {};
    if (displayName !== undefined) dataToUpdate.displayName = displayName;
    if (avatarUrl !== undefined) dataToUpdate.avatarUrl = avatarUrl;
    if (bannerUrl !== undefined) dataToUpdate.bannerUrl = bannerUrl;
    if (bio !== undefined) dataToUpdate.bio = bio;
    if (status !== undefined) dataToUpdate.status = status;
    if (customStatus !== undefined) dataToUpdate.customStatus = customStatus;
    if (bannerColor !== undefined) dataToUpdate.bannerColor = bannerColor;
    if (avatarDecoration !== undefined) dataToUpdate.avatarDecoration = avatarDecoration;
    if (profileEffect !== undefined) dataToUpdate.profileEffect = profileEffect;
    if (favoriteGame !== undefined) dataToUpdate.favoriteGame = favoriteGame;
    if (gamesInRotation !== undefined) dataToUpdate.gamesInRotation = gamesInRotation;
    if (autoDeleteDuration !== undefined) dataToUpdate.autoDeleteDuration = parseInt(autoDeleteDuration);
    if (theme !== undefined) dataToUpdate.theme = theme;
    if (bgWallpaper !== undefined) dataToUpdate.bgWallpaper = bgWallpaper;
    if (messageDensity !== undefined) dataToUpdate.messageDensity = messageDensity;
    if (reducedMotion !== undefined) dataToUpdate.reducedMotion = reducedMotion;
    if (devMode !== undefined) dataToUpdate.devMode = devMode;
    if (fontScale !== undefined) dataToUpdate.fontScale = parseInt(fontScale);
    dataToUpdate.lastSeen = new Date();

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: dataToUpdate,
    });

    return res.json(formatUserResponse(updatedUser));
  } catch (error) {
    console.error('[Auth Profile Update Error]', error);
    return res.status(500).json({ error: 'Internal server error updating profile.' });
  }
});

// GET ANY USER PROFILE (WITH MUTUALS)
router.get('/users/:id', authenticateToken, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user.id;

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        serverMemberships: {
          select: { serverId: true }
        }
      }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Get mutual friends
    const currentUserFriends = await prisma.friend.findMany({
      where: { userId: currentUserId, status: 'ACCEPTED' },
      select: { friendId: true }
    });

    const targetUserFriends = await prisma.friend.findMany({
      where: { userId: targetUserId, status: 'ACCEPTED' },
      select: { friendId: true }
    });

    const currentUserFriendIds = new Set(currentUserFriends.map(f => f.friendId));
    const mutualFriendsCount = targetUserFriends.filter(f => currentUserFriendIds.has(f.friendId)).length;

    // Get mutual servers
    const currentUserServers = await prisma.serverMember.findMany({
      where: { userId: currentUserId },
      select: { serverId: true }
    });
    
    const currentUserServerIds = new Set(currentUserServers.map(s => s.serverId));
    const mutualServersCount = targetUser.serverMemberships.filter(s => currentUserServerIds.has(s.serverId)).length;

    return res.json({
      id: targetUser.id,
      username: targetUser.username,
      displayName: targetUser.displayName,
      avatarUrl: targetUser.avatarUrl,
      bannerUrl: targetUser.bannerUrl,
      bio: targetUser.bio,
      status: targetUser.status,
      customStatus: targetUser.customStatus,
      bannerColor: targetUser.bannerColor,
      avatarDecoration: targetUser.avatarDecoration,
      profileEffect: targetUser.profileEffect,
      favoriteGame: targetUser.favoriteGame,
      gamesInRotation: targetUser.gamesInRotation,
      lastSeen: targetUser.lastSeen,
      joinedDate: targetUser.createdAt,
      mutualFriendsCount,
      mutualServersCount
    });
  } catch (error) {
    console.error('[Auth User Details Error]', error);
    return res.status(500).json({ error: 'Internal server error fetching user.' });
  }
});

// MOCK GOOGLE AUTH (For local testing without Firebase keys)
router.post('/mock-google', async (req, res) => {
  try {
    const { email, name, picture } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    // Find or create local user record matching the email
    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      const baseUsername = email.split('@')[0];
      let uniqueUsername = baseUsername;
      let counter = 1;
      while (await prisma.user.findUnique({ where: { username: uniqueUsername } })) {
        uniqueUsername = `${baseUsername}${counter}`;
        counter++;
      }

      user = await prisma.user.create({
        data: {
          email,
          username: uniqueUsername,
          displayName: name || uniqueUsername,
          avatarUrl: picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${uniqueUsername}`,
          passwordHash: 'mock_google_managed',
        }
      });
    }

    // Set online status
    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'online', lastSeen: new Date() }
    });

    const payload = { id: user.id, email: user.email, username: user.username };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
    const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });

    return res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bannerUrl: user.bannerUrl,
        bio: user.bio,
        status: 'online',
        customStatus: user.customStatus,
        bannerColor: user.bannerColor,
        avatarDecoration: user.avatarDecoration,
        profileEffect: user.profileEffect,
        favoriteGame: user.favoriteGame,
        gamesInRotation: user.gamesInRotation,
        createdAt: user.createdAt,
      }
    });
  } catch (error) {
    console.error('[Mock Google Auth Error]', error);
    return res.status(500).json({ error: 'Internal server error during Google authentication.' });
  }
});

export default router;
