$(document).ready(function() {

  if (localStorage.getItem('barbenheimer') == 'o') {
    $('.barbenheimer img').prop('src', '/img/heel.svg');
  } else {
    $('.barbenheimer img').prop('src', '/img/mushroom.svg');
  }

  if ($('.nominee').hasClass('selected')) $('div.image').addClass('selected');

  // auto clear message boxes after 8s
  window.setTimeout(function() {
    $('.btn-close').click();
  }, 15000);
  
  $('a').on('click', function(e) {
    e.stopPropagation();
  });

  $('#nobots').on('click', function() {
    $('tr.bot td').toggle();
  });

  $('.barbenheimer').on('click', function(e) {
    console.log('barbenheimer clicked');
    $('body').toggleClass('barbie');
    $('body').toggleClass('oppen');
    if (localStorage.getItem('barbenheimer') == 'o') {
      $(this).prop('title', 'Switch to Oppenheimer').children().prop('src', '/img/mushroom.svg');
      localStorage.setItem('barbenheimer','b');
    } else {
      $(this).prop('title', 'Switch to Barbie').children().prop('src', '/img/heel.svg');
      localStorage.setItem('barbenheimer','o');
    }
  })

  // main page (signups) *******************************
  $('#signup-submit').attr('disabled', 'disabled');

  $('#signup #username').on('keyup', function() {
    
    var uname = $(this).val(),
        unv = $('#username-not-valid')
    if (uname.length > 2) {
      $.ajax({
        type: 'POST',
        url: '/player/check',
        data: { type: 1, value: uname },
        beforeSend: function() {
          unv.show().html('<img src="/img/ajax-loader.gif" alt="..." />');
        }
      }).done(function(res) {

        if (res === '') { // db error
          unv.addClass('err')
             .removeClass('success')
             .html('unable to check')
             .show();
        } else if (res === true) { // name is ok
          unv.removeClass('err')
             .addClass('success')
             .html('&#10003;')
             .show();
        } else {
          unv.addClass('err')
             .removeClass('success')
             .html('taken &#128542;')
             .show();
        }
        checkForm();
      });
    } else {
      unv.hide();
    }
    checkForm();
  })

  $('#progress td').on('click', function() {
    // event handler for shortcut bar
    let addr = window.location.pathname.split('/');
    const curr = addr.pop(),
          pcid = $(this).data('pcid');

    if (curr != pcid) {
      addr.push(pcid);
      window.location.href = addr.join('/');
    }
  });

  $('#signup #email').on('keyup', function() {
    // validate uniqueness for email and username
    var email = $('#email').val(),
        env = $('#email-not-valid'),
        re = /\S+@\S+\.\S+/;

    if (email.match(re)) {
      $.ajax({
        type: 'POST',
        url: '/player/check',
        data: { type: 2, value: email }
      }).done(function(res) {
        if (res === true) {
          env.removeClass('err')
             .addClass('success')
             .html('&#10003;')
             .show();
        } else {
          env.addClass('err')
             .removeClass('success')
             .text('taken')
             .show();
        }   
        checkForm();       
      });
    } else {
      env.show().removeClass('success').addClass('err').html('!');
    }
    checkForm();
  })

  function checkForm() {
    var submit = $('#signup-submit');
    var state = ($('#email-not-valid').hasClass('success') && ($('#username').val().length > 2) && $('#username-not-valid').hasClass('success'));
    if (state) {
      submit.removeAttr('disabled');
    } else {
      submit.attr('disabled', 'disabled');
    }
  }

  // player prediction page *******************************

  // set up the navigation for each category
  function nav() {
    var maxCats = 24; // Best Casting added 2026
    $('.image img').prop('src', $('.image').data('default'));
    var prevurl = window.location.pathname.split('/'),
        cur = prevurl.pop(),
        nexturl = JSON.parse(JSON.stringify(prevurl));
    var prevcat = (cur == 1) ? maxCats : (cur * 1) - 1,
        nextcat = (cur == maxCats) ? 1 : (cur * 1) + 1;

    prevurl.push(prevcat);
    nexturl.push(nextcat);
    
    $('#prev').prop('href', prevurl.join('/'));
    $('#next').prop('href', nexturl.join('/'));

  }
  nav();

  // handle the image switch on mouseover events
  $('.nominee').on('mouseenter', function() {
    var img = '/img/' + $(this).data('img') + '.jpg';
    $('.image img').prop('src', img);
  });

  $('.nominee').on('mouseleave', function() {
    $('.image img').prop('src', $('.image').data('default'));
  });

  // handler for clicking to make a prediction
  $('.nominee').on('click', function() {
    if ($(this).hasClass('selected')) return false; // don't send ajax request for something already picked
    var _this = $(this),
        img = '/img/' + _this.data('img') + '.jpg',
        nid = _this.data('nid'),
        cid = $('#pred_list').data('cid'),
        uid = $('#pred_list').data('uid');

    $.ajax({
      url: '/prediction',
      type: 'post',
      data: {
        uid: uid,
        cid: cid,
        nid: nid
      }
    }).done(function(d) {
      if (d) {
        $('.image img').prop('src', img).parent().data('default', img);
        $(`[data-pcid="${ cid }"]`).addClass('success');
        $('.nominee').removeClass('selected');
        _this.addClass('selected');
        $('div.image').addClass('selected');
        $('#predind').html('✅');
        ajaxResult(true);
      } else {
        console.log('Could not save prediction');
        ajaxResult(false);
      }
    }).fail(function(err) {
      console.log('Could not save prediction: ');
      ajaxResult(false);
    })
  })

  // show/fade popup with result of ajax request
  function ajaxResult(outcome) {
    var popup = $('#popup'),
        msg = outcome ? 'prediction saved' : 'Could not update prediction',
        cls = outcome ? 'success' : 'failure';

    popup.html(msg).addClass(cls).fadeIn();
    window.setTimeout(function() {
      popup.removeClass(cls).fadeOut();
    }, 1500);
  }

  if ($('nav').data('uid')) {
    // ajax call to get progress data for player from API
    const uid = $('nav').data('uid');
    $.ajax({
      url: `/api/progress/${ uid }`,
      type: 'get'
    }).done(data => {
      const cur = window.location.pathname.split('/').pop();
      $(`[data-pcid="${ cur }"]`).addClass('highlite');
      for (let x = 0; x < data.length; x++) {
        if (data[x].complete == 1) { 
          $(`[data-pcid="${ x + 1 }"]`).removeClass('failure').addClass('success');
        } else {
          $(`[data-pcid="${ x + 1 }"]`).removeClass('success').addClass('failure');
        }
      }
    }).fail(err => {
      console.log('error getting progress');
    })
  }

  // results.hbs
  $('#results .bar').each(function(i) {
    var _this = $(this),
        len = _this.data('len'),
        col = '';
    if (!i) {
      width = (len) ? 100 : 0;
      max_count = len;
      _this.addClass('win');
      _this.next().addClass('win');
    } else {
      width = len / max_count * 100;
    }
    _this.animate({
        width: (width - 15) + '%'
      }, 700);
  })

})