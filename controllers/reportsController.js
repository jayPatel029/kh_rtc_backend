const { sequelize, pool } = require("../config/database");
const { QueryTypes } = require("sequelize");

// Get patient distribution by age and gender
const getPatientDistribution = async (req, res) => {
    try {
        // Query to get age distribution
        const ageDistribution = await sequelize.query(`
            SELECT 
                CASE 
                    WHEN age < 18 THEN '0-17'
                    WHEN age BETWEEN 18 AND 30 THEN '18-30'
                    WHEN age BETWEEN 31 AND 45 THEN '31-45'
                    WHEN age BETWEEN 46 AND 60 THEN '46-60'
                    ELSE '60+'
                END as age_group,
                COUNT(*) as count
            FROM tele_patient
            WHERE age IS NOT NULL
            GROUP BY age_group
            ORDER BY 
                CASE age_group
                    WHEN '0-17' THEN 1
                    WHEN '18-30' THEN 2
                    WHEN '31-45' THEN 3
                    WHEN '46-60' THEN 4
                    ELSE 5
                END
        `, { type: QueryTypes.SELECT });

        // Query to get gender distribution
        const genderDistribution = await sequelize.query(`
            SELECT 
                gender,
                COUNT(*) as count
            FROM tele_patient
            WHERE gender IS NOT NULL
            GROUP BY gender
        `, { type: QueryTypes.SELECT });

        res.json({
            success: true,
            data: {
                ageDistribution,
                genderDistribution
            }
        });
    } catch (error) {
        console.error('Error in getPatientDistribution:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching patient distribution data',
            error: error.message
        });
    }
};

// Get patient growth trends (new patients over time)
const getPatientGrowthTrends = async (req, res) => {
    try {
        const { period = 'monthly' } = req.query;
        
        let dateFormat, groupBy;
        switch(period) {
            case 'daily':
                dateFormat = '%Y-%m-%d';
                groupBy = 'DATE(created_at)';
                break;
            case 'weekly':
                dateFormat = '%Y-%u';
                groupBy = 'YEARWEEK(created_at)';
                break;
            default: // monthly
                dateFormat = '%Y-%m';
                groupBy = 'DATE_FORMAT(created_at, "%Y-%m")';
        }

        const growthTrends = await sequelize.query(`
            SELECT 
                DATE_FORMAT(created_at, :dateFormat) as period,
                COUNT(*) as new_patients
            FROM tele_patient
            GROUP BY ${groupBy}
            ORDER BY period ASC
        `, {
            replacements: { dateFormat },
            type: QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: growthTrends
        });
    } catch (error) {
        console.error('Error in getPatientGrowthTrends:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching patient growth trends',
            error: error.message
        });
    }
};

// Get patient geographic distribution
const getPatientGeographicDistribution = async (req, res) => {
    try {
        const geographicData = await sequelize.query(`
            SELECT 
                city,
                COUNT(*) as patient_count
            FROM tele_patient
            WHERE city IS NOT NULL
            GROUP BY city
            ORDER BY patient_count DESC
        `, { type: QueryTypes.SELECT });

        res.json({
            success: true,
            data: geographicData
        });
    } catch (error) {
        console.error('Error in getPatientGeographicDistribution:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching geographic distribution',
            error: error.message
        });
    }
};

// Get patient visit frequency analysis
const getPatientVisitFrequency = async (req, res) => {
    try {
        const visitFrequency = await sequelize.query(`
            SELECT 
                p.patient_id,
                p.name,
                COUNT(a.id) as visit_count,
                MAX(a.appointment_date) as last_visit
            FROM tele_patient p
            LEFT JOIN tele_appointments a ON p.patient_id = a.patient_id
            GROUP BY p.patient_id, p.name
            ORDER BY visit_count DESC
        `, { type: QueryTypes.SELECT });

        res.json({
            success: true,
            data: visitFrequency
        });
    } catch (error) {
        console.error('Error in getPatientVisitFrequency:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching patient visit frequency',
            error: error.message
        });
    }
};

// Get patient health metrics trends
const getPatientHealthMetrics = async (req, res) => {
    try {
        const healthMetrics = await sequelize.query(`
            SELECT 
                p.patient_id,
                p.name,
                p.age,
                p.gender,
                AVG(v.height) as avg_height,
                AVG(v.weight) as avg_weight,
                AVG(v.blood_pressure) as avg_blood_pressure,
                AVG(v.blood_sugar) as avg_blood_sugar,
                AVG(v.spO2) as avg_spO2
            FROM tele_patient p
            LEFT JOIN tele_appointments a ON p.patient_id = a.patient_id
            LEFT JOIN tele_appointment_vitals v ON a.id = v.appointment_id
            GROUP BY p.patient_id, p.name, p.age, p.gender
        `, { type: QueryTypes.SELECT });

        res.json({
            success: true,
            data: healthMetrics
        });
    } catch (error) {
        console.error('Error in getPatientHealthMetrics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching patient health metrics',
            error: error.message
        });
    }
};

