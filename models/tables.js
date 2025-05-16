const { sequelize } = require("../config/database");

// Base tables first (no foreign key dependencies)
const createTeleDoctorTable = async () => {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS tele_doctor (
        id INT AUTO_INCREMENT PRIMARY KEY,
        doctor VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        slot_duration VARCHAR(50) NULL,
        opd_timing VARCHAR(100) NULL,
        service TEXT NULL,
        unit_price TEXT NULL,
        discount TEXT NULL,
        emergency_charge TEXT NULL,
        doctor_signature VARCHAR(255) NULL,
        clinic_name VARCHAR(255) NULL,
        sections TEXT NULL,
        address TEXT NULL,
        clinic_icon VARCHAR(255) NULL,
        upi_details VARCHAR(255) NULL,
        qr_code VARCHAR(255) NULL,
        bank_details VARCHAR(255) NULL,
        bar_code VARCHAR(255) NULL,
        letterhead VARCHAR(255) NULL,
        language VARCHAR(50) NULL,
        bottomMargin INT NULL,
        topMargin INT NULL,
        whatsapp_no VARCHAR(20) NULL,
        clinic_email VARCHAR(255) NULL,
        medical_license VARCHAR(100) NULL,
        qualification VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `;
    await sequelize.query(query);
    console.log("tele_doctor table created successfully");
  } catch (error) {
    console.error("Error creating tele_doctor table:", error);
  }
};

const createTelePatientTable = async () => {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS tele_patient (
        patient_id INT AUTO_INCREMENT PRIMARY KEY,
        patient_code VARCHAR(10) UNIQUE,
        profile_photo VARCHAR(255) NULL,
        name VARCHAR(255) NOT NULL,
        gender VARCHAR(10) NULL,
        age INT NULL,
        dob DATE NULL,
        email VARCHAR(255) NULL,
        phone_no VARCHAR(20) NULL,
        address TEXT NULL,
        city VARCHAR(100) NULL,
        pincode VARCHAR(10) NULL,
        language VARCHAR(50) NULL,
        bloodgroup VARCHAR(10) NULL,
        existing_id VARCHAR(50) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `;
    await sequelize.query(query);
    console.log("tele_patient table created successfully");
  } catch (error) {
    console.error("Error creating tele_patient table:", error);
  }
};

// Appointment related tables
const createappointmentsTable = async () => {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS tele_appointments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id INT NULL,
        doctor_id INT NULL,
        appointment_date DATE NULL,
        appointment_time TIME NULL,
        service VARCHAR(255) NULL,
        unit_price DECIMAL(10,2) NULL,
        discount DECIMAL(10,2) NULL DEFAULT 0,
        status ENUM('BOOKED', 'ARRIVED', 'PENDING', 'COMPLETED', 'MISSED') DEFAULT 'PENDING',
        token_id VARCHAR(50) NULL,
        appointment_type ENUM('online', 'in_clinic') NOT NULL DEFAULT 'in_clinic',
        payment_action ENUM('PAID', 'PENDING') NULL DEFAULT 'PENDING',
        isEmergency TINYINT(1) NULL DEFAULT 0,
        FOREIGN KEY (patient_id) REFERENCES tele_patient(patient_id) ON DELETE CASCADE,
        FOREIGN KEY (doctor_id) REFERENCES tele_doctor(id) ON DELETE CASCADE
      );
    `;
    await sequelize.query(query);
    console.log("tele_appointments table created successfully");
  } catch (error) {
    console.error("Error creating tele_appointments table:", error);
  }
};

const createappointmentVitalsTable = async () => {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS tele_appointment_vitals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        appointment_id INT NOT NULL,
        height DECIMAL(5,2) NULL, 
        heightUnit VARCHAR(20) NULL, 
        weight DECIMAL(5,2) NULL,  
        temperature DECIMAL(5,2) NULL,  
        temperatureUnit VARCHAR(20) NULL,  
        blood_pressure VARCHAR(10) NULL,  
        bloodPressureUnit VARCHAR(10) NULL, 
        blood_sugar DECIMAL(5,2) NULL,
        bloodSugarUnit VARCHAR(20) NULL,  
        spO2 INT NULL,  
        pulse_rate INT NULL,  
        other TEXT NULL, 
        othervalue TEXT NULL,
        FOREIGN KEY (patient_id) REFERENCES tele_patient(patient_id) ON DELETE CASCADE,
        FOREIGN KEY (appointment_id) REFERENCES tele_appointments(id) ON DELETE CASCADE
      );
    `;
    await sequelize.query(query);
    console.log("tele_appointment_vitals table created successfully");
  } catch (error) {
    console.error("Error creating tele_appointment_vitals table:", error);
  }
};

