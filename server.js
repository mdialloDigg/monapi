const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const session = require('express-session');

const app = express();

/* ================= MIDDLEWARE ================= */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: 'super-secret-transfert-key',
    resave: false,
    saveUninitialized: false
  })
);

/* ================= MONGODB ================= */
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
  code: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

/* ================= FORMULAIRE ================= */
app.get('/users', (req, res) => {
  if (!req.session.formAccess) {
    return res.send(`
      <h2 style="text-align:center;margin-top:60px">🔒 Accès formulaire</h2>
      <form method="post" action="/auth/form" style="text-align:center">
        <input type="password" name="code" placeholder="Code d'accès" required>
        <br><br>
        <button>Valider</button>
      </form>
    `);
  }

  res.send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Transfert</title></head>
<body>
<h3>💸 Formulaire de transfert</h3>
<form id="form">
<input id="senderFirstName" placeholder="Prénom expéditeur" required>
<input id="senderLastName" placeholder="Nom expéditeur" required>
<input id="senderPhone" placeholder="Téléphone expéditeur" required>
<input id="originLocation" placeholder="Origine" required>
<input id="amount" type="number" placeholder="Montant" required>
<input id="fees" type="number" placeholder="Frais" required>
<input id="feePercent" type="number" placeholder="% Frais" required>

<input id="receiverFirstName" placeholder="Prénom destinataire" required>
<input id="receiverLastName" placeholder="Nom destinataire" required>
<input id="receiverPhone" placeholder="Téléphone destinataire" required>
<input id="destinationLocation" placeholder="Destination" required>
<input id="recoveryAmount" type="number" placeholder="Montant reçu" required>
<input id="recoveryMode" placeholder="Mode récupération" required>

<input id="password" type="password" placeholder="Mot de passe" required>

<button>💾 Enregistrer</button>
<button type="button" onclick="printReceipt()">🖨 Imprimer</button>
<button type="button" onclick="location.href='/logout'">Se déconnecter</button>
<p id="message"></p>
</form>

<script>
let lastCode = '';
form.onsubmit = async e => {
  e.preventDefault();
  const res = await fetch('/users',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      senderFirstName: senderFirstName.value,
      senderLastName: senderLastName.value,
      senderPhone: senderPhone.value,
      originLocation: originLocation.value,
      amount:+amount.value,
      fees:+fees.value,
      feePercent:+feePercent.value,
      receiverFirstName: receiverFirstName.value,
      receiverLastName: receiverLastName.value,
      receiverPhone: receiverPhone.value,
      destinationLocation: destinationLocation.value,
      recoveryAmount:+recoveryAmount.value,
      recoveryMode: recoveryMode.value,
      password: password.value
    })
  });
  const data = await res.json();
  message.innerText = data.message + ' | Code : ' + data.code;
  lastCode = data.code;
};

function printReceipt(){
  if(!lastCode) return alert('Enregistrez d’abord');
  const w = window.open('');
  w.document.write('<h3>Reçu</h3><p>Code: '+lastCode+'</p><p>Destinataire: '+receiverFirstName.value+' '+receiverLastName.value+'</p><p>Destination: '+destinationLocation.value+'</p>');
  w.print();
}
</script>
</body></html>`);
});

/* ================= AUTH FORM ================= */
app.post('/auth/form',(req,res)=>{
  if(req.body.code==='123') req.session.formAccess=true;
  res.redirect('/users');
});

/* ================= SAVE ================= */
app.post('/users', async (req,res)=>{
  const code = Math.floor(100000+Math.random()*900000).toString();
  const hash = await bcrypt.hash(req.body.password,10);
  await new User({...req.body,password:hash,code}).save();
  res.json({message:'✅ Enregistré',code});
});

/* ================= LISTE DES TRANSFERTS ================= */
app.get('/users/all', async (req,res)=>{
  if(!req.session.listAccess){
    return res.send(`
      <h2 style="text-align:center;margin-top:60px">🔒 Accès liste</h2>
      <form method="post" action="/auth/list" style="text-align:center">
        <input type="password" name="code" placeholder="Code d'accès" required>
        <br><br>
        <button>Valider</button>
      </form>
    `);
  }

  const users = await User.find({}, {password:0,__v:0});
  let html = '<h2>📋 Liste des transferts</h2><a href="/logout">Se déconnecter</a><table border="1" width="100%"><tr><th>Code</th><th>Expéditeur</th><th>Destinataire</th><th>Montant</th><th>Destination</th></tr>';
  users.forEach(u=>{
    html+=`<tr>
      <td>${u.code}</td>
      <td>${u.senderFirstName} ${u.senderLastName}</td>
      <td>${u.receiverFirstName} ${u.receiverLastName}</td>
      <td>${u.amount}</td>
      <td>${u.destinationLocation}</td>
    </tr>`;
  });
  html+='</table>';
  res.send(html);
});

/* ================= AUTH LIST ================= */
app.post('/auth/list',(req,res)=>{
  if(req.body.code==='147') req.session.listAccess=true;
  res.redirect('/users/all');
});

/* ================= LOGOUT ================= */
app.get('/logout',(req,res)=>{
  req.session.destroy(()=>res.redirect('/users'));
});

/* ================= SERVER ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>console.log('🚀 Serveur sur port',PORT));
