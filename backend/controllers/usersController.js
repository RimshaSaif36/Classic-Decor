const mongoose = require('mongoose');
const UserModel = (() => { try { return require('../models/User') } catch (e) { return null } })();
const { read } = require('../utils/store');
const Joi = require('joi');

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

async function updateMe(req, res) {
  try {
    const schema = Joi.object({
      phone: Joi.string().allow('', null),
      address: Joi.string().allow('', null),
      city: Joi.string().allow('', null),
      name: Joi.string().min(2).max(100).allow('', null)
    });
    const { error, value } = schema.validate(req.body || {});
    if (error) return res.status(400).json({ error: 'Invalid input' });
    const id = req.user && req.user.id;
    if (UserModel && mongoose.connection.readyState === 1) {
      let updated = null;
      if (String(id || '').match(/^[0-9a-fA-F]{24}$/)) {
        updated = await UserModel.findByIdAndUpdate(id, value, { new: true }).lean();
      } else if (!isNaN(Number(id))) {
        updated = await UserModel.findOneAndUpdate({ legacyId: Number(id) }, value, { new: true }).lean();
      }
      if (!updated) return res.status(404).json({ error: 'Not found' });
      const { password, __v, ...rest } = updated;
      if (rest && rest._id) { rest.id = rest._id; delete rest._id; }
      return res.json(rest);
    }
    const users = read('users') || [];
    const idx = users.findIndex(u => String(u.id) === String(id));
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    users[idx] = { ...users[idx], ...value };
    require('../utils/store').write('users', users);
    const { password, ...publicUser } = users[idx];
    res.json(publicUser);
  } catch (e) {
    console.error('[users] updateMe error', e && e.message ? e.message : e);
    res.status(500).json({ error: 'Failed' });
  }
}

module.exports = { getMe, listUsers, updateMe };
