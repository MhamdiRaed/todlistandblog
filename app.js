const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const User = require('./models/User'); // Ensure this file is named User.js
const Post = require('./models/Post'); // Ensure this file is named Post.js
const Todo = require('./models/Todo'); // Ensure this file is named Todo.js

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: 'RAED',
    resave: false,
    saveUninitialized: true,
}));

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/PFA', { 
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Middleware to check if the user is logged in
function isLoggedIn(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
}

// Routes
app.get('/', (req, res) => {
    res.render('landing');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    const { email, password } = req.body;

    try {
        const newUser = new User({ email, password });
        await newUser.save(); // The plugin will auto-increment userId starting from 1
        res.redirect('/login');
    } catch (error) {
        console.error('Error saving user:', error);
        res.redirect('/register');
    }
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email, password });
        if (user) {
            req.session.userId = user.userId; // Store userId in session
            console.log('Logged in userId:', req.session.userId);
            res.redirect('/todo');
        } else {
            res.redirect('/login'); // Redirect back to login on failure
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.redirect('/login');
    }
});

// Route for the to-do list
app.get('/todo', isLoggedIn, async (req, res) => {
    let todos;
    let users = []; // Initialize users array
    try {
        if (req.session.userId === 1) { // Admin can see all to-dos
            todos = await Todo.find();
            users = await User.find(); // Fetch all users for admin
        } else {
            todos = await Todo.find({ userId: req.session.userId }); // Regular user sees their own to-dos
        }
        res.render('todo', { todos, userId: req.session.userId, users }); // Pass users to the template
    } catch (error) {
        console.error('Error fetching todos:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/todo', async (req, res) => {
    try {
        const newItem = req.body.item;
        const assignedUserId = req.session.userId; // Automatically use the logged-in user's ID

        // Ensure the userId is not undefined
        if (!assignedUserId) {
            return res.status(400).send("User is not logged in");
        }

        const newTodo = new Todo({
            item: newItem,
            userId: assignedUserId // Automatically assign the logged-in user's ID
        });

        await newTodo.save();
        res.redirect('/todo');
    } catch (err) {
        console.log(err);
        res.status(500).send("Error saving the task");
    }
});


// Route to delete a to-do item
app.post('/todo/delete/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    try {
        await Todo.findByIdAndDelete(id); // Users can delete their own tasks
        res.redirect('/todo');
    } catch (error) {
        console.error('Error deleting todo:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route for composing posts
app.get('/compose', isLoggedIn, (req, res) => {
    res.render('compose');
});

app.post('/compose', isLoggedIn, async (req, res) => {
    const { title, content } = req.body;

    try {
        const newPost = new Post({ title, content, userId: req.session.userId });
        await newPost.save();
        res.redirect('/posts');
    } catch (error) {
        console.error('Error saving post:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to display all posts
app.get('/posts', isLoggedIn, async (req, res) => {
    try {
        let posts;
        if (req.session.userId === 1) {
            // Admin can see all posts without populating user details
            posts = await Post.find();
        } else {
            // Regular users only see their own posts
            posts = await Post.find({ userId: req.session.userId });
        }

        // Fetch user emails separately if needed
        const userEmails = await User.find({ userId: { $in: posts.map(post => post.userId) } }, 'userId email');
        const userMap = {};
        userEmails.forEach(user => {
            userMap[user.userId] = user.email;
        });

        // Attach emails to posts
        posts = posts.map(post => ({
            ...post.toObject(),
            userEmail: userMap[post.userId] || 'Unknown'
        }));

        res.render('posts', { posts });
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).send('Internal Server Error');
    }
});


// Route to view a specific post
app.get('/posts/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    try {
        const post = await Post.findById(id);
        if (!post) {
            return res.status(404).send('Post not found');
        }
        // Check if the user has access
        if (post.userId.toString() !== req.session.userId.toString() && req.session.userId !== 1) {
            return res.status(403).send('Access denied');
        }
        res.render('post', { post });
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to delete a post
app.post('/posts/delete/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    try {
        const post = await Post.findById(id);
        // Ensure the user is allowed to delete the post
        if (!post) {
            return res.status(404).send('Post not found');
        }
        if (post.userId.toString() !== req.session.userId.toString() && req.session.userId !== 1) {
            return res.status(403).send('Access denied');
        }
        await Post.findByIdAndDelete(id);
        res.redirect('/posts'); // Redirect back to the posts page after deletion
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Logout route
app.post('/logout', isLoggedIn, (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
