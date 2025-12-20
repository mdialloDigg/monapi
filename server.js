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
      <html><body style="text-align:center;margin-top:60px">
      <h2>🔒 Accès formulaire</h2>
      <form method="post" action="/auth/form">
        <input type="password" name="code" placeholder="Code d'accès" required>
        <br><br>
        <button>Valider</button>
      </form>
      </body></html>
    `);
  }

res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Créer un transfert</title>
<style>
body{font-family:Arial;background:#f2f2f2}
form{background:#fff;width:900px;margin:40px auto;padding:20px;border-radius:8px}
.container{display:flex;gap:20px}
.box{flex:1;padding:15px;border-radius:6px}
.origin{background:#e9f1ff}
.dest{background:#ffdede}
input,select,button{width:100%;padding:8px;margin-top:8px}
button{font-size:15px}
#save{background:#007bff;color:#fff}
#print{background:#28a745;color:#fff}
#logout{background:#dc3545;color:#fff}
#message{text-align:center;font-weight:bold}
</style>
</head>
<body>

<form id="form">
<h3 style="text-align:center">💸 Créer un transfert</h3>

<div class="container">
<div class="box origin">
<h4>📤 Origine</h4>
<input id="senderFirstName" placeholder="Prénom expéditeur" required>
<input id="senderLastName" placeholder="Nom expéditeur" required>
<input id="senderPhone" placeholder="Téléphone expéditeur" required>
<input id="originLocation" placeholder="Origine" required>
<input id="amount" type="number" placeholder="Montant" required>
<input id="fees" type="number" placeholder="Frais" required>
<input id="feePercent" type="number" placeholder="% Frais" required>
</div>

<div class="box dest">
<h4>📥 Destination</h4>
<input id="receiverFirstName" placeholder="Prénom destinataire" required>
<input id="receiverLastName" placeholder="Nom destinataire" required>
<input id="receiverPhone" placeholder="Téléphone destinataire" required>
<input id="destinationLocation" placeholder="Destination" required>
<input id="recoveryAmount" type="number" placeholder="Montant reçu" required>
<input id="recoveryMode" placeholder="Mode de récupération" required>
</div>
</div>

<input id="password" type="password" placeholder="Mot de passe" required>

<button id="save">💾 Enregistrer</button>
<button id="print" type="button" onclick="printReceipt()">🖨 Imprimer</button>
<button id="logout" type="button" onclick="location.href='/logout'">Se déconnecter</button>

<p id="message"></p>
</form>

<script>
let lastCode = '';

form.addEventListener('submit', async e => {
  e.preventDefault();

  const payload = {
    senderFirstName: senderFirstName.value,
    senderLastName: senderLastName.value,
    senderPhone: senderPhone.value,
    originLocation: originLocation.value,
    amount: Number(amount.value),
    fees: Number(fees.value),
    feePercent: Number(feePercent.value),

    receiverFirstName: receiverFirstName.value,
    receiverLastName: receiverLastName.value,
    receiverPhone: receiverPhone.value,
    destinationLocation: destinationLocation.value,
    recoveryAmount: Number(recoveryAmount.value),
    recoveryMode: recoveryMode.value,

    password: password.value
  };

  const res = await fetch('/users', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  message.style.color = res.ok ? 'green' : 'red';
  message.innerText = data.message + ' | Code : ' + data.code;
  if(res.ok) lastCode = data.code;
});

function printReceipt(){
  if(!lastCode){
    alert("Veuillez enregistrer d'abord");
    return;
  }

  const w = window.open('', '', 'width=400,height=400');
  w.document.write(
    '<h2>📄 Reçu de transfert</h2>' +
    '<p><b>Code :</b> ' + lastCode + '</p>' +
    '<p><b>Destinataire :</b> ' +
    receiverFirstName.value + ' ' + receiverLastName.value + '</p>' +
    '<p><b>Destination :</b> ' + destinationLocation.value + '</p>'
  );
  w.document.close();
  w.print();
}
</script>

</body>
</html>
`);
});

/* ================= AUTH ================= */
app.post('/auth/form',(req,res)=>{
  if(req.body.code==='123') req.session.formAccess=true;
  res.redirect('/users');
});

/* ================= SAVE ================= */
app.post('/users', async (req,res)=>{
  const code = Math.floor(100000+Math.random()*900000).toString();
  const hash = await bcrypt.hash(req.body.password,10);
  await new User({...req.body,password:hash,code}).save();
  res.json({message:'✅ Transfert enregistré',code});
});

/* ================= LOGOUT ================= */
app.get('/logout',(req,res)=>{
  req.session.destroy(()=>res.redirect('/users'));
});

/* ================= SERVER ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>console.log('🚀 Serveur lancé sur le port',PORT));
