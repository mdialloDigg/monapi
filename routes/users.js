const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/user'); // Assure-toi que le chemin est correct

const router = express.Router();

// POST /users → créer un utilisateur avec tous les champs
router.post('/', async (req, res) => {
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

    // Vérification des champs obligatoires
    if (
      !email || !password || amount === undefined ||
      !senderPhone || !receiverPhone ||
      !originLocation || !destinationLocation ||
      fees === undefined || feePercent === undefined ||
      recoveryAmount === undefined || !recoveryMode
    ) {
      return res.status(400).json({ message: 'Tous les champs sont requis' });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Utilisateur déjà existant' });
    }

    // Génération du code automatique : 1 lettre + 3 chiffres
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const letter = letters[Math.floor(Math.random() * letters.length)];
    const number = Math.floor(100 + Math.random() * 900);
    const code = letter + number;

    // Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Création de l'utilisateur
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

    res.json({ message: 'Utilisateur créé avec succès', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// GET /users/all → lister tous les utilisateurs (sans mot de passe)
router.get('/all', async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
