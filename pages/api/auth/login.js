// pages/api/auth/login.js
import { getDatabase } from '../../../lib/db.js';
import { verifyPassword, generateToken, isValidVeltechEmail } from '../../../lib/auth.js';
import { SESSION_TIMEOUT_SECONDS } from '../../../lib/config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (!isValidVeltechEmail(email)) {
    return res.status(400).json({ error: 'Only @veltech.edu.in email addresses are allowed' });
  }

  try {
    // Find user by email
    const db = await getDatabase();
    const result = await db.query(
      'SELECT id, email, password_hash, is_verified FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Check if email is verified
    if (!user.is_verified) {
      return res.status(401).json({
        error: 'Please verify your email address before logging in',
        needsVerification: true
      });
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = generateToken(user.id);

    // Set HTTP-only cookie
    res.setHeader('Set-Cookie', `token=${token}; HttpOnly; Path=/; Max-Age=${SESSION_TIMEOUT_SECONDS}; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
