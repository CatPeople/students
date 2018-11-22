$(document).ready(function(){
  $('form').trigger('reset')
  function resizable (el) {
  function resize() {el.style.width = ((el.value.length+1) * 8.7) + 'px'}
  var e = 'keyup,keypress,focus,blur,change'.split(',');
  for (var i in e) {
    el.addEventListener(e[i],resize,false);
    resize();
  }
  }
  resizable(document.getElementById('scopesInput'));
})
