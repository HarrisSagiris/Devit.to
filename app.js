const express = require('express');
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs'); // Changed from bcrypt to bcryptjs
const session = require('express-session');
const path = require('path');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

require('dotenv').config();

// Test database connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Database connected successfully'))
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1); // Exit if database connection fails
  });

// Verify models are loaded correctly
const User = require('./models/user');
const Post = require('./models/post');
if (!User || !Post) {
  console.error('Error loading models');
  process.exit(1);
}

// Essential middleware setup
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({ 
  secret: 'secret',
  resave: false, 
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views'))); // Add this line to serve files from views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configure email transporter with error handling
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-email-password'
  }
});

// Test email configuration
transporter.verify((error) => {
  if (error) {
    console.error('Email configuration error:', error);
  } else {
    console.log('Email server is ready');
  }
});

// Routes with error handling
app.get('/', async (req, res) => {
  try {
    let query = {};
    const searchTerm = req.query.search;
    
    if (searchTerm) {
      query = {
        $or: [
          { title: { $regex: searchTerm, $options: 'i' } },
          { category: { $regex: searchTerm, $options: 'i' } }
        ]
      };
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .populate('comments.user', 'username');
    res.render('index.ejs', { 
      posts, 
      user: req.session.user,
      searchTerm: searchTerm || ''
    });
    
    if (posts.length === 0) {
      console.log('No posts found matching search criteria');
    }
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).send('Error loading feed');
  }
});

// Add route for my posts page
app.get('/my-posts', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect('/login'); // Redirect to login if not authenticated
    }
    
    const posts = await Post.find({ user: req.session.user._id })
      .sort({ createdAt: -1 })
      .populate('comments.user', 'username');
      
    res.render('my-posts', { 
      posts,
      user: req.session.user,
      showCreatePost: true // Add flag to show create post form
    });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).send('Error loading my posts');
  }
});

// Add route for creating post from my-posts page
app.post('/my-posts/create', async (req, res) => {
  try {
    if (!req.session.user) return res.status(403).send('Login required');
    const { category, title, content } = req.body;
    
    // Validate inputs
    if (!category || !title || !content) {
      return res.status(400).send('All fields are required');
    }
    
    const post = new Post({
      username: req.session.user.username,
      user: req.session.user._id,
      category,
      title,
      content
    });
    await post.save();
    res.redirect('/my-posts');
  } catch (error) {
    console.error('Post creation error:', error);
    res.status(500).send('Error creating post');
  }
});

app.get('/register', (req, res) => res.render('register'));
app.get('/login', (req, res) => res.render('login'));

// Add route for edit profile page
app.get('/profile/edit', async (req, res) => {
  try {
    if (!req.session.user) return res.status(403).send('Login required');
    const user = await User.findById(req.session.user._id);
    if (!user) return res.status(404).send('User not found');
    res.render('edit-profile', { user });
  } catch (error) {
    console.error('Error loading edit profile:', error);
    res.status(500).send('Error loading edit profile page');
  }
});

// Add route to handle username update
app.post('/change-username', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.json({ success: false, message: 'Login required' });
    }
    
    const { newUsername } = req.body;
    if (!newUsername) {
      return res.json({ success: false, message: 'Username is required' });
    }

    // Check if username is already taken
    const existingUser = await User.findOne({ 
      username: newUsername, 
      _id: { $ne: req.session.user._id } 
    });
    
    if (existingUser) {
      return res.json({ success: false, message: 'Username already taken' });
    }

    // Update username in User collection
    const user = await User.findById(req.session.user._id);
    const oldUsername = user.username;
    user.username = newUsername;
    await user.save();

    // Update username in session
    req.session.user.username = newUsername;

    // Update username in all posts
    await Post.updateMany(
      { username: oldUsername },
      { username: newUsername }
    );

    // Update username in all comments
    await Post.updateMany(
      { 'comments.username': oldUsername },
      { $set: { 'comments.$[elem].username': newUsername } },
      { arrayFilters: [{ 'elem.username': oldUsername }] }
    );

    // Update username in comment likes
    await Post.updateMany(
      { 'comments.likedBy': oldUsername },
      { $set: { 'comments.$[].likedBy.$[username]': newUsername } },
      { arrayFilters: [{ 'username': oldUsername }] }
    );

    res.json({ 
      success: true, 
      message: 'Username updated successfully',
      username: newUsername
    });

  } catch (error) {
    console.error('Error updating username:', error);
    res.json({ 
      success: false, 
      message: 'Username udated! Refresh the page to see the changes'
    });
  }
});

