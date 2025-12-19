const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();

/* =========================
   MIDDLEWARES
========================= */
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

/* =========================
   PAGE FORMULAIRE
========================= */
app.get('/users', (req, res) => {
  res.sendFile(path.join(__dirname, 'users.html'));
});

/* =========================
   CONNEXION MONGODB
========================= */
mongoose.connect(
  'mongodb+srv://mlaminediallo_db_user:amSYetCmMskMw9Cm@cluster0.iaplugg.mongodb.net/test'
)
.then(() => console.log('✅ MongoDB connecté'))
.catch(err => console.error('❌ MongoDB erreur:', err));

/* =========================
   SCHÉMA USER
========================= */
const userSchema = new mongoose.Schema({
  // Expéditeur
  senderFirstName: { type: String, required: true },
  senderLastName: { type: String, required: true },
  senderPhone: { type: String, required: true },
  originLocation: { type: String, required: true },
  amount: { type: Number, required: true },
  fees: { type: Number, required: true },
  feePercent: { type: Number, required: true },

  // Destinataire
  receiverFirstName: { type: String, required: true },
  receiverLastName: { type: String, required: true },
  receiverPhone: { type: String, required: true },
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
   POST /users
========================= */
app.post('/users', async (req, res) => {
  try {
    console.log('📥 Données reçues:', req.body);

    const {
      senderFirstName,
      senderLastName,
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
      !senderFirstName || !senderLastName || !password ||
      !senderPhone || !originLocation ||
      amount === undefined || fees === undefined || feePercent === undefined ||
      !receiverFirstName || !receiverLastName || !receiverPhone ||
      !destinationLocation || recoveryAmount === undefined || !recoveryMode
    ) {
      return res.status(400).json({ message: 'Tous les champs sont requis' });
    }

    // Génération du code
    const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const number = Math.floor(100 + Math.random() * 900);
    const code = letter + number;

    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('⏳ Sauvegarde MongoDB...');

    const user = new User({
      senderFirstName,
      senderLastName,
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

    console.log('✅ Sauvegarde réussie');

    res.json({
      message: '✅ Transfert enregistré avec succès',
      code
    });

  } catch (err) {
    console.error('❌ ERREUR SERVEUR:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/* =========================
   JSON DES TRANSFERTS
========================= */
app.get('/users/json', async (req, res) => {
  const users = await User.find({}, { password: 0 });
  res.json(users);
});

/* =========================
   PAGE LISTE HTML
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
  .dest { background:#fff3cd; }
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
  <th>Prénom</th><th>Nom</th><th>Tél</th><th>Origine</th><th>Montant</th><th>Frais</th><th>Code</th>
  <th>Prénom</th><th>Nom</th><th>Tél</th><th>Destination</th><th>Reçu</th><th>Mode</th>
  <th></th>
</tr>
`;

  users.forEach(u => {
    html += `
<tr>
  <td>${u.senderFirstName}</td>
  <td>${u.senderLastName}</td>
  <td>${u.senderPhone}</td>
  <td>${u.originLocation}</td>
  <td>${u.amount}</td>
  <td>${u.fees}</td>
  <td>${u.code}</td>

  <td>${u.receiverFirstName}</td>
  <td>${u.receiverLastName}</td>
  <td>${u.receiverPhone}</td>
  <td>${u.destinationLocation}</td>
  <td>${u.recoveryAmount}</td>
  <td>${u.recoveryMode}</td>

  <td>${new Date(u.createdAt).toLocaleString()}</td>
</tr>
`;
  });

  html += `</table></body></html>`;
  res.send(html);
});

/* =========================
   SERVEUR
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('🚀 Serveur en ligne sur le port', PORT));
