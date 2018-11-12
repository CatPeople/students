var express = require('express');
var router = express.Router();
var Type = require('../models/type')
var Student = require('../models/student')
var User = require('../models/user')
var ServerInfo = require('../models/serverinfo')
var documentmodels = require('../models/document')
var middlewares = require("./middlewares")

const { check, validationResult } = require('express-validator/check');
const { matchedData, sanitize } = require('express-validator/filter');

const fs = require('fs');





/* GET home page. */
router.get('/', function(req, res, next) {
  // главная страница редиректит в зависимости от логина
    // админа во вкладку "информация"
    if (req.session && req.session.login == "admin")
      res.redirect('/adminpanel');
    // других пользователей во вкладку поиск
    else if (req.session && req.session.userId)
      res.redirect('/search')
    else
      // остальных на страницу логина и регистрации
      res.redirect('/auth')
});

router.get('/search', middlewares.reqcommonlogin, function (req, res) {
  res.render('search', {userid: req.session.userId, login: req.session.login, title: 'Поиск'});
})



router.post('/search', middlewares.reqcommonlogin,
check('fullname').exists(),
check('fullname', 'Не может быть пустым').isLength({min: 1, max: 100}).trim(),
sanitize('fullname').trim().escape(),
sanitize('group').trim().escape(),
function(req, res, next) {
  var errors = validationResult(req).array();
  if (req.body.fullname && errors.length==0) {
    // делим строку поиска на фамилию, имя и отчество
    var lastName;
    var firstName;
    var patronymic;
    var splitsearch = req.body.fullname.split(' ', 3)  // используем пробел как делимитер
                                                      // получаем 3 части, остальное отбрасываем
    if (splitsearch) {
      lastName = splitsearch[0];
      if (splitsearch[1])
        firstName = splitsearch[1];
      if (splitsearch[2])
        patronymic = splitsearch[2];
      }
  }
  if (!lastName)
    lastName = '';
  if (!firstName)
    firstName = '';
  if (!patronymic)
    patronymic = '';
  if (!req.body.group) // если не была запрошена группа в дополнение к имени
  {
    // ищем студента где все 3 имени совпадают с полученным из запроса
    Student.find({$and:[{'name.firstName': firstName}, {'name.lastName': lastName}, {'name.patronymic': patronymic}]})
    .populate({path: 'documents', populate: {path: 'scope'}}) // заполняем ссылки на документы объектами документов
    .populate({path: 'documents', populate: {path: 'files'}})
    .populate({path: 'ratings', populate: {path: 'scope'}})
    .exec(function(err, students) {
      if (err) {
        res.render('search', {userid: req.session.userId, login: req.session.login, title: 'Поиск'});
        return console.log(err)
      }
      if (students.length == 1) { // найден всего один студент, рендерим его страницу
        res.render('student', {userid: req.session.userId, student: students[0], login: req.session.login, title: students[0].fullName+' | '+results[0].group.name});
      }
      else if (students.length == 0) { // не найдено ни одного, рендерим снова поиск и передаем переменную, что не найдено
        res.render('search', {userid: req.session.userId, nothing: true, login: req.session.login, title: 'Поиск'});
      }
      else { // найдено несколько студентов, рендерим список (где клиент уточняет группу)
        res.render('search_list', {userid: req.session.userId, student_list: students, login: req.session.login, title: 'Поиск'});
      }
    })
  }
  else { // от клиента получены имя и группа, ищем, дальше то же самое
    Student.find({$and:[{'name.firstName': firstName}, {'name.lastName': lastName}, {'name.patronymic': patronymic}], 'group.name': req.body.group})
    .populate({path: 'documents', populate: {path: 'scope'}}) // заполняем ссылки на документы объектами документов
    .populate({path: 'documents', populate: {path: 'files'}})
    .populate({path: 'ratings', populate: {path: 'scope'}})
    .exec(function(err, students) {
      if (err) {
        res.render('search', {userid: req.session.userId, login: req.session.login, title: 'Поиск'});
        return console.log(err)
      }
      if (students.length == 1) {
        res.render('student', {userid: req.session.userId, student: students[0], login: req.session.login, title: students[0].fullName+' | '+results[0].group.name});
      }
      else {
        res.render('search_list', {userid: req.session.userId, student_list: students, login: req.session.login, title: 'Поиск'});
      }
    })
  }
})



