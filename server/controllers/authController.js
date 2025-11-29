import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import dotenv from 'dotenv';
dotenv.config();

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'postmessage'
);

export const googleAuth = async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ message: "Authorization code not provided" });

  try {
    const { tokens } = await client.getToken(code);
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await User.findOne({ googleId });

    if (!user) {
      user = new User({
        googleId, email, name, avatar: picture,
        refreshToken: tokens.refresh_token
      });
      await user.save();
    } else {
      if (tokens.refresh_token) {
        user.refreshToken = tokens.refresh_token;
        await user.save();
      }
    }

    res.status(200).json({
      success: true,
      user: { _id: user._id, name: user.name, email: user.email, avatar: user.avatar }
    });

  } catch (error) {
    res.status(500).json({ message: "Google Auth Failed", error: error.message });
  }
};