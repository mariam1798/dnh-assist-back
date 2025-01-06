const express = require("express");
const router = express.Router();
const {
  getAvailableSlots,
  createBooking,
  getBookings,
  rescheduleBooking,
  cancelBooking,
  addSlot,
  getBlockedDates,
  getBookingDetails,
  unblockBlockedDates,
} = require("../controllers/bookingControllers");

router.get("/available", getAvailableSlots);

router.post("/booking", createBooking);

router.get("/bookings", getBookings);

router.patch("/reschedule/:bookingId", rescheduleBooking);
router.delete("/blocked/:bookingId", unblockBlockedDates);
router.delete("/cancel/:bookingId", cancelBooking);
router.post("/add", addSlot);
router.get("/block", getBlockedDates);
router.get("/:bookingId", getBookingDetails);

module.exports = router;
