const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { read, write } = require("../utils/store");
const Joi = require("joi");
const mongoose = require("mongoose");
let UserModel = null;
try {
  UserModel = require("../models/User");
} catch {
  UserModel = null;
}

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const ADMIN_INVITE_CODE = process.env.ADMIN_INVITE_CODE || "";

function validateIntlPhone(value, helpers) {
  const raw = String(value || "");
  const v = raw.replace(/[^\d+]/g, "");
  const digits = v.startsWith("+") ? v.slice(1) : v;
  if (digits.length >= 6 && digits.length <= 20) return value;
  return helpers.error("any.invalid");
}

router.post("/register", async (req, res) => {
  try {
    const schema = Joi.object({
      name: Joi.string().min(2).max(100).required(),
      email: Joi.string()
        .email({ tlds: { allow: false } })
        .required(),
      password: Joi.string().min(6).required(),
      phone: Joi.string().allow("", null).custom(validateIntlPhone),
      address: Joi.string().allow("", null),
      city: Joi.string().allow("", null),
      adminCode: Joi.string().allow("", null),
    });
    const { error, value } = schema.validate(req.body || {});
    if (error) return res.status(400).json({ error: "Invalid input" });
    const { name, email, password, phone, adminCode, address, city } = value;
    const role =
      adminCode && ADMIN_INVITE_CODE && adminCode === ADMIN_INVITE_CODE
        ? "admin"
        : "user";

    if (UserModel && mongoose.connection.readyState === 1) {
      const dup = await UserModel.findOne({
        email: String(email).toLowerCase(),
      }).lean();
      if (dup)
        return res.status(409).json({ error: "Email already registered" });
      const doc = new UserModel({
        name,
        email,
        password,
        phone: phone || "",
        address: address || "",
        city: city || "",
        role,
      });
      const saved = await doc.save();
      const token = jwt.sign({ id: saved.id, role: saved.role }, JWT_SECRET, {
        expiresIn: "7d",
      });
      return res.json({
        token,
        user: {
          id: saved.id,
          name: saved.name,
          email: saved.email,
          role: saved.role,
          phone: saved.phone,
          address: saved.address,
          city: saved.city,
        },
      });
    } else {
      const users = read("users") || [];
      if (
        users.find((u) => u.email.toLowerCase() === String(email).toLowerCase())
      ) {
        return res.status(409).json({ error: "Email already registered" });
      }
      const hash = await bcrypt.hash(password, 10);
      const user = {
        id: Date.now(),
        name,
        email,
        phone: phone || "",
        address: address || "",
        city: city || "",
        password: hash,
        role,
        createdAt: new Date().toISOString(),
      };
      users.push(user);
      write("users", users);
      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
        expiresIn: "7d",
      });
      return res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          address: user.address,
          city: user.city,
        },
      });
    }
  } catch (e) {
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const schema = Joi.object({
      email: Joi.string()
        .email({ tlds: { allow: false } })
        .required(),
      password: Joi.string().required(),
    });
    const { error, value } = schema.validate(req.body || {});
    if (error) return res.status(400).json({ error: "Invalid credentials" });
    const { email, password } = value;

    if (UserModel && mongoose.connection.readyState === 1) {
      const found = await UserModel.findOne({
        email: String(email).toLowerCase(),
      }).lean();
      if (!found) return res.status(401).json({ error: "Invalid credentials" });
      const real = await UserModel.findById(found._id);
      const ok = await real.comparePassword(password);
      if (!ok) return res.status(401).json({ error: "Invalid credentials" });
      const token = jwt.sign({ id: real.id, role: real.role }, JWT_SECRET, {
        expiresIn: "7d",
      });
      return res.json({
        token,
        user: {
          id: real.id,
          name: real.name,
          email: real.email,
          role: real.role,
          phone: real.phone,
          address: real.address,
          city: real.city,
        },
      });
    } else {
      const users = read("users") || [];
      const user = users.find(
        (u) => u.email.toLowerCase() === String(email).toLowerCase()
      );
      if (!user) return res.status(401).json({ error: "Invalid credentials" });
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return res.status(401).json({ error: "Invalid credentials" });
      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
        expiresIn: "7d",
      });
      return res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          address: user.address,
          city: user.city,
        },
      });
    }
  } catch (e) {
    res.status(500).json({ error: "Login failed" });
  }
});

module.exports = router;
