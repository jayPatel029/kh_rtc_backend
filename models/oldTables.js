const { pool, sequelize } = require("../databaseConn/database.js");
const { createAndAddRoles } = require("./roles.js");
const { addLanguages } = require("./language.js");
const { insertDialysisAilments } = require("./ailment.js");

async function createUsertable() {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id INT NOT NULL AUTO_INCREMENT,
      email VARCHAR(50) NOT NULL COLLATE 'utf8mb4_general_ci',
      user_password VARCHAR(150) NULL COLLATE 'utf8mb4_general_ci',
      firstname VARCHAR(50) NOT NULL COLLATE 'utf8mb4_general_ci',
      lastname VARCHAR(50) NOT NULL COLLATE 'utf8mb4_general_ci',
      phoneno VARCHAR(15) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
      regdate DATE NOT NULL,
      role VARCHAR(50) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
      PRIMARY KEY (id) USING BTREE,
      UNIQUE INDEX email (email) USING BTREE,
      INDEX role_name (role) USING BTREE,
      CONSTRAINT role_name FOREIGN KEY (role) REFERENCES roles (role_name) ON UPDATE NO ACTION ON DELETE NO ACTION
    )
    COLLATE='utf8mb4_general_ci'
    ENGINE=InnoDB;
  `;
  try {
    await pool.query(query);
  } catch (error) {
    console.log(error);
  }
}

async function createLabReportTable() {
  const createTableQuery = `
  CREATE TABLE IF NOT EXISTS labreport (
    id INT(11) NOT NULL AUTO_INCREMENT,
    Report_Type VARCHAR(255) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
    Lab_Report VARCHAR(225) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
    Comments TEXT NULL DEFAULT NULL,
    Date DATE NULL DEFAULT NULL,
    patient_id INT(11) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
    PRIMARY KEY (id) USING BTREE
  )
  COLLATE='utf8mb4_general_ci'
  ENGINE=InnoDB;
`;

  try {
    await pool.query(createTableQuery);
  } catch (error) {
    console.log(error);
  }
}

async function createKfreDetailsTable() {
  const createTableQuery = `
  CREATE TABLE IF NOT EXISTS kfre_details (
    id INT(11) NOT NULL AUTO_INCREMENT,
    patient_id INT(11) NOT NULL,
    GFR DECIMAL(5, 2) NULL DEFAULT NULL,
    Phosphorous DECIMAL(5, 2) NULL DEFAULT NULL,
    Bicarbonate DECIMAL(5, 2) NULL DEFAULT NULL,
    Albumin DECIMAL(5, 2) NULL DEFAULT NULL,
    Calcium DECIMAL(5, 2) NULL DEFAULT NULL,
    Albumin_to_Creatinine_Ratio DECIMAL(5, 2) NULL DEFAULT NULL,
    lab_id INT(11) NOT NULL,
    kfre DECIMAL(5, 2) NULL DEFAULT NULL,
    date DATE NULL DEFAULT NULL,
    PRIMARY KEY (id) USING BTREE,
    FOREIGN KEY (lab_id) REFERENCES labreport(id) ON DELETE CASCADE
  )
  COLLATE='utf8mb4_general_ci'
  ENGINE=InnoDB;
