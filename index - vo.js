const express = require("express");
const app = express();

app.get("/code", (req, res) => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    res.json({ message: "Voici votre code :", code: code });
});

app.listen(3000, () => {
    console.log("API démarrée sur http://localhost:3000");
});