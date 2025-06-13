const express = require("express");
const router = express.Router();
const { authenticate, authorizeRoles } = require("../middleware/auth");
const reportsController = require("../controllers/reportsController");

router.get("/getPatientDistribution", reportsController.getPatientDistribution);
//vsit freq.
router.get("/patientsVF", reportsController.getPatientVisitFrequency);
//visit type freq
router.get("/patientsVTF", reportsController.getPatientVisitCounts);
// patients retnetion
router.get("/patient-retention", reportsController.getPatientRetentionAnalysis);
router.get("/patient-followup", reportsController.getFollowUpComplianceAnalysis);
router.get("/appointment-types", reportsController.getAppointmentTypes);

router.get("/getDashboardStats", reportsController.getDashboardStats);
router.get("/getActiveUsers", reportsController.getActiveUsers);
router.get("/getNewUsers", reportsController.getNewUsers);
router.get("/visit-repetition-return", reportsController.getVisitRepetitionAndReturnRate);
router.get("/getPatientGrowthTrends", reportsController.getPatientGrowthTrends);

module.exports = router;