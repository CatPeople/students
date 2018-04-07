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

const { check, validationResult } = require('express-validator/check');
const { matchedData, sanitize } = require('express-validator/filter');


/* GET users listing. */
router.get('/', middlewares.reqlogin, function(req, res, next) {
  var page = 1;
  console.log(req.body)
  if (req.body.page) {
    page = parseInt(req.body.page)
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

      res.render('student_list', {userid: req.session.userId, student_list: list_students.docs, pagestotal: list_students.pages, grouplist: grouplist});
    })
  })


});
//sort: {'group.name': -1}
router.get('/page/ajax/:page', middlewares.reqlogin,
sanitize('name').trim().escape(),
sanitize('studentname').trim().escape(),
function(req, res, next) {
  var page = req.params.page;
  if (req.params.page) {
    page = parseInt(req.params.page)
  }
  if (req.query.studentname) {
  var lastName;
  var firstName;
  var patronymic;
  var splitsearch = req.query.studentname.split(' ', 3)
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
  if (req.query.studentname && req.query.name) {
    Student.paginate({$or:[{'name.firstName':{$regex: req.query.studentname, $options: 'i'}},{'name.lastName':{$regex: req.query.studentname, $options: 'i'}}, {'name.patronymic':{$regex: req.query.studentname, $options: 'i'}}], 'group.name': req.query.name}, {page: page, limit: 15, sort: {'name.lastName': 1}}, function(err, list_students) {
      if (err) { return console.log(err); }
      res.render('student_list', {student_list: list_students.docs, pagestotal: list_students.pages, pageturn: true, page: page});
    })
  }
  else
  if (req.query.studentname) {
    Student.paginate({$or:[{'name.firstName':{$regex: req.query.studentname, $options: 'i'}},{'name.lastName':{$regex: req.query.studentname, $options: 'i'}}, {'name.patronymic':{$regex: req.query.studentname, $options: 'i'}}]}, {page: page, limit: 15, sort: {'name.lastName': 1}}, function(err, list_students) {
      if (err) { return console.log(err); }
      res.render('student_list', {student_list: list_students.docs, pagestotal: list_students.pages, pageturn: true, page: page});
    })
  }
  else
  if (req.query.name) {
  Student.paginate({'group.name': req.query.name}, {page: page, limit: 15, sort: {'name.lastName': 1}}, function(err, list_students) {
    if (err) { return console.log(err); }
    res.render('student_list', {student_list: list_students.docs, pagestotal: list_students.pages, pageturn: true, page: page});
  })
}
else {
  Student.paginate({}, {page: page, limit: 15, sort: {'name.lastName': 1}}, function(err, list_students) {
    if (err) { return console.log(err); }
    res.render('student_list', {student_list: list_students.docs, pagestotal: list_students.pages, pageturn: true, page: page});
  })
}

});

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
check('firstname', 'First name cannot be empty').isLength({min: 1, max: 100}).trim(),
check('lastname', 'Last name cannot be empty').isLength({min: 1, max: 100}).trim(),
check('patronymic', 'Patronymic cannot be empty').isLength({min: 1, max: 100}).trim(),
check('group', 'Group cannot be empty').isLength({min: 1, max: 100}).trim(),
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

router.get('/:id', middlewares.reqlogin, function(req, res, next) {
  async.parallel([function(callback){
  Student.findById(req.params.id)
  .populate('documents')
  .exec(function(err, student_data) {
    if (err) {next(err); return console.log (err);}
    callback(null, student_data);

  })
},
function(callback) {
  Type.find()
  .exec(function(err, list_types) {
    if (err) { return console.log(err); }
    callback(null, list_types)
  })
}
], function(err, results) {
  if (err) { return console.log(err); }
  res.render('student_a', {userid: req.session.userId, student: results[0], types: results[1], request_url: "/student/"+results[0]._id});
})
})

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
  check('fields.*', 'A field cannot be empty').isLength({min: 1, max: 100}).trim(),
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
        var newdoc = new Document({type: req.body.typename});
        for (var i = 0; i < req.body.names.length; i++) {
          var newpair = {field: req.body.names[i], value: req.body.fields[i]}
          newdoc.content.push(newpair);
        }
        newdoc.save(function(err, thedoc) {
          if (err){
            errors.push({param: 'general', msg: 'DB Error'})
            res.send({errors: errors, status: 'failure'})
            return console.log(err);
          }
          Student.findByIdAndUpdate(req.params.id, { $push: { documents: thedoc._id } })
          .exec(function(err) {
            if (err) {
              errors.push({param: 'general', msg: 'DB Error'})
              res.send({errors: errors, status: 'failure'})
              return console.log(err);
            }
            res.send({errors: errors, status: 'Document created', id: thedoc._id})

          })

        })

    }
}])

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
  check('fields.*', 'A field cannot be empty').isLength({min: 1, max: 100}).trim(),
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
      Document.update({ _id: req.params.id }, { $set: { type: req.body.typename, content: newcontent }}, function(err) {
        if (err){
          errors.push({param: 'general', msg: 'DB Error'})
          res.send({errors: errors, status: 'failure'})
          return console.log(err);
        }
        res.send({id:req.params.id, errors: errors, status: 'Update successful'})
      });

    }
}])

