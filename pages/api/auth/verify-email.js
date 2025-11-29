// pages/api/auth/verify-email.js
import pool from '../../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.body;

  if (!token) {
    console.log('DEBUG: Verification token missing in request.');
    return res.status(400).json({ error: 'Verification token is required' });
  }

  try {
    console.log('DEBUG: Attempting to verify token:', token);
    // Find user with this verification token
    const result = await pool.query(
      `SELECT id, email, verification_token_expires, is_verified
       FROM users
       WHERE verification_token = $1`, // Removed `AND is_verified = FALSE` to check if token exists even if already verified
      [token]
    );

    if (result.rows.length === 0) {
      console.log('DEBUG: No user found for token or token is invalid/expired.');
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    const user = result.rows[0];
    console.log('DEBUG: Found user:', user.email, 'is_verified:', user.is_verified, 'expires:', user.verification_token_expires);

    if (user.is_verified) {
      console.log('DEBUG: User is already verified.');
      return res.status(200).json({ message: 'Email already verified. You can now log in.', email: user.email });
    }

    // Check if token has expired
    if (new Date() > new Date(user.verification_token_expires)) {
      console.log('DEBUG: Verification token has expired.');
      return res.status(400).json({ error: 'Verification token has expired' });
    }

    // Update user as verified
    const updateResult = await pool.query(
      `UPDATE users
       SET is_verified = TRUE, verification_token = null, verification_token_expires = null
       WHERE id = $1`,
      [user.id]
    );
    console.log('DEBUG: User updated as verified. Changes:', updateResult.rowCount);
    if (updateResult.rowCount === 0) {
      console.error('DEBUG: Failed to update user as verified. Row count 0.');
      return res.status(500).json({ error: 'Failed to update verification status.' });
    }

    res.status(200).json({
      message: 'Email verified successfully! You can now log in.',
      email: user.email
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
