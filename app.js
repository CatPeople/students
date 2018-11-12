
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


var Student = require('./models/student')
var User = require('./models/user')
var documentmodels = require('./models/document')

var conf = require('./config');


var app = express();
app.use((req, res, next) => {
  res.locals.filesize = require("filesize")
  next()
})
// Подключение к базе
app.use(fileUpload());
var dbURI = ""

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
    User.findOne({login: 'admin'}, function(err, user) {
      if (err) return console.log(err)
      if (!user) {
        var admin = new User({
          login: 'admin',
          password: 'admin',
          approved: true});
        admin.save(function(err) {
          if(err) console.log(err);
        })
      }
    })
});
db.on('reconnected', function () {
    console.log('reconnected');
});
db.on('disconnected', function() {
    console.log('disconnected');
    console.log('dbURI is: '+dbURI);
    mongoose.connect(dbURI, {auto_reconnect:true, keepAlive: 1, connectTimeoutMS: 30000, reconnectTries: Number.MAX_VALUE } );
  });
console.log('dbURI is: '+dbURI);
mongoose.connect(dbURI, {auto_reconnect:true, keepAlive: 1, connectTimeoutMS: 30000, reconnectTries: Number.MAX_VALUE } );


var j = schedule.scheduleJob('42 10 * * *', function(){
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
    secret: conf.sessionSecret,
    saveUninitialized: false,
    resave: true
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

var viewspath = path.join(__dirname, 'views')
var index = require('./routes/index');
var students = require('./routes/students')(viewspath);
var types = require('./routes/types');
var auth = require('./routes/auth');

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
  console.log(err.message)
  res.render('error');
});

module.exports = app;
