import express from 'express';
import prisma from '../prisma.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Helper to generate a random 8-character invite code
function generateInviteCode() {
  return Math.random().toString(36).substring(2, 10).toLowerCase();
}

// GET ALL SERVERS USER IS A MEMBER OF
router.get('/', authenticateToken, async (req, res) => {
  try {
    const memberships = await prisma.serverMember.findMany({
      where: { userId: req.user.id },
      include: {
        server: {
          include: {
            channels: true,
            _count: {
              select: { members: true },
            },
          },
        },
      },
    });

    const servers = memberships.map(m => ({
      ...m.server,
      myRole: m.role,
    }));

    return res.json(servers);
  } catch (error) {
    console.error('[Servers Get Error]', error);
    return res.status(500).json({ error: 'Failed to retrieve servers.' });
  }
});

// CREATE SERVER
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, iconUrl } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Server name is required.' });
    }

    const inviteCode = generateInviteCode();

    // Start a transaction to ensure atomic creation of server, membership, and default channels
    const server = await prisma.$transaction(async (tx) => {
      const newServer = await tx.server.create({
        data: {
          name,
          iconUrl: iconUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
          inviteCode,
          ownerId: req.user.id,
        },
      });

      // Add owner to members list
      await tx.serverMember.create({
        data: {
          serverId: newServer.id,
          userId: req.user.id,
          role: 'OWNER',
        },
      });

      // Create default channels
      await tx.channel.createMany({
        data: [
          { serverId: newServer.id, name: 'general', type: 'TEXT', categoryName: 'TEXT CHANNELS' },
          { serverId: newServer.id, name: 'Lounge 🍵', type: 'VOICE', categoryName: 'VOICE CHANNELS' },
          { serverId: newServer.id, name: 'Live Stream 📺', type: 'STREAM', categoryName: 'LIVE STREAMS' },
        ],
      });

      return newServer;
    });

    // Fetch the complete server model with channels
    const fullServer = await prisma.server.findUnique({
      where: { id: server.id },
      include: { channels: true },
    });

    return res.status(201).json(fullServer);
  } catch (error) {
    console.error('[Server Create Error]', error);
    return res.status(500).json({ error: 'Failed to create server.' });
  }
});

// GET SERVER BY INVITE CODE
router.get('/invite/:code', authenticateToken, async (req, res) => {
  try {
    const { code } = req.params;

    const server = await prisma.server.findUnique({
      where: { inviteCode: code },
      select: {
        id: true,
        name: true,
        iconUrl: true,
        _count: {
          select: { members: true },
        },
      },
    });

    if (!server) {
      return res.status(404).json({ error: 'Server invite code invalid or expired.' });
    }

    return res.json(server);
  } catch (error) {
    console.error('[Server Invite Lookup Error]', error);
    return res.status(500).json({ error: 'Failed to find server invite.' });
  }
});

// JOIN SERVER BY INVITE CODE
router.post('/join/:code', authenticateToken, async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.user.id;

    const server = await prisma.server.findUnique({
      where: { inviteCode: code },
    });

    if (!server) {
      return res.status(404).json({ error: 'Invalid invite code.' });
    }

    // Check if already a member
    const existingMember = await prisma.serverMember.findUnique({
      where: {
        serverId_userId: {
          serverId: server.id,
          userId,
        },
      },
    });

    if (existingMember) {
      return res.status(400).json({ error: 'You are already a member of this server.' });
    }

    // Join Server
    await prisma.serverMember.create({
      data: {
        serverId: server.id,
        userId,
        role: 'MEMBER',
      },
    });

    const fullServer = await prisma.server.findUnique({
      where: { id: server.id },
      include: {
        channels: true,
        _count: {
          select: { members: true },
        },
      },
    });

    return res.json(fullServer);
  } catch (error) {
    console.error('[Server Join Error]', error);
    return res.status(500).json({ error: 'Failed to join server.' });
  }
});

