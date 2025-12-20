// server.js
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const session = require('express-session');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// SESSION (clé secrète à changer en prod)
app.use(
  session({
    secret: 'super-secret-transfert-key',
    resave: false,
    saveUninitialized: false
  })
);

// Route racine
app.get('/', (req, res) => {
  res.send('🚀 API Transfert en ligne');
});

/* ======================================================
   🔐 ACCÈS FORMULAIRE /users (CODE 123)
====================================================== */

// Page formulaire ou demande de code
app.get('/users', (req, res) => {
  if (req.session.formAccess === true) {
    return res.sendFile(path.join(__dirname, 'users.html'));
  }

  res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Accès sécurisé</title>
<style>
body { font-family: Arial; text-align:center; padding-top:60px; background:#f4f6f9; }
input, button { padding:10px; font-size:16px; }
h2 { color:#007bff; }
</style>
</head>
<body>
<h2>🔒 Accès au formulaire</h2>
<form method="post" action="/auth/form">
  <input type="password" name="code" placeholder="Code d'accès" required>
  <br><br>
  <button type="submit">Valider</button>
</form>
</body>
</html>
`);
});

// Vérification code formulaire
app.post('/auth/form', (req, res) => {
  if (req.body.code === '123') {
    req.session.formAccess = true;
    return res.redirect('/users');
  }
  res.redirect('/users');
});

/* ======================================================
   🔐 ACCÈS LISTE /users/all (CODE 147)
====================================================== */

app.get('/users/all', async (req, res) => {
  if (!req.session.listAccess) {
    return res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Accès sécurisé</title>
<style>
body { font-family: Arial; text-align:center; padding-top:60px; background:#f4f6f9; }
input, button { padding:10px; font-size:16px; }
h2 { color:#28a745; }
</style>
</head>
<body>
<h2>🔒 Accès à la liste des transferts</h2>
<form method="post" action="/auth/list">
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
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Liste des transferts</title>
<style>
body { font-family: Arial; background:#f4f6f9; }
h2 { text-align:center; margin-top:30px; }
table { width:98%; margin:30px auto; border-collapse:collapse; background:#fff; }
th, td { border:1px solid #ccc; padding:8px; font-size:13px; text-align:center; }
th { background:#007bff; color:#fff; }
.origin { background:#eef4ff; font-weight:bold; }
.destination { background:#ecfff1; font-weight:bold; }
.totals { background:#222; color:#fff; font-weight:bold; }
</style>
</head>
<body>

<h2>📋 Liste des transferts</h2>

<table>
<tr>
<th colspan="7">EXPÉDITEUR</th>
<th colspan="6">DESTINATAIRE</th>
<th>Date</th>
</tr>
<tr>
<th>Prénom</th><th>Nom</th><th>Tél</th><th>Origine</th><th>Montant</th><th>Frais</th><th>Code</th>
<th>Prénom</th><th>Nom</th><th>Tél</th><th>Destination</th><th>Montant reçu</th><th>Mode</th>
<th></th>
</tr>`;

    users.forEach(u => {
      html += `
<tr>
<td>${u.senderFirstName}</td>
<td>${u.senderLastName}</td>
<td>${u.senderPhone}</td>
<td class="origin">${u.originLocation}</td>
<td>${u.amount}</td>
<td>${u.fees}</td>
<td>${u.code}</td>

<td>${u.receiverFirstName}</td>
<td>${u.receiverLastName}</td>
<td>${u.receiverPhone}</td>
<td class="destination">${u.destinationLocation}</td>
<td>${u.recoveryAmount}</td>
<td>${u.recoveryMode}</td>

<td>${new Date(u.createdAt).toLocaleString()}</td>
</tr>`;
    });

    html += `
<tr class="totals">
<td colspan="4">TOTAL</td>
<td>${totalAmount}</td>
<td colspan="6"></td>
<td>${totalRecovery}</td>
<td colspan="2"></td>
</tr>
</table>
</body>
</html>`;

    res.send(html);

  } catch (err) {
    res.status(500).send('Erreur serveur');
  }
});

// Vérification code liste
app.post('/auth/list', (req, res) => {
  if (req.body.code === '147') {
    req.session.listAccess = true;
    return res.redirect('/users/all');
  }
  res.redirect('/users/all');
});

/* ======================================================
   MongoDB + API
====================================================== */

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

// Serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log('🚀 Serveur en ligne sur le port', PORT)
);
