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

/* ================= SCHEMA TRANSFERT (EXISTANT) ================= */
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

/* ================= AUTH USER SCHEMA (AJOUT) ================= */
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

/* ================= PAGE ACCUEIL ================= */
app.get('/', (req,res) => res.send('🚀 API Transfert en ligne'));

/* ================= AUTH ================= */
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

  req.session.user={id:user._id,username:user.username,role:user.role};
  res.redirect('/profile');
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
  req.session.user=null;
  res.redirect('/login');
});

/* ================= PROTECTION DES ROUTES EXISTANTES ================= */
app.use('/users', requireLogin);

/* ================= TOUT LE CODE TRANSFERT ORIGINAL ================= */
/* 👉 AUCUNE MODIFICATION LOGIQUE CI-DESSOUS */

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

/* ================= LISTE ADMIN ================= */
app.get('/users/all', requireRole(['admin']), async (req,res)=>{
  const users=await User.find({});
  res.json(users);
});

/* ================= CRUD ================= */
app.post('/users', async (req,res)=>{
  const code=Math.floor(100000+Math.random()*900000).toString();
  await new User({...req.body, code}).save();
  res.json({message:'✅ Transfert enregistré | Code '+code});
});

/* ================= EXPORT PDF ================= */
app.get('/users/export/pdf', requireRole(['admin']), async (req,res)=>{
  const users=await User.find({});
  const doc=new PDFDocument();
  res.setHeader('Content-Type','application/pdf');
  doc.pipe(res);
  doc.text("Liste des transferts");
  users.forEach(u=>{
    doc.text(`${u.senderFirstName} -> ${u.receiverFirstName} : ${u.amount}`);
  });
  doc.end();
});

/* ================= CRÉATION ADMIN (UNE FOIS) ================= */

(async ()=>{
  const hash = await bcrypt.hash("admin123",10);
  await AuthUser.create({
    username:"admin",
    email:"admin@test.com",
    password:hash,
    role:"admin"
  });
  console.log("ADMIN CRÉÉ");
})();


/* ================= ÉCOUTE ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>console.log("🚀 Serveur lancé sur "+PORT));
