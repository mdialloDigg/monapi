// server.js
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');



const app = express();
app.use(cors());
app.use(express.json());
//app.use(express.static(__dirname));

// Afficher le formulaire HTML
app.use(express.static(path.join(__dirname, 'public')));
app.get('/users', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'users.html'));
});


// Connexion MongoDB
mongoose.connect(
  'mongodb+srv://mlaminediallo_db_user:amSYetCmMskMw9Cm@cluster0.iaplugg.mongodb.net/test'
)
.then(() => console.log('✅ MongoDB connecté'))
.catch(err => console.error('❌ MongoDB erreur:', err));

// Modèle User
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

// POST /users → créer une transaction
app.post('/users', async (req, res) => {
  try {
    const {
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
      password
    } = req.body;

    // Validation stricte
    if (!senderFirstName || !senderLastName || !senderPhone || !originLocation ||
        !receiverFirstName || !receiverLastName || !receiverPhone || !destinationLocation ||
        !recoveryMode || !password || isNaN(amount) || isNaN(fees) || isNaN(feePercent) || isNaN(recoveryAmount)) {
      return res.status(400).json({ message: 'Tous les champs sont requis et doivent être valides' });
    }

    // Générer un code aléatoire (A123)
    const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const number = Math.floor(100 + Math.random() * 900);
    const code = letter + number;

    // Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      senderFirstName,
      senderLastName,
      senderPhone,
      originLocation,
      amount: Number(amount),
      fees: Number(fees),
      feePercent: Number(feePercent),
      receiverFirstName,
      receiverLastName,
      receiverPhone,
      destinationLocation,
      recoveryAmount: Number(recoveryAmount),
      recoveryMode,
      password: hashedPassword,
      code
    });

    await user.save();
    res.status(201).json({ message: '✅ Transfert enregistré avec succès', code });

  } catch (err) {
    console.error('ERROR POST /users:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// GET /users/json → liste JSON
app.get('/users/json', async (req, res) => {
  try {
    const users = await User.find({}, { password: 0, __v: 0 });
    res.json(users);
  } catch (err) {
    console.error('ERROR GET /users/json:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /users/all → afficher HTML
app.get('/users/all', async (req, res) => {
  try {
    const users = await User.find({}, { password: 0, __v: 0 });

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
          .dest { background:#ffdede; }
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
        </tr>`;
    });

    html += `</table></body></html>`;
    res.send(html);

  } catch (err) {
    console.error('ERROR GET /users/all:', err);
    res.status(500).send('Erreur serveur');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('🚀 Serveur en ligne sur le port', PORT));
