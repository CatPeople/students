$(document).ready(function(){
  $('body').on('click', '.student-document-more-link', function() {
    $(this).parent().parent().find('.student-document-more').fadeToggle()
  })
  $('.student-document-more').each(function(element){$(this).hide()})
})
