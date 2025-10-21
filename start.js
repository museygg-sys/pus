const { connectDB } = require('./db');
const { startBot } = require('./index');
const { startPaymentBot } = require('./payment-bot');

async function startServices() {
  try {
    await connectDB();
    console.log('✅ MongoDB connected');
    
    require('./server');
    console.log('✅ Web server started');
    
    // Démarrer les bots séquentiellement pour mieux voir les erreurs
    console.log('\n🚀 Starting payment bot...');
    await startPaymentBot();
    
    console.log('\n🚀 Starting userbot...');
    await startBot();
    
    console.log('\n✅ All services started!');
    console.log('📱 Userbot: Gère les conversations naturelles');
    console.log('💳 Payment Bot: Gère les paiements Telegram Stars');
    
  } catch (error) {
    console.error('❌ Failed to start services:', error);
    console.error('Error details:', error.stack);
    process.exit(1);
  }
}

startServices();
