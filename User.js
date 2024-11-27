// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    phone_number: { type: Number, required: true, unique: true }
});

const User = mongoose.model('User ', UserSchema);
module.exports = User;

// models/Task.js
const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    due_date: { type: Date, required: true },
    priority: { type: Number, default: 3 }, // default to 5+
    status: { type: String, enum: ['TODO', 'IN_PROGRESS', 'DONE'], default: 'TODO' },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User ' },
    deleted_at: { type: Date }
});

const Task = mongoose.model('Task', TaskSchema);
module.exports = Task;

// models/SubTask.js
const mongoose = require('mongoose');

const SubTaskSchema = new mongoose.Schema({
    task_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    status: { type: Number, enum: [0, 1], default: 0 }, // 0 - incomplete, 1 - complete
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    deleted_at: { type: Date }
});

const SubTask = mongoose.model('SubTask', SubTaskSchema);
module.exports = SubTask;