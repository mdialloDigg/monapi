const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // pour servir les fichiers HTML

// Afficher le formulaire HTML à distance
app.get('/users', (req, res) => {
  res.sendFile(path.join(__dirname, 'users.html'));
});



// Connexion MongoDB
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

// POST /users → créer un utilisateur
app.post('/users', async (req, res) => {
  try {
    const { email, password, amount } = req.body;
    if (!email || !password || amount === undefined)
      return res.status(400).json({ message: 'Tous les champs sont requis' });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Utilisateur déjà existant' });

    // Génération code 1 lettre + 3 chiffres
    const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const number = Math.floor(100 + Math.random() * 900);
    const code = letter + number;

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword, code, amount });
    await user.save();

    res.json({ message: 'Utilisateur créé avec succès', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// GET /users/all → afficher les utilisateurs dans un tableau HTML
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
            table { border-collapse: collapse; width: 80%; margin: 40px auto; background: white; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: center; }
            th { background: #007bff; color: white; }
            h2 { text-align: center; margin-top: 20px; }
        </style>
    </head>
    <body>
    <h2>Liste des utilisateurs</h2>
    <table>
        <thead>
            <tr>
                <th>Email</th>
                <th>Code</th>
                <th>Montant</th>
                <th>Date</th>
            </tr>
        </thead>
        <tbody>
    `;

    users.forEach(user => {
      html += `
        <tr>
            <td>${user.email}</td>
            <td>${user.code}</td>
            <td>${user.amount}</td>
            <td>${new Date(user.createdAt).toLocaleString()}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
    </table>
    </body>
    </html>
    `;

    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
});

app.get('/', (req, res) => {
    res.send('API en ligne ! Utilise /users pour POST et /users/all pour le tableau HTML');
});

// Démarrer serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur sur https://monapi-bf4o.onrender.com`));
