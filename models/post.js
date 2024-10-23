const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    title: String,
    category: String,
    review: String,
    author: String, // logged user ${username};
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
    date: { type: Date, default: Date.now },
});

const Post = mongoose.model('Post', postSchema);
module.exports = Post;
