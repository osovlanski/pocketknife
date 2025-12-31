import { config } from 'dotenv';

config();

export const GOOGLE_API_CREDENTIALS = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
  refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
};