const express = require("express");
const router = express.Router();
const {
  getAvailableSlots,
  createBooking,
  getBookings,
  rescheduleBooking,
  cancelBooking,
  addSlot,
} = require("../controllers/bookingControllers");

router.get("/available", getAvailableSlots);

router.post("/booking", createBooking);

router.get("/bookings", getBookings);

router.post("/reschedule", rescheduleBooking);

router.post("/cancel", cancelBooking);
router.post("/add", addSlot);

module.exports = router;
