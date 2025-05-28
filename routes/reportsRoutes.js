const express = require("express");
const router = express.Router();
const { authenticate, authorizeRoles } = require("../middleware/auth");
const reportsController = require("../controllers/reportsController");

router.get("/patientsAS", reportsController.getPatientDistribution);
//vsit freq.
router.get("/patientsVF", reportsController.getPatientVisitFrequency);
//visit type freq
router.get("/patientsVTF", reportsController.getPatientVisitCounts);
// patients retnetion
router.get("/patient-retention", reportsController.getPatientRetentionAnalysis);
router.get("/patient-followup", reportsController.getFollowUpComplianceAnalysis);

module.exports = router;