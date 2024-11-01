const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = 3000;

// MongoDB connection
mongoose.connect('mongodb+srv://appleidmusic960:Dataking8@tapsidecluster.oeofi.mongodb.net/', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB:', err));
  
// Models
const User = require('./models/user');
const Post = require('./models/post');

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({ secret: 'secret', resave: false, saveUninitialized: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', async (req, res) => {
  const posts = await Post.find().sort({ createdAt: -1 }).populate('comments.user', 'username');
  res.render('feed', { posts, user: req.session.user });
});

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

app.post('/post/:id/upvote', async (req, res) => {
  const post = await Post.findById(req.params.id);
  post.upvotes++;
  await post.save();
  res.json({ upvotes: post.upvotes });
});

app.post('/post/:id/downvote', async (req, res) => {
  const post = await Post.findById(req.params.id);
  post.downvotes++;
  await post.save();
  res.json({ downvotes: post.downvotes });
});

app.post('/post/:id/comment', async (req, res) => {
  if (!req.session.user) return res.status(403).send('Login required');
  const post = await Post.findById(req.params.id);
  const comment = { user: req.session.user._id, content: req.body.content, upvotes: 0 };
  post.comments.push(comment);
  await post.save();
  res.json({ comments: post.comments });
});

app.get('/my-posts', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const posts = await Post.find({ user: req.session.user._id });
  res.render('my-posts', { posts });
});

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
