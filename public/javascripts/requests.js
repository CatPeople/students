// список подтвержденных неподтвержденных аккаунтов в админке
$(document).ready(function(){
  $('.regrequestlink').click(function() { // клик по имени
    $(this).parent().children('.request-more').fadeToggle() // отображаем либо прячем доп. информацию
  })
  $('#approved').click(function() { // переключение между двумя вкладками
    $('.student-list').hide();
    $('.approved-list').show();
    $('#approved').addClass('pure-button-primary');
    $('#waiting').removeClass('pure-button-primary');
  })
  $('#waiting').click(function() { // переключение между двумя вкладками
    $('.student-list').show();
    $('.approved-list').hide();
    $('#waiting').addClass('pure-button-primary');
    $('#approved').removeClass('pure-button-primary');
  })
  $(function() {
      $('.approve').click(function(e) { // клик по "одобрить"
          if (window.confirm("Вы уверены?")) {
              $.ajax({
                url: $(this).data('url'),
                type:'POST',
                data: {action: 'approve', email: $(this).data('email')} // объект с данными, которые примет сервер
              }).done(response => {
                if(response['status'] == 'success') { // сервер сказал, что все ок
                  $(this).parent().parent().parent().appendTo('.approved-list ul') // переносим див в список одобренных студентов
                  $(this).parent().hide() // скрываем его, если он развернут
                  $(this).remove(); // удаляем кнопку "одобрить"
                  // пересчитываем цифры
                  var oldvalue = $('#approvedcount').html()
                  var newvalue = parseInt(oldvalue) + 1;
                  $('#approvedcount').html(newvalue)
                  oldvalue = $('#waitingcount').html()
                  newvalue = parseInt(oldvalue) - 1;
                  $('#waitingcount').html(newvalue)
                }
                else {
                }
              })


          }
      });
      $('.decline').click(function(e) {
          if (window.confirm("Вы уверены?")) {
              $.ajax({
                url: $(this).data('url'),
                type:'POST',
                data: {action: 'deny', email: $(this).data('email')}
              }).done(response => {
                if(response['status'] == 'success') {
                  if ($(this).parent().parent().parent().parent().parent().attr('class') == 'approved-list') {
                    var oldvalue = $('#approvedcount').html()
                    var newvalue = parseInt(oldvalue) - 1;
                    $('#approvedcount').html(newvalue)
                  }
                  else {
                    var oldvalue = $('#waitingcount').html()
                    var newvalue = parseInt(oldvalue) - 1;
                    $('#waitingcount').html(newvalue)
                  }
                  $(this).parent().parent().parent().fadeOut(400, function() {$(this).remove()})
                }
                else {
                  alert(response['error'])
                }
              })


          }
      });
  });

})
