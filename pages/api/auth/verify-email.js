// pages/api/auth/verify-email.js
import pool from '../../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Verification token is required' });
  }

  try {
    // Find user with this verification token
    const result = await pool.query(
      `SELECT id, email, verification_token_expires
       FROM users
       WHERE verification_token = ? AND is_verified = 0`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    const user = result.rows[0];

    // Check if token has expired
    if (new Date() > new Date(user.verification_token_expires)) {
      return res.status(400).json({ error: 'Verification token has expired' });
    }

    // Update user as verified
    await pool.query(
      `UPDATE users
       SET is_verified = 1, verification_token = null, verification_token_expires = null
       WHERE id = ?`,
      [user.id]
    );

    res.status(200).json({
      message: 'Email verified successfully! You can now log in.',
      email: user.email
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
