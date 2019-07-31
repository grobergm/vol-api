const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
	name: { type: String, required: true },
	host:{ type: mongoose.Schema.Types.ObjectId, ref:"User" },
	tasks:[],
  volunteers:[]
});

module.exports = mongoose.model('Project', ProjectSchema);

