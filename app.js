const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const app = express();

// Connect to MongoDB
mongoose.connect('mongodb+srv://appleidmusic960:Dataking8@tapsidecluster.oeofi.mongodb.net/', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.log(err));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Session setup
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: false
}));

// User schema
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    email: { type: String, unique: true },
    password: String
});

const User = mongoose.model('User', userSchema);

// Post schema
const postSchema = new mongoose.Schema({
    category: String,
    title: String,
    content: String,
    createdAt: { type: Date, default: Date.now },
    author: String
});

const Post = mongoose.model('Post', postSchema);

// Routes

// Index (Feed)
app.get('/', async (req, res) => {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.render('index', { user: req.session.user, posts });
});

// Register
app.get('/register', (req, res) => {
    res.render('auth', { title: 'Register', action: '/register', buttonText: 'Register', showUsername: true, isLogin: false });
});

app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const user = new User({ username, email, password: hashedPassword });
        await user.save();
        req.session.user = user;
        res.redirect('/');
    } catch (err) {
        res.status(500).send('Error creating account');
    }
});

// Login
app.get('/login', (req, res) => {
    res.render('auth', { title: 'Login', action: '/login', buttonText: 'Login', showUsername: false, isLogin: true });
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && await bcrypt.compare(password, user.password)) {
        req.session.user = user;
        res.redirect('/');
    } else {
        res.status(400).send('Invalid credentials');
    }
});

// Logout
app.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Post review
app.post('/', async (req, res) => {
    const { category, title, content } = req.body;

    if (req.session.user) {
        const post = new Post({
            category,
            title,
            content,
            author: req.session.user.username
        });
        await post.save();
        res.redirect('/');
    } else {
        res.redirect('/login');
    }
});

// Start server
app.listen(3000, () => {
    console.log('Server started on http://localhost:3000');
});
