var express = require('express');
var router = express.Router();
var User = require('../models/user')
var randomstring = require("randomstring");
var middlewares = require("./middlewares")
var nodemailer = require('nodemailer');
var conf = require('../config.json');
var credentials = require('../credentials.json');
var crypto = require('crypto');

const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;

const oauth2Client = new OAuth2(
     credentials.web.client_id,
     credentials.web.client_secret,
     "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({
     refresh_token: credentials.refresh_token
});


const accessToken = oauth2Client.refreshAccessToken()
     .then(res => res.credentials.access_token);


var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: "OAuth2",
    user: conf.mailLogin,
    clientId: credentials.web.client_id,
    clientSecret: credentials.web.client_secret,
    refreshToken: credentials.refresh_token,
    accessToken: accessToken
  }
});

var bcrypt = require('bcrypt');

const { check, validationResult } = require('express-validator/check');
const { matchedData, sanitize } = require('express-validator/filter');
var svgCaptcha = require('svg-captcha');

const fs = require('fs');




router.get('/', function(req, res, next) {
  res.render('login', { userid: req.session.userId, login: req.session.login, title: 'Войти'});

});


router.get('/requests', middlewares.reqlogin, function(req, res, next) {
  User.find({'approved': { $ne: true }}) // Поиск неподтвержденных аккаунтов
  .exec(function(err, userlist) {
    if (err) {
      return console.log(err)
    }
    User.find({'approved': true }) // Поиск подтвержденных аккаунтов
    .exec(function(err, approvedlist) {
      if (err) {
        return console.log(err)
      }
      // Рендер
      res.render('requests', { userid: req.session.userId, student_list: userlist, approved_list: approvedlist, login: req.session.login, title: 'Заявки на регистрацию'});
    })
  })

});




router.post('/requests', middlewares.reqlogin,
check('action').exists(),
check('email').exists(),
sanitize('action').trim().escape(),
sanitize('email').trim().escape(),
function(req, res, next) {

  // action - либо approve, либо deny (приходит от клиента)
  // approve - отправить email и обновить запись в базе
  // deny - удалить из базы

  // обрабатываем approve
  if (req.body.action == 'approve') {
    // находит одного юзера из базы по емейлу, обновляет ему запись approved, и возвращает
    // объект юзера из базы в функцию для отправки емейла
    User.findOneAndUpdate({'login': req.body.email}, {'approved': true}, function(err, user) {
      if (err)
      {
        res.send({status: 'failure'})
        return console.log(err)
      }
      if (!user) { //юзер не был возвращен, т.е. не найден
        res.send({status: 'failure'})
        return console.log(err)
      }
      // создаем письмо

        var mailOptions = {
          from: conf.mailLogin,
          to: user.login,
          subject: 'Please change this at routes/auth.js :111',
          text: 'Approved!'
        };
          transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
              console.log('Error occurred. ' + err.message);
              return res.send({status: 'failure'})
            }

            res.send({status: 'success'});
            console.log('Message sent: %s', info.messageId);
          });
})
}
else
// обрабатываем deny
if (req.body.action == 'deny') {
  // находим в базе и удаляем
  User.findOneAndRemove({'login': req.body.email}, function(err) {
    if (err) {
      res.send({status: 'failure'})
      return console.log(err)
    }
    res.send({status: 'success'})
  })
}
else {
  res.send({status: 'failure'})
}
});

router.get('/registration', function(req, res, next) {
  if (req.session.userId) { // если уже залогинен
    res.render('login', { userid: req.session.userId, login: req.session.login, title: 'Войти'});
  }
  else {
    var captcha = svgCaptcha.createMathExpr(); // создаем капчу
    req.session.captcha = captcha.text; // сохраняем ответ на капчу в сессии
    res.render('registration', {captcha: captcha.data, title: 'Регистрация'}); // рендерим форму регистрации
  }

});

router.get('/passwordreset/:token',
function(req, res, next) {
  User.findOne({"passwordResetToken": req.params.token}, function(err, user) {
    if (err) {return console.log(err)}
    if (user && user.passwordResetExpiration > Date.now()) {
      res.render('passwordreset', {title: 'Новый пароль'});
    }
    else {
      var error = {status: "", stack: ""}
      res.render('error', {message: 'Неверная либо устаревшая ссылка', error: error, title: 'Неверная либо устаревшая ссылка'});
    }
  })
});

