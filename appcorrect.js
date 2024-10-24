const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');

// Initialize Express app
const app = express();

// MongoDB URI
const MONGODB_URI = 'mongodb+srv://appleidmusic960:Dataking8@tapsidecluster.oeofi.mongodb.net/';

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
    console.error('Failed to connect to MongoDB', err);
});

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Serve static files (CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Session management
app.use(session({
    secret: 'secretkey',
    resave: false,
    saveUninitialized: true,
}));

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

// MongoDB Schema and Model for Users and Posts
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const PostSchema = new mongoose.Schema({
    title: String,
    content: String,
    category: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 }
});

const User = mongoose.model('User', UserSchema);
const Post = mongoose.model('Post', PostSchema);

// Root route
app.get('/', (req, res) => {
    res.render('index'); 
});

// Login route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.user = user;
            return res.redirect('/feed');
        } else {
            return res.send('Invalid username or password');
        }
    } catch (err) {
        console.error('Login failed', err);
        res.status(500).send('Login failed.');
    }
});

// Register route
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        // Check if the username already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.send('Username already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();

        req.session.user = newUser;
        res.redirect('/feed');
    } catch (err) {
        console.error('Registration failed', err);
        res.status(500).send('Registration failed.');
    }
});

// Feed route (displays all posts)
app.get('/feed', isAuthenticated, async (req, res) => {
    try {
        const posts = await Post.find().populate('user'); 
        res.render('feed', { posts }); 
    } catch (err) {
        res.status(500).send('Error fetching posts.');
    }
});

// Post submission route
app.post('/post', isAuthenticated, async (req, res) => {
    const { title, content, category } = req.body;
    try {
        const newPost = new Post({ title, content, category, user: req.session.user._id });
        await newPost.save();
        res.redirect('/feed');
    } catch (err) {
        console.error('Error submitting post', err);
        res.status(500).send('Error submitting post.');
    }
});

// Upvote/downvote route
app.post('/vote', async (req, res) => {
    const { postId, voteType } = req.body;
    try {
        const post = await Post.findById(postId);
        if (voteType === 'upvote') {
            post.upvotes += 1;
        } else if (voteType === 'downvote') {
            post.downvotes += 1;
        }
        await post.save();
        res.redirect('/feed');
    } catch (err) {
        console.error('Error voting', err);
        res.status(500).send('Error voting.');
    }
});

// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    } else {
        res.redirect('/');
    }
}

// Error handling (404)
app.use((req, res) => {
    res.status(404).send('Page not found');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});
