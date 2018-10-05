const mongoose   = require('mongoose')
var Schema = mongoose.Schema;



var FileSchema = new Schema({
  id: String,
  name: String,
  url: String,
  size: Number
})

module.exports = mongoose.model('File', FileSchema)