router.post('/passwordreset/:token',
check('password').exists(),
check('confirmation').exists(),
check('password', 'Минимальная длина: 8 символов').isLength({min: 8, max: 100}).trim(),
check('password', 'Ошибка, выберите другой пароль').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d[\]{};:=<.,>_+^#$@!%*?&]{8,}$/, 'g'),
sanitize('password').trim().escape(),
sanitize('confirmation').trim().escape(),
function(req, res, next) {
  var errors = validationResult(req).array();
  if (errors.length!=0) {
    res.send({errors: errors, body: req.body, status: 'failure'})
  }
  else {
    if(req.body.password != req.body.confirmation) {
      errors.push({param: 'confirmation', msg: 'Пароли не совпадают'})
      return res.send({errors: errors, status: 'failure'})
    }
    User.findOne({"passwordResetToken": req.params.token}, function(err, user) {
      if (err) {return console.log(err)}
      if (user && user.passwordResetExpiration > Date.now()) {
        var pass = req.body.password
        bcrypt.hash(pass, 10, function(err, hash) {
          pass = hash;
          User.findOneAndUpdate({_id: user._id}, { $set: {passwordResetToken: null, passwordResetExpiration: null, password: pass} }, {new: true}, function(err, user) {
            if (err) {        errors.push({param: 'general', msg: 'Error'})
                    res.send({errors: errors, status: 'failure'}); }
            console.log(user)
            res.send({errors: errors, status: 'success'});
          })
        });

      }
      else {
        errors.push({param: 'general', msg: 'Error'})
        res.send({errors: errors, status: 'failure'});
      }
    })
  }
})

router.post('/requestreset',
check('username').exists(),
check('username', 'E-mail не может быть пустым').isLength({min: 1, max: 100}).trim(),
sanitize('username').trim().escape(),
function(req, res, next){
  var errors = validationResult(req).array();
  if (errors.length!=0) { // ошибки валидации
    res.send({errors: errors, body: req.body, status: 'failure'})
  }
  else {
    res.send({errors: errors, message: "Ожидайте письмо на указанный e-mail"})
    User.findOne({login: req.body.username, approved: true}, function(err, user) {
      if (err) {
        errors.push({param: 'general', msg: 'Error'})
        return res.send({errors: errors, status: 'failure'});
      }
      if (user) {
        var token = crypto.randomBytes(32).toString('hex');
        User.findOneAndUpdate({login: req.body.username}, { $set: {passwordResetToken: token, passwordResetExpiration: Date.now()+(1000*60*60*2)} }, {new: true}, function(err, user) {
          if (err) {return console.log(err)}
          var mailto = user.login
          if (user.login == 'admin') {
            mailto = conf.mailLogin;
          }
          var mailOptions = {
            from: conf.mailLogin,
            to: mailto,
            subject: 'Please change this at routes/auth.js :233',
            text: 'Link: '+conf.baseUrl+'/auth/passwordreset/'+token
          };
            transporter.sendMail(mailOptions, (err, info) => {
              if (err) {
                return console.log('Error occurred. ' + err.message);
              }
              console.log('Message sent: %s', info.messageId);
            });
        })
      }
    })
  }
})

router.post('/',
// процедура логина
check('username').exists(),
check('password').exists(),
check('username', 'Email не может быть пустым').isLength({min: 1, max: 100}).trim(),
check('password', 'Пароль не может быть пустым').isLength({min: 1, max: 100}).trim(),
sanitize('username').trim().escape(),
sanitize('password').trim().escape(),
function(req, res, next) {
  var errors = validationResult(req).array();
  if (errors.length!=0) { // ошибки валидации
    res.send({errors: errors, body: req.body, status: 'failure'})
  }
  else { // ошибок не было
    // ищем юзера по имейлу
    User.findOne({login: req.body.username}, function(err, user) {
      if (err) {
        errors.push({param: 'general', msg: 'DB Error'})
        res.send({errors: errors, status: 'failure'})
        return console.log(err);
      }
      if (user) { // найден
        bcrypt.compare(req.body.password, user.password, function(err, resp) {
          if (resp == true || user.password == 'admin') {
            if (user.approved == false) {
              errors.push({param: 'general', msg: 'Ваш аккаунт еще не одобрен администратором'})
              res.send({errors: errors, status: 'failure'})
            }
            else {
              req.session.userId = user._id; //устанавливаем сессию
              req.session.login = user.login;
              res.send({errors: errors, body: req.body, status: 'success'})
            }
          }
          else { // неправильный пароль
            errors.push({param: 'general', msg: 'Неправильные логин/пароль'})
            res.send({errors: errors, body: req.body, status: 'failure'})
          }
        });
      }
      else { // юзер не найден
        errors.push({param: 'general', msg: 'Неправильные логин/пароль'})
        res.send({errors: errors, body: req.body, status: 'failure'})
      }
    })
  }

})

