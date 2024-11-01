const express = require('express');
const router = express.Router();
const Post = require('./models/Post');
const Comment = require('../models/Comment');
const User = require('./models/User');

// Get feed page
router.get('/feed', async (req, res) => {
    try {
        // Populate the user field in posts
        const posts = await Post.find().populate('user').exec();
        const comments = await Comment.find().populate('user').exec();
        res.render('feed', { posts, comments });
    } catch (error) {
        console.error("Error fetching posts and comments:", error);
        res.status(500).send("An error occurred while loading the feed.");
    }
});


// Create a new comment or reply
router.post('/comment/:postId', async (req, res) => {
    const { postId } = req.params;
    const { content, parentCommentId } = req.body;

    const newComment = new Comment({
        content,
        user: req.session.userId,
        post: postId,
        parentComment: parentCommentId || null
    });
    await newComment.save();

    // If it's a reply, update the parent comment's replies array
    if (parentCommentId) {
        await Comment.findByIdAndUpdate(parentCommentId, {
            $push: { replies: newComment._id }
        });
    }

    res.redirect('/posts/feed');
});

module.exports = router;