`;

  try {
    await pool.query(createTableQuery);
  } catch (error) {
    console.error("Error creating kfre_details table:", error);
  }
}

async function addSuperUser() {
  const superUserData = {
    firstname: "Kifayti",
    lastname: "SuperAdmin",
    email: "superadmin@kifaytihealth.com",
    user_password:
      "$2b$10$SNg.zxKbA.g8IIs22ZOdy.NFgIH.Ue/aqpaTvOlN2ePf.VWwwXQcG",
    role: "Admin",
    phoneno: "9372536732",
    regdate: "2024-02-01 15:11:09",
  };

  const checkQuery = "SELECT * FROM users WHERE email = ?";
  const insertQuery = `
    INSERT INTO users (
      firstname,
      lastname,
      email,
      user_password,
      role,
      phoneno,
      regdate
    )
    VALUES (?, ?, ?, ?, ?, ?, ?);
  `;

  try {
    const existingUser = await pool.query(checkQuery, [superUserData.email]);

    if (existingUser.length === 0) {
      await pool.query(insertQuery, [
        superUserData.firstname,
        superUserData.lastname,
        superUserData.email,
        superUserData.user_password,
        superUserData.role,
        superUserData.phoneno,
        superUserData.regdate,
      ]);
    } else {
    }
  } catch (error) {
    console.error("Error adding superuser:", error);
  }
}

async function createDoctorsTable() {
  const query = `CREATE TABLE IF NOT EXISTS doctors
  ( id INT NOT NULL AUTO_INCREMENT , 
    name VARCHAR(40) NOT NULL , 
    role VARCHAR(15) NOT NULL , 
    email VARCHAR(40) NOT NULL , 
    \`license no\` VARCHAR(20) NULL , 
    \`practicing at\` VARCHAR(40) NOT NULL , 
    experience INT NULL , 
    ref VARCHAR(100) NULL , 
    resume VARCHAR(250) NULL , 
    phoneno VARCHAR(255) NOT NULL , 
    \`doctors code\` VARCHAR(15) NULL , 
    institute TEXT NULL , 
    address TEXT NULL , 
    photo VARCHAR(250) NULL , 
    description TEXT NULL , 
    email_notification ENUM('yes', 'no') NOT NULL ,
    can_export ENUM('yes', 'no') NOT NULL ,
    daily_update ENUM('yes', 'no') ,
    Dialysis_updates ENUM('yes', 'no') ,
    regdate DATE,PRIMARY KEY (id)) ENGINE = InnoDB;`;

  try {
    await pool.query(query);
  } catch (error) {
    console.log(error);
  }
}

async function createSpecialitiesTable() {
  const query =
    "CREATE TABLE IF NOT EXISTS specialities (    `doctorid` INT NOT NULL,    `speciality` VARCHAR(40) NOT NULL,    FOREIGN KEY (`doctorid`) REFERENCES `doctors`(`id`)  ) ENGINE = InnoDB;";

  try {
    await pool.query(query);
  } catch (error) {
    console.log(error);
  }
}

// --------------------------------Patients Table-----------------------------------------
const createPatientTable = async () => {
  const query = `
  CREATE TABLE IF NOT EXISTS patients (
    id INT(11) NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
    aliments TEXT NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
    number VARCHAR(10) NULL DEFAULT NULL,
    gender VARCHAR(10) NULL DEFAULT NULL,
    email TEXT NULL DEFAULT NULL,
    dob VARCHAR(100) NULL DEFAULT NULL,
    profile_photo TEXT NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
    registered_date DATE NULL DEFAULT NULL,
    program_assigned_to VARCHAR(255) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
    medical_team VARCHAR(255) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
    program VARCHAR(50) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
    eGFR INT(11) NULL DEFAULT NULL,
    GFR INT(11) NULL DEFAULT NULL,
    dry_weight INT(11) NULL DEFAULT NULL,
    kefr INT(11) NULL DEFAULT NULL,
    push_notification_id VARCHAR(255) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
    fitbit_token VARCHAR(255) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
    address varchar(255) NULL DEFAULT NULL,
    pincode varchar(6) NULL DEFAULT NULL,
    state varchar(50) NULL DEFAULT NULL,
    \`condition\` ENUM('stable', 'unstable', 'critical') NOT NULL DEFAULT 'stable',
    PRIMARY KEY (id) USING BTREE
  )
  COLLATE='utf8mb4_general_ci'
  ENGINE=InnoDB
  AUTO_INCREMENT=10
  ;
  `;

  try {
    await pool.query(query);
  } catch (error) {
    console.log(error);
  }
};

