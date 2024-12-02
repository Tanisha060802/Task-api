// server.js
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Task = require('./models/Task');
const SubTask = require('./models/SubTask');

const app = express();
app.use(express.json());

const JWT_SECRET = 'your_jwt_secret'; // Replace with your secret

// Middleware to authenticate JWT
const authenticateJWT = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (token) {
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                return res.sendStatus(403);
            }
            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

// 1. Create Task
app.post('/tasks', authenticateJWT, async (req, res) => {
    const { title, description, due_date } = req.body;
    const newTask = new Task({ title, description, due_date, user_id: req.user.id });
    await newTask.save();
    res.status(201).json(newTask);
});

// 2. Create SubTask
app.post('/subtasks', authenticateJWT, async (req, res) => {
    const { task_id } = req.body;
    const newSubTask = new SubTask({ task_id });
    await newSubTask.save();
    res.status(201).json(newSubTask);
});

// 3. Get All User Tasks
app.get('/tasks', authenticateJWT, async (req, res) => {
    const { priority, due_date, page = 1, limit = 10 } = req.query;
    const query = { user_id: req.user.id };

    if (priority) query.priority = priority;
    if (due_date) query.due_date = { $lte: new Date(due_date) };

    const tasks = await Task.find(query).skip((page - 1) * limit).limit(limit);
    res.json(tasks);
});

// 4. Get All User SubTasks
app.get('/subtasks', authenticateJWT, async (req, res) => {
    const { task_id } = req.query;
    const query = { task_id };

    const subtasks = await SubTask.find(query);
    res.json(subtasks);
});

// 5. Update Task
app.put('/tasks/:id', authenticateJWT, async (req, res) => {
    const { due_date, status } = req.body;
    const task = await Task.findByIdAndUpdate(req.params.id, { due_date, status }, { new: true });
    await SubTask.updateMany({ task_id: req.params.id }, { status: status === 'DONE' ? 1 : 0 });
    res.json(task);
});

// 6. Update SubTask
app.put('/subtasks/:id', authenticateJWT, async (req, res) => {
    const { status } = req.body;
    const subtask = await SubTask.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json(subtask);
});

// 7. Delete Task (soft deletion)
app.delete('/tasks/:id', authenticateJWT, async (req, res) => {
    await Task.findByIdAndUpdate(req.params.id, { deleted_at: new Date() });
    await SubTask.updateMany({ task_id: req.params.id }, { deleted_at: new Date() });
    res.sendStatus(204);
});

// 8. Delete SubTask (soft deletion)
app.delete('/subtasks/:id', authenticateJWT, async (req, res) => {
    await SubTask.findByIdAndUpdate(req.params.id, { deleted_at: new Date() });
    res.sendStatus(204);
});

// Cron Jobs
const cron = require('node-cron');
const twilio = require('twilio');
const client = twilio('TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN');

// 1. Cron job for changing priority based on due_date
cron.schedule('0 0 * * *', async () => {
    const tasks = await Task.find({ deleted_at: null });
    const now = new Date();
    tasks.forEach(async (task) => {
        const dueDate = new Date(task.due_date);
        const daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        let priority;

        if (daysLeft < 0) {
            priority = 0; 
        } else if (daysLeft === 0) {
            priority = 1; 
        } else if (daysLeft <= 2) {
            priority = 2; 
        } else if (daysLeft <= 4) {
            priority = 3; 
        } else {
            priority = 4; 
        }

        await Task.findByIdAndUpdate(task._id, { priority });
    });
});

// 2. Cron job for voice calling using Twilio
cron.schedule('* * * * *', async () => {
    const tasks = await Task.find({ due_date: { $lt: new Date() }, deleted_at: null });
    tasks.forEach(async (task) => {
        const user = await User.findById(task.user_id);
        if (user) {
            client.calls
                .create({
                    url: 'https://demo.twilio.com/welcome/voice/', 
                    to: user.phone_number,
                    from: '+91 8958279395' 
                })
                .then(call => console.log(`Call initiated: ${call.sid}`))
                .catch(err => console.error(err));
        }
    });
});

// Connect to MongoDB and start the server
mongoose.connect('mongodb://localhost:27017/task_manager', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        app.listen(3000, () => {
            console.log('Server is running on port 3000');
        });
    })
    .catch(err => console.error(err));

// User Registration
app.post('/register', async (req, res) => {
    const { phone_number } = req.body;
    const existingUser  = await User.findOne({ phone_number });
    if (existingUser ) {
        return res.status(400).json({ message: 'User  already exists' });
    }
    const newUser  = new User({ phone_number });
    await newUser .save();
    res.status(201).json(newUser );
});

// User Login
app.post('/login', async (req, res) => {
    const { phone_number } = req.body;
    const user = await User.findOne({ phone_number });
    if (!user) {
        return res.status(404).json({ message: 'User  not found' });
    }
    const token = jwt.sign({ id: user._id }, JWT_SECRET);
    res.json({ token });
});
// Enhanced Get All User Tasks with additional filters
app.get('/tasks', authenticateJWT, async (req, res) => {
    const { priority, due_date, status, page = 1, limit = 10 } = req.query;
    const query = { user_id: req.user.id, deleted_at: null };

    if (priority) query.priority = priority;
    if (due_date) query.due_date = { $lte: new Date(due_date) };
    if (status) query.status = status;

    const tasks = await Task.find(query).skip((page - 1) * limit).limit(limit);
    res.json(tasks);
});
