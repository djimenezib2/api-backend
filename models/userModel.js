const mongoose = require('mongoose');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
  },
  email: {
    type: String,
    required: [true, 'Please provide an email address'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email address'],
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
  },
  role: {
    type: String,
    required: [true, 'Please provide a role'],
    enum: {
      values: ['user', 'admin', 'superadmin'],
    },
    default: 'user',
  },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
