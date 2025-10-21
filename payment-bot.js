require('dotenv').config();
const { Telegraf } = require('telegraf');
const { connectDB, savePayment, getMediaConfig, getPaymentRequest, deletePaymentRequest, cleanupExpiredTokens } = require('./db');
const fs = require('fs');
const path = require('path');

const PAYMENT_BOT_TOKEN = process.env.TELEGRAM_PAYMENT_BOT_TOKEN;

if (!PAYMENT_BOT_TOKEN) {
  console.error('❌ TELEGRAM_PAYMENT_BOT_TOKEN manquant dans les secrets !');
  console.log('📝 Ajoutez le token de votre bot de paiement dans les secrets Replit');
  process.exit(1);
}

const bot = new Telegraf(PAYMENT_BOT_TOKEN);

// Route /start avec paramètre pay_TOKEN
bot.start(async (ctx) => {
  const startPayload = ctx.startPayload;
  
  if (startPayload && startPayload.startsWith('pay_')) {
    const token = startPayload.substring(4);
    const paymentData = await getPaymentRequest(token);
    
    if (!paymentData) {
      await ctx.reply('❌ Token de paiement invalide ou expiré.');
      return;
    }
    
    // Vérifier que c'est le bon utilisateur
    if (paymentData.userId !== ctx.from.id.toString()) {
      await ctx.reply('❌ Ce token n\'est pas pour vous.');
      return;
    }
    
    return processPayment(ctx, paymentData);
  }
  
  await ctx.reply(
    `🤖 **Bot de Paiement Sécurisé**\n\n` +
    `Je gère les paiements pour les contenus premium.\n\n` +
    `💳 Paiements acceptés : Telegram Stars ⭐\n` +
    `🔒 Sécurisé et instantané\n\n` +
    `Vous recevrez un lien de paiement depuis le compte principal.`,
    { parse_mode: 'Markdown' }
  );
});

// Fonction pour traiter un paiement
async function processPayment(ctx, paymentData) {
  
  const mediaDir = path.join(__dirname, 'media');
  const filePath = path.join(mediaDir, paymentData.file);
  
  if (!fs.existsSync(filePath)) {
    await ctx.reply('❌ Le fichier demandé n\'existe plus.');
    await deletePaymentRequest(paymentData.token);
    return;
  }
  
  const fileBasename = path.basename(paymentData.file);
  const mediaConfig = await getMediaConfig(fileBasename);
  let priceStars = paymentData.price || 250;
  
  if (mediaConfig && mediaConfig.price) {
    priceStars = mediaConfig.price;
  }
  
  const title = paymentData.title || 'Contenu Premium';
  const description = paymentData.description || 'Accédez à ce contenu exclusif';
  
  await ctx.reply(
    `💰 Prêt à acheter le contenu premium !\n\n` +
    `Prix : ${priceStars} ⭐ Stars\n\n` +
    `👇 Clique sur le bouton "Pay" en bas de la facture pour payer avec Telegram Stars`
  );
  
  const invoiceData = {
    title: title,
    description: description,
    payload: paymentData.token,
    provider_token: '',
    currency: 'XTR',
    prices: [{ label: title, amount: priceStars }]
  };
  
  await ctx.replyWithInvoice(invoiceData);
}

// Gestion des pre-checkout queries
bot.on('pre_checkout_query', async (ctx) => {
  try {
    const token = ctx.preCheckoutQuery.invoice_payload;
    
    const paymentData = await getPaymentRequest(token);
    if (!paymentData) {
      await ctx.answerPreCheckoutQuery(false, 'Token de paiement expiré.');
      return;
    }
    
    const mediaDir = path.join(__dirname, 'media');
    const filePath = path.join(mediaDir, paymentData.file);
    
    if (!fs.existsSync(filePath)) {
      await ctx.answerPreCheckoutQuery(false, 'Le fichier demandé n\'existe plus.');
      return;
    }
    
    await ctx.answerPreCheckoutQuery(true);
  } catch (error) {
    console.error('Pre-checkout error:', error);
    await ctx.answerPreCheckoutQuery(false, 'Une erreur est survenue lors de la vérification du paiement.');
  }
});