router.post('/editstudent/:id', middlewares.reqlogin, [
  check('firstname').exists(),
  check('lastname').exists(),
  check('patronymic').exists(),
  check('group').exists(),
  check('firstname', 'First name cannot be empty').isLength({min: 1, max: 100}).trim(),
  check('lastname', 'Last name cannot be empty').isLength({min: 1, max: 100}).trim(),
  check('patronymic', 'Patronymic cannot be empty').isLength({min: 1, max: 100}).trim(),
  check('group', 'Group cannot be empty').isLength({min: 1, max: 100}).trim(),
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
      var graduated = false;
      if (req.body.graduated) {graduated = true}
      var newname = {firstName: req.body.firstname, lastName: req.body.lastname, patronymic: req.body.patronymic}
      Student.findByIdAndUpdate(req.params.id, { $set: { name: newname, 'group.name': req.body.group, graduated: graduated } }, {new: true})
      .exec(function(err, student) {
        if (err){
          errors.push({param: 'general', msg: 'DB Error'})
          res.send({errors: errors, status: 'failure'})
          return console.log(err);
        }
        res.send({body: req.body, degree: student.degree, year: student.year, errors: errors, status: 'success'})
      })

    }
}])

router.delete('/delete/:id', middlewares.reqlogin, function(req, res) {
  Student.findByIdAndRemove(req.params.id, function(err, student) {
    if (err){
      res.send({error: err, status: 'failure'})
      return console.log(err);
    }
    if (student.documents) {
      async.eachSeries(student.documents, function updateObject (obj, done) {
        Document.findByIdAndRemove(obj, function(err) {
          if (err){
            done();
            return console.log(err);
          }
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
  Document.findByIdAndRemove(req.params.id, function(err) {
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
      rimraf(__dirname +'/../public/docs-storage/'+req.params.id, function() {})
      res.send({status: 'success'})
    })
  })
})

router.delete('/deletefile/:id', middlewares.reqlogin, function(req, res) {
    var filename = sanitizefilename(req.body.filename)
    Document.findByIdAndUpdate(req.params.id, { $pull: { files: filename } })
    .exec(function(err) {
      if(err) {
        res.send({error: err, status: 'failure'})
        return console.log(err)
      }
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
  //console.log(req.files.files.name);
  var newname = sanitizefilename(req.files.files.name)
  mkdirp(__dirname +'/../public/docs-storage/'+req.params.id, function(err) {
    if (err) {
      console.log(err)
      return res.send(err);
    }
    fs.access(__dirname +'/../public/docs-storage/'+req.params.id+'/'+newname, function(err) {
      if (err && err.code === 'ENOENT') {
      }
      else {
        newname = randomstring.generate(4)+'-'+newname
      }
      req.files.files.mv(__dirname +'/../public/docs-storage/'+req.params.id+'/'+newname, function(err) {
        if (err) {
          console.log(err)
          return res.send(err);
        }
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
