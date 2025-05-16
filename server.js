const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const app = express();
const port = 8080;
const path = require('path');
const schedule = require('node-schedule');

app.use(cors({
  origin: 'http://localhost:3000'
}));
app.use(express.json());

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '12345',
  database: 'mydatabase',
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }
  console.log('Connected to database');
});


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});
const upload = multer({ storage });

// Create the uploads directory if it doesn't exist
const fs = require('fs');
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

app.use('/uploads', express.static('uploads'));


app.post('/uploads', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  
  res.status(201).json({ objectUrl: fileUrl });
});




app.post(
  "/api/doctor",
  upload.fields([
    { name: "letterhead" },
    { name: "doctor_signature" },
    { name: "clinic_icon" },
    { name: "bar_code" },
    { name: "qr_code" },
  ]),
  (req, res) => {
    try {
      const {
        doctor,
        slot_duration,
        opd_timing,
        emergency_charge,
        clinic_name,
        address,
        upi_details,
        bank_details,
        hasLetterhead,
        language,
        topMargin,
        bottomMargin,
        services, // Services will be passed as a JSON string from the frontend
      } = req.body;

      // Get file URLs or null if the file wasn't uploaded
      const letterhead = req.files["letterhead"]
        ? `/uploads/${req.files["letterhead"][0].filename}`
        : null;
      const doctor_signature = req.files["doctor_signature"]
        ? `/uploads/${req.files["doctor_signature"][0].filename}`
        : null;
      const clinic_icon = req.files["clinic_icon"]
        ? `/uploads/${req.files["clinic_icon"][0].filename}`
        : null;
      const bar_code = req.files["bar_code"]
        ? `/uploads/${req.files["bar_code"][0].filename}`
        : null;
      const qr_code = req.files["qr_code"]
        ? `/uploads/${req.files["qr_code"][0].filename}`
        : null;

      // Parse services from JSON string
      const parsedServices = typeof services === 'string' ? JSON.parse(services) : services;

      // Concatenate service details into CSV strings
      const serviceNamesCSV = parsedServices.map(service => service.serviceName).join(",");
      const unitPricesCSV = parsedServices.map(service => service.unitPrice).join(",");
      const discountsCSV = parsedServices.map(service => service.discount).join(",");


      const query = `
  
     UPDATE doctor
  SET 
    slot_duration = ?,
    opd_timing = ?,
    service = ?,
    unit_price = ?,
    discount = ?,
    emergency_charge = ?,
    doctor_signature = ?,
    clinic_name = ?,
    address = ?,
    clinic_icon = ?,
    upi_details = ?,
    qr_code = ?,
    bank_details = ?,
    bar_code = ?,
    letterhead = ?,
    language = ?,
    bottomMargin = ?,
    topMargin = ?,
    updated_at = NOW()
  WHERE doctor = 'Dr. Smith'`;


db.query(
  query,
  [
     // Assuming id is auto-incremented
    slot_duration,
    opd_timing,
    serviceNamesCSV, // CSV string of service names
    unitPricesCSV,   // CSV string of unit prices
    discountsCSV,    // CSV string of discounts
    emergency_charge,
    doctor_signature,
    clinic_name,
    address,
    clinic_icon,
    upi_details,
    qr_code || null,
    bank_details,
    bar_code || null,
    hasLetterhead || null,
    language,
    bottomMargin,
    topMargin,
    null
  ],
  (err, result) => {
    if (err) {
      console.error("Error inserting data into doctor table:", err);
      res.status(500).send("Server error");
      return;
    }

    res.status(200).send("Doctor data inserted successfully!");
  }
);

    } catch (error) {
      console.error("Error processing doctor data:", error);
      res.status(500).send("Server error");
    }
  }
);


app.get('/api/vitals/:appointment_id', (req, res) => {
  const { appointment_id } = req.params;

  const query = 'SELECT * FROM appointment_vitals WHERE appointment_id = ?';
  db.query(query, [appointment_id], (error, results) => {
    if (error) {
      return res.status(500).json({ error: 'Error fetching data' });
    }

    if (results.length > 0) {
      res.json(results[0]);
    } else {
      res.json({});
    }
  });
});

// POST route to insert or update vitals for an appointment_id
app.post('/api/vitals/:appointment_id', (req, res) => {
  const { appointment_id } = req.params;
  const {
    height,
    heightUnit,
    weight,
    temperature,
    temperatureUnit,
    blood_pressure,
    bloodPressureUnit,
    blood_sugar,
    bloodSugarUnit,
    spO2,
    pulse_rate,
    otherName,
    otherValue
  } = req.body;

  const query = `
    INSERT INTO appointment_vitals 
    (appointment_id, height, heightUnit, weight, temperature, temperatureUnit, blood_pressure, bloodPressureUnit, blood_sugar, bloodSugarUnit, spO2, pulse_rate, other, othervalue)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
    height = VALUES(height),
    heightUnit = VALUES(heightUnit),
    weight = VALUES(weight),
    temperature = VALUES(temperature),
    temperatureUnit = VALUES(temperatureUnit),
    blood_pressure = VALUES(blood_pressure),
    bloodPressureUnit = VALUES(bloodPressureUnit),
    blood_sugar = VALUES(blood_sugar),
    bloodSugarUnit = VALUES(bloodSugarUnit),
    spO2 = VALUES(spO2),
    pulse_rate = VALUES(pulse_rate),
    other = VALUES(other),
    othervalue = VALUES(othervalue)
  `;

  db.query(query, [
    appointment_id,
    height,
    heightUnit,
    weight,
    temperature,
    temperatureUnit,
    blood_pressure,
    bloodPressureUnit,
    blood_sugar,
    bloodSugarUnit,
    spO2,
    pulse_rate,
    otherName,
    otherValue
  ], (error, results) => {
    if (error) {
      console.error('Error saving vitals data:', error); // Log the error
      return res.status(500).json({ error: 'Error saving data' });
    }
    res.json({ message: 'Vitals saved successfully' });
  });
});

