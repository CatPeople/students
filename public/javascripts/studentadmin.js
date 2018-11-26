$(document).ready(function(){


  $('body').on('click', '.student-document-more-link', function() {
    $(this).parent().parent().next().fadeToggle()
  })
  var editingmode = false;
  var ratingsvisual = $('.student-ratings')

  $('.student-document-more').each(function(element){$(this).hide()}) // скрываем все подробности документов
  const $form = $('form') // для создания и редактирования документа используется одна и та же форма
  $('.add-document-link').click(function() { // клик по кнопке добавить документ
    $('.add-doc-container').appendTo('.add-doc-container-container')
    $('#cancel_button').hide(); // прячем кнопку "отмена" (она доступна только у редактирования)
    if (divBeingEdited) { // если в данный момент происходит редактирование
      divBeingEdited = null // очищаем переменную
      var zeroOption = $form.find('option').eq(0) // нулевой элемент в выпадающем списке (где выбирается тип)
      $('.add-doc-container').hide() // прячем контейнер с формой
      $('.add-doc-container').css('display', 'block')
      zeroOption.html('Выберите тип') // делаем нулевой элемент как он был по умолчанию
      zeroOption.val(null)
      zeroOption.data('fields', null)
      $form.data('request_url', $form.attr('data-request_url')) // меняем адрес для запроса на адрес по умолчанию
      // это выглядит похоже на две одинаковые переменные, но на самом деле в
      // $form.data('request_url') содержится адрес, который мы в этом скрипте обновляем при надобности
      // а в $form.attr('data-request_url') содержится адрес, который был по умолчанию в этой форме
      // при загрузке страницы. Все data атрибуты изначально поставляются из шаблона с сервера
      $form.children('select').prop('selectedIndex',0); // выбираем нулевой элемент
      $form.children('select').trigger('change') // триггерим обработчик, который срабатывает при смене элемента в
                                                  // выпадающем списке (он есть где-то ниже)
      $('.add-doc-container').fadeIn(); // показываем форму
    }
    else { // ничего в данный момент не редактируется, значит форма в нужном месте и с нужными значениями
    $('.add-doc-container').fadeToggle(); // показать/скрыть
    }
  })

  $('#cancel_button').click(function() { // клик по кнопке отмены (при редактировании)
    $('.add-document-link').trigger('click'); // триггерим обработчик клика по кнопке добавления документа (тот, что выше)
    $('.add-doc-container').hide(); // скрываем форму
  })

  var studentid = $('.student-documents').data('id'); //все data-атрибуты у разных элементов устанавливаются в шаблоне на сервере
  var divBeingEdited = null;

      $('body').on('click', '.document-delete-link', function() {
          if (window.confirm("Вы уверены?")) {
              $('#cancel_button').trigger('click');
              $(this).find('svg').replaceWith("<i class='fas fa-spinner fa-spin' style='font-size: 20px; color: red; margin-left: 5px;'></i>")
              $.ajax({
                url: $(this).data('url'), // адрес запроса
                type:'DELETE',
                data: {studentid: studentid} // содержимое запроса, нужен только айди студента,
                                              // потому что айди документа уже есть в адресе запроса
              }).done(response => {
                if(response['status'] == 'success') {
                  $(this).parent().parent().parent().fadeOut(400, function() {$(this).remove()})
                  ratingsvisual.html(response.ratingsvisual)
                }
                else {
                  alert(response['error'])
                }
              })


          }
      });
      $('body').on('click', '.file-delete-link', function() {
          if (window.confirm("Вы уверены?")) {

              var filename = $(this).parent().find('a').html()
              $(this).find('svg').replaceWith("<i class='fas fa-spinner fa-spin' style='font-size: 20px; color: red; margin-left: 5px;'></i>")
              $.ajax({
                url: $(this).data('url'),
                type:'DELETE',
                data: {fileid: $(this).data('fileid')}
              }).done(response => {
                if(response['status'] == 'success') {
                  $(this).parent().fadeOut(400, function() {$(this).remove()})
                }
                else {
                  alert(response['error'])
                }
              })
          }
      });
      $('body').on('click', '.document-edit-link', function() { // клик по редактированию документа
        divBeingEdited = $(this).parent().parent().parent() // сохраняем ссылку на див с данными в переменную
        var zeroOption = $form.find('option').eq(0) // нулевая опция в списке
        var originalTypeName = divBeingEdited.find('.student-document-more-link-text').html() // сохраняем оригинал имени типа
        $(this).parent().parent().next().show(); // показываем подробности документа, если скрыты
        $('.add-doc-container').show() // показываем форму, если скрыта
        $('.add-doc-container').appendTo(divBeingEdited.find('.form-slot')) // переносим форму
        /*
        $('.add-doc-container').css('display', 'inline-block') // меняем ксс чтобы они стояли рядом друг с другом
        $('.add-doc-container').css('padding-right', '20px')
        divBeingEdited.find('.student-document-more').css('display', 'inline-block')
        divBeingEdited.find('.student-document-more').css('vertical-align', 'top')
        */
        zeroOption.html(originalTypeName+' (original)') // меняем имя нулевой опции в выпадающем списке
        zeroOption.val(originalTypeName) // меняем значение нулевой опции, которое будет отправлено серверу в качестве типа документа (без слова original)
        zeroOption.data('fields', JSON.parse(divBeingEdited.find('.student-document').attr('data-names'))) // сохраняем в data-fields нулевой опции имена полей
                                                                                // которые у каждого дива документа изначально записаны в data-names в формате ['вот', 'таком'] как строка
                                                                                // функция JSON.parse делает из строки настоящий массив
                                                                                // все это делается для того, чтобы при нажатии на другие типы
                                                                                // а потом снова на оригинальный тип, вернулись оригинальные поля
        $form.data('request_url', $(this).data('url'))
        $form.children('select').prop('selectedIndex',1);
        $form.children('select').prop('selectedIndex',0); // устанавливаем выбранную опцию на нулевую
        $form.children('select').trigger('change') // триггерим обработчик смены опции, который создает поля
        $form.find('#select-scope').val(divBeingEdited.find('.scope-display-value').html())
        $form.find('#rating').val(parseInt(divBeingEdited.find('.rating-display').html()))
        $('.document-creation-field-input').each(function(index) {
          // заполняем оригинальные значения полей, для удобства
          $(this).val(divBeingEdited.find('.student-document-more').find('.document-field-value').eq(index).html())
        })
        $('#cancel_button').show(); // показываем кнопку отмены
      });
      $('body').on('click', '.cancel-upload-link', function() { // клик по кнопке отмены загрузки файла
        var uploadid = $(this).parent().data('uploadid')
        for (var i = 0; i < pendingList.length; i++) { // ищем файл в pendingList и удаляем
          if (pendingList[i].uploadid == uploadid) {
            pendingList.splice(i, 1)
          }
        }
        $(this).parent().fadeOut(300, function() { $(this).remove(); }) // убираем текст с именем файла и крестиком
      })
      $('#student-name-edit-link').click(function() { // редактирование студента
        $(this).hide(); // скрываем карандаш
        $('.student-data').hide(); // скрываем данные студента
        $('.glass').show(); // показываем бокал
        // создаем целую новую форму
        $("<form class='pure-form' id='student-form' method='POST' action=''><span class='error'></span><div class='student-form-field'>Фамилия: <input type='text' autocomplete='off' name='lastname' value='"+$(this).parent().data('lastname')+"'> <span class='error'></span></div>"+
        "<div class='student-form-field'>Имя: <input type='text' autocomplete='off' name='firstname' value='"+$(this).parent().data('firstname')+"'> <span class='error'></span></div>"+
        "<div class='student-form-field'>Отчество: <input type='text' autocomplete='off' name='patronymic' value='"+$(this).parent().data('patronymic')+"'> <span class='error'></span></div>"+
        "<div class='student-form-field'>Группа: <input type='text' autocomplete='off' name='group' value='"+$(this).parent().data('group')+"'> <span class='error'></span></div>"+
        "<div class='student-form-field'>Выпустился: <input type='checkbox' id='graduatedcheckbox' name='graduated' value='true' "+(($('.student-data-year').html() == 'Выпустился') ? 'checked' : '')+"></div>"+
        "<button class='pure-button pure-button-primary' id='submit-student-form' type='button'>Подтвердить</button><button class='pure-button' type='button' id='student-form-cancel'>Отмена</button></form>").appendTo($('.student-data-container'))
      })
      $('body').on('click', '#student-form-cancel', function() { // клик по отмене
        $('#student-form').remove();
        $('.student-data').show();
        $('.glass').hide();
        $('#student-name-edit-link').show()
      })
      $('body').on('click', '#submit-student-form', function() { // клик по подтверждению редактирования студента
        var studentData = 0; // не знаю зачем это
        $('#student-form-cancel').prop('disabled', true); // отключаем кнопки
        $('#submit-student-form').prop('disabled', true);
        $('.submitspinner').show()
        $('#student-form').children('.error').html('') // очищаем ошибку, если была
        $.ajax({
          url: '/student/editstudent/'+$('h1').data('id'), // адрес запроса
          timeout: 10000,
          type:'POST',
          data: $('#student-form').serialize() // содержимое - данные из формы, которая была создана
        }).done(response => { // запрос прошел
          $('#student-form-cancel').prop('disabled', false); // включаем кнопки
          $('#submit-student-form').prop('disabled', false);
          $('.submitspinner').hide()
          if (response.errors.length != 0) { // ошибки
            for (var i = 0; i < response['errors'].length; i++) {
              if (response['errors'][i]['param'] == 'general') {
                $('#student-form').children('.error').html(response['errors'][i]['msg']).hide().fadeIn()
              }
              else{
                var fieldname = response['errors'][i]['param']
                $("input[name='"+fieldname+"']").parent().children('.error').html(response['errors'][i]['msg']).hide().fadeIn()
              }
            }
          }
          else { // нет ошибок
            $('.student-fullname').html(response.body.lastname+' '+response.body.firstname+' '+response.body.patronymic)
            $('h1').data('firstname', response.body.firstname)
            $('h1').data('lastname', response.body.lastname)
            $('h1').data('patronymic', response.body.patronymic)
            $('h1').data('group', response.body.group)
            $('.student-data-group').html(response.body.group)
            $('.student-data-degree').html(response.degree)
            $('.student-data-year').html(response.year)
            $('#student-form-cancel').trigger('click')
          }
        })
        .fail(function() {
          $('#student-form-cancel').prop('disabled', false);
          $('#submit-student-form').prop('disabled', false);
        })
      })
      $('#editing-mode-link').click(function() { // режим редактирования
        if (editingmode == false) {editingmode = true}
        else {editingmode = false}
        $('#student-form-cancel').trigger('click')
        $('#cancel_button').trigger('click')
        $('#student-name-edit-link').fadeToggle();
        $('.document-edit-link').each(function(element) {
          $(this).fadeToggle()
        })
        $('.document-delete-link').each(function(element) {
          $(this).fadeToggle()
        })
        $('.file-delete-link').each(function(element) {
          $(this).fadeToggle()
        })
      })
  var requesturl = $form.data('request_url');
  var pendingList = [];
  var filesInProgress = 0;
  var nextid = 0;
  var newvisualfiles;
  var sendAll = function (id, onlast) { // функция, при вызове которой начинают загружаться файлы
    // id - документ, к которому будут присоединены файлы, onlast - функция, которая будет вызвана, когда последний файл
      // был загружен
        filesInProgress = pendingList.length;
        pendingList.forEach(function (data) { //каждый файл в очереди
        data.context.children('.fa-spinner').show(); // показать крутилку
        data.url = 'fileupload/'+id // указать файлу адрес назначения
        data.onlast = onlast; // отправить ссылку на функцию, которая будет выполнена, если все файлы загружены
        data.submit(); }); // начать загрузку
        pendingList = []; // очистить очередь файлов на загрузку
    };


  $('#select-type').change(function() { // в выпадающем списке выбора типа документа была выбрана новая опция
    $('#fileupload').fileupload('destroy'); // отмена очереди загрузки файлов
    pendingList = [];
    filesInProgress = 0;
    $form.children('.success').html('') // очистка сообщений
    $form.children('.error').html('')
    $('#document-creation-area').html('') // очистка места для полей
    if($(this).find(':selected').data('fields')) { // если у выбранной опции есть data-fields
      var fields = $(this).find(':selected').data('fields') // присваиваем их переменной fields (теперь это массив с именами полей)
      $.each(fields, function(index, value) { // цикл по каждому элементу в этом массиве
        // создаем новый инпут
        $('#document-creation-area').append("<div class='document-creation-field'><span class='document-creation-field-name'>"+value+
        "</span> <input class='document-creation-field-input' autocomplete='off' type='text' placeholder='' name='fields'> <span class='error'></span></div>")
      })
      if (divBeingEdited && $(this).prop('selectedIndex') == 0) { // если что-то редактируется и выбран оригинальный тип
        // то заполняем инпуты оригинальными значениями
        $('.document-creation-field-input').each(function(index) {
          $(this).val(divBeingEdited.find('.student-document-more').find('.document-field-value').eq(index).html())
        })
      }
        // добавляем кнопку добавления файлов
        $('#document-creation-area').append("<div class='document-creation-files'><label class='filelabel' for='fileupload'>+ Добавить файлы в очередь +</label><br><input id='fileupload' style='opacity: 0' type='file' name='files' data-url='"+requesturl+"' multiple></div>")
        $(function () {
        $('#fileupload').fileupload({
        dataType: 'json',
        autoUpload: false,
        sequentialUploads: true,
        add: function (e, data) { // файл добавлен

            data.uploadid = nextid;
            nextid++;
            // создаем строку с именем и крестиком
            data.context = $("<div class='file-to-upload' data-uploadid='"+data.uploadid+"'>"+data.files[0].name+" <i class='fas fa-spinner fa-spin' style='display: none'></i> <a class='cancel-upload-link' href='javascript:void(0)'><i class='fas fa-times'></i></a></div>").appendTo('#document-creation-area')
            pendingList.push(data); // добавляем загрузку в очередь
        },
        done: function (e, data) { // файл загружен
            var icon = data.context.children('svg')
            icon.attr('data-icon', 'check');
            icon.removeClass('fa-spin');
            filesInProgress--;
            // добавляем ссылку на файл в контейнер с ссылками
            newvisualfiles.append(data.result.visual)

            if (filesInProgress == 0) { // если больше файлов нет
              data.onlast(); // вызываем функцию, которая присвоена, когда загружен последний файл
            }

        },
        fail: function (e, data) { // загрузка не удалась
          var icon = data.context.children('svg')
          icon.attr('data-icon', 'exclamation-triangle');
          icon.removeClass('fa-spin');
          filesInProgress--;
          if (filesInProgress == 0) {
            data.onlast();
          }
        }
        });
});
    $('#scope-and-rating').show()
    }
    else {$('#scope-and-rating').hide()}
    $('#select-scope').val('')
    $('#rating').val('')
  })

  if ($('#select-type').val() !="") {
    $('.add-doc-container').show();
    $('#select-type').trigger('change')
  }


  $form.on('submit', submitHandler)

  function submitHandler (e) { // большоооой обработчик формы создания/редактирования документа
    e.preventDefault()
    $(this).find('#form_submit').prop('disabled', true); // отключаем кнопку
    $('.submitspinner').show()
    var typename = $(this).children('select').val(); // берем имя типа из выбранного типа в выпадающем списке
    $(this).children('select').prop('disabled', true); // отключаем выпадающий список
    $('#fileupload').prop('disabled', true); // отключаем загрузку файлов
    var filesStatus;
    if (pendingList.length > 0) {
      if (divBeingEdited) {
        if (divBeingEdited.find('.file-link').length == 0)
        filesStatus = 'placeholder';
      }
      else {
        filesStatus = 'placeholder';
      }
    }
    var fieldsData = {studentid: studentid, typename: typename, names: [], filesStatus: filesStatus, fields: [], scope: $('#select-scope').val(), rating: $('#rating').val()}; // создаем объект с данными полей и названием типа
    $('.document-creation-field-name').each(function(){fieldsData.names.push($(this).html())}) // запихиваем туда имена
    $('.document-creation-field-input').each(function(){fieldsData.fields.push($(this).val())}) // запихиваем туда значения
    $('.error').each(function(){
      $(this).html('')
    })
    $(this).children('.success').html('')
    $(this).children('.error').html('')
    $.ajax({
      url: $(this).data('request_url'), //адрес меняется в других местах скрипта в зависимости от того, создается документ или редактируется
      timeout: 10000,
      type:'POST',
      dataType: 'json',
      traditional: true,
      data: fieldsData
    }).done(response => {
      var newvisual = $(response.visual)
      newvisualfiles = $(newvisual).find(".attached-files")
      var afterItsAllOver = function () { // создаем функцию, которая будет вызвана после создания документа
        // создаем новый блок с документом
        newvisual.appendTo('table')
        ratingsvisual.html(response.ratingsvisual)
        if (editingmode) { // если режим редактирования, то показываем всякие карандаши-урны
          newvisual.find('.document-edit-link').show()
          newvisual.find('.document-delete-link').show()
        }
        if (editingmode) {
          newvisual.find('.file-delete-link').each(function(element) {$(this).show()})
        }

        $form.children('select').prop('selectedIndex',0); // сбрасываем форму
        $form.children('select').trigger('change')
        $form.children('.success').html('')
        $('.add-doc-container').hide()

      }
      var afterEditingIsOver = function () { // создаем функцию, которая будет вызвана после редактирования документа
      $('.add-doc-container').appendTo('.add-doc-container-container') // переносим форму вниз
      divBeingEdited.replaceWith(newvisual)
      ratingsvisual.html(response.ratingsvisual)
        if (editingmode) {
          newvisual.find('.document-edit-link').show()
          newvisual.find('.document-delete-link').show()
          newvisual.find('.file-delete-link').each(function(element) {$(this).show()})
        }

        $('#cancel_button').trigger('click')
        $form.children('.success').html('')
        $('.add-doc-container').hide()
      }
      if(response['errors'].length != 0) { // ошибки
        $form.find('#form_submit').prop('disabled', false); // включаем кнопки
        $form.children('select').prop('disabled', false);
        $('.submitspinner').hide()
        $('#fileupload').prop('disabled', false);
        for (var i = 0; i < response['errors'].length; i++) { // пишем ошибки в нужных местах
          if (response['errors'][i]['param'] == 'general') {
            $(this).children('.success').attr('class', 'error')
            $(this).children('.error').html(response['errors'][i]['msg']).hide().fadeIn()
          }
          else{
            var fieldname = response['errors'][i]['param']
            var matches = fieldname.match(/\[(.*?)\]/);
            if (matches) {
              $($("input[name='fields']")[matches[1]]).parent().children('.error').html(response['errors'][i]['msg']).hide().fadeIn()
              }

          }

        }
      }
      else { // ошибок не было
        $(this).children('.error').attr('class', 'success')
        $(this).children('.success').html(response['status']).hide().fadeIn() // пишем что все ок
        if (pendingList.length > 0) { // если есть файлы в очереди
          $(this).children('.success').append("<div class='fileupload-status-text'>Загрузка файлов...</div>")
          if (divBeingEdited) { // если редактируем документ
            sendAll(response.id, function() { // начинаем загрузку файлов в документ, айди которого прислал нам сервер
              // после загрузки последнего файла выполнится эта функция
              afterEditingIsOver(); // и эта (мы создали ее выше)
              $form.find('#form_submit').prop('disabled', false);
              $form.children('select').prop('disabled', false);
              $('#fileupload').prop('disabled', false);
              $('.submitspinner').hide()
            });
          }
          else { // не редактируем, а создаем
            sendAll(response.id, function() {
              // все то же самое, только финальная функция другая, которая создает новый блок с документом
              afterItsAllOver();
              $form.find('#form_submit').prop('disabled', false);
              $form.children('select').prop('disabled', false);
              $('#fileupload').prop('disabled', false);
              $('.submitspinner').hide()
            });
          }
        }
        else { // файлов в очереди нет
          // вызываем нужные финальные функции
          if (divBeingEdited) {afterEditingIsOver()}
          else {afterItsAllOver();}
          $form.find('#form_submit').prop('disabled', false);
          $form.children('select').prop('disabled', false);
          $('#fileupload').prop('disabled', false);
          $('.submitspinner').hide()
        }
      }
    })
    .fail(function() {
      $form.find('#form_submit').prop('disabled', false);
      $form.children('select').prop('disabled', false);
      $('#fileupload').prop('disabled', false);
      $('.submitspinner').hide()
    })
  }

})
