import prisma from './backend/src/prisma.js';

async function main() {
  const messages = await prisma.message.findMany({
    where: { content: "hi" },
    orderBy: { createdAt: 'asc' },
    include: {
      user: { select: { username: true } },
      receiver: { select: { username: true } }
    }
  });

  console.log('"hi" messages in database:');
  messages.forEach(m => {
    console.log(`ID: ${m.id} | Sender: ${m.user.username} | Receiver: ${m.receiver?.username || 'N/A'} | CreatedAt: ${m.createdAt.toISOString()}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