app.get('/api/doctor', (req, res) => {

  const {
    doctor
   } = req.body;

  
  const query = `
    SELECT 
      *
    FROM 
      doctor 
    WHERE 
      doctor = 'Dr. Smith'
  `;

  db.query(query,[doctor], (err, results) => {
    if (err) {
      console.error('Error executing query:', err);
      return res.status(500).json({ error: 'An error occurred while fetching doctor details' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    res.json(results[0]);
  });
});
app.put('/api/appointments/update/:appointment_id', (req, res) => {
  const appointmentId = req.params.appointment_id;
  const {
    patient_id,
   
    patient_name,
    gender,
    age,
    appointment_date,
    appointment_time,
    service,
    unit_price,
    discount,
    status,
    token_id,
    appointment_type,
    payment_action,
    phone_no
  } = req.body;

  const sqlQuery = `
    UPDATE appointments
    SET 
      
    
      patient_name = ?, 
      gender = ?, 
      age = ?, 
      appointment_date = ?, 
      appointment_time = ?, 
      service = ?, 
      unit_price = ?, 
      discount = ?, 
      status = ?, 
      token_id = ?, 
      appointment_type = ?, 
      payment_action = ?, 
      phone_no = ?
    WHERE appointment_id = ?
  `;

  const values = [
    
  
    patient_name,
    gender,
    age,
    appointment_date,
    appointment_time,
    service,
    unit_price,
    discount,
    status,
    token_id || null,
    appointment_type,
    payment_action,
    phone_no,
    appointmentId
  ];

  db.query(sqlQuery, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Appointment not found or no changes made' });
    }
    res.json({ message: 'Appointment updated successfully' });
  });
});


const getSuggestions = (table, column, query) => {
  return new Promise((resolve, reject) => {
    let sqlQuery;
    if (!query) {
      sqlQuery = `SELECT ${column} FROM ${table} GROUP BY ${column} ORDER BY COUNT(${column}) DESC LIMIT 10`;
    } else {
      sqlQuery = `SELECT ${column} FROM ${table} WHERE ${column} LIKE '%${query}%' LIMIT 10`;
    }
    db.query(sqlQuery, (err, results) => {
      if (err) 
        
        return reject(err);
      resolve(results.map(item => item[column]));
    });
  });
};
app.get('/api/appointments/total', async (req, res) => {
  const { date } = req.query;
  let sqlQuery = 'SELECT COUNT(*) as count FROM appointments';
  
  if (date) {
    sqlQuery += ` WHERE DATE(appointment_date) = '${date}'`;
  }

  db.query(sqlQuery, (err, results) => {
    if (err) {
      console.error('Error fetching:', err);
      return res.status(500).json({ error: 'An error occurred' });
    }
    res.json({ count: results[0].count });
  });
});

// Route to get pending appointments count
app.get('/api/appointments/pending', async (req, res) => {
  const { date } = req.query;
  let sqlQuery = "SELECT COUNT(*) as count FROM appointments WHERE status IN ('ARRIVED','BOOKED')";
  
  if (date) {
    sqlQuery += ` AND DATE(appointment_date) = '${date}'`;
  }

  db.query(sqlQuery, (err, results) => {
    if (err) {
      console.error('Error fetching:', err);
      return res.status(500).json({ error: 'An error occurred' });
    }
    res.json({ count: results[0].count });
  });
});



// Route to get completed appointments count
app.get('/api/appointments/completed', async (req, res) => {
  const { date } = req.query;
  let sqlQuery = "SELECT COUNT(*) as count FROM appointments WHERE status = 'COMPLETED'";
  
  if (date) {
    sqlQuery += ` AND DATE(appointment_date) = '${date}'`;
  }

  db.query(sqlQuery, (err, results) => {
    if (err) {
      console.error('Error fetching:', err);
      return res.status(500).json({ error: 'An error occurred' });
    }
    res.json({ count: results[0].count });
  });
});

// Route to fetch complaints suggestions
app.get('/api/suggestions/complaints', async (req, res) => {
  try {
    const { query } = req.query;
    const suggestions = await getSuggestions('complaints', 'complaint', query);
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

// Route to fetch severity suggestions
app.get('/api/suggestions/severity', async (req, res) => {
  try {
    const { query } = req.query;
    const suggestions = await getSuggestions('complaints', 'severity', query);
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

// Route to fetch duration suggestions
app.get('/api/suggestions/duration', async (req, res) => {
  try {
    const { query } = req.query;
    const suggestions = await getSuggestions('complaints', 'duration', query);
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

// Add similar routes for diagnosis, medicines, advice
app.get('/api/suggestions/diagnosis', async (req, res) => {
  try {
    const { query } = req.query;
    const suggestions = await getSuggestions('diagnosis', 'diagnosis', query);
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

app.get('/api/suggestions/medicines', async (req, res) => {
  try {
    const { query } = req.query;
    const suggestions = await getSuggestions('medicines', 'name', query);
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

app.get('/api/suggestions/advice', async (req, res) => {
  try {
    const { query } = req.query;
    const suggestions = await getSuggestions('advice', 'advice_text', query);
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

app.get('/api/suggestions/Allergies-Food',async(req, res)=>{
  try {
    const { query } = req.query;
    const suggestions = await getSuggestions('allergies', 'food', query);
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: err });
  }
})

app.get('/api/suggestions/Allergies-Medicine',async(req, res)=>{
  try {
    const { query } = req.query;
    const suggestions = await getSuggestions('allergies', 'medicine', query);
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: err });
  }
})

app.get('/api/suggestions/Allergies-Other',async(req, res)=>{
  try {
    const { query } = req.query;
    const suggestions = await getSuggestions('allergies', 'other', query);
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: err });
  }
})

app.post('/api/allergies', (req, res) => {
  const { medicine , food, other } = req.body;

  

  const sqlQuery = 'INSERT INTO allergies (medicine, food, other) VALUES (?, ?, ?)';
  db.query(sqlQuery, [medicine || NULL, food || NULL, other || NULL ], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ message: 'Allergy data inserted successfully', id: result.insertId });
  });
});

app.get('/api/pastappointments/getbyid/:id', (req, res) => {
  const patientId = req.params.id;
  console.log(patientId)
  const sqlQuery = `
    SELECT *
    FROM pastappointments
    WHERE patient_id = ?
  `;
  db.query(sqlQuery, [patientId], (err, results) => {
    if (err) {
      console.error('Error fetching lab reports:', err);
      return res.status(500).json({ error: 'An error occurred while fetching the lab reports.' });
    }
    res.json({ data: results });
  });
});


app.post('/api/pastappointments/add', (req, res) => {
  const { patientId, patient_id, date, doctor, prescription} = req.body;
 
  
  // Determine which patient identifier to use
  const patientIdentifier = patientId || patient_id;

  
  console.log(patientId)
  console.log(patient_id)
  console.log(patientIdentifier)
  const sqlQuery = `
    INSERT INTO pastappointments (patient_id, date, doctor, prescription)
    VALUES (?, ?, ?, ?)
  `;
  db.query(sqlQuery, [patientIdentifier, date, doctor || null, prescription], (err, result) => {
    if (err) {
      console.error('Error adding prescription:', err);
      return res.status(500).json({ error: 'An error occurred while adding the lab report.' });
    }
    res.status(201).json({ message: 'Prescription added successfully', id: result.insertId });
  });
});


app.post('/api/labreport/add', (req, res) => {
  const { patient_id,Lab_Report, date, doctor } = req.body;
  console.log(Lab_Report);
  
  const sqlQuery = 'INSERT INTO labreport (patient_id, date, doctor, lab_report) VALUES (?, ?, ?, ?)';
  db.query(sqlQuery, [patient_id, date, doctor, Lab_Report], (err, result) => {
    if (err) {
      console.error('Error adding lab report:', err);
      return res.status(500).json({ error: 'An error occurred while adding the lab report.' });
    }
    res.status(201).json({ message: 'Lab report added successfully', id: result.insertId });
  });

  const sqlQuery2 = 'UPDATE appointments SET doc = 1 WHERE patient_id=?';
  db.query(sqlQuery2, [patient_id], (err, result) => {
    if (err) {
      console.error('Error adding alert:', err);
      return res.status(500).json({ error: 'An error occurred while adding the lab report.' });
    }
    
  });

});

// Get lab reports by patient ID
app.get('/api/labreport/getLabReports/:patientId', (req, res) => {
  const { patientId } = req.params;
  console.log(patientId)
  const sqlQuery = 'SELECT * FROM labreport WHERE patient_id = ?';
  db.query(sqlQuery, [patientId], (err, results) => {
    if (err) {
      console.error('Error fetching lab reports:', err);
      return res.status(500).json({ error: 'An error occurred while fetching the lab reports.' });
    }
    res.json({ data: results });
  });
});

// Route to get unique template IDs for prescriptions
app.get('/api/prescriptions/templateIds', (req, res) => {
  const sqlQuery = 'SELECT DISTINCT template_id FROM prescription WHERE template_id IS NOT NULL';
  db.query(sqlQuery, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    res.json(results);
  });
});

app.post('/api/appointments/add', (req, res) => {
  const {
    patient_id, doctor, patient_name, gender, age,
    appointment_date, appointment_time, appointment_type, service,
    unit_price, discount, status, token_id, phone_no
  } = req.body;

  const sqlQuery = `
    INSERT INTO appointments (
      patient_id, doctor, patient_name, gender, age,
      appointment_date, appointment_time, service, unit_price, discount,
      status, token_id, appointment_type, payment_action, phone_no
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
  `;
  console.log(phone_no)

  db.query(sqlQuery, [
    patient_id, doctor, patient_name, gender, age,
    appointment_date, appointment_time, service, unit_price, discount,
    status, token_id, appointment_type,phone_no
  ], (err, result) => {
    if (err) {
      console.error('Error adding appointment:', err);
      return res.status(500).json({ error: 'An error occurred while adding the appointment.' });
    }
    res.status(201).json({ message: 'Appointment added successfully', id: result.insertId });
  });
});

app.get('/api/patients/search', (req, res) => {
  const searchQuery = req.query.q;
  const sqlQuery = `
    SELECT * FROM appointments
    WHERE patient_name LIKE ? OR patient_id LIKE ?
  `;
  const queryParam = `%${searchQuery}%`;

  db.query(sqlQuery, [queryParam, queryParam], (err, results) => {
    if (err) {
      console.error('Error executing query:', err);
      res.status(500).send('Error executing query');
      return;
    }
    res.json(results);
  });
});


app.get('/api/patient/getpatientlist', (req, res) => {
  const sqlQuery = 'SELECT * FROM patient';

  db.query(sqlQuery, (err, results) => {
    if (err) {
      console.error('Error fetching patient list:', err);
      return res.status(500).json({ error: 'Failed to fetch patient list' });
    }
    res.json({ data: results });
  });
});

app.get('/api/patients/getPatientbydate', (req, res) => {
  const { doctor, date } = req.query;

  let sqlQuery = 'SELECT * FROM appointments WHERE 1=1';
  const queryParams = [];

  if (doctor) {
    sqlQuery += ' AND doctor = ?';
    queryParams.push(doctor);
  }

  if (date) {
    sqlQuery += ' AND DATE(appointment_date) = ?';
    queryParams.push(date);
  }

  db.query(sqlQuery, queryParams, (err, results) => {
    if (err) {
      console.error('Error fetching patients:', err);
      return res.status(500).json({ error: 'An error occurred while fetching patients.' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'No patients found' });
    }
    res.json({ data: results });
  });
});
//app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Route to update template ID in prescriptions
app.patch('/api/prescriptions/updateTemplateId', (req, res) => {
  const { templateId } = req.body;
  const sqlQuery = 'UPDATE prescription SET template_id = ? WHERE template_id IS NULL';
  db.query(sqlQuery, [templateId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    res.json({ message: 'Template ID updated successfully for prescriptions' });
  });
});


// Route to add new patient
app.post('/api/patient/AddnewPatients', upload.single('profilePhoto'), (req, res) => {
  const {
    id,
    name,
    age,
    gender,
    email,
    number,
    past_appointments,
    lab_tests,
    book_appointments,
    appointment_id,
    date,
    doctor,
    treatment_type,
    booking_time,
    comments,
    created_date,
    service_type,
    consultation_type,
    total_amount,
    status,
    token
  } = req.body;

  let profilePhoto = null;
  if (req.file) {
    profilePhoto = path.join('uploads', req.file.filename);
  }

  const query = `
    INSERT INTO patient (
      patient_id, profile_photo, name, gender, age, email, phone_no, past_appointments, lab_tests, book_appointments,
      appointment_id, date, doctor, treatment_type, booking_time, comments, payment_action, created_date, service_type,
      consultation_type, total_amount, status, token
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    id || null,
    profilePhoto || null,
    name || null,
    gender || null,
    age || null,
    email || null,
    number || null,
    past_appointments || null,
    lab_tests || null,
    book_appointments || null,
    appointment_id || null,
    date || null,
    doctor || null,
    treatment_type || null,
    booking_time || null,
    comments || null,
    'PENDING',  // Default value for payment_action
    created_date || null,
    service_type || null,
    consultation_type || null,
    total_amount || null,
    status || null,
    token || null
  ];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error inserting new patient:', err);
      res.status(500).json({ message: 'Error inserting new patient', error: err });
      return;
    }
    res.status(201).json({ message: 'New patient added successfully', data: result });
  });
});

// Route to add a new prescription
app.post('/api/prescriptions', (req, res) => {
  const {
    template_id, complaint, severity, duration, complaintdate,
    diagnosis, diagnosis_duration, diagnosisdate, medicine_name, type, dosage, frequency,
    medicine_duration, when_to_take, from_date, to_date, advice
  } = req.body;

  const sqlQuery = `INSERT INTO prescription (
    appointment_id,template_id, complaint, severity, duration, complaintdate,
    diagnosis, diagnosis_duration, diagnosisdate, medicine_name, type, dosage, frequency,
    medicine_duration, when_to_take, from_date, to_date, advice
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.query(sqlQuery, [
    appointment_id, template_id || null, complaint || null, severity || null, duration || null, complaintdate || null,
    diagnosis || null, diagnosis_duration || null, diagnosisdate || null, medicine_name || null, type || null,
    dosage || null, frequency || null, medicine_duration || null, when_to_take || null, from_date || null,
    to_date || null, advice || null
  ], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    res.status(201).json({ message: 'Prescription added successfully', id: result.insertId });
  });
});


// Route to fetch a prescription by template ID
app.get('/api/prescriptions/templates/:templateId', (req, res) => {
  const { templateId } = req.params;
  const sqlQuery = 'SELECT * FROM prescription WHERE template_id = ?';
  db.query(sqlQuery, [templateId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    res.json(results);
  });
});

// Define routes for complaints templates
app.get('/api/complaints/templateIds', (req, res) => {
  const sqlQuery = 'SELECT DISTINCT template_id FROM complaints WHERE template_id IS NOT NULL';
  db.query(sqlQuery, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    res.json(results);
  });
});

app.patch('/api/complaints/updateTemplateId', (req, res) => {
  const { templateId } = req.body;
  const sqlQuery = 'UPDATE complaints SET template_id = ? WHERE template_id IS NULL';
  db.query(sqlQuery, [templateId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    res.json({ message: 'Template ID updated successfully for complaints' });
  });
});

app.get('/api/complaints/templates/:templateId', (req, res) => {
  const { templateId } = req.params;
  const sqlQuery = 'SELECT * FROM complaints WHERE template_id = ?';
  db.query(sqlQuery, [templateId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    res.json(results);
  });
});


// Define routes for diagnosis templates
app.get('/api/diagnosis/templateIds', (req, res) => {
  const sqlQuery = 'SELECT DISTINCT template_id FROM diagnosis WHERE template_id IS NOT NULL';
  db.query(sqlQuery, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    res.json(results);
  });
});

app.get('/api/templates/commonTemplateIds', async (req, res) => {
  const sqlQuery= `
    SELECT template_id
    FROM (
        SELECT DISTINCT template_id FROM complaints
        UNION
        SELECT DISTINCT template_id FROM diagnosis
        UNION
        SELECT DISTINCT template_id FROM medicines
        UNION
        SELECT DISTINCT template_id FROM advice
    ) AS combined_templates;
  `;

  db.query(sqlQuery, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    res.json(results);
  });
});
app.patch('/api/diagnosis/updateTemplateId', (req, res) => {
  const { templateId } = req.body;
  const sqlQuery = 'UPDATE diagnosis SET template_id = ? WHERE template_id IS NULL';
  db.query(sqlQuery, [templateId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    res.json({ message: 'Template ID updated successfully for diagnosis' });
  });
});

app.get('/api/diagnosis/templates/:templateId', (req, res) => {
  const { templateId } = req.params;
  const sqlQuery = 'SELECT * FROM diagnosis WHERE template_id = ?';
  db.query(sqlQuery, [templateId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    res.json(results);
  });
});

// Define routes for medicines templates
app.get('/api/medicines/templateIds', (req, res) => {
  const sqlQuery = 'SELECT DISTINCT template_id FROM medicines WHERE template_id IS NOT NULL';
  db.query(sqlQuery, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    res.json(results);
  });
});

app.patch('/api/medicines/updateTemplateId', (req, res) => {
  const { templateId } = req.body;
  const sqlQuery = 'UPDATE medicines SET template_id = ? WHERE template_id IS NULL';
  db.query(sqlQuery, [templateId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    res.json({ message: 'Template ID updated successfully for medicines' });
  });
});

app.get('/api/medicines/templates/:templateId', (req, res) => {
  const { templateId } = req.params;
  const sqlQuery = 'SELECT * FROM medicines WHERE template_id = ?';
  db.query(sqlQuery, [templateId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    res.json(results);
  });
});

// Define routes for advice templates
app.get('/api/advice/templateIds', (req, res) => {
  const sqlQuery = 'SELECT DISTINCT template_id FROM advice WHERE template_id IS NOT NULL';
  db.query(sqlQuery, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    res.json(results);
  });
});

app.patch('/api/advice/updateTemplateId', (req, res) => {
  const { templateId } = req.body;
  const sqlQuery = 'UPDATE advice SET template_id = ? WHERE template_id IS NULL';
  db.query(sqlQuery, [templateId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    res.json({ message: 'Template ID updated successfully for advice' });
  });
});

app.get('/api/advice/templates/:templateId', (req, res) => {
  const { templateId } = req.params;
  const sqlQuery = 'SELECT * FROM advice WHERE template_id = ?';
  db.query(sqlQuery, [templateId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    res.json(results);
  });
});

app.post('/api/complaints', (req, res) => {
  const { complaint_no, complaint, severity, duration, date } = req.body;
  const sqlQuery = 'INSERT INTO complaints (complaint_no, complaint, severity, duration, date) VALUES (?, ?, ?, ?, ?)';
  db.query(sqlQuery, [complaint_no, complaint, severity, duration, date], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    res.status(201).json({ message: 'Complaint added successfully', id: result.insertId });
  });
});

app.post('/api/diagnosis', (req, res) => {
  const { diagnosis_no, diagnosis, duration, date } = req.body;
  const sqlQuery = 'INSERT INTO diagnosis (diagnosis_no, diagnosis, duration, date) VALUES (?, ?, ?, ?)';
  db.query(sqlQuery, [diagnosis_no, diagnosis, duration, date], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    res.status(201).json({ message: 'Diagnosis added successfully', id: result.insertId });
  });
});

app.post('/api/medicines', (req, res) => {
  const { medicine_no, name, type, dosage, frequency, duration, when_to_take, from_date, to_date } = req.body;
  const sqlQuery = 'INSERT INTO medicines (medicine_no, name, type, dosage, frequency, duration, when_to_take, from_date, to_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
  db.query(sqlQuery, [medicine_no, name, type, dosage, frequency, duration, when_to_take, from_date, to_date], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    res.status(201).json({ message: 'Medicine added successfully', id: result.insertId });
  });
});

app.post('/api/advice', (req, res) => {
  const { advice_no, advice_text, details, date } = req.body;
  const sqlQuery = 'INSERT INTO advice (advice_no, advice_text, details, date) VALUES (?, ?, ?, ?)';
  db.query(sqlQuery, [advice_no, advice_text, details, date], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    res.status(201).json({ message: 'Advice added successfully', id: result.insertId });
  });
});

