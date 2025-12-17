const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(
    'mongodb+srv://mlaminediallo_db_user:amSYetCmMskMw9Cm@cluster0.iaplugg.mongodb.net/test'
).then(() => console.log('MongoDB connecté'));

app.use('/users', require('./routes/users'));

app.listen(3000, () => {
    console.log('Serveur sur http://localhost:3000');
});


const path = require('path');

// Permet de servir tous les fichiers HTML du dossier du projet
app.use(express.static(__dirname));

app.use(cors()); // autorise toutes les requêtes cross-origin
