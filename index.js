const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();

// POST /facebook
router.post("/", async (req, res) => {
  const { accessToken } = req.body;

  if (!accessToken) {
    return res.status(400).json({ error: "Token manquant" });
  }

  try {
    // Vérification du token avec Facebook
    const fbResponse = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`
    );

    const data = await fbResponse.json();

    if (data.error) {
      return res.status(401).json({ error: "Token Facebook invalide" });
    }

    // Ici tu peux enregistrer l'utilisateur en DB
    res.json({
      message: "Connexion Facebook OK",
      user: data
    });

  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