app.post('/api/updateStatus', (req, res) => {
  let { appointment_id, status, token_id } = req.body;

  

  // First, check if the record exists
  let selectQuery = `SELECT * FROM appointments WHERE appointment_id = ? AND payment_action = 'Paid'`;
  console.log('Executing select query:', selectQuery, [appointment_id]); // Log the query and parameters

  db.query(selectQuery, [appointment_id], (selectErr, selectResult) => {
    if (selectErr) {
      console.error('Error selecting record:', selectErr);
      return res.status(500).json({ error: 'An error occurred while selecting the record.' });
    }

 
    
    if(token_id=="ARRIVED"){
      const getNextTokenQuery = `SELECT MAX(token_id) as maxToken FROM appointments WHERE appointment_date = ?`;
      db.query(getNextTokenQuery, [new Date().toISOString().split('T')[0]], (err, results) => {
        if (err) {
          console.error('Error fetching max token_id:', err);
          return res.status(500).json({ error: 'An error occurred while fetching the max token_id.' });
        }
        token_id = (results[0].maxToken || 0) + 1;
      }
      )
      
    }
    // Proceed to update the record
    let updateQuery = `UPDATE appointments SET status = ?, token_id = ? WHERE appointment_id = ? AND payment_action = 'Paid'`;
    console.log('Executing update query:', updateQuery, [status, token_id || null, appointment_id]); // Log the query and parameters

    db.query(updateQuery, [status, token_id || null, appointment_id], (updateErr, updateResult) => {
      if (updateErr) {
        console.error('Error updating status:', updateErr);
        return res.status(500).json({ error: 'An error occurred while updating the status.' });
      }

     
      console.log('Status updated successfully:', updateResult); // Log the result of the query
      res.status(200).json({ message: 'Status updated successfully.' });
    });
  });
});

