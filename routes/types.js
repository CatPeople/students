var express = require('express');
var router = express.Router();
const fs = require('fs');
var Type = require('../models/type')
var middlewares = require("./middlewares")

const { check, validationResult } = require('express-validator/check');
const { matchedData, sanitize } = require('express-validator/filter');



// список типов
router.get('/', middlewares.reqlogin, function(req, res, next) {
  Type.find()
  .exec(function(err, list_types) {
    if (err) { return console.log(err); }
      res.render('types_list', {userid: req.session.userId, types_list: list_types});
  })

});

// форма редактирования типа
router.get('/edit/:id', middlewares.reqlogin, function(req, res) {
  Type.findById(req.params.id)
  .exec(function(err, type_data) {
    if (err) {console.log (err);}
    res.render('newtype_form', {userid: req.session.userId, type: type_data, header: "Редактирование типа", request_url: '/types/edit/'+type_data._id});
  })
})

// запрос на редактирование типа
router.post('/edit/:id', middlewares.reqlogin, [
  function(req, res, next) {
    if (!Array.isArray(req.body.fields)) {
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
      // обновляем тип
      Type.update({ _id: req.params.id }, { $set: { name: req.body.name, fields: req.body.fields }}, function(err){
        if (err){
          errors.push({param: 'general', msg: 'DB Error'})
          res.send({errors: errors, status: 'failure'})
          return console.log(err);
        }
        res.send({errors: errors, status: 'Успешно'})
      });
    }
}])

// удаление типа
router.delete('/delete/:id', middlewares.reqlogin, function(req, res) {
  Type.findByIdAndRemove(req.params.id, function(err) {
    if (err){
      res.send({error: err, status: 'failure'})
      return console.log(err);
    }
    res.send({status: 'success'})
  })
})

module.exports = router;
