import express from 'express';
import prisma from '../prisma.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET ALL FRIENDS & PENDING REQUESTS
router.get('/', authenticateToken, async (req, res) => {
  try {
    const relationships = await prisma.friend.findMany({
      where: { userId: req.user.id },
      include: {
        friend: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            status: true,
            customStatus: true,
            lastSeen: true,
          },
        },
      },
    });

    return res.json(relationships);
  } catch (error) {
    console.error('[Friends Get Error]', error);
    return res.status(500).json({ error: 'Failed to retrieve friends list.' });
  }
});

// SEARCH USERS GLOBALLY
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required.' });
    }

    const currentUserId = req.user.id;

    // Use regex for MongoDB compatibility (Prisma MongoDB doesn't support contains mode)
    const users = await prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { displayName: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        status: true,
        customStatus: true,
      },
      take: 15,
    });

    return res.json(users);
  } catch (error) {
    // MongoDB fallback: if mode insensitive not supported, do manual JS filter
    try {
      const currentUserId = req.user.id;
      const { query } = req.query;
      const allUsers = await prisma.user.findMany({
        where: { id: { not: currentUserId } },
        select: {
          id: true, username: true, displayName: true,
          avatarUrl: true, status: true, customStatus: true, email: true,
        },
        take: 200,
      });
      const q = (query || '').toLowerCase();
      const filtered = allUsers.filter(u =>
        u.username?.toLowerCase().includes(q) ||
        u.displayName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      ).slice(0, 15).map(({ email, ...rest }) => rest);
      return res.json(filtered);
    } catch (fallbackErr) {
      console.error('[Friend Search Error]', fallbackErr);
      return res.status(500).json({ error: 'Failed to search users.' });
    }
  }
});


// SEND FRIEND REQUEST BY USERNAME
router.post('/request', authenticateToken, async (req, res) => {
  try {
    const { username } = req.body;
    const currentUserId = req.user.id;

    if (!username) {
      return res.status(400).json({ error: 'Username is required.' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { username },
    });

    if (!targetUser) {
      return res.status(404).json({ error: `User "${username}" not found.` });
    }

    if (targetUser.id === currentUserId) {
      return res.status(400).json({ error: 'You cannot friend request yourself.' });
    }

    // Check existing relationship
    const existing = await prisma.friend.findUnique({
      where: {
        userId_friendId: {
          userId: currentUserId,
          friendId: targetUser.id,
        },
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        return res.status(400).json({ error: 'You are already friends with this user.' });
      }
      if (existing.status === 'PENDING_SENT') {
        return res.status(400).json({ error: 'Friend request already sent.' });
      }
      if (existing.status === 'BLOCKED') {
        return res.status(400).json({ error: 'You have blocked this user.' });
      }
      // If PENDING_RECEIVED, auto-accept it!
      if (existing.status === 'PENDING_RECEIVED') {
        await prisma.$transaction([
          prisma.friend.update({
            where: { userId_friendId: { userId: currentUserId, friendId: targetUser.id } },
            data: { status: 'ACCEPTED' },
          }),
          prisma.friend.update({
            where: { userId_friendId: { userId: targetUser.id, friendId: currentUserId } },
            data: { status: 'ACCEPTED' },
          }),
        ]);
        return res.json({ message: 'Friend request accepted!', status: 'ACCEPTED', friend: targetUser });
      }
    }

    // Create reciprocal pending relations
    await prisma.$transaction([
      prisma.friend.create({
        data: { userId: currentUserId, friendId: targetUser.id, status: 'PENDING_SENT' },
      }),
      prisma.friend.create({
        data: { userId: targetUser.id, friendId: currentUserId, status: 'PENDING_RECEIVED' },
      }),
    ]);

    return res.json({ message: 'Friend request sent.', status: 'PENDING_SENT' });
  } catch (error) {
    console.error('[Friend Request Error]', error);
    return res.status(500).json({ error: 'Failed to send friend request.' });
  }
});

// RESPOND TO FRIEND REQUEST
router.post('/respond', authenticateToken, async (req, res) => {
  try {
    const { friendId, action } = req.body; // action: ACCEPT, DECLINE, BLOCK
    const currentUserId = req.user.id;

    if (!friendId || !action) {
      return res.status(400).json({ error: 'Friend ID and action are required.' });
    }

    const relationship = await prisma.friend.findUnique({
      where: {
        userId_friendId: {
          userId: currentUserId,
          friendId,
        },
      },
    });

    if (!relationship) {
      return res.status(404).json({ error: 'Friend relationship not found.' });
    }

    if (action === 'ACCEPT') {
      if (relationship.status !== 'PENDING_RECEIVED') {
        return res.status(400).json({ error: 'No pending request to accept.' });
      }

      await prisma.$transaction([
        prisma.friend.update({
          where: { userId_friendId: { userId: currentUserId, friendId } },
          data: { status: 'ACCEPTED' },
        }),
        prisma.friend.update({
          where: { userId_friendId: { userId: friendId, friendId: currentUserId } },
          data: { status: 'ACCEPTED' },
        }),
      ]);

      return res.json({ message: 'Friend request accepted.', status: 'ACCEPTED' });
    }

    if (action === 'DECLINE') {
      await prisma.$transaction([
        prisma.friend.delete({
          where: { userId_friendId: { userId: currentUserId, friendId } },
        }),
        prisma.friend.delete({
          where: { userId_friendId: { userId: friendId, friendId: currentUserId } },
        }),
      ]);

      return res.json({ message: 'Friend request declined.' });
    }

    if (action === 'BLOCK') {
      // Set current user's entry to BLOCKED
      // Delete or update target user's entry
      await prisma.$transaction([
        prisma.friend.upsert({
          where: { userId_friendId: { userId: currentUserId, friendId } },
          update: { status: 'BLOCKED' },
          create: { userId: currentUserId, friendId, status: 'BLOCKED' },
        }),
        prisma.friend.deleteMany({
          where: { userId: friendId, friendId: currentUserId },
        }),
      ]);

      return res.json({ message: 'User blocked.', status: 'BLOCKED' });
    }

    return res.status(400).json({ error: 'Invalid action parameter.' });
  } catch (error) {
    console.error('[Friend Respond Error]', error);
    return res.status(500).json({ error: 'Failed to respond to friend request.' });
  }
});

// REMOVE FRIEND
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const friendId = req.params.id;
    const currentUserId = req.user.id;

    await prisma.$transaction([
      prisma.friend.delete({
        where: { userId_friendId: { userId: currentUserId, friendId } },
      }),
      prisma.friend.delete({
        where: { userId_friendId: { userId: friendId, friendId: currentUserId } },
      }),
    ]);

    return res.json({ message: 'Friend removed.' });
  } catch (error) {
    console.error('[Friend Remove Error]', error);
    return res.status(500).json({ error: 'Failed to remove friend.' });
  }
});

export default router;