const convertTo24HourDate = (dateObj, timeStr) => {
  if (!(dateObj instanceof Date) || typeof timeStr !== 'string') {
    throw new Error('Invalid date object or time string');
  }

  const [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':');

  // Convert hours to a number for arithmetic
  hours = parseInt(hours, 10);

  // Adjust for 12-hour clock
  if (modifier === 'PM' && hours !== 12) {
    hours += 5;
  } else if (modifier === 'AM' && hours === 12) {
    hours = 0;
  }

  // Extract the date components from the dateObj
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth(); // Note: months are 0-indexed
  const day = dateObj.getDate();

  // Create and return a new Date object
  return new Date(year, month, day, hours, minutes, 0);
};

// Function to fetch today's appointments and check for missed ones
const checkAppointments = () => {
  const today = new Date().toISOString().split('T')[0];

  db.query('SELECT * FROM appointments WHERE appointment_date = ?', [today], (err, results) => {
    if (err) {
      console.error('Error fetching appointments:', err);
      return;
    }

    // Convert appointment times to comparable format and sort appointments
    const appointments = results.map((appointment) => ({
      ...appointment,
      appointment_date_time: convertTo24HourDate(appointment.appointment_date, appointment.appointment_time),
    })).sort((a, b) => a.appointment_date_time - b.appointment_date_time);
    
    const testDate = new Date('2024-08-05T13:55:00.000Z'); 
    const currentPlus5 = testDate.getTime() + 5 * 60 * 1000;

    // Check for missed appointments and reassign tokens
    appointments.forEach((appointment, index) => {
      if (
        new Date(appointment.appointment_date_time).getTime() === currentPlus5 &&
        appointment.status === 'BOOKED'
      ) {
        // Find the first eligible appointment after the missed one
        const nextEligibleAppointment = appointments.find((apt, idx) =>
          idx > index && apt.status === 'ARRIVED'
        );

        if (nextEligibleAppointment) {
          reassignToken(appointment, nextEligibleAppointment);
        }
      }
    });
  });
};

