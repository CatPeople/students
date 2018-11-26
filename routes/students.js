var express = require('express');
var router = express.Router();

var Student = require('../models/student')
var Type = require('../models/type')
var documentmodels = require('../models/document')
var Rating = require('../models/rating')
var File = require('../models/file')
var ServerInfo = require('../models/serverinfo')
var async = require("async");
const fs = require('fs');
var mkdirp = require('mkdirp');
var randomstring = require("randomstring");
var rimraf = require("rimraf");
var middlewares = require("./middlewares")
var sanitizefilename = require("sanitize-filename");
var pug = require('pug');
var filesize = require("filesize")
var pdf = require('html-pdf');
const path = require('path');


const { check, validationResult } = require('express-validator/check');
const { matchedData, sanitize } = require('express-validator/filter');

global.scopeslist_local = null;


documentmodels.Scope.find()
.exec(function(err, scopeslist) {
  if (err) {return console.log(err)}
  scopeslist_local = scopeslist;
})

function updateRating(student, scope, addnumber, callback) {
  var ratingobject;
  student.ratings.forEach(function(rating) {
    if (rating.scope._id.equals(scope._id)) {
      ratingobject = rating
    }
  })
  if (!ratingobject) {
    ratingobject = new Rating({scope: scope, actualrating: 0})
    Student.findByIdAndUpdate(student._id, { $push: { ratings: ratingobject._id } })
    .exec(function(err) {
      if (err) {return console.log(err)}
      ratingobject.actualrating = ratingobject.actualrating + addnumber
      Rating.findOneAndUpdate({_id: ratingobject._id}, ratingobject, {upsert: true}, function(err) {
        if (err) {return console.log(err)}
          callback()
      })
    })
  }
  else {
  ratingobject.actualrating = +ratingobject.actualrating + (+addnumber)
  Rating.findOneAndUpdate({_id: ratingobject._id}, { $set: { actualrating: ratingobject.actualrating }}, {upsert: true, new: true}, function(err) {
    if (err) {return console.log(err)}
      callback()
  })
  }
}

function recalculateRatings(studentid, callback) {
  Student.findById(studentid)
  .populate('ratings')
  .populate('documents')
  .exec(function(err, student) {
    if (err) {return console.log(err)}
    async.each(student.ratings, function(rating, cb) {
      Rating.findByIdAndUpdate(rating._id, { $set: { actualrating: 0 } }, function(err) {
        if (err) {return console.log(err)}
        cb()
      })
    }, function(err) {
        if (err) {return console.log(err)}
        async.eachSeries(student.documents, function(doc, cb) {
          Student.findById(student._id)
          .populate('ratings')
          .populate('documents')
          .exec(function(err, stud) {
              if (err) {return console.log(err)}
              updateRating(stud, doc.scope, doc.rating, function() {cb()})
          })

        }, function(err) {
          if (err) {return console.log(err)}
          Student.findById(student._id)
          .populate({path: 'documents', populate: {path: 'scope'}}) // заполняем ссылки на документы объектами документов
          .populate({path: 'ratings', populate: {path: 'scope'}})
          .exec(function(err, newstudd) {
            if (err) {return console.log(err)}
            callback(newstudd)
          })
        })
    })

  })
}

// список студентов
router.get('/', middlewares.reqlogin, function(req, res, next) {
  var page = 1; // по умолчанию первая страница
  if (req.body.page) { // если запрошена конкретная страница
    page = parseInt(req.body.page) // переводим ее в integer и присваиваем
  }
  var grouplist = []
  Student.find() // поиск всех студентов
  .exec(function(err, student_list) { // все студенты теперь в student_list
    if (err) {return console.log(err);}
    student_list.forEach(function(student) { // цикл по каждому студенту
      if (student.group.name) {
        if (grouplist.indexOf(student.group.name)==-1) // если группы студента еще нет в списке grouplist
        {grouplist.push(student.group.name)} // добавляем
      }
    })
    // выдаем 15 студентов, сортируя в алфавитном порядке
    Student.paginate({}, {page: page, limit: 15, sort: {'name.lastName': 1}}, function(err, list_students) {
      if (err) { return console.log(err); }

      res.render('student_list', {title: 'Студенты', userid: req.session.userId, login: req.session.login, student_list: list_students.docs, pagestotal: list_students.pages, grouplist: grouplist, scopes: scopeslist_local});
    })
  })


});


