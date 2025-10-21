const { MongoClient } = require('mongodb');

let client;
let db;
let messagesCollection;
let mediaConfigCollection;
let pinnedMessagesCollection;
let paymentsCollection;
let botConfigCollection;

async function connectDB() {
  try {
    client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    db = client.db('telegram_bot');
    messagesCollection = db.collection('messages');
    mediaConfigCollection = db.collection('media_config');
    pinnedMessagesCollection = db.collection('pinned_messages');
    paymentsCollection = db.collection('payments');
    botConfigCollection = db.collection('bot_config');
    
    await messagesCollection.createIndex({ user_id: 1, timestamp: -1 });
    await mediaConfigCollection.createIndex({ filename: 1 });
    await paymentsCollection.createIndex({ user_id: 1, timestamp: -1 });
    
    const defaultPhases = [
      { 
        name: 'PHASE_1', 
        description: 'DISCUSSION LÉGÈRE - Connexion naturelle, style amicale, emojis légers, PAS de contenu sexy. Exemples: "Hey 😊", "T\'étais en train de faire quoi ?", "Tu fais quoi ce soir ?"', 
        messageCount: 5 
      },
      { 
        name: 'PHASE_2', 
        description: 'SÉDUCTION / DIRTY TALK - Sexualiser la conversation progressivement, style plus chaud 😏, sous-entendus. Exemples: "T\'as un côté qui me plaît", "Tu m\'imagines en ce moment ?", "J\'suis dans mon lit là…"', 
        messageCount: 8 
      },
      { 
        name: 'PHASE_3', 
        description: 'ENVOI DU PREMIER SELFIE - Après 2-3 messages de dirty talk, envoyer au hasard: {"action":"send_media","category":"free","file":"selfie.jpg"} OU {"action":"send_media","category":"free","file":"selfie2.jpg"} OU {"action":"send_media","category":"free","file":"selfie3.jpg"} OU {"action":"send_media","category":"free","file":"selfie4.jpg"} puis écrire: "Je suis seule là… tu viendrais ? 😘"', 
        messageCount: 11 
      },
      { 
        name: 'PHASE_4', 
        description: 'ENVOI PHOTO/VIDEO PAYANTE - Si utilisateur réagit positivement, envoyer au hasard: {"action":"send_media","category":"pay","file":"prophoto1.jpg"} OU {"action":"send_media","category":"pay","file":"provideo1.mp4"}. Écrire avant/après: "Celle-là elle est trop chaude… mais je peux pas la laisser gratuite 🥵"', 
        messageCount: 15 
      },
      { 
        name: 'PHASE_5', 
        description: 'CONTENU EXCLUSIF VIDEO - Si utilisateur achète, proposer video exclusif: "Si tu veux je t\'en fais une encore plus perso 👀". Envoyer au hasard: {"action":"send_media","category":"pay","file":"provideo2.mp4"} OU {"action":"send_media","category":"pay","file":"provideo3.mp4"} OU {"action":"send_media","category":"pay","file":"prophoto2.jpg"}', 
        messageCount: 999 
      }
    ];
    
    await botConfigCollection.updateOne(
      { _id: 'main' },
      { 
        $set: { 
          responseDelay: { min: 2, max: 5 },
          humanMode: { enabled: false, delayMin: 5, delayMax: 10 },
          gmtOffset: 1,
          phases: defaultPhases,
          userbot: {
            apiId: '',
            apiHash: '',
            phoneNumber: '',
            sessionString: ''
          }
        } 
      },
      { upsert: true }
    );
    
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function saveMessage(userId, message, from) {
  try {
    const doc = {
      user_id: userId,
      message: message,
      from: from,
      timestamp: new Date()
    };
    
    await messagesCollection.insertOne(doc);
    return doc;
  } catch (error) {
    console.error('Error saving message:', error);
    throw error;
  }
}

async function getLastMessages(userId, limit = 20) {
  try {
    const messages = await messagesCollection
      .find({ user_id: userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
    
    return messages.reverse();
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

async function getStats() {
  try {
    const totalMessages = await messagesCollection.countDocuments();
    const totalUsers = await messagesCollection.distinct('user_id');
    const userMessages = await messagesCollection.countDocuments({ from: 'user' });
    const aiMessages = await messagesCollection.countDocuments({ from: 'ai' });
    
    const recentMessages = await messagesCollection
      .find()
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();
    
    return {
      totalMessages,
      totalUsers: totalUsers.length,
      userMessages,
      aiMessages,
      recentMessages
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return {
      totalMessages: 0,
      totalUsers: 0,
      userMessages: 0,
      aiMessages: 0,
      recentMessages: []
    };
  }
}

async function getAllUsers() {
  try {
    const users = await messagesCollection.aggregate([
      {
        $group: {
          _id: '$user_id',
          messageCount: { $sum: 1 },
          lastMessage: { $max: '$timestamp' }
        }
      },
      {
        $sort: { lastMessage: -1 }
      }
    ]).toArray();
    
    return users.map(user => ({
      userId: user._id,
      messageCount: user.messageCount,
      lastMessage: user.lastMessage
    }));
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

async function getUserConversation(userId, limit = 50) {
  try {
    const messages = await messagesCollection
      .find({ user_id: userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
    
    return messages.reverse();
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return [];
  }
}

async function deleteUserMessages(userId) {
  try {
    const result = await messagesCollection.deleteMany({ user_id: userId });
    return result.deletedCount;
  } catch (error) {
    console.error('Error deleting messages:', error);
    throw error;
  }
}

async function saveMediaConfig(filename, category, price = null) {
  try {
    const doc = {
      filename: filename,
      category: category,
      price: price,
      createdAt: new Date()
    };
    
    await mediaConfigCollection.updateOne(
      { filename: filename },
      { $set: doc },
      { upsert: true }
    );
    return doc;
  } catch (error) {
    console.error('Error saving media config:', error);
    throw error;
  }
}

async function getMediaConfig(filename) {
  try {
    return await mediaConfigCollection.findOne({ filename: filename });
  } catch (error) {
    console.error('Error fetching media config:', error);
    return null;
  }
}

async function getAllMediaConfigs() {
  try {
    return await mediaConfigCollection.find().toArray();
  } catch (error) {
    console.error('Error fetching all media configs:', error);
    return [];
  }
}

async function deleteMediaConfig(filename) {
  try {
    await mediaConfigCollection.deleteOne({ filename: filename });
  } catch (error) {
    console.error('Error deleting media config:', error);
    throw error;
  }
}

async function updateMediaPrice(filename, price) {
  try {
    const result = await mediaConfigCollection.updateOne(
      { filename: filename },
      { 
        $set: { 
          price: price,
          category: 'pay'
        },
        $setOnInsert: { 
          filename: filename,
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
    return result.matchedCount > 0 || result.upsertedCount > 0;
  } catch (error) {
    console.error('Error updating media price:', error);
    throw error;
  }
}

async function savePinnedMessage(message) {
  try {
    const doc = {
      message: message,
      createdAt: new Date()
    };
    
    await pinnedMessagesCollection.deleteMany({});
    await pinnedMessagesCollection.insertOne(doc);
    return doc;
  } catch (error) {
    console.error('Error saving pinned message:', error);
    throw error;
  }
}

async function getPinnedMessage() {
  try {
    return await pinnedMessagesCollection.findOne();
  } catch (error) {
    console.error('Error fetching pinned message:', error);
    return null;
  }
}

async function savePayment(userId, fileName, amount) {
  try {
    const doc = {
      user_id: userId,
      file: fileName,
      amount: amount,
      timestamp: new Date()
    };
    
    await paymentsCollection.insertOne(doc);
    return doc;
  } catch (error) {
    console.error('Error saving payment:', error);
    throw error;
  }
}

async function getPaymentStats() {
  try {
    const totalPayments = await paymentsCollection.countDocuments();
    const totalRevenue = await paymentsCollection.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]).toArray();
    
    const recentPayments = await paymentsCollection
      .find()
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();
    
    return {
      totalPayments,
      totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
      recentPayments
    };
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    return {
      totalPayments: 0,
      totalRevenue: 0,
      recentPayments: []
    };
  }
}

async function deleteAllData() {
  try {
    const messagesDeleted = await messagesCollection.deleteMany({});
    const mediaConfigDeleted = await mediaConfigCollection.deleteMany({});
    const paymentsDeleted = await paymentsCollection.deleteMany({});
    
    return {
      messagesDeleted: messagesDeleted.deletedCount,
      mediaConfigDeleted: mediaConfigDeleted.deletedCount,
      paymentsDeleted: paymentsDeleted.deletedCount,
      total: messagesDeleted.deletedCount + mediaConfigDeleted.deletedCount + paymentsDeleted.deletedCount
    };
  } catch (error) {
    console.error('Error deleting all data:', error);
    throw error;
  }
}

async function closeDB() {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

async function getBotConfig() {
  try {
    return await botConfigCollection.findOne({ _id: 'main' });
  } catch (error) {
    console.error('Error fetching bot config:', error);
    return {
      responseDelay: { min: 2, max: 5 },
      phases: [
        { name: 'introduction', description: 'Faire connaissance, poser des questions simples', messageCount: 5 },
        { name: 'engagement', description: 'Créer de l\'intérêt, partager un peu de contenu gratuit', messageCount: 10 },
        { name: 'premium', description: 'Proposer du contenu premium si l\'utilisateur est intéressé', messageCount: 999 }
      ]
    };
  }
}

async function updateBotConfig(config) {
  try {
    await botConfigCollection.updateOne(
      { _id: 'main' },
      { $set: config },
      { upsert: true }
    );
    return true;
  } catch (error) {
    console.error('Error updating bot config:', error);
    throw error;
  }
}

async function userHasPurchased(userId) {
  try {
    const purchaseCount = await paymentsCollection.countDocuments({ 
      user_id: userId
    });
    return purchaseCount > 0;
  } catch (error) {
    console.error('Error checking user purchases:', error);
    return false;
  }
}

async function getUserPhase(userId) {
  try {
    const messageCount = await messagesCollection.countDocuments({ 
      user_id: userId,
      from: 'user'
    });
    
    const config = await getBotConfig();
    const phases = config.phases || [];
    
    let currentPhase = phases[phases.length - 1];
    for (const phase of phases) {
      if (messageCount <= phase.messageCount) {
        currentPhase = phase;
        break;
      }
    }
    
    const hasPurchased = await userHasPurchased(userId);
    
    return { phase: currentPhase, messageCount, hasPurchased };
  } catch (error) {
    console.error('Error getting user phase:', error);
    return { phase: { name: 'introduction', description: 'Faire connaissance' }, messageCount: 0, hasPurchased: false };
  }
}

async function updateUserbotConfig(config) {
  try {
    await botConfigCollection.updateOne(
      { _id: 'main' },
      { 
        $set: { 
          userbot: {
            apiId: config.apiId,
            apiHash: config.apiHash,
            phoneNumber: config.phoneNumber,
            sessionString: config.sessionString
          }
        } 
      },
      { upsert: true }
    );
    return true;
  } catch (error) {
    console.error('Error updating userbot config:', error);
    throw error;
  }
}

async function getUserbotConfig() {
  try {
    const config = await botConfigCollection.findOne({ _id: 'main' });
    return config?.userbot || {
      apiId: '',
      apiHash: '',
      phoneNumber: '',
      sessionString: ''
    };
  } catch (error) {
    console.error('Error getting userbot config:', error);
    return {
      apiId: '',
      apiHash: '',
      phoneNumber: '',
      sessionString: ''
    };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GESTION DES TOKENS DE PAIEMENT (pour bot hybride)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function createPaymentToken(userId, file, price, title = 'Contenu Premium', description = 'Accédez à ce contenu exclusif') {
  try {
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    const paymentRequest = {
      token,
      userId,
      file,
      price,
      title,
      description,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    };
    
    await db.collection('payment_requests').insertOne(paymentRequest);
    
    return token;
  } catch (error) {
    console.error('Error creating payment token:', error);
    throw error;
  }
}

async function getPaymentRequest(token) {
  try {
    const request = await db.collection('payment_requests').findOne({ 
      token,
      expiresAt: { $gt: new Date() }
    });
    return request;
  } catch (error) {
    console.error('Error getting payment request:', error);
    return null;
  }
}

async function deletePaymentRequest(token) {
  try {
    await db.collection('payment_requests').deleteOne({ token });
  } catch (error) {
    console.error('Error deleting payment request:', error);
  }
}

// Nettoyer les tokens expirés (à appeler périodiquement)
async function cleanupExpiredTokens() {
  try {
    const result = await db.collection('payment_requests').deleteMany({
      expiresAt: { $lt: new Date() }
    });
    if (result.deletedCount > 0) {
      console.log(`🧹 Cleaned up ${result.deletedCount} expired payment tokens`);
    }
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
  }
}

module.exports = {
  connectDB,
  saveMessage,
  getLastMessages,
  getStats,
  getAllUsers,
  getUserConversation,
  deleteUserMessages,
  deleteAllData,
  saveMediaConfig,
  getMediaConfig,
  getAllMediaConfigs,
  deleteMediaConfig,
  updateMediaPrice,
  savePinnedMessage,
  getPinnedMessage,
  savePayment,
  getPaymentStats,
  getBotConfig,
  updateBotConfig,
  updateUserbotConfig,
  getUserbotConfig,
  getUserPhase,
  userHasPurchased,
  createPaymentToken,
  getPaymentRequest,
  deletePaymentRequest,
  cleanupExpiredTokens,
  closeDB
};
