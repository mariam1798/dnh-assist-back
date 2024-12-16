const router = require("express").Router();
const {
  registerUser,
  loginUser,
  getUser,
  getUserBookings,
  getUserDetails,
  getUsers,
  upload,
} = require("../controllers/usersControllers");

router.post("/register", upload.single("file"), registerUser);

router.post("/login", loginUser);
router.get("/profile", getUser);
router.get("/:userId/bookings", getUserBookings);
router.get("/:userId", getUserDetails);
router.get("/", getUsers);

router.use((error, req, res, next) => {
  if (error) {
    res.status(400).json({ error: error.message });
  } else {
    next();
  }
});

module.exports = router;
