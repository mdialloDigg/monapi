/* ================= IMPORTS ================= */
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const bcrypt = require('bcryptjs');

const app = express();

/* ================= MIDDLEWARE ================= */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'transfert-secret',
  resave: false,
  saveUninitialized: false
}));

/* ================= MONGODB ================= */
mongoose.connect(
  'mongodb+srv://mlaminediallo_db_user:amSYetCmMskMw9Cm@cluster0.iaplugg.mongodb.net/test'
).then(() => console.log('✅ MongoDB connecté'))
 .catch(console.error);

/* ================= SCHEMA TRANSFERT ================= */
const userSchema = new mongoose.Schema({
  senderFirstName: String,
  senderLastName: String,
  senderPhone: String,
  originLocation: String,
  amount: Number,
  fees: Number,
  feePercent: Number,
  receiverFirstName: String,
  receiverLastName: String,
  receiverPhone: String,
  destinationLocation: String,
  recoveryAmount: Number,
  recoveryMode: String,
  code: String,
  status: { type: String, default: 'actif' },
  retraitHistory: [{ date: Date, mode: String }],
  retired: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

/* ================= AUTH USER SCHEMA ================= */
const authUserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  email: String,
  password: String,
  role: { type: String, enum: ['admin', 'agent', 'viewer'], default: 'agent' },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});
const AuthUser = mongoose.model('AuthUser', authUserSchema);

/* ================= AUTH MIDDLEWARE ================= */
function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.session.user || !roles.includes(req.session.user.role)) {
      return res.status(403).send("⛔ Accès refusé");
    }
    next();
  };
}

/* ================= ROUTES AUTH ================= */
app.get('/login',(req,res)=>{
  res.send(`
  <html><body style="font-family:Arial;text-align:center;padding-top:60px">
  <h2>🔐 Connexion</h2>
  <form method="post" action="/login">
    <input name="username" placeholder="Utilisateur" required><br><br>
    <input type="password" name="password" placeholder="Mot de passe" required><br><br>
    <button>Connexion</button>
  </form></body></html>
  `);
});

app.post('/login', async (req,res)=>{
  const {username,password}=req.body;
  const user = await AuthUser.findOne({username, active:true});
  if(!user) return res.send("Utilisateur introuvable");
  const ok = await bcrypt.compare(password,user.password);
  if(!ok) return res.send("Mot de passe incorrect");

  // ✅ SESSION UTILISATEUR
  req.session.user = {id:user._id, username:user.username, role:user.role};
  req.session.formAccess = true;
  if(user.role === 'admin') req.session.listAccess = true;

  // 🔹 REDIRECTION DIRECTE VERS /users/lookup?mode=new
  req.session.choiceMode = 'new';
  res.redirect('/users/lookup?mode=new');
});

app.get('/profile', requireLogin,(req,res)=>{
  res.send(`
  <html><body style="font-family:Arial;text-align:center;padding-top:60px">
  <h2>👤 Profil</h2>
  <p>Utilisateur : ${req.session.user.username}</p>
  <p>Rôle : ${req.session.user.role}</p>
  <a href="/users">➡️ Accéder aux transferts</a><br><br>
  <a href="/logout/auth">🚪 Déconnexion</a>
  </body></html>
  `);
});

app.get('/logout/auth',(req,res)=>{
  req.session.user = null;
  res.redirect('/login');
});

/* ================= PROTECTION DES ROUTES ================= */
app.use('/users', requireLogin);

/* ================= FORMULAIRE /users ================= */
app.get('/users',(req,res)=>{
  if(!req.session.formAccess){
    return res.send(`<html><body style="font-family:Arial;text-align:center;padding-top:60px">
<h2>🔒 Accès formulaire</h2>
<form method="post" action="/auth/form">
<input type="password" name="code" placeholder="Code 123" required><br><br>
<button>Valider</button>
</form></body></html>`);
  }
  res.redirect('/users/choice');
});

app.post('/auth/form',(req,res)=>{
  if(req.body.code==='123') req.session.formAccess=true;
  res.redirect('/users/choice');
});

/* ================= AUTH LIST ================= */
app.post('/auth/list', (req, res) => {
  const code = req.body.code;
  if (code === '147') {
    req.session.listAccess = true;
    res.redirect('/users/all');
  } else {
    res.send(`<html><body style="font-family:Arial;text-align:center;padding-top:60px">
<h2>🔒 Code incorrect</h2>
<a href="/users/all">🔙 Retour</a>
</body></html>`);
  }
});

/* ================= PAGE CHOIX ================= */
app.get('/users/choice',(req,res)=>{
  if(!req.session.formAccess) return res.redirect('/users');
  res.send(`<html>
<head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{font-family:Arial;text-align:center;padding-top:40px;background:#eef2f7}
button{padding:12px 25px;margin:8px;font-size:16px;border:none;color:white;border-radius:5px;cursor:pointer}
#new{background:#007bff} #edit{background:#28a745} #delete{background:#dc3545}
</style></head>
<body>
<h2>📋 Gestion des transferts</h2>
<a href="/users/lookup?mode=new"><button id="new">💾 Nouveau transfert</button></a><br>
<a href="/users/lookup?mode=edit"><button id="edit">✏️ Modifier transfert</button></a><br>
<a href="/users/lookup?mode=delete"><button id="delete">❌ Supprimer transfert</button></a><br>
<br><a href="/logout/form">🚪 Déconnexion</a>
</body></html>`);
});

/* ================= LOOKUP PAR TÉLÉPHONE ================= */
app.get('/users/lookup',(req,res)=>{
  if(!req.session.formAccess) return res.redirect('/users');
  const mode = req.query.mode || req.session.choiceMode || 'edit';
  req.session.choiceMode = mode;
  res.send(`<html><body style="font-family:Arial;text-align:center;padding-top:60px;background:#eef2f7">
<h3>📞 Numéro expéditeur</h3>
<form method="post" action="/users/lookup">
<input name="phone" required><br><br>
<button>Continuer</button>
</form><br><a href="/users/choice">🔙 Retour</a>
</body></html>`);
});

/* ================= POST LOOKUP ================= */
app.post('/users/lookup', async (req,res)=>{
  const u = await User.findOne({ senderPhone:req.body.phone }).sort({ createdAt:-1 });
  req.session.prefill = u || { senderPhone:req.body.phone };

  if(req.session.choiceMode==='new') req.session.editId=null;
  else if(u) req.session.editId=u._id;
  else if(req.session.choiceMode==='edit') req.session.editId=null;
  else if(req.session.choiceMode==='delete'){
    if(u){
      await User.findByIdAndDelete(u._id);
      req.session.prefill=null;
      req.session.editId=null;
      return res.send(`<html><body style="text-align:center;font-family:Arial;padding-top:50px">
❌ Transfert supprimé<br><br><a href="/users/choice">🔙 Retour</a></body></html>`);
    } else {
      return res.send(`<html><body style="text-align:center;font-family:Arial;padding-top:50px">
Aucun transfert trouvé pour ce numéro<br><br><a href="/users/choice">🔙 Retour</a></body></html>`);
    }
  }
  res.redirect('/users/form');
});

/* ================= FORMULAIRE TRANSFERT ================= */
/* 👉 COPIE EXACTEMENT TON CODE ORIGINAL DU FORMULAIRE ICI */

/* ================= CRUD ================= */
/* 👉 COPIE EXACTEMENT TON CODE ORIGINAL CRUD, RETRAIT, EXPORT PDF ICI */

/* ================= ÉCOUTE DU PORT ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Serveur lancé sur le port ${PORT}`));
