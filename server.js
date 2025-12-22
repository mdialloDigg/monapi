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

/* ================= SCHEMAS ================= */
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

const authUserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  createdAt: { type: Date, default: Date.now }
});
const AuthUser = mongoose.model('AuthUser', authUserSchema);

/* ================= MIDDLEWARE AUTH ================= */
function requireLogin(req, res, next){
  if(req.session.userId) return next();
  res.redirect('/login');
}

/* ================= AUTHENTIFICATION ================= */
app.get('/login', (req,res) => {
  res.send(`<html><body style="font-family:Arial;text-align:center;padding-top:60px">
<h2>🔑 Connexion</h2>
<form method="post" action="/login">
<input type="text" name="username" placeholder="Nom d'utilisateur" required><br><br>
<input type="password" name="password" placeholder="Mot de passe" required><br><br>
<button>Connexion</button>
</form>
<p>Pas de compte ? <a href="/register">Créer un compte</a></p>
</body></html>`);
});

app.post('/login', async (req,res) => {
  const { username, password } = req.body;
  const user = await AuthUser.findOne({ username });
  if(!user) return res.send("Utilisateur inconnu");
  const match = await bcrypt.compare(password, user.password);
  if(!match) return res.send("Mot de passe incorrect");
  req.session.userId = user._id;
  res.redirect('/users/choice');
});

app.get('/register', (req,res) => {
  res.send(`<html><body style="font-family:Arial;text-align:center;padding-top:60px">
<h2>📝 Créer un compte</h2>
<form method="post" action="/register">
<input type="text" name="username" placeholder="Nom d'utilisateur" required><br><br>
<input type="password" name="password" placeholder="Mot de passe" required><br><br>
<button>Créer</button>
</form>
<p>Déjà un compte ? <a href="/login">Se connecter</a></p>
</body></html>`);
});

app.post('/register', async (req,res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    await new AuthUser({ username, password: hashedPassword }).save();
    res.send("✅ Compte créé ! <a href='/login'>Se connecter</a>");
  } catch(err) {
    res.send("Erreur, nom d'utilisateur déjà pris");
  }
});

app.get('/logout', (req,res) => {
  req.session.destroy();
  res.redirect('/login');
});

/* ================= FORMULAIRE /users ================= */
app.get('/users', requireLogin, (req,res)=>{
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
app.post('/auth/list', requireLogin, (req, res) => {
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
app.get('/users/choice', requireLogin, (req,res)=>{
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
<br><a href="/logout">🚪 Déconnexion</a>
</body></html>`);
});

/* ================= LOOKUP ================= */
app.get('/users/lookup', requireLogin, (req,res)=>{
  if(!req.session.formAccess) return res.redirect('/users');
  const mode = req.query.mode || 'edit';
  req.session.choiceMode = mode;

  res.send(`<html><body style="font-family:Arial;text-align:center;padding-top:60px;background:#eef2f7">
<h3>📞 Numéro expéditeur</h3>
<form method="post" action="/users/lookup">
<input name="phone" required><br><br>
<button>Continuer</button>
</form><br><a href="/users/choice">🔙 Retour</a>
</body></html>`);
});

app.post('/users/lookup', requireLogin, async (req,res)=>{
  const u = await User.findOne({ senderPhone:req.body.phone }).sort({ createdAt: -1 });
  req.session.prefill = u || { senderPhone: req.body.phone };

  if(req.session.choiceMode === 'new') req.session.editId = null;
  else if(u) req.session.editId = u._id;
  else if(req.session.choiceMode === 'edit') req.session.editId = null;
  else if(req.session.choiceMode === 'delete'){
    if(u){
      await User.findByIdAndDelete(u._id);
      req.session.prefill = null;
      req.session.editId = null;
      return res.send(`<html><body style="text-align:center;font-family:Arial;padding-top:50px">
❌ Transfert supprimé<br><br><a href="/users/choice">🔙 Retour</a></body></html>`);
    } else {
      return res.send(`<html><body style="text-align:center;font-family:Arial;padding-top:50px">
Aucun transfert trouvé pour ce numéro<br><br><a href="/users/choice">🔙 Retour</a></body></html>`);
    }
  }

  res.redirect('/users/form');
});

/* ================= FORMULAIRE /users/form ================= */
app.get('/users/form', requireLogin, (req, res) => {
  if (!req.session.formAccess) return res.redirect('/users');
  if (!req.session.prefill) return res.redirect('/users/lookup?mode=new');

  const u = req.session.prefill || {};
  const isEdit = !!req.session.editId;
  const locations = ['France','Labé','Belgique','Conakry','Suisse','Atlanta','New York','Allemagne'];

  // Pour simplifier ici, tu peux copier tout ton HTML et JS de formulaire existant
  res.send(`<html><body>
<h2>Formulaire prêt Render-safe</h2>
<p>Intègre ici tout ton formulaire /users/form avec JS de calcul recoveryAmount et submit.</p>
</body></html>`);
});

/* ================= ÉCOUTE PORT RENDER ================= */
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});
