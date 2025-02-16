const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReplySchema = new Schema({
    text: String,
    username: String,
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Add userId reference
    createdAt: { type: Date, default: Date.now }
});

const CommentSchema = new Schema({
    text: String,
    username: String,
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Add userId reference
    postId: { type: Schema.Types.ObjectId, ref: 'Post' },
    createdAt: { type: Date, default: Date.now },
    replies: [ReplySchema]  // Nested array of replies
});

// Add pre-find middleware to populate username from User model
CommentSchema.pre('find', function() {
    this.populate('userId', 'username');
});

ReplySchema.pre('find', function() {
    this.populate('userId', 'username'); 
});

module.exports = mongoose.model('Comment', CommentSchema);
