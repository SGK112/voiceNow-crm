import { google } from 'googleapis';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const OAuth2 = google.auth.OAuth2;

// Your Google OAuth credentials
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'YOUR_CLIENT_SECRET';
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';

// Gmail API scope
const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

const oauth2Client = new OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

console.log('🔐 Gmail OAuth Token Generator\n');
console.log('This script will generate a refresh token for Gmail API.\n');
console.log('Using credentials:');
console.log(`  Client ID: ${CLIENT_ID.substring(0, 20)}...`);
console.log(`  Client Secret: ${CLIENT_SECRET.substring(0, 10)}...\n`);

// Generate the URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent' // Force to get refresh token
});

console.log('📋 STEP 1: Authorize this app\n');
console.log('Visit this URL in your browser:');
console.log('\n' + authUrl + '\n');
console.log('After authorization, you will get a code.');
console.log('Copy that code and paste it here.\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter the authorization code: ', async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);

    console.log('\n✅ SUCCESS! Here are your Gmail API credentials:\n');
    console.log('Add these to your .env file:\n');
    console.log(`GMAIL_CLIENT_ID=${CLIENT_ID}`);
    console.log(`GMAIL_CLIENT_SECRET=${CLIENT_SECRET}`);
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log(`GMAIL_USER=helpvoicenowcrm@gmail.com`);
    console.log('\nYou can now send emails using Gmail API! 🎉');

  } catch (error) {
    console.error('\n❌ Error retrieving tokens:', error.message);
  }

  rl.close();
});
