const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    content: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' }, // Link to the parent post
    parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }, // Link to the parent comment if it's a reply
    replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }], // Array of reply comment IDs
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Comment', commentSchema);
