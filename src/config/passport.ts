import 'dotenv/config';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import { env } from './env';
import { User } from '../models/User';
import { sendVerifyLinkEmail } from '../utils/email';

const TEMP_TOKEN_SECRET = process.env.TEMP_TOKEN_SECRET || 'buildforce_temp_secret';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: `${env.API_URL}/api/auth/google/callback`,
    },
    async (_accessToken: unknown, _refreshToken: unknown, profile: any, done: (err: Error | null, user?: any) => void) => {
      try {
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
          return done(new Error('Google OAuth is not configured'));
        }
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email found from Google'), undefined);

        // Tìm user theo email: nếu đã đăng ký (và verified) thì dùng đúng account đó
        const existing = await User.findOne({ email }).lean() as {
          _id: unknown;
          email?: string;
          firstName?: string;
          lastName?: string;
          isVerified?: boolean;
        } | null;

        if (!existing) {
          // Tạo user mới ngay, không gửi email xác minh. Frontend sẽ hiện dialog chọn role + nhắc điền profile.
          const baseUsername = (email.split('@')[0] || 'user').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'user';
          let username = baseUsername;
          let suffix = 0;
          while (await User.findOne({ username })) {
            suffix += 1;
            username = `${baseUsername}_${suffix}`;
          }
          const newUser = await User.create({
            email,
            username,
            firstName: profile.name?.givenName || 'User',
            lastName: profile.name?.familyName || '',
            provider: 'google',
            isVerified: true,
            role: 'user',
          });
          const userObj = newUser.toObject ? newUser.toObject() : newUser;
          return done(null, { ...userObj, isNewUser: true });
        }

        if (!existing.isVerified) {
          const tempUser = {
            email: existing.email || email,
            firstName: existing.firstName || profile.name?.givenName || '',
            lastName: existing.lastName || profile.name?.familyName || '',
            provider: 'google' as const,
            isVerified: false,
            userId: existing._id,
          };
          const verifyToken = jwt.sign(
            { ...tempUser, googleId: profile.id },
            TEMP_TOKEN_SECRET,
            { expiresIn: '24h' }
          );
          const verifyUrl = `${env.API_URL}/api/auth/verify-google-email?token=${verifyToken}`;
          try {
            await sendVerifyLinkEmail(email, verifyUrl);
            console.log('📧 Google verification email sent to existing unverified user:', email);
          } catch (emailError) {
            console.error('❌ Failed to send Google verification email:', emailError);
            return done(new Error('Failed to send verification email'), undefined);
          }
          return done(null, { verificationRequired: true, email });
        }

        // Email đã đăng ký và đã verify → đăng nhập vào đúng account đó, đồng thời gắn provider google
        const updated = await User.findByIdAndUpdate(
          existing._id,
          {
            provider: 'google',
            firstName: profile.name?.givenName ?? existing.firstName,
            lastName: profile.name?.familyName ?? existing.lastName,
          },
          { new: true }
        ).lean();
        return done(null, updated || existing);
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  )
);

export default passport;