// Function to reassign token
const reassignToken = (missedAppointment, eligibleAppointment) => {
  // Update the missed appointment's status
  db.query(
    'UPDATE appointments SET status = ? WHERE appointment_id = ?',
    ['MISSED', missedAppointment.appointment_id],
    (err) => {
      if (err) {
        console.error('Error updating missed appointment:', err);
        return;
      }

      // Reassign appointment time for the eligible appointment
      db.query(
        'UPDATE appointments SET appointment_time = ? WHERE appointment_id = ?',
        [missedAppointment.appointment_time, eligibleAppointment.appointment_id],
        (err) => {
          if (err) {
            console.error('Error updating appointment time:', err);
          } else {
            console.log(`Appointment time reassigned to appointment ID ${eligibleAppointment.appointment_id}`);
          }
        }
      );
    }
  );
};


const checkAndReassignAppointments = () => {
  const today = new Date().toISOString().split('T')[0];

  db.query('SELECT * FROM appointments WHERE appointment_date = ? AND status= ?', [today,"ARRIVED"], (err, results) => {
    if (err) {
      console.error('Error fetching appointments:', err);
      return;
    }

    // Convert appointment times to comparable format and sort appointments
    const appointments = results.map((appointment) => ({
      ...appointment,
      appointment_date_time: convertTo24HourDate(appointment.appointment_date, appointment.appointment_time),
    })).sort((a, b) => a.appointment_date_time - b.appointment_date_time);
    
    const allTimeSlots = [
      "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM",
      "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM"
    ];

    // Check each time slot
    allTimeSlots.forEach(slot => {
      
      const slotTime = convertTo24HourDate(new Date(), slot);
      
      const currentDATE = new Date('2024-08-05T14:55:00.000Z'); 
      const currentTime = currentDATE.getTime();
      const slotTimeMinus5Mins = slotTime.getTime() - 5 * 60 * 1000;
      console.log(slotTimeMinus5Mins);
      console.log(currentTime);

      if (currentTime == slotTimeMinus5Mins && currentTime < slotTime.getTime()) {
        // Check if there is any appointment for this slot
        const slotAppointment = appointments.find(appointment => appointment.appointment_time === slot);
        
        if (!slotAppointment) {
          // Find the next earliest appointment to reassign
          const nextAppointment = appointments.find(appointment => new Date(appointment.appointment_date_time).getTime());

          if (nextAppointment) {
            console.log(`Reassigning time slot ${slot} to appointment ID ${nextAppointment.appointment_id}`);
            updateMissedAppointment(slot, nextAppointment);
          }
        }
      }
    });
  });
};
const updateMissedAppointment = (missedAppointmentTime, eligibleAppointment) => {
  // Update the eligible appointment's time to the missed appointment's time
  db.query(
    'UPDATE appointments SET appointment_time = ? WHERE appointment_id = ?',
    [missedAppointmentTime, eligibleAppointment.appointment_id],
    (err) => {
      if (err) {
        console.error('Error updating appointment time:', err);
        return;
      }

      console.log(`Appointment time reassigned to appointment ID ${eligibleAppointment.appointment_id}`);
    }
  );
};


