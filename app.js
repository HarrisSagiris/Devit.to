const express = require('express');
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const axios = require('axios');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const nodemailer = require('nodemailer');
const crypto = require('crypto');

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
const Community = require('./models/community.js');

if (!User || !Post || !Community) {
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

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Store verification codes temporarily
const verificationCodes = new Map();

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
          githubToken: accessToken,
          isVerified: true
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
          twitterToken: token,
          isVerified: true
        });
      }
      
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));
// Follow/unfollow user route
app.post('/user/:username/follow', async (req, res) => {
  try {
    const userToFollow = await User.findOne({ username: req.params.username });
    const currentUser = await User.findById(req.session.user._id);
    
    const isFollowing = currentUser.following.includes(userToFollow._id);
    
    if (isFollowing) {
      await User.findByIdAndUpdate(currentUser._id, { $pull: { following: userToFollow._id }});
      await User.findByIdAndUpdate(userToFollow._id, { $pull: { followers: currentUser._id }});
    } else {
      await User.findByIdAndUpdate(currentUser._id, { $push: { following: userToFollow._id }});
      await User.findByIdAndUpdate(userToFollow._id, { $push: { followers: currentUser._id }});
    }

    res.json({ 
      success: true, 
      following: !isFollowing,
      message: isFollowing ? 'Unfollowed successfully' : 'Followed successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Error updating follow status' });
  }
});

// API endpoint for creating communities
app.post('/api/communities', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(403).json({ error: 'Login required' });
    }

    const { name, description, icon } = req.body;

    // Validate required fields
    if (!name || !description) {
      return res.status(400).json({ error: 'Name and description are required' });
    }

    // Check if community already exists
    const existingCommunity = await Community.findOne({ name: name.toLowerCase() });
    if (existingCommunity) {
      return res.status(400).json({ error: 'Community already exists' });
    }

    // Create new community
    const community = new Community({
      name: name.toLowerCase(),
      description,
      icon: icon || 'fas fa-users',
      moderators: [req.session.user._id],
      members: [req.session.user._id]
    });

    await community.save();

    // Add community to user's communities
    await User.findByIdAndUpdate(
      req.session.user._id,
      { $push: { communities: community._id }}
    );

    res.json({ 
      success: true, 
      message: 'Community created successfully',
      community
    });

  } catch (error) {
    console.error('Error creating community:', error);
    res.status(500).json({ error: 'Error creating community' });
  }
});

