var express = require('express');
var router = express.Router();

var Student = require('../models/student')
var Type = require('../models/type')
var Document = require('../models/document')
var async = require("async");
const fs = require('fs');
var mkdirp = require('mkdirp');
var randomstring = require("randomstring");
var rimraf = require("rimraf");
var middlewares = require("./middlewares")
var sanitizefilename = require("sanitize-filename");
var pug = require('pug');
var pdf = require('html-pdf');


const { check, validationResult } = require('express-validator/check');
const { matchedData, sanitize } = require('express-validator/filter');



// список студентов
router.get('/', middlewares.reqlogin, function(req, res, next) {
  var page = 1; // по умолчанию первая страница
  console.log(req.body)
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

      res.render('student_list', {userid: req.session.userId, student_list: list_students.docs, pagestotal: list_students.pages, grouplist: grouplist});
    })
  })


});


// запрос на переключение страницы и одновременно поиск
router.get('/page/ajax/:page', middlewares.reqlogin,
sanitize('name').trim().escape(), // имя группы
sanitize('studentname').trim().escape(), // имя студента
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
  console.log(splitsearch)
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
  console.log('Lastname: '+lastName);
  console.log('Firstname: '+firstName);
  console.log('patronymuc: '+patronymic);
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
      res.render('student_list', {student_list: list_students.docs, pagestotal: list_students.pages, pageturn: true, page: page});
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
      res.render('student_list', {student_list: list_students.docs, pagestotal: list_students.pages, pageturn: true, page: page});
    })
  }
  else
  if (req.query.name) { // идет поиск только по имени группы, поэтому запрос простой
  Student.paginate({'group.name': req.query.name}, {page: page, limit: 15, sort: {'name.lastName': 1}}, function(err, list_students) {
    if (err) { return console.log(err); }
    res.render('student_list', {student_list: list_students.docs, pagestotal: list_students.pages, pageturn: true, page: page});
  })
}
else { // нет никаких поисков, клиент просто нажал перевернуть страницу
      // поисковый запрос пустой - {}, т.е. база ищет всех студентов
      // после пустого поискового запроса {} идет объект с опциями для функции paginate из модуля mongoosePaginate
      // она делит результат по 15, сортирует, разделяет на страницы, и возвращает список студентов с определенной страницы
      // страница была взята из запроса еще в самом начале этой всей длинной функции
  Student.paginate({}, {page: page, limit: 15, sort: {'name.lastName': 1}}, function(err, list_students) {
    if (err) { return console.log(err); }
    res.render('student_list', {student_list: list_students.docs, pagestotal: list_students.pages, pageturn: true, page: page});
  })
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

      res.render('student_list', { userid: req.session.userId, student_list: list_students.docs, page: page, pagestotal: list_students.pages, grouplist: grouplist});
    })
  })

});

router.get('/newstudent/create', middlewares.reqlogin, function(req, res, next) {
  res.render('newstudent', {userid: req.session.userId});
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
    res.render('newstudent', {userid: req.session.userId});

});

// отображение страницы студента, к примеру /student/5abf979c99fbeb259501d172
// этот запрос может использовать только админ
// плебеи получают страницу студента в запросе /search
router.get('/:id', middlewares.reqlogin, function(req, res, next) {
  // запускаем две функции поиска параллельно друг другу
  // и ждем, пока обе выполнятся
  async.parallel([function(callback){
  Student.findById(req.params.id) // поиск студента по id
  .populate('documents') // заполняем ссылки на документы объектами документов
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
}
], function(err, results) { // обе функции выполнились, results[0] данные студента, results[1] данные всех типов
  if (err) { return console.log(err); }
  res.render('student_a', {userid: req.session.userId, student: results[0], types: results[1], request_url: "/student/"+results[0]._id});
})
})