// Function to reassign token

// Schedule job to run every minute
const rule = new schedule.RecurrenceRule();
rule.second = new schedule.Range(0, 59, 30); // Every 30 seconds

schedule.scheduleJob(rule, checkAppointments);

const rule1 = new schedule.RecurrenceRule();
rule1.minute = new schedule.Range(0, 59); // Every minute

schedule.scheduleJob(rule1, checkAndReassignAppointments)





app.post('/api/updatePaymentStatus', (req, res) => {
  const { appointment_id, payment_action } = req.body;

  // Check if isemergency is 1 for the given appointment_id
  const checkEmergencyQuery = `SELECT isemergency FROM appointments WHERE appointment_id = ?`;

  db.query(checkEmergencyQuery, [appointment_id], (err, result) => {
    if (err) {
      console.error('Error checking emergency status:', err);
      return res.status(500).json({ error: 'An error occurred while checking the emergency status.' });
    }

    if (result.length === 0) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    const isEmergency = result[0].isemergency;

    // Update the payment action
    const updatePaymentQuery = `UPDATE appointments SET payment_action = ? WHERE appointment_id = ?`;
    db.query(updatePaymentQuery, [payment_action, appointment_id], async (err) => {
      if (err) {
        console.error('Error updating payment status:', err);
        return res.status(500).json({ error: 'An error occurred while updating the payment status.' });
      }

      if (isEmergency === 1) {
        // If isemergency is 1, rearrange the booking times
        try {
          await rearrangeBookingTimes(appointment_id);
          return res.status(200).json({ message: 'Payment status updated and booking times rearranged successfully.' });
        } catch (error) {
          console.error('Error rearranging booking times:', error);
          return res.status(500).json({ error: 'An error occurred while rearranging booking times.' });
        }
      } else {
        return res.status(200).json({ message: 'Payment status updated successfully.' });
      }
    });
  });
});

