/* ================= IMPORTS ================= */
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const bcrypt = require('bcrypt');

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

// Schéma Auth
const authUserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  createdAt: { type: Date, default: Date.now }
});
const AuthUser = mongoose.model('AuthUser', authUserSchema);

/* ================= MIDDLEWARE AUTH ================= */
function requireLogin(req,res,next){
  if(req.session.userId) return next();
  res.redirect('/login');
}

/* ================= ROUTES AUTH ================= */
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

/* ================= LOOKUP, FORMULAIRE, CRUD, RETRAIT, EXPORT PDF ================= */
// Ici tu peux garder ton code existant tel quel, 
// mais ajouter `requireLogin` sur toutes les routes sensibles, par ex. :
// app.get('/users/form', requireLogin, ...)
// app.get('/users/all', requireLogin, ...)
// app.post('/users', requireLogin, ...)
// app.post('/users/update', requireLogin, ...)
// app.post('/users/delete', requireLogin, ...)
// app.post('/users/retirer', requireLogin, ...)
// app.get('/users/export/pdf', requireLogin, ...)

/* ================= ÉCOUTE DU PORT ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur en écoute sur le port ${PORT}`);
});
