$(document).ready(function(){
    $('.fields-container').on('click', '.add-more', function(e) { // клик по плюсику
        e.preventDefault();
        $(this).parent().find('.remove-me-last').remove(); // удаляем минус, если он есть
        var newField = $(this).parent().clone().appendTo('.fields-container'); // клонируем поле вместе с кнопками
        // и добавляем в конец
        newField.children('.input').val('') // очищаем текст в поле
        newField.children('.error').html('') // очищаем ошибку, если есть
        newField.find('.add-more').after("<button class='remove-me-last' type='button' tabindex='3'>-</button>") // добавляем минус

        $(this).html('-') // меняем плюс на минус
        $(this).attr('class', 'remove-me') // меняем класс кнопки

    });
      $('.fields-container').on('click', '.remove-me', function(e) { // клик по минусу
        e.preventDefault();
        $(this).parent().remove(); //удаляем поле
        if ($('.field-container').length == 1) { // если осталось всего одно поле
          $('.remove-me-last').remove(); // удаляем кнопку с минусом (она должна быть всего одна на странице)
        }
    });

    $('.fields-container').on('click', '.remove-me-last', function(e) { // клик по минусу последнего поля
      e.preventDefault();
      $(this).parent().remove(); // удаляем поле
      $('.fields-container').find('.remove-me').last().attr('class', 'remove-me-last') // находим последнюю кнопку с минусом
                                                                                       // и меняем ее класс на remove-me-last
      $('.remove-me-last').before("<button class='add-more' type='button' tabindex='3'>+</button>") // добавляем перед ней кнопку плюс
      if ($('.field-container').length == 1) { // если осталось всего одно поле
        $('.remove-me-last').remove(); // удаляем кнопку с минусом (она должна быть всего одна на странице)
      }
  });

    const $form = $('form')

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

        if(response['errors'].length != 0) {
          for (var i = 0; i < response['errors'].length; i++) {
            if(response['errors'][i]['param'] == 'name') {
              $(this).children('.fields-container').children('.error').html(response['errors'][i]['msg']).hide().fadeIn()
            }
            else if (response['errors'][i]['param'] == 'general') {
              $(this).children('.success').attr('class', 'error')
              $(this).children('.error').html(response['errors'][i]['msg']).hide().fadeIn()
            }
            else{
              var fieldname = response['errors'][i]['param']
              var matches = fieldname.match(/\[(.*?)\]/);
              if (matches) {
                if (matches[1] != '0') {
                $($("input[name='fields']")[matches[1]]).parent().children('.error').html(response['errors'][i]['msg']).hide().fadeIn()
                }
              }
              else {
              $($("input[name='fields']")[0]).parent().children('.error').html(response['errors'][i]['msg']).hide().fadeIn()
              }
            }

          }
        }
        else {
          $(this).children('.error').attr('class', 'success')
          $(this).children('.success').html(response['status']).hide().fadeIn()
        }

      })
      .fail(function() {
        $('form').children('#form_submit').prop('disabled', false);
        $('form').children('.success').attr('class', 'error')
        $('form').children('.error').html('Неизвестная ошибка').hide().fadeIn()
      })
    }

});