app.post('/api/updatePastAppointments', (req, res) => {
  const { date } = req.body;

  const updateQuery = `
    UPDATE appointments 
    SET status = 'MISSED' 
    WHERE appointment_date = ? AND status = 'BOOKED'
  `;

  db.query(updateQuery, [date], (err, results) => {
    if (err) {
      console.error('Error updating appointments:', err);
      return res.status(500).json({ error: 'An error occurred while updating appointments.' });
    }
    res.status(200).json({ message: 'Appointments updated successfully.' });
  });
});

app.get('/api/consultation/getConsultations', (req, res) => {
  const sqlQuery = 'SELECT * FROM appointments';
  db.query(sqlQuery, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    res.json({ data: results });
  });
});

app.get('/api/appointments/booked-times', (req, res) => {
  const date = req.query.date;

  if (!date) {
    return res.status(400).json({ error: 'Date is required' });
  }

  const sqlQuery = 'SELECT appointment_time FROM appointments WHERE appointment_date = ?';
  db.query(sqlQuery, [date], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err });
    }

    // Extract appointment times from the results
    const bookedTimes = results.map(result => result.appointment_time);
    
    res.json({ bookedTimes });
    console.log(bookedTimes);
  });
});

app.get('/api/patient/getPatients', (req, res) => {
  const sqlQuery = 'SELECT * FROM appointments WHERE status <> "COMPLETED"';
  db.query(sqlQuery, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    res.json({ data: results });
  });
});




