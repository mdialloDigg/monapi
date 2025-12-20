const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const session = require('express-session');

const app = express();

/* =====================
   MIDDLEWARES
===================== */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: 'transfert-secret-key',
    resave: false,
    saveUninitialized: false
  })
);

/* =====================
   ROUTE RACINE
===================== */
app.get('/', (req, res) => {
  res.send('🚀 API Transfert en ligne');
});

/* =====================================================
   🔐 FORMULAIRE /users (CODE 123)
===================================================== */

app.get('/users', (req, res) => {
  if (req.session.formAccess === true) {
    return res.sendFile(path.join(__dirname, 'public', 'users.html'));
  }

  res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Accès Formulaire</title>
<style>
body { font-family: Arial; text-align:center; background:#f4f6f9; padding-top:60px; }
input, button { padding:10px; font-size:16px; }
h2 { color:#007bff; }
</style>
</head>
<body>
<h2>🔒 Accès au formulaire</h2>
<form method="POST" action="/auth/form">
  <input type="password" name="code" placeholder="Code d'accès" required>
  <br><br>
  <button type="submit">Valider</button>
</form>
</body>
</html>
`);
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

/* =====================================================
   📥 POST /users — ENREGISTREMENT TRANSFERT
===================================================== */

app.post('/users', async (req, res) => {
  try {
    const d = req.body;

    if (
      !d.senderFirstName || !d.senderLastName || !d.senderPhone ||
      !d.originLocation || !d.receiverFirstName || !d.receiverLastName ||
      !d.receiverPhone || !d.destinationLocation || !d.recoveryMode ||
      !d.password || isNaN(d.amount) || isNaN(d.fees) ||
      isNaN(d.feePercent) || isNaN(d.recoveryAmount)
    ) {
      return res.status(400).send('Champs invalides');
    }

    const code =
      String.fromCharCode(65 + Math.floor(Math.random() * 26)) +
      Math.floor(100 + Math.random() * 900);

    const hashedPassword = await bcrypt.hash(d.password, 10);

    await User.create({
      ...d,
      amount: Number(d.amount),
      fees: Number(d.fees),
      feePercent: Number(d.feePercent),
      recoveryAmount: Number(d.recoveryAmount),
      password: hashedPassword,
      code
    });

    res.send(`
<h2 style="text-align:center;color:green;">✅ Transfert enregistré</h2>
<p style="text-align:center;">Code : <b>${code}</b></p>
<p style="text-align:center;"><a href="/users">⬅️ Retour</a></p>
`);

  } catch (err) {
    console.error('POST /users ERROR:', err);
    res.status(500).send('Erreur serveur');
  }
});

/* =====================================================
   🔐 LISTE /users/all (CODE 147)
===================================================== */

app.get('/users/all', async (req, res) => {
  if (!req.session.listAccess) {
    return res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Accès Liste</title>
<style>
body { font-family: Arial; text-align:center; background:#f4f6f9; padding-top:60px; }
input, button { padding:10px; font-size:16px; }
h2 { color:#28a745; }
</style>
</head>
<body>
<h2>🔒 Accès à la liste des transferts</h2>
<form method="POST" action="/auth/list">
  <input type="password" name="code" placeholder="Code d'accès" required>
  <br><br>
  <button type="submit">Valider</button>
</form>
</body>
</html>
`);
  }

  try {
    const users = await User.find({}, { password: 0, __v: 0 });

    let totalAmount = 0;
    let totalRecovery = 0;

    users.forEach(u => {
      totalAmount += u.amount;
      totalRecovery += u.recoveryAmount;
    });

    let html = `
<h2 style="text-align:center;">📋 Liste des transferts</h2>

<form method="POST" action="/logout/list" style="text-align:center;">
<button>🚪 Quitter</button>
</form>

<table border="1" width="98%" align="center">
<tr>
<th>Origine</th><th>Montant</th>
<th>Destination</th><th>Montant reçu</th>
</tr>`;

    users.forEach(u => {
      html += `
<tr>
<td>${u.originLocation}</td>
<td>${u.amount}</td>
<td>${u.destinationLocation}</td>
<td>${u.recoveryAmount}</td>
</tr>`;
    });

    html += `
<tr style="font-weight:bold;background:#222;color:#fff;">
<td>TOTAL</td>
<td>${totalAmount}</td>
<td></td>
<td>${totalRecovery}</td>
</tr>
</table>`;

    res.send(html);

  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
});

app.post('/auth/list', (req, res) => {
  if (req.body.code === '147') {
    req.session.listAccess = true;
  }
  res.redirect('/users/all');
});

app.post('/logout/list', (req, res) => {
  req.session.listAccess = false;
  res.redirect('/users/all');
});

/* =====================
   MONGODB
===================== */

mongoose.connect(
  'mongodb+srv://mlaminediallo_db_user:amSYetCmMskMw9Cm@cluster0.iaplugg.mongodb.net/test'
)
.then(() => console.log('✅ MongoDB connecté'))
.catch(err => console.error(err));

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
  password: String,
  code: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

/* =====================
   SERVEUR
===================== */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('🚀 Serveur en ligne sur le port', PORT);
});