const createAllergiesTable = async () => {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS tele_allergies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id INT NULL,
        appointment_id INT NULL,
        prescription_id INT NULL,
        medicines TEXT NULL,
        food TEXT NULL,
        others TEXT NULL,
        FOREIGN KEY (patient_id) REFERENCES tele_patient(patient_id) ON DELETE CASCADE,
        FOREIGN KEY (appointment_id) REFERENCES tele_appointments(id) ON DELETE CASCADE,
        FOREIGN KEY (prescription_id) REFERENCES tele_prescription(id) ON DELETE CASCADE
      );
    `;
    await sequelize.query(query);
    console.log("tele_allergies table created successfully");
  } catch (error) {
    console.error("Error creating tele_allergies table:", error);
  }
};

const createDiagnosisTable = async () => {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS tele_diagnosis (
        id INT AUTO_INCREMENT PRIMARY KEY,
        appointment_id INT NULL,
        prescription_id INT NULL,
        diagnosis_no VARCHAR(50) NULL,
        diagnosis TEXT NULL,
        duration VARCHAR(100) NULL,
        date DATE NULL,
        FOREIGN KEY (appointment_id) REFERENCES tele_appointments(id) ON DELETE CASCADE,
        FOREIGN KEY (prescription_id) REFERENCES tele_prescription(id) ON DELETE CASCADE
      );
    `;
    await sequelize.query(query);
    console.log("tele_diagnosis table created successfully");
  } catch (error) {
    console.error("Error creating tele_diagnosis table:", error);
  }
};

const createMedicinesTable = async () => {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS tele_medicines (
        id INT AUTO_INCREMENT PRIMARY KEY,
        appointment_id INT NULL,
        prescription_id INT NULL,
        medicine_no VARCHAR(50) NULL,
        name VARCHAR(255) NULL,
        type VARCHAR(100) NULL,
        dosage VARCHAR(100) NULL,
        frequency VARCHAR(100) NULL,
        duration VARCHAR(100) NULL,
        when_to_take VARCHAR(100) NULL,
        from_date DATE NULL,
        to_date DATE NULL,
        FOREIGN KEY (appointment_id) REFERENCES tele_appointments(id) ON DELETE CASCADE,
        FOREIGN KEY (prescription_id) REFERENCES tele_prescription(id) ON DELETE CASCADE
      );
    `;
    await sequelize.query(query);
    console.log("tele_medicines table created successfully");
  } catch (error) {
    console.error("Error creating tele_medicines table:", error);
  }
};

const createAdviceTable = async () => {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS tele_advice (
        id INT AUTO_INCREMENT PRIMARY KEY,
        appointment_id INT NULL,
        prescription_id INT NULL,
        advice_text TEXT NULL,
        date DATE NULL,
        FOREIGN KEY (appointment_id) REFERENCES tele_appointments(id) ON DELETE CASCADE,
        FOREIGN KEY (prescription_id) REFERENCES tele_prescription(id) ON DELETE CASCADE
      );
    `;
    await sequelize.query(query);
    console.log("tele_advice table created successfully");
  } catch (error) {
    console.error("Error creating tele_advice table:", error);
  }
};

