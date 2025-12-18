const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User'); // ⚠️ respecte bien la casse du fichier

const router = express.Router();

/* =====================================================
   POST /users → créer une transaction utilisateur
===================================================== */
router.post('/', async (req, res) => {
  try {
    const {
      // 🔐 Auth
      email,
      password,

      // 📤 Expéditeur
      senderFirstName,
      senderLastName,
      senderPhone,
      originLocation, // 🔹 uniquement le lieu

      // 💰 Transaction
      amount,
      fees,
      feePercent,

      // 📥 Destinataire
      receiverFirstName,
      receiverLastName,
      receiverPhone,
      destinationLocation, // 🔹 uniquement le lieu

      // 💵 Récupération
      recoveryAmount,
      recoveryMode
    } = req.body;

    /* =========================
       ✅ Validation
    ========================= */
    if (
      !email || !password ||
      !senderFirstName || !senderLastName || !senderPhone ||
      !originLocation ||
      amount === undefined || fees === undefined || feePercent === undefined ||
      !receiverFirstName || !receiverLastName || !receiverPhone ||
      !destinationLocation ||
      recoveryAmount === undefined || !recoveryMode
    ) {
      return res.status(400).json({ message: 'Tous les champs sont requis' });
    }

    /* =========================
       🔎 Vérifier email existant
    ========================= */
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Utilisateur déjà existant' });
    }

    /* =========================
       🔐 Hash mot de passe
    ========================= */
    const hashedPassword = await bcrypt.hash(password, 10);

    /* =========================
       🔢 Générer code (A123)
    ========================= */
    const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const number = Math.floor(100 + Math.random() * 900);
    const code = letter + number;

    /* =========================
       📦 Création utilisateur
    ========================= */
    const user = new User({
      email,
      password: hashedPassword,
      code,

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
      recoveryMode
    });

    await user.save();

    res.status(201).json({
      message: 'Transaction créée avec succès',
      code
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/* =====================================================
   GET /users/all → liste JSON (sans mot de passe)
===================================================== */
router.get('/all', async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
