const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');
const { 
  getStats, 
  getAllUsers, 
  getUserConversation,
  deleteUserMessages,
  deleteAllData,
  saveMediaConfig,
  getAllMediaConfigs,
  deleteMediaConfig,
  updateMediaPrice,
  savePinnedMessage,
  getPinnedMessage,
  getPaymentStats,
  getBotConfig,
  updateBotConfig,
  getUserbotConfig,
  updateUserbotConfig
} = require('./db');

const ALLOWED_CATEGORIES = ['free', 'pay'];

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tempUploadPath = path.join(__dirname, 'media', 'temp');
    
    if (!fs.existsSync(tempUploadPath)) {
      fs.mkdirSync(tempUploadPath, { recursive: true });
    }
    cb(null, tempUploadPath);
  },
  filename: function (req, file, cb) {
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, Date.now() + '-' + sanitizedFilename);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

const tempStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tempPath = path.join(__dirname, 'temp_uploads');
    if (!fs.existsSync(tempPath)) {
      fs.mkdirSync(tempPath, { recursive: true });
    }
    cb(null, tempPath);
  },
  filename: function (req, file, cb) {
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, Date.now() + '-' + sanitizedFilename);
  }
});

const tempUpload = multer({ 
  storage: tempStorage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.ADMIN_PASSWORD) {
  console.error('❌ ADMIN_PASSWORD environment variable is required');
  process.exit(1);
}

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'telegram-bot-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  }
  res.redirect('/login');
}

app.get('/login', (req, res) => {
  if (req.session && req.session.authenticated) {
    return res.redirect('/');
  }
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  const { password } = req.body;
  
  if (password === ADMIN_PASSWORD) {
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        return res.render('login', { error: 'Erreur de connexion' });
      }
      req.session.authenticated = true;
      res.redirect('/');
    });
  } else {
    res.render('login', { error: 'Mot de passe incorrect' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.get('/', requireAuth, async (req, res) => {
  try {
    const stats = await getStats();
    const pinnedMessage = await getPinnedMessage();
    res.render('dashboard', { stats, pinnedMessage });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).send('Error loading dashboard');
  }
});

app.get('/api/stats', requireAuth, async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/api/users', requireAuth, async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/conversation/:userId', requireAuth, async (req, res) => {
  try {
    const userId = req.params.userId;
    const limit = parseInt(req.query.limit) || 50;
    const conversation = await getUserConversation(userId, limit);
    res.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

app.get('/media/preview/:category/:filename', requireAuth, async (req, res) => {
  try {
    const { category, filename } = req.params;
    
    if (!ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).send('Invalid category');
    }
    
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).send('Invalid filename');
    }
    
    const filePath = path.join(__dirname, 'media', category, filename);
    const resolvedPath = path.resolve(filePath);
    const resolvedMediaDir = path.resolve(__dirname, 'media', category);
    
    if (!resolvedPath.startsWith(resolvedMediaDir)) {
      return res.status(403).send('Access denied');
    }
    
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send('File not found');
    }
  } catch (error) {
    console.error('Error serving media:', error);
    res.status(500).send('Error');
  }
});

app.get('/media', requireAuth, async (req, res) => {
  try {
    const mediaConfigs = await getAllMediaConfigs();
    const freeFiles = fs.existsSync(path.join(__dirname, 'media/free')) 
      ? fs.readdirSync(path.join(__dirname, 'media/free')) : [];
    const payFiles = fs.existsSync(path.join(__dirname, 'media/pay')) 
      ? fs.readdirSync(path.join(__dirname, 'media/pay')) : [];
    
    res.render('media', { freeFiles, payFiles, mediaConfigs });
  } catch (error) {
    console.error('Error loading media page:', error);
    res.status(500).send('Error loading media page');
  }
});

app.post('/api/upload-media', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const category = req.body.category || 'free';
    const price = req.body.price ? parseInt(req.body.price) : null;
    const customFilename = req.body.custom_filename ? req.body.custom_filename.trim() : null;
    
    if (!ALLOWED_CATEGORIES.includes(category)) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Invalid category' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    let finalFilename = req.file.filename;
    
    if (customFilename) {
      const sanitizedCustomName = customFilename.replace(/[^a-zA-Z0-9.-]/g, '_');
      
      if (!sanitizedCustomName.includes('.')) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Nom de fichier doit contenir une extension (ex: .jpg, .mp4)' });
      }
      
      if (sanitizedCustomName.includes('..') || sanitizedCustomName.includes('/') || sanitizedCustomName.includes('\\')) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Nom de fichier invalide' });
      }
      
      finalFilename = sanitizedCustomName;
    }
    
    const finalPath = path.join(__dirname, 'media', category);
    if (!fs.existsSync(finalPath)) {
      fs.mkdirSync(finalPath, { recursive: true });
    }
    
    const newFilePath = path.join(finalPath, finalFilename);
    
    if (fs.existsSync(newFilePath)) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: `Le fichier "${finalFilename}" existe déjà dans ${category}/` });
    }
    
    fs.renameSync(req.file.path, newFilePath);
    
    await saveMediaConfig(finalFilename, category, price);
    res.json({ success: true, filename: finalFilename, category, price });
  } catch (error) {
    console.error('Error uploading media:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to upload media' });
  }
});

