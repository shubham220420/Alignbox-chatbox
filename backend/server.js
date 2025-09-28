const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Database connection
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'chat_app',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let db;

async function initDatabase() {
    try {
        db = mysql.createPool(dbConfig);
        console.log('Connected to MySQL database');
        
        // Initialize database tables if they don't exist
        await initializeTables();
        
    } catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1);
    }
}

async function initializeTables() {
    try {
        // Create users table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                display_name VARCHAR(100) NOT NULL,
                avatar_url VARCHAR(255) DEFAULT NULL,
                is_anonymous BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Create chat_groups table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS chat_groups (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                avatar_url VARCHAR(255) DEFAULT NULL,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        `);

        // Create group_members table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS group_members (
                id INT AUTO_INCREMENT PRIMARY KEY,
                group_id INT NOT NULL,
                user_id INT NOT NULL,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_admin BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(group_id, user_id)
            )
        `);

        // Create messages table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                group_id INT NOT NULL,
                user_id INT NOT NULL,
                message_text TEXT NOT NULL,
                message_type ENUM('text', 'system') DEFAULT 'text',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Insert sample data if tables are empty
        const [userRows] = await db.execute('SELECT COUNT(*) as count FROM users');
        if (userRows[0].count === 0) {
            await insertSampleData();
        }
        
        console.log('Database tables initialized successfully');
        
    } catch (error) {
        console.error('Error initializing database tables:', error);
    }
}

async function insertSampleData() {
    try {
        // Insert sample users
        await db.execute(`
            INSERT INTO users (username, display_name, is_anonymous) VALUES 
            ('kirtigan', 'Kirtigan Gadhvi', FALSE),
            ('abhou', 'Abhou Shukla', FALSE),
            ('anonymous1', 'Anonymous', TRUE),
            ('anonymous2', 'Anonymous', TRUE),
            ('anonymous3', 'Anonymous', TRUE)
        `);

        // Insert sample group
        await db.execute(`
            INSERT INTO chat_groups (name, description, created_by) VALUES 
            ('Fun Friday Group', 'Group chat for Friday fun activities', 1)
        `);

        // Insert group members
        await db.execute(`
            INSERT INTO group_members (group_id, user_id, is_admin) VALUES 
            (1, 1, TRUE),
            (1, 2, FALSE),
            (1, 3, FALSE),
            (1, 4, FALSE),
            (1, 5, FALSE)
        `);

        // Insert sample messages
        await db.execute(`
            INSERT INTO messages (group_id, user_id, message_text) VALUES 
            (1, 3, 'Someone order Bornvita!!'),
            (1, 3, 'hahahahah!!'),
            (1, 3, 'I''m Excited For this Event! Ho-Ho'),
            (1, 1, 'Hi Guysss 🔥'),
            (1, 3, 'Hello!'),
            (1, 3, 'Yessss!!!!!!!'),
            (1, 3, 'Maybe I am not attending this event!'),
            (1, 2, 'We have Surprise For you!!')
        `);

        console.log('Sample data inserted successfully');
        
    } catch (error) {
        console.error('Error inserting sample data:', error);
    }
}

// API Routes