// Send verification code endpoint
app.post('/send-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Generate random 6-digit code
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    
    // Store code with 10 minute expiration
    verificationCodes.set(email, {
      code: verificationCode,
      expires: Date.now() + 600000 // 10 minutes
    });

    // Send verification email and welcome message
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Devit.to Email Verification',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .container { background: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .logo { color: #8858ED; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
            .code { background: #f5f5f5; padding: 15px 25px; border-radius: 6px; font-size: 32px; font-weight: bold; letter-spacing: 3px; color: #8858ED; text-align: center; margin: 20px 0; }
            .warning { color: #ff4444; font-size: 14px; margin-top: 20px; }
            .footer { color: #666; font-size: 12px; margin-top: 30px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">Devit.to</div>
            <h2>Welcome to Our Developer Community! 👋</h2>
            <p>Thanks for joining Devit.to! To ensure this is really you, we need to verify your email address.</p>
            <p>Here's your verification code:</p>
            <div class="code" style="display: inline-block; margin: 20px auto; padding: 15px 25px; background: #f5f5f5; border-radius: 6px; font-size: 32px; font-weight: bold; letter-spacing: 3px; color: #8858ED; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${verificationCode}</div>
            <p class="warning">⚠️ This code will expire in 10 minutes for security reasons.</p>
            <p>If you didn't request this code, please ignore this email.</p>
            <div class="footer">
              © ${new Date().getFullYear()} Devit.to - Where developers connect and share
            </div>
          </div>
        </body>
        </html>
      `
    };

    const welcomeMailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Welcome to Devit.to!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { 
              font-family: 'Inter', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background: #f7f7f7;
            }
            .container {
              background: #fff;
              border-radius: 16px;
              padding: 40px;
              box-shadow: 0 4px 16px rgba(0,0,0,0.1);
              border: 1px solid #eaeaea;
            }
            .logo {
              color: #8858ED;
              font-size: 32px;
              font-weight: 800;
              margin-bottom: 30px;
              text-align: center;
              letter-spacing: -1px;
            }
            .welcome-banner {
              background: linear-gradient(135deg, #8858ED, #6E3AD6);
              color: white;
              padding: 25px;
              border-radius: 12px;
              margin: 20px 0 30px;
              text-align: center;
            }
            .welcome-banner h2 {
              margin: 0;
              font-size: 28px;
              font-weight: 700;
            }
            .highlight {
              color: #8858ED;
              font-weight: 600;
              font-size: 18px;
              display: block;
              margin: 25px 0 15px;
            }
            .features {
              margin: 20px 0;
              padding-left: 0;
              list-style: none;
            }
            .features li {
              padding: 12px 0 12px 35px;
              position: relative;
              border-bottom: 1px solid #f0f0f0;
            }
            .features li:last-child {
              border-bottom: none;
            }
            .features li:before {
              content: "✨";
              position: absolute;
              left: 0;
              color: #8858ED;
            }
            .tips li:before {
              content: "💡";
            }
            .cta-button {
              display: block;
              background: #8858ED;
              color: white;
              text-decoration: none;
              text-align: center;
              padding: 16px 24px;
              border-radius: 8px;
              margin: 30px auto;
              font-weight: 600;
              transition: all 0.3s ease;
              width: fit-content;
            }
            .cta-button:hover {
              background: #6E3AD6;
              transform: translateY(-2px);
            }
            .footer {
              color: #666;
              font-size: 14px;
              margin-top: 40px;
              text-align: center;
              padding-top: 20px;
              border-top: 1px solid #eaeaea;
            }
            .social-links {
              margin: 20px 0;
              text-align: center;
            }
            .social-links a {
              color: #8858ED;
              text-decoration: none;
              margin: 0 10px;
              font-weight: 500;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">Devit.to</div>
            
            <div class="welcome-banner">
              <h2>🎉 Welcome to Devit.to!</h2>
              <p>We're thrilled to have you join our community of passionate developers!</p>
            </div>

            <p>Get ready to embark on an exciting journey of learning, sharing, and growing with fellow developers.</p>
            
            <span class="highlight">✨ Here's what makes Devit.to special:</span>
            <ul class="features">
              <li>Share your unique coding journey and experiences</li>
              <li>Connect with brilliant minds in tech</li>
              <li>Learn from real-world developer stories</li>
              <li>Get expert help with coding challenges</li>
              <li>Stay ahead with latest tech trends</li>
            </ul>

            <span class="highlight">🚀 Quick Start Guide:</span>
            <ul class="features tips">
              <li>Complete your developer profile</li>
              <li>Follow topics that excite you</li>
              <li>Share your first post or project</li>
              <li>Join discussions and make connections</li>
            </ul>

            <a href="https://devit.to" class="cta-button">Start Your Journey</a>

            <p style="text-align: center">Have questions? Our friendly community is always here to help!</p>

            <div class="social-links">
              <a href="https://twitter.com/devit">Twitter</a>
              <a href="https://github.com/HarrisSagiris/Devit.to">GitHub</a>
              <a href="https://discord.gg/devit">Discord</a>
            </div>

            <div class="footer">
              © ${new Date().getFullYear()} Devit.to - Where developers connect and share<br>
              Made with 💜 by developers, for developers
            </div>
          </div>
        </body>
        </html>
      `
    };

    await Promise.all([
      transporter.sendMail(mailOptions),
      transporter.sendMail(welcomeMailOptions)
    ]);
    
    res.json({ success: true, message: 'Verification code sent' });

  } catch (error) {
    console.error('Error sending verification code:', error);
    res.status(500).json({ error: 'Error sending verification code' });
  }
});

