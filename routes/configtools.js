var fs = require('fs')

module.exports = {
  refreshScopes: function () {
    var documentmodels = require(appRoot+'/models/document')
    fs.readFile(appRoot+'/config.json', function(err, data) {
      if (err) {console.log(err); process.exit(1);}
      configread = JSON.parse(data)
      var freshScopes = configread.scopes.slice(0);
      documentmodels.Scope.find()
      .exec(function(err, scopeslist) {
        if (err) {return console.log(err)}
        scopeslist.forEach(function(scop) {
          if (freshScopes.includes(scop.name)) {
            var index = freshScopes.indexOf(scop.name);
            freshScopes.splice(index, 1);
          }
          else {
            documentmodels.Document.find({'scope': scop._id}, function(err, result) {
              if (result.length > 0) {
                configread.scopes.push(scop.name)
                var content = JSON.stringify(configread, null, 4);
                fs.writeFile(appRoot+'/config.json', content, 'utf8', function (err) {
                    if (err) {
                        return console.log(err);
                    }
                });
              }
              else {
                documentmodels.Scope.findByIdAndRemove(scop._id, function(err) {if(err)console.log(err);
                  documentmodels.Scope.find()
                  .exec(function(err, scopeslist) {
                    if (err) {return console.log(err)}
                    scopeslist_local = scopeslist;
                  })
                })
              }
            })
          }
        })
        freshScopes.forEach(function(scope) {
          var newscope = new documentmodels.Scope();
          newscope.name = scope;
          newscope.save(function(err) {if (err) console.log(err)
            documentmodels.Scope.find()
            .exec(function(err, scopeslist) {
              if (err) {return console.log(err)}
              scopeslist_local = scopeslist;
            })
          })
        })
      })
    })
  },
  writeNew: function(arrToWrite) {
    fs.readFile(appRoot+'/config.json', function(err, data) {
      if (err) {console.log(err); process.exit(1);}
      configread = JSON.parse(data)
      configread.scopes = arrToWrite;
      var content = JSON.stringify(configread, null, 4);
      fs.writeFile(appRoot+'/config.json', content, 'utf8', function (err) {
          if (err) {
              return console.log(err);
          }
          module.exports.refreshScopes();
      });
    })
  }
}