// запрос на пдф файл, могут пользоваться и админ, и плебеи
router.get('/printable/:id.pdf', middlewares.reqcommonlogin, function(req, res, next) {
  Student.findById(req.params.id) //ищем студента
  .populate('documents')
  .exec(function(err, student_data) {
    if (err) {next(err); return console.log (err);}
    // генерируем хтмл из специального шаблона
    var html = pug.renderFile('views/student_printable.pug', {userid: req.session.userId, student: student_data, request_url: "/student/"+student_data._id});
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
  check('fields.*', 'Поле не может быть пустым').isLength({min: 1, max: 100}).trim(),
  check('names.*').isLength({min: 1, max: 100}).trim(),
  check('typename').isLength({min: 1, max: 100}).trim(),
  sanitize('fields.*').trim().escape(),
  sanitize('names.*').trim().escape(),
  sanitize('typename').trim().escape(),
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
        var newdoc = new Document({type: req.body.typename});
        for (var i = 0; i < req.body.names.length; i++) {
          // создаем пары имя-значение и толкаем их в массив content нового документа
          var newpair = {field: req.body.names[i], value: req.body.fields[i]}
          newdoc.content.push(newpair);
        }
        // сохраняем документ в базу, возвращаем объект документа в переменную thedoc
        newdoc.save(function(err, thedoc) {
          if (err){
            errors.push({param: 'general', msg: 'DB Error'})
            res.send({errors: errors, status: 'failure'})
            return console.log(err);
          }
          // находим студента по айди и толкаем в его массив документов ссылку на документ
          Student.findByIdAndUpdate(req.params.id, { $push: { documents: thedoc._id } })
          .exec(function(err) {
            if (err) {
              errors.push({param: 'general', msg: 'DB Error'})
              res.send({errors: errors, status: 'failure'})
              return console.log(err);
            }
            // успех, отправляем клиенту айди нового документа для создания ссылок и т.п.
            res.send({errors: errors, status: 'Документ создан', id: thedoc._id})

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
  check('fields.*', 'Поле не может быть пустым').isLength({min: 1, max: 100}).trim(),
  check('names.*').isLength({min: 1, max: 100}).trim(),
  check('typename').isLength({min: 1, max: 100}).trim(),
  sanitize('fields.*').trim().escape(),
  sanitize('names.*').trim().escape(),
  sanitize('typename').trim().escape(),
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
      var newcontent = []
      for (var i = 0; i < req.body.names.length; i++) {
        var newpair = {field: req.body.names[i], value: req.body.fields[i]}
        newcontent.push(newpair);
      }
      // ищем документ по айди и полностью обновляем его содержимое
      Document.update({ _id: req.params.id }, { $set: { type: req.body.typename, content: newcontent }}, function(err) {
        if (err){
          errors.push({param: 'general', msg: 'DB Error'})
          res.send({errors: errors, status: 'failure'})
          return console.log(err);
        }
        res.send({id:req.params.id, errors: errors, status: 'Успешно'})
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
      Student.findByIdAndUpdate(req.params.id, { $set: { name: newname, 'group.name': req.body.group, graduated: graduated } }, {new: true}) // new: true значит, что функция вернет обратно уже обновленного студента
      .exec(function(err, student) {
        if (err){
          errors.push({param: 'general', msg: 'DB Error'})
          res.send({errors: errors, status: 'failure'})
          return console.log(err);
        }
        // отправляем клиенту новый год обучения, степень и прочее
        res.send({body: req.body, degree: student.degree, year: student.year, errors: errors, status: 'success'})
      })

    }
}])

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
        Document.findByIdAndRemove(obj, function(err) {
          if (err){
            done();
            return console.log(err);
          }
            // и папку с файлами, привязанными к этому документу
            rimraf(__dirname +'/../public/docs-storage/'+obj, function() {})
            done();
        })
      }, function allDone (err) {
          console.log('all done')
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
  Document.findByIdAndRemove(req.params.id, function(err) {
    if (err){
      res.send({error: err, status: 'failure'})
      return console.log(err);
    }
    // ищем студента, к которому был привязан документ (его айди присылает клиент)
    // и удаляем ссылку на документ из массива
    Student.findByIdAndUpdate(req.body.studentid, { $pull: { documents: req.params.id } })
    .exec(function(err) {
      if (err) {
        res.send({error: err, status: 'failure'})
        return console.log(err);
      }
      // удаляем папку с файлами
      rimraf(__dirname +'/../public/docs-storage/'+req.params.id, function() {})
      res.send({status: 'success'})
    })
  })
})

router.delete('/deletefile/:id', middlewares.reqlogin, function(req, res) {
    var filename = sanitizefilename(req.body.filename)
    // ищем документ, к которому привязан файл и вытаскиваем файл из массива с именами файлов
    Document.findByIdAndUpdate(req.params.id, { $pull: { files: filename } })
    .exec(function(err) {
      if(err) {
        res.send({error: err, status: 'failure'})
        return console.log(err)
      }
      // удаляем файл из файловой системы
      fs.unlink(__dirname +'/../public/docs-storage/'+req.params.id+'/'+filename, function(err) {
        if(err) {
          res.send({error: err, status: 'failure'})
          return console.log(err)
        }
        res.send({status: 'success'})
      })

    })

})

router.post('/fileupload/:id', middlewares.reqlogin, function(req, res) {
  if (!req.files)
    return res.status(400).send({nice: "not nice"});
  // обрабатываем имя файла, удаляя спецсимволы и прочее
  var newname = sanitizefilename(req.files.files.name)
  // создаем папку для файлов документа с этим айди, если ее нет
  mkdirp(__dirname +'/../public/docs-storage/'+req.params.id, function(err) {
    if (err) {
      console.log(err)
      return res.send(err);
    }
    // смотрим есть ли там уже файл с таким именем
    fs.access(__dirname +'/../public/docs-storage/'+req.params.id+'/'+newname, function(err) {
      if (err && err.code === 'ENOENT') { // нет файла, ничего не делаем
      }
      else { // файл уже есть, прибавляем 4 рандомных символа
        newname = randomstring.generate(4)+'-'+newname
      }
      // двигаем загруженный файл в папку документа
      req.files.files.mv(__dirname +'/../public/docs-storage/'+req.params.id+'/'+newname, function(err) {
        if (err) {
          console.log(err)
          return res.send(err);
        }
        // добавляем имя файла в массив файлов документа в базе
        Document.findByIdAndUpdate(req.params.id, { $push: { files: newname } })
        .exec(function(err) {
          if (err) {
            res.send({error: err, status: 'failure'})
            return console.log(err);
          }
          res.send({nice: "nice", docid: req.params.id, filename: newname})
        })

      })
    })


  });



})
module.exports = router;
