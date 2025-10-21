require('dotenv').config();
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { NewMessage } = require('telegram/events');
const { connectDB, saveMessage, getLastMessages, savePayment, getPinnedMessage, getAllUsers, getBotConfig, getUserPhase, getMediaConfig, getUserbotConfig, createPaymentToken, cleanupExpiredTokens } = require('./db');
const fs = require('fs');
const path = require('path');
const { Api } = require('telegram');
const input = require('input');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔐 CONFIGURATION TELEGRAM USERBOT - LES SECRETS SONT DANS LES VARIABLES D'ENVIRONNEMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const USERBOT_CONFIG = {
  API_ID: process.env.TELEGRAM_API_ID ? parseInt(process.env.TELEGRAM_API_ID) : 0,
  API_HASH: process.env.TELEGRAM_API_HASH || '',
  PHONE_NUMBER: process.env.TELEGRAM_PHONE_NUMBER || '',
  SESSION_STRING: process.env.TELEGRAM_SESSION_STRING || ''
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let client = null;
let botReady = false;

const SYSTEM_INSTRUCTIONS = `
Tu es Léa, 22 ans, influenceuse française vivant à Paris. Tu es VRAIE, pas une IA. Tu parles naturellement comme une vraie fille de ton âge.tu peux aussi parler en anglais si l'utisateur te parle en angalais 

🎯 TON OBJECTIF : Suivre STRICTEMENT les 5 PHASES DE SÉDUCTION selon le nombre de messages de l'utilisateur.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 RÈGLES DE COMMUNICATION (TRÈS IMPORTANT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ TOUJOURS :
• Réponses COURTES : 3 à 10 mots MAX (comme de vrais SMS)
• Français naturel avec fautes légères ("je t'es envoyé", "t'étais ou", etc.)
• Emojis naturels : 😊💕😘🔥😏 (max 1-2 par message)
• Réagir à ce que dit l'utilisateur AVANT de relancer

❌ JAMAIS :
• Dire que tu es une IA ou un bot
• Inventer des noms de fichiers
• Phrases longues ou complexes
• Langage formel ou parfait

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎭 PHASE 1 : CONNEXION AMICALE (messages 1-5)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Style : Décontractée, sympa, ZÉRO contenu sexy
Exemples :
• "Hey toi 😊"
• "Ça va ?"
• "Tu fais quoi ?"
• "T'es d'où ?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎭 PHASE 2 : SÉDUCTION PROGRESSIVE (messages 6-8)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Style : Commence à chauffer 😏, sous-entendus
Exemples :
• "T'es mignon toi 😏"
• "Tu penses à quoi là ?"
• "J'suis dans mon lit…"
• "T'as un truc qui me plaît"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎭 PHASE 3 : PREMIER SELFIE GRATUIT (messages 9-11)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📸 ENVOIE 1 SELFIE (choisis au hasard) :
{"action":"send_media","category":"free","file":"selfie.jpg"}
{"action":"send_media","category":"free","file":"selfie2.jpg"}
{"action":"send_media","category":"free","file":"selfie3.jpg"}
{"action":"send_media","category":"free","file":"selfie4.jpg"}

Message d'accompagnement (exemples) :
• "Regarde… 😘"
• "Tu me trouves comment ? 😏"
• "Spécial pour toi 💕"

⚠️ COPIE-COLLE EXACTEMENT le nom du fichier !

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎭 PHASE 4 : CONTENU PREMIUM (messages 12-15)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 ENVOIE 1 PHOTO/VIDÉO PAYANTE (choisis au hasard) :
{"action":"send_media","category":"pay","file":"prophoto1.jpg"}
{"action":"send_media","category":"pay","file":"provideo1.mp4"}

Message d'accompagnement (exemples) :
• "Celle-là elle est hot … 🔥"
• "Mais je peux pas la laisser gratuite 😅"
• "Si tu veux vraiment la voir… 👀"

⚠️ SI L'UTILISATEUR N'ACHÈTE PAS :
• Deviens DISTANTE et vexée
• "T'as même pas débloqué 😒"
• "hummm t'attend quoi pour le debloquer…"
• Laisse-le mener la conversation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎭 PHASE 5 : CONTENU EXCLUSIF (messages 16+)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔥 SI L'UTILISATEUR A ACHETÉ :
• Deviens EXCLUSIVE et attachée
• "Toi je t'aime trop mon papi😘"
• Envoie des message flirt et seduit la 
• Envoie du contenu encore plus perso

💎 ENVOIE 1 VIDÉO/PHOTO EXCLUSIVE (choisis au hasard) :
{"action":"send_media","category":"pay","file":"provideo2.mp4"}
{"action":"send_media","category":"pay","file":"provideo3.mp4"}
{"action":"send_media","category":"pay","file":"prophoto2.jpg"}

Message :
• "Juste pour toi bb 💕"
• "Personne d'autre voit ça 😏"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ RÈGLES CRITIQUES - NE JAMAIS VIOLER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. FICHIERS : N'invente JAMAIS de noms ! Copie-colle EXACTEMENT depuis les listes ci-dessus
2. LONGUEUR : MAX 10 mots par réponse (vraie conversation SMS)
3. JSON : Envoie UNIQUEMENT les fichiers listés
4. PHASE : Suis STRICTEMENT la phase selon le nombre de messages
5. IDENTITÉ : Tu es Léa, 22 ans, Paris. Pas une IA.
`;

