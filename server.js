const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// 🔹 Afficher le formulaire HTML
app.get('/users', (req, res) => {
  res.sendFile(path.join(__dirname, 'users.html'));
});

// 🔹 Connexion MongoDB
mongoose.connect('mongodb+srv://mlaminediallo_db_user:amSYetCmMskMw9Cm@cluster0.iaplugg.mongodb.net/test')
  .then(() => console.log('MongoDB connecté'))
  .catch(err => console.error(err));

// 🔹 Modèle User
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  code: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },

  senderPhone: { type: String, required: true },
  receiverPhone: { type: String, required: true },

  originLocation: { type: String, required: true },
  destinationLocation: { type: String, required: true },

  fees: { type: Number, required: true },
  feePercent: { type: Number, required: true },

  recoveryAmount: { type: Number, required: true },
  recoveryMode: { type: String, required: true },

  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// 🔹 POST /users → créer un utilisateur
app.post('/users', async (req, res) => {
  try {
    const {
      email,
      password,
      amount,
      senderPhone,
      receiverPhone,
      originLocation,
      destinationLocation,
      fees,
      feePercent,
      recoveryAmount,
      recoveryMode
    } = req.body;

    if (
      !email || !password || amount === undefined ||
      !senderPhone || !receiverPhone ||
      !originLocation || !destinationLocation ||
      fees === undefined || feePercent === undefined ||
      recoveryAmount === undefined || !recoveryMode
    ) {
      return res.status(400).json({ message: 'Tous les champs sont requis' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Utilisateur déjà existant' });
    }

    // Générer code 1 lettre + 3 chiffres
    const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const number = Math.floor(100 + Math.random() * 900);
    const code = letter + number;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      password: hashedPassword,
      code,
      amount,
      senderPhone,
      receiverPhone,
      originLocation,
      destinationLocation,
      fees,
      feePercent,
      recoveryAmount,
      recoveryMode
    });

    await user.save();

    res.json({ message: 'Utilisateur créé avec succès' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// 🔹 GET /users/all → tableau HTML
app.get('/users/all', async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 });

    let html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>Liste des utilisateurs</title>
      <style>
        body { font-family: Arial; background: #f4f6f8; }
        table { border-collapse: collapse; width: 95%; margin: 30px auto; background: white; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: center; }
        th { background: #007bff; color: white; }
      </style>
    </head>
    <body>
    <h2 style="text-align:center;">Liste des utilisateurs</h2>
    <table>
      <tr>
        <th>Email</th>
        <th>Code</th>
        <th>Montant</th>
        <th>Expéditeur</th>
        <th>Destinataire</th>
        <th>Origine</th>
        <th>Destination</th>
        <th>Frais</th>
        <th>%</th>
        <th>Récupération</th>
        <th>Mode</th>
        <th>Date</th>
      </tr>`;

    users.forEach(u => {
      html += `
      <tr>
        <td>${u.email}</td>
        <td>${u.code}</td>
        <td>${u.amount}</td>
        <td>${u.senderPhone}</td>
        <td>${u.receiverPhone}</td>
        <td>${u.originLocation}</td>
        <td>${u.destinationLocation}</td>
        <td>${u.fees}</td>
        <td>${u.feePercent}</td>
        <td>${u.recoveryAmount}</td>
        <td>${u.recoveryMode}</td>
        <td>${new Date(u.createdAt).toLocaleString()}</td>
      </tr>`;
    });

    html += `</table></body></html>`;
    res.send(html);

  } catch (err) {
    res.status(500).send('Erreur serveur');
  }
});

// 🔹 Page racine
app.get('/', (req, res) => {
  res.send('API en ligne');
});

// 🔹 Lancer serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Serveur démarré');
});
