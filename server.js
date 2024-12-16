const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const usersRoutes = require("./routes/usersRoutes");
const bookingRoutes = require("./routes/bookingRoutes");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use("/users", usersRoutes);
app.use("/booking", bookingRoutes);
const path = require("path");

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
