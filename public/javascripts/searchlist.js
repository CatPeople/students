$(document).ready(function(){
  $('.searchlist-link').click(function() {
    $('#studid').val($(this).data('id'))
    $('form').submit() 
  })
})