// // Get patient appointment patterns
// const getPatientAppointmentPatterns = async (req, res) => {
//     try {
//         const appointmentPatterns = await sequelize.query(`
//             SELECT 
//                 p.patient_id,
//                 p.name,
//                 COUNT(CASE WHEN a.appointment_type = 'online' THEN 1 END) as online_visits,
//                 COUNT(CASE WHEN a.appointment_type = 'in_clinic' THEN 1 END) as in_clinic_visits,
//                 COUNT(CASE WHEN a.isEmergency = 1 THEN 1 END) as emergency_visits,
//                 AVG(TIME_TO_SEC(TIMEDIFF(a.appointment_time, '00:00:00'))) as avg_appointment_time
//             FROM tele_patient p
//             LEFT JOIN tele_appointments a ON p.patient_id = a.patient_id
//             GROUP BY p.patient_id, p.name
//         `, { type: QueryTypes.SELECT });

//         res.json({
//             success: true,
//             data: appointmentPatterns
//         });
//     } catch (error) {
//         console.error('Error in getPatientAppointmentPatterns:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Error fetching patient appointment patterns',
//             error: error.message
//         });
//     }
// };

const getPatientVisitCounts = async (req, res) => {
    try {
        const result = await sequelize.query(`
            SELECT 
                SUM(CASE WHEN online_count > 0 THEN 1 ELSE 0 END) AS online_visit_patients,
                SUM(CASE WHEN in_clinic_count > 0 THEN 1 ELSE 0 END) AS in_clinic_visit_patients
            FROM (
                SELECT 
                    p.patient_id,
                    COUNT(CASE WHEN a.appointment_type = 'online' THEN 1 END) AS online_count,
                    COUNT(CASE WHEN a.appointment_type = 'in_clinic' THEN 1 END) AS in_clinic_count
                FROM tele_patient p
                LEFT JOIN tele_appointments a ON p.patient_id = a.patient_id
                GROUP BY p.patient_id
            ) AS patient_visits
        `, { type: QueryTypes.SELECT });

        res.json({
            success: true,
            data: result[0]
        });
    } catch (error) {
        console.error('Error in getPatientVisitCounts:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching patient visit counts',
            error: error.message
        });
    }
};

// Get patient visit retention analysis
const getPatientRetentionAnalysis = async (req, res) => {
    try {
        const retentionData = await sequelize.query(`
            WITH FirstVisits AS (
                SELECT 
                    patient_id,
                    MIN(appointment_date) as first_visit_date
                FROM tele_appointments
                GROUP BY patient_id
            ),
            VisitCounts AS (
                SELECT 
                    p.patient_id,
                    p.name,
                    fv.first_visit_date,
                    COUNT(a.id) as total_visits,
                    MAX(a.appointment_date) as last_visit_date,
                    CASE 
                        WHEN COUNT(a.id) > 1 THEN 'Returning'
                        ELSE 'One-time'
                    END as patient_status
                FROM tele_patient p
                JOIN FirstVisits fv ON p.patient_id = fv.patient_id
                LEFT JOIN tele_appointments a ON p.patient_id = a.patient_id
                GROUP BY p.patient_id, p.name, fv.first_visit_date
            )
            SELECT 
                patient_status,
                COUNT(*) as patient_count,
                ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM VisitCounts), 2) as percentage
            FROM VisitCounts
            GROUP BY patient_status
            UNION ALL
            SELECT 
                'Total Patients' as patient_status,
                COUNT(*) as patient_count,
                100 as percentage
            FROM VisitCounts
        `, { type: QueryTypes.SELECT });

        // Get retention by time periods
        const retentionByPeriod = await sequelize.query(`
            WITH FirstVisits AS (
                SELECT 
                    patient_id,
                    MIN(appointment_date) as first_visit_date
                FROM tele_appointments
                GROUP BY patient_id
            ),
            ReturnVisits AS (
                SELECT 
                    p.patient_id,
                    fv.first_visit_date,
                    MIN(a.appointment_date) as return_visit_date
                FROM tele_patient p
                JOIN FirstVisits fv ON p.patient_id = fv.patient_id
                JOIN tele_appointments a ON p.patient_id = a.patient_id
                WHERE a.appointment_date > fv.first_visit_date
                GROUP BY p.patient_id, fv.first_visit_date
            )
            SELECT 
                CASE 
                    WHEN DATEDIFF(rv.return_visit_date, fv.first_visit_date) <= 30 THEN 'Within 30 days'
                    WHEN DATEDIFF(rv.return_visit_date, fv.first_visit_date) <= 90 THEN 'Within 90 days'
                    WHEN DATEDIFF(rv.return_visit_date, fv.first_visit_date) <= 180 THEN 'Within 180 days'
                    ELSE 'After 180 days'
                END as return_period,
                COUNT(*) as patient_count,
                ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM ReturnVisits), 2) as percentage
            FROM FirstVisits fv
            JOIN ReturnVisits rv ON fv.patient_id = rv.patient_id
            GROUP BY return_period
            ORDER BY 
                CASE return_period
                    WHEN 'Within 30 days' THEN 1
                    WHEN 'Within 90 days' THEN 2
                    WHEN 'Within 180 days' THEN 3
                    ELSE 4
                END
        `, { type: QueryTypes.SELECT });

        res.json({
            success: true,
            data: {
                overallRetention: retentionData,
                retentionByPeriod: retentionByPeriod
            }
        });
    } catch (error) {
        console.error('Error in getPatientRetentionAnalysis:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching patient retention analysis',
            error: error.message
        });
    }
};




