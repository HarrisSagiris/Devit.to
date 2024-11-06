/*const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: String,
  upvotes: { type: Number, default: 0 }
});

const postSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: String,
  category: String,
  title: String,
  content: String,
  upvotes: { type: Number, default: 0 },
  downvotes: { type: Number, default: 0 },
  comments: [commentSchema]
});

module.exports = mongoose.model('Post', postSchema);
*/

// models/post.js

const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  username: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  category: String,
  title: String,
  content: String,
  upvotes: { type: Number, default: 0 },
  downvotes: { type: Number, default: 0 },
  upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of users who upvoted
  downvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of users who downvoted
  comments: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, content: String, upvotes: Number }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', postSchema);