async function createDoctorDailyReadingTable() {
  const query =
    "CREATE TABLE IF NOT EXISTS `doctor_daily_readings` (    `doctorid` INT NOT NULL,    `dailyreadingid` INT NOT NULL, `title` VARCHAR(255) NOT NULL ,   FOREIGN KEY (`doctorid`) REFERENCES `doctors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY (`dailyreadingid`) REFERENCES `daily_readings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE) ENGINE = InnoDB;";

  try {
    await pool.query(query);
  } catch (error) {
    console.log(error);
  }
}
async function createPatientLogTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS \`patient_log\` (
      \`log_id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`patient_id\` INT NOT NULL,
      \`changed_field\` VARCHAR(255) NOT NULL,
      \`old_value\` VARCHAR(255),
      \`new_value\` VARCHAR(255),
      \`changed_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`changed_by\` VARCHAR(255) NOT NULL,
      FOREIGN KEY (\`patient_id\`) REFERENCES \`patients\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE = InnoDB;
  `;

  try {
    await pool.query(query);
    console.log("patient_log table created successfully.");
  } catch (error) {
    console.error("Error creating patient_log table:", error);
  }
}

async function createDocLogTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS \`doctor_log\` (
      \`log_id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`doctor_id\` INT NOT NULL,
      \`changed_field\` VARCHAR(255) NOT NULL,
      \`old_value\` VARCHAR(255),
      \`new_value\` VARCHAR(255),
      \`changed_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`changed_by\` VARCHAR(255) NOT NULL,
      FOREIGN KEY (\`doctor_id\`) REFERENCES \`doctors\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE = InnoDB;
  `;

  try {
    await pool.query(query);
    console.log("doctor log table created successfully.");
  } catch (error) {
    console.error("Error creating patient_log table:", error);
  }
}


async function ReportLogTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS \`report_log\` (
      \`log_id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`report_id\` INT NOT NULL,
      \`patient_id\` INT NOT NULL,
      \`type\` VARCHAR(255) NOT NULL,
      \`report\` VARCHAR(255) NOT NULL,
      \`message\` VARCHAR(255),
      \`changed_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`deletedBy\` VARCHAR(255) NOT NULL,
      FOREIGN KEY (\`patient_id\`) REFERENCES \`patients\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE = InnoDB;
  `;

  try {
    await pool.query(query);
    console.log("Report log table created successfully.");
  } catch (error) {
    console.error("Error creating patient_log table:", error);
  }
}


async function createDoctorDialysisReadingTable() {
  const query =
    "CREATE TABLE IF NOT EXISTS `doctor_dialysis_readings` (    `doctorid` INT NOT NULL,    `dialysisreadingid` INT NOT NULL, `title` VARCHAR(255) NOT NULL,   FOREIGN KEY (`doctorid`) REFERENCES `doctors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY (`dialysisreadingid`) REFERENCES `dialysis_readings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE) ENGINE = InnoDB;";

  try {
    await pool.query(query);
  } catch (error) {
    console.log(error);
  }
}

async function createPrescriptionstable() {
  const createTableQuery = `
  CREATE TABLE IF NOT EXISTS prescriptions (
    Date DATE NULL DEFAULT NULL,
    Prescription VARCHAR(225) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
    Comments TEXT NULL DEFAULT NULL,
    patient_id INT(11) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
    id INT(11) NOT NULL AUTO_INCREMENT,
    prescriptionGivenBy INT(11) NULL DEFAULT NULL,
    PRIMARY KEY (id) USING BTREE
  )
  COLLATE='utf8mb4_general_ci'
  ENGINE=InnoDB;
`;
  try {
    await pool.query(createTableQuery);
  } catch (error) {
    console.log(error);
  }
}

async function createRequisitionTable() {
  const createTableQuery = `
  CREATE TABLE IF NOT EXISTS requisition (
    id INT(11) NOT NULL AUTO_INCREMENT,
    Requisition VARCHAR(225) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
    Patient_id INT(11) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
    Date DATE NOT NULL,
    Comments TEXT NULL DEFAULT NULL,
    PRIMARY KEY (id) USING BTREE
  )
  COLLATE='utf8mb4_general_ci'
  ENGINE=InnoDB;
`;

  try {
    await pool.query(createTableQuery);
  } catch (error) {
    console.log(error);
  }
}

