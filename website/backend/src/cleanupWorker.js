import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Absolute path to uploads directory
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Fallback Interval for cleanup (in milliseconds) - runs every 30 seconds
const CLEANUP_INTERVAL = 30000;

let ioInstance = null;

export function initCleanupWorker(io) {
  ioInstance = io;

  console.log('[CleanupWorker] Initializing file expiry cleanup scanner (setInterval mode)...');

  // Run cleanup on an interval
  setInterval(runDatabaseCleanup, CLEANUP_INTERVAL);

  // Run immediately on boot
  runDatabaseCleanup();
}

/**
 * Main database scanning & file unlinking operation
 */
async function runDatabaseCleanup() {
  try {
    const expiredMessages = await prisma.message.findMany({
      where: {
        isExpired: false,
        expiresAt: {
          lte: new Date(),
        },
        fileUrl: {
          not: null,
        },
      },
    });

    if (expiredMessages.length === 0) {
      return;
    }

    console.log(`[CleanupWorker] Found ${expiredMessages.length} expired file attachments. Cleaning up...`);

    for (const msg of expiredMessages) {
      if (msg.fileUrl) {
        // Extract filename from URL (e.g. /uploads/filename.ext -> filename.ext)
        const filename = path.basename(msg.fileUrl);
        const filePath = path.join(UPLOADS_DIR, filename);

        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`[CleanupWorker] Deleted physical file: ${filename}`);
          } else {
            console.log(`[CleanupWorker] Physical file not found: ${filename} (skipping unlink)`);
          }
        } catch (err) {
          console.error(`[CleanupWorker] Error deleting file ${filePath}:`, err);
        }
      }

      // Update database message status
      await prisma.message.update({
        where: { id: msg.id },
        data: {
          isExpired: true,
          fileUrl: null, // Wipe url so clients can't download
        },
      });

      console.log(`[CleanupWorker] Database entry updated for message: ${msg.id}`);

      // Broadcast to all active Socket.IO clients that this attachment has expired
      if (ioInstance) {
        ioInstance.emit('message_attachment_expired', {
          messageId: msg.id,
          channelId: msg.channelId,
          receiverId: msg.receiverId,
        });
      }
    }
  } catch (error) {
    console.error('[CleanupWorker] Error during cleanup job execution:', error);
  }
}
