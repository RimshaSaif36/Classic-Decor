const express = require("express");
const { read, write } = require("../utils/store");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

let SettingModel = null;
try {
  SettingModel = require("../models/Setting");
} catch (e) {
  SettingModel = null;
}

const DEFAULT_ANNOUNCEMENT = {
  enabled: true,
  text: "🎉 Free Delivery Nationwide on orders over PKR 3,000! Limited Time Offer",
  link: "/shop",
  bgColor: "#1a1a1a",
  textColor: "#ffffff",
  // whether the announcement text should scroll (marquee) on the frontend
  scroll: false,
};

// GET /api/settings/announcement (Public)
router.get("/announcement", async (req, res) => {
  try {
    if (SettingModel && req.app.locals.dbConnected) {
      const doc = await SettingModel.findOne({ key: "announcement" }).lean();
      if (doc && doc.value) {
        return res.json({
          ...DEFAULT_ANNOUNCEMENT,
          ...doc.value,
        });
      }
    }

    // Fallback to json store
    try {
      const settings = read("settings");
      if (settings && typeof settings === "object" && !Array.isArray(settings) && settings.announcement) {
        return res.json({
          ...DEFAULT_ANNOUNCEMENT,
          ...settings.announcement,
        });
      } else if (Array.isArray(settings)) {
        const item = settings.find((s) => s && s.key === "announcement");
        if (item && item.value) {
          return res.json({
            ...DEFAULT_ANNOUNCEMENT,
            ...item.value,
          });
        }
      }
    } catch {
      // ignore
    }

    return res.json(DEFAULT_ANNOUNCEMENT);
  } catch (err) {
    console.error("[settings] error fetching announcement:", err);
    return res.json(DEFAULT_ANNOUNCEMENT);
  }
});

// PUT /api/settings/announcement (Admin only)
router.put("/announcement", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { enabled, text, link, bgColor, textColor, scroll } = req.body || {};

    const parseBool = (v) => {
      if (typeof v === 'boolean') return v;
      if (typeof v === 'string') return v === 'true' || v === '1';
      return Boolean(v);
    };

    const announcementData = {
      enabled: enabled !== undefined ? parseBool(enabled) : true,
      text: typeof text === "string" ? text.trim() : "",
      link: typeof link === "string" ? link.trim() : "",
      bgColor: typeof bgColor === "string" && bgColor.trim() ? bgColor.trim() : "#1a1a1a",
      textColor: typeof textColor === "string" && textColor.trim() ? textColor.trim() : "#ffffff",
      scroll: scroll !== undefined ? parseBool(scroll) : false,
    };

    // Save to DB if connected
    if (SettingModel && req.app.locals.dbConnected) {
      await SettingModel.findOneAndUpdate(
        { key: "announcement" },
        { key: "announcement", value: announcementData, updatedAt: new Date() },
        { upsert: true, new: true }
      );
    }

    // Also persist to JSON file as fallback
    try {
      let currentSettings = {};
      try {
        const raw = read("settings");
        if (raw && typeof raw === "object" && !Array.isArray(raw)) {
          currentSettings = raw;
        }
      } catch {
        currentSettings = {};
      }
      currentSettings.announcement = announcementData;
      write("settings", currentSettings);
    } catch (e) {
      console.error("[settings] file write error:", e);
    }

    return res.json({
      success: true,
      announcement: announcementData,
    });
  } catch (err) {
    console.error("[settings] update announcement error:", err);
    return res.status(500).json({ error: "Failed to update announcement settings" });
  }
});

module.exports = router;
