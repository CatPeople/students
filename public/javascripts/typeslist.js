$(document).ready(function(){
  $('.type-details-link').click(function() {
    $(this).parent().children('.type-details').fadeToggle()
  })

  $(function() {
      $('.type-delete-link').click(function(e) {
          if (window.confirm("Вы уверены?")) {
              $.ajax({
                url: $(this).data('url'),
                type:'DELETE',
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
  });

})