// GET CHANNELS IN SERVER
router.get('/:id/channels', authenticateToken, async (req, res) => {
  try {
    const serverId = req.params.id;

    // Check membership
    const membership = await prisma.serverMember.findUnique({
      where: {
        serverId_userId: {
          serverId,
          userId: req.user.id,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this server.' });
    }

    const channels = await prisma.channel.findMany({
      where: { serverId },
      orderBy: { createdAt: 'asc' },
    });

    return res.json(channels);
  } catch (error) {
    console.error('[Channels Get Error]', error);
    return res.status(500).json({ error: 'Failed to fetch channels.' });
  }
});

// CREATE CHANNEL IN SERVER (Requires Admin/Owner)
router.post('/:id/channels', authenticateToken, async (req, res) => {
  try {
    const serverId = req.params.id;
    const { name, type, categoryName, isPrivate } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Channel name and type are required.' });
    }

    // Check membership and permissions (OWNER, ADMIN, or MODERATOR allowed to create channels)
    const membership = await prisma.serverMember.findUnique({
      where: {
        serverId_userId: {
          serverId,
          userId: req.user.id,
        },
      },
    });

    if (!membership || !['OWNER', 'ADMIN', 'MODERATOR'].includes(membership.role)) {
      return res.status(403).json({ error: 'Permission denied. Insufficient role to manage channels.' });
    }

    const newChannel = await prisma.channel.create({
      data: {
        serverId,
        name: name.toLowerCase().replace(/\s+/g, '-'),
        type, // TEXT, VOICE, STREAM
        categoryName: categoryName || (type === 'TEXT' ? 'TEXT CHANNELS' : type === 'VOICE' ? 'VOICE CHANNELS' : 'LIVE STREAMS'),
        isPrivate: !!isPrivate,
      },
    });

    return res.status(201).json(newChannel);
  } catch (error) {
    console.error('[Channel Create Error]', error);
    return res.status(500).json({ error: 'Failed to create channel.' });
  }
});

// GET MEMBERS IN SERVER
router.get('/:id/members', authenticateToken, async (req, res) => {
  try {
    const serverId = req.params.id;

    // Check membership
    const membership = await prisma.serverMember.findUnique({
      where: {
        serverId_userId: {
          serverId,
          userId: req.user.id,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const members = await prisma.serverMember.findMany({
      where: { serverId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            status: true,
            customStatus: true,
          },
        },
      },
    });

    return res.json(members);
  } catch (error) {
    console.error('[Server Members Get Error]', error);
    return res.status(500).json({ error: 'Failed to fetch server members.' });
  }
});

// UPDATE MEMBER ROLE (Owner/Admin only)
router.put('/:id/members/:userId', authenticateToken, async (req, res) => {
  try {
    const { id: serverId, userId: targetUserId } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'Role is required.' });
    }

    // Check current user's role
    const currentMember = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId, userId: req.user.id } },
    });

    if (!currentMember || !['OWNER', 'ADMIN'].includes(currentMember.role)) {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    // Owner only can assign ADMIN/OWNER roles
    if (role === 'OWNER' && currentMember.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only the server owner can transfer ownership.' });
    }

    const targetMember = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId, userId: targetUserId } },
    });

    if (!targetMember) {
      return res.status(404).json({ error: 'Target member not found.' });
    }

    if (targetMember.role === 'OWNER' && currentMember.role !== 'OWNER') {
      return res.status(403).json({ error: 'You cannot change the owner\'s role.' });
    }

    const updated = await prisma.serverMember.update({
      where: { serverId_userId: { serverId, userId: targetUserId } },
      data: { role },
    });

    return res.json(updated);
  } catch (error) {
    console.error('[Member Role Update Error]', error);
    return res.status(500).json({ error: 'Failed to update member role.' });
  }
});

// GET MESSAGE HISTORY FOR A CHANNEL OR DM
router.get('/chat/messages', authenticateToken, async (req, res) => {
  try {
    const { channelId, receiverId } = req.query;
    const currentUserId = req.user.id;

    let whereClause = {};
    if (channelId) {
      whereClause = { 
        channelId, 
        NOT: { deletedFor: { has: currentUserId } } 
      };
    } else if (receiverId) {
      whereClause = {
        OR: [
          { userId: currentUserId, receiverId },
          { userId: receiverId, receiverId: currentUserId },
        ],
        NOT: { deletedFor: { has: currentUserId } },
      };
    } else {
      return res.status(400).json({ error: 'Either channelId or receiverId is required.' });
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            status: true,
          },
        },
        reactions: true,
        replyTo: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    return res.json(messages);
  } catch (error) {
    console.error('[Messages History Error]', error);
    return res.status(500).json({ error: 'Failed to retrieve message history.' });
  }
});

// LEAVE SERVER
router.delete('/:id/leave', authenticateToken, async (req, res) => {
  try {
    const serverId = req.params.id;
    const userId = req.user.id;

    const server = await prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      return res.status(404).json({ error: 'Server not found.' });
    }

    if (server.ownerId === userId) {
      return res.status(400).json({ error: 'Owners cannot leave their own server. Delete it or transfer ownership first.' });
    }

    // Delete membership
    await prisma.serverMember.delete({
      where: {
        serverId_userId: {
          serverId,
          userId,
        },
      },
    });

    return res.json({ message: 'Successfully left the server.' });
  } catch (error) {
    console.error('[Server Leave Error]', error);
    return res.status(500).json({ error: 'Failed to leave server.' });
  }
});

// DELETE SERVER (Owner only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const serverId = req.params.id;

    const server = await prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      return res.status(404).json({ error: 'Server not found.' });
    }

    if (server.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Permission denied. Only the server owner can delete it.' });
    }

    await prisma.server.delete({
      where: { id: serverId },
    });

    return res.json({ message: 'Server successfully deleted.' });
  } catch (error) {
    console.error('[Server Delete Error]', error);
    return res.status(500).json({ error: 'Failed to delete server.' });
  }
});

export default router;
