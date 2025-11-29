// pages/api/auth/register.js
import { getDatabase } from '../../../lib/db.js';
import { hashPassword, generateVerificationToken, isValidVeltechEmail, validatePassword } from '../../../lib/auth.js';
import { sendVerificationEmail } from '../../../lib/email.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, confirmPassword } = req.body;

  // Validation
  if (!email || !password || !confirmPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  if (!isValidVeltechEmail(email)) {
    return res.status(400).json({ error: 'Only @veltech.edu.in email addresses are allowed' });
  }

  if (!validatePassword(password)) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number'
    });
  }

  try {
    // Check if user already exists
    const db = await getDatabase();
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password and generate verification token
    const hashedPassword = await hashPassword(password);
    const verificationToken = generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Insert user into database
    const result = await db.query(
      `INSERT INTO users (email, password_hash, verification_token, verification_token_expires)
       VALUES ($1, $2, $3, $4) RETURNING id, email`,
      [email, hashedPassword, verificationToken, verificationExpires.toISOString()]
    );

    const user = result.rows[0];

    // Send verification email
    const emailResult = await sendVerificationEmail(email, verificationToken);

    if (!emailResult.success) {
      // If email fails, we should probably delete the user or handle this gracefully
      console.error('Failed to send verification email:', emailResult.error);
      return res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
    }

    res.status(201).json({
      message: 'Registration successful! Please check your email to verify your account.',
      userId: user.id
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
