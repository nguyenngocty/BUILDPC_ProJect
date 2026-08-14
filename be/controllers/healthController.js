const { pool } = require("../config/database");

async function checkHealth(req, res, next) {
  try {
    await pool.query("SELECT 1 AS connected");

    return res.status(200).json({
      success: true,
      message: "Server và MySQL đang hoạt động.",
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { checkHealth };
