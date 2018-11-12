$(document).ready(function(){
    const $form = $('form')

    $('#logout').click(function() { // клик по кнопке выйти
      window.location.href = "/auth/logout"; // перенаправление браузера
      // запрос обработается сервером в /routes/auth.js router.get('/logout'
    })

    $('#passwordresetlink').click(function() {
      $('form').children('.success').html("").hide()
      $('.error').each(function(){ //опустошаем все span с ошибками, т.к. новый запрос
        $(this).html('')
      })
      if ($('#login').val() != "")  {
        $.ajax({
          url: "/auth/requestreset",
          timeout: 10000,
          type:'POST',
          data: {"username": $('#login').val()}
        }).done(response => {
          if (response.errors.length != 0) {
            for (var i = 0; i < response['errors'].length; i++) {
              if (response['errors'][i]['param'] == 'general') {
                $('form').children('.error').html(response['errors'][i]['msg']).hide().fadeIn() // отображаем
              }
              else{
                var fieldname = response['errors'][i]['param']
                $("input[name='"+fieldname+"']").parent().children('.error').html(response['errors'][i]['msg']).hide().fadeIn() //отображаем
              }
            }
          }
          else {
            $('form').children('.success').html(response['message']).hide().fadeIn()
            $(this).fadeOut()
          }
        })
      }
      else {
        $("input[name='username']").parent().children('.error').html('Пожалуйста, введите e-mail в этом поле').hide().fadeIn()
      }
    })


    $form.on('submit', submitHandler)

    function submitHandler (e) { // перехват отправки формы
      e.preventDefault()
      $('form').children('.success').html("").hide().fadeIn()
      $(this).children('#form_submit').prop('disabled', true); // отключаем кнопку, пока не закончится запрос
      $('.error').each(function(){ //опустошаем все span с ошибками, т.к. новый запрос
        $(this).html('')
      })
      $(this).children('.error').html('')
      // делаем POST запрос к серверу с данными формы
      $.ajax({
        url: $(this).data('request_url'), // можно игнорировать эту строку, эта переменная не установлена
                                          // и запрос будет отправлен туда же, где сейчас находится браузер
                                          // эта штука используется в других формах, я просто копировал
        timeout: 10000,
        type:'POST',
        data: $form.serialize() // данные формы компонуются из страницы в запрос
      }).done(response => { // пришел ответ, ответ находится в переменной response
        $(this).children('#form_submit').prop('disabled', false); // включаем кнопку обратно

        if (response.errors.length != 0) { // сервер прислал ошибки
          // ошибки всегда формата ['errors'][номер]['param' - имя поля, где была ошибка]
          //                                        ['msg'] - сообщение присланное сервером
          for (var i = 0; i < response['errors'].length; i++) {
            if (response['errors'][i]['param'] == 'general') { // общая ошибка, не привязанная ни к какому полю
              $('form').children('.error').html(response['errors'][i]['msg']).hide().fadeIn() // отображаем
            }
            else{ // ошибка, привязанная к какому-либо инпуту
              var fieldname = response['errors'][i]['param']
              $("input[name='"+fieldname+"']").parent().children('.error').html(response['errors'][i]['msg']).hide().fadeIn() //отображаем
            }
          }
        }
        else { //успех, ошибок не было, сервер присвоил нам сессию
          window.location.href = "/"; // перенаправляем на главную страницу
        }

      })
      .fail(function() { // запрос не прошел
        $('form').children('#form_submit').prop('disabled', false);
        $('form').children('.error').html('Unknown error').hide().fadeIn()
      })
    }

});
