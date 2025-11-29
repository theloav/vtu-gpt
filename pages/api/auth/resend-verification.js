// pages/api/auth/resend-verification.js
import { getDatabase } from '../../../lib/db.js';
import { generateVerificationToken, isValidVeltechEmail } from '../../../lib/auth.js';
import { sendVerificationEmail } from '../../../lib/email.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (!isValidVeltechEmail(email)) {
    return res.status(400).json({ error: 'Only @veltech.edu.in email addresses are allowed' });
  }

  try {
    // Find unverified user with this email
    const db = await getDatabase();
    const result = await db.query(
      'SELECT id, email FROM users WHERE email = ? AND is_verified = 0',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'No unverified account found with this email' });
    }

    const user = result.rows[0];

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new verification token
    await db.query(
      'UPDATE users SET verification_token = ?, verification_token_expires = ? WHERE id = ?',
      [verificationToken, verificationExpires.toISOString(), user.id]
    );

    // Send verification email
    const emailResult = await sendVerificationEmail(email, verificationToken);

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      return res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
    }

    res.status(200).json({
      message: 'Verification email sent successfully! Please check your email.'
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