// Gestion des paiements réussis
bot.on('successful_payment', async (ctx) => {
  try {
    const payment = ctx.message.successful_payment;
    const token = payment.invoice_payload;
    
    const paymentData = await getPaymentRequest(token);
    if (!paymentData) {
      await ctx.reply('❌ Token de paiement expiré. Contactez le support.');
      return;
    }
    
    console.log(`✅ Paiement reçu : ${payment.total_amount} ⭐ de ${ctx.from.id}`);
    
    // Enregistrer le paiement dans la DB (marque automatiquement l'utilisateur comme acheteur)
    await savePayment(
      paymentData.userId,
      paymentData.file,
      payment.total_amount
    );
    
    // Envoyer le contenu
    const mediaDir = path.join(__dirname, 'media');
    const filePath = path.join(mediaDir, paymentData.file);
    
    if (!fs.existsSync(filePath)) {
      await ctx.reply('❌ Le contenu n\'est plus disponible. Contactez le support pour un remboursement.');
      return;
    }
    
    await ctx.reply(`✅ Paiement réussi ! Merci pour votre achat de ${payment.total_amount} ⭐ Stars\n\n🔓 Voici votre contenu exclusif :`);
    
    const extension = path.extname(filePath).toLowerCase();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv'];
    
    if (imageExtensions.includes(extension)) {
      await ctx.replyWithPhoto(
        { source: filePath },
        { caption: '🎉 Votre contenu premium !' }
      );
    } else if (videoExtensions.includes(extension)) {
      await ctx.replyWithVideo(
        { source: filePath },
        { caption: '🎉 Votre contenu premium !' }
      );
    } else {
      await ctx.replyWithDocument(
        { source: filePath },
        { caption: '🎉 Votre contenu premium !' }
      );
    }
    
    // Nettoyer le token
    await deletePaymentRequest(token);
    
    console.log(`📦 Contenu envoyé à ${ctx.from.id} : ${paymentData.file}`);
  } catch (error) {
    console.error('Error processing successful payment:', error);
    await ctx.reply('❌ Une erreur est survenue. Votre paiement a été reçu, contactez le support.');
  }
});

// Nettoyer les tokens expirés toutes les 5 minutes
setInterval(async () => {
  await cleanupExpiredTokens();
}, 5 * 60 * 1000);

async function startPaymentBot() {
  try {
    console.log('🔧 Connecting payment bot to MongoDB...');
    await connectDB();
    console.log('✅ Payment bot connected to MongoDB');
    
    // Test token first
    console.log('🔧 Testing bot token...');
    const botInfo = await bot.telegram.getMe();
    console.log(`✅ Bot token valid: @${botInfo.username}`);
    
    // Lancer le bot en arrière-plan et capturer les erreurs
    console.log('🔧 Launching Telegraf bot...');
    let botReady = false;
    let launchFailed = false;
    
    bot.launch({ dropPendingUpdates: true })
      .then(() => {
        console.log('✅ Telegraf long polling connected');
        botReady = true;
      })
      .catch(err => {
        console.error('❌ Payment bot launch failed:', err.message);
        launchFailed = true;
        if (!botReady) {
          console.error('💀 CRITICAL: Payment bot failed to start!');
          process.exit(1);
        } else {
          console.error('💀 Payment bot polling stopped! Restarting...');
          process.exit(1);
        }
      });
    
    // Attendre et vérifier la santé du bot plusieurs fois sur 8 secondes
    console.log('🔧 Waiting for bot to be ready...');
    for (let i = 0; i < 4; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (launchFailed) {
        throw new Error('Payment bot launch failed during startup');
      }
      
      // Vérifier que le bot répond toujours
      try {
        await bot.telegram.getMe();
        console.log(`✅ Health check ${i+1}/4 passed`);
      } catch (healthError) {
        throw new Error(`Payment bot health check failed: ${healthError.message}`);
      }
    }
    
    console.log(`💳 Payment bot @${botInfo.username} is ready and healthy!`);
    console.log('✅ Payment bot fully started!');
    
    botReady = true;
    return bot;
  } catch (error) {
    console.error('❌ Error starting payment bot:', error.message);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = { startPaymentBot };
