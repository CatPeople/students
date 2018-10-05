$(document).ready(function(){
  $('body').on('click', '.student-document-more-link', function() {
    $(this).parent().parent().next().fadeToggle()
  })
  $('.student-document-more').each(function(element){$(this).hide()})
})
