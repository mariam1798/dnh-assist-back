const bcrypt = require("bcrypt");

require("dotenv").config();
const path = require("path");

const configuration = require("../knexfile");
const knex = require("knex")(configuration);

const multer = require("multer");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    let ext = path.extname(file.originalname).toLowerCase();
    let filename = path.basename(file.originalname, ext).toLowerCase();

    if (ext !== ".jpg" && ext !== ".jpeg" && ext !== ".png") {
      cb(
        new Error(
          "File type is not supported or filename does not start with 'Photo'"
        ),
        false
      );
    } else {
      cb(null, true);
    }
  },
});

const jwt = require("jsonwebtoken");
const registerUser = async (req, res) => {
  const { name, email, password, role, overview } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const hashedPassword = bcrypt.hashSync(password, 6);

  let avatarUrl = req.file
    ? `/uploads/${req.file.filename}`
    : "/uploads/default-avatar.png";

  const newUser = {
    name,
    email,
    password: hashedPassword,
    role,
    overview,
    avatar: avatarUrl,
  };

  try {
    await knex("users").insert(newUser);
    return res.status(201).json(newUser);
  } catch (error) {
    console.error("Error inserting user:", error);
    return res.status(500).json({ error: "Failed to register user" });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(401).json({ error: "please fill in required fields" });
  }
  try {
    const user = await knex("users").where({ email: email }).first();
    if (!user) {
      return res.status(400).json({ error: "user not found" });
    }
    const passwordCorrect = bcrypt.compareSync(password, user.password);
    if (!passwordCorrect) {
      return res.status(400).json({ error: "incorrect password" });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );
    res.status(200).json({ token });
  } catch (error) {
    return res.status(400).json({ error: "Failed login" });
  }
};
const getUser = async (req, res) => {
  if (!req.headers.authorization) {
    return res.status(401).send({ error: "Please login" });
  }
  const authToken = req.headers.authorization.split(" ")[1];
  if (!authToken || !process.env.JWT_SECRET) {
    return res.status(401).json({ error: "Auth token or secret is missing" });
  }
  try {
    const verified = jwt.verify(authToken, process.env.JWT_SECRET);
    const userId = verified.id;

    const user = await knex("users").where({ id: userId }).first();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    return res.status(401).json({ error: "Invalid auth token" });
  }
};

const getUserBookings = async (req, res) => {
  const userId = req.params.userId;
  try {
    const users = await knex("bookings").where("bookings.user_id", userId);
    if (!users) {
      return res
        .status(404)
        .json({ message: `Could not find item with ID: ${userId}` });
    }
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to bookings" });
  }
};
const getUserDetails = async (req, res) => {
  const userId = req.params.userId;
  try {
    const users = await knex("users").where("users.id", userId).first();
    if (!users) {
      return res
        .status(404)
        .json({ message: `Could not find item with ID: ${userId}` });
    }
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
};
const getUsers = async (req, res) => {
  try {
    const users = await knex("users");
    if (!users) {
      return res.status(404).json({ message: `Could not find users` });
    }
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};
module.exports = {
  registerUser,
  loginUser,
  getUser,
  getUserBookings,
  getUserDetails,
  getUsers,
  upload,
};
