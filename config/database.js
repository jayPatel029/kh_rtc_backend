const dotenv = require("dotenv");
const mariadb = require("mariadb");
const Sequelize = require("sequelize");

dotenv.config();

const pool = mariadb.createPool({
  host: process.env.host,
  user: process.env.user,
  password: process.env.password,
  database: process.env.database,
  port: process.env.PORT,
  connectionLimit: 5,
});

const sequelize = new Sequelize(
  process.env.database,
  process.env.user,
  process.env.password,
  {
    host: process.env.host,
    dialect: "mariadb",
    port: process.env.PORT,
    logging: false,
    dialectOptions: {
      useUTC: false,
    },
    timezone: "+05:30",
  }
);

async function connectToDatabase() {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log("MariaDB pool connection successful");

    await sequelize.authenticate();
    console.log("Sequelize connection established successfully.");
  } catch (error) {
    console.error("Database connection error:", error);
  } finally {
    if (conn) conn.release();
  }
}

module.exports = {
  connectToDatabase,
  pool,
  sequelize,
};
