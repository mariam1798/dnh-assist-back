require("dotenv").config();

const configuration = require("../knexfile");
const knex = require("knex")(configuration);
const nodemailer = require("nodemailer");
const getAvailableSlots = async (req, res) => {
  const { date } = req.query;

  try {
    console.log("Received date for available slots:", { date });

    const allTimes = [
      "09:00:00",
      "09:30:00",
      "10:00:00",
      "10:30:00",
      "11:00:00",
      "11:30:00",
      "12:00:00",
      "12:30:00",
      "13:00:00",
      "13:30:00",
      "14:00:00",
      "14:30:00",
      "15:00:00",
      "15:30:00",
      "16:00:00",
      "16:30:00",
    ];

    const bookedSlots = await knex("bookings").where({ date }).select("time");

    const bookedTimes = bookedSlots.map((slot) => slot.time);

    const availableTimes = allTimes.filter(
      (time) => !bookedTimes.includes(time)
    );

    res.json(availableTimes);
  } catch (error) {
    console.error("Error fetching available slots:", error);
    res.status(500).json({ error: "Failed to fetch available slots" });
  }
};
const createBooking = async (req, res) => {
  const { name, email, phone, date, time, patientName, address } = req.body;

  try {
    // Check if the time slot is already booked
    const existingBooking = await knex("bookings")
      .where({ date, time })
      .first();

    if (existingBooking) {
      return res.status(400).json({ error: "Slot is already booked" });
    }

    // Insert a new booking with a 'Pending' payment status
    const [insertResult] = await knex("bookings").insert({
      dentist_name: name,
      patient_name: patientName,
      address,
      email,
      phone,
      date,
      time,
      payment_status: "Pending",
      created_at: knex.fn.now(),
    });

    const bookingId = insertResult; // Get the ID of the new booking

    // Send the booking ID and other details to the front-end to handle payment
    return res.status(200).json({
      message: "Booking created with pending payment status!",
      bookingId,
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    res
      .status(500)
      .json({ error: "An unexpected error occurred during booking." });
  }
};

const unblockBlockedDates = async (req, res) => {
  const { bookingId } = req.params; // Get the bookingId from the URL params

  try {
    // Fetch the booking details using the bookingId
    const bookingDetails = await knex("bookings")
      .where("id", bookingId)
      .first();

    if (!bookingDetails) {
      return res.status(404).json({ message: "Booking not found." });
    }

    // Calculate the blocked dates for the booking
    const bookedDate = new Date(bookingDetails.date);
    const dayBefore = new Date(bookedDate);
    const dayAfter = new Date(bookedDate);
    dayBefore.setDate(bookedDate.getDate() - 1);
    dayAfter.setDate(bookedDate.getDate() + 1);

    const oldBlockedDates = [
      bookedDate.toISOString().split("T")[0], // Format the date
      dayBefore.toISOString().split("T")[0], // Day before
      dayAfter.toISOString().split("T")[0], // Day after
    ];

    // Remove the old blocked dates from the database
    await knex("blocked_dates").whereIn("date", oldBlockedDates).delete();

    // Send a successful response
    res.status(200).json({ message: "Blocked dates removed successfully." });
  } catch (error) {
    console.error("Error unblocking dates:", error);
    res.status(500).json({ message: "Error unblocking dates." });
  }
};

const getBlockedDates = async (req, res) => {
  try {
    const blockedDates = await knex("blocked_dates").select("date");
    res.json(blockedDates.map((row) => row.date));
  } catch (error) {
    console.error("Error fetching blocked dates:", error);
    res.status(500).json({ error: "Failed to fetch blocked dates" });
  }
};

const getBookings = async (req, res) => {
  try {
    const bookings = await knex("bookings").select("*");
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
};
const getBookingDetails = async (req, res) => {
  const { bookingId } = req.params;

  try {
    const booking = await knex("bookings").where({ id: bookingId }).first();

    if (!booking) {
      return res.status(404).json({ error: "Booking not found." });
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch booking details." });
  }
};
const sendRescheduleConfirmationEmail = async (bookingId, bookingDetails) => {
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
    subject: "Booking Rescheduled Successfully",
    text: `Dear ${patient_name},

Your booking with ID: ${bookingId} has been successfully rescheduled.

Here are your updated booking details:
- Booking ID: ${bookingId}
- Dentist: ${dentist_name}
- Patient Name: ${patient_name}
- Email: ${email}
- Phone: ${phone}
- Date: ${formattedDate}
- Time: ${time}
- Address: ${address}
- Payment Status: Completed

If you would like to cancel or reschedule your booking again, please click the link below:
http://localhost:3001/profile/${bookingId}

Thank you for choosing our service!

Best regards,
The DNH Dental Team`,
    html: `<p>Dear ${patient_name},</p>
    <p>Your booking with ID: <strong>${bookingId}</strong> has been successfully rescheduled.</p>
    <p>Here are your updated booking details:</p>
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
    <p>If you would like to cancel or reschedule your booking again, please click the link below:</p>
    <p><a href="http://localhost:3001/profile/${bookingId}">Cancel or Reschedule Booking</a></p>
    <p>Thank you for choosing our service!</p>
    <p>Best regards,</p>
    <p>The DNH Dental Team</p>`,
  };

  await transporter.sendMail(mailOptions);
};

const rescheduleBooking = async (req, res) => {
  const { bookingId } = req.params;
  const { date, time } = req.body;

  // Ensure date and time are provided
  if (!date || !time) {
    return res.status(400).json({ message: "Date and time are required." });
  }

  try {
    // Fetch current booking details
    const bookingDetails = await knex("bookings")
      .where("id", bookingId)
      .first();

    if (!bookingDetails) {
      return res.status(404).json({ message: "Booking not found." });
    }

    // Remove old blocked dates
    const bookedDate = new Date(bookingDetails.date);
    const dayBefore = new Date(bookedDate);
    const dayAfter = new Date(bookedDate);
    dayBefore.setDate(bookedDate.getDate() - 1);
    dayAfter.setDate(bookedDate.getDate() + 1);

    const oldBlockedDates = [
      bookedDate.toISOString().split("T")[0],
      dayBefore.toISOString().split("T")[0],
      dayAfter.toISOString().split("T")[0],
    ];

    // Delete old blocked dates
    await knex("blocked_dates").whereIn("date", oldBlockedDates).delete();

    // Update booking details with the new date and time
    const response = await knex("bookings")
      .where("id", bookingId)
      .update({ date, time });

    if (response) {
      // Calculate new blocked dates
      const newBookedDate = new Date(date);
      const newDayBefore = new Date(newBookedDate);
      const newDayAfter = new Date(newBookedDate);
      newDayBefore.setDate(newBookedDate.getDate() - 1);
      newDayAfter.setDate(newBookedDate.getDate() + 1);

      const newDatesToBlock = [
        newBookedDate.toISOString().split("T")[0],
        newDayBefore.toISOString().split("T")[0],
        newDayAfter.toISOString().split("T")[0],
      ];

      // Insert new blocked dates
      const newBlockedDates = newDatesToBlock.map((blockDate) => ({
        date: blockDate,
        booking_id: bookingId,
      }));

      await knex("blocked_dates").insert(newBlockedDates);

      // Respond with success
      res.status(200).json({ message: "Booking rescheduled successfully." });

      // Send reschedule confirmation email
      await sendRescheduleConfirmationEmail(bookingId, bookingDetails);
    } else {
      return res.status(400).json({ message: "Failed to reschedule booking." });
    }
  } catch (error) {
    console.error("Error in rescheduleBooking:", error);
    res.status(500).json({ message: "Error rescheduling the booking." });
  }
};

const cancelBooking = async (req, res) => {
  const { bookingId } = req.params; // Extract from params
  console.log("Booking ID received:", bookingId);

  if (!bookingId) {
    return res.status(400).json({ error: "Booking ID is required." });
  }

  try {
    const booking = await knex("bookings").where({ id: bookingId }).first();

    if (!booking) {
      return res.status(404).json({ error: "Booking not found." });
    }

    // Deleting the booking from the database
    await knex("bookings").where({ id: bookingId }).del();

    // Optionally, delete the associated blocked dates if you need
    await knex("blocked_dates").where({ booking_id: bookingId }).del();

    // Send a cancellation confirmation email
    await sendCancellationEmail(booking);

    res.json({ message: "Booking canceled and deleted successfully!" });
  } catch (error) {
    console.error("Error canceling booking:", error);
    res.status(500).json({ error: "Failed to cancel and delete booking." });
  }
};

// Function to send cancellation confirmation email
const sendCancellationEmail = async (bookingDetails) => {
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
    subject: "Booking Canceled Successfully",
    text: `Dear ${patient_name},

Your booking with ID: ${bookingDetails.id} has been successfully canceled.

Here are the details of your canceled booking:
- Booking ID: ${bookingDetails.id}
- Dentist: ${dentist_name}
- Patient Name: ${patient_name}
- Email: ${email}
- Phone: ${phone}
- Date: ${formattedDate}
- Time: ${time}
- Address: ${address}

We apologize for any inconvenience this may have caused.

Thank you for choosing our service!

Best regards,
The DNH Dental Team`,
    html: `<p>Dear ${patient_name},</p>
    <p>Your booking with ID: <strong>${bookingDetails.id}</strong> has been successfully canceled.</p>
    <p>Here are the details of your canceled booking:</p>
    <ul>
      <li><strong>Booking ID:</strong> ${bookingDetails.id}</li>
      <li><strong>Dentist:</strong> ${dentist_name}</li>
      <li><strong>Patient Name:</strong> ${patient_name}</li>
      <li><strong>Email:</strong> ${email}</li>
      <li><strong>Phone:</strong> ${phone}</li>
      <li><strong>Date:</strong> ${formattedDate}</li>
      <li><strong>Time:</strong> ${time}</li>
      <li><strong>Address:</strong> ${address}</li>
    </ul>
    <p>We apologize for any inconvenience this may have caused.</p>
    <p>Thank you for choosing our service!</p>
    <p>Best regards,</p>
    <p>The DNH Dental Team</p>`,
  };

  await transporter.sendMail(mailOptions);
};

const addSlot = async (req, res) => {
  const { date, time } = req.body;

  try {
    const existingSlot = await knex("available_slots")
      .where({ date, time })
      .first();

    if (existingSlot) {
      return res.status(400).json({ error: "Slot already exists" });
    }

    await knex("available_slots").insert({ date, time, is_booked: false });
    res.json({ message: "Slot added successfully!" });
  } catch (error) {
    console.error("Error adding slot:", error);
    res.status(500).json({ error: "Failed to add slot" });
  }
};

module.exports = {
  getAvailableSlots,
  createBooking,
  getBookings,
  rescheduleBooking,
  addSlot,
  cancelBooking,
  getBlockedDates,
  getBookingDetails,
  unblockBlockedDates,
};