async function createUserResponseTable() {
  const createTableQuery = `
  CREATE TABLE IF NOT EXISTS user_responses (
    response_id INT(11) NOT NULL AUTO_INCREMENT,
    question_id INT(11),
    user_id INT(11),
    response VARCHAR(255),
    PRIMARY KEY (response_id)
);
`;

  try {
    await pool.query(createTableQuery);
  } catch (error) {
    console.log(error);
  }
}

const createAltertsTable = async () => {
  const createTableQuery = `
  CREATE TABLE IF NOT EXISTS alerts (
    id INT(11) NOT NULL AUTO_INCREMENT,
    date DATE NULL DEFAULT NULL,
    isOpened INT(11) NULL DEFAULT '0',
    type ENUM('doctor','patient','admin') NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
    category VARCHAR(100) NULL DEFAULT '' COLLATE 'utf8mb4_general_ci',
    chatId INT(11) NULL DEFAULT '0',
    patientId INT(11) NULL DEFAULT NULL,
    programName VARCHAR(50) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
    alarmId INT(11) NULL DEFAULT NULL,
    labReportId INT(11) NULL DEFAULT NULL,
    requisitionId INT(11) NULL DEFAULT NULL,
    prescriptionId INT(11) NULL DEFAULT NULL,
    userEmail VARCHAR(50) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
    missedAlertId INT(11) NULL DEFAULT NULL,
    contactUsId INT(11) NULL DEFAULT NULL,
    PRIMARY KEY (id) USING BTREE
  )
  COLLATE='utf8mb4_general_ci'
  ENGINE=InnoDB;
`;

  try {
    await pool.query(createTableQuery);
  } catch (error) {
    console.log(error);
  }
};

const createAlamrsTable = async () => {
  const createTableQuery = `
  CREATE TABLE IF NOT EXISTS alarm (
    id INT(11) NOT NULL AUTO_INCREMENT,
    doctorId INT(11) NULL DEFAULT '0',
    type VARCHAR(100) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
    parameter VARCHAR(100) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
    description VARCHAR(100) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
    frequency VARCHAR(100) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
    timesamonth INT(11) NULL DEFAULT NULL,
    weekdays VARCHAR(100) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
    timesaday INT(11) NULL DEFAULT NULL,
    time VARCHAR(255) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
    status VARCHAR(100) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
    reason VARCHAR(100) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
    dateofmonth VARCHAR(255) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
    patientid INT(11) NOT NULL,
    prescriptionid INT(11) NULL DEFAULT NULL,
    dateadded DATE NULL DEFAULT NULL,
    setByUser VARCHAR(10) NOT NULL DEFAULT 'false',
    isWeek VARCHAR(10) NOT NULL DEFAULT 'true',
    daysOFWeek VARCHAR(20) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
    messagefordoctor VARCHAR(255) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
    missedFrequency INT(11) NULL DEFAULT 0,
    PRIMARY KEY (id) USING BTREE
  )
  COLLATE='utf8mb4_general_ci'
  ENGINE=InnoDB;
`;

  try {
    await pool.query(createTableQuery);
  } catch (error) {
    console.log(error);
  }
};

const createDailyReadingsAlertsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS readingalerts (
      id INT(11) NOT NULL AUTO_INCREMENT,
      Name VARCHAR(250) DEFAULT NULL COLLATE 'utf8mb4_general_ci',
      Ailments VARCHAR(250) DEFAULT NULL COLLATE 'utf8mb4_general_ci',
      Type VARCHAR(50) DEFAULT NULL COLLATE 'utf8mb4_general_ci',
      Date DATE NULL DEFAULT NULL,
      AlertText TEXT DEFAULT NULL COLLATE 'utf8mb4_general_ci',
      patientId INT(11) DEFAULT NULL,
      image TEXT DEFAULT NULL COLLATE 'utf8mb4_general_ci',
      color VARCHAR(500) DEFAULT "red" COLLATE 'utf8mb4_general_ci',
      dailyordia VARCHAR(50) DEFAULT NULL,
      questionId INT(11) NULL DEFAULT '0',
      PRIMARY KEY (id) USING BTREE,
      CONSTRAINT fk_readingalerts_patientId FOREIGN KEY (patientId) REFERENCES patients (id)
    ) COLLATE='utf8mb4_general_ci' ENGINE=InnoDB;
  `;
  try {
    await pool.query(query);
  } catch (error) {
    console.log(error);
  }
};

const createDietDetailsTable = async () => {
  const query = `
  CREATE TABLE IF NOT EXISTS dietdetails (
    id INT(11) NOT NULL AUTO_INCREMENT,
    Date VARCHAR(100) NULL DEFAULT NULL,
    Meal_Type VARCHAR(100) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
    meal_desc VARCHAR(255) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
    meal_img VARCHAR(255) NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
    patient_id INT(11) NULL DEFAULT NULL,
    PRIMARY KEY (id) USING BTREE
  )
  COLLATE='utf8mb4_general_ci'
  ENGINE=InnoDB
;  
`;
  try {
    await pool.query(query);
  } catch (error) {
    console.log(error);
  }
};
async function createTableGraphReadings() {
  const query = `
      CREATE TABLE IF NOT EXISTS graph_readings (
        id INT(11) NOT NULL AUTO_INCREMENT,
        question_id INT(11) NULL DEFAULT NULL,
        user_id INT(11) NULL DEFAULT NULL,
        date TIMESTAMP NULL DEFAULT NULL,
        readings VARCHAR(500) NULL DEFAULT NULL,
        PRIMARY KEY (id) USING BTREE
      )
      COLLATE='utf8mb4_general_ci'
      ENGINE=InnoDB
  ;`;

  try {
    await pool.query(query);
  } catch (error) {
    console.log(error);
  }
}

async function createDialysisTableGraphReadings() {
  const query = `
      CREATE TABLE IF NOT EXISTS graph_readings_dialysis (
        id INT(11) NOT NULL AUTO_INCREMENT,
        question_id INT(11) NULL DEFAULT NULL,
        user_id INT(11) NULL DEFAULT NULL,
        date TIMESTAMP NULL DEFAULT NULL,
        readings VARCHAR(500) NULL DEFAULT NULL,
        PRIMARY KEY (id) USING BTREE
      )
      COLLATE='utf8mb4_general_ci'
      ENGINE=InnoDB
  ;`;

  try {
    await pool.query(query);
  } catch (error) {
    console.log(error);
  }
}

async function createUserParameterRanges() {
  const query = `
  CREATE TABLE IF NOT EXISTS user_range (
    id INT(11) NULL AUTO_INCREMENT,
    question_id INT(11) NULL,
    user_id INT(11) NULL,
    high_range_1 INT(11) NULL,
    high_range_2 INT(11) NULL,
    low_range_1 INT(11) NULL,
    low_range_2 INT(11) NULL,
    PRIMARY KEY (id) USING BTREE
  )
  COLLATE=utf8mb4_general_ci
 `;

  try {
    await pool.query(query);
  } catch (error) {
    console.log(error);
  }
}

async function createUserParameterRangesDialysis() {
  const query = `
  CREATE TABLE IF NOT EXISTS user_range_dialysis (
    id INT(11) NULL AUTO_INCREMENT,
    question_id INT(11) NULL,
    user_id INT(11) NULL,
    high_range_1 INT(11) NULL,
    high_range_2 INT(11) NULL,
    low_range_1 INT(11) NULL,
    low_range_2 INT(11) NULL,
    PRIMARY KEY (id) USING BTREE
  )
  COLLATE=utf8mb4_general_ci
 `;

  try {
    await pool.query(query);
  } catch (error) {
    console.log(error);
  }
}

async function createChatTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS chat (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user1 VARCHAR(255),
      user2 VARCHAR(255),
      patientid INT(11),
      type ENUM('Admin', 'Doctor'),
      FOREIGN KEY (patientid) REFERENCES patients(id) ON DELETE CASCADE ON UPDATE CASCADE

    )
  `;
  try {
    await pool.query(query);
  } catch (error) {
    console.log(error);
  }
}

