# 🚂 Guide de Déploiement sur Railway

Ce guide explique comment déployer ton bot Telegram OnlyFans sur Railway.

---

## 📋 Prérequis

Avant de commencer, assure-toi d'avoir :

✅ Un compte GitHub (gratuit)  
✅ Un compte Railway (gratuit) sur [railway.app](https://railway.app)  
✅ Toutes tes clés API et tokens configurés (voir section Variables d'Environnement)

---

## 🚀 Étapes de Déploiement

### **Étape 1 : Pousser le Code sur GitHub**

Si ton code n'est pas encore sur GitHub :

```bash
# Dans le dossier testr/testr/forup
cd testr/testr/forup

# Initialiser Git (si pas déjà fait)
git init

# Ajouter tous les fichiers
git add .

# Commit
git commit -m "Initial commit - Telegram bot ready for Railway"

# Créer un repo sur GitHub puis :
git remote add origin https://github.com/TON_USERNAME/ton-repo.git
git push -u origin main
```

---

### **Étape 2 : Créer un Projet sur Railway**

1. Va sur [railway.app](https://railway.app)
2. Connecte-toi avec ton compte GitHub
3. Clique sur **"New Project"**
4. Sélectionne **"Deploy from GitHub repo"**
5. Choisis ton repository (autorise Railway si nécessaire)
6. Railway va **automatiquement détecter** Node.js et commencer le build

---

### **Étape 3 : Ajouter MongoDB**

Ton bot a besoin d'une base de données MongoDB :

1. Dans ton projet Railway, clique sur **"+ New"**
2. Sélectionne **"Database"** → **"MongoDB"**
3. Railway va créer une base MongoDB et générer automatiquement `MONGO_URI`

**Alternative :** Utilise MongoDB Atlas (gratuit) :
- Va sur [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
- Crée un cluster gratuit
- Copie la connection string
- Ajoute-la manuellement dans les variables Railway

---

### **Étape 4 : Configurer les Variables d'Environnement**

Dans ton service Railway, va dans l'onglet **"Variables"** et ajoute :

#### **Variables Obligatoires :**

```bash
# Telegram Userbot
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=abc123def456
TELEGRAM_PHONE_NUMBER=+33612345678
TELEGRAM_SESSION_STRING=ta_session_string_ici

# Payment Bot
TELEGRAM_PAYMENT_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_PAYMENT_BOT_USERNAME=TonBotUsername

# Database (automatique si tu as ajouté MongoDB Railway)
MONGO_URI=${{MongoDB.MONGO_URI}}

# AI
OPENROUTER_API_KEY=sk-or-v1-abc123...

# Admin Panel
ADMIN_PASSWORD=ton_mot_de_passe_securise
```

#### **🔐 Secrets Sensibles :**

Pour les variables super sensibles (API keys, tokens), utilise **Sealed Variables** :

1. Ajoute la variable normalement
2. Clique sur les **3 points** à côté de la variable
3. Sélectionne **"Seal"**
4. La valeur ne sera plus jamais visible (même pour toi)

---

### **Étape 5 : Générer un Domaine Public**

1. Va dans **Settings** → **Networking**
2. Clique sur **"Generate Domain"**
3. Ton app sera accessible sur `https://ton-app.up.railway.app`

---

### **Étape 6 : Vérifier les Logs**

Pour voir si tout fonctionne :

1. Va dans l'onglet **"Deployments"**
2. Clique sur le dernier déploiement
3. Regarde les logs en temps réel

Tu devrais voir :
```
✅ Connected to MongoDB
✅ Web server started
💳 Payment bot @TonBot is ready and healthy!
✅ USERBOT CONNECTÉ AVEC SUCCÈS !
👂 Listening for messages...
```

---

## 🔧 Configuration du Port

**IMPORTANT :** Railway définit automatiquement le port via `process.env.PORT`.

Ton code utilise déjà :
```javascript
const PORT = process.env.PORT || 5000;
```

✅ **Pas besoin de changer quoi que ce soit !**

---

## 🔄 Déploiement Continu (CI/CD)

Railway est configuré pour le **déploiement automatique** :

- Chaque fois que tu fais `git push` sur GitHub
- Railway rebuild et redéploie automatiquement
- Pas besoin de cliquer sur "Deploy" à chaque fois !

---

## 📊 Monitoring

### **Voir les Logs en Live :**

**Via Dashboard :**
- Onglet "Deployments" → Clique sur le déploiement actif

**Via CLI :**
```bash
# Installer le CLI Railway
npm install -g @railway/cli

# Se connecter
railway login

# Voir les logs
railway logs
```

### **Métriques :**
- CPU/RAM visibles dans le dashboard
- Auto-scaling automatique sur les pics de trafic

---

## 🛠️ Debugging

### **Le Bot ne Démarre Pas :**

1. Vérifie les logs dans Railway
2. Assure-toi que toutes les variables sont configurées
3. Vérifie que MongoDB est bien connecté

### **Erreur "Could not find input entity" :**

C'est normal avec GramJS - le bot utilise `message.reply()` qui fonctionne parfaitement.

### **Payment Bot ne Répond Pas :**

1. Vérifie `TELEGRAM_PAYMENT_BOT_TOKEN` dans les variables
2. Vérifie que le username est correct dans `TELEGRAM_PAYMENT_BOT_USERNAME`
3. Regarde les logs pour les erreurs de santé du payment bot

---

## 💰 Coûts Railway

- **Essai Gratuit** : Parfait pour tester
- **Pay-as-you-go** : Tu paies uniquement ce que tu consommes
- **Pas de tier gratuit illimité** (changé depuis 2024)

Consulte les tarifs : [railway.app/pricing](https://railway.app/pricing)

**Estimation :** Un bot comme le tien coûte environ $5-10/mois en fonction du trafic.

---

## 🌐 Domaine Personnalisé (Optionnel)

Pour utiliser ton propre domaine (ex: `bot.tonsite.com`) :

1. Va dans **Settings** → **Networking**
2. Clique sur **"Custom Domain"**
3. Ajoute ton domaine
4. Mets à jour tes DNS comme indiqué
5. Railway gère le SSL automatiquement

---

## 📦 Structure des Fichiers Importants

```
testr/testr/forup/
├── start.js              # Point d'entrée (démarre tous les services)
├── index.js              # Userbot GramJS
├── payment-bot.js        # Payment bot Telegraf
├── server.js             # Web panel Express
├── db.js                 # MongoDB
├── package.json          # Dependencies + script "start"
├── railway.json          # Config Railway
├── .env.example          # Variables d'environnement (exemple)
├── .gitignore            # Fichiers à ne pas commit
└── media/                # Fichiers médias (free/pay)
```

---

## ✅ Checklist Finale

Avant de déployer, vérifie que :

- [ ] Code poussé sur GitHub
- [ ] Projet créé sur Railway
- [ ] MongoDB ajouté et configuré
- [ ] Toutes les variables d'environnement configurées
- [ ] Domaine généré
- [ ] Logs vérifiés (tout démarre correctement)
- [ ] Web panel accessible sur `https://ton-app.up.railway.app`
- [ ] Userbot répond aux messages Telegram
- [ ] Payment bot envoie les factures

---

## 🆘 Support

**Docs Railway :**
- [docs.railway.com](https://docs.railway.com)
- [Guide Express](https://docs.railway.com/guides/express)
- [Variables](https://docs.railway.com/guides/variables)

**Communauté :**
- Discord Railway : [discord.gg/railway](https://discord.gg/railway)

---

## 🎉 C'est Tout !

Ton bot est maintenant déployé sur Railway avec :
- ✅ Conversations AI automatiques
- ✅ Paiements Telegram Stars
- ✅ Web Panel d'administration
- ✅ Déploiement continu depuis GitHub
- ✅ Monitoring en temps réel

**Bon lancement ! 🚀💬**
