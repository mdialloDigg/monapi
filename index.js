const axios = require("axios");

// ⚠️ Remplace par l'ID de ta page et ton App Secret
const PAGE_ID = "134895793791914";
const APP_ID = "137008337514";
const APP_SECRET = "63bbf2eab18503e69af6a31d58ae50fa";

// Citations de philosophes
const citations = [
  "La liberté consiste à ne dépendre que des lois. — Rousseau",
  "Je pense, donc je suis. — Descartes",
  "Le bonheur est le souverain bien. — Aristote",
  "L’homme est condamné à être libre. — Sartre",
  "Connais-toi toi-même. — Socrate"
];

// Sélection aléatoire
const message = citations[Math.floor(Math.random() * citations.length)];

// Récupérer dynamiquement un App Access Token
async function getAppToken() {
  try {
    const res = await axios.get("https://graph.facebook.com/oauth/access_token", {
      params: {
        client_id: APP_ID,
        client_secret: APP_SECRET,
        grant_type: "client_credentials"
      }
    });
    return res.data.access_token;
  } catch (err) {
    console.error("❌ Erreur lors de la récupération du token :", err.response?.data || err.message);
    process.exit(1);
  }
}

// Publier la citation sur la page
async function publier() {
  const token = await getAppToken();

  try {
    const res = await axios.post(
      `https://graph.facebook.com/v19.0/${PAGE_ID}/feed`,
      { message: message, access_token: token }
    );
    console.log("✅ Publication réussie :", res.data);
  } catch (err) {
    console.error("❌ Erreur lors de la publication :", err.response?.data || err.message);
  }
}

publier();
