$(document).ready(function(){
    const $form = $('form')
    $('#logout').click(function() {
      window.location.href = "/auth/logout"; 
    })
    $form.on('submit', submitHandler)

    function submitHandler (e) {
      e.preventDefault()
      $(this).children('#form_submit').prop('disabled', true);
      $('.error').each(function(){
        $(this).html('')
      })
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
              $('form').children('.error').html(response['errors'][i]['msg']).hide().fadeIn()
            }
            else{
              var fieldname = response['errors'][i]['param']
              $("input[name='"+fieldname+"']").parent().children('.error').html(response['errors'][i]['msg']).hide().fadeIn()
            }
          }
        }
        else {
          $('form').hide();
          $('form').after("<br><br><span style='color: green'>Успешно.</span>")
        }

      })
      .fail(function() {
        $('form').children('#form_submit').prop('disabled', false);
        $('form').children('.error').html('Неизвестная ошибка').hide().fadeIn()
      })
    }

});
