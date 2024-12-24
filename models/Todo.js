const mongoose = require('mongoose');

const todoSchema = new mongoose.Schema({
    item: String,
    userId: { type: Number, required: true } // Ensure this is Number
});

module.exports = mongoose.model('Todo', todoSchema);
