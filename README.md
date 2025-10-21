# 🤖 Telegram OnlyFans Bot - Léa (AI-Powered)

Un bot Telegram userbot intelligent qui simule une influenceuse OnlyFans nommée **Léa** (22 ans, Paris) avec conversation AI, paiements Telegram Stars, et panel web d'administration.

---

## ✨ Fonctionnalités

### 💬 **Conversation Naturelle AI**
- Réponses personnalisées via OpenRouter AI
- Progression en 5 phases (de la séduction à la vente)
- Comportement adapté selon l'heure (timezone Paris GMT+1)
- Typing indicator réaliste (1-3 secondes)
- Human mode avec délais de 5-10 minutes

### 💰 **Système de Paiement Hybride**
- **Userbot** (GramJS) : Conversations naturelles comme un vrai utilisateur
- **Payment Bot** (Telegraf) : Gestion des paiements Telegram Stars
- Communication via MongoDB avec tokens expirables (30 min)
- Factures avec aperçu du contenu premium

### 📁 **Gestion des Médias**
- Contenu gratuit (`media/free/`) : Selfies, photos teasers
- Contenu premium (`media/pay/`) : Photos/vidéos exclusives
- Upload via web panel avec noms personnalisés
- Preview automatique pour vidéos premium

### 🌐 **Panel Web d'Administration**
- Interface complète sur port 5000
- Configuration userbot (API ID, Hash, Session)
- Gestion des médias (upload, prix, catégories)
- Mass DM avec factures de paiement
- Configuration bot (délais, phases, timezone)
- Statistiques et monitoring

---

## 🚀 Déploiement

### **Railway (Recommandé)**

📖 **Guide complet** : Voir [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md)

**Résumé rapide :**
```bash
# 1. Pousser sur GitHub
git push origin main

# 2. Sur Railway.app
- New Project → Deploy from GitHub
- Ajouter MongoDB database
- Configurer les variables d'environnement
- Générer un domaine

# 3. C'est tout ! Railway déploie automatiquement
```

### **Variables d'Environnement Requises**

Voir [`.env.example`](./.env.example) pour la liste complète :

```bash
# Telegram Userbot
TELEGRAM_API_ID=
TELEGRAM_API_HASH=
TELEGRAM_PHONE_NUMBER=
TELEGRAM_SESSION_STRING=

# Payment Bot
TELEGRAM_PAYMENT_BOT_TOKEN=
TELEGRAM_PAYMENT_BOT_USERNAME=

# Database
MONGO_URI=

# AI
OPENROUTER_API_KEY=

# Admin
ADMIN_PASSWORD=
```

---

## 📦 Architecture

### **Services (Multi-Process)**

1. **Userbot** (`index.js`) - GramJS
   - Conversations AI naturelles
   - Gestion des phases de séduction
   - Envoi de contenu gratuit/premium

2. **Payment Bot** (`payment-bot.js`) - Telegraf
   - Factures Telegram Stars
   - Vérification des paiements
   - Livraison du contenu après paiement

3. **Web Server** (`server.js`) - Express
   - Panel admin sur port 5000
   - Upload de médias
   - Configuration bot
   - Mass DM

4. **Database** (`db.js`) - MongoDB
   - Historique des conversations
   - Configuration des médias
   - Tokens de paiement
   - Statistiques

### **Collections MongoDB**

- `messages` : Historique des conversations
- `media_config` : Métadonnées des fichiers (prix, catégorie)
- `pinned_messages` : Annonces globales
- `payments` : Historique des paiements
- `payment_requests` : Tokens temporaires (TTL 30 min)
- `bot_config` : Configuration du bot

---

## 🎯 Flux Utilisateur

```
Phase 1 (1-5 messages)   : Discussion légère, friendly
Phase 2 (6-8 messages)   : Séduction, dirty talk
Phase 3 (9-11 messages)  : Premier selfie gratuit
Phase 4 (12-15 messages) : Photo/vidéo premium (payante)
Phase 5 (16+ messages)   : Contenu exclusif (payante, acheteurs uniquement)
```

**Comportement adaptatif :**
- Non-acheteurs en Phase 4+ : Bot devient distant/vexé
- Acheteurs en Phase 5 : Bot devient attaché/exclusif

---

## 🛠️ Développement Local

```bash
# Installation
npm install

# Configuration
cp .env.example .env
# Remplir les variables dans .env

# Lancement
npm start
```

**Accès :**
- Web Panel : `http://localhost:5000`
- Login : `admin` / (ton ADMIN_PASSWORD)

---

## 📚 Technologies

- **Backend** : Node.js, Express
- **Bot Framework** : GramJS (Userbot), Telegraf (Payment Bot)
- **Database** : MongoDB
- **AI** : OpenRouter API (Llama, Mistral, etc.)
- **Template** : EJS
- **Auth** : bcryptjs + express-session
- **Upload** : Multer

---

## ⚠️ Avertissements

- ⚡ **Userbots** peuvent violer les ToS de Telegram → Utilise un compte dédié
- 🔒 **Session String** = accès complet à ton compte → Ne jamais partager
- 💳 **Telegram Stars** = vrai argent → Teste avec petits montants
- 🚫 **Commercial use** peut entraîner un ban → À tes risques

---

## 📖 Documentation

- **Guide Railway** : [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md)
- **Architecture** : [replit.md](./replit.md)
- **Variables** : [.env.example](./.env.example)

---

## 🆘 Support

**Problèmes communs :**

1. **"Could not find input entity"** → Normal avec GramJS, utilise `message.reply()`
2. **Payment bot ne répond pas** → Vérifie le token et username
3. **Userbot ne se connecte pas** → Régénère le session string
4. **MongoDB erreur** → Vérifie `MONGO_URI`

---

## 📝 License

ISC

---

**🎉 Prêt pour Railway ! Déploie et lance ton bot en quelques minutes.**
"# test" 
