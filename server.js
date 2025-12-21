require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const cors = require('cors');
const PDFDocument = require('pdfkit');

const app = express();

/* ================= MIDDLEWARE ================= */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

/* ================= MONGODB ================= */
mongoose.connect(process.env.MONGO_URI)
  .then(()=>console.log('✅ MongoDB connecté'))
  .catch(err=>console.error(err));

/* ================= SCHEMA ================= */
const userSchema = new mongoose.Schema({
  senderFirstName:String,
  senderLastName:String,
  senderPhone:String,
  originLocation:String,
  amount:Number,
  fees:Number,
  feePercent:Number,
  receiverFirstName:String,
  receiverLastName:String,
  receiverPhone:String,
  destinationLocation:String,
  recoveryAmount:Number,
  recoveryMode:String,
  code:String,
  status:{type:String,default:'actif'},
  retraitHistory:[{date:Date,mode:String}],
  createdAt:{type:Date,default:Date.now}
});
const User = mongoose.model('User', userSchema);

/* ================= HOME ================= */
app.get('/', (_,res)=>res.send('🚀 API Transfert active'));

/* ================= AUTH FORM ================= */
app.get('/users',(req,res)=>{
  if(!req.session.formAccess){
    return res.send(`
    <h2>🔒 Accès formulaire</h2>
    <form method="post" action="/auth/form">
      <input type="password" name="code" placeholder="Code">
      <button>OK</button>
    </form>`);
  }
  res.redirect('/users/form');
});

app.post('/auth/form',(req,res)=>{
  if(req.body.code===process.env.FORM_CODE)
    req.session.formAccess=true;
  res.redirect('/users/form');
});

/* ================= FORMULAIRE COMPLET ================= */
app.get('/users/form',(req,res)=>{
  if(!req.session.formAccess) return res.redirect('/users');
  res.send(`
  <h2>💸 Nouveau Transfert</h2>
  <form id="f">
    <h3>Expéditeur</h3>
    <input id="senderFirstName" placeholder="Prénom"><br>
    <input id="senderLastName" placeholder="Nom"><br>
    <input id="senderPhone" placeholder="Téléphone" required><br>
    <input id="originLocation" placeholder="Origine"><br>
    <input id="amount" type="number" placeholder="Montant"><br>
    <input id="fees" type="number" placeholder="Frais"><br>

    <h3>Destinataire</h3>
    <input id="receiverFirstName" placeholder="Prénom"><br>
    <input id="receiverLastName" placeholder="Nom"><br>
    <input id="receiverPhone" placeholder="Téléphone"><br>
    <input id="destinationLocation" placeholder="Destination"><br>
    <input id="recoveryAmount" type="number" placeholder="Montant reçu"><br>
    <select id="recoveryMode">
      <option>Espèces</option>
      <option>Orange Money</option>
      <option>Produit</option>
      <option>Service</option>
    </select><br><br>

    <button>💾 Enregistrer</button>
  </form>

  <script>
  f.onsubmit = async e => {
    e.preventDefault();
    const r = await fetch('/users',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        senderFirstName:senderFirstName.value,
        senderLastName:senderLastName.value,
        senderPhone:senderPhone.value,
        originLocation:originLocation.value,
        amount:+amount.value,
        fees:+fees.value,
        receiverFirstName:receiverFirstName.value,
        receiverLastName:receiverLastName.value,
        receiverPhone:receiverPhone.value,
        destinationLocation:destinationLocation.value,
        recoveryAmount:+recoveryAmount.value,
        recoveryMode:recoveryMode.value
      })
    });
    alert((await r.json()).message);
  }
  </script>
  `);
});

/* ================= CREATE ================= */
app.post('/users', async(req,res)=>{
  const code=Math.floor(100000+Math.random()*900000).toString();
  await new User({...req.body,code}).save();
  res.json({message:'✅ Enregistré | Code '+code});
});

/* ================= LISTE ================= */
app.get('/users/all', async(req,res)=>{
  if(!req.session.listAccess){
    return res.send(`
    <form method="post" action="/auth/list">
      <input type="password" name="code" placeholder="Code liste">
      <button>OK</button>
    </form>`);
  }
  const users=await User.find({});
  res.send(`<pre>${JSON.stringify(users,null,2)}</pre>`);
});

app.post('/auth/list',(req,res)=>{
  if(req.body.code===process.env.LIST_CODE)
    req.session.listAccess=true;
  res.redirect('/users/all');
});

/* ================= PDF ================= */
app.get('/users/export/pdf', async(req,res)=>{
  const users=await User.find({});
  const doc=new PDFDocument();
  res.setHeader('Content-Type','application/pdf');
  doc.pipe(res);
  users.forEach(u=>doc.text(JSON.stringify(u)));
  doc.end();
});

/* ================= SERVER ================= */
app.listen(process.env.PORT,()=>console.log('🚀 Serveur prêt'));