// Get all groups
app.get('/api/groups', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT g.*, u.display_name as created_by_name 
            FROM chat_groups g 
            LEFT JOIN users u ON g.created_by = u.id
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching groups:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get group messages
app.get('/api/groups/:groupId/messages', async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const [rows] = await db.execute(`
            SELECT m.*, u.display_name, u.is_anonymous, u.avatar_url 
            FROM messages m 
            JOIN users u ON m.user_id = u.id 
            WHERE m.group_id = ? 
            ORDER BY m.created_at ASC
        `, [groupId]);
        
        res.json(rows);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get group details
app.get('/api/groups/:groupId', async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const [rows] = await db.execute(`
            SELECT g.*, u.display_name as created_by_name 
            FROM chat_groups g 
            LEFT JOIN users u ON g.created_by = u.id 
            WHERE g.id = ?
        `, [groupId]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Group not found' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching group:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create user with custom name
app.post('/api/users/create', async (req, res) => {
    try {
        const { displayName, isAnonymous = false } = req.body;
        
        if (!displayName || displayName.trim().length === 0) {
            return res.status(400).json({ error: 'Display name is required' });
        }
        
        if (displayName.trim().length > 50) {
            return res.status(400).json({ error: 'Display name must be 50 characters or less' });
        }
        
        const cleanDisplayName = displayName.trim();
        const userId = Math.random().toString(36).substr(2, 9);
        const username = isAnonymous ? `anon_${userId}` : `user_${userId}`;
        
        const [result] = await db.execute(`
            INSERT INTO users (username, display_name, is_anonymous) 
            VALUES (?, ?, ?)
        `, [username, cleanDisplayName, isAnonymous]);
        
        const newUserId = result.insertId;
        
        // Add to the default group (Fun Friday Group)
        await db.execute(`
            INSERT IGNORE INTO group_members (group_id, user_id) 
            VALUES (1, ?)
        `, [newUserId]);
        
        res.json({ 
            userId: newUserId, 
            username: username, 
            display_name: cleanDisplayName,
            is_anonymous: isAnonymous
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create or get anonymous user (kept for backward compatibility)
app.post('/api/users/anonymous', async (req, res) => {
    try {
        const anonymousId = Math.random().toString(36).substr(2, 9);
        const [result] = await db.execute(`
            INSERT INTO users (username, display_name, is_anonymous) 
            VALUES (?, 'Anonymous', TRUE)
        `, [`anon_${anonymousId}`]);
        
        const userId = result.insertId;
        
        // Add to the default group (Fun Friday Group)
        await db.execute(`
            INSERT IGNORE INTO group_members (group_id, user_id) 
            VALUES (1, ?)
        `, [userId]);
        
        res.json({ userId, username: `anon_${anonymousId}`, display_name: 'Anonymous', is_anonymous: true });
    } catch (error) {
        console.error('Error creating anonymous user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Join a group room
    socket.on('join-group', (groupId) => {
        socket.join(`group_${groupId}`);
        console.log(`User ${socket.id} joined group ${groupId}`);
    });
    
    // Handle new message
    socket.on('send-message', async (data) => {
        try {
            const { groupId, userId, message, isAnonymous } = data;
            
            // Insert message into database
            const [result] = await db.execute(`
                INSERT INTO messages (group_id, user_id, message_text) 
                VALUES (?, ?, ?)
            `, [groupId, userId, message]);
            
            // Get user details for the message
            const [userRows] = await db.execute(`
                SELECT display_name, is_anonymous, avatar_url 
                FROM users WHERE id = ?
            `, [userId]);
            
            const user = userRows[0];
            const messageData = {
                id: result.insertId,
                group_id: groupId,
                user_id: userId,
                message_text: message,
                created_at: new Date(),
                display_name: isAnonymous || user.is_anonymous ? 'Anonymous' : user.display_name,
                is_anonymous: isAnonymous || user.is_anonymous,
                avatar_url: user.avatar_url
            };
            
            // Broadcast to all users in the group
            io.to(`group_${groupId}`).emit('new-message', messageData);
            
        } catch (error) {
            console.error('Error sending message:', error);
            socket.emit('message-error', { error: 'Failed to send message' });
        }
    });
    
    // Handle user typing
    socket.on('typing', (data) => {
        socket.to(`group_${data.groupId}`).emit('user-typing', {
            userId: data.userId,
            isTyping: data.isTyping,
            displayName: data.displayName
        });
    });
    
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Initialize database and start server
const PORT = process.env.PORT || 3000;

initDatabase().then(() => {
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Visit http://localhost:${PORT} to access the chat app`);
    });
});