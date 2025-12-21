const express = require("express");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth");
const transferRoutes = require("./routes/transfer");

const app = express();
app.use(express.json());

mongoose.connect("mongodb+srv://mlaminediallo_db_user:amSYetCmMskMw9Cm@cluster0.iaplugg.mongodb.net/?appName=Cluster0")
    .then(() => console.log("✅ MongoDB connecté"))
    .catch(err => console.error(err));

app.use("/auth", authRoutes);
app.use("/facebook", transferRoutes);

app.listen(3000, () => {
    console.log("🚀 API sur http://localhost:3000");
});