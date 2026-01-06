import { google } from 'googleapis';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const SCOPES = [
  // OpenID Connect scopes for user info
  'openid',
  'email',
  'profile',
  // Gmail scopes
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',
  // Drive scopes
  'https://www.googleapis.com/auth/drive.file',
  // Calendar scopes
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

const askQuestion = (prompt: string): Promise<string> => {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: process.stdin.isTTY ?? true  // Auto-detect terminal mode
    });

    // Handle readline errors gracefully
    rl.on('error', (err) => {
      if ((err as NodeJS.ErrnoException).code !== 'EPERM') {
        console.error('Readline error:', err);
      }
    });

    // For Windows compatibility, write prompt separately
    process.stdout.write(prompt);
    
    rl.once('line', (answer) => {
      try {
        rl.close();
      } catch {
        // Ignore close errors
      }
      resolve(answer);
    });

    // Fallback: if no input received after stdin ends, resolve with empty
    rl.once('close', () => {
      resolve('');
    });
  });
};

async function getTokens() {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });

  console.log('\n🔐 Gmail & Google Drive OAuth Authorization\n');
  console.log('1️⃣  Open this URL in your browser:\n');
  console.log('   ' + authUrl + '\n');
  console.log('2️⃣  Sign in with your Google account (itayosov@gmail.com)');
  console.log('3️⃣  Grant permissions to access Gmail AND Google Drive');
  console.log('4️⃣  Copy the authorization code from the URL\n');
  console.log('The URL will look like:');
  console.log('http://localhost:5000/auth/callback?code=YOUR_CODE_HERE\n');

  const code = await askQuestion('📋 Paste the CODE here: ');
  
  if (!code || code.trim() === '') {
    console.error('\n❌ Error: No code provided!');
    console.log('\n💡 Tips:');
    console.log('   1. Make sure to paste the code before pressing Enter');
    console.log('   2. Try running in CMD instead of PowerShell: cmd /c "npm run auth:gmail"');
    console.log('   3. Or pass the code as argument: npm run auth:gmail -- YOUR_CODE_HERE');
    process.exit(1);
  }

  try {
    console.log('\n⏳ Exchanging code for tokens...');
    const { tokens } = await oauth2Client.getToken(code.trim());
    
    const tokenPath = path.join(process.cwd(), 'credentials', 'gmail-token.json');
    const credentialsDir = path.join(process.cwd(), 'credentials');
    
    if (!fs.existsSync(credentialsDir)) {
      fs.mkdirSync(credentialsDir, { recursive: true });
    }
    
    fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
    
    console.log('\n✅ SUCCESS! Tokens saved to:', tokenPath);
    console.log('\n🎉 Your Gmail is now connected!');
    console.log('\n📝 Token details:');
    console.log('   - Access Token: ✅');
    console.log('   - Refresh Token: ✅');
    console.log('   - Expiry Date:', new Date(tokens.expiry_date!).toLocaleString());
    console.log('\n🚀 Now restart your backend server:');
    console.log('   npm run dev\n');
  } catch (error) {
    console.error('\n❌ Error exchanging code for tokens:', error);
    console.log('\n💡 Make sure you:');
    console.log('   1. Copied the entire code from the URL');
    console.log('   2. Didn\'t include any extra spaces');
    console.log('   3. Used the code immediately (they expire quickly)');
  }
  
  process.exit(0);
}

// Support passing code as command line argument for Windows compatibility
const codeArg = process.argv[2];
if (codeArg) {
  (async () => {
    console.log('\n🔐 Gmail & Google Drive OAuth Authorization');
    console.log('📋 Using code from command line argument...\n');
    
    try {
      console.log('⏳ Exchanging code for tokens...');
      const { tokens } = await oauth2Client.getToken(codeArg.trim());
      
      const tokenPath = path.join(process.cwd(), 'credentials', 'gmail-token.json');
      const credentialsDir = path.join(process.cwd(), 'credentials');
      
      if (!fs.existsSync(credentialsDir)) {
        fs.mkdirSync(credentialsDir, { recursive: true });
      }
      
      fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
      
      console.log('\n✅ SUCCESS! Tokens saved to:', tokenPath);
      console.log('\n🎉 Your Gmail is now connected!');
      console.log('\n📝 Token details:');
      console.log('   - Access Token: ✅');
      console.log('   - Refresh Token: ✅');
      console.log('   - Expiry Date:', new Date(tokens.expiry_date!).toLocaleString());
      console.log('\n🚀 Now restart your backend server:');
      console.log('   npm run dev\n');
    } catch (error) {
      console.error('\n❌ Error exchanging code for tokens:', error);
      console.log('\n💡 Make sure you:');
      console.log('   1. Copied the entire code');
      console.log('   2. Used the code immediately (they expire quickly)');
    }
    process.exit(0);
  })();
} else {
  getTokens();
}