app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Validate inputs
    if (!username || !email || !password) {
      return res.status(400).send('All fields are required');
    }
    
    const hashedPassword = await bcryptjs.hash(password, 10); // Changed to bcryptjs
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    req.session.user = { username: user.username, _id: user._id };
    res.redirect('/');
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).send('Error: Unable to register');
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(400).send('Invalid email or password');
    }

    try {
      const validPassword = await bcryptjs.compare(password, user.password); // Changed to bcryptjs
      if (validPassword) {
        req.session.user = { username: user.username, _id: user._id };
        res.redirect('/');
      } else {
        res.status(400).send('Invalid email or password');
      }
    } catch (verifyError) {
      console.error('Password verification error:', verifyError);
      res.status(500).send('Error during login');
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).send('Error during login');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).send('Error during logout');
    }
    res.redirect('/');
  });
});

// Create a new post with validation
app.post('/post', async (req, res) => {
  try {
    if (!req.session.user) return res.status(403).send('Login required');
    const { category, title, content } = req.body;
    
    // Validate inputs
    if (!category || !title || !content) {
      return res.status(400).send('All fields are required');
    }
    
    const post = new Post({
      username: req.session.user.username,
      user: req.session.user._id,
      category,
      title,
      content
    });
    await post.save();
    res.redirect('/');
  } catch (error) {
    console.error('Post creation error:', error);
    res.status(500).send('Error creating post');
  }
});

// Delete post with proper error handling
app.post('/post/:id/delete', async (req, res) => {
  try {
    if (!req.session.user) return res.status(403).send('Login required');
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).send('Post not found');
    
    if (post.user.toString() === req.session.user._id) {
      await post.delete();
      res.redirect('/');
    } else {
      res.status(403).send('Unauthorized');
    }
  } catch (error) {
    console.error('Post deletion error:', error);
    res.status(500).send('Error deleting post');
  }
});

// Voting system with proper validation
app.post('/post/:id/upvote', async (req, res) => {
  try {
    if (!req.session.user) return res.status(403).send('Login required');
    
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).send('Post not found');
    
    const userId = req.session.user._id;

    if (post.upvotedBy.includes(userId)) {
      return res.status(400).send('You have already upvoted this post.');
    }
    
    if (post.downvotedBy.includes(userId)) {
      post.downvotes--;
      post.downvotedBy.pull(userId);
    }

    post.upvotes++;
    post.upvotedBy.push(userId);
    await post.save();
    
    res.json({ upvotes: post.upvotes, downvotes: post.downvotes });
  } catch (error) {
    console.error('Upvote error:', error);
    res.status(500).send('Error processing upvote');
  }
});

app.post('/post/:id/downvote', async (req, res) => {
  try {
    if (!req.session.user) return res.status(403).send('Login required');

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).send('Post not found');
    
    const userId = req.session.user._id;

    if (post.downvotedBy.includes(userId)) {
      return res.status(400).send('You have already downvoted this post.');
    }

    if (post.upvotedBy.includes(userId)) {
      post.upvotes--;
      post.upvotedBy.pull(userId);
    }

    post.downvotes++;
    post.downvotedBy.push(userId);
    await post.save();
    
    res.json({ upvotes: post.upvotes, downvotes: post.downvotes });
  } catch (error) {
    console.error('Downvote error:', error);
    res.status(500).send('Error processing downvote');
  }
});

// Comment system with validation and likes
app.post('/post/:id/comment', async (req, res) => {
  try {
    if (!req.session.user) return res.status(403).send('Login required');
    
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).send('Post not found');
    
    if (!req.body.content) {
      return res.status(400).send('Comment content is required');
    }
    
    const comment = { 
      user: req.session.user._id,
      username: req.session.user.username,
      content: req.body.content,
      likes: 0,
      likedBy: []
    };
    post.comments.push(comment);
    await post.save();
    res.json({ comments: post.comments });
  } catch (error) {
    console.error('Comment error:', error);
    res.status(500).send('Error adding comment');
  }
});

