const mongoose   = require('mongoose')
var File = require('./file')
var ServerInfo = require('./serverinfo')
var async = require("async");
var gd = require('../googledrive');
var Schema = mongoose.Schema;

var PairSchema = new Schema({
  field: String,
  value: String
})

var DocumentSchema = new Schema({
  type: String,
  scope: { type: Schema.Types.ObjectId, ref: 'Scope' },
  rating: Number,
  content: [PairSchema],
  files: [{ type: Schema.Types.ObjectId, ref: 'File' }]
})

var ScopeSchema = new Schema({
  name: {type: String, required: true, unique: true}
})




DocumentSchema.virtual('names').get(function () {
  var names = [];
  this.content.forEach(function (pair) {
    names.push(pair.field);
  })
  return names;
});

DocumentSchema.virtual('ruPluralize').get(function () {
  var number = this.rating;
  number = number % 100;
  if (Math.floor(number / 10) == 1) {return 'ов'}
  number = number % 10;
  if (number == 0) {return 'ов'}
  if (number == 1) {return ''}
  if (number >= 2 && number <= 4) {return 'а'}
  if (number >= 5) {return "ов"}
});

DocumentSchema.pre('remove', function(next) {
  async.each(this.files, function(file, cb) {
    File.findByIdAndRemove(file, function(err, file_removed) {
      if (err) {cb(); return console.log(err);}
      gd.jwtClient().authorize(function (err, tokens) {
       if (err) {
         console.log(err);
         cb()
         return;
       } else {
         let drive = gd.google().drive('v3');
         drive.files.delete({
            auth: gd.jwtClient(),
            fileId: file_removed.id
         }, function (err, response) {
            if (err) {
                console.log('The API returned an error: ' + err);
                cb();
                return res.send({error: err, status: 'failure'})
            }
            ServerInfo.findOneAndUpdate({'name': 'driveUsageEstimate'}, { $inc: {valueNumber: -parseInt(file_removed.size)}}, {upsert: true}, function(err) {if(err) console.log(err); cb();})

         });
       }
      })
    })
  }, function(err) {
    if (err) console.log(err);
    next()
  })
})

module.exports = {
  Scope: mongoose.model('Scope', ScopeSchema),
  Document: module.exports = mongoose.model('Document', DocumentSchema)
}
