// User.js
const mongoose = require('mongoose');
const autoIncrement = require('mongoose-sequence')(mongoose);

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    userId: { type: Number, unique: true } // Auto-incremented userId
});

userSchema.plugin(autoIncrement, { inc_field: 'userId', start_seq: 1 });

module.exports = mongoose.model('User', userSchema);
