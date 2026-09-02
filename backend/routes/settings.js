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
  // new: support multiple messages (array). Keep `text` for backward compatibility.
  messages: ["🎉 Free Delivery Nationwide on orders over PKR 3,000! Limited Time Offer"],
  link: "/shop",
  bgColor: "#1a1a1a",
  textColor: "#ffffff",
  // whether the announcement text should scroll (marquee) on the frontend
  scroll: false,
};

const DEFAULT_HERO = {
  image: '',
  heading: 'Bring Art & Elegance to Every Corner',
  subtitle: 'Modern. Elegant. Handcrafted for your space.',
};

// GET /api/settings/hero (Public)
router.get('/hero', async (req, res) => {
  try {
    if (SettingModel && req.app.locals.dbConnected) {
      const doc = await SettingModel.findOne({ key: 'hero' }).lean();
      if (doc && doc.value) {
        return res.json({ ...DEFAULT_HERO, ...doc.value });
      }
    }

    try {
      const settings = read('settings');
      if (settings && typeof settings === 'object' && !Array.isArray(settings) && settings.hero) {
        return res.json({ ...DEFAULT_HERO, ...settings.hero });
      } else if (Array.isArray(settings)) {
        const item = settings.find((s) => s && s.key === 'hero');
        if (item && item.value) {
          return res.json({ ...DEFAULT_HERO, ...item.value });
        }
      }
    } catch {
      // ignore
    }

    return res.json(DEFAULT_HERO);
  } catch (err) {
    console.error('[settings] error fetching hero:', err);
    return res.json(DEFAULT_HERO);
  }
});

// PUT /api/settings/hero (Admin only)
router.put('/hero', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { image, heading, subtitle } = req.body || {};

    const heroData = {
      image: typeof image === 'string' ? image.trim() : '',
      heading: typeof heading === 'string' ? heading.trim() : DEFAULT_HERO.heading,
      subtitle: typeof subtitle === 'string' ? subtitle.trim() : DEFAULT_HERO.subtitle,
    };

    if (SettingModel && req.app.locals.dbConnected) {
      await SettingModel.findOneAndUpdate(
        { key: 'hero' },
        { key: 'hero', value: heroData, updatedAt: new Date() },
        { upsert: true, new: true }
      );
    }

    try {
      let currentSettings = {};
      try {
        const raw = read('settings');
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
          currentSettings = raw;
        }
      } catch {
        currentSettings = {};
      }
      currentSettings.hero = heroData;
      write('settings', currentSettings);
    } catch (e) {
      console.error('[settings] file write error (hero):', e);
    }

    return res.json({ success: true, hero: heroData });
  } catch (err) {
    console.error('[settings] update hero error:', err);
    return res.status(500).json({ error: 'Failed to update hero settings' });
  }
});

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
    const { enabled, text, messages, link, bgColor, textColor, scroll } = req.body || {};

    const parseBool = (v) => {
      if (typeof v === 'boolean') return v;
      if (typeof v === 'string') return v === 'true' || v === '1';
      return Boolean(v);
    };

    // Normalize messages: prefer `messages` array; fall back to `text` string
    let normalizedMessages = [];
    if (Array.isArray(messages)) {
      normalizedMessages = messages.map((m) => (typeof m === 'string' ? m.trim() : '')).filter(Boolean);
    } else if (typeof messages === 'string' && messages.trim()) {
      // allow newline separated input
      normalizedMessages = messages.split(/\r?\n/).map((m) => m.trim()).filter(Boolean);
    } else if (typeof text === 'string' && text.trim()) {
      normalizedMessages = [text.trim()];
    }

    const announcementData = {
      enabled: enabled !== undefined ? parseBool(enabled) : true,
      text: normalizedMessages.length > 0 ? normalizedMessages[0] : (typeof text === 'string' ? text.trim() : ''),
      messages: normalizedMessages,
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
