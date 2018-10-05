const mongoose   = require('mongoose')
var Schema = mongoose.Schema;



var ServerInfoSchema = new Schema({
  name: {type: String, required: true, unique: true},
  valueString: String,
  valueNumber: Number
})

module.exports = mongoose.model('ServerInfo', ServerInfoSchema)
