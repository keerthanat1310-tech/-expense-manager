require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// --- MONGODB CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));
// --- SCHEMAS ---

// 1. User Schema
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

// 2. Personal Expenses
const PersonalExpenseSchema = new mongoose.Schema({
    userEmail: { type: String, required: true },
    type: { type: String, enum: ['expense', 'income'], required: true },
    amount: { type: Number, required: true },
    category: String,
    categoryName: String,
    note: String,
    date: Date
});

// 3. Groups
const GroupSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // Keeping string ID for compatibility
    name: { type: String, required: true },
    lastMsg: String,
    time: String,
    color: String,
    createdBy: String // user email
});

// 4. Group Expenses
const GroupExpenseSchema = new mongoose.Schema({
    groupId: { type: String, required: true },
    amount: { type: Number, required: true },
    category: String,
    description: String,
    paidBy: String,
    date: Date
});

// 5. Roommate Transactions
const RoommateTxSchema = new mongoose.Schema({
    userEmail: String, // Context user (optional if shared globally, but good for filtering)
    amount: { type: Number, required: true },
    category: String,
    paidBy: String,
    splitAmong: [String],
    date: Date
});

// --- MODELS ---
const User = mongoose.model('User', UserSchema);
const PersonalExpense = mongoose.model('PersonalExpense', PersonalExpenseSchema);
const Group = mongoose.model('Group', GroupSchema);
const GroupExpense = mongoose.model('GroupExpense', GroupExpenseSchema);
const RoommateTx = mongoose.model('RoommateTx', RoommateTxSchema);

// --- ROUTES ---

// >>> AUTH <<<
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const existing = await User.findOne({ $or: [{ username }, { email }] });
        if (existing) return res.status(400).json({ error: 'User exists' });
        await new User({ username, email, password }).save();
        res.json({ message: 'Registered' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username, password });
        if (user) res.json({ message: 'Success', user: { username: user.username, email: user.email } });
        else res.status(401).json({ error: 'Invalid credentials' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// >>> PERSONAL EXPENSES <<<
app.get('/api/personal/:email', async (req, res) => {
    try {
        const expenses = await PersonalExpense.find({ userEmail: req.params.email });
        res.json(expenses);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/personal/add', async (req, res) => {
    try {
        await new PersonalExpense(req.body).save();
        res.json({ message: 'Saved' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// >>> GROUPS <<<
app.get('/api/groups', async (req, res) => {
    try {
        // ideally filter by user, but for now return all or filter by query
        const groups = await Group.find().sort({ _id: -1 });
        res.json(groups);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/groups/create', async (req, res) => {
    try {
        await new Group(req.body).save();
        res.json({ message: 'Group Created' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// >>> GROUP EXPENSES <<<
app.get('/api/groups/:id/expenses', async (req, res) => {
    try {
        const expenses = await GroupExpense.find({ groupId: req.params.id }).sort({ date: -1 });
        res.json(expenses);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/groups/expense/add', async (req, res) => {
    try {
        await new GroupExpense(req.body).save();
        // Update Group Last Msg
        await Group.updateOne(
            { id: req.body.groupId },
            { lastMsg: `${req.body.paidBy} added ₹${req.body.amount}`, time: 'Just now' }
        );
        res.json({ message: 'Expense Added' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// >>> ROOMMATE <<<
app.get('/api/roommate', async (req, res) => {
    try {
        const txs = await RoommateTx.find().sort({ date: -1 });
        res.json(txs);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/roommate/add', async (req, res) => {
    try {
        await new RoommateTx(req.body).save();
        res.json({ message: 'Saved' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Start
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