const createComplaintsTable = async () => {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS tele_complaints (
        id INT AUTO_INCREMENT PRIMARY KEY,
        appointment_id INT NULL,
        prescription_id INT NULL,
        complaint_no VARCHAR(50) NULL,
        complaint TEXT NULL,
        severity VARCHAR(50) NULL,
        duration VARCHAR(100) NULL,
        date DATE NULL,
        FOREIGN KEY (appointment_id) REFERENCES tele_appointments(id) ON DELETE CASCADE,
        FOREIGN KEY (prescription_id) REFERENCES tele_prescription(id) ON DELETE CASCADE
      );
    `;
    await sequelize.query(query);
    console.log("tele_complaints table created successfully");
  } catch (error) {
    console.error("Error creating tele_complaints table:", error);
  }
};

// Junction table for patient-appointment relationship
const createPatientAppointmentTable = async () => {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS tele_patient_appointment (
        patient_id INT NOT NULL,
        appointment_id INT NOT NULL,
        PRIMARY KEY (patient_id, appointment_id),
        FOREIGN KEY (patient_id) REFERENCES tele_patient(patient_id) ON DELETE CASCADE,
        FOREIGN KEY (appointment_id) REFERENCES tele_appointments(id) ON DELETE CASCADE
      );
    `;
    await sequelize.query(query);
    console.log("tele_patient_appointment table created successfully");
  } catch (error) {
    console.error("Error creating tele_patient_appointment table:", error);
  }
};

// const createPrescriptionTable = async () => {
//   try {
//     const query = `
//       CREATE TABLE IF NOT EXISTS tele_prescription (
//         id INT AUTO_INCREMENT PRIMARY KEY,
//         appointment_id INT NULL,
//         template_id VARCHAR(50) NULL,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
//         FOREIGN KEY (appointment_id) REFERENCES tele_appointments(id) ON DELETE CASCADE
//       );
//     `;
//     await sequelize.query(query);
//     console.log("tele_prescription table created successfully");
//   } catch (error) {
//     console.error("Error creating tele_prescription table:", error);
//   }
// };


const createPrescriptionTable = async () => {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS tele_prescription (
        id INT AUTO_INCREMENT PRIMARY KEY,
        appointment_id INT NULL,
        template_id VARCHAR(50) NULL,
        next_visit DATE NULL,
        referred_to JSON NULL,
        investigation TEXT NULL,
        past_medication TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (appointment_id) REFERENCES tele_appointments(id) ON DELETE CASCADE
      );
    `;
    await sequelize.query(query);
    console.log("tele_prescription table created successfully");
  } catch (error) {
    console.error("Error creating tele_prescription table:", error);
  }
};

const createBillsTable = async () => {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS tele_bills (
        id INT AUTO_INCREMENT PRIMARY KEY,
        appointment_id INT NULL,
        prescription_id INT NULL,
        created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        service_type VARCHAR(255) NULL,
        consultation_type VARCHAR(255) NULL,
        total_amt DECIMAL(10, 2) NULL,
        payment_receipt TEXT NULL,
        FOREIGN KEY (appointment_id) REFERENCES tele_appointments(id) ON DELETE CASCADE,
        FOREIGN KEY (prescription_id) REFERENCES tele_prescription(id) ON DELETE CASCADE
      );
    `;
    await sequelize.query(query);
    console.log("tele_bills table created successfully");
  } catch (error) {
    console.error("Error creating tele_bills table:", error);
  }
};

