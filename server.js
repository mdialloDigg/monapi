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
  .catch(console.error);

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
  isRetired:{ type:Boolean, default:false },   // ⭐ IMPORTANT
  retraitHistory:[{ date:Date, mode:String }],
  createdAt:{ type:Date, default:Date.now }
});

const User = mongoose.model('User', userSchema);

/* ================= HOME ================= */
app.get('/',(_,res)=>res.send('🚀 API Transfert active'));

/* ================= AUTH LIST ================= */
app.post('/auth/list',(req,res)=>{
  if(req.body.code===process.env.LIST_CODE){
    req.session.listAccess=true;
    return res.redirect('/users/all');
  }
  res.send('Code incorrect');
});

/* ================= LISTE ================= */
app.get('/users/all', async (req,res)=>{
  if(!req.session.listAccess){
    return res.send(`
    <form method="post" action="/auth/list">
      <input type="password" name="code" placeholder="Code liste">
      <button>OK</button>
    </form>
    `);
  }

  const users = await User.find({}).sort({createdAt:1});

  let html = `
  <html>
  <head>
  <style>
    body{font-family:Arial;background:#f4f6f9}
    table{width:95%;margin:auto;border-collapse:collapse;background:#fff}
    th,td{border:1px solid #ccc;padding:6px;text-align:center}
    th{background:#007bff;color:#fff}
    tr.retired{background:#ffa500;color:#000;font-weight:bold}
    button{padding:5px 10px;border:none;border-radius:4px;cursor:pointer}
    button.retirer{background:#28a745;color:white}
    button.disabled{background:#999;cursor:not-allowed}
  </style>
  </head>
  <body>
  <h2 style="text-align:center">📋 Liste des transferts</h2>
  <table>
  <tr>
    <th>Expéditeur</th>
    <th>Tél</th>
    <th>Montant</th>
    <th>Destinataire</th>
    <th>Destination</th>
    <th>Code</th>
    <th>Action</th>
  </tr>
  `;

  users.forEach(u=>{
    html += `
    <tr class="${u.isRetired ? 'retired':''}">
      <td>${u.senderFirstName||''} ${u.senderLastName||''}</td>
      <td>${u.senderPhone||''}</td>
      <td>${u.amount||0}</td>
      <td>${u.receiverFirstName||''} ${u.receiverLastName||''}</td>
      <td>${u.destinationLocation||''}</td>
      <td>${u.code||''}</td>
      <td>
        ${
          u.isRetired
          ? '✅ Retrait effectué'
          : `<button class="retirer" onclick="retirer('${u._id}',this)">💰 Retirer</button>`
        }
      </td>
    </tr>`;
  });

  html += `
  </table>

  <script>
  async function retirer(id, btn){
    if(!confirm('Confirmer le retrait ?')) return;

    const res = await fetch('/users/retirer',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id, mode:'Espèces'})
    });

    const data = await res.json();
    alert(data.message);

    const row = btn.closest('tr');
    row.classList.add('retired');
    btn.outerHTML = '✅ Retrait effectué';
  }
  </script>

  </body></html>`;

  res.send(html);
});

/* ================= RETRAIT ================= */
app.post('/users/retirer', async (req,res)=>{
  const {id, mode} = req.body;

  await User.findByIdAndUpdate(id,{
    isRetired:true,
    recoveryMode:mode,
    $push:{retraitHistory:{date:new Date(), mode}}
  });

  res.json({message:'💰 Retrait effectué'});
});

/* ================= SERVER ================= */
app.listen(process.env.PORT,()=>{
  console.log('🚀 Serveur lancé');
});
