const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { email, password } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            email,
            password: hashedPassword
        });

        await user.save();

        res.json({ message: 'Utilisateur créé avec succès' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

// --------------------
// GET : lister tous les utilisateurs
// --------------------
router.get('/all', async (req, res) => {
    try {
        const users = await User.find({}, { password: 0 }); // On cache le mot de passe
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;





