const mongoose   = require('mongoose')
var mongoosePaginate = require('mongoose-paginate');

var StudentSchema = new mongoose.Schema({

  name: {
    firstName: String,
    lastName: String,
    patronymic: String
  },
  group: {
    name: String,
    degree: String,
    year: Number
  },
  documents: [{type: mongoose.Schema.Types.ObjectId, ref: 'Document'}],
  ratings: [{type: mongoose.Schema.Types.ObjectId, ref: 'Rating'}],
  graduationDay: Date
})
StudentSchema.plugin(mongoosePaginate);
StudentSchema.virtual('fullName').get(function () {
  return this.name.lastName + ' ' + this.name.firstName + ' ' + this.name.patronymic;
});

StudentSchema.virtual('degree').get(function () {
  switch(this.group.name.charAt(2)) {
    case 'С':
      return 'Специалитет';
      break;
    case 'Б':
      return 'Бакалавриат'
      break;
    case 'М':
      return 'Магистратура'
      break;
    default:
      return 'Неизвестно'
      break;
  }
});

StudentSchema.virtual('year').get(function () {
  var currentyear = new Date().getFullYear().toString().substr(-1);
  var currentmonth = new Date().getMonth();
  var genesisyear = this.group.name.charAt(4);
  var yearofstudying = parseInt(currentyear)-parseInt(genesisyear);
  if (yearofstudying < 0) {yearofstudying+=10}
  if (currentmonth >= 7) {yearofstudying++}
    if (new Date() > this.graduationDay) {
      return 'Выпустился'
    }
    switch(this.group.name.charAt(2)) {
      case 'С':
        if (yearofstudying>6)
        {
          return 'Выпустился'}
        break;
      case 'Б':
        if (yearofstudying>4)
        {
          return 'Выпустился'}
        break;
      case 'М':
        if (yearofstudying>2)
        {
          return 'Выпустился'}
        break;
    }
    if (yearofstudying == 0) {
      return 'Выпустился'
    }
  return yearofstudying.toString();
});

StudentSchema.virtual('url').get(function () {
  return '/student/'+this._id
});


StudentSchema.pre('save', function(next) {
  var currentyear = new Date().getFullYear().toString().substr(-1);
  var currentmonth = new Date().getMonth();
  var genesisyear = this.group.name.charAt(4);
  var yearofstudying = parseInt(currentyear)-parseInt(genesisyear);
  if (yearofstudying < 0) {yearofstudying+=10}
  if (currentmonth >= 7) {yearofstudying++}
  if (!this.graduationDay) {
      var ayear = new Date().getFullYear();
      switch(this.group.name.charAt(2)) {
          case 'С':
            this.graduationDay = new Date(ayear+7-yearofstudying, 7, 1)
            break;
          case 'Б':
            this.graduationDay = new Date(ayear+5-yearofstudying, 7, 1)
            break;
          case 'М':
            this.graduationDay = new Date(ayear+3-yearofstudying, 7, 1)
            break;
        }
        if (this.year == 'Выпустился') {
            this.graduationDay = new Date(0);
        }
    }
    else {
      this.graduationDay = new Date(0);
    }
  next();
});

module.exports = mongoose.model('Student', StudentSchema)