async function createMessagesTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS messages (
      chatid INT,
      sender VARCHAR(255),
      message TEXT,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      messsage_read Smallint DEFAULT 0,
      FOREIGN KEY (chatid) REFERENCES chat(id) ON DELETE CASCADE ON UPDATE CASCADE
    )
  `;
  try {
    await pool.query(query);
  } catch (error) {
    console.log(error);
  }
}
async function createMailOtpTable() {
  const query = `
  CREATE TABLE IF NOT EXISTS mail_otp (
    id INT NOT NULL AUTO_INCREMENT,
    email VARCHAR(100) NULL DEFAULT NULL,
    otp INT NULL,
    timestamp TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id)
) COLLATE=utf8mb4_general_ci ENGINE=InnoDB;
`;
  try {
    await pool.query(query);
  } catch (error) {
    console.log(error);
  }
}

const createappAlertsTable = async () =>{
  const query = `
   CREATE TABLE IF NOT EXISTS app_alerts (
    id INT(11) NOT NULL AUTO_INCREMENT,
    patientId INT(11) NULL DEFAULT NULL,
    doctorId INT(11) NULL DEFAULT NULL,
    category VARCHAR(255) NULL DEFAULT NULL,
    message VARCHAR(255) NULL DEFAULT NULL,
    date VARCHAR(255) NULL DEFAULT NULL,
    isOpened INT(11) NULL DEFAULT '0',
    PRIMARY KEY (id) USING BTREE
   ) COLLATE='utf8mb4_general_ci' ENGINE=InnoDB;
  ` 
   try {

    await pool.query(query);
    
   } catch (error) {
      console.log(error);
    
   }

}

const createCommentsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS comments (
      id INT(11) NOT NULL AUTO_INCREMENT,
      content VARCHAR(500) DEFAULT NULL COLLATE 'utf8mb4_general_ci',
      userId INT(11) DEFAULT NULL,
      typeId INT(11) DEFAULT NULL,
      isDoctor INT(11) DEFAULT NULL,
      date VARCHAR(255) DEFAULT NULL,
      type VARCHAR(255) DEFAULT NULL,
      doctorId INT(11) Not NULL,
      PRIMARY KEY (id) USING BTREE
    ) COLLATE='utf8mb4_general_ci' ENGINE=InnoDB;
  `;
  try {
    await pool.query(query);
  } catch (error) {
    console.log(error);
  }
};

const creatCommentsReadTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS commentsread (
      id INT(11) NOT NULL AUTO_INCREMENT,
      commentId INT(11) NULL DEFAULT NULL,
      isRead INT(11) NOT NULL DEFAULT '0',
      doctorId INT(11) NULL DEFAULT NULL,
      PRIMARY KEY (id) USING BTREE
    )
    COLLATE='utf8mb4_general_ci' ENGINE=InnoDB;
  `;
  try {
    await pool.query(query);
  } catch (error) {
    console.log(error);
  }
};

async function createAilmenPatienTable() {
  const query = `
  CREATE TABLE IF NOT EXISTS ailment_patient (
    patient_id INT(11) NULL DEFAULT NULL,
    ailment_id INT(11) NULL DEFAULT NULL
  )
  COLLATE='utf8mb4_general_ci'
  ENGINE=InnoDB
  ;
