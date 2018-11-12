const mongoose   = require('mongoose')
var Schema = mongoose.Schema;



var UserSchema = new Schema({
  login: {type: String, required: true, unique: true},
  password: {type: String, required: true},
  stud: {type: String},
  message: {type: String},
  approved: {type: Boolean},
  passwordResetToken: {type: String},
  passwordResetExpiration: {type: Date}
})

module.exports = mongoose.model('User', UserSchema)
