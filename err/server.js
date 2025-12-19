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

// Servir uniquement le dossier public
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Route racine (corrige "Cannot GET /")
app.get('/', (req, res) => {
  res.send('🚀 API Transfert en ligne');
});

// Connexion MongoDB (utilise une variable d’environnement sur Render)
mongoose.connect(process.env.MONGO_URI)
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

// ✅ POST /api/users → créer un transfert
app.post('/api/users', async (req, res) => {
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
      return res.status(400).json({ message: 'Champs invalides' });
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
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ✅ GET /api/users → JSON
app.get('/api/users', async (req, res) => {
  const users = await User.find({}, { password: 0, __v: 0 });
  res.json(users);
});

// ✅ GET /users → page HTML
app.get('/users', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'users.html'));
});

// Port Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Serveur lancé sur le port ${PORT}`)
);
