# Sign Up Form with Node.js and MySQL

A complete sign-up form with backend integration using Node.js, Express, and MySQL.

## Features

- ✅ Email validation
- ✅ Username uniqueness check
- ✅ Password hashing with bcrypt
- ✅ Terms and conditions checkbox
- ✅ Password visibility toggle
- ✅ Real-time form validation
- ✅ MySQL database integration
- ✅ Modern UI with blur effects

## Setup Instructions

### 1. Prerequisites

Make sure you have installed:
- Node.js (v14 or higher)
- MySQL Server
- npm (comes with Node.js)

### 2. Database Setup

1. Start your MySQL server
2. Open MySQL client and run the commands in `database_setup.sql`:
   ```sql
   source database_setup.sql
   ```
   Or copy and paste the SQL commands manually.

### 3. Configure Database Connection

In `server.js`, update the database connection settings:
```javascript
const db = mysql.createConnection({
  host: 'localhost',
  user: 'your_mysql_username',    // Change this
  password: 'your_mysql_password', // Change this
  database: 'signup_db'
});
```

### 4. Install Dependencies

Run the following command in the project directory:
```bash
npm install
```

### 5. Start the Server

Run one of these commands:
```bash
# Production mode
npm start

# Development mode (with auto-restart)
npm run dev
```

### 6. Access the Application

Open your browser and go to:
```
http://localhost:3000
```

## File Structure

```
dbms(academic-project)/
├── server.js              # Node.js backend server
├── test-sign-up.html      # Frontend HTML
├── test-sign-up.css       # Styling with blur effects
├── test-sign-up.js        # Frontend JavaScript
├── database_setup.sql     # Database creation script
├── package.json           # Node.js dependencies
└── README.md             # This file
```

## API Endpoints

### POST /signup
Creates a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "confirm-password": "password123",
  "terms": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account created successfully!",
  "userId": 1
}
```

## Security Features

- Password hashing using bcrypt
- SQL injection prevention with parameterized queries
- Email and username uniqueness validation
- CORS enabled for frontend-backend communication

## Author

Abdullah Al Fuwad

## License

ISC License
