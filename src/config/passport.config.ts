import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { config } from "./env.config";
import prisma from "./database.config";

// Configure Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: config.googleClientId,
      clientSecret: config.googleClientSecret,
      callbackURL: config.googleCallbackUrl,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Extract user info from Google profile
        const email = profile.emails?.[0]?.value;
        const googleId = profile.id;
        const firstName = profile.name?.givenName;
        const lastName = profile.name?.familyName;

        if (!email) {
          return done(new Error("No email found in Google profile"));
        }

        // Check if user already exists
        let user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (user) {
          // User exists - update googleId and verify email
          // (Google has verified this email, so we trust it)
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              googleId,
              isEmailVerified: true, // ✅ Auto-verify if signing in with Google
              // Optionally update name if not set
              firstName: user.firstName || firstName,
              lastName: user.lastName || lastName,
            },
          });
        } else {
          // Create new user
          user = await prisma.user.create({
            data: {
              email: email.toLowerCase(),
              googleId,
              firstName,
              lastName,
              isEmailVerified: true, // Google emails are pre-verified
              emailVerificationToken: null,
              role: "customer",
            },
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    }
  )
);

// Serialize user for session (not used with JWT, but required by Passport)
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session (not used with JWT, but required by Passport)
passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export default passport;
