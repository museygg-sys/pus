# Telegram Bot with AI & Admin Panel

## Overview
A Telegram bot with Groq AI integration and a complete web admin panel for managing users, conversations, media, and payments. The bot provides interactive conversations with AI and supports both free and premium content delivery via Telegram Stars.

## Current Status
✅ **Fully configured and running**
- Node.js 20 installed
- MongoDB connected
- Telegram userbot + payment bot active
- OpenRouter AI configured
- Web admin panel running on port 5000
- **Railway-ready** with deployment files included

## Project Architecture
```
testr/forup/
├── start.js           # Main entry point - starts all services
├── index.js           # Telegram bot logic and AI integration
├── server.js          # Express web admin panel
├── db.js              # MongoDB connection and operations
├── package.json       # Node.js dependencies
├── views/             # EJS templates for web panel
│   ├── dashboard.ejs  # Main dashboard
│   ├── login.ejs      # Admin login
│   ├── media.ejs      # Media management
│   ├── mass-dm.ejs    # Mass messaging interface
│   ├── payments.ejs   # Payment statistics
│   └── pinned.ejs     # Pinned message management
├── public/            # Static assets (CSS)
└── media/
    ├── free/          # Free media files
    └── pay/           # Premium content (Telegram Stars)
```

## Features

### Telegram Bot
- **AI Conversations**: Powered by Groq AI (compound-mini model)
- **Conversation History**: Stores last 20 messages for context
- **Free Media**: Sends files from `media/free/`
- **Premium Content**: Payment system via Telegram Stars for `media/pay/`
- **Path Security**: Strict validation to prevent directory traversal
- **Payment Processing**: Full payment flow with pre-checkout validation

### Web Admin Panel
- **Dashboard**: Real-time statistics and recent activity
- **User Management**: View all users and their conversations
- **Media Manager**: Upload and manage free/premium content
- **Mass DM**: Send messages to multiple users
- **Pinned Messages**: Manage bot announcements
- **Payment Tracking**: View payment statistics and history
- **Secure Authentication**: Password-protected access

## Environment Variables (Secrets)
- `TELEGRAM_API_ID` - Telegram API ID from my.telegram.org
- `TELEGRAM_API_HASH` - Telegram API Hash
- `TELEGRAM_PHONE_NUMBER` - Userbot phone number
- `TELEGRAM_SESSION_STRING` - Session string for userbot
- `TELEGRAM_PAYMENT_BOT_TOKEN` - Payment bot token from @BotFather
- `TELEGRAM_PAYMENT_BOT_USERNAME` - Payment bot username
- `OPENROUTER_API_KEY` - API key from OpenRouter
- `MONGO_URI` - MongoDB connection string
- `ADMIN_PASSWORD` - Password for web admin panel

## Deployment

### Railway Deployment (Recommended)

This project is fully ready for Railway deployment:

📖 **Complete Guide**: See [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md)

**Quick Start:**
1. Push code to GitHub
2. Create new project on Railway.app
3. Deploy from GitHub repo
4. Add MongoDB database
5. Configure environment variables
6. Generate public domain

**Files included:**
- `railway.json` - Railway configuration
- `.env.example` - Environment variable template
- `RAILWAY_DEPLOY.md` - Detailed deployment guide
- `check-railway-ready.js` - Pre-deployment validation script

**Check if ready:**
```bash
node check-railway-ready.js
```

### Replit Deployment

Works out of the box with the configured workflow.

## How to Use

### Telegram Bot
1. Find your bot on Telegram using the username from @BotFather
2. Send `/start` to begin
3. Chat naturally - the AI will respond with personality
4. Bot may send free photos or offer premium content

### Web Admin Panel
1. Open the web preview in Replit
2. Log in with your `ADMIN_PASSWORD`
3. Access features via navigation menu:
   - Dashboard: Overview and stats
   - Media: Upload/manage files
   - Mass DM: Send bulk messages
   - Pinned: Set announcement messages
   - Payments: View revenue and transactions

## Technical Details
- **Runtime**: Node.js 20
- **Web Framework**: Express.js
- **Template Engine**: EJS
- **Database**: MongoDB
- **AI Provider**: Groq (compound-mini model)
- **Bot Framework**: Telegraf
- **File Uploads**: Multer
- **Session Management**: express-session

## Startup
The workflow runs automatically with: `node start.js`
This starts:
1. MongoDB connection
2. Web server on port 5000
3. Telegram bot

## Recent Changes (October 19, 2025)
- **NEW**: Complete AI prompt rewrite with strict 5-phase seduction system:
  - **PHASE 1 - Discussion Légère** (max 5 messages): Natural connection, friendly emojis, NO sexy content. Examples: "Hey 😊", "T'étais en train de faire quoi ?"
  - **PHASE 2 - Séduction / Dirty Talk** (3-4 messages): Progressively sexualize conversation. Examples: "T'as un côté qui me plaît", "Tu m'imagines en ce moment ?", "J'suis dans mon lit là…"
  - **PHASE 3 - Envoi Premier Selfie**: After 2-3 dirty talk messages, send free selfie: `{"action":"send_media","category":"free","file":"selfie.jpg"}` + "Je suis seule là… tu viendrais ? 😘"
  - **PHASE 4 - Photo Payante**: If user reacts positively, randomly send premium.jpg or pro.jpg with: "Celle-là elle est trop chaude… mais je peux pas la laisser gratuite 🥵"
  - **PHASE 5 - Vidéo Exclusive**: If user purchases, propose personalized video: "Si tu veux je t'en fais une vidéo perso 👀" + send random provideo
  - **Special Rule - No Purchase**: Bot becomes distant/vexed: "Ah t'es comme les autres 😅 tu parles mais tu débloques rien" (let user talk first)
  - **Special Rule - Has Purchased**: Bot becomes attached: "Toi je t'aime bien 😘", "Tu veux que je t'en refasse une encore plus perso ?"
  - AI strictly follows phases from database (getUserPhase), never skips steps
  - Responses limited to 5-15 words max for natural conversation flow
  - Added `userHasPurchased()` function to detect payment history
  - AI context includes phase name, description, message count, and purchase status
  - Fixed media file path handling: bot sends category+filename, system auto-constructs full path (e.g., "free/selfie.jpg")

## Previous Changes (October 18, 2025)
- Imported project to Replit
- Installed Node.js 20 and all dependencies
- Added missing dependencies (express, cors, ejs, multer, etc.)
- Fixed package.json start script
- Configured workflow to run on port 5000
- Verified all secrets are properly configured
- Both bot and web panel running successfully
- **Pinned messages** now automatically pinned in user chats:
  - Messages are **truly pinned** in Telegram chats (fixed at top of conversation)
  - Auto-pin when users do `/start`
  - Added "Send to all users" button in admin panel (/pinned)
  - New endpoint `/api/send-pinned-to-all` to broadcast and pin messages
  - Uses Telegram `pinChatMessage` API to pin messages in user chats
- **Advanced bot configuration system**:
  - Added `/config` page in admin panel for bot behavior settings
  - **Response Delay**: Configurable min/max delay (seconds) before bot responds for realistic timing
  - **Conversation Phases**: Define multiple phases based on user message count
  - Each phase has: name, description/instructions, and max message count
  - AI automatically adapts behavior based on current phase
  - Phase context injected into AI prompt to prevent skipping conversation steps
  - All settings stored in MongoDB `bot_config` collection