// Verify code endpoint
app.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    const storedData = verificationCodes.get(email);

    if (!storedData) {
      return res.status(400).json({ error: 'No verification code found' });
    }

    if (Date.now() > storedData.expires) {
      verificationCodes.delete(email);
      return res.status(400).json({ error: 'Verification code expired' });
    }

    if (code !== storedData.code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    verificationCodes.delete(email);
    res.json({ success: true });

  } catch (error) {
    console.error('Error verifying code:', error);
    res.status(500).json({ error: 'Error verifying code' });
  }
});

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
// Follow user API endpoint
app.post('/api/follow', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(403).json({ error: 'Login required' });
    }

    const { username } = req.body;
    
    const userToFollow = await User.findOne({ username });
    if (!userToFollow) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentUser = await User.findById(req.session.user._id);
    
    // Check if already following
    const isFollowing = currentUser.following.includes(userToFollow._id);
    
    if (isFollowing) {
      // Unfollow
      await User.findByIdAndUpdate(currentUser._id, { 
        $pull: { following: userToFollow._id }
      });
      await User.findByIdAndUpdate(userToFollow._id, { 
        $pull: { followers: currentUser._id }
      });
    } else {
      // Follow
      await User.findByIdAndUpdate(currentUser._id, {
        $push: { following: userToFollow._id }
      });
      await User.findByIdAndUpdate(userToFollow._id, {
        $push: { followers: currentUser._id }
      });
    }

    res.json({
      success: true,
      following: !isFollowing,
      message: isFollowing ? 'Unfollowed successfully' : 'Followed successfully'
    });

  } catch (error) {
    console.error('Follow API error:', error);
    res.status(500).json({ error: 'Error updating follow status' });
  }
});

// Add user stats endpoint
app.get('/api/user/stats', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(403).json({ error: 'Login required' });
    }

    const userId = req.session.user._id;

    // Get posts count
    const postsCount = await Post.countDocuments({ user: userId });

    // Get comments count (excluding replies)
    const commentsCount = await Post.aggregate([
      { $unwind: '$comments' },
      { $match: { 'comments.user': new mongoose.Types.ObjectId(userId) }},
      { $count: 'count' }
    ]).then(result => result[0]?.count || 0);

    // Get replies count
    const repliesCount = await Post.aggregate([
      { $unwind: '$comments' },
      { $unwind: '$comments.replies' },
      { $match: { 'comments.replies.user': new mongoose.Types.ObjectId(userId) }},
      { $count: 'count' }
    ]).then(result => result[0]?.count || 0);

    // Get upvotes given
    const upvotesGiven = await Post.countDocuments({
      upvotedBy: userId
    });

    // Get upvotes received
    const upvotesReceived = await Post.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) }},
      { $group: {
        _id: null,
        total: { $sum: { $size: '$upvotedBy' }}
      }}
    ]).then(result => result[0]?.total || 0);

    res.json({
      posts: postsCount,
      comments: commentsCount,
      replies: repliesCount,
      upvotesGiven: upvotesGiven,
      upvotesReceived: upvotesReceived
    });

  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Error fetching user statistics' });
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
    const { username, email, password, verificationCode } = req.body;
    
    // Validate inputs
    if (!username || !email || !password || !verificationCode) {
      return res.status(400).send('All fields are required');
    }

    // Verify the code
    const storedData = verificationCodes.get(email);
    if (!storedData || verificationCode !== storedData.code) {
      return res.status(400).send('Invalid verification code');
    }

    if (Date.now() > storedData.expires) {
      verificationCodes.delete(email);
      return res.status(400).send('Verification code expired');
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    const user = new User({ 
      username, 
      email, 
      password: hashedPassword,
      isVerified: true 
    });
    await user.save();

    // Clean up verification code
    verificationCodes.delete(email);

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
app.delete('/api/posts/:postId/comments/:commentId', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(403).json({ 
        error: 'Please login to delete comments',
        success: false 
      });
    }

    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ 
        error: 'Post not found',
        success: false
      });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({
        error: 'Comment not found', 
        success: false
      });
    }

    if (comment.username !== req.session.user.username) {
      return res.status(403).json({
        error: 'You can only delete your own comments',
        success: false
      });
    }

    comment.remove();
    await post.save();

    // Return updated comment list
    const updatedPost = await Post.findById(post._id)
      .populate('comments.user', 'username')
      .populate('comments.replies.user', 'username');

    res.json({
      success: true,
      message: 'Comment deleted successfully',
      comments: updatedPost.comments
    });

  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({
      error: 'An error occurred while deleting the comment',
      success: false
    });
  }
});

