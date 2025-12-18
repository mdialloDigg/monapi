const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

/* =========================
   📄 AFFICHER LE FORMULAIRE
========================= */
app.get('/users', (req, res) => {
  res.sendFile(path.join(__dirname, 'users.html'));
});

/* =========================
   🔗 CONNEXION MONGODB
========================= */
mongoose.connect(
  'mongodb+srv://mlaminediallo_db_user:amSYetCmMskMw9Cm@cluster0.iaplugg.mongodb.net/test'
)
.then(() => console.log('✅ MongoDB connecté'))
.catch(err => console.error('❌ MongoDB erreur:', err));

/* =========================
   📦 MODÈLE USER
========================= */
const userSchema = new mongoose.Schema({
  // Expéditeur
  senderFirstName: { type: String, required: true },
  senderLastName: { type: String, required: true },
  email: { type: String, required: true },
  senderPhone: { type: String, required: true },
  originCountry: { type: String, required: true },
  originLocation: { type: String, required: true },
  amount: { type: Number, required: true },
  fees: { type: Number, required: true },
  feePercent: { type: Number, required: true },

  // Destinataire
  receiverFirstName: { type: String, required: true },
  receiverLastName: { type: String, required: true },
  receiverPhone: { type: String, required: true },
  destinationCountry: { type: String, required: true },
  destinationLocation: { type: String, required: true },
  recoveryAmount: { type: Number, required: true },
  recoveryMode: { type: String, required: true },

  // Sécurité
  password: { type: String, required: true },
  code: { type: String, required: true, unique: true },

  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

/* =========================
   ➕ POST /users
========================= */
app.post('/users', async (req, res) => {
  try {
    const {
      senderFirstName,
      senderLastName,
      email,
      password,
      senderPhone,
      originLocation,
      amount,
      fees,
      feePercent,

      receiverFirstName,
      receiverLastName,
      receiverPhone,
      destinationLocation,
      recoveryAmount,
      recoveryMode
    } = req.body;

    if (
      !senderFirstName || !senderLastName || !email || !password ||
      !senderPhone || !originLocation ||
      amount === undefined || fees === undefined || feePercent === undefined ||
      !receiverFirstName || !receiverLastName || !receiverPhone || 
      !destinationLocation ||
      recoveryAmount === undefined || !recoveryMode
    ) {
      return res.status(400).json({ message: 'Tous les champs sont requis' });
    }

    // Code aléatoire
    const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const number = Math.floor(100 + Math.random() * 900);
    const code = letter + number;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      senderFirstName,
      senderLastName,
      email,
      senderPhone,
      originLocation,
      amount,
      fees,
      feePercent,

      receiverFirstName,
      receiverLastName,
      receiverPhone,
      destinationLocation,
      recoveryAmount,
      recoveryMode,

      password: hashedPassword,
      code
    });

    await user.save();

    res.json({ message: '✅ Transfert enregistré avec succès' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/* =========================
   📄 GET JSON
========================= */
app.get('/users/json', async (req, res) => {
  const users = await User.find({}, { password: 0 });
  res.json(users);
});

/* =========================
   📊 GET HTML
========================= */
app.get('/users/all', async (req, res) => {
  const users = await User.find({}, { password: 0 });

  let html = `
  <!DOCTYPE html>
  <html lang="fr">
  <head>
  <meta charset="UTF-8">
  <title>Liste des transferts</title>
  <style>
    body { font-family: Arial; background:#f4f4f4; }
    table { width:98%; margin:30px auto; border-collapse:collapse; background:#fff; }
    th, td { border:1px solid #ccc; padding:8px; font-size:13px; text-align:center; }
    th { background:#007bff; color:#fff; }
    .exp { background:#e9f1ff; }
    .dest { background:#eaffea; }
  </style>
  </head>
  <body>
  <h2 style="text-align:center;">📋 Liste des transferts</h2>

  <table>
  <tr>
    <th colspan="7" class="exp">EXPÉDITEUR</th>
    <th colspan="6" class="dest">DESTINATAIRE</th>
    <th>Date</th>
  </tr>
  <tr>
    <th>Prénom</th><th>Nom</th><th>Email</th><th>Tél</th><th>Pays</th><th>Montant</th><th>Frais</th>
    <th>Prénom</th><th>Nom</th><th>Tél</th><th>Pays</th><th>Reçu</th><th>Mode</th>
    <th></th>
  </tr>`;

  users.forEach(u => {
    html += `
    <tr>
      <td>${u.senderFirstName}</td>
      <td>${u.senderLastName}</td>
      <td>${u.email}</td>
      <td>${u.senderPhone}</td>
      <td>${u.originCountry}</td>
      <td>${u.amount}</td>
      <td>${u.fees}</td>

      <td>${u.receiverFirstName}</td>
      <td>${u.receiverLastName}</td>
      <td>${u.receiverPhone}</td>
      <td>${u.destinationCountry}</td>
      <td>${u.recoveryAmount}</td>
      <td>${u.recoveryMode}</td>

      <td>${new Date(u.createdAt).toLocaleString()}</td>
    </tr>`;
  });

  html += `</table></body></html>`;
  res.send(html);
});

/* =========================
   🚀 SERVEUR
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('🚀 Serveur en ligne');
});
