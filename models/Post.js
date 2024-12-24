const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    title: String,
    content: String,
    userId: { type: Number, ref: 'User' } // Use ObjectId for referencing
});

module.exports = mongoose.model('Post', postSchema);
