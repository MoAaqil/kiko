import jwt from 'jsonwebtoken';
import prisma from './prisma.js';
import { isFirebaseEnabled, verifyFirebaseToken } from './firebaseAdmin.js';
import { scrapeLinkMetadata } from './utils/scraper.js';

const JWT_SECRET = process.env.JWT_SECRET || 'kiko_secret_jwt_key_9918231';

// Track active users and their sockets: userId -> set of socketIds
const activeUsers = new Map();
// Track who is in which call room: roomId -> Map(socketId -> { userId, streamType })
const callRooms = new Map();

export function setupSocketIO(io) {
  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (!/^[0-9a-fA-F]{24}$/.test(decoded.id)) {
        throw new Error('Malformed token ID');
      }
      socket.userId = decoded.id;
      socket.username = decoded.username;
      return next();
    } catch (err) {
      if (isFirebaseEnabled) {
        try {
          const decodedFirebase = await verifyFirebaseToken(token);
          const localUser = await prisma.user.findUnique({
            where: { email: decodedFirebase.email }
          });
          if (localUser) {
            socket.userId = localUser.id;
            socket.username = localUser.username;
            return next();
          }
        } catch (firebaseErr) {
          console.error('[SocketAuth] Firebase token verify failed:', firebaseErr);
        }
      }
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`[Socket] User connected: ${socket.username} (${userId}) | SocketID: ${socket.id}`);

    // Track user socket
    if (!activeUsers.has(userId)) {
      activeUsers.set(userId, new Set());
    }
    activeUsers.get(userId).add(socket.id);

    // Join user-specific room for direct notifications
    socket.join(`user:${userId}`);

    // Update user status in database to online
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { status: 'online', lastSeen: new Date() },
      });
      // Broadcast presence change
      io.emit('user_status_changed', { userId, status: 'online' });

      // Sync undelivered messages to delivered
      const undeliveredDMs = await prisma.message.findMany({
        where: { receiverId: userId, isDelivered: false }
      });

      if (undeliveredDMs.length > 0) {
        await prisma.message.updateMany({
          where: { receiverId: userId, isDelivered: false },
          data: { isDelivered: true }
        });

        // Group by senderId to notify senders
        const sendersToNotify = [...new Set(undeliveredDMs.map(m => m.userId))];
        sendersToNotify.forEach(senderId => {
          io.to(`user:${senderId}`).emit('messages_delivered', {
            receiverId: userId,
            messageIds: undeliveredDMs.filter(m => m.userId === senderId).map(m => m.id)
          });
        });
      }
    } catch (err) {
      console.error('[Socket Connection DB Error]', err);
    }

    // 1. PRESENCE / STATUS EVENTS
    socket.on('status_update', async ({ status, customStatus }) => {
      try {
        const data = {};
        if (status) data.status = status;
        if (customStatus !== undefined) data.customStatus = customStatus;
        data.lastSeen = new Date();

        await prisma.user.update({
          where: { id: userId },
          data,
        });

        io.emit('user_status_changed', {
          userId,
          status: status || undefined,
          customStatus: customStatus !== undefined ? customStatus : undefined,
        });
      } catch (err) {
        console.error('[Socket Status Update Error]', err);
      }
    });

    // 2. TEXT CHAT ROOMS
    socket.on('join_channel', (channelId) => {
      socket.join(`channel:${channelId}`);
      console.log(`[Socket] Socket ${socket.id} joined channel:${channelId}`);
    });

    socket.on('leave_channel', (channelId) => {
      socket.leave(`channel:${channelId}`);
      console.log(`[Socket] Socket ${socket.id} left channel:${channelId}`);
    });

    // 3. MESSAGING & TYPING INDICATORS
    socket.on('typing_start', ({ channelId, receiverId }) => {
      if (channelId) {
        socket.to(`channel:${channelId}`).emit('typing_start', { channelId, userId, username: socket.username });
      } else if (receiverId) {
        socket.to(`user:${receiverId}`).emit('typing_start', { receiverId, userId, username: socket.username });
      }
    });

    socket.on('typing_stop', ({ channelId, receiverId }) => {
      if (channelId) {
        socket.to(`channel:${channelId}`).emit('typing_stop', { channelId, userId });
      } else if (receiverId) {
        socket.to(`user:${receiverId}`).emit('typing_stop', { receiverId, userId });
      }
    });

    socket.on('send_message', async (msgData) => {
      const { channelId, receiverId, content, replyToId, fileUrl, fileName, fileType, fileSize, expiresAt } = msgData;

      try {
        // 1. Admin-only channel check
        if (channelId) {
          const channel = await prisma.channel.findUnique({
            where: { id: channelId }
          });
          if (channel && channel.adminOnly) {
            const member = await prisma.serverMember.findUnique({
              where: {
                serverId_userId: {
                  serverId: channel.serverId,
                  userId: userId
                }
              }
            });
            const isAuthorized = member && ['OWNER', 'ADMIN', 'MODERATOR'].includes(member.role);
            if (!isAuthorized) {
              return socket.emit('error_message', { error: '🔒 Only admins can send messages in this channel.' });
            }
          }
        }

        // 2. Disappearing messages check
        const senderUser = await prisma.user.findUnique({ where: { id: userId } });
        let finalExpiresAt = expiresAt ? new Date(expiresAt) : null;
        if (senderUser && senderUser.autoDeleteDuration > 0) {
          finalExpiresAt = new Date(Date.now() + senderUser.autoDeleteDuration * 60 * 1000);
        }

        // Create the message INSTANTLY (without blocking on link scraping)
        const message = await prisma.message.create({
          data: {
            channelId: channelId || null,
            receiverId: receiverId || null,
            userId,
            content,
            replyToId: replyToId || null,
            fileUrl: fileUrl || null,
            fileName: fileName || null,
            fileType: fileType || null,
            fileSize: fileSize ? parseInt(fileSize) : null,
            expiresAt: finalExpiresAt,
            isDelivered: receiverId ? activeUsers.has(receiverId) : false,
          },
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

        // Dispatch message INSTANTLY
        if (channelId) {
          io.to(`channel:${channelId}`).emit('new_message', message);
        } else if (receiverId) {
          io.to(`user:${receiverId}`).emit('new_message', message);
          io.to(`user:${userId}`).emit('new_message', message);
        }

        // 3. Asynchronous Link Scraping (Background non-blocking thread)
        const urlRegex = /(https?:\/\/[^\s]+)/gi;
        const match = content && content.match(urlRegex);
        if (match && match.length > 0) {
          (async () => {
            try {
              const scraped = await scrapeLinkMetadata(match[0]);
              if (scraped) {
                const updatedMsg = await prisma.message.update({
                  where: { id: message.id },
                  data: {
                    embedTitle: scraped.title,
                    embedDescription: scraped.description,
                    embedThumbnail: scraped.thumbnail,
                    embedSiteName: scraped.siteName,
                    embedVideoUrl: scraped.videoUrl,
                    embedColor: scraped.color
                  },
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

                // Broadcast rich preview card update in real-time
                if (channelId) {
                  io.to(`channel:${channelId}`).emit('message_updated', updatedMsg);
                } else if (receiverId) {
                  io.to(`user:${receiverId}`).emit('message_updated', updatedMsg);
                  io.to(`user:${userId}`).emit('message_updated', updatedMsg);
                }
              }
            } catch (scrapeErr) {
              console.warn('[Background Link Scraping Error]', scrapeErr);
            }
          })();
        }
      } catch (err) {
        console.error('[Socket Send Message Error]', err);
      }
    });

    // DELETE MESSAGE
    socket.on('delete_message', async ({ messageId, mode }) => {
      // mode: 'everyone' | 'me'
      try {
        const msg = await prisma.message.findUnique({ where: { id: messageId } });
        if (!msg) return;

        if (mode === 'me') {
          // Delete for me: add user to deletedFor list
          const currentDeletedFor = msg.deletedFor || [];
          if (!currentDeletedFor.includes(userId)) {
            await prisma.message.update({
              where: { id: messageId },
              data: { deletedFor: { set: [...currentDeletedFor, userId] } }
            });
          }
          // Notify the user so their UI removes it locally
          socket.emit('message_deleted', { messageId, channelId: msg.channelId, receiverId: msg.receiverId, senderId: msg.userId });
        } else {
          // Delete for everyone: verify ownership or admin permission
          let isAuthorized = msg.userId === userId;
          if (!isAuthorized && msg.channelId) {
            const channel = await prisma.channel.findUnique({ where: { id: msg.channelId } });
            if (channel) {
              const member = await prisma.serverMember.findUnique({
                where: { serverId_userId: { serverId: channel.serverId, userId: userId } }
              });
              if (member && ['OWNER', 'ADMIN', 'MODERATOR'].includes(member.role)) {
                isAuthorized = true;
              }
            }
          }

          if (!isAuthorized) {
            return socket.emit('error_message', { error: 'Unauthorized to delete this message.' });
          }

          await prisma.message.delete({ where: { id: messageId } });
          const broadcastPayload = { messageId, channelId: msg.channelId, receiverId: msg.receiverId, senderId: msg.userId };
          if (msg.channelId) {
            io.to(`channel:${msg.channelId}`).emit('message_deleted', broadcastPayload);
          } else {
            io.to(`user:${msg.receiverId}`).emit('message_deleted', broadcastPayload);
            io.to(`user:${userId}`).emit('message_deleted', broadcastPayload);
          }
        }
      } catch (err) {
        console.error('[Socket Delete Message Error]', err);
      }
    });

    // CLEAR CHAT / DELETE ALL MESSAGES IN CHANNEL OR DM
    socket.on('clear_chat', async ({ channelId, receiverId }) => {
      try {
        if (channelId) {
          // Delete all messages in the channel
          await prisma.message.deleteMany({
            where: { channelId }
          });
          io.to(`channel:${channelId}`).emit('chat_cleared', { channelId });
        } else if (receiverId) {
          // Delete all messages in the DM between userId and receiverId
          await prisma.message.deleteMany({
            where: {
              OR: [
                { userId: userId, receiverId: receiverId },
                { userId: receiverId, receiverId: userId }
              ]
            }
          });
          io.to(`user:${receiverId}`).emit('chat_cleared', { senderId: userId });
          io.to(`user:${userId}`).emit('chat_cleared', { senderId: receiverId });
        }
      } catch (err) {
        console.error('[Socket Clear Chat Error]', err);
      }
    });

    // MARK MESSAGES AS READ
    socket.on('read_chat', async ({ senderId }) => {
      try {
        if (senderId) {
          // Mark all DMs sent by senderId to this user (userId) as read
          await prisma.message.updateMany({
            where: { userId: senderId, receiverId: userId, isRead: false },
            data: { isRead: true }
          });

          // Notify the sender that their messages to this user have been read
          io.to(`user:${senderId}`).emit('messages_read', {
            readerId: userId
          });
        }
      } catch (err) {
        console.error('[Socket Read Chat Error]', err);
      }
    });

    // REACTIONS
    socket.on('add_reaction', async ({ messageId, emoji }) => {
      try {
        const reaction = await prisma.reaction.create({
          data: {
            messageId,
            userId,
            emoji,
          },
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        });

        const msg = await prisma.message.findUnique({
          where: { id: messageId },
          select: { channelId: true, receiverId: true, userId: true },
        });

        if (!msg) return;

        const reactionPayload = { messageId, reaction };
        if (msg.channelId) {
          io.to(`channel:${msg.channelId}`).emit('reaction_added', reactionPayload);
        } else {
          const recipientIds = [...new Set([msg.receiverId, msg.userId])].filter(Boolean);
          recipientIds.forEach(id => {
            io.to(`user:${id}`).emit('reaction_added', reactionPayload);
          });
        }
      } catch (err) {
        // Unique constraint failures when clicking same emoji twice are handled gracefully (ignored)
        if (err.code !== 'P2002') {
          console.error('[Socket Reaction Error]', err);
        }
      }
    });

    socket.on('remove_reaction', async ({ messageId, emoji }) => {
      try {
        const existing = await prisma.reaction.findUnique({
          where: {
            messageId_userId_emoji: {
              messageId,
              userId,
              emoji,
            },
          },
        });

        if (!existing) return;

        await prisma.reaction.delete({
          where: {
            messageId_userId_emoji: {
              messageId,
              userId,
              emoji,
            },
          },
        });

        const msg = await prisma.message.findUnique({
          where: { id: messageId },
          select: { channelId: true, receiverId: true, userId: true },
        });

        if (!msg) return;

        const reactionPayload = { messageId, userId, emoji };
        if (msg.channelId) {
          io.to(`channel:${msg.channelId}`).emit('reaction_removed', reactionPayload);
        } else {
          const recipientIds = [...new Set([msg.receiverId, msg.userId])].filter(Boolean);
          recipientIds.forEach(id => {
            io.to(`user:${id}`).emit('reaction_removed', reactionPayload);
          });
        }
      } catch (err) {
        console.error('[Socket Remove Reaction Error]', err);
      }
    });

    // 4. WEBRTC CALLING / STREAMING SIGNALING (MESH NETWORK MODEL)
    socket.on('call_join', async ({ roomId, streamType }) => {
      // streamType: 'voice' | 'video' | 'screen'
      console.log(`[Call] User ${socket.username} joined call room: ${roomId} with streamType: ${streamType}`);

      socket.join(`call:${roomId}`);

      if (!callRooms.has(roomId)) {
        callRooms.set(roomId, new Map());
      }

      const participants = callRooms.get(roomId);

      // If it's a DM call, notify the recipient directly
      if (roomId.startsWith('dm-') && participants.size === 0) {
        const parts = roomId.replace('dm-', '').split('-');
        const otherUserId = parts.find(id => id !== userId);
        if (otherUserId) {
          // Fetch sender displayName for rich invite
          let callerName = socket.username;
          try {
            const u = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });
            if (u?.displayName) callerName = u.displayName;
          } catch (e) { /* ignore */ }

          console.log(`[Call] Inviting user ${otherUserId} to DM call ${roomId} from ${callerName}`);
          io.to(`user:${otherUserId}`).emit('incoming_call', {
            roomId,
            caller: {
              id: userId,
              username: socket.username,
              displayName: callerName
            },
            streamType
          });
        }
      }

      // Tell existing participants to connect to this new client
      socket.to(`call:${roomId}`).emit('user_joined_call', {
        userId,
        socketId: socket.id,
        username: socket.username,
        streamType,
      });

      // Gather current list of other participants in room
      const currentParticipantsList = [];
      participants.forEach((info, sId) => {
        currentParticipantsList.push({
          socketId: sId,
          userId: info.userId,
          username: info.username,
          streamType: info.streamType,
        });
      });

      // Record this user's participation details
      participants.set(socket.id, { userId, username: socket.username, streamType, roomId });

      // Return current list back to joiner
      socket.emit('call_participants', currentParticipantsList);
      
      broadcastVoiceChannelsUpdate(io);
    });

    socket.on('call_signal', ({ targetSocketId, signalData }) => {
      // Forward signaling payload directly to targets
      io.to(targetSocketId).emit('call_signal', {
        senderSocketId: socket.id,
        senderUserId: userId,
        senderUsername: socket.username,
        signalData,
      });
    });

    socket.on('call_stream_type_changed', ({ roomId, streamType }) => {
      if (callRooms.has(roomId)) {
        const participants = callRooms.get(roomId);
        if (participants.has(socket.id)) {
          participants.get(socket.id).streamType = streamType;
        }
      }

      socket.to(`call:${roomId}`).emit('user_stream_type_changed', {
        socketId: socket.id,
        streamType,
      });

      broadcastVoiceChannelsUpdate(io);
    });

    socket.on('call_leave', ({ roomId }) => {
      leaveCallRoom(io, socket, roomId);
    });

    // DISCONNECT
    socket.on('disconnect', async () => {
      console.log(`[Socket] Socket disconnected: ${socket.id} (User: ${socket.username})`);

      // 1. Clean up user call rooms
      callRooms.forEach((participants, roomId) => {
        if (participants.has(socket.id)) {
          leaveCallRoom(io, socket, roomId);
        }
      });

      // 2. Manage active user sockets
      const userSockets = activeUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          activeUsers.delete(userId);
          console.log(`[Socket] User ${socket.username} is fully offline.`);

          // Update status to offline
          try {
            await prisma.user.update({
              where: { id: userId },
              data: { status: 'offline', lastSeen: new Date() },
            });
            io.emit('user_status_changed', { userId, status: 'offline', lastSeen: new Date().toISOString() });
          } catch (err) {
            console.error('[Socket Disconnect DB Error]', err);
          }
        }
      }
    });
  });
}

/**
 * Broadcast active voice/video participants globally to all sockets
 */
function broadcastVoiceChannelsUpdate(io) {
  const update = {};
  callRooms.forEach((participants, roomId) => {
    update[roomId] = Array.from(participants.values()).map(p => ({
      userId: p.userId,
      username: p.username,
      streamType: p.streamType
    }));
  });
  io.emit('voice_channels_update', update);
}

/**
 * Handle removing user from a voice/video/stream call room
 */
function leaveCallRoom(io, socket, roomId) {
  if (!roomId) return;
  socket.leave(`call:${roomId}`);

  const participants = callRooms.get(roomId);
  if (participants && participants.has(socket.id)) {
    participants.delete(socket.id);
    console.log(`[Call] User ${socket.username} left call room: ${roomId}`);

    socket.to(`call:${roomId}`).emit('user_left_call', {
      userId: socket.userId,
      socketId: socket.id,
      username: socket.username,
    });

    if (participants.size === 0) {
      callRooms.delete(roomId);
    }
    
    broadcastVoiceChannelsUpdate(io);
  }
}
