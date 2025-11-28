# VTU GPT - AI-Powered Chatbot with Authentication

This is a Next.js application that provides an AI-powered chatbot for VTU (Veltech University) with user authentication, email verification, and domain restriction.

## Features

- 🔐 **User Authentication**: Secure login/signup system
- 📧 **Email Verification**: Email verification required before accessing chatbot
- 🏫 **Domain Restriction**: Only @veltech.edu.in email addresses allowed
- 🤖 **AI Chatbot**: Interactive chatbot interface
- 👤 **User Management**: User profile and logout functionality
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Prerequisites

Before running this application, make sure you have:

- Node.js (v16 or higher)
- PostgreSQL database
- Gmail account for sending emails (or other SMTP service)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd vtu-gpt
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy the `.env.local` file and update the values:
   ```bash
   cp .env.local .env.local.example
   ```

   Update the following variables in `.env.local`:
   ```env
   # Database Configuration
   DATABASE_URL=postgresql://username:password@localhost:5432/vtu_gpt_db

   # JWT Secret (generate a secure random string)
   JWT_SECRET=your-super-secret-jwt-key-here-change-this-in-production

   # Email Configuration (Gmail SMTP)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password  # Use App Password, not regular password
   EMAIL_FROM=your-email@gmail.com

   # Application URL
   APP_URL=http://localhost:3000
   ```

4. **Set up PostgreSQL database**

   Create a PostgreSQL database:
   ```sql
   CREATE DATABASE vtu_gpt_db;
   ```

   Run the database setup script:
   ```bash
   node scripts/setup-db.js
   ```

5. **Configure Gmail for email sending**

   - Enable 2-factor authentication on your Gmail account
   - Generate an App Password: Google Account → Security → App passwords
   - Use the App Password in the `EMAIL_PASS` environment variable

## Running the Application

1. **Development mode**
   ```bash
   npm run dev
   ```

2. **Production build**
   ```bash
   npm run build
   npm start
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Configuration

### Session Timeout Configuration

To change the session timeout duration, edit the `SESSION_TIMEOUT_HOURS` value in `lib/config.js`:

```javascript
// lib/config.js
export const SESSION_TIMEOUT_HOURS = 2; // Change this value (in hours)
```

**Examples:**
- `1` = 1 hour session timeout
- `2` = 2 hour session timeout (default)
- `4` = 4 hour session timeout
- `0.5` = 30 minute session timeout

The session will automatically expire after the specified time, and users will be logged out and redirected to the login page.

## Usage

### For Users

1. **Registration**
   - Visit the application
   - Click on "Sign Up"
   - Enter your @veltech.edu.in email address
   - Create a secure password
   - Check your email for verification link

2. **Email Verification**
   - Click the verification link in your email
   - Return to the application and log in

3. **Using the Chatbot**
   - After logging in, you'll have access to the chatbot interface
   - Ask questions and interact with the AI assistant
   - Use the sidebar for quick suggestions and navigation

### For Administrators

- Admin functionality remains separate from user authentication
- Access admin dashboard via `/loginpage` (existing Firebase authentication)

## API Endpoints

### Authentication APIs
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/verify-email` - Email verification
- `POST /api/auth/resend-verification` - Resend verification email
- `GET /api/auth/me` - Get current user info

### Existing APIs
- `POST /api/chat` - Chatbot interaction
- `POST /api/upload` - File upload (admin)

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    verification_token_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Security Features

- **Password Hashing**: Bcrypt with salt rounds
- **JWT Tokens**: Secure authentication tokens
- **Email Verification**: Required before access
- **Domain Restriction**: Only @veltech.edu.in emails
- **CSRF Protection**: HTTP-only cookies
- **Input Validation**: Server-side validation for all inputs

## Project Structure

```
vtu-gpt/
├── app/                    # Next.js app directory
├── components/             # React components
├── contexts/              # React contexts (AuthContext)
├── lib/                   # Utility libraries (auth, db, email)
├── middleware/            # Authentication middleware
├── pages/                 # Pages and API routes
│   ├── api/auth/         # Authentication API endpoints
│   ├── auth.js           # Login/signup page
│   └── verify-email.js   # Email verification page
├── scripts/              # Database setup scripts
├── src/components/       # Existing components (chatbot)
└── public/              # Static assets
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check PostgreSQL is running
   - Verify DATABASE_URL in .env.local
   - Ensure database exists

2. **Email Not Sending**
   - Verify Gmail App Password is correct
   - Check EMAIL_* variables in .env.local
   - Ensure 2FA is enabled on Gmail account

3. **Authentication Issues**
   - Clear browser cookies and localStorage
   - Check JWT_SECRET is set
   - Verify user is email verified

### Development Tips

- Use `npm run dev` for hot reloading
- Check browser console for client-side errors
- Check terminal/server logs for API errors
- Use PostgreSQL client to inspect database

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