//todo
// Get follow-up compliance analysis
const getFollowUpComplianceAnalysis = async (req, res) => {
    try {
        const followUpAnalysis = await sequelize.query(`
            WITH PrescriptionFollowUps AS (
                SELECT 
                    p.patient_id,
                    p.name,
                    pr.id as prescription_id,
                    pr.next_visit as expected_follow_up,
                    MIN(a.appointment_date) as actual_follow_up,
                    CASE 
                        WHEN MIN(a.appointment_date) IS NULL THEN 'No Follow-up'
                        WHEN MIN(a.appointment_date) <= pr.next_visit THEN 'On Time'
                        WHEN MIN(a.appointment_date) <= DATE_ADD(pr.next_visit, INTERVAL 7 DAY) THEN 'Within 7 Days'
                        ELSE 'Late Follow-up'
                    END as follow_up_status,
                    DATEDIFF(MIN(a.appointment_date), pr.next_visit) as days_difference
                FROM tele_patient p
                JOIN tele_prescription pr ON p.patient_id = pr.patient_id
                LEFT JOIN tele_appointments a ON p.patient_id = a.patient_id 
                    AND a.appointment_date > pr.next_visit
                WHERE pr.next_visit IS NOT NULL
                GROUP BY p.patient_id, p.name, pr.id, pr.next_visit
            )
            SELECT 
                follow_up_status,
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM PrescriptionFollowUps), 2) as percentage
            FROM PrescriptionFollowUps
            GROUP BY follow_up_status
            UNION ALL
            SELECT 
                'Total Prescriptions' as follow_up_status,
                COUNT(*) as count,
                100 as percentage
            FROM PrescriptionFollowUps
        `, { type: QueryTypes.SELECT });

        // Get follow-up compliance by time periods
        const followUpByPeriod = await sequelize.query(`
            WITH PrescriptionFollowUps AS (
                SELECT 
                    p.patient_id,
                    p.name,
                    pr.id as prescription_id,
                    pr.next_visit as expected_follow_up,
                    MIN(a.appointment_date) as actual_follow_up,
                    DATEDIFF(MIN(a.appointment_date), pr.next_visit) as days_difference
                FROM tele_patient p
                JOIN tele_prescription pr ON p.patient_id = pr.patient_id
                LEFT JOIN tele_appointments a ON p.patient_id = a.patient_id 
                    AND a.appointment_date > pr.next_visit
                WHERE pr.next_visit IS NOT NULL
                GROUP BY p.patient_id, p.name, pr.id, pr.next_visit
            )
            SELECT 
                CASE 
                    WHEN days_difference IS NULL THEN 'No Follow-up'
                    WHEN days_difference < 0 THEN 'Early Follow-up'
                    WHEN days_difference = 0 THEN 'On Time'
                    WHEN days_difference <= 7 THEN '1-7 Days Late'
                    ELSE 'More than 7 Days Late'
                END as time_period,
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM PrescriptionFollowUps), 2) as percentage
            FROM PrescriptionFollowUps
            GROUP BY time_period
            ORDER BY 
                CASE time_period
                    WHEN 'No Follow-up' THEN 1
                    WHEN 'Early Follow-up' THEN 2
                    WHEN 'On Time' THEN 3
                    WHEN '1-7 Days Late' THEN 4
                    ELSE 5
                END
        `, { type: QueryTypes.SELECT });

        res.json({
            success: true,
            data: {
                followUpCompliance: followUpAnalysis,
                followUpByPeriod: followUpByPeriod
            }
        });
    } catch (error) {
        console.error('Error in getFollowUpComplianceAnalysis:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching follow-up compliance analysis',
            error: error.message
        });
    }
};



module.exports = {
    getPatientDistribution,
    getPatientGrowthTrends,
    getPatientGeographicDistribution,
    getPatientVisitFrequency,
    getPatientHealthMetrics,
    // getPatientAppointmentPatterns,
    getPatientVisitCounts,
    getPatientRetentionAnalysis,
    getFollowUpComplianceAnalysis
};

