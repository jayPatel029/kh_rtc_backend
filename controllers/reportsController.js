const { sequelize, pool } = require("../config/database");
const { QueryTypes } = require("sequelize");

// Get patient distribution by age and gender
const getPatientDistribution = async (req, res) => {
  try {
    // Query to get age distribution
    const ageDistribution = await sequelize.query(
      `
    SELECT 
        CASE 
            WHEN age BETWEEN 0 AND 9 THEN '0-9'
            WHEN age BETWEEN 10 AND 19 THEN '10-19'
            WHEN age BETWEEN 20 AND 29 THEN '20-29'
            WHEN age BETWEEN 30 AND 39 THEN '30-39'
            WHEN age BETWEEN 40 AND 49 THEN '40-49'
            WHEN age BETWEEN 50 AND 59 THEN '50-59'
            ELSE '60+'
        END as age_group,
        COUNT(*) as count
    FROM tele_patient
    WHERE age IS NOT NULL
    GROUP BY age_group
    ORDER BY 
        CASE age_group
            WHEN '0-9' THEN 1
            WHEN '10-19' THEN 2
            WHEN '20-29' THEN 3
            WHEN '30-39' THEN 4
            WHEN '40-49' THEN 5
            WHEN '50-59' THEN 6
            ELSE 7
        END
        `,
      { type: QueryTypes.SELECT }
    );

    // Query to get gender distribution
    const genderDistribution = await sequelize.query(
      `
      SELECT 
        CASE 
          WHEN LOWER(gender) = 'male' THEN 'male'
          WHEN LOWER(gender) = 'female' THEN 'female'
          ELSE 'others'
        END AS gender_category,
        COUNT(*) AS count
      FROM tele_patient
      WHERE gender IS NOT NULL
      GROUP BY gender_category
      ORDER BY gender_category
  `,
      { type: QueryTypes.SELECT }
    );

    res.json({
      success: true,
      data: {
        ageDistribution,
        genderDistribution,
      },
    });
  } catch (error) {
    console.error("Error in getPatientDistribution:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching patient distribution data",
      error: error.message,
    });
  }
};


// Get patient growth trends (new patients over time)
const getPatientGrowthTrends = async (req, res) => {
  try {
    const { period = "monthly" } = req.query;

    let dateFormat, groupBy;
    switch (period) {
      case "daily":
        dateFormat = "%Y-%m-%d";
        groupBy = "DATE(created_at)";
        break;
      case "weekly":
        dateFormat = "%Y-%u";
        groupBy = "YEARWEEK(created_at)";
        break;
      default: // monthly
        dateFormat = "%Y-%m";
        groupBy = 'DATE_FORMAT(created_at, "%Y-%m")';
    }

    const growthTrends = await sequelize.query(
      `
            SELECT 
                DATE_FORMAT(created_at, :dateFormat) as period,
                COUNT(*) as new_patients
            FROM tele_patient
            GROUP BY ${groupBy}
            ORDER BY period ASC
        `,
      {
        replacements: { dateFormat },
        type: QueryTypes.SELECT,
      }
    );

    res.json({
      success: true,
      data: growthTrends,
    });
  } catch (error) {
    console.error("Error in getPatientGrowthTrends:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching patient growth trends",
      error: error.message,
    });
  }
};