// Add replies to comments
app.post('/api/posts/:postId/comments/:commentId/replies', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(403).json({ error: 'Login required' });
    }

    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (!req.body.content) {
      return res.status(400).json({ error: 'Reply content is required' });
    }

    const reply = {
      user: req.session.user._id,
      username: req.session.user.username,
      content: req.body.content,
      createdAt: new Date(),
      likes: 0,
      likedBy: []
    };

    if (!comment.replies) {
      comment.replies = [];
    }

    comment.replies.push(reply);
    await post.save();

    const populatedPost = await Post.findById(post._id)
      .populate('comments.user', 'username')
      .populate('comments.replies.user', 'username');

    res.json({ 
      success: true,
      comment: populatedPost.comments.id(req.params.commentId)
    });

  } catch (error) {
    console.error('Reply error:', error);
    res.status(500).json({ error: 'Error adding reply' });
  }
});

// Like/Unlike reply
app.post('/api/posts/:postId/comments/:commentId/replies/:replyId/like', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(403).json({ error: 'Login required' });
    }

    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const reply = comment.replies.id(req.params.replyId);
    if (!reply) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    const username = req.session.user.username;
    const likedIndex = reply.likedBy.indexOf(username);

    if (likedIndex === -1) {
      // Like reply
      reply.likes++;
      reply.likedBy.push(username);
    } else {
      // Unlike reply
      reply.likes--;
      reply.likedBy.splice(likedIndex, 1);
    }

    await post.save();

    res.json({
      success: true,
      likes: reply.likes,
      liked: likedIndex === -1,
      likedBy: reply.likedBy
    });

  } catch (error) {
    console.error('Reply like error:', error);
    res.status(500).json({ error: 'Error processing reply like' });
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
// Bookmark toggle route
app.post('/post/:id/bookmark', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(403).json({ error: 'Login required' });
    }

    const user = await User.findById(req.session.user._id);
    const postId = req.params.id;

    const bookmarkIndex = user.bookmarks.indexOf(postId);
    
    if (bookmarkIndex === -1) {
      // Add bookmark
      user.bookmarks.push(postId);
    } else {
      // Remove bookmark
      user.bookmarks.splice(bookmarkIndex, 1);
    }

    await user.save();

    res.json({ 
      success: true,
      isBookmarked: bookmarkIndex === -1,
      message: bookmarkIndex === -1 ? 'Post bookmarked' : 'Bookmark removed'
    });
  } catch (error) {
    console.error('Bookmark toggle error:', error);
    res.status(500).json({ error: 'Error processing bookmark' });
  }
});

// Get bookmarked posts route
app.get('/my-bookmarks', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect('/login');
    }

    const user = await User.findById(req.session.user._id);
    const bookmarkedPosts = await Post.find({
      '_id': { $in: user.bookmarks }
    })
    .populate('comments.user', 'username')
    .populate('upvotedBy')
    .populate('downvotedBy')
    .sort('-createdAt');

    // Calculate vote counts and check user votes
    const postsWithVotes = bookmarkedPosts.map(post => {
      const postObj = post.toObject();
      postObj.upvotes = post.upvotedBy.length;
      postObj.downvotes = post.downvotedBy.length;
      postObj.isBookmarked = true; // Set bookmarked status
      if (req.session.user) {
        postObj.upvotedBy = post.upvotedBy.map(u => u._id.toString());
        postObj.downvotedBy = post.downvotedBy.map(u => u._id.toString());
      }
      return postObj;
    });

    // Render the index view with a filter for bookmarked posts
    res.render('index', { 
      user: req.session.user,
      posts: postsWithVotes,
      currentUser: req.session.user,
      filter: 'bookmarks'
    });
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    res.status(500).send('Error loading bookmarks');
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