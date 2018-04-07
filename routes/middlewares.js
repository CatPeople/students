module.exports = {
  // функции использующиеся для запросов, требующих логина
  reqlogin: function (req, res, next) { // требует логина под админом
    if (req.session && req.session.userId == "5aaad9cef86881299850be7b") {
      return next();
    } else {
      var err = new Error('Unauthorized.');
      err.status = 401;
      err.stack = ''
      return next(err);
    }
  },

  reqcommonlogin: function (req, res, next) { // требует любого логина
    if (req.session && req.session.userId) {
      return next();
    } else {
      var err = new Error('Unauthorized.');
      err.status = 401;
      err.stack = ''
      return next(err);
    }
  }

}
