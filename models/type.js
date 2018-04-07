const mongoose   = require('mongoose')
var Schema = mongoose.Schema;



var TypeSchema = new Schema({
  name: {type: String, required: true, unique: true},
  fields: [String]
})

module.exports = mongoose.model('Type', TypeSchema)