const getAppointmentTypes = async (req, res) => {
    try {
        const appointmentTypes = await sequelize.query(`
            SELECT 
                DATE_FORMAT(appointment_date, '%b') as month,
                COUNT(CASE WHEN appointment_type = 'in_clinic' THEN 1 END) as inPersonTotal,
                COUNT(CASE WHEN appointment_type = 'online' THEN 1 END) as teleconsultsTotal,
                COUNT(CASE WHEN appointment_type = 'in_clinic' AND referred_by IS NOT NULL THEN 1 END) as inPersonReferred,
                COUNT(CASE WHEN appointment_type = 'online' AND referred_by IS NOT NULL THEN 1 END) as teleconsultsReferred
            FROM tele_appointments
            GROUP BY month
            ORDER BY STR_TO_DATE(month, '%b')
        `, { type: QueryTypes.SELECT });

        const formattedData = appointmentTypes.map((data, index, array) => {
            const prevMonth = index > 0 ? array[index - 1] : null;
            return {
                month: data.month,
                inPerson: {
                    total: data.inPersonTotal,
                    referred: data.inPersonReferred
                },
                teleconsults: {
                    total: data.teleconsultsTotal,
                    referred: data.teleconsultsReferred
                },
                inPersonChange: prevMonth && prevMonth.inPersonTotal > 0
                    ? `${((data.inPersonTotal - prevMonth.inPersonTotal) / prevMonth.inPersonTotal * 100).toFixed(1)}%`
                    : '0.0%',
                teleconsultsChange: prevMonth && prevMonth.teleconsultsTotal > 0
                    ? `${((data.teleconsultsTotal - prevMonth.teleconsultsTotal) / prevMonth.teleconsultsTotal * 100).toFixed(1)}%`
                    : '0.0%'
            };
        });

        res.json({
            success: true,
            data: formattedData
        });
    } catch (error) {
        console.error('Error in getAppointmentTypes:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching appointment types data',
            error: error.message
        });
    }
};


// Get patient visit frequency analysis
const getPatientVisitFrequency = async (req, res) => {
  try {
    const visitFrequency = await sequelize.query(
      `
            SELECT 
                p.patient_id,
                p.name,
                COUNT(a.id) as visit_count,
                MAX(a.appointment_date) as last_visit
            FROM tele_patient p
            LEFT JOIN tele_appointments a ON p.patient_id = a.patient_id
            GROUP BY p.patient_id, p.name
            ORDER BY visit_count DESC
        `,
      { type: QueryTypes.SELECT }
    );

    res.json({
      success: true,
      data: visitFrequency,
    });
  } catch (error) {
    console.error("Error in getPatientVisitFrequency:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching patient visit frequency",
      error: error.message,
    });
  }
};

// Get patient health metrics trends
const getPatientHealthMetrics = async (req, res) => {
  try {
    const healthMetrics = await sequelize.query(
      `
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
        `,
      { type: QueryTypes.SELECT }
    );

    res.json({
      success: true,
      data: healthMetrics,
    });
  } catch (error) {
    console.error("Error in getPatientHealthMetrics:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching patient health metrics",
      error: error.message,
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
    const result = await sequelize.query(
      `
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
        `,
      { type: QueryTypes.SELECT }
    );

    res.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error("Error in getPatientVisitCounts:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching patient visit counts",
      error: error.message,
    });
  }
};

// Get patient visit retention analysis
const getPatientRetentionAnalysis = async (req, res) => {
  try {
    const retentionData = await sequelize.query(
      `
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
        `,
      { type: QueryTypes.SELECT }
    );

    // Get retention by time periods
    const retentionByPeriod = await sequelize.query(
      `
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
        `,
      { type: QueryTypes.SELECT }
    );

    res.json({
      success: true,
      data: {
        overallRetention: retentionData,
        retentionByPeriod: retentionByPeriod,
      },
    });
  } catch (error) {
    console.error("Error in getPatientRetentionAnalysis:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching patient retention analysis",
      error: error.message,
    });
  }
};

//todo
// Get follow-up compliance analysis
const getFollowUpComplianceAnalysis = async (req, res) => {
  try {
    const followUpAnalysis = await sequelize.query(
      `
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
        `,
      { type: QueryTypes.SELECT }
    );

    // Get follow-up compliance by time periods
    const followUpByPeriod = await sequelize.query(
      `
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
        `,
      { type: QueryTypes.SELECT }
    );

    res.json({
      success: true,
      data: {
        followUpCompliance: followUpAnalysis,
        followUpByPeriod: followUpByPeriod,
      },
    });
  } catch (error) {
    console.error("Error in getFollowUpComplianceAnalysis:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching follow-up compliance analysis",
      error: error.message,
    });
  }
};



