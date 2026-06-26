import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Assignment from '../models/Assignment.js';
import Solution from '../models/Solution.js';
import { signToken } from '../utils/jwt.js';
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

    const token = signToken({ userId: user._id });

    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        hasClassroomConnected: user.hasClassroomConnected || false
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Google Auth Failed", error: error.message });
  }
};

export const connectClassroom = async (req, res) => {
  const { code } = req.body;
  const userId = req.user.id;

  if (!code) return res.status(400).json({ message: "Authorization code not provided" });

  try {
    const { tokens } = await client.getToken(code);
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (tokens.refresh_token) {
      user.refreshToken = tokens.refresh_token;
    }
    user.hasClassroomConnected = true;
    await user.save();

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        hasClassroomConnected: user.hasClassroomConnected
      }
    });
  } catch (error) {
    console.error("Connect Classroom Failed:", error);
    res.status(500).json({ message: "Connect Classroom Failed", error: error.message });
  }
};

export const disconnectClassroom = async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Revoke Google OAuth token if exists
    if (user.refreshToken) {
      try {
        console.log(`[AUTH] Revoking Google OAuth token for user: ${user._id}`);
        await client.revokeToken(user.refreshToken);
        console.log(`[AUTH] Successfully revoked Google OAuth token for user: ${user._id}`);
      } catch (revokeError) {
        console.warn(`[AUTH] Failed to revoke Google OAuth token for user ${user._id}:`, revokeError.message);
      }
    }

    user.hasClassroomConnected = false;
    user.classrooms = [];
    user.refreshToken = undefined;
    await user.save();

    // Find and delete synced assignments (non-manual) and their solutions
    const syncedAssignments = await Assignment.find({ userId, isManual: { $ne: true } }, '_id');
    const assignmentIds = syncedAssignments.map(a => a._id);

    if (assignmentIds.length > 0) {
      await Solution.deleteMany({ assignmentId: { $in: assignmentIds } });
      await Assignment.deleteMany({ _id: { $in: assignmentIds } });
    }

    // Delete all courses for this user
    await Course.deleteMany({ userId });

    res.status(200).json({
      success: true,
      message: "Disconnected from Google Classroom & Drive successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        hasClassroomConnected: user.hasClassroomConnected
      }
    });
  } catch (error) {
    console.error("Disconnect Classroom Failed:", error);
    res.status(500).json({ message: "Disconnect Classroom Failed", error: error.message });
  }
};


///bro the stats must not be in localstorage they must be fetched in real time on any uppdation like connecting classroom,disconnecting,adding new assignment ,etc 