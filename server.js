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
   📄 PAGE FORMULAIRE
========================= */
app.get('/users', (req, res) => {
  res.sendFile(path.join(__dirname, 'users.html'));
});

/* =========================
   🔗 MONGODB
========================= */
mongoose.connect(
  'mongodb+srv://mlaminediallo_db_user:amSYetCmMskMw9Cm@cluster0.iaplugg.mongodb.net/test'
)
.then(() => console.log('✅ MongoDB connecté'))
.catch(err => console.error('❌ MongoDB erreur:', err));

/* =========================
   📦 SCHEMA
========================= */
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

/* =========================
   ➕ POST /users
========================= */
app.post('/users', async (req, res) => {
  try {
    console.log('📥 DATA REÇUE:', req.body);

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

    if (
      !senderFirstName || !senderLastName || !senderPhone ||
      !originLocation || !destinationLocation ||
      !receiverFirstName || !receiverLastName || !receiverPhone ||
      !password
    ) {
      return res.status(400).json({ message: 'Champs manquants' });
    }

    // Code
    const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const number = Math.floor(100 + Math.random() * 900);
    const code = letter + number;

    const hashedPassword = await bcrypt.hash(password, 10);

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

    res.status(201).json({
      message: '✅ Transfert enregistré',
      code
    });

  } catch (err) {
    console.error('❌ ERREUR:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/* =========================
   📄 JSON
========================= */
app.get('/users/json', async (req, res) => {
  const users = await User.find({}, { password: 0 });
  res.json(users);
});

/* =========================
   🚀 SERVEUR
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('🚀 Serveur démarré sur le port', PORT);
});
