import prisma from './backend/src/prisma.js';

async function main() {
  const messages = await prisma.message.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      user: { select: { username: true } },
      receiver: { select: { username: true } }
    }
  });

  console.log('Last 20 messages in database:');
  messages.forEach(m => {
    console.log(`ID: ${m.id} | Sender: ${m.user.username} | Receiver: ${m.receiver?.username || 'N/A'} | ChannelId: ${m.channelId || 'N/A'} | Content: "${m.content}"`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