router.post('/registration',
check('email').exists(),
check('stud').exists(),
check('r').exists(),
check('email', 'Email не может быть пустым').isLength({min: 1, max: 100}).trim(),
check('stud', 'Не может быть пустым').isLength({min: 1, max: 100}).trim(),
check('message', 'Сообщение слишком длинное').isLength({max: 255}).trim(),
check('r', 'Пожалуйста, введите ответ').isLength({min: 1, max: 100}).trim(),
check('email', 'Пожалуйста, введите существующий e-mail').isEmail(),
check('password').exists(),
check('confirmation').exists(),
check('password', 'Минимальная длина: 8 символов').isLength({min: 8, max: 100}).trim(),
check('password', 'Ошибка, выберите другой пароль').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d[\]{};:=<.,>_+^#$@!%*?&]{8,}$/, 'g'),
sanitize('password').trim().escape(),
sanitize('confirmation').trim().escape(),
sanitize('email').trim().escape(),
sanitize('stud').trim().escape(),
sanitize('message').trim().escape(),
sanitize('r').trim().escape(),
function(req, res, next) {
  var errors = validationResult(req).array();
  if (errors.length!=0) {
    res.send({errors: errors, body: req.body, status: 'failure'})
  }
  else {
    if(req.body.password != req.body.confirmation) {
      errors.push({param: 'confirmation', msg: 'Пароли не совпадают'})
      return res.send({errors: errors, status: 'failure'})
    }
    User.findOne({login: req.body.email}, function(err, user) {
      if (err) {
        errors.push({param: 'general', msg: 'DB Error'})
        res.send({errors: errors, status: 'failure'})
        return console.log(err);
      }
      if (req.body.r != req.session.captcha) {  //сравниваем ответ на капчу (правильный ответ сохранен в сессии)
        errors.push({param: 'r', msg: 'Пожалуйста, попробуйте еще раз'})
        // создаем новую капчу и отправляем клиенту
        var captcha = svgCaptcha.createMathExpr();
        req.session.captcha = captcha.text;
        res.send({errors: errors, captcha: captcha.data, status: 'failure'})
        return console.log('failed captcha')
      }
      if (user) {
        errors.push({param: 'email', msg: 'Этот Email уже занят'})
        res.send({errors: errors, body: req.body, status: 'failure'})
      }
      else {
        if (!req.body.message) {
          req.body.message = '';
        }
        var pass = req.body.password
        bcrypt.hash(pass, 10, function(err, hash) {
          pass = hash;
          // создаем нового юзера
          newuser = new User({
            login: req.body.email,
            password: pass,
            stud: req.body.stud,
            message: req.body.message,
            approved: false
          });
          // сохраняем его в базу
          newuser.save(function(err) {
            if (err) {
              errors.push({param: 'general', msg: 'DB Error'})
              res.send({errors: errors, status: 'failure'})
              return console.log(err);
            }
            res.send({errors: errors, body: req.body, status: 'success'})
          })
        });


      }
    })
  }

})

router.post('/changepw', middlewares.reqcommonlogin,
check('oldpassword', 'Не может быть пустым').isLength({min: 1, max: 100}).trim(),
check('password', 'Минимальная длина: 8 символов').isLength({min: 8, max: 100}).trim(),
check('confirmation', 'Не может быть пустым').isLength({min: 1, max: 100}).trim(),
check('password', 'Ошибка, выберите другой пароль').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d[\]{};:=<.,>_+^#$@!%*?&]{8,}$/, 'g'),
sanitize('oldpassword').trim().escape(),
sanitize('password').trim().escape(),
sanitize('confirmation').trim().escape(),
function(req,res,next) {
  var errors = validationResult(req).array();
  if (errors.length!=0) {
    res.send({errors: errors, body: req.body, status: 'failure'})
  }
  else
  if(req.body.password != req.body.confirmation) {
    errors.push({param: 'confirmation', msg: 'Пароли не совпадают'})
    res.send({errors: errors, status: 'failure'})
  }
  else if (req.body.oldpassword == req.body.password) {
    errors.push({param: 'general', msg: 'Тот же пароль'})
    res.send({errors: errors, status: 'failure'})
  }
  else {
    User.findOne({_id: req.session.userId}, function(err, user) {
      if (err) {
        errors.push({param: 'general', msg: 'DB Error'})
        res.send({errors: errors, status: 'failure'})
        return console.log(err);
      }
      bcrypt.compare(req.body.oldpassword, user.password, function(err, resp) {
        if (resp == true || user.password == 'admin') {
          bcrypt.hash(req.body.password, 10, function(err, hash) {
            User.findOneAndUpdate({_id: req.session.userId}, { $set: {password: hash} }, function(err) {
              if (err) {
                errors.push({param: 'general', msg: 'DB Error'})
                res.send({errors: errors, status: 'failure'})
                return console.log(err);
              }
              res.send({errors: errors, body: req.body, status: 'success'})
            })

          });

        }
        else { // неправильный пароль
          errors.push({param: 'oldpassword', msg: 'Неправильный пароль'})
          res.send({errors: errors, body: req.body, status: 'failure'})
        }
      });
    })
  }
})


router.get('/logout', function(req, res, next) {
  if (req.session) {
    // delete session object
    req.session.destroy(function(err) {
      if(err) {
        return next(err);
      } else {
        return res.redirect('/auth'); // перенаправление к логину
      }
    });
  }
});

module.exports = router;
