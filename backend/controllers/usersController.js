const mongoose = require('mongoose');
const UserModel = (() => { try { return require('../models/User') } catch (e) { return null } })();
const { read } = require('../utils/store');

async function getMe(req, res) {
  try {
    const id = req.user && req.user.id;
    if (UserModel && mongoose.connection.readyState === 1) {
      // try by ObjectId then legacyId
      let user = null;
      if (String(id || '').match(/^[0-9a-fA-F]{24}$/)) {
        user = await UserModel.findById(id).lean();
      }
      if (!user && !isNaN(Number(id))) {
        user = await UserModel.findOne({ legacyId: Number(id) }).lean();
      }
      if (!user) return res.status(404).json({ error: 'Not found' });
      const { password, __v, ...rest } = user;
      // normalize _id -> id for consistency with file-based users
      if (rest && rest._id) {
        rest.id = rest._id;
        delete rest._id;
      }
      return res.json(rest);
    }

    const users = read('users') || [];
    const found = users.find(u => String(u.id) === String(id));
    if (!found) return res.status(404).json({ error: 'Not found' });
    const { password, ...publicUser } = found;
    res.json(publicUser);
  } catch (e) {
    console.error('[users] getMe error', e && e.message ? e.message : e);
    res.status(500).json({ error: 'Failed' });
  }
}

async function listUsers(req, res) {
  try {
    if (UserModel && mongoose.connection.readyState === 1) {
      const docs = await UserModel.find().select('-password -__v').lean();
      const normalized = docs.map(d => {
        if (d && d._id) {
          d.id = d._id;
          delete d._id;
        }
        return d;
      });
      return res.json(normalized);
    }
    const users = read('users') || [];
    const publicUsers = users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt }));
    res.json(publicUsers);
  } catch (e) {
    console.error('[users] list error', e && e.message ? e.message : e);
    res.status(500).json({ error: 'Failed' });
  }
}

module.exports = { getMe, listUsers };