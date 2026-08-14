require("dotenv").config();

const app = require("./app");
const { testDatabaseConnection } = require("./config/database");

const PORT = Number(process.env.PORT || 5000);

async function startServer() {
  try {
    await testDatabaseConnection();

    app.listen(PORT, () => {
      console.log(`🚀 Backend đang chạy tại: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Không thể kết nối MySQL:", error.message);
    process.exit(1);
  }
}

startServer();
