const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.use(
  session({
    secret: 'super-secret-transfert-key',
    resave: false,
    saveUninitialized: false
  })
);

/* ======================================================
   ROUTES / FORMULAIRE / AUTH
====================================================== */
app.get('/', (req, res) => res.send('🚀 API Transfert en ligne'));

app.get('/users', (req, res) => {
  if (req.session.formAccess) {
    return res.sendFile(path.join(__dirname, 'users.html'));
  }
  res.redirect('/users');
});

app.post('/users', (req, res) => {
  if (req.body.code === '123') req.session.formAccess = true;
  res.redirect('/users');
});

app.get('/users/all', async (req, res) => {
  if (!req.session.listAccess) return res.redirect('/users/all');

  try {
    const users = await User.find({}, { __v: 0 });
    let totalAmount = 0, totalRecovery = 0;
    users.forEach(u => { totalAmount += u.amount; totalRecovery += u.recoveryAmount; });

    let html = `<h2 style="text-align:center">Liste des transferts</h2><table border="1" width="98%" align="center"><tr>
    <th>Expéditeur</th><th>Montant</th><th>Destination</th><th>Reçu</th><th>Code</th><th>Date</th></tr>`;

    users.forEach(u => {
      html += `<tr>
      <td>${u.senderFirstName} ${u.senderLastName}</td>
      <td>${u.amount}</td>
      <td>${u.destinationLocation}</td>
      <td>${u.recoveryAmount}</td>
      <td>${u.code}</td>
      <td>${new Date(u.createdAt).toLocaleString()}</td>
      </tr>`;
    });

    html += `<tr><td><b>TOTAL</b></td><td><b>${totalAmount}</b></td><td></td><td><b>${totalRecovery}</b></td><td></td><td></td></tr></table>`;
    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
});

app.post('/users/all', (req, res) => {
  if (req.body.code === '147') req.session.listAccess = true;
  res.redirect('/users/all');
});

/* ======================================================
   MONGODB
====================================================== */
mongoose.connect(
  'mongodb+srv://mlaminediallo_db_user:amSYetCmMskMw9Cm@cluster0.iaplugg.mongodb.net/test'
)
.then(() => console.log('✅ MongoDB connecté'))
.catch(err => console.error(err));

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
  code: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Fonction pour générer un code unique
async function generateUniqueCode() {
  let code;
  let exists = true;
  while (exists) {
    code = Math.floor(100000 + Math.random() * 900000).toString();
    exists = await User.exists({ code });
  }
  return code;
}

/* ======================================================
   ROUTE POST /users pour fetch JSON
====================================================== */
app.post('/users', async (req, res) => {
  try {
    const code = await generateUniqueCode();
    const newUser = new User({ ...req.body, code });
    await newUser.save();
    res.json({ message: 'Transfert enregistré avec succès', code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur lors de l’enregistrement' });
  }
});

/* ======================================================
   SERVEUR
====================================================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('🚀 Serveur en ligne sur le port', PORT));
