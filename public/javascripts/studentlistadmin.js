$(document).ready(function(){

  var editingmode = false;
  $('#editing-mode-link').click(function() {
    if (editingmode == false) {editingmode = true}
    else {editingmode = false}

    $('.student-delete-link').each(function(element) {
      $(this).fadeToggle()
    })

  })
  var groupsearch = {name: null, studentname: null};
  if ($('.student-list').data('page')) { // если список был запрошен уже на конкретной странице
    currentpage = $('.student-list').data('page');
  }
  else
  { // либо первая
  var currentpage = 1;
  }
  var totalpages = $('.pure-button-group').data('pages'); // всего страниц

  var countpages = function() { // функция для пересчитывания страниц и обновления связанных с ними кнопок
  if (currentpage == totalpages) {
    $('#page-next').addClass('pure-button-disabled') // отключаем кнопку некст
  }
  else {
    $('#page-next').removeClass('pure-button-disabled') // либо включаем
  }

    $('#current-page').html(currentpage) //обновляем цифры
    $('#pagestotal').html("/"+totalpages)
    if (currentpage == 1) {
      $('#page-first').addClass('pure-button-disabled') //отключаем
      $('#page-prev').addClass('pure-button-disabled') //отключаем
    }
    if (currentpage > 1) {
      $('#page-first').removeClass('pure-button-disabled') //включаем
      $('#page-prev').removeClass('pure-button-disabled') //включаем
    }
  }
  countpages(); // вызываем функцию, которую только что написали
  var refreshlist = function() { // функция для запроса нового списка с сервера и обновления его на странице
    $.ajax({
      url: '/student/page/ajax/'+currentpage, // запрос к серверу
      type:'GET',
      data: groupsearch, // было объявлено в начале, может быть и пустым
    }).done(response => {
      $('.student-list').html($(response).html()); // обновляем список
      $('.student-list').css('opacity', '0'); // анимация
      $('.student-list').animate({opacity: 1})

      totalpages = $(response).data('pages'); // новое количество страниц
      if (currentpage > totalpages) // если наша страница оказалась за пределами
      {
        currentpage = totalpages; // переходим на последнюю доступную
        refreshlist() // снова обновляем список (функия вызывает сама себя)

      }

      countpages(); // пересчитываем страницы
      history.replaceState('page', "page", "/student/page/"+currentpage); //меняем адресную строку браузера
                                                                          // для удобства перехода "назад" со страницы студента
                                                                          // обратно в список
    })
  }


  if ($('#select-group option:selected').val() != 0) { // если при переходе "назад" был включен фильтр по группе
    groupsearch.name = $('#select-group option:selected').val(); // добавляем в поиск
    refreshlist(); // и обновляем список
  }

  $('#page-next').click(function() {
    if (currentpage == 1) {
      $('#page-first').removeClass('pure-button-disabled')
      $('#page-prev').removeClass('pure-button-disabled')
    }
    if (currentpage < totalpages) {
      currentpage++;
      $('#current-page').html(currentpage)
    }
    if (currentpage == totalpages) {
      $('#page-next').addClass('pure-button-disabled')
    }
    refreshlist();
  })

  $('#page-prev').click(function() {
    if (currentpage == totalpages) {
      $('#page-next').removeClass('pure-button-disabled')
    }
    if (currentpage > 1) {
      currentpage--;
      $('#current-page').html(currentpage)
    }
    if (currentpage == 1) {
      $('#page-first').addClass('pure-button-disabled')
      $('#page-prev').addClass('pure-button-disabled')
    }
    refreshlist();
  })

  $('#page-first').click(function() {
    currentpage = 1;
    $('#current-page').html(currentpage)
    $('#page-first').addClass('pure-button-disabled')
    $('#page-prev').addClass('pure-button-disabled')
    $('#page-next').removeClass('pure-button-disabled')
    refreshlist();
  })

    $('#select-group').change(function() { // смена группы в списке в поиске

      groupsearch.name = $('#select-group option:selected').val();
      if (groupsearch.name == 0) {groupsearch.name = null}

      refreshlist();
    })

  $('#searchname').on('input', function() { // при изменении поля ввода имени
    groupsearch.studentname = $('#searchname').val();
    refreshlist();
  })

  $(function() {
      $('body').on('click', '.student-delete-link', function(e) {
          if (window.confirm("Вы уверены?")) {
              $.ajax({
                url: $(this).data('url'),
                type:'DELETE',
              }).done(response => {
                if(response['status'] == 'success') {
                  $(this).parent().parent().fadeOut(400, function() {$(this).remove()})
                }
                else {
                  alert(response['error'])
                }
              })


          }
      });
  });


})
