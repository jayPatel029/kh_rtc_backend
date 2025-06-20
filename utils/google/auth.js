const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const open = require("open");
const readline = require("readline");
const { exec } = require("child_process");

const CREDENTIALS_PATH = path.join(__dirname, "../credentials.json");
const TOKEN_PATH = path.join(__dirname, "../token.json");
const SCOPES = [process.env.GOOGLE_SCOPES || "https://www.googleapis.com/auth/calendar"];

function getOAuthClient() {
  const content = fs.readFileSync(CREDENTIALS_PATH);
  const credentials = JSON.parse(content).installed || JSON.parse(content).web;
  return new google.auth.OAuth2(
    credentials.client_id,
    credentials.client_secret,
    process.env.GOOGLE_REDIRECT_URI || credentials.redirect_uris[0]
  );
}

async function authenticate() {
  const oAuth2Client = getOAuthClient();

  // If we have a saved token, use it
  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oAuth2Client.setCredentials(token);

    // Check and refresh if expired
    oAuth2Client.on("tokens", (tokens) => {
      if (tokens.refresh_token) {
        token.refresh_token = tokens.refresh_token;
      }
      fs.writeFileSync(TOKEN_PATH, JSON.stringify({ ...token, ...tokens }));
    });

    return oAuth2Client;
  }

  // No token saved: Begin OAuth2 flow
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });

  console.log("Authorize this app by visiting:", authUrl);
//   await open(authUrl);
  exec(`start ${authUrl}`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const code = await new Promise((resolve) =>
    rl.question("Enter the code from that page here: ", resolve)
  );
  rl.close();

  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));

  return oAuth2Client;
}

module.exports = authenticate;