const getDashboardStats = async (req, res) => {
  try {
    const { doctor_id, clinic_id } = req.query;
    let whereClause = '';
    let params = {};

    if (doctor_id) {
      whereClause = 'WHERE doctor_id = :doctor_id';
      params.doctor_id = doctor_id;
    } else if (clinic_id) {
      whereClause = 'WHERE clinic_id = :clinic_id';
      params.clinic_id = clinic_id;
    }

    const stats = await sequelize.query(
      `
      SELECT 
        CASE 
          WHEN :doctor_id IS NOT NULL THEN (
            SELECT COUNT(DISTINCT patient_id) 
            FROM tele_appointments 
            WHERE doctor_id = :doctor_id
          )
          WHEN :clinic_id IS NOT NULL THEN (
            SELECT COUNT(DISTINCT p.patient_id) 
            FROM tele_patient p 
            JOIN tele_patient_clinic pc ON p.patient_id = pc.patient_id 
            WHERE pc.clinic_id = :clinic_id
          )
          ELSE (SELECT COUNT(*) FROM tele_patient)
        END AS total_patients,
        
        CASE 
          WHEN :doctor_id IS NOT NULL THEN 0
          WHEN :clinic_id IS NOT NULL THEN (
            SELECT COUNT(DISTINCT d.id) 
            FROM tele_doctor d 
            JOIN tele_doctor_clinic dc ON d.id = dc.doctor_id 
            WHERE dc.clinic_id = :clinic_id
          )
          ELSE (SELECT COUNT(*) FROM tele_doctor)
        END AS total_doctors,
        
        CASE 
          WHEN :doctor_id IS NOT NULL THEN (
            SELECT COUNT(*) FROM tele_appointments WHERE doctor_id = :doctor_id
          )
          WHEN :clinic_id IS NOT NULL THEN (
            SELECT COUNT(*) 
            FROM tele_appointments a 
            JOIN tele_doctor_clinic dc ON a.doctor_id = dc.doctor_id 
            WHERE dc.clinic_id = :clinic_id
          )
          ELSE (SELECT COUNT(*) FROM tele_appointments)
        END AS total_appointments,
        
        CASE 
          WHEN :doctor_id IS NOT NULL THEN 0
          WHEN :clinic_id IS NOT NULL THEN (
            SELECT COUNT(DISTINCT u.id) 
            FROM tele_users u 
            JOIN tele_frontdesk_clinic fc ON u.id = fc.front_desk_id 
            WHERE fc.clinic_id = :clinic_id AND u.role = 'front_desk'
          )
          ELSE (SELECT COUNT(*) FROM tele_users WHERE role = 'front_desk')
        END AS total_front_desk,
        
        CASE 
          WHEN :doctor_id IS NOT NULL THEN 0
          WHEN :clinic_id IS NOT NULL THEN 1
          ELSE (SELECT COUNT(*) FROM tele_clinic)
        END AS total_clinics
      `,
      {
        replacements: {
          doctor_id: doctor_id || null,
          clinic_id: clinic_id || null,
          ...params
        },
        type: QueryTypes.SELECT,
      }
    );

    // Since this returns a single object in an array
    res.status(200).json(stats[0]);
  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
    res.status(500).json({ error: "Failed to fetch dashboard statistics." });
  }
};


