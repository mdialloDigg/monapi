const axios = require("axios");

// Remplace par l'ID de ta page et ton Page Access Token
const PAGE_ID = "137008337514";
const PAGE_ACCESS_TOKEN = "https://graph.facebook.com/oauth/access_token?client_id=137008337514&client_secret=63bbf2eab18503e69af6a31d58ae50fa&grant_type=client_credentials";

// Citat137008337514ions de philosophes
const citations = [
  "La liberté consiste à ne dépendre que des lois. — Rousseau",
  "Je pense, donc je suis. — Descartes",
  "Le bonheur est le souverain bien. — Aristote",
  "L’homme est condamné à être libre. — Sartre",
  "Connais-toi toi-même. — Socrate"
];

// Choix aléatoire
const message = citations[Math.floor(Math.random() * citations.length)];

async function publier() {
  try {
    const res = await axios.post(
      `https://graph.facebook.com/v19.0/${PAGE_ID}/feed`,
      {
        message: message,
        access_token: https://graph.facebook.com/oauth/access_token?client_id=137008337514&client_secret=63bbf2eab18503e69af6a31d58ae50fa&grant_type=client_credentials

      }
    );

    console.log("✅ Publication réussie :", res.data);
  } catch (err) {
    console.error("❌ Erreur :", err.response?.data || err.message);
  }
}

publier();
