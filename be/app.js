const express = require("express");
const cors = require("cors");
const apiRoutes = require("./routes");
const notFoundMiddleware = require("./middlewares/notFoundMiddleware");
const errorMiddleware = require("./middlewares/errorMiddleware");
const path = require("path");

// Import các route liên quan
const productRoutes = require("./routes/admin/productRoutes");
const categoryRoutes = require("./routes/admin/categoryRoutes");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "BuildPC API đang chạy.",
  });
}); 

app.use("/api", apiRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
