const mongoose = require("mongoose");
const topicSchema = require("./topicSchema").schema;

const courseContentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  topics: [topicSchema]
});

module.exports = mongoose.model("CourseContent", courseContentSchema);
