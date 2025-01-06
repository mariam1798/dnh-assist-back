const express = require("express");
const {
  createPaymentIntent,
  confirmPayment,
} = require("../controllers/paymentControllers");

const router = express.Router();

// Route to create a payment intent
router.post("/createPayment", createPaymentIntent);

// Route to confirm payment and update booking
router.post("/confirmPayment", confirmPayment);

module.exports = router;
