const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  legacyId: { type: Number, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  phone: { type: String, default: '' },
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

// Lowercase email and hash password when saving
UserSchema.pre('save', async function (next) {
  if (this.email) this.email = String(this.email).toLowerCase();
  if (this.isModified('password')) {
    try {
      const hash = await bcrypt.hash(this.password, 10);
      this.password = hash;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// Hash and normalize documents when using insertMany (seeding)
UserSchema.pre('insertMany', async function (next, docs) {
  if (!Array.isArray(docs)) return next();
  try {
    await Promise.all(docs.map(async (doc) => {
      if (doc && doc.password && !String(doc.password).startsWith('$2a$')) {
        doc.password = await bcrypt.hash(doc.password, 10);
      }
      if (doc && doc.email) doc.email = String(doc.email).toLowerCase();
    }));
    next();
  } catch (err) {
    next(err);
  }
});

// Helper to compare plaintext password with stored hash
UserSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Clean up JSON output: expose `id`, remove `_id`, `__v` and `password`
UserSchema.set('toJSON', {
  virtuals: true,
  transform(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    return ret;
  }
});

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