app.delete('/api/media/:category/:filename', requireAuth, async (req, res) => {
  try {
    const { category, filename } = req.params;
    
    if (!ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    const filePath = path.join(__dirname, 'media', category, filename);
    const resolvedPath = path.resolve(filePath);
    const resolvedMediaDir = path.resolve(__dirname, 'media', category);
    
    if (!resolvedPath.startsWith(resolvedMediaDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      await deleteMediaConfig(filename);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (error) {
    console.error('Error deleting media:', error);
    res.status(500).json({ error: 'Failed to delete media' });
  }
});

app.patch('/api/media-price/:filename', requireAuth, async (req, res) => {
  try {
    const { filename } = req.params;
    const { price } = req.body;
    
    const numPrice = Number(price);
    if (!Number.isInteger(numPrice) || numPrice < 1 || numPrice > 100000) {
      return res.status(400).json({ error: 'Invalid price (must be integer between 1 and 100000)' });
    }
    
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    const updated = await updateMediaPrice(filename, numPrice);
    
    if (updated) {
      res.json({ success: true, price: numPrice });
    } else {
      res.status(500).json({ error: 'Failed to update price' });
    }
  } catch (error) {
    console.error('Error updating media price:', error);
    res.status(500).json({ error: 'Failed to update price' });
  }
});

app.delete('/api/conversation/:userId', requireAuth, async (req, res) => {
  try {
    const userId = req.params.userId;
    const deletedCount = await deleteUserMessages(userId);
    res.json({ success: true, deletedCount });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

app.delete('/api/delete-all-data', requireAuth, async (req, res) => {
  try {
    const result = await deleteAllData();
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error deleting all data:', error);
    res.status(500).json({ error: 'Failed to delete all data' });
  }
});

app.get('/mass-dm', requireAuth, async (req, res) => {
  try {
    const users = await getAllUsers();
    res.render('mass-dm', { users });
  } catch (error) {
    console.error('Error loading mass DM page:', error);
    res.status(500).send('Error loading mass DM page');
  }
});

app.post('/api/send-mass-dm', requireAuth, tempUpload.fields([
  { name: 'mediaFile', maxCount: 1 },
  { name: 'invoiceContentFile', maxCount: 1 }
]), async (req, res) => {
  try {
    const { userIds, message, messageType, includeInvoice, invoiceTitle, invoiceDescription, invoicePrice, invoiceContentCaption } = req.body;
    const parsedUserIds = JSON.parse(userIds);
    
    const { sendMassDM } = require('./index');
    
    let mediaFilePath = null;
    if (req.files && req.files.mediaFile) {
      mediaFilePath = req.files.mediaFile[0].path;
    }
    
    let invoiceData = null;
    if (includeInvoice === 'true' && req.files && req.files.invoiceContentFile) {
      const invoiceFile = req.files.invoiceContentFile[0];
      const mediaDir = path.join(__dirname, 'media', 'pay');
      
      if (!fs.existsSync(mediaDir)) {
        fs.mkdirSync(mediaDir, { recursive: true });
      }
      
      const timestamp = Date.now();
      const sanitizedFilename = invoiceFile.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const finalFilename = `${timestamp}_${sanitizedFilename}`;
      const finalPath = path.join(mediaDir, finalFilename);
      
      fs.renameSync(invoiceFile.path, finalPath);
      
      invoiceData = {
        file: `pay/${finalFilename}`,
        title: invoiceTitle,
        description: invoiceDescription,
        price: parseInt(invoicePrice),
        caption: invoiceContentCaption
      };
    }
    
    const result = await sendMassDM(parsedUserIds, message, messageType, mediaFilePath, invoiceData);
    
    if (req.files && req.files.mediaFile && fs.existsSync(req.files.mediaFile[0].path)) {
      fs.unlinkSync(req.files.mediaFile[0].path);
    }
    
    res.json({ 
      success: true, 
      successCount: result.successCount, 
      failCount: result.failCount 
    });
  } catch (error) {
    console.error('Error sending mass DM:', error);
    if (req.files && req.files.mediaFile && fs.existsSync(req.files.mediaFile[0].path)) {
      fs.unlinkSync(req.files.mediaFile[0].path);
    }
    res.status(500).json({ error: 'Failed to send mass DM' });
  }
});

app.get('/pinned', requireAuth, async (req, res) => {
  try {
    const pinnedMessage = await getPinnedMessage();
    res.render('pinned', { pinnedMessage });
  } catch (error) {
    console.error('Error loading pinned page:', error);
    res.status(500).send('Error loading pinned page');
  }
});

app.post('/api/pinned-message', requireAuth, async (req, res) => {
  try {
    const { message } = req.body;
    await savePinnedMessage(message);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving pinned message:', error);
    res.status(500).json({ error: 'Failed to save pinned message' });
  }
});

app.post('/api/send-pinned-to-all', requireAuth, async (req, res) => {
  try {
    const pinnedMessage = await getPinnedMessage();
    if (!pinnedMessage || !pinnedMessage.message) {
      return res.status(400).json({ error: 'Aucun message épinglé trouvé' });
    }
    
    const { sendPinnedMessageToAll } = require('./index');
    const result = await sendPinnedMessageToAll(pinnedMessage.message);
    
    res.json({ 
      success: true, 
      ...result,
      message: `Message envoyé à ${result.successCount}/${result.totalUsers} utilisateurs`
    });
  } catch (error) {
    console.error('Error sending pinned message to all:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
  }
});

app.get('/api/pinned-message', requireAuth, async (req, res) => {
  try {
    const pinnedMessage = await getPinnedMessage();
    res.json(pinnedMessage);
  } catch (error) {
    console.error('Error fetching pinned message:', error);
    res.status(500).json({ error: 'Failed to fetch pinned message' });
  }
});

app.get('/payments', requireAuth, async (req, res) => {
  try {
    const paymentStats = await getPaymentStats();
    res.render('payments', { paymentStats });
  } catch (error) {
    console.error('Error loading payments page:', error);
    res.status(500).send('Error loading payments page');
  }
});

app.get('/api/payment-stats', requireAuth, async (req, res) => {
  try {
    const paymentStats = await getPaymentStats();
    res.json(paymentStats);
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({ error: 'Failed to fetch payment stats' });
  }
});

app.get('/userbot', requireAuth, async (req, res) => {
  try {
    const config = await getUserbotConfig();
    res.render('userbot', { config });
  } catch (error) {
    console.error('Error loading userbot page:', error);
    res.status(500).send('Error loading userbot page');
  }
});

app.post('/api/userbot-config', requireAuth, async (req, res) => {
  try {
    const { apiId, apiHash, phoneNumber, sessionString } = req.body;
    
    if (!apiId || !apiHash || !phoneNumber || !sessionString) {
      return res.status(400).json({ success: false, error: 'Tous les champs sont obligatoires' });
    }
    
    await updateUserbotConfig({ apiId, apiHash, phoneNumber, sessionString });
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving userbot config:', error);
    res.status(500).json({ success: false, error: 'Failed to save userbot config' });
  }
});

app.get('/config', requireAuth, async (req, res) => {
  try {
    const config = await getBotConfig();
    res.render('config', { config });
  } catch (error) {
    console.error('Error loading config page:', error);
    res.status(500).send('Error loading config page');
  }
});

app.post('/api/bot-config', requireAuth, async (req, res) => {
  try {
    const { responseDelay, humanMode, gmtOffset, phases } = req.body;
    
    if (!responseDelay || !phases || !Array.isArray(phases)) {
      return res.status(400).json({ error: 'Invalid configuration data' });
    }
    
    if (typeof responseDelay.min !== 'number' || typeof responseDelay.max !== 'number') {
      return res.status(400).json({ error: 'Response delay must contain numeric min and max values' });
    }
    
    if (responseDelay.min < 0 || responseDelay.max < 0) {
      return res.status(400).json({ error: 'Response delay values must be non-negative' });
    }
    
    if (responseDelay.min > responseDelay.max) {
      return res.status(400).json({ error: 'Minimum delay must be less than or equal to maximum delay' });
    }

    if (humanMode) {
      if (typeof humanMode.enabled !== 'boolean') {
        return res.status(400).json({ error: 'Human mode enabled must be a boolean' });
      }
      if (humanMode.enabled) {
        if (typeof humanMode.delayMin !== 'number' || typeof humanMode.delayMax !== 'number') {
          return res.status(400).json({ error: 'Human mode delay must contain numeric min and max values' });
        }
        if (humanMode.delayMin < 0 || humanMode.delayMax < 0) {
          return res.status(400).json({ error: 'Human mode delay values must be non-negative' });
        }
        if (humanMode.delayMin > humanMode.delayMax) {
          return res.status(400).json({ error: 'Human mode minimum delay must be less than or equal to maximum delay' });
        }
      }
    }
    
    if (phases.length === 0) {
      return res.status(400).json({ error: 'At least one phase is required' });
    }
    
    for (const phase of phases) {
      if (!phase.name || !phase.description || typeof phase.messageCount !== 'number') {
        return res.status(400).json({ error: 'Each phase must have name, description, and messageCount' });
      }
      if (phase.messageCount < 1) {
        return res.status(400).json({ error: 'Phase message count must be at least 1' });
      }
    }
    
    await updateBotConfig({ responseDelay, humanMode, gmtOffset: gmtOffset || 1, phases });
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating bot config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

app.get('/api/bot-config', requireAuth, async (req, res) => {
  try {
    const config = await getBotConfig();
    res.json(config);
  } catch (error) {
    console.error('Error fetching bot config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Web panel running on http://0.0.0.0:${PORT}`);
});

module.exports = app;