// запрос на переключение страницы и одновременно поиск
router.get('/page/ajax/:page', middlewares.reqlogin,
sanitize('name').trim().escape(), // имя группы
sanitize('studentname').trim().escape(), // имя студента
sanitize('ratingscopes').trim().escape(),
function(req, res, next) {
  var page = req.params.page; // req.params.page берется из адреса запроса, шаблон которого указан в router.get
                              // на 4 строки выше, например /student/page/ajax/5
  if (req.params.page) {
    page = parseInt(req.params.page)
  }
  if (req.query.studentname) { // если идет поиск по имени
    // делим строку поиска на фамилию, имя и отчество
  var lastName;
  var firstName;
  var patronymic;
  var splitsearch = req.query.studentname.split(' ', 3) // используем пробел как делимитер
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
  if (req.query.studentname && req.query.name) { // идет поиск и по имени, и по группе
    // здесь все три строки с кучей скобок - это один большой фильтр для поиска по базе студентов
    /*
    логика:
    есть 3 условия, все 3 должны быть истинны, это массив после слова $and
      каждое из этих условий тут на отдельной строке и состоит тоже из массива трех условий, но
      только одно из них должно выполняться, потому что слово $or
    первая строка ищет совпадает ли фамилия из запроса с именем, фамилией или отчеством студента из базы, даже частично
    вторая строка делает то же самое с именем
    третья то же самое с отчеством
      поиск ищет даже части, если запрос пустой - то совпадает все
    вдобавок тут должна совпадать еще группа, это на третьей строке
    */
    Student.paginate({$and:[{$or:[{'name.firstName':{$regex: lastName, $options: 'i'}},{'name.lastName':{$regex: lastName, $options: 'i'}}, {'name.patronymic':{$regex: lastName, $options: 'i'}}]},
                            {$or:[{'name.firstName':{$regex: firstName, $options: 'i'}},{'name.lastName':{$regex: firstName, $options: 'i'}}, {'name.patronymic':{$regex: firstName, $options: 'i'}}]},
                          {$or:[{'name.firstName':{$regex: patronymic, $options: 'i'}},{'name.lastName':{$regex: patronymic, $options: 'i'}}, {'name.patronymic':{$regex: patronymic, $options: 'i'}}]}], 'group.name': req.query.name}, {page: page, limit: 15, sort: {'name.lastName': 1}}, function(err, list_students) {
      if (err) { return console.log(err); }
      // возвращено 15 студентов, удовлетворяющих поиску, рендерится новый список с новыми значениями страниц
      // переменную pageturn устанавливаем true, в таком случае движок темплейтов возвращает только хтмл списка и ничего больше
      // для того, чтобы обновить список у клиента, вместо всей страницы. Проверка этой переменной идет в шаблоне student_list
      res.render('student_list', {title: 'Студенты', student_list: list_students.docs, pagestotal: list_students.pages, pageturn: true, page: page});
    })
  }
  else
  if (req.query.studentname) { // то же самое, только идет поиск только по имени,
                                // группа может быть любая, т.е. ее нет в поисковом запросе к базе
    Student.paginate({$and:[{$or:[{'name.firstName':{$regex: lastName, $options: 'i'}},{'name.lastName':{$regex: lastName, $options: 'i'}}, {'name.patronymic':{$regex: lastName, $options: 'i'}}]},
                            {$or:[{'name.firstName':{$regex: firstName, $options: 'i'}},{'name.lastName':{$regex: firstName, $options: 'i'}}, {'name.patronymic':{$regex: firstName, $options: 'i'}}]},
                          {$or:[{'name.firstName':{$regex: patronymic, $options: 'i'}},{'name.lastName':{$regex: patronymic, $options: 'i'}}, {'name.patronymic':{$regex: patronymic, $options: 'i'}}]}]}, {page: page, limit: 15, sort: {'name.lastName': 1}}, function(err, list_students) {
      if (err) { return console.log(err); }
      // рендерим список из 15 студентов
      res.render('student_list', {title: 'Студенты', student_list: list_students.docs, pagestotal: list_students.pages, pageturn: true, page: page});
    })
  }
  else
  if (req.query.name) { // идет поиск только по имени группы, поэтому запрос простой
    if (req.query.ratingscopes) {
      var ratedstudents = [];
      async.each(req.query.ratingscopes, function(ratingscope, cb) {
        Student.find({'group.name': req.query.name, ratings: {$ne: null}})
        .populate({path: 'ratings', match: {scope: ratingscope, actualrating: {$ne: 0}}, populate: {path: 'scope'}})
        .exec(function(err, list_students) {
          if (err) { return console.log(err); }
            var i = list_students.length;
            while (i--) {
              if (list_students[i].ratings.length == 0) {
                list_students.splice(i, 1)
              }
            }
            ratedstudents = ratedstudents.concat(list_students)
            cb();
        })
      }, function(err) {
        if (err) { return console.log(err); }
        ratedstudents.sort(function(a,b) {return b.ratings[0].actualrating - a.ratings[0].actualrating})
        res.render('student_list', {title: 'Студенты', student_list: ratedstudents, pagestotal: 1, pageturn: true, page: 1, ratingon: true});
      })
    }
    else {
  Student.paginate({'group.name': req.query.name}, {page: page, limit: 15, sort: {'name.lastName': 1}}, function(err, list_students) {
    if (err) { return console.log(err); }
    res.render('student_list', {title: 'Студенты', student_list: list_students.docs, pagestotal: list_students.pages, pageturn: true, page: page});
  })
  }
}
else { // нет никаких поисков, клиент просто нажал перевернуть страницу
      // поисковый запрос пустой - {}, т.е. база ищет всех студентов
      // после пустого поискового запроса {} идет объект с опциями для функции paginate из модуля mongoosePaginate
      // она делит результат по 15, сортирует, разделяет на страницы, и возвращает список студентов с определенной страницы
      // страница была взята из запроса еще в самом начале этой всей длинной функции
  var ratedstudents = [];
  if (req.query.ratingscopes) {
    async.each(req.query.ratingscopes, function(ratingscope, cb) {
      Student.find({ratings: {$ne: null}})
      .populate({path: 'ratings', match: {scope: ratingscope, actualrating: {$ne: 0}}, populate: {path: 'scope'}})
      .exec(function(err, list_students) {
        if (err) { return console.log(err); }
          var i = list_students.length;
          while (i--) {
            if (list_students[i].ratings.length == 0) {
              list_students.splice(i, 1)
            }
          }
          ratedstudents = ratedstudents.concat(list_students)
          cb();
      })
    }, function(err) {
      if (err) { return console.log(err); }
      ratedstudents.sort(function(a,b) {return b.ratings[0].actualrating - a.ratings[0].actualrating})
      res.render('student_list', {title: 'Студенты', student_list: ratedstudents, pagestotal: 1, pageturn: true, page: 1, ratingon: true});
    })
  }
  else {
  Student.paginate({}, {page: page, limit: 15, sort: {'name.lastName': 1}}, function(err, list_students) {
    if (err) { return console.log(err); }
    res.render('student_list', {title: 'Студенты', student_list: list_students.docs, pagestotal: list_students.pages, pageturn: true, page: page});
  })
  }
}

});


// то же самое, что запрос списка студентов, только указана определенная страница
// то есть если в браузере в адрес ввести /student/page/5
// то запрос отправится сюда
// это изначальный запрос, если допустим введен в адресную строку вручную
// либо с помощью кнопки "назад" в браузере
// переворачивание страниц с помощью кнопок и поиска
// отправляется в тот сложный обработчик выше
router.get('/page/:page', middlewares.reqlogin,
sanitize('name').trim().escape(),
function(req, res, next) {
  var page = req.params.page;
  if (req.params.page) {
    page = parseInt(req.params.page)
  }
  var grouplist = []
  Student.find()
  .exec(function(err, student_list) {
    if (err) {return console.log(err);}
    student_list.forEach(function(student) {
      if (student.group.name) {
        if (grouplist.indexOf(student.group.name)==-1)
        {grouplist.push(student.group.name)}
      }
    })
    Student.paginate({}, {page: page, limit: 15, sort: {'name.lastName': 1}}, function(err, list_students) {
      if (err) { return console.log(err); }

      res.render('student_list', {title: 'Студенты', userid: req.session.userId, login: req.session.login, student_list: list_students.docs, page: page, pagestotal: list_students.pages, grouplist: grouplist, scopes: scopeslist_local});
    })
  })

});

router.get('/newstudent/create', middlewares.reqlogin, function(req, res, next) {
  res.render('newstudent', {title: 'Создать студента', userid: req.session.userId, login: req.session.login});
})

router.post('/newstudent/create', middlewares.reqlogin,
check('firstname').exists(),
check('lastname').exists(),
check('patronymic').exists(),
check('group').exists(),
check('firstname', 'Имя не может быть пустым').isLength({min: 1, max: 100}).trim(),
check('lastname', 'Фамилия не может быть пустой').isLength({min: 1, max: 100}).trim(),
check('patronymic', 'Отчество не может быть пустым').isLength({min: 1, max: 100}).trim(),
check('group', 'Группа не может быть пустой').isLength({min: 1, max: 100}).trim(),
sanitize('firstname').trim().escape(),
sanitize('lastname').trim().escape(),
sanitize('patronymic').trim().escape(),
sanitize('group').trim().escape(),
function(req, res, next) {
  var errors = validationResult(req).array();
  if (errors.length!=0) {
    res.send({errors: errors, body: req.body, status: 'failure'})
  }
  else {
    var newstud = new Student({'name.firstName': req.body.firstname, 'name.lastName': req.body.lastname, 'name.patronymic': req.body.patronymic, 'group.name': req.body.group, documents: []})
    newstud.save(function(err, student) {
      if(err) {
        errors.push({param: 'general', msg: 'DB Error'})
        res.send({errors: errors, status: 'failure'})
        return console.log(err);
      }
      res.send({errors: errors, body: req.body, status: 'success', id: student._id})
    })

  }

});

router.post('/newstudent/create', middlewares.reqlogin, function(req, res, next) {
    res.render('newstudent', {title: 'Создать студента', userid: req.session.userId, login: req.session.login});

});

// отображение страницы студента, к примеру /student/5abf979c99fbeb259501d172
// этот запрос может использовать только админ
// плебеи получают страницу студента в запросе /search
router.get('/:id', middlewares.reqlogin, function(req, res, next) {
  // запускаем две функции поиска параллельно друг другу
  // и ждем, пока обе выполнятся
  async.parallel([function(callback){
  Student.findById(req.params.id) // поиск студента по id
  .populate({path: 'documents', populate: {path: 'scope'}}) // заполняем ссылки на документы объектами документов
  .populate({path: 'ratings', populate: {path: 'scope'}})
  .populate({path: 'documents', populate: {path: 'files'}})
  .exec(function(err, student_data) { // получили студента
    if (err) {next(err); return console.log (err);}
    callback(null, student_data); // даем знать функции async.parallel, что эта функция выполнена, и передаем данные

  })
},
function(callback) { // вторая параллельная функция
  Type.find() // ищем все типы документов (для формы создания)
  .exec(function(err, list_types) {
    if (err) { return console.log(err); }
    callback(null, list_types) // даем знать функции async.parallel, что эта функция выполнена, и передаем данные
  })
},
function(callback) { // третья параллельная функция из двух
  documentmodels.Scope.find()
  .exec(function(err, list_scopes) {
    if(err) {return console.log(err)}
    callback(null, list_scopes)
  })
}
], function(err, results) { // обе функции выполнились, results[0] данные студента, results[1] данные всех типов
  if (err) { return console.log(err); }
  res.render('student_a', {title: results[0].fullName+' | '+results[0].group.name, userid: req.session.userId, login: req.session.login, student: results[0], types: results[1], scopes: results[2], request_url: "/student/"+results[0]._id});
})
})

// запрос на пдф файл, могут пользоваться и админ, и плебеи
router.get('/printable/:id.pdf', middlewares.reqcommonlogin, function(req, res, next) {
  Student.findById(req.params.id) //ищем студента
  .populate({path: 'documents', populate: {path: 'scope'}})
  .populate({path: 'ratings', populate: {path: 'scope'}})
  .exec(function(err, student_data) {
    if (err) {next(err); return console.log (err);}
    // генерируем хтмл из специального шаблона
    var html = pug.renderFile('views/student_printable.pug', {userid: req.session.userId, login: req.session.login, student: student_data, request_url: "/student/"+student_data._id});
    // создаем из этого хтмл пдф
    pdf.create(html).toStream(function(err, stream) {
        if (err) {
          res.json({
            message: 'Sorry, we were unable to generate pdf',
          });
        }
        // отправляем пдф файл в качестве ответа на запрос
       stream.pipe(res);
     })
  })
})


var compiledDocument;
var compiledFileEntry;



// запрос на создание нового документа для студента
router.post('/:id', middlewares.reqlogin, [
  function(req, res, next) {
    if (!Array.isArray(req.body.fields)) {
      req.body.fields = [req.body.fields]
    }
    if (!Array.isArray(req.body.names)) {
      req.body.names = [req.body.names]
    }
    next();
  },
  check('fields').exists(),
  check('names').exists(),
  check('typename').exists(),
  check('scope').exists(),
  check('scope').custom(value => {
    for(var scope of scopeslist_local) {
      if(value == scope.name) {return true;}
    }
    throw new Error('Несуществующее значение')
  }),
  check('rating').isNumeric(),
  check('fields.*', 'Поле не может быть пустым').isLength({min: 1, max: 100}).trim(),
  check('names.*').isLength({min: 1, max: 100}).trim(),
  check('typename').isLength({min: 1, max: 100}).trim(),
  sanitize('fields.*').trim().escape(),
  sanitize('names.*').trim().escape(),
  sanitize('typename').trim().escape(),
  sanitize('scope').trim().escape(),
  sanitize('rating').trim().escape(),
  sanitize('filesStatus').trim().escape(),
  function(req, res) {

    var errors = validationResult(req).array();
    if (errors.length!=0) {
      res.send({errors: errors, status: 'failure'})
    }
    else if (req.body.names.length != req.body.fields.length) { // должно быть одинаковое количество имен полей и значений полей
      errors.push({param: 'general', msg: 'Wake up Neo'})
      res.send({errors: errors, status: 'failure'})
    }
    else {
        // создаем новый документ
        for(var scope of scopeslist_local) {
          if(req.body.scope == scope.name) {req.body.scope = scope._id}
        }
        if (req.body.filesStatus) req.body.filesStatus = 'placeholder'
        var newdoc = new documentmodels.Document({type: req.body.typename, scope: req.body.scope, rating: +req.body.rating});
        for (var i = 0; i < req.body.names.length; i++) {
          // создаем пары имя-значение и толкаем их в массив content нового документа
          var newpair = {field: req.body.names[i], value: req.body.fields[i]}
          newdoc.content.push(newpair);
        }
        // сохраняем документ в базу, возвращаем объект документа в переменную thedoc
        newdoc.save(function(err, docu) {
          if (err){
            errors.push({param: 'general', msg: 'DB Error'})
            res.send({errors: errors, status: 'failure'})
            return console.log(err);
          }
          documentmodels.Document.findOne(docu).populate('scope')
          .exec(function(err, thedoc) {
            // находим студента по айди и толкаем в его массив документов ссылку на документ
            Student.findByIdAndUpdate(req.params.id, { $push: { documents: thedoc._id } }, {new: true})
            .populate('ratings')
            .exec(function(err, student) {
              if (err) {
                errors.push({param: 'general', msg: 'DB Error'})
                res.send({errors: errors, status: 'failure'})
                return console.log(err);
              }

              recalculateRatings(student._id, function(newstudd) {
                // успех, отправляем клиенту айди нового документа для создания ссылок и т.п.
                res.send({errors: errors, status: 'Документ создан', id: thedoc._id, visual: compiledDocument({document: thedoc, filesize: filesize, filesStatus: req.body.filesStatus}), ratingsvisual: compiledRatingsDisplay({student: newstudd})})
              })
            })
          })
        })
    }
}])

// редактирование документа
router.post('/editdocument/:id', middlewares.reqlogin, [
  function(req, res, next) {
    if (!Array.isArray(req.body.fields)) {
      req.body.fields = [req.body.fields]
    }
    if (!Array.isArray(req.body.names)) {
      req.body.names = [req.body.names]
    }
    next();
  },
  check('fields').exists(),
  check('names').exists(),
  check('typename').exists(),
  check('scope').exists(),
  check('studentid').exists(),
  check('scope').custom(value => {
    for(var scope of scopeslist_local) {
      if(value == scope.name) {return true;}
    }
    throw new Error('Несуществующее значение')
  }),
  check('rating').isNumeric(),
  check('fields.*', 'Поле не может быть пустым').isLength({min: 1, max: 100}).trim(),
  check('names.*').isLength({min: 1, max: 100}).trim(),
  check('typename').isLength({min: 1, max: 100}).trim(),
  sanitize('fields.*').trim().escape(),
  sanitize('names.*').trim().escape(),
  sanitize('typename').trim().escape(),
  sanitize('scope').trim().escape(),
  sanitize('rating').trim().escape(),
  sanitize('studentid').trim().escape(),
  sanitize('filesStatus').trim().escape(),
  function(req, res) {

    var errors = validationResult(req).array();
    if (errors.length!=0) {
      res.send({errors: errors, status: 'failure'})
    }
    else if (req.body.names.length != req.body.fields.length) {
      errors.push({param: 'general', msg: 'Wake up Neo'})
      res.send({errors: errors, status: 'failure'})
    }
    else {
      for(var scope of scopeslist_local) {
        if(req.body.scope == scope.name) {req.body.scope = scope._id}
      }
      if (req.body.filesStatus) req.body.filesStatus = 'placeholder'
      var newcontent = []
      for (var i = 0; i < req.body.names.length; i++) {
        var newpair = {field: req.body.names[i], value: req.body.fields[i]}
        newcontent.push(newpair);
      }
      // ищем документ по айди и полностью обновляем его содержимое
      documentmodels.Document.findByIdAndUpdate(req.params.id, { $set: { type: req.body.typename, content: newcontent, scope: req.body.scope, rating: +req.body.rating }}, {new: true}).
      populate('scope')
      .populate('files')
      .exec(function(err, updateddoc) {
        if (err){
          errors.push({param: 'general', msg: 'DB Error'})
          res.send({errors: errors, status: 'failure'})
          return console.log(err);
        }
        recalculateRatings(req.body.studentid, function(newstudd) {
            res.send({id:req.params.id, errors: errors, status: 'Успешно', visual: compiledDocument({document: updateddoc, filesize: filesize, filesStatus: req.body.filesStatus}), ratingsvisual: compiledRatingsDisplay({student: newstudd})})
        })

      });

    }
}])

// редактирование студента
router.post('/editstudent/:id', middlewares.reqlogin, [
  check('firstname').exists(),
  check('lastname').exists(),
  check('patronymic').exists(),
  check('group').exists(),
  check('firstname', 'Имя не может быть пустым').isLength({min: 1, max: 100}).trim(),
  check('lastname', 'Фамилия не может быть пустой').isLength({min: 1, max: 100}).trim(),
  check('patronymic', 'Отчество не может быть пустым').isLength({min: 1, max: 100}).trim(),
  check('group', 'Группа не может быть пустой').isLength({min: 1, max: 100}).trim(),
  sanitize('firstname').trim().escape(),
  sanitize('lastname').trim().escape(),
  sanitize('patronymic').trim().escape(),
  sanitize('group').trim().escape(),
  function(req, res) {

    var errors = validationResult(req).array();
    if (errors.length!=0) {
      res.send({errors: errors, status: 'failure'})
    }
    else {
      var graduated = false; // по умолчанию студент не выпущен
      if (req.body.graduated) {graduated = true} // если была отмечена галочка, то выпущен
      // объект с новыми именами
      var newname = {firstName: req.body.firstname, lastName: req.body.lastname, patronymic: req.body.patronymic}
      // ищем студента по айди и обновляем объект имени, группу, выпустился/невыпустился
      Student.findOne({_id: req.params.id}, function(err, student) {
        student.name = newname
        student.group.name = req.body.group
        student.graduated = graduated
        student.save(function(err, stud) {
          if (err){
            errors.push({param: 'general', msg: 'DB Error'})
            res.send({errors: errors, status: 'failure'})
            return console.log(err);
          }
          res.send({body: req.body, degree: stud.degree, year: stud.year, testgrad: stud.graduationDay.toLocaleDateString("en-US", {year: 'numeric', month: 'long', day: 'numeric'}), errors: errors, status: 'success'})
        })
      })
    }
}])


var gd = require('../googledrive');

// удаляем студента
router.delete('/delete/:id', middlewares.reqlogin, function(req, res) {
  // ищем по айди и удаляем
  Student.findByIdAndRemove(req.params.id, function(err, student) {
    if (err){
      res.send({error: err, status: 'failure'})
      return console.log(err);
    }
    if (student.documents) { // если у него были ссылки на документы
      async.eachSeries(student.documents, function updateObject (obj, done) {
        // то удаляем каждый документ
        documentmodels.Document.findOne({_id: obj}, function(err, doc) {
          if (err){
            done();
            return console.log(err);
          }
            doc.remove(function(err) {
              if (err){
                done();
                return console.log(err);
              }
              done();
            })

        })
      }, function allDone (err) {
          res.send({status: 'success'})
      });
    }
    else {
    res.send({status: 'success'})
  }
  })
})


router.delete('/deletedocument/:id', middlewares.reqlogin, function(req, res) {
  // ищем документ по айди и удаляем его
  documentmodels.Document.findOne({_id: req.params.id}, function(err, doc) {
    if (err){
      res.send({error: err, status: 'failure'})
      return console.log(err);
    }
    doc.remove(function(err) {
      if (err){
        res.send({error: err, status: 'failure'})
        return console.log(err);
      }
      Student.findByIdAndUpdate(req.body.studentid, { $pull: { documents: req.params.id } })
      .exec(function(err) {
        if (err) {
          res.send({error: err, status: 'failure'})
          return console.log(err);
        }
        recalculateRatings(req.body.studentid, function(newstudd) {
          res.send({status: 'success', ratingsvisual: compiledRatingsDisplay({student: newstudd})})
        })

      })
    })
    // ищем студента, к которому был привязан документ (его айди присылает клиент)
    // и удаляем ссылку на документ из массива

  })
})

router.delete('/deletefile/:id', middlewares.reqlogin,
 sanitize('fileid').trim().escape(),
 function(req, res) {

    File.findByIdAndRemove(req.body.fileid, function(err, file) {
      if (err) return res.send({error: err, status: 'failure'})
      documentmodels.Document.findByIdAndUpdate(req.params.id, { $pull: { files: file._id } })
      .exec(function(err) {
        if(err) {
          res.send({error: err, status: 'failure'})
          return console.log(err)
        }
        gd.jwtClient().authorize(function (err, tokens) {
         if (err) {
           console.log(err);
           return;
         } else {
           let drive = gd.google().drive('v3');
           drive.files.delete({
              auth: gd.jwtClient(),
              fileId: file.id
           }, function (err, response) {
              if (err) {
                  console.log('The API returned an error: ' + err);
                  return res.send({error: err, status: 'failure'})
              }
              res.send({status: 'success'})
              ServerInfo.findOneAndUpdate({'name': 'driveUsageEstimate'}, { $inc: {valueNumber: -parseInt(file.size)}}, function(err) {if(err) console.log(err)})

           });
         }
        })

      })
    })

})



router.post('/fileupload/:id', middlewares.reqlogin, function(req, res) {
  if (!req.files)
    return res.status(400).send({nice: "not nice"});
  // обрабатываем имя файла, удаляя спецсимволы и прочее
  var newname = sanitizefilename(req.files.files.name)
  var fileSize = req.files.files.data.byteLength;
  const { Readable } = require('stream');
  const stream = new Readable();
  stream.push(req.files.files.data);
  stream.push(null);

  var fileMetadata = {
    'name': newname,
    parents: ['1szwMA0l3yJK0ZGqL31x9Mc7XgRgKHXjt']
  };
  var media = {
    mimeType: req.files.files.mimetype,
    body: stream
  };
  gd.jwtClient().authorize(function (err, tokens) {
   if (err) {
     console.log(err);
     return res.send(err);
   } else {
     let drive = gd.google().drive('v3');
     drive.files.create({
       auth: gd.jwtClient(),
       resource: fileMetadata,
       media: media,
       fields: 'id, webViewLink'
     }, function (err, file) {
       if (err) {
         // Handle error
         console.error(err);
         return res.send(err);
       } else {
         var newfile = new File({
           id: file.data.id,
           name: newname,
           url: file.data.webViewLink,
           size: fileSize
         })
         newfile.save(function(err) {
           if (err) {return console.log(err)}
           documentmodels.Document.findByIdAndUpdate(req.params.id, { $push: { files: newfile._id } })
           .exec(function(err) {
             if (err) {
               res.send({error: err, status: 'failure'})
               return console.log(err);
             }
             res.send({nice: "nice", docid: req.params.id, filename: newname, visual: compiledFileEntry({document: {_id: req.params.id}, file: newfile, filesize: filesize})})
             ServerInfo.findOneAndUpdate({'name': 'driveUsageEstimate'}, { $inc: {valueNumber: parseInt(newfile.size)}}, {upsert: true}, function(err) {if(err) console.log(err)})
           })
         })

       }
     });
   }
  })

})

module.exports = function(viewspath){
    compiledDocument = pug.compileFile(path.join(viewspath, 'includes/document.pug'));
    compiledFileEntry = pug.compileFile(path.join(viewspath, 'includes/file-entry.pug'));
    compiledRatingsDisplay = pug.compileFile(path.join(viewspath, 'includes/ratings-display.pug'));
    return router;
}