const getActiveUsers = async (req, res) => {
  try {
    const { doctor_id, clinic_id } = req.query;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const formattedOneWeekAgo = oneWeekAgo.toISOString().split("T")[0];

    // Base query for login counts with filters
    let loginCountsQuery = `
      SELECT 
        role, 
        COUNT(DISTINCT user_id) AS count
      FROM 
        tele_login_activity
      WHERE 
        login_time >= :oneWeekAgo
    `;

    // Add filters based on doctor_id or clinic_id
    if (doctor_id) {
      loginCountsQuery += ` AND user_id = :doctor_id AND role = 'doctor'`;
    } else if (clinic_id) {
      loginCountsQuery += ` AND (
        (role = 'doctor' AND user_id IN (SELECT doctor_id FROM tele_doctor_clinic WHERE clinic_id = :clinic_id))
        OR (role = 'front_desk' AND user_id IN (SELECT front_desk_id FROM tele_frontdesk_clinic WHERE clinic_id = :clinic_id))
      )`;
    }

    loginCountsQuery += ` GROUP BY role`;

    // Count of active users by role from login activity
    const loginCounts = await sequelize.query(
      loginCountsQuery,
      {
        replacements: { 
          oneWeekAgo: formattedOneWeekAgo,
          doctor_id: doctor_id || null,
          clinic_id: clinic_id || null
        },
        type: QueryTypes.SELECT,
      }
    );

    const roleWiseCount = {};
    loginCounts.forEach(({ role, count }) => {
      roleWiseCount[role] = count;
    });

    // Count of active patients by appointment in last 7 days
    let patientQuery = `
      SELECT COUNT(DISTINCT p.patient_id) AS count
      FROM tele_appointments a
      INNER JOIN tele_patient p ON a.patient_id = p.patient_id
      WHERE a.appointment_date >= :oneWeekAgo
    `;

    if (doctor_id) {
      patientQuery += ` AND a.doctor_id = :doctor_id`;
    } else if (clinic_id) {
      patientQuery += ` AND a.doctor_id IN (SELECT doctor_id FROM tele_doctor_clinic WHERE clinic_id = :clinic_id)`;
    }

    const patientOnlyCount = await sequelize.query(
      patientQuery,
      {
        replacements: { 
          oneWeekAgo: formattedOneWeekAgo,
          doctor_id: doctor_id || null,
          clinic_id: clinic_id || null
        },
        type: QueryTypes.SELECT,
      }
    );

    const additionalPatients = patientOnlyCount[0]?.count || 0;

    // Add or update patient count
    roleWiseCount["patient"] = (roleWiseCount["patient"] || 0) + additionalPatients;

    // Get active clinics count
    let activeClinicsQuery = `
      SELECT DISTINCT 
        CASE 
          WHEN :doctor_id IS NOT NULL THEN (
            SELECT clinic_id FROM tele_doctor_clinic WHERE doctor_id = :doctor_id LIMIT 1
          )
          WHEN :clinic_id IS NOT NULL THEN :clinic_id
          ELSE NULL
        END as clinic_id
      FROM tele_login_activity la
      WHERE la.login_time >= :oneWeekAgo
    `;

    if (doctor_id) {
      activeClinicsQuery += ` AND la.user_id = :doctor_id AND la.role = 'doctor'`;
    } else if (clinic_id) {
      activeClinicsQuery += ` AND (
        (la.role = 'doctor' AND la.user_id IN (SELECT doctor_id FROM tele_doctor_clinic WHERE clinic_id = :clinic_id))
        OR (la.role = 'front_desk' AND la.user_id IN (SELECT front_desk_id FROM tele_frontdesk_clinic WHERE clinic_id = :clinic_id))
      )`;
    }

    const activeClinics = await sequelize.query(
      activeClinicsQuery,
      {
        replacements: { 
          oneWeekAgo: formattedOneWeekAgo,
          doctor_id: doctor_id || null,
          clinic_id: clinic_id || null
        },
        type: QueryTypes.SELECT,
      }
    );

    const activeClinicsCount = activeClinics.filter(row => row.clinic_id !== null).length;

    res.json({
      success: true,
      roleWiseCount,
      activeClinic: activeClinicsCount,
    });
  } catch (err) {
    console.error("Error getting active user counts:", err);
    res.status(500).json({
      error: "An error occurred while fetching active user counts",
    });
  }
};


