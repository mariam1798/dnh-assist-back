require("dotenv").config();

const configuration = require("../knexfile");
const knex = require("knex")(configuration);

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
  const { name, email, phone, date, time } = req.body;

  try {
    const existingBooking = await knex("bookings")
      .where({ date, time })
      .first();

    if (existingBooking) {
      return res.status(400).json({ error: "Slot is already booked" });
    }

    await knex("bookings").insert({
      dentist_name: name,
      email,
      phone,
      date,
      time,
      payment_status: "Pending",
    });

    console.log("Booking created successfully!");
    res.status(200).json({ message: "Booking confirmed!" });
  } catch (error) {
    console.error("Error in createBooking:", error);
    res
      .status(500)
      .json({ error: "An unexpected error occurred during booking." });
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

const rescheduleBooking = async (req, res) => {
  const { bookingId, newDate, newTime } = req.body;

  try {
    const slot = await knex("available_slots")
      .where({ date: newDate, time: newTime, is_booked: false })
      .first();

    if (!slot) {
      return res
        .status(400)
        .json({ error: "The new slot is already booked or unavailable." });
    }

    const booking = await knex("bookings").where({ id: bookingId }).first();

    if (!booking) {
      return res.status(404).json({ error: "Booking not found." });
    }

    await knex("available_slots")
      .where({ date: booking.date, time: booking.time })
      .update({ is_booked: false });

    await knex("available_slots")
      .where({ id: slot.id })
      .update({ is_booked: true });

    await knex("bookings")
      .where({ id: bookingId })
      .update({ date: newDate, time: newTime, status: "Rescheduled" });

    res.json({ message: "Booking rescheduled successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to reschedule booking" });
  }
};

const cancelBooking = async (req, res) => {
  const { bookingId } = req.body;

  try {
    const booking = await knex("bookings").where({ id: bookingId }).first();

    if (!booking) {
      return res.status(404).json({ error: "Booking not found." });
    }

    await knex("available_slots")
      .where({ date: booking.date, time: booking.time })
      .update({ is_booked: false });

    await knex("bookings")
      .where({ id: bookingId })
      .update({ status: "Canceled" });

    res.json({ message: "Booking canceled successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to cancel booking" });
  }
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
};