`;
  try {
    await pool.query(query);
  } catch (error) {
    console.log(error);
  }
}

const createAdminPatientsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS admin_patients (
      admin_id INT NOT NULL,
      patient_id INT NOT NULL,
      date DATE NOT NULL,
      PRIMARY KEY (admin_id, patient_id),
      FOREIGN KEY (admin_id) REFERENCES users(id),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );
  `;
  try {
    await pool.query(query);
    // console.log("Admin patients table created successfully");
  } catch (error) {
    console.error("Error creating admin patients table:", error);
  }
};
const createDeletedUserTable = async()=>{
  const query = `CREATE TABLE IF NOT EXISTS deleted_user(
  patient_id INT NOT NULL,
  name VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY(patient_id,name),
  FOREIGN KEY (patient_id) REFERENCES patients(id)
  );
`;
try {
  await pool.query(query);
  // console.log("Doctor patients table created successfully");
} catch (error) {
  console.error("Error creating doctor patients table:", error);
}}
const createDoctorPatientsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS doctor_patients (
      doctor_id INT NOT NULL,
      patient_id INT NOT NULL,
      PRIMARY KEY (doctor_id, patient_id),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );
  `;
  try {
    await pool.query(query);
    // console.log("Doctor patients table created successfully");
  } catch (error) {
    console.error("Error creating doctor patients table:", error);
  }
};
// const createAilmenttranslationTable = async () => {
//   const query = `
//     CREATE TABLE IF NOT EXISTS ailmentTranslations (
//       id INT(11) NOT NULL AUTO_INCREMENT,
//       ailmentId INT(11) NOT NULL,
//       languageId INT(11) NOT NULL,
//       name NVARCHAR(255) NOT NULL,
//       PRIMARY KEY (id) USING BTREE,
//       FOREIGN KEY (ailmentId) REFERENCES ailments (id) ON DELETE CASCADE ON UPDATE CASCADE,
//       FOREIGN KEY (languageId) REFERENCES languages (id) ON DELETE CASCADE ON UPDATE CASCADE
//     )
//     COLLATE='utf8mb4_general_ci';
//   `;
//   try {
//     await pool.query(query  );
//   } catch (error) {
//     console.log(error);
//   }
// };

const createalertsReadingTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS alertsread (
      id INT(11) NOT NULL AUTO_INCREMENT,
      alertId INT(11) NULL DEFAULT NULL,
      isRead INT(11) NOT NULL DEFAULT '0',
      dailyordia VARCHAR(50) DEFAULT NULL,
      doctorId INT(11) NULL DEFAULT NULL,
      PRIMARY KEY (id) USING BTREE
    )
    COLLATE='utf8mb4_general_ci';
  `;

  try {
    await pool.query(query);
  } catch (error) {
    console.log(error);
  }
};

const createTables = async () => {
  await createDeletedUserTable();
  await ReportLogTable();
  await createPatientLogTable();
  await createAndAddRoles();
  await createUsertable();
  await createAlamrsTable();
  await sequelize.sync();
  await insertDialysisAilments();
  await createLabReportTable();
  await addSuperUser();
  await createDoctorsTable();
  await createSpecialitiesTable();
  await createPatientTable();
  await createRequisitionTable();
  await addLanguages();
  await createDoctorDailyReadingTable();
  await createDoctorDialysisReadingTable();
  await createUserResponseTable();
  await createPrescriptionstable();
  await createAltertsTable();
  await createDietDetailsTable();
  await createTableGraphReadings();
  await createUserParameterRanges();
  await createPrescriptionstable();
  await createAltertsTable();
  await createKfreDetailsTable();
  await createChatTable();
  await createMessagesTable();
  await createMailOtpTable();
  await createDialysisTableGraphReadings();
  await createUserParameterRangesDialysis();
  await createDailyReadingsAlertsTable();
  await createCommentsTable();
  await createAilmenPatienTable();
  await createAdminPatientsTable();
  await createDoctorPatientsTable();
  await createalertsReadingTable();
  await creatCommentsReadTable();
  await createappAlertsTable();
  await createDocLogTable();
  // await createAilmenttranslationTable();
};

module.exports = createTables;
