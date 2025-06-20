const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const open = require("open");
const { exec } = require("child_process");
const { createGoogleMeetEvent } = require("./calendar");

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
    console.log("scheduling for", req.body);
    res.json({
      message: "Meeting scheduled successfully!",
      meetLink: event.conferenceData.entryPoints[0].uri,
      calendarEventLink: event.htmlLink,
    });
  } catch (error) {
    console.error("Error scheduleMeetingDoctor:", error.message);
    res.status(500).json({ error: "Failed to schedule meeting." });
  }
};

module.exports = { scheduleMeetingDoctor };
