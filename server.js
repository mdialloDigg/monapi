const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // pour servir les fichiers HTML

// Connexion MongoDB (Mongoose 6+ : pas d'options obsolètes)
mongoose.connect('mongodb+srv://mlaminediallo_db_user:amSYetCmMskMw9Cm@cluster0.iaplugg.mongodb.net/test')
  .then(() => console.log('MongoDB connecté'))
  .catch(err => console.error(err));

// Modèle User
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// POST /users
app.post('/users', async (req, res) => {
  try {
    const { email, password, code, amount } = req.body;
    if (!email || !password || !code || amount === undefined)
      return res.status(400).json({ message: 'Tous les champs sont requis' });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Utilisateur déjà existant' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword, code, amount });
    await user.save();
    res.json({ message: 'Utilisateur créé avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// GET /users/all
app.get('/users/all', async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

app.get('/', (req, res) => {
    res.send('https://monapi-bf4o.onrender.com');
});


// Démarrer serveur
app.listen(3000, () => console.log('Serveur sur https://monapi-bf4o.onrender.com'));
