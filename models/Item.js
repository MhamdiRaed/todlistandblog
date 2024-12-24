const mongoose = require('mongoose');

// Define the Item schema (for the to-do list)
const itemSchema = new mongoose.Schema({
    name: { type: String, required: true },  // Task name
    userId: { type: Number, ref: 'User', required: true }  // Associate tasks with users
});

// Create and export the Item model
module.exports = mongoose.model('Item', itemSchema);
