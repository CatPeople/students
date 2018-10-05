const mongoose   = require('mongoose')
var Schema = mongoose.Schema;



var RatingSchema = new Schema({
  scope: { type: Schema.Types.ObjectId, ref: 'Scope' },
  actualrating: Number
})

module.exports = mongoose.model('Rating', RatingSchema)