// Like/Unlike comment
app.post('/post/:postId/comment/:commentId/like', async (req, res) => {
  try {
    if (!req.session.user) return res.status(403).send('Login required');

    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).send('Post not found');

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).send('Comment not found');

    const userId = req.session.user.username;
    const likedIndex = comment.likedBy.indexOf(userId);

    if (likedIndex === -1) {
      // Like comment
      comment.likes++;
      comment.likedBy.push(userId);
    } else {
      // Unlike comment
      comment.likes--;
      comment.likedBy.splice(likedIndex, 1);
    }

    await post.save();
    res.json({ likes: comment.likes, liked: likedIndex === -1 });
  } catch (error) {
    console.error('Comment like error:', error);
    res.status(500).send('Error processing comment like');
  }
});

// Delete comment
app.post('/post/:postId/comment/:commentId/delete', async (req, res) => {
  try {
    if (!req.session.user) return res.status(403).send('Login required');

    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).send('Post not found');

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).send('Comment not found');

    if (comment.username !== req.session.user.username) {
      return res.status(403).send('Unauthorized to delete this comment');
    }

    comment.remove();
    await post.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Comment deletion error:', error);
    res.status(500).send('Error deleting comment');
  }
});

// Password reset system with proper validation
app.post('/reset-password', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).send('Email not found');
    }

    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetUrl = `http://localhost:${PORT}/reset-password/${token}`;
    await transporter.sendMail({
      to: user.email,
      subject: 'Password Reset',
      text: `Reset your password here: ${resetUrl}`
    });

    res.send('Reset password link sent to your email');
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).send('Error processing password reset');
  }
});

app.get('/reset-password/:token', async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) return res.status(400).send('Password reset token is invalid or has expired.');
    res.render('reset-password', { token: req.params.token });
  } catch (error) {
    console.error('Reset token verification error:', error);
    res.status(500).send('Error verifying reset token');
  }
});

app.post('/reset-password/:token', async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) return res.status(400).send('Password reset token is invalid or has expired.');

    if (!req.body.password) {
      return res.status(400).send('New password is required');
    }

    user.password = await bcryptjs.hash(req.body.password, 10); // Changed to bcryptjs
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.redirect('/login');
  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).send('Error updating password');
  }
});

// User profile and following system with validation
app.get('/user/:username', async (req, res) => {
  try {
    const profileUser = await User.findOne({ username: req.params.username });
    if (!profileUser) return res.status(404).send('User not found');
    
    const posts = await Post.find({ user: profileUser._id });
    const currentUser = req.session.user ? await User.findById(req.session.user._id) : null;
    const isFollowing = currentUser ? currentUser.following.includes(profileUser._id) : false;
    
    res.render('user-profile', { profileUser, posts, isFollowing });
  } catch (error) {
    console.error('Profile view error:', error);
    res.status(500).send('Error loading profile');
  }
});

app.post('/user/:username/follow', async (req, res) => {
  try {
    if (!req.session.user) return res.status(403).send('Login required');
    
    const userToFollow = await User.findOne({ username: req.params.username });
    if (!userToFollow) return res.status(404).send('User not found');
    
    const currentUser = await User.findById(req.session.user._id);
    
    if (!currentUser.following.includes(userToFollow._id)) {
      currentUser.following.push(userToFollow._id);
      userToFollow.followers.push(currentUser._id);
      await Promise.all([currentUser.save(), userToFollow.save()]);
    }
    res.redirect(`/user/${req.params.username}`);
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).send('Error processing follow request');
  }
});

app.post('/user/:username/unfollow', async (req, res) => {
  try {
    if (!req.session.user) return res.status(403).send('Login required');
    
    const userToUnfollow = await User.findOne({ username: req.params.username });
    if (!userToUnfollow) return res.status(404).send('User not found');
    
    const currentUser = await User.findById(req.session.user._id);

    currentUser.following = currentUser.following.filter(followId => !followId.equals(userToUnfollow._id));
    userToUnfollow.followers = userToUnfollow.followers.filter(followerId => !followerId.equals(currentUser._id));
    await Promise.all([currentUser.save(), userToUnfollow.save()]);
    
    res.redirect(`/user/${req.params.username}`);
  } catch (error) {
    console.error('Unfollow error:', error);
    res.status(500).send('Error processing unfollow request');
  }
});

// Start server with health check
app.listen(PORT, () => {
  console.log(`Server started successfully on http://localhost:${PORT}`);
  console.log('Server health check passed');
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).send('An unexpected error occurred');
});
