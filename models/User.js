const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
	name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  hash: { type: String, required: true },
  friends:[{ type: mongoose.Schema.Types.ObjectId, ref:"User" }],
  projects:[{ type: mongoose.Schema.Types.ObjectId, ref:"Project" }],
});

module.exports = mongoose.model('User', UserSchema);