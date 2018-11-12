
$(document).ready(function() {
$('#password').keyup(function() {
$('#result').html(checkStrength($('#password').val()))
})
$('#confirmation').keyup(function() {
  if ($('#confirmation').val() == $('#password').val() && $('.passwordgood').is(':visible')) {
    $('.confirmationgood').show()
  }
  else {
    $('.confirmationgood').hide()
  }
})
function checkStrength(password) {
var strength = 0
if (password.length < 8) {
$('#result').removeClass()
$('#result').addClass('short')
$('.passwordgood').hide();
return 'Минимальная длина - 8 символов'
}
if (password.match(/([a-z].*[A-Z])|([A-Z].*[a-z])/)) strength += 1
if (password.match(/([a-zA-Z])/) && password.match(/([0-9])/)) strength += 1
if (strength < 2) {
$('#result').removeClass()
$('#result').addClass('weak')
$('.passwordgood').hide();
$('#confirmation').trigger('keyup')
return 'Пароль должен содержать символы разного регистра и хотя бы одну цифру'
} else if (strength == 2) {
$('#result').removeClass()
$('#result').addClass('good')
$('.passwordgood').show();
$('#confirmation').trigger('keyup')
return ''
}
}
});
