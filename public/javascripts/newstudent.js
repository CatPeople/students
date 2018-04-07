$(document).ready(function(){
    const $form = $('form')

    // весь процесс описан в login.js
    $form.on('submit', submitHandler)

    function submitHandler (e) {
      e.preventDefault()

      $(this).children('#form_submit').prop('disabled', true);
      $('.error').each(function(){
        $(this).html('')
      })
      $(this).children('.success').html('')
      $(this).children('.error').html('')
      $.ajax({
        url: $(this).data('request_url'),
        timeout: 10000,
        type:'POST',
        data: $form.serialize()
      }).done(response => {
        $(this).children('#form_submit').prop('disabled', false);

        if (response.errors.length != 0) {
          for (var i = 0; i < response['errors'].length; i++) {
            if (response['errors'][i]['param'] == 'general') {
              $('form').children('.success').attr('class', 'error')
              $('form').children('.error').html(response['errors'][i]['msg']).hide().fadeIn()
            }
            else{
              var fieldname = response['errors'][i]['param']
              $("input[name='"+fieldname+"']").parent().children('.error').html(response['errors'][i]['msg']).hide().fadeIn()
            }
          }
        }
        else {
          $('input').each(function() {$(this).val('')}) // очищаем инпуты
          $('form').children('.error').attr('class', 'success') // меняем span с классом error на span success
          // и пишем туда текст
          $('form').children('.success').html("Студент создан. <a href='/student/"+response.id+"'>Перейти на страницу студента</a>").hide().fadeIn()
        }

      })
      .fail(function() {
        $('form').children('#form_submit').prop('disabled', false);
        $('form').children('.error').html('Неизвестная ошибка').hide().fadeIn()
      })
    }

});