const getNewUsers = async (req, res) => {
  try {
    const { doctor_id, clinic_id } = req.query;
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const formattedOneMonthAgo = oneMonthAgo.toISOString().split('T')[0];

    // Get new doctors
    let newDoctorsQuery = `
      SELECT COUNT(*) as count
      FROM tele_doctor
      WHERE created_at >= :oneMonthAgo
    `;
    if (clinic_id) {
      newDoctorsQuery += ` AND id IN (SELECT doctor_id FROM tele_doctor_clinic WHERE clinic_id = :clinic_id)`;
    }
    if (doctor_id) {
      newDoctorsQuery += ` AND id = :doctor_id`;
    }

    const newDoctors = await sequelize.query(
      newDoctorsQuery,
      {
        replacements: { 
          oneMonthAgo: formattedOneMonthAgo,
          clinic_id: clinic_id || null,
          doctor_id: doctor_id || null
        },
        type: QueryTypes.SELECT,
      }
    );

    // Get new patients
    let newPatientsQuery = `
      SELECT COUNT(*) as count
      FROM tele_patient p
      WHERE p.created_at >= :oneMonthAgo
    `;
    if (clinic_id) {
      newPatientsQuery += ` AND p.patient_id IN (
        SELECT pc.patient_id 
        FROM tele_patient_clinic pc 
        WHERE pc.clinic_id = :clinic_id
      )`;
    }
    if (doctor_id) {
      newPatientsQuery += ` AND p.patient_id IN (
        SELECT DISTINCT a.patient_id 
        FROM tele_appointments a 
        WHERE a.doctor_id = :doctor_id
      )`;
    }

    const newPatients = await sequelize.query(
      newPatientsQuery,
      {
        replacements: { 
          oneMonthAgo: formattedOneMonthAgo,
          clinic_id: clinic_id || null,
          doctor_id: doctor_id || null
        },
        type: QueryTypes.SELECT,
      }
    );

    // Get new clinics
    let newClinicsQuery = `
      SELECT COUNT(*) as count
      FROM tele_clinic
      WHERE created_at >= :oneMonthAgo
    `;
    if (clinic_id) {
      newClinicsQuery += ` AND id = :clinic_id`;
    }
    if (doctor_id) {
      newClinicsQuery += ` AND id IN (
        SELECT clinic_id 
        FROM tele_doctor_clinic 
        WHERE doctor_id = :doctor_id
      )`;
    }

    const newClinics = await sequelize.query(
      newClinicsQuery,
      {
        replacements: { 
          oneMonthAgo: formattedOneMonthAgo,
          clinic_id: clinic_id || null,
          doctor_id: doctor_id || null
        },
        type: QueryTypes.SELECT,
      }
    );

    // Get new front desk users
    let newFrontDeskQuery = `
      SELECT COUNT(*) as count
      FROM tele_users u
      WHERE u.role = 'front_desk' 
      AND u.regdate >= :oneMonthAgo
    `;
    if (clinic_id) {
      newFrontDeskQuery += ` AND u.id IN (
        SELECT front_desk_id 
        FROM tele_frontdesk_clinic 
        WHERE clinic_id = :clinic_id
      )`;
    }
    if (doctor_id) {
      newFrontDeskQuery += ` AND 0`; // No front desk users for doctor_id
    }

    const newFrontDesk = await sequelize.query(
      newFrontDeskQuery,
      {
        replacements: { 
          oneMonthAgo: formattedOneMonthAgo,
          clinic_id: clinic_id || null,
          doctor_id: doctor_id || null
        },
        type: QueryTypes.SELECT,
      }
    );

    // Get new appointments
    let newAppointmentsQuery = `
      SELECT COUNT(*) as count
      FROM tele_appointments
      WHERE appointment_date >= :oneMonthAgo
    `;
    if (clinic_id) {
      newAppointmentsQuery += ` AND doctor_id IN (
        SELECT doctor_id 
        FROM tele_doctor_clinic 
        WHERE clinic_id = :clinic_id
      )`;
    }
    if (doctor_id) {
      newAppointmentsQuery += ` AND doctor_id = :doctor_id`;
    }

    const newAppointments = await sequelize.query(
      newAppointmentsQuery,
      {
        replacements: { 
          oneMonthAgo: formattedOneMonthAgo,
          clinic_id: clinic_id || null,
          doctor_id: doctor_id || null
        },
        type: QueryTypes.SELECT,
      }
    );

    res.json({
      success: true,
      data: {
        newDoctors: newDoctors[0].count,
        newPatients: newPatients[0].count,
        newClinics: newClinics[0].count,
        newFrontDesk: newFrontDesk[0].count,
        newAppointments: newAppointments[0].count,
        totalNewUsers: newDoctors[0].count + newPatients[0].count + newClinics[0].count + newFrontDesk[0].count,
      }
    });
  } catch (error) {
    console.error("Error in getNewUsers:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching new users data",
      error: error.message
    });
  }
};



