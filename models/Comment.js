const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReplySchema = new Schema({
    text: String,
    username: String,
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    likes: { type: Number, default: 0 },
    likedBy: [{ type: String }] // Store usernames of users who liked
});

const CommentSchema = new Schema({
    text: String,
    username: String,
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    postId: { type: Schema.Types.ObjectId, ref: 'Post' },
    createdAt: { type: Date, default: Date.now },
    likes: { type: Number, default: 0 },
    likedBy: [{ type: String }], // Store usernames of users who liked
    replies: [ReplySchema]
});

// Add pre-find middleware to populate username from User model
CommentSchema.pre('find', function() {
    this.populate('userId', 'username');
});

ReplySchema.pre('find', function() {
    this.populate('userId', 'username'); 
});

module.exports = mongoose.model('Comment', CommentSchema);
