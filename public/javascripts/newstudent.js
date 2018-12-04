$(document).ready(function(){
    const $form = $('form')

    // весь процесс описан в login.js
    $form.on('submit', submitHandler)
    $('#firstNameF').on('keyup', optFieldController)
    $('#lastNameF').on('keyup', optFieldController)
    $('#patronymicF').on('keyup', optFieldController)
    $('#groupF').on('keyup', optFieldController)


    var firstNameStore = null
    var lastNameStore = null
    var patronymicStore = null
    var groupStore = null

    function optFieldController() {
      if(firstNameStore) {
        if (firstNameStore == $('#firstNameF').val() &&
            lastNameStore == $('#lastNameF').val() &&
            patronymicStore == $('#patronymicF').val() &&
            groupStore == $('#groupF').val()) {
              $('#optdiv').fadeIn()
            }
            else {
              $('#optdiv').fadeOut()
            }
      }
    }
    function submitHandler (e) {
      e.preventDefault()
      $(this).children('#form_submit').prop('disabled', true);
      $('input').each(function(){
        $(this).prop('readonly', true);
      })
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
        $('input').each(function(){
          $(this).prop('readonly', false);
        })
        if (response.errors.length != 0) {
          for (var i = 0; i < response['errors'].length; i++) {
            if (response['errors'][i]['param'] == 'general') {
              $('form').children('.success').attr('class', 'error')
              $('form').children('.error').html(response['errors'][i]['msg']).hide().fadeIn()
              if (response['errors'][i]['giveopt']) {
                $('#opt').html(response['errors'][i]['opt'])
                $('#optdiv').fadeIn()
                firstNameStore = $('#firstNameF').val()
                lastNameStore = $('#lastNameF').val()
                patronymicStore = $('#patronymicF').val()
                groupStore = $('#groupF').val()
              }
            }
            else{
              var fieldname = response['errors'][i]['param']
              $("input[name='"+fieldname+"']").parent().children('.error').html(response['errors'][i]['msg']).hide().fadeIn()
            }
          }
        }
        else {
          $('input').each(function() {$(this).val('')}) // очищаем инпуты
          $('#optdiv').fadeOut()
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
