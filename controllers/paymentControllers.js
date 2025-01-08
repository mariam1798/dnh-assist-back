require("dotenv").config();
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const configuration = require("../knexfile");
const nodemailer = require("nodemailer");
const knex = require("knex")(configuration);

const createPaymentIntent = async (req, res) => {
  const { bookingId, amount, currency } = req.body;

  try {
    if (!bookingId || !amount) {
      return res
        .status(400)
        .json({ error: "Booking ID and amount are required." });
    }

    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert GBP to pence
      currency: currency || "gbp", // Default to GBP
      metadata: { bookingId }, // Attach booking metadata
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret, // Send the client secret to the front-end
      paymentIntentId: paymentIntent.id, // Optional: Include for debugging or logging
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({ error: "Failed to create payment intent." });
  }
};

const confirmPayment = async (req, res) => {
  const { bookingId, paymentId } = req.body;

  try {
    if (!bookingId || !paymentId) {
      return res.status(400).json({
        error: "Booking ID and Payment ID are required.",
      });
    }

    // Retrieve payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);
    console.log("Payment Intent Status:", paymentIntent.status);

    if (paymentIntent.status === "succeeded") {
      // Fetch booking details
      const bookingDetails = await knex("bookings")
        .where({ id: bookingId })
        .first();
      console.log("Booking ID:", bookingId);
      console.log("Booking Details:", bookingDetails);

      if (!bookingDetails) {
        return res.status(404).json({ error: "Booking details not found." });
      }

      // Update booking payment status
      const updateResult = await knex("bookings")
        .where({ id: bookingId })
        .update({
          payment_status: "Completed",
          payment_id: paymentId,
        });
      console.log("Update Result:", updateResult);

      if (updateResult === 0) {
        throw new Error("Booking ID not found in database.");
      }

      // Calculate blocked dates (the day before and after)
      const bookedDate = new Date(bookingDetails.date);
      const dayBefore = new Date(bookedDate);
      const dayAfter = new Date(bookedDate);
      dayBefore.setDate(bookedDate.getDate() - 1);
      dayAfter.setDate(bookedDate.getDate() + 1);

      const datesToBlock = [
        bookedDate.toISOString().split("T")[0],
        dayBefore.toISOString().split("T")[0],
        dayAfter.toISOString().split("T")[0],
      ];

      // Insert blocked dates into the database
      const blockedDates = datesToBlock.map((blockDate) => ({
        date: blockDate,
        booking_id: bookingId,
      }));

      await knex("blocked_dates").insert(blockedDates);

      // Send Emails
      await sendPaymentConfirmationEmail(bookingId, bookingDetails);
      await sendCompanyNotificationEmail(paymentId, bookingId);

      console.log("Emails sent successfully");

      res.status(200).json({
        message: "Payment confirmed, booking updated, and emails sent!",
      });
    } else {
      res.status(400).json({ error: "Payment not completed yet." });
    }
  } catch (error) {
    console.error("Error confirming payment:", error);
    res.status(500).json({ error: "Failed to confirm payment." });
  }
};

const sendCompanyNotificationEmail = async (paymentId, bookingId) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.ionos.co.uk",
    port: 587,
    secure: false,
    auth: {
      user: "noreply@dnh.dental",
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: "noreply@dnh.dental",
    to: "admin@dnh.dental", // Replace with your company's admin email
    subject: "New Booking Payment Received",
    text: `A new payment has been received for booking ID: ${bookingId}.
Payment ID: ${paymentId}.
Please review the booking details in the admin portal.`,
    html: `<p>A new payment has been received for booking ID: <strong>${bookingId}</strong>.</p>
<p><strong>Payment ID:</strong> ${paymentId}</p>
<p>Please review the booking details in the admin portal.</p>`,
  };

  await transporter.sendMail(mailOptions);
};

const sendPaymentConfirmationEmail = async (bookingId, bookingDetails) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.ionos.co.uk",
    port: 587,
    secure: false,
    auth: {
      user: "noreply@dnh.dental",
      pass: process.env.EMAIL_PASS,
    },
  });

  if (!bookingDetails || !bookingDetails.email) {
    console.error("Booking details or email is undefined.");
    throw new Error("Invalid booking details or missing email.");
  }

  // Destructure booking details
  const { dentist_name, patient_name, email, phone, date, time, address } =
    bookingDetails;

  // Format date
  const formattedDate = new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const mailOptions = {
    from: "noreply@dnh.dental",
    to: `${email}`,
    subject: "Payment Confirmation and Booking Details",
    text: `Dear ${dentist_name},

Your payment for booking ID: ${bookingId} has been successfully processed.

Here are your booking details:
- Booking ID: ${bookingId}
- Dentist: ${dentist_name}
- Patient Name: ${patient_name}
- Email: ${email}
- Phone: ${phone}
- Date: ${formattedDate}
- Time: ${time}
- Address: ${address}
- Payment Status: Completed

If you would like to cancel or reschedule your booking, please click the link below:
http://localhost:3000/profile/${bookingId}

Thank you for choosing our service!

Best regards,
The DNH Dental Team`,
    html: `<p>Dear ${dentist_name},</p>
    <p>Your payment for booking ID: <strong>${bookingId}</strong> has been successfully processed.</p>
    <p>Here are your booking details:</p>
    <ul>
      <li><strong>Booking ID:</strong> ${bookingId}</li>
      <li><strong>Dentist:</strong> ${dentist_name}</li>
      <li><strong>Patient Name:</strong> ${patient_name}</li>
      <li><strong>Email:</strong> ${email}</li>
      <li><strong>Phone:</strong> ${phone}</li>
      <li><strong>Date:</strong> ${formattedDate}</li>
      <li><strong>Time:</strong> ${time}</li>
      <li><strong>Address:</strong> ${address}</li>
      <li><strong>Payment Status:</strong> Completed </li>
    </ul>
    <p>If you would like to cancel or reschedule your booking, please click the link below:</p>
    <p><a href="http://localhost:3000/profile/${bookingId}">Cancel or Reschedule Booking</a></p>
    <p>Thank you for choosing our service!</p>
    <p>Best regards,</p>
    <p>The DNH Dental Team</p>`,
  };

  await transporter.sendMail(mailOptions);
};
module.exports = {
  createPaymentIntent,
  confirmPayment,
  sendPaymentConfirmationEmail,
};
