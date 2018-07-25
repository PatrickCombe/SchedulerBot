var mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI)

var taskSchema = mongoose.Schema({
  subject: {
    type: String,
  required: true},
  day: {
    type: String,
  required: true},
  googleCalEventID: String,
  reqID: String
});

var meetingSchema = mongoose.Schema({
  day: {
    type: String,
    required: true
  },
  time:{
    type: String,
    required: true
  },
  invitees: {
    type: String,
    required: true
  },
  subject: {
    type: String
  },
  location: {
    type: String
  },
  mtngLength: {
    type: String
  },
  status: String,
  createdAt: Date,
  requesterId: String
});

var userSchema = mongoose.Schema({
  google: {
    accessToken: String,
    refreshToken: String,
    profileId: String
  },
  slackId: String,
  slackUsername: String,
  slackEmail: String,
  slackDmId:String
})

var inviteSchema = mongoose.Schema({
  eventId: String,
  inviteeId: String,
  requesterId: String,
  status:String
})

var Task = mongoose.model('Task', taskSchema)
var Meeting = mongoose.model('Meeting', meetingSchema);
var Invite = mongoose.model('Invite', inviteSchema);
var User = mongoose.model('User', userSchema);

module.exports = {
  Task: Task,
  Meeting: Meeting,
  Invite: Invite,
  User: User
};
