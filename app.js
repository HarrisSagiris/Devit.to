const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Database connected'))
  .catch(err => console.error('Database connection error:', err));

// Models
const User = require('./models/user');
const Post = require('./models/post');
const user = require('./models/user');

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({ secret: 'secret', resave: false, saveUninitialized: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Email transporter for password reset
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'your-email@gmail.com', // replace with your email
    pass: 'your-email-password'    // replace with your email password
  }
});

// Routes
app.get('/', async (req, res) => {
  const posts = await Post.find().sort({ createdAt: -1 }).populate('comments.user', 'username');
  res.render('feed', { posts, user: req.session.user });
});
   if (Post == 0); {
    console.log('Your feed is empty cause you are haunted!! Just kidding its just cause nobody has uploaded anything')
   }
app.get('/register', (req, res) => res.render('register'));
app.get('/login', (req, res) => res.render('login'));

app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    req.session.user = { username: user.username, _id: user._id };
    res.redirect('/');
  } catch (error) {
    res.status(400).send('Error: Unable to register');
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (user && await bcrypt.compare(password, user.password)) {
    req.session.user = { username: user.username, _id: user._id };
    res.redirect('/');
  } else {
    res.status(400).send('Invalid email or password');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Create a new post
app.post('/post', async (req, res) => {
  if (!req.session.user) return res.status(403).send('Login required');
  const { category, title, content } = req.body;
  const post = new Post({
    username: req.session.user.username,
    user: req.session.user._id,
    category,
    title,
    content
  });
  await post.save();
  res.redirect('/');
});

// Delete a post
app.post('/post/:id/delete', async (req, res) => {
  if (!req.session.user) return res.status(403).send('Login required');
  const post = await Post.findById(req.params.id);
  if (post.user.toString() === req.session.user._id) {
    await post.delete();
    res.redirect('/');
  } else {
    res.status(403).send('Unauthorized');
  }
});


//posting and upvoting(downvoting)
app.post('/post/:id/upvote', async (req, res) => {
  if (!req.session.user) return res.status(403).send('Login required');
  
  const post = await Post.findById(req.params.id);
  const userId = req.session.user._id;

  // Check if the user already upvoted
  if (post.upvotedBy.includes(userId)) {
    return res.status(400).send('You have already upvoted this post.');
  }
  
  // If the user previously downvoted, remove their downvote
  if (post.downvotedBy.includes(userId)) {
    post.downvotes--;
    post.downvotedBy.pull(userId);
  }

  // Add the upvote
  post.upvotes++;
  post.upvotedBy.push(userId);
  await post.save();
  
  res.json({ upvotes: post.upvotes, downvotes: post.downvotes });
});

app.post('/post/:id/downvote', async (req, res) => {
  if (!req.session.user) return res.status(403).send('Login required');

  const post = await Post.findById(req.params.id);
  const userId = req.session.user._id;

  // Check if the user already downvoted
  if (post.downvotedBy.includes(userId)) {
    return res.status(400).send('You have already downvoted this post.');
  }

  // If the user previously upvoted, remove their upvote
  if (post.upvotedBy.includes(userId)) {
    post.upvotes--;
    post.upvotedBy.pull(userId);
  }

  // Add the downvote
  post.downvotes++;
  post.downvotedBy.push(userId);
  await post.save();
  
  res.json({ upvotes: post.upvotes, downvotes: post.downvotes });
});


// Add comment to post
app.post('/post/:id/comment', async (req, res) => {
  if (!req.session.user) return res.status(403).send('Login required');
  const post = await Post.findById(req.params.id);
  const comment = { user: req.session.user._id, content: req.body.content, upvotes: 0 };
  post.comments.push(comment);
  await post.save();
  res.json({ comments: post.comments });
});

// Reset password - request link
app.post('/reset-password', async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (user) {
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
  } else {
    res.status(404).send('Email not found');
  }
});

// Reset password - update password
app.get('/reset-password/:token', async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }
  });
  if (!user) return res.status(400).send('Password reset token is invalid or has expired.');
  res.render('reset-password', { token: req.params.token });
});

app.post('/reset-password/:token', async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }
  });
  if (!user) return res.status(400).send('Password reset token is invalid or has expired.');

  user.password = await bcrypt.hash(req.body.password, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
  res.redirect('/login');
});

// View user profile, follow, and unfollow
app.get('/user/:username', async (req, res) => {
  const profileUser = await User.findOne({ username: req.params.username });
  const posts = await Post.find({ user: profileUser._id });
  const currentUser = req.session.user ? await User.findById(req.session.user._id) : null;
  const isFollowing = currentUser ? currentUser.following.includes(profileUser._id) : false;
  
  res.render('user-profile', { profileUser, posts, isFollowing });
});

app.post('/user/:username/follow', async (req, res) => {
  if (!req.session.user) return res.status(403).send('Login required');
  const userToFollow = await User.findOne({ username: req.params.username });
  const currentUser = await User.findById(req.session.user._id);
  
  if (!currentUser.following.includes(userToFollow._id)) {
    currentUser.following.push(userToFollow._id);
    userToFollow.followers.push(currentUser._id);
    await currentUser.save();
    await userToFollow.save();
  }
  res.redirect(`/user/${req.params.username}`);
});

app.post('/user/:username/unfollow', async (req, res) => {
  if (!req.session.user) return res.status(403).send('Login required');
  const userToUnfollow = await User.findOne({ username: req.params.username });
  const currentUser = await User.findById(req.session.user._id);

  currentUser.following = currentUser.following.filter(followId => !followId.equals(userToUnfollow._id));
  userToUnfollow.followers = userToUnfollow.followers.filter(followerId => !followerId.equals(currentUser._id));
  await currentUser.save();
  await userToUnfollow.save();
  
  res.redirect(`/user/${req.params.username}`);
});

app.listen(PORT, () => console.log(`Server started on http://localhost:${PORT}`));