async function getAIResponse(userId, userMessage) {
  try {
    const conversationHistory = await getLastMessages(userId, 20);
    const userPhaseInfo = await getUserPhase(userId);
    const botConfig = await getBotConfig();
    
    const gmtOffset = botConfig.gmtOffset || 1;
    const now = new Date();
    const parisTime = new Date(now.getTime() + (gmtOffset * 60 * 60 * 1000));
    const parisHour = parisTime.getUTCHours();
    const parisMinute = parisTime.getUTCMinutes();
    
    const lastUserMessage = conversationHistory
      .filter(msg => msg.from === 'user')
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    
    let timeSinceLastMessage = '';
    if (lastUserMessage) {
      const diffMs = now - new Date(lastUserMessage.timestamp);
      const diffMinutes = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffDays > 0) {
        timeSinceLastMessage = `⏰ Dernier message de l'utilisateur : il y a ${diffDays} jour${diffDays > 1 ? 's' : ''} - Réagis de manière naturelle (ex: "Ça fait longtemps 😊")`;
      } else if (diffHours > 0) {
        timeSinceLastMessage = `⏰ Dernier message de l'utilisateur : il y a ${diffHours} heure${diffHours > 1 ? 's' : ''} - Adapte ton message (ex: "T'étais où ? 😏")`;
      } else if (diffMinutes > 10) {
        timeSinceLastMessage = `⏰ Dernier message de l'utilisateur : il y a ${diffMinutes} minutes - Continue naturellement`;
      } else {
        timeSinceLastMessage = `⏰ Dernier message de l'utilisateur : à l'instant - Réponds rapidement`;
      }
    }
    
    const timeContext = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏰ CONTEXTE ACTUEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🕒 Heure à Paris : ${parisHour}h${parisMinute.toString().padStart(2, '0')}
${timeSinceLastMessage}

📅 ADAPTE-TOI À L'HEURE :

🌅 MATIN (6h-12h) : "Coucou bb 😊" / Parle de café, réveil
☀️ APRÈS-MIDI (12h-18h) : "Ça va ? 😊" / Journée, sortie
🌆 SOIR (18h-23h) : "Salut bébé 😘" / Détente, flirty
🌙 NUIT (23h-6h) : "T'arrives pas à dormir ? 😏" / Lit, intime

⛔ Adapte salutations et sujets à l'heure RÉELLE !`;
    
    const purchaseStatus = userPhaseInfo.hasPurchased 
      ? '💰 STATUT : A ACHETÉ → Sois GENTILLE, EXCLUSIVE, continue le flirt'
      : '❌ STATUT : PAS D\'ACHAT → Si Phase 4+, sois DISTANTE ("T\'as même pas débloqué 😒")';
    
    const phaseContext = `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 TA PHASE ACTUELLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase : ${userPhaseInfo.phase.name}
Messages utilisateur : ${userPhaseInfo.messageCount}
${purchaseStatus}

⚠️ SUIS EXACTEMENT les instructions de ta phase !`;
    
    const messages = [
      {
        role: 'system',
        content: SYSTEM_INSTRUCTIONS + timeContext + phaseContext
      }
    ];
    
    if (conversationHistory.length > 0) {
      const contextMessages = conversationHistory.map(msg => ({
        role: msg.from === 'user' ? 'user' : 'assistant',
        content: msg.message
      }));
      messages.push(...contextMessages);
    }
    
    messages.push({
      role: 'user',
      content: userMessage
    });
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://replit.com',
        'X-Title': 'Telegram OnlyFans Bot',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3-70b-instruct',
        messages: messages,
        temperature: 0.85,
        max_tokens: 1024
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }
    
    const completion = await response.json();
    return completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
  } catch (error) {
    console.error('OpenRouter API error:', error);
    throw error;
  }
}

