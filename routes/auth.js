var express = require('express');
var router = express.Router();
var User = require('../models/user')
var randomstring = require("randomstring");
var middlewares = require("./middlewares")
var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'REDACTED',
    pass: 'password'
  }
});

//var bcrypt = require('bcrypt');

const { check, validationResult } = require('express-validator/check');
const { matchedData, sanitize } = require('express-validator/filter');
var svgCaptcha = require('svg-captcha');

const fs = require('fs');




router.get('/', function(req, res, next) {
    res.render('login', { userid: req.session.userId, login: req.session.login});

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
        res.render('requests', { userid: req.session.userId, student_list: userlist, approved_list: approvedlist});
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
        from: 'REDACTED',
        to: user.login,
        subject: 'Please change this at routes/auth.js :mailOptions',
        text: 'Your login is '+user.login+' and your password is '+user.password
      };
      // отправляем письмо
      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
          res.send({error: error})
        } else {
          console.log('Email sent: ' + info.response);
          res.send({status: 'success'});
        }
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
      res.render('login', { userid: req.session.userId, login: req.session.login});
    }
    else {
      var captcha = svgCaptcha.createMathExpr(); // создаем капчу
      req.session.captcha = captcha.text; // сохраняем ответ на капчу в сессии
      res.render('registration', {captcha: captcha.data}); // рендерим форму регистрации
    }

});

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
      if (req.body.password == user.password) { //сравниваем пароли
        req.session.userId = user._id; //устанавливаем сессию
        req.session.login = user.login;
        res.send({errors: errors, body: req.body, status: 'success'})
      }
      else { // неправильный пароль
        errors.push({param: 'general', msg: 'Неправильные логин/пароль'})
        res.send({errors: errors, body: req.body, status: 'failure'})
      }
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
      var pass = randomstring.generate(10); //случаный пароль
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

    }
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
