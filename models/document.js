const mongoose   = require('mongoose')
var Schema = mongoose.Schema;

var PairSchema = new Schema({
  field: String,
  value: String
})

var DocumentSchema = new Schema({
  type: String,
  content: [PairSchema],
  files: [String]
})

DocumentSchema.virtual('names').get(function () {
  var names = [];
  this.content.forEach(function (pair) {
    names.push(pair.field);
  })
  return names;
});

module.exports = mongoose.model('Document', DocumentSchema)