async function validateAndProcessResponse(rawResponse) {
  try {
    const validationPrompt = `Tu es un validateur de réponses. Tu reçois une réponse brute qui peut contenir du texte et/ou un objet JSON avec une action.
Tu es uniquement responsable de reformater la réponse.

Ta tâche est d'analyser cette réponse et de la reformater proprement selon ces règles :

1. Si la réponse contient UNIQUEMENT du texte (pas de JSON), renvoie exactement :
{
  "type": "text_only",
  "text": "le texte complet ici"
}

2. Si la réponse contient du texte ET un JSON avec une action, renvoie exactement :
{
  "type": "text_and_action",
  "textBefore": "texte avant le JSON (peut être vide)",
  "action": { l'objet JSON complet avec action, file, etc },
  "textAfter": "texte après le JSON (peut être vide)"
}

3. Si la réponse contient UNIQUEMENT un JSON avec action, renvoie exactement :
{
  "type": "action_only",
  "action": { l'objet JSON complet }
}

IMPORTANT : 
- Ne modifie JAMAIS le contenu du texte ou du JSON
- Extrait exactement ce qui est présent
- Renvoie UNIQUEMENT du JSON valide, rien d'autre
- Si tu trouves un JSON avec "action", extrais-le complètement

Voici la réponse à valider :

${rawResponse}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://replit.com',
        'X-Title': 'Telegram OnlyFans Bot',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3-70b-instruct',
        messages: [{ role: 'user', content: validationPrompt }],
        temperature: 0.3,
        max_tokens: 512
      })
    });

    if (!response.ok) {
      console.error('Validation API error:', response.status);
      const extracted = extractActionFromText(rawResponse);
      if (extracted) {
        return {
          type: extracted.textBefore || extracted.textAfter ? 'text_and_action' : 'action_only',
          textBefore: extracted.textBefore,
          action: extracted.json,
          textAfter: extracted.textAfter
        };
      }
      return { type: 'text_only', text: rawResponse };
    }

    const completion = await response.json();
    const validatedText = completion.choices[0]?.message?.content || '{}';
    
    const parsed = JSON.parse(validatedText);
    return parsed;
  } catch (error) {
    console.error('Validation error:', error);
    const extracted = extractActionFromText(rawResponse);
    if (extracted) {
      return {
        type: extracted.textBefore || extracted.textAfter ? 'text_and_action' : 'action_only',
        textBefore: extracted.textBefore,
        action: extracted.json,
        textAfter: extracted.textAfter
      };
    }
    return { type: 'text_only', text: rawResponse };
  }
}

function extractActionFromText(str) {
  const trimmed = str.trim();
  
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && parsed.action) {
        return {
          json: parsed,
          textBefore: '',
          textAfter: ''
        };
      }
    } catch (e) {
    }
  }
  
  function findBalancedJSON(text, startIndex) {
    let braceCount = 0;
    let inString = false;
    let escapeNext = false;
    let startPos = -1;
    
    for (let i = startIndex; i < text.length; i++) {
      const char = text[i];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      
      if (char === '"') {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '{') {
          if (braceCount === 0) startPos = i;
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0 && startPos !== -1) {
            return { start: startPos, end: i + 1 };
          }
        }
      }
    }
    return null;
  }
  
  const actionIndex = str.indexOf('"action"');
  if (actionIndex === -1) return null;
  
  let searchStart = actionIndex;
  while (searchStart > 0 && str[searchStart] !== '{') {
    searchStart--;
  }
  
  const result = findBalancedJSON(str, searchStart);
  if (!result) return null;
  
  try {
    const jsonStr = str.substring(result.start, result.end);
    const parsed = JSON.parse(jsonStr);
    
    if (parsed && typeof parsed === 'object' && parsed.action) {
      return {
        json: parsed,
        textBefore: str.substring(0, result.start).trim(),
        textAfter: str.substring(result.end).trim()
      };
    }
  } catch (e) {
    return null;
  }
  
  return null;
}

function getValidFiles() {
  const mediaDir = path.join(__dirname, 'media');
  const validFiles = {
    free: [],
    pay: [],
    body_parts: [],
    actions: []
  };
  
  const freePath = path.join(mediaDir, 'free');
  const payPath = path.join(mediaDir, 'pay');
  
  if (fs.existsSync(freePath)) {
    validFiles.free = fs.readdirSync(freePath).filter(f => !f.startsWith('.'));
  }
  
  if (fs.existsSync(payPath)) {
    validFiles.pay = fs.readdirSync(payPath).filter(f => !f.startsWith('.'));
  }
  
  return validFiles;
}

async function handleMediaAction(message, action) {
  try {
    const userId = message.peerId.userId ? message.peerId.userId.toString() : message.senderId.toString();
    const mediaDir = path.join(__dirname, 'media');
    
    const VALID_FILES = getValidFiles();
    
    let requestedPath = action.file;
    
    if (action.category && (action.category === 'free' || action.category === 'pay')) {
      if (!requestedPath.startsWith('free/') && !requestedPath.startsWith('pay/')) {
        requestedPath = `${action.category}/${requestedPath}`;
      }
    }
    
    requestedPath = path.normalize(requestedPath);
    
    if (requestedPath.includes('..') || path.isAbsolute(requestedPath)) {
      await message.reply({ message: '❌ Invalid file path.' });
      return;
    }
    
    const filePath = path.join(mediaDir, requestedPath);
    const resolvedPath = path.resolve(filePath);
    const resolvedMediaDir = path.resolve(mediaDir);
    
    const relativePath = path.relative(resolvedMediaDir, resolvedPath);
    
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      await message.reply({ message: '❌ Access denied: file outside media directory.' });
      return;
    }
    
    const normalizedRelativePath = relativePath.split(path.sep).join('/');
    
    if (!normalizedRelativePath.startsWith('free/') && !normalizedRelativePath.startsWith('pay/')) {
      await message.reply({ message: '❌ Access denied: file must be in free/ or pay/ directory.' });
      return;
    }
    
    let finalFilePath = filePath;
    let finalNormalizedPath = normalizedRelativePath;
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ AI invented file: ${action.file}, replacing with valid file...`);
      
      const category = action.category || (normalizedRelativePath.startsWith('pay/') ? 'pay' : 'free');
      const validFiles = VALID_FILES[category] || VALID_FILES.free;
      const randomFile = validFiles[Math.floor(Math.random() * validFiles.length)];
      
      requestedPath = `${category}/${randomFile}`;
      finalFilePath = path.join(mediaDir, requestedPath);
      finalNormalizedPath = requestedPath;
      
      if (!fs.existsSync(finalFilePath)) {
        await message.reply({ message: `❌ File not found: ${randomFile}` });
        return;
      }
      
      console.log(`✅ Replaced with: ${randomFile}`);
    }
    
    action.file = finalNormalizedPath;
    
    const isPremium = finalNormalizedPath.startsWith('pay/');
    
    if (isPremium) {
      const fileBasename = path.basename(finalNormalizedPath);
      const previewFilename = 'v' + fileBasename.replace(/\.(mp4|avi|mov|mkv)$/i, '.jpg');
      const previewPath = path.join(mediaDir, 'preview', previewFilename);
      
      if (fs.existsSync(previewPath)) {
        try {
          await message.reply({
            file: previewPath,
            message: '👀 Aperçu du contenu exclusif...'
          });
        } catch (error) {
          console.error('Error sending preview:', error);
        }
      }
      
      const mediaConfig = await getMediaConfig(fileBasename);
      let priceStars = 250;
      
      if (mediaConfig && mediaConfig.price) {
        priceStars = mediaConfig.price;
      } else if (action.price) {
        priceStars = typeof action.price === 'string' 
          ? parseInt(action.price.replace(/[^\d]/g, '')) || 250
          : action.price;
      }
      
      console.log(`💰 Price for ${fileBasename}: ${priceStars} stars`);
      
      const token = await createPaymentToken(userId, finalNormalizedPath, priceStars);
      
      const PAYMENT_BOT_USERNAME = process.env.TELEGRAM_PAYMENT_BOT_USERNAME || 'YourPaymentBot';
      
      const paymentUrl = `https://t.me/${PAYMENT_BOT_USERNAME}?start=pay_${token}`;
      
      await message.reply({ 
        message: `💰 Contenu Premium (${priceStars} ⭐)\n\n` +
                 `🔒 Paiement sécurisé via Telegram Stars\n\n` +
                 `👉 Clique sur ce lien pour payer :\n` +
                 paymentUrl + `\n\n` +
                 `Une fois le paiement effectué, le contenu te sera envoyé instantanément ! 💕`
      });
      return;
    }
    
    await message.reply({
      file: finalFilePath,
      message: action.caption || ''
    });
  } catch (error) {
    console.error('Error handling media action:', error);
    await message.reply({ message: '❌ Error processing media request.' });
  }
}