const getVisitRepetitionAndReturnRate = async (req, res) => {
  try {
    // Get visit repetition data (number of patients at each visit number)
    const visitRepetition = await sequelize.query(
      `
      WITH RankedVisits AS (
        SELECT 
          patient_id,
          appointment_date,
          ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY appointment_date) as visit_number
        FROM tele_appointments
      )
      SELECT 
        visit_number,
        COUNT(DISTINCT patient_id) as patient_count
      FROM RankedVisits
      GROUP BY visit_number
      ORDER BY visit_number ASC
      `,
      { type: QueryTypes.SELECT }
    );

    // Get patient return rate by time periods
    const returnRate = await sequelize.query(
      `
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
      ),
      TotalPatients AS (
        SELECT COUNT(DISTINCT patient_id) as total
        FROM tele_appointments
      )
      SELECT 
        CASE 
          WHEN DATEDIFF(rv.return_visit_date, fv.first_visit_date) <= 10 THEN '0-10 days'
          WHEN DATEDIFF(rv.return_visit_date, fv.first_visit_date) <= 20 THEN '11-20 days'
          WHEN DATEDIFF(rv.return_visit_date, fv.first_visit_date) <= 30 THEN '21-30 days'
          ELSE '30+ days'
        END as return_period,
        COUNT(*) as patient_count,
        ROUND(COUNT(*) * 100.0 / (SELECT total FROM TotalPatients), 2) as return_percentage
      FROM FirstVisits fv
      JOIN ReturnVisits rv ON fv.patient_id = rv.patient_id
      GROUP BY return_period
      ORDER BY 
        CASE return_period
          WHEN '0-10 days' THEN 1
          WHEN '11-20 days' THEN 2
          WHEN '21-30 days' THEN 3
          ELSE 4
        END
      `,
      { type: QueryTypes.SELECT }
    );

    // Calculate overall return rate
    const overallReturnRate = await sequelize.query(
      `
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
      ),
      TotalPatients AS (
        SELECT COUNT(DISTINCT patient_id) as total
        FROM tele_appointments
      )
      SELECT 
        ROUND(COUNT(DISTINCT rv.patient_id) * 100.0 / (SELECT total FROM TotalPatients), 2) as overall_return_rate
      FROM ReturnVisits rv
      `,
      { type: QueryTypes.SELECT }
    );

    res.json({
      success: true,
      data: {
        visitRepetition: visitRepetition,
        returnRate: {
          byPeriod: returnRate,
          overall: overallReturnRate[0].overall_return_rate
        }
      }
    });
  } catch (error) {
    console.error("Error in getVisitRepetitionAndReturnRate:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching visit repetition and return rate data",
      error: error.message
    });
  }
};



module.exports = {
  getPatientDistribution,
  getPatientGrowthTrends,
  getPatientVisitFrequency,
  getPatientHealthMetrics,
  // getPatientAppointmentPatterns,
  getPatientVisitCounts,
  getPatientRetentionAnalysis,
  getFollowUpComplianceAnalysis,
  getAppointmentTypes,
  getDashboardStats,
  getActiveUsers,
  getNewUsers,
  getVisitRepetitionAndReturnRate
};
