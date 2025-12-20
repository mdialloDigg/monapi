const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');

const app = express();

/* ======================================================
   MIDDLEWARES
====================================================== */

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.use(
  session({
    secret: 'super-secret-transfert-key',
    resave: false,
    saveUninitialized: false
  })
);

/* ======================================================
   ROUTE RACINE
====================================================== */

app.get('/', (req, res) => {
  res.send('🚀 API Transfert en ligne');
});

/* ======================================================
   🔐 ACCÈS FORMULAIRE /users (CODE 123)
====================================================== */

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
</head>
<body style="text-align:center;padding-top:60px">
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

app.post('/auth/form', (req, res) => {
  if (req.body.code === '123') {
    req.session.formAccess = true;
  }
  res.redirect('/users');
});

/* ======================================================
   📥 ENREGISTREMENT UTILISATEUR (CORRECTION PRINCIPALE)
====================================================== */

app.post('/users', async (req, res) => {
  try {
    const newUser = new User({
      senderFirstName: req.body.senderFirstName,
      senderLastName: req.body.senderLastName,
      senderPhone: req.body.senderPhone,
      originLocation: req.body.originLocation,

      amount: Number(req.body.amount) || 0,
      fees: Number(req.body.fees) || 0,
      feePercent: Number(req.body.feePercent) || 0,

      receiverFirstName: req.body.receiverFirstName,
      receiverLastName: req.body.receiverLastName,
      receiverPhone: req.body.receiverPhone,
      destinationLocation: req.body.destinationLocation,

      recoveryAmount: Number(req.body.recoveryAmount) || 0,
      recoveryMode: req.body.recoveryMode,

      code: req.body.code
    });

    await newUser.save();

    res.send(`
      <h2 style="text-align:center;color:green">
        ✅ Transfert enregistré avec succès
      </h2>
      <p style="text-align:center">
        <a href="/users">➕ Nouveau transfert</a>
      </p>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send('❌ Erreur serveur lors de l’enregistrement');
  }
});

/* ======================================================
   🔐 ACCÈS LISTE /users/all (CODE 147)
====================================================== */

app.get('/users/all', async (req, res) => {
  if (!req.session.listAccess) {
    return res.send(`
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="text-align:center;padding-top:60px">
<h2>🔒 Accès à la liste</h2>
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
    const users = await User.find({}, { __v: 0 });

    let totalAmount = 0;
    let totalRecovery = 0;

    users.forEach(u => {
      totalAmount += u.amount;
      totalRecovery += u.recoveryAmount;
    });

    let html = `
    <h2 style="text-align:center">📋 Liste des transferts</h2>
    <table border="1" width="98%" align="center">
      <tr>
        <th>Expéditeur</th>
        <th>Montant</th>
        <th>Destination</th>
        <th>Reçu</th>
        <th>Date</th>
      </tr>
    `;

    users.forEach(u => {
      html += `
      <tr>
        <td>${u.senderFirstName} ${u.senderLastName}</td>
        <td>${u.amount}</td>
        <td>${u.destinationLocation}</td>
        <td>${u.recoveryAmount}</td>
        <td>${new Date(u.createdAt).toLocaleString()}</td>
      </tr>`;
    });

    html += `
      <tr>
        <td><b>TOTAL</b></td>
        <td><b>${totalAmount}</b></td>
        <td></td>
        <td><b>${totalRecovery}</b></td>
        <td></td>
      </tr>
    </table>
    `;

    res.send(html);
  } catch (err) {
    res.status(500).send('Erreur serveur');
  }
});

app.post('/auth/list', (req, res) => {
  if (req.body.code === '147') {
    req.session.listAccess = true;
  }
  res.redirect('/users/all');
});

/* ======================================================
   MONGODB
====================================================== */

mongoose
  .connect(
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
  code: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

/* ======================================================
   SERVEUR
====================================================== */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log('🚀 Serveur en ligne sur le port', PORT)
);
