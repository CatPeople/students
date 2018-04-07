// Модули
var express = require('express');
var mongoose = require('mongoose');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var session = require('express-session')
const MongoStore = require('connect-mongo')(session);
var bcrypt = require('bcrypt');

var randomstring = require("randomstring");
var faker = require('faker');
const fileUpload = require('express-fileupload');
var async = require("async");
var schedule = require('node-schedule');
var index = require('./routes/index');
var students = require('./routes/students');
var types = require('./routes/types');
var auth = require('./routes/auth');

var Student = require('./models/student')
var User = require('./models/user')
var Document = require('./models/document')

var app = express();
// Подключение к базе
app.use(fileUpload());
var dbURI = "mongodb://alexandra:password@ds117158.mlab.com:17158/hogwarts"

var db = mongoose.connection;
db.on('connecting', function() {
    console.log('connecting');
});

db.on('error', function(error) {
    console.error('Error in MongoDb connection: ' + error);
    mongoose.disconnect();
});
db.on('connected', function() {
    console.log('connected!');
});
db.once('open', function() {
    console.log('connection open');
});
db.on('reconnected', function () {
    console.log('reconnected');
});
db.on('disconnected', function() {
    console.log('disconnected');
    console.log('dbURI is: '+dbURI);
    mongoose.connect(dbURI, {auto_reconnect:true, keepAlive: 1, connectTimeoutMS: 30000 } );
  });
console.log('dbURI is: '+dbURI);
mongoose.connect(dbURI, {auto_reconnect:true});

// Скрипт, выпускающий студентов 1 августа
var j = schedule.scheduleJob('42 10 1 8 *', function(){
  Student.find()
  .exec(function(err, students) {
    async.eachSeries(students, function updateObject (obj, done) {
      if (obj.year == 'Выпустился')
      Student.update({ _id: obj._id }, { $set : { graduated: true }}, done);
      else done()
    }, function allDone (err) {
        console.log('all done')
    });
  })

});



// Сессии
app.use(session({
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
    secret: "xkMfKzDWJh",
    saveUninitialized: false,
    resave: true
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/student', students);
app.use('/types', types);
app.use('/auth', auth);

const fs = require('fs');





// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