// Delete a lab report by ID
app.delete('/api/labreport/deleteLabReport/:id', (req, res) => {
  const { id } = req.params;
  const sqlQuery = 'DELETE FROM labreport WHERE id = ?';
  db.query(sqlQuery, [id], (err, result) => {
    if (err) {
      console.error('Error deleting lab report:', err);
      return res.status(500).json({ error: 'An error occurred while deleting the lab report.' });
    }
    res.json({ message: 'Lab report deleted successfully' });
  });
});


app.post('/api/emergencyAction', (req, res) => {
  const { appointment_id } = req.body;

  const updateAppointmentQuery = `UPDATE appointments SET payment_action = 'Pending', isemergency = 1 WHERE appointment_id = ?`;

  db.query(updateAppointmentQuery, [appointment_id], (err, result) => {
    if (err) {
      console.error('Error updating appointment for emergency:', err);
      return res.status(500).json({ error: 'An error occurred while updating the appointment for emergency.' });
    }

   
   
  });
});

const rearrangeBookingTimes = (emergencyAppointmentId) => {
  return new Promise((resolve, reject) => {
    const fetchAppointmentsQuery = `SELECT * FROM appointments WHERE appointment_date = CURDATE() AND status IN ("ARRIVED", "BOOKED")`;

    db.query(fetchAppointmentsQuery, (err, results) => {
      if (err) {
        return reject('Error fetching appointments:', err);
      }

      const allTimeSlots = [
        "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM",
        "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM"
      ];

      // Sort the results manually by appointment_time using allTimeSlots array
      results.sort((a, b) => {
        return allTimeSlots.indexOf(a.appointment_time) - allTimeSlots.indexOf(b.appointment_time);
      });

      const emergencyAppointments = results.filter(appointment => appointment.isemergency === 1);
      const nonEmergencyAppointments = results.filter(appointment => appointment.isemergency !== 1);
      console.log(nonEmergencyAppointments);

      if (emergencyAppointments.length === 0) {
        return resolve();
      }

      const currentTime = new Date(2024, 7, 19, 11, 30, 0);

      const parseTime = (timeString) => {
        const [time, modifier] = timeString.split(' ');
        let [hours, minutes] = time.split(':');
        hours = parseInt(hours, 10);
        minutes = parseInt(minutes, 10);
    
        if (modifier === 'PM' && hours !== 12) {
          hours += 12;
        } else if (modifier === 'AM' && hours === 12) {
          hours = 0;
        }
    
        const now = new Date();
        const appointmentTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
    
        return appointmentTime;
      };

      const upcomingAppointments = nonEmergencyAppointments.filter(appointment => {
        const appointmentTime = parseTime(appointment.appointment_time);
        return appointmentTime > currentTime;
      });
    
      console.log(upcomingAppointments);

      let earliestArrivedAppointment = upcomingAppointments.find(appointment => 
        appointment.status === 'ARRIVED' || appointment.status === 'BOOKED'
      );

      if (!earliestArrivedAppointment) {
        return resolve();
      }

      const earliestTime = earliestArrivedAppointment.appointment_time;

      const updateEmergencyAppointmentQuery = `UPDATE appointments SET appointment_time = ? WHERE appointment_id = ?`;

      db.query(updateEmergencyAppointmentQuery, [earliestTime, emergencyAppointmentId], async (err) => {
        if (err) {
          return reject('Error updating emergency appointment time:', err);
        }

        console.log(`Updated emergency appointment time: ${earliestTime}, ${emergencyAppointmentId}`);

        let timeSlotIndex = allTimeSlots.indexOf(earliestTime) + 1;

        for (const appointment of nonEmergencyAppointments) {
          if (appointment.isemergency === 1) continue;
          const newTimeSlot = allTimeSlots[timeSlotIndex];
          const updateNonEmergencyAppointmentQuery = `UPDATE appointments SET appointment_time = ? WHERE appointment_id = ?`;

          try {
            await new Promise((resolve, reject) => {
              db.query(updateNonEmergencyAppointmentQuery, [newTimeSlot, appointment.appointment_id], (err) => {
                if (err) {
                  return reject('Error updating non-emergency appointment time:', err);
                }

                console.log(`Updated non-emergency appointment time: ${newTimeSlot}, ${appointment.appointment_id}`);
                timeSlotIndex++;
                resolve();
              });
            });
          } catch (error) {
            return reject(error);
          }
        }

        resolve();
      });
    });
  });
};



app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
