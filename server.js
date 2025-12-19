// server.js
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Route racine
app.get('/', (req, res) => {
  res.send('🚀 API Transfert en ligne');
});

// Page formulaire
app.get('/users', (req, res) => {
  res.sendFile(path.join(__dirname, 'users.html'));
});

// Connexion MongoDB
mongoose.connect(
  'mongodb+srv://mlaminediallo_db_user:amSYetCmMskMw9Cm@cluster0.iaplugg.mongodb.net/test'
)
.then(() => console.log('✅ MongoDB connecté'))
.catch(err => console.error('❌ MongoDB erreur:', err));

// Schéma User
const userSchema = new mongoose.Schema({
  senderFirstName: { type: String, required: true },
  senderLastName: { type: String, required: true },
  senderPhone: { type: String, required: true },
  originLocation: { type: String, required: true },
  amount: { type: Number, required: true },
  fees: { type: Number, required: true },
  feePercent: { type: Number, required: true },

  receiverFirstName: { type: String, required: true },
  receiverLastName: { type: String, required: true },
  receiverPhone: { type: String, required: true },
  destinationLocation: { type: String, required: true },
  recoveryAmount: { type: Number, required: true },
  recoveryMode: { type: String, required: true },

  password: { type: String, required: true },
  code: { type: String, required: true, unique: true },

  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// POST /users → créer un transfert
app.post('/users', async (req, res) => {
  try {
    const data = req.body;

    if (
      !data.senderFirstName ||
      !data.senderLastName ||
      !data.senderPhone ||
      !data.originLocation ||
      !data.receiverFirstName ||
      !data.receiverLastName ||
      !data.receiverPhone ||
      !data.destinationLocation ||
      !data.recoveryMode ||
      !data.password ||
      isNaN(data.amount) ||
      isNaN(data.fees) ||
      isNaN(data.feePercent) ||
      isNaN(data.recoveryAmount)
    ) {
      return res.status(400).json({ message: 'Tous les champs sont requis et valides' });
    }

    const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const number = Math.floor(100 + Math.random() * 900);
    const code = letter + number;

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = new User({
      ...data,
      amount: Number(data.amount),
      fees: Number(data.fees),
      feePercent: Number(data.feePercent),
      recoveryAmount: Number(data.recoveryAmount),
      password: hashedPassword,
      code
    });

    await user.save();
    res.status(201).json({ message: '✅ Transfert enregistré', code });

  } catch (err) {
    console.error('ERROR POST /users:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /users/json → JSON
app.get('/users/json', async (req, res) => {
  try {
    const users = await User.find({}, { password: 0, __v: 0 });
    res.json(users);
  } catch (err) {
    console.error('ERROR GET /users/json:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /users/all → HTML avec totaux & style
app.get('/users/all', async (req, res) => {
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
body { font-family: Arial, sans-serif; background:#f4f6f9; }
h2 { text-align:center; margin-top:30px; }
table {
  width:98%;
  margin:30px auto;
  border-collapse:collapse;
  background:#fff;
  box-shadow:0 4px 12px rgba(0,0,0,0.1);
}
th, td {
  border:1px solid #ddd;
  padding:8px;
  font-size:13px;
  text-align:center;
}
th { background:#007bff; color:#fff; }
.exp { background:linear-gradient(135deg,#e3ecff,#f5f8ff); font-weight:bold; }
.dest { background:linear-gradient(135deg,#e6ffe9,#f4fff6); font-weight:bold; }
.origin { background:#eef4ff; color:#003366; font-weight:bold; }
.destination { background:#ecfff1; color:#145a32; font-weight:bold; }
.amount { color:#004085; font-weight:bold; }
.recovery { color:#155724; font-weight:bold; }
.totals { background:#222; color:#fff; font-weight:bold; }
</style>
</head>
<body>

<h2>📋 Liste des transferts</h2>

<table>
<tr>
  <th colspan="7" class="exp">EXPÉDITEUR</th>
  <th colspan="6" class="dest">DESTINATAIRE</th>
  <th>Date</th>
</tr>
<tr>
  <th>Prénom</th><th>Nom</th><th>Tél</th><th>Pays départ</th><th>Montant</th><th>Frais</th><th>Code</th>
  <th>Prénom</th><th>Nom</th><th>Tél</th><th>Pays destination</th><th>Montant reçu</th><th>Mode</th>
  <th></th>
</tr>`;

    users.forEach(u => {
      html += `
<tr>
  <td>${u.senderFirstName}</td>
  <td>${u.senderLastName}</td>
  <td>${u.senderPhone}</td>
  <td class="origin">${u.originLocation}</td>
  <td class="amount">${u.amount}</td>
  <td>${u.fees}</td>
  <td>${u.code}</td>

  <td>${u.receiverFirstName}</td>
  <td>${u.receiverLastName}</td>
  <td>${u.receiverPhone}</td>
  <td class="destination">${u.destinationLocation}</td>
  <td class="recovery">${u.recoveryAmount}</td>
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
    console.error('ERROR GET /users/all:', err);
    res.status(500).send('Erreur serveur');
  }
});

// Lancement serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log('🚀 Serveur en ligne sur le port', PORT)
);