async function addSuperUser() {
  const superUserData = {
    firstname: "Kifayti",
    lastname: "SuperAdmin",
    email: "superadmin@kifaytihealth.com",
    user_password:
      "$2a$12$URno.CWQDNPxUN9lW64HhuFil7QnXcBP1imt9Zbt8ylzh.Tr6XOZ2",
    role: "Admin",
    phoneno: "9372536732",
    regdate: "2024-05-14 15:11:09",
  };

  // const checkQuery = "SELECT * FROM tele_users WHERE email = ?";
  const checkQuery = "SELECT * FROM tele_users WHERE email = :email";

  // const insertQuery = `
  //   INSERT INTO tele_users (
  //     firstname,
  //     lastname,
  //     email,
  //     user_password,
  //     role,
  //     phoneno,
  //     regdate
  //   )
  //   VALUES (?, ?, ?, ?, ?, ?, ?);
  // `;
  const insertQuery = `
  INSERT INTO tele_users (
    firstname,
    lastname,
    email,
    user_password,
    role,
    phoneno,
    regdate
  )
  VALUES (:firstname, :lastname, :email, :user_password, :role, :phoneno, :regdate)
`;

  try {
    const existingUser = await sequelize.query(checkQuery, {
      replacements: { email: superUserData.email },
      type: sequelize.QueryTypes.SELECT,
    });

    if (existingUser.length === 0) {
      // await sequelize.query(insertQuery, [
      //   superUserData.firstname,
      //   superUserData.lastname,
      //   superUserData.email,
      //   superUserData.user_password,
      //   superUserData.role,
      //   superUserData.phoneno,
      //   superUserData.regdate,
      // ]);
      await sequelize.query(insertQuery, {
        replacements: superUserData,
        type: sequelize.QueryTypes.INSERT,
      });

      console.log("superadmin added!!");
    } else {
      console.log("superadmin exists!!");
    }
  } catch (error) {
    console.error("Error adding superuser:", error);
  }
}

const createUsersTable = async () => {
  try {
    const query = `
            CREATE TABLE IF NOT EXISTS tele_users (
        id INT NOT NULL AUTO_INCREMENT,
        email VARCHAR(50) NOT NULL COLLATE 'utf8mb4_general_ci',
        user_password VARCHAR(150) NULL COLLATE 'utf8mb4_general_ci',
        firstname VARCHAR(50) NOT NULL COLLATE 'utf8mb4_general_ci',
        lastname VARCHAR(50) NOT NULL COLLATE 'utf8mb4_general_ci',
        phoneno VARCHAR(15) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
        regdate DATE NOT NULL,
        role VARCHAR(50) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
        PRIMARY KEY (id) USING BTREE,
        UNIQUE INDEX email (email) USING BTREE
      );

    `;
    await sequelize.query(query);
    console.log("tele_users table created successfully");
  } catch (error) {
    console.error("Error creating tele_usrs table:", error);
  }
};

// Function to create all tables in the correct order
const createAllTables = async () => {
  try {
    // todo group docs by cinic name
    // Create base tables first
    await createTeleDoctorTable();
    await createTelePatientTable();

    // Create appointment tables
    await createappointmentsTable();
    await createappointmentVitalsTable();

    // Create prescription table
    await createPrescriptionTable();

    // todo recc. all unique values from the table like medicine, advice, etc whihc could be required by the doc while filling the report
    // todo add addOrUpdate function for allthe below tables
    // Create medical records tables
    await createAllergiesTable();
    await createDiagnosisTable();
    await createMedicinesTable();
    await createAdviceTable();
    await createComplaintsTable();
    await createBillsTable();

    await createUsersTable();
    await addSuperUser();

    // Create junction tables
    await createPatientAppointmentTable();

    console.log("All tables created successfully");
  } catch (error) {
    console.error("Error creating tables:", error);
  }
};

// todo add bills table
module.exports = {
  createAllTables,
  createappointmentVitalsTable,
  createappointmentsTable,
  createAllergiesTable,
  createDiagnosisTable,
  createMedicinesTable,
  createAdviceTable,
  createTeleDoctorTable,
  createComplaintsTable,
  createTelePatientTable,
  createPatientAppointmentTable,
  createPrescriptionTable,
  createBillsTable,
  createUsersTable,
};
