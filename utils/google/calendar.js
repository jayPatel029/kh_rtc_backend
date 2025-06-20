const { google } = require("googleapis");
const authenticate = require("./auth");

async function createGoogleMeetEvent(eventData) {
  const auth = await authenticate();
  const calendar = google.calendar({ version: "v3", auth });

  console.log("event data: ",eventData);
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

  const response = await calendar.events.insert({
    calendarId: "primary",
    resource: event,
    conferenceDataVersion: 1,
    sendUpdates: "all",
  });

  console.log("api respose: ", response.data);
  return response.data;
}

module.exports = { createGoogleMeetEvent };
