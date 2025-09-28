# Chat Application

A real-time chat application with anonymous messaging capabilities, built with Node.js, Socket.io, MySQL, and responsive web design.

## Features

- Real-time messaging with Socket.io
- Anonymous mode toggle
- Mobile-responsive design mimicking iOS chat interface
- MySQL database for persistent message storage
- Typing indicators
- Connection status monitoring
- Modern UI with smooth animations

## Prerequisites

- Node.js (v14 or higher)
- MySQL Server
- Web browser with modern JavaScript support

## Installation

1. **Database Setup**
   ```bash
   # Login to MySQL and run the schema
   mysql -u root -p < database/schema.sql
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   ```

3. **Configure Environment**
   - Update `backend/.env` with your MySQL credentials:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=chat_app
   PORT=3000
   ```

## Running the Application

1. **Start the server**
   ```bash
   cd backend
   npm start
   # or for development with auto-restart:
   npm run dev
   ```

2. **Access the application**
   - Open your browser and navigate to `http://localhost:3000`
   - The chat interface will load with the "Fun Friday Group" chat

## Usage

- **Send Messages**: Type in the input field and press Enter or click the send button
- **Anonymous Mode**: Click the user-secret icon in the header to toggle anonymous messaging
- **Real-time Updates**: Messages appear instantly for all connected users
- **Typing Indicators**: See when other users are typing

## Technology Stack

- **Backend**: Node.js, Express.js, Socket.io
- **Database**: MySQL
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Real-time Communication**: Socket.io
- **Styling**: CSS Grid/Flexbox, CSS Animations

## Database Schema

- `users`: User information and anonymous status
- `chat_groups`: Chat group details
- `group_members`: User membership in groups
- `messages`: Chat messages with timestamps

## API Endpoints

- `GET /api/groups` - Get all chat groups
- `GET /api/groups/:id` - Get specific group details
- `GET /api/groups/:id/messages` - Get messages for a group
- `POST /api/users/anonymous` - Create anonymous user session

## Socket Events

- `join-group` - Join a chat group room
- `send-message` - Send a new message
- `new-message` - Receive new messages
- `typing` - Handle typing indicators
- `user-typing` - Receive typing status

## Development

For development with auto-restart:
```bash
cd backend
npm run dev
```

The application uses nodemon for automatic server restart during development.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.