router.get('/adminpanel', middlewares.reqlogin, function(req, res, next) {
    Student.countDocuments({}, function(err, students) {
      if (err) {
        res.redirect('/auth')
        return console.log(err);
      }
      User.find({'approved': { $ne: true }}, function(err, userswaiting) { // $ne - не равно
        if (err) {
          res.redirect('/auth')
          return console.log(err);
        }
        documentmodels.Document.countDocuments().exec(function(err, documentscount) {
          if (err) {
            res.redirect('/auth')
            return console.log(err);
          }
          var needpwchange = false;
          User.findOne({login: 'admin'}, function(err, adm) {
            if (adm.password == 'admin') {
              needpwchange = true;
            }
            ServerInfo.findOne({'name': 'driveUsageEstimate'}, function(err, entry) {
              if (err) {
                return res.render('adminpanel', {title: 'Информация', userid: req.session.userId, login: req.session.login, studentscount: students, userswaiting: userswaiting.length, documentscount: documentscount, needpwchange: needpwchange, driveusage: 0});
              }
              if(entry)
                res.render('adminpanel', {title: 'Информация', userid: req.session.userId, login: req.session.login, studentscount: students, userswaiting: userswaiting.length, documentscount: documentscount, needpwchange: needpwchange, driveusage: entry.valueNumber});
              else
                return res.render('adminpanel', {title: 'Информация', userid: req.session.userId, login: req.session.login, studentscount: students, userswaiting: userswaiting.length, documentscount: documentscount, needpwchange: needpwchange, driveusage: 0});
            })

          })

        })
      })
    })

});

router.get('/newtype', middlewares.reqlogin, function(req, res) {
  res.render('newtype_form', {title: 'Создать новый тип документа', userid: req.session.userId, login: req.session.login, header: "Создать новый тип документа", request_url: "/newtype"});
})

router.post('/newtype', middlewares.reqlogin, [
  function(req, res, next) {
    if (!Array.isArray(req.body.fields)) { //если fields не является массивом, сделать его массивом
                                          // случается если там всего одно поле
      req.body.fields = [req.body.fields]
      next();
    }
    else next();
  },
  check('name', 'Название не может быть пустым').isLength({min: 1, max: 100}).trim(),
  check('fields', 'Поле не может быть пустым').isLength({min: 1, max: 100}).trim(),
  check('fields.*', 'Поле не может быть пустым').isLength({min: 1, max: 100}).trim(),
  sanitize('name').trim().escape(),
  sanitize('fields.*').trim().escape(),
  function(req, res) {

    var errors = validationResult(req).array();
    if (errors.length!=0) {
      res.send({errors: errors, status: 'failure'})
    }
    else {
      // проверяем нет ли типа с этим названием в базе
      Type.findOne({'name': req.body.name}, function(err, type) {
        if (err){
          errors.push({param: 'general', msg: 'DB Error'})
          res.send({errors: errors, status: 'failure'})
          return console.log(err);
        }
        if (type == null) { // если нет, создаем
          var newtype = new Type({name: req.body.name, fields: req.body.fields}) // создаем
          newtype.save(function(err) {  // сохраняем
            if (err){
              errors.push({param: 'general', msg: 'DB Error'})
              res.send({errors: errors, status: 'failure'})
              return console.log(err);
            }
            res.send({errors: errors, status: 'Успешно'})
          })

        }
        else { // тип был найден в базе
          errors.push({param: 'name', msg: 'Это название уже существует'})
          res.send({errors: errors, status: req.body})
        }
      })

    }
}])

module.exports = router;
