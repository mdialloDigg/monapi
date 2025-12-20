const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');

const app = express();

/* ================== MIDDLEWARE ================== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: 'secure-transfert',
    resave: false,
    saveUninitialized: false
  })
);

/* ================== ACCUEIL ================== */
app.get('/', (req, res) => {
  res.send('🚀 API Transfert opérationnelle');
});

/* =================================================
   🔐 ACCÈS FORMULAIRE (CODE 123)
================================================= */

app.get('/users', (req, res) => {
  if (req.session.formAccess) {
    return res.send(formHTML());
  }

  res.send(codeHTML('Accès au formulaire', '/auth/form'));
});

app.post('/auth/form', (req, res) => {
  if (req.body.code === '123') {
    req.session.formAccess = true;
  }
  res.redirect('/users');
});

app.post('/logout/form', (req, res) => {
  req.session.formAccess = false;
  res.redirect('/users');
});

/* =================================================
   📥 ENREGISTREMENT TRANSFERT
================================================= */

app.post('/users/save', async (req, res) => {
  try {
    const d = req.body;

    if (!d.senderFirstName || !d.amount) {
      return res.send('❌ Données invalides');
    }

    const code =
      String.fromCharCode(65 + Math.floor(Math.random() * 26)) +
      Math.floor(100 + Math.random() * 900);

    await User.create({
      senderFirstName: d.senderFirstName,
      amount: Number(d.amount),
      password: await bcrypt.hash(d.password, 10),
      code
    });

    res.send(`
      <h2 style="color:green;">✅ Transfert enregistré</h2>
      <p>Code : <b>${code}</b></p>
      <a href="/users">⬅️ Retour</a>
    `);

  } catch (e) {
    console.error(e);
    res.send('Erreur serveur');
  }
});

/* =================================================
   🧱 MONGODB
================================================= */

mongoose.connect(
  'mongodb+srv://mlaminediallo_db_user:amSYetCmMskMw9Cm@cluster0.iaplugg.mongodb.net/test'
);

const userSchema = new mongoose.Schema({
  senderFirstName: String,
  amount: Number,
  password: String,
  code: String
});

const User = mongoose.model('User', userSchema);

/* ================== HTML ================== */

function codeHTML(title, action) {
  return `
  <h2>${title}</h2>
  <form method="POST" action="${action}">
    <input type="password" name="code" placeholder="Code" required />
    <button>Valider</button>
  </form>
  `;
}

function formHTML() {
  return `
  <form method="POST" action="/logout/form">
    <button>🚪 Quitter</button>
  </form>

  <h2>Formulaire Transfert</h2>
  <form method="POST" action="/users/save">
    <input name="senderFirstName" placeholder="Nom" required />
    <input name="amount" placeholder="Montant" required />
    <input type="password" name="password" placeholder="Mot de passe" required />
    <button>Enregistrer</button>
  </form>
  `;
}

/* ================== SERVEUR ================== */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log('🚀 Serveur lancé sur le port', PORT)
);
