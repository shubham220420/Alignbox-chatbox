-- Chat Application Database Schema
CREATE DATABASE IF NOT EXISTS chat_app;
USE chat_app;

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(255) DEFAULT NULL,
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Chat groups table
CREATE TABLE chat_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    avatar_url VARCHAR(255) DEFAULT NULL,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Group members table
CREATE TABLE group_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_admin BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(group_id, user_id)
);

-- Messages table
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    user_id INT NOT NULL,
    message_text TEXT NOT NULL,
    message_type ENUM('text', 'system') DEFAULT 'text',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert sample data
INSERT INTO users (username, display_name, is_anonymous) VALUES 
('kirtigan', 'Kirtigan Gadhvi', FALSE),
('abhou', 'Abhou Shukla', FALSE),
('anonymous1', 'Anonymous', TRUE),
('anonymous2', 'Anonymous', TRUE),
('anonymous3', 'Anonymous', TRUE);

INSERT INTO chat_groups (name, description, created_by) VALUES 
('Fun Friday Group', 'Group chat for Friday fun activities', 1);

INSERT INTO group_members (group_id, user_id, is_admin) VALUES 
(1, 1, TRUE),
(1, 2, FALSE),
(1, 3, FALSE),
(1, 4, FALSE),
(1, 5, FALSE);

INSERT INTO messages (group_id, user_id, message_text) VALUES 
(1, 3, 'Someone order Bornvita!!'),
(1, 3, 'hahahahah!!'),
(1, 3, 'I''m Excited For this Event! Ho-Ho'),
(1, 1, 'Hi Guysss 🔥'),
(1, 3, 'Hello!'),
(1, 3, 'Yessss!!!!!!!'),
(1, 3, 'Maybe I am not attending this event!'),
(1, 2, 'We have Surprise For you!!');