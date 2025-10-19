import { decrypt } from '../utils/encryption';
import User from '../models/user.schemal';
import { encrypt } from '../utils/encryption';

// PUT: Update githubPAT and onboardingCompleted for a user by userId
export const upsertUserPAT = async (userId: string, pat: string) => {
  const encryptedPAT = encrypt(pat);
  return User.findOneAndUpdate(
    { userId },
    { githubPAT: encryptedPAT, onboardingCompleted: true },
    { new: true }
  );
};

// GET: Retrieve githubPAT for a user by userId (decrypted)
export const getUserPATByUserId = async (userId: string) => {
  const user = await User.findOne({ userId });
  if (!user || !user.githubPAT) return null;
  const decryptedPAT = decrypt(user.githubPAT);
  return { userId: user.userId, githubPAT: decryptedPAT, onboardingCompleted: user.onboardingCompleted };
};