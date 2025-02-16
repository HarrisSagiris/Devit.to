const express = require('express');
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const axios = require('axios');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;

const app = express();
const PORT = process.env.PORT || 10000;

require('dotenv').config();

// Test database connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Database connected successfully'))
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });

// Verify models are loaded correctly
const User = require('./models/User');
const Post = require('./models/post.js');
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
  cookie: { 
    secure: false,
    sameSite: 'lax'
  }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Passport config
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// GitHub Strategy
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "https://devit.to/auth/github/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ githubId: profile.id });
      
      if (!user) {
        user = await User.create({
          username: profile.username,
          email: profile.emails ? profile.emails[0].value : `${profile.username}@github.com`,
          password: await bcryptjs.hash(Math.random().toString(36), 10),
          githubId: profile.id,
          githubToken: accessToken
        });
      }
      
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

// Twitter Strategy
passport.use(new TwitterStrategy({
    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    callbackURL: "/auth/twitter/callback"
  },
  async (token, tokenSecret, profile, done) => {
    try {
      let user = await User.findOne({ twitterId: profile.id });
      
      if (!user) {
        user = await User.create({
          username: profile.username,
          email: `${profile.username}@twitter.com`,
          password: await bcryptjs.hash(Math.random().toString(36), 10),
          twitterId: profile.id,
          twitterToken: token
        });
      }
      
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

// Auth routes
app.get('/auth/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req, res) => {
    req.session.user = { username: req.user.username, _id: req.user._id };
    res.redirect('/');
  }
);

// Twitter auth routes
app.get('/auth/twitter',
  passport.authenticate('twitter')
);

app.get('/auth/twitter/callback',
  passport.authenticate('twitter', { failureRedirect: '/login' }),
  (req, res) => {
    req.session.user = { username: req.user.username, _id: req.user._id };
    res.redirect('/');
  }
);

// Add route for developers page
app.get('/fordevelopers', (req, res) => {
  res.render('fordevelopers');
});

// Add route for GitHub integration page
app.get('/github', (req, res) => {
  res.render('github', { user: req.session.user });
});

// Add route for devitgit page
app.get('/devitgit', (req, res) => {
  res.render('devitgit', { user: req.session.user });
});

// Add route for terms page
app.get('/terms', (req, res) => res.render('terms'));

// Add GitHub API endpoint
app.get('/api/github/repos', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(403).json({ error: 'Login required' });
    }

    const user = await User.findById(req.session.user._id);
    if (!user.githubToken) {
      return res.status(400).json({ error: 'GitHub token not found' });
    }

    const response = await axios.get('https://api.github.com/user/repos', {
      headers: {
        'Authorization': `token ${user.githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('GitHub API error:', error);
    res.status(500).json({ error: 'Error fetching GitHub repositories' });
  }
});

// Routes with error handling
app.get('/', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect('/register');
    }
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate('comments.user', 'username'); // Populate user info for comments
    res.render('index', { user: req.session.user, posts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).send('Error loading posts');
  }
});

// Add route for my posts page
app.get('/my-posts', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect('/login');
    }
    
    const posts = await Post.find({ user: req.session.user._id })
      .sort({ createdAt: -1 })
      .populate('comments.user', 'username');
      
    res.render('my-posts', { 
      posts,
      user: req.session.user,
      showCreatePost: true
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
    
    const hashedPassword = await bcryptjs.hash(password, 10);
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
      const validPassword = await bcryptjs.compare(password, user.password);
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
    res.redirect('/register');
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
app.delete('/post/:id', async (req, res) => {
  try {
    if (!req.session.user) return res.status(403).json({ error: 'Login required' });
    
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    if (post.user.toString() !== req.session.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    await post.deleteOne();
    res.json({ success: true });
  } catch (error) {
    console.error('Post deletion error:', error);
    res.status(500).json({ error: 'Error deleting post' });
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
    
    // Populate the user info for the new comment
    const populatedPost = await Post.findById(post._id).populate('comments.user', 'username');
    res.json({ comments: populatedPost.comments });
  } catch (error) {
    console.error('Comment error:', error);
    res.status(500).send('Error adding comment');
  }
});

// Like/Unlike comment
app.post('/post/:postId/comment/:commentId/like', async (req, res) => {
  try {
    if (!req.session.user) return res.status(403).json({ error: 'Login required' });

    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    const username = req.session.user.username;
    const likedIndex = comment.likedBy.indexOf(username);

    if (likedIndex === -1) {
      // Like comment
      comment.likes++;
      comment.likedBy.push(username);
    } else {
      // Unlike comment
      comment.likes--;
      comment.likedBy.splice(likedIndex, 1);
    }

    await post.save();
    res.json({ 
      success: true,
      likes: comment.likes, 
      liked: likedIndex === -1,
      likedBy: comment.likedBy 
    });
  } catch (error) {
    console.error('Comment like error:', error);
    res.status(500).json({ error: 'Error processing comment like' });
  }
});

// Delete comment
app.delete('/post/:postId/comment/:commentId', async (req, res) => {
  try {
    if (!req.session.user) return res.status(403).json({ error: 'Login required' });

    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    if (comment.username !== req.session.user.username) {
      return res.status(403).json({ error: 'Unauthorized to delete this comment' });
    }

    comment.remove();
    await post.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Comment deletion error:', error);
    res.status(500).json({ error: 'Error deleting comment' });
  }
});

// User profile and following system with validation
app.get('/user/:username', async (req, res) => {
  try {
    const profileUser = await User.findOne({ username: req.params.username });
    if (!profileUser) return res.status(404).send('User not found');
    
    const posts = await Post.find({ user: profileUser._id })
      .populate('comments.user', 'username');
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
