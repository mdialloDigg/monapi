const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Auth / identification
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  password: {
    type: String,
    required: true
  },

  // Code transaction (1 lettre + 3 chiffres)
  code: {
    type: String,
    required: true,
    unique: true
  },

  // Montant principal
  amount: {
    type: Number,
    required: true
  },

  // Téléphones
  senderPhone: {
    type: String,
    required: true
  },

  receiverPhone: {
    type: String,
    required: true
  },

  // Lieux
  originLocation: {
    type: String,
    required: true
  },

  destinationLocation: {
    type: String,
    required: true
  },

  // Frais
  fees: {
    type: Number,
    required: true
  },

  feePercent: {
    type: Number,
    required: true
  },

  // Récupération
  recoveryAmount: {
    type: Number,
    required: true
  },

  recoveryMode: {
    type: String,
    required: true,
    enum: ['cash', 'mobile_money', 'bank', 'autre']
  },

  // Date
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
