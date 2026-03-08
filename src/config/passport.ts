import 'dotenv/config';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/User';
import jwt from 'jsonwebtoken';
import { sendVerifyLinkEmail } from '../utils/email';

const TEMP_TOKEN_SECRET = process.env.TEMP_TOKEN_SECRET || 'buildforce_temp_secret';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `${process.env.API_URL}/api/auth/google/callback`,
    },
    async (_accessToken: unknown, _refreshToken: unknown, profile: any, done: (err: Error | null, user?: any) => void) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email from Google'), undefined);

        let user = await User.findOne({ email });

        if (!user) {
          const tempUser = {
            email,
            firstName: profile.name?.givenName || '',
            lastName: profile.name?.familyName || '',
            provider: 'google' as const,
            isVerified: false,
          };
          const verifyToken = jwt.sign(
            { ...tempUser, googleId: profile.id },
            TEMP_TOKEN_SECRET,
            { expiresIn: '24h' }
          );
          const verifyUrl = `${process.env.API_URL}/api/auth/verify-google-email?token=${verifyToken}`;
          try {
            await sendVerifyLinkEmail(email, verifyUrl);
            console.log('📧 Google verification email sent to:', email);
          } catch (emailError) {
            console.error('❌ Failed to send Google verification email:', emailError);
            return done(new Error('Failed to send verification email'), undefined);
          }
          return done(null, { verificationRequired: true, email });
        }

        if (!user.isVerified) {
          const tempUser = {
            email: user.email,
            firstName: user.firstName || profile.name?.givenName || '',
            lastName: user.lastName || profile.name?.familyName || '',
            provider: 'google' as const,
            isVerified: false,
          };
          const verifyToken = jwt.sign(
            { ...tempUser, googleId: profile.id, userId: user._id },
            TEMP_TOKEN_SECRET,
            { expiresIn: '24h' }
          );
          const verifyUrl = `${process.env.API_URL}/api/auth/verify-google-email?token=${verifyToken}`;
          try {
            await sendVerifyLinkEmail(email, verifyUrl);
            console.log('📧 Google verification email sent to existing user:', email);
          } catch (emailError) {
            console.error('❌ Failed to send Google verification email:', emailError);
            return done(new Error('Failed to send verification email'), undefined);
          }
          return done(null, { verificationRequired: true, email });
        }

        return done(null, user);
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  )
);

export default passport;
