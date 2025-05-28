const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const open = require("open");
const { exec } = require("child_process");

const SCOPES = ["https://www.googleapis.com/auth/calendar"];
const CREDENTIALS_PATH = path.join(__dirname, "credentials.json");
const TOKEN_PATH = path.join(__dirname, "token.json");


async function authenticate() {
  console.log("[Auth] Starting authentication process...");

  // Read credentials
  console.log("[Auth] Loading credentials from file...");
  const content = fs.readFileSync(CREDENTIALS_PATH);
  const credentials = JSON.parse(content);

  const cred = credentials.installed || credentials.web;
  const { client_secret, client_id, redirect_uris } = cred;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  // Check for existing token
  if (fs.existsSync(TOKEN_PATH)) {
    console.log("[Auth] Found existing token, using stored credentials.");
    const token = fs.readFileSync(TOKEN_PATH);
    oAuth2Client.setCredentials(JSON.parse(token));
    return oAuth2Client;
  }

  // No token found, initiate new OAuth flow
  console.log("[Auth] No stored token found. Starting new OAuth flow...");
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });

  console.log(
    `[Auth] Authorize this app by visiting the following URL:\n${authUrl}`
  );
  exec(`start ${authUrl}`);

  const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const code = await new Promise((resolve) => {
    readline.question("[Auth] Paste the code from the browser here: ", resolve);
  });

  readline.close();

  console.log("[Auth] Exchanging code for tokens...");
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);

  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  console.log(`[Auth] Token stored to ${TOKEN_PATH}`);

  return oAuth2Client;
}

async function createGoogleMeetEvent(eventData) {
  console.log("[Calendar] Preparing to create Google Meet event...");
  const auth = await authenticate();
  const calendar = google.calendar({ version: "v3", auth });

  const event = {
    summary: eventData.summary,
    description: eventData.description,
    start: {
      dateTime: eventData.start,
      timeZone: eventData.timeZone,
    },
    end: {
      dateTime: eventData.end,
      timeZone: eventData.timeZone,
    },
    attendees: eventData.attendees || [],
    conferenceData: {
      createRequest: {
        requestId: `meet-${Date.now()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  console.log(
    "[Calendar] Sending event creation request to Google Calendar API..."
  );
  const response = await calendar.events.insert({
    calendarId: "primary",
    resource: event,
    conferenceDataVersion: 1,
    sendUpdates: "all",
  });

  console.log("[Calendar] Event created successfully!");
  console.log(
    `[Calendar] Google Meet link: ${response.data.conferenceData.entryPoints[0].uri}`
  );
  console.log(`[Calendar] Calendar Event link: ${response.data.htmlLink}`);

  return response.data;
}

const scheduleMeetingDoctor = async (req, res) => {
  try {
    const {
      doctorEmail,
      patientEmail,
      start,
      end,
      timeZone,
      title,
      description,
    } = req.body;

    // Build eventData with attendees
    const eventData = {
      summary: title,
      description,
      start,
      end,
      timeZone,
      attendees: [{ email: doctorEmail }, { email: patientEmail }],
    };

    const event = await createGoogleMeetEvent(eventData);

    res.json({
      message: "Meeting scheduled successfully!",
      meetLink: event.conferenceData.entryPoints[0].uri,
      calendarEventLink: event.htmlLink,
    });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Failed to schedule meeting." });
  }
};

module.exports = { createGoogleMeetEvent,scheduleMeetingDoctor };