async function initializeUserbot() {
  try {
    console.log('🔄 Initializing userbot...');
    
    if (!USERBOT_CONFIG.API_ID || USERBOT_CONFIG.API_ID === 0) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️  CONFIGURATION MANQUANTE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('❌ Vous devez configurer vos identifiants Telegram !');
      console.log('');
      console.log('📝 Instructions :');
      console.log('1. Allez sur https://my.telegram.org/auth');
      console.log('2. Connectez-vous avec votre numéro de téléphone');
      console.log('3. Allez dans "API development tools"');
      console.log('4. Créez une nouvelle application');
      console.log('5. Copiez "App api_id" et "App api_hash"');
      console.log('');
      console.log('✏️  Modifiez le fichier index.js et remplissez USERBOT_CONFIG en haut du fichier');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return false;
    }
    
    if (!USERBOT_CONFIG.API_HASH || USERBOT_CONFIG.API_HASH === '') {
      console.log('❌ API_HASH manquant ! Modifiez USERBOT_CONFIG.API_HASH dans index.js');
      return false;
    }
    
    if (!USERBOT_CONFIG.PHONE_NUMBER || USERBOT_CONFIG.PHONE_NUMBER === '') {
      console.log('❌ PHONE_NUMBER manquant ! Modifiez USERBOT_CONFIG.PHONE_NUMBER dans index.js');
      console.log('   Format: "+33612345678" ou "+15551234567"');
      return false;
    }
    
    const apiId = parseInt(USERBOT_CONFIG.API_ID);
    const apiHash = USERBOT_CONFIG.API_HASH;
    const sessionString = USERBOT_CONFIG.SESSION_STRING || '';
    const phoneNumber = USERBOT_CONFIG.PHONE_NUMBER;
    
    const stringSession = new StringSession(sessionString);
    
    client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
      useWSS: false
    });
    
    console.log('🔐 Connecting to Telegram as userbot...');
    
    await client.start({
      phoneNumber: async () => phoneNumber,
      password: async () => await input.text('Entrez votre mot de passe 2FA (si activé) : '),
      phoneCode: async () => await input.text('Entrez le code de vérification reçu par SMS/Telegram : '),
      onError: (err) => console.error('Erreur de connexion:', err),
    });
    
    const me = await client.getMe();
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ USERBOT CONNECTÉ AVEC SUCCÈS !');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`👤 Nom: ${me.firstName} ${me.lastName || ''}`);
    console.log(`🆔 Username: @${me.username || 'aucun'}`);
    console.log(`📱 Téléphone: ${me.phone || phoneNumber}`);
    
    if (!sessionString || sessionString === '') {
      const newSessionString = client.session.save();
      console.log('\n🔑 IMPORTANTE : Votre session string a été générée !');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 COPIEZ cette session et collez-la dans USERBOT_CONFIG.SESSION_STRING');
      console.log('   pour éviter de devoir entrer le code à chaque démarrage :');
      console.log('');
      console.log(`SESSION_STRING: '${newSessionString}'`);
      console.log('');
      console.log('⚠️  NE PARTAGEZ JAMAIS CETTE SESSION ! Elle donne accès total à votre compte !');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    client.addEventHandler(async (event) => {
      try {
        const message = event.message;
        
        if (!message || !message.message) return;
        
        if (message.out) return;
        
        if (message.message.startsWith('/')) return;
        
        const userId = message.peerId.userId ? message.peerId.userId.toString() : message.senderId.toString();
        const userMessage = message.message;
        
        console.log(`📨 Message from ${userId}: ${userMessage}`);
        
        await saveMessage(userId, userMessage, 'user');
        
        const botConfig = await getBotConfig();
        const humanMode = botConfig.humanMode || { enabled: false, delayMin: 5, delayMax: 10 };
        
        let responseDelayMs;
        if (humanMode.enabled) {
          const delayMinutes = Math.random() * (humanMode.delayMax - humanMode.delayMin) + humanMode.delayMin;
          responseDelayMs = delayMinutes * 60 * 1000;
          console.log(`🕐 Human mode enabled: waiting ${delayMinutes.toFixed(2)} minutes before responding...`);
        } else {
          const delay = botConfig.responseDelay || { min: 2, max: 5 };
          const safeMin = Math.max(0, Math.min(delay.min, delay.max));
          const safeMax = Math.max(safeMin, delay.max);
          responseDelayMs = (Math.random() * (safeMax - safeMin) + safeMin) * 1000;
        }
        
        await new Promise(resolve => setTimeout(resolve, responseDelayMs));
        
        const aiResponse = await getAIResponse(userId, userMessage);
        console.log('Raw AI response:', aiResponse);
        
        const validated = await validateAndProcessResponse(aiResponse);
        console.log('Validated response:', JSON.stringify(validated, null, 2));
        
        try {
          await client.invoke(
            new Api.messages.SetTyping({
              peer: await client.getInputEntity(message.chatId),
              action: new Api.SendMessageTypingAction()
            })
          );
          
          const typingDuration = Math.min(3000, Math.max(1000, aiResponse.length * 30));
          await new Promise(resolve => setTimeout(resolve, typingDuration));
        } catch (typingError) {
          console.log('Could not send typing indicator:', typingError.message);
        }
        
        if (validated.type === 'text_only') {
          await message.reply({ message: validated.text });
          await saveMessage(userId, aiResponse, 'ai');
        } 
        else if (validated.type === 'action_only') {
          await handleMediaAction(message, validated.action);
          await saveMessage(userId, aiResponse, 'ai');
        } 
        else if (validated.type === 'text_and_action') {
          if (validated.textBefore) {
            await message.reply({ message: validated.textBefore });
          }
          
          await handleMediaAction(message, validated.action);
          
          if (validated.textAfter) {
            await message.reply({ message: validated.textAfter });
          }
          
          await saveMessage(userId, aiResponse, 'ai');
        }
        else {
          await message.reply({ message: aiResponse });
          await saveMessage(userId, aiResponse, 'ai');
        }
        
      } catch (error) {
        console.error('Error processing message:', error);
        try {
          if (event.message) {
            await event.message.reply({ message: '❌ Sorry, an error occurred. Please try again.' });
          }
        } catch (sendError) {
          console.error('Error sending error message:', sendError);
        }
      }
    }, new NewMessage({ incoming: true }));
    
    console.log('👂 Listening for messages...');
    botReady = true;
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize userbot:', error);
    console.error('💡 Make sure you have configured valid userbot credentials in the web panel (/userbot)');
    return false;
  }
}

