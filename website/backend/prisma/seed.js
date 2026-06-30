import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.reaction.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.channel.deleteMany({});
  await prisma.serverMember.deleteMany({});
  await prisma.server.deleteMany({});
  await prisma.friend.deleteMany({});
  await prisma.user.deleteMany({});

  const passwordHash = await bcrypt.hash('123456789', 10);

  // Create Users
  const user1 = await prisma.user.create({
    data: {
      email: 'moaaqil99@gmail.com',
      username: 'moaaqil99',
      displayName: 'Mo Aaqil',
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150',
      bannerUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=800&h=200',
      bio: 'Creating Kiko - a privacy-focused real-time sharing platform.',
      status: 'online',
      customStatus: 'Coding away 🚀',
      bannerColor: '#3f1b40',
      avatarDecoration: 'neon-halo',
      profileEffect: 'sparkles',
      favoriteGame: 'Neverness to Everness',
      gamesInRotation: 'Neverness to Everness, VALORANT',
    }
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'aaqilezio@gmail.com',
      username: 'aaqilezio',
      displayName: 'Aaqilezio',
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150',
      bannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&h=200',
      bio: 'Gaming enthusiast. WebRTC stream tester.',
      status: 'idle',
      customStatus: 'Stream starting soon!',
      bannerColor: '#2b2d42',
      avatarDecoration: 'cyber-helmet',
      profileEffect: 'glitch',
      favoriteGame: 'VALORANT',
      gamesInRotation: 'VALORANT, Wuthering Waves',
    }
  });

  const user3 = await prisma.user.create({
    data: {
      email: 'hafsahsajid@gmail.com',
      username: 'hafsahsajid',
      displayName: 'Hafsah Sajid',
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150',
      bannerUrl: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=800&h=200',
      bio: 'UI/UX Designer. Inspired by clean glassmorphism.',
      status: 'dnd',
      customStatus: 'Designing the future layout 🎨',
      bannerColor: '#f25c54',
      avatarDecoration: 'sakura-blossoms',
      profileEffect: 'sakura',
      favoriteGame: 'Wuthering Waves',
      gamesInRotation: 'Wuthering Waves, Minecraft',
    }
  });

  const user4 = await prisma.user.create({
    data: {
      email: 'mexzy@gmail.com',
      username: 'mexzy',
      displayName: 'Mexzy Art',
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150',
      bannerUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&h=200',
      bio: 'Audio engineer and modular synth builder.',
      status: 'online',
      customStatus: 'Listening to modular frequencies 🎧',
      bannerColor: '#4a4e69',
      avatarDecoration: 'music-wave',
      profileEffect: 'pulse',
      favoriteGame: 'Minecraft',
      gamesInRotation: 'Minecraft, Neverness to Everness',
    }
  });

  console.log('Users created.');

  // Create Friends (bi-directional mapping)
  await prisma.friend.createMany({
    data: [
      { userId: user1.id, friendId: user2.id, status: 'ACCEPTED' },
      { userId: user2.id, friendId: user1.id, status: 'ACCEPTED' },

      { userId: user1.id, friendId: user3.id, status: 'ACCEPTED' },
      { userId: user3.id, friendId: user1.id, status: 'ACCEPTED' },

      { userId: user2.id, friendId: user3.id, status: 'ACCEPTED' },
      { userId: user3.id, friendId: user2.id, status: 'ACCEPTED' },

      { userId: user1.id, friendId: user4.id, status: 'PENDING_SENT' },
      { userId: user4.id, friendId: user1.id, status: 'PENDING_RECEIVED' },
    ]
  });

  console.log('Friends relations seeded.');

  // Create primary Server: Kiko HQ
  const server = await prisma.server.create({
    data: {
      name: 'Kiko HQ',
      inviteCode: 'kikohq',
      ownerId: user1.id,
      iconUrl: 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?auto=format&fit=crop&w=150&h=150',
    }
  });

  // Server Members
  await prisma.serverMember.createMany({
    data: [
      { serverId: server.id, userId: user1.id, role: 'OWNER' },
      { serverId: server.id, userId: user2.id, role: 'ADMIN' },
      { serverId: server.id, userId: user3.id, role: 'MODERATOR' },
      { serverId: server.id, userId: user4.id, role: 'MEMBER' },
    ]
  });

  console.log('Server and members seeded.');

  // Create Channels in Server
  const chGeneral = await prisma.channel.create({
    data: { serverId: server.id, name: 'welcome-chat', type: 'TEXT', categoryName: 'TEXT CHANNELS' }
  });
  const chMemes = await prisma.channel.create({
    data: { serverId: server.id, name: 'memes-and-media', type: 'TEXT', categoryName: 'TEXT CHANNELS' }
  });
  const chLounge = await prisma.channel.create({
    data: { serverId: server.id, name: 'HQ Lounge 🍵', type: 'VOICE', categoryName: 'VOICE CHANNELS' }
  });
  const chGaming = await prisma.channel.create({
    data: { serverId: server.id, name: 'Gaming 🎮', type: 'VOICE', categoryName: 'VOICE CHANNELS' }
  });
  const chLive = await prisma.channel.create({
    data: { serverId: server.id, name: 'Co-Working Live 💻', type: 'STREAM', categoryName: 'LIVE STREAMS' }
  });

  console.log('Channels seeded.');

  // Add Initial Messages in welcome-chat
  await prisma.message.createMany({
    data: [
      {
        channelId: chGeneral.id,
        userId: user1.id,
        content: 'Welcome to Kiko! This is our main lobby. Everything here is running in real-time.'
      },
      {
        channelId: chGeneral.id,
        userId: user2.id,
        content: 'Hey Aaqil! Loving the glassmorphic design. Is it true that uploaded media only lasts 24 hours?'
      },
      {
        channelId: chGeneral.id,
        userId: user1.id,
        content: 'Yes! Total privacy focus. Any upload disappears after 24 hours. The messages stay, but the files vanish!'
      },
      {
        channelId: chGeneral.id,
        userId: user3.id,
        content: 'That is amazing. No cluttered cloud storage. Instant WebRTC streaming feels super responsive too!'
      }
    ]
  });

  console.log('Messages seeded.');
  console.log('Database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
