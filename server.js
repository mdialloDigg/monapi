const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const axios = require('axios');

const app = express();

/* ================= MIDDLEWARE ================= */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'super-secret-transfert-key',
  resave: false,
  saveUninitialized: false
}));

/* ================= MONGODB ================= */
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('✅ MongoDB connecté'))
.catch(console.error);

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
  receiverPhone: String, // NUMÉRO ORANGE MONEY
  destinationLocation: String,
  recoveryAmount: Number,
  recoveryMode: String,

  password: String,
  code: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

/* ================= ORANGE MONEY AUTH ================= */
async function getOrangeToken() {
  const auth = Buffer.from(
    process.env.ORANGE_CLIENT_ID + ':' + process.env.ORANGE_CLIENT_SECRET
  ).toString('base64');

  const res = await axios.post(
    `${process.env.ORANGE_API_BASE}/oauth/v3/token`,
    'grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  return res.data.access_token;
}

/* ================= ENVOI ORANGE MONEY ================= */
app.post('/orange-money/send', async (req, res) => {
  try {
    const { phone, amount, reference } = req.body;

    if (!process.env.ORANGE_CLIENT_ID) {
      return res.status(503).json({
        message: 'Orange Money API non configurée'
      });
    }

    const token = await getOrangeToken();

    const response = await axios.post(
      `${process.env.ORANGE_API_BASE}/orange-money-webpay/dev/v1/webpayment`,
      {
        merchant_key: process.env.ORANGE_MERCHANT_NUMBER,
        amount,
        currency: 'XOF',
        order_id: reference,
        return_url: 'https://tonsite.com/success',
        cancel_url: 'https://tonsite.com/cancel',
        notif_url: 'https://tonsite.com/notify'
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    res.json({
      message: '✅ Transfert Orange Money initié',
      data: response.data
    });

  } catch (err) {
    res.status(500).json({
      message: '❌ Erreur Orange Money',
      error: err.response?.data || err.message
    });
  }
});

/* ================= SAVE TRANSFERT ================= */
app.post('/users', async (req, res) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const hash = await bcrypt.hash(req.body.password, 10);

  const transfert = await new User({
    ...req.body,
    password: hash,
    code
  }).save();

  // 👉 SI MODE ORANGE MONEY
  if (req.body.recoveryMode === 'Orange Money') {
    await axios.post(`${req.protocol}://${req.get('host')}/orange-money/send`, {
      phone: req.body.receiverPhone,
      amount: req.body.recoveryAmount,
      reference: code
    });
  }

  res.json({ message: '✅ Transfert enregistré', code });
});
    
/* ================= SERVER ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log('🚀 Serveur démarré sur le port', PORT)
);