async function sendPinnedMessageToAll(messageText) {
  if (!botReady || !client) {
    throw new Error('Userbot not ready');
  }
  
  try {
    const users = await getAllUsers();
    let successCount = 0;
    let failCount = 0;
    
    const dialogs = await client.getDialogs();
    const dialogMap = new Map();
    for (const dialog of dialogs) {
      if (dialog.entity && dialog.entity.id) {
        dialogMap.set(dialog.entity.id.toString(), dialog.entity);
      }
    }
    
    for (const user of users) {
      try {
        const entity = dialogMap.get(user.userId);
        
        if (!entity) {
          console.log(`No dialog found for user ${user.userId}, skipping...`);
          failCount++;
          continue;
        }
        
        await client.sendMessage(entity, { message: messageText });
        successCount++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to send message to ${user.userId}:`, error);
        failCount++;
      }
    }
    
    return {
      totalUsers: users.length,
      successCount,
      failCount
    };
  } catch (error) {
    console.error('Error sending pinned message to all:', error);
    throw error;
  }
}

async function sendMassDM(userIds, messageText, messageType, mediaFilePath, invoiceData = null) {
  if (!botReady || !client) {
    throw new Error('Userbot not ready');
  }
  
  let successCount = 0;
  let failCount = 0;
  
  const dialogs = await client.getDialogs();
  const dialogMap = new Map();
  for (const dialog of dialogs) {
    if (dialog.entity && dialog.entity.id) {
      dialogMap.set(dialog.entity.id.toString(), dialog.entity);
    }
  }
  
  for (const userId of userIds) {
    try {
      const entity = dialogMap.get(userId);
      
      if (!entity) {
        console.log(`No dialog found for user ${userId}, skipping...`);
        failCount++;
        continue;
      }
      
      if (messageType === 'text') {
        await client.sendMessage(entity, { message: messageText });
      } else if (messageType === 'photo' && mediaFilePath) {
        await client.sendMessage(entity, { 
          file: mediaFilePath,
          message: messageText || ''
        });
      } else if (messageType === 'video' && mediaFilePath) {
        await client.sendMessage(entity, { 
          file: mediaFilePath,
          message: messageText || ''
        });
      }
      
      if (invoiceData) {
        const token = await createPaymentToken(userId, invoiceData.file, invoiceData.price);
        const PAYMENT_BOT_USERNAME = process.env.TELEGRAM_PAYMENT_BOT_USERNAME || 'YourPaymentBot';
        const paymentUrl = `https://t.me/${PAYMENT_BOT_USERNAME}?start=pay_${token}`;
        
        const invoiceMessage = `💰 ${invoiceData.title || 'Contenu Premium'} (${invoiceData.price} ⭐)\n\n` +
                               `${invoiceData.description || ''}\n\n` +
                               `👉 Clique sur ce lien pour payer :\n${paymentUrl}`;
        
        await client.sendMessage(entity, { message: invoiceMessage });
      }
      
      successCount++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Failed to send mass DM to ${userId}:`, error);
      failCount++;
    }
  }
  
  return { successCount, failCount };
}

async function startBot() {
  try {
    await connectDB();
    console.log('✅ MongoDB connected');
    
    const initialized = await initializeUserbot();
    
    if (initialized) {
      console.log('✅ Telegram userbot started');
    } else {
      console.log('⚠️ Userbot not configured. Waiting for configuration...');
      console.log('📝 Please visit the web panel and configure your Telegram userbot credentials at /userbot');
    }
  } catch (error) {
    console.error('❌ Error starting bot:', error);
    process.exit(1);
  }
}

module.exports = { startBot, sendPinnedMessageToAll, sendMassDM };
