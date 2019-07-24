const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
	name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  hash: { type: String, required: true },
  skills:{ type: Array },
  impacts:{ type: Array },
  friends:[{ type: mongoose.Schema.Types.ObjectId, ref:"User" }],
  projects:[{ type: mongoose.Schema.Types.ObjectId, ref:"Projects" }],
});

module.exports = mongoose.model('User', UserSchema);