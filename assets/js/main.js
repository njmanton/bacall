$(document).ready(function() {
  
  $('a').on('click', function(e) {
    e.stopPropagation();
  });

  // calculate the number of predicted categories
  var cntpred = function() {
    var c = (24 - $('button .nopred').length);
    $('#predcnt').html(c);
  }

  cntpred();

  // predictions page
  $('div.nom').on('click', function() {
    var _this  = $(this),
        uid    = $('h3').data('id'),
        cid    = _this.data('cid'),
        nid    = _this.data('nid'),
        name   = _this.data('name'),
        divs   = _this.parent().parent().find('.nom');

    // only make ajax call if clcicked nom is not already picked
    if (!_this.hasClass('picked')) {
      $.ajax({
        url: '/prediction',
        type: 'post',
        data: {
          nid: nid,
          cid: cid,
          uid: uid
        }
        
      }).done(function(d) {
        divs.removeClass('picked');
        _this.addClass('picked');
        _this.parent().parent().parent().parent().parent().find('.updated').fadeIn();
        window.setTimeout(function() {
          $('.updated').fadeOut();
        }, 3000);
        $('.text' + cid).text(": " + name); // change the accordion header to prediction
        cntpred();
      }).fail(function(e) {
        console.log('Error saving prediction', e);
      })
    }

  });

  // handle events to show name when hovering over image
  $('div.nom').on('mouseenter tap', function() {
    $(this).find('.label').fadeIn();
  })

  $('div.nom').on('mouseleave tap', function() {
    $(this).find('.label').fadeOut();
  })

  $('#accordion').on('shown.bs.collapse', function(e) {

    // find the button element and style it when clicked (event target = uncovered div)
    var btn = $(e.target).parent().find('button');
    btn.addClass('opened');
    btn.find('.ctrl').html('▼');

  });

  $('#accordion').on('hide.bs.collapse', function(e) {

    var btn = $(e.target).parent().find('button');
    btn.removeClass('opened');
    btn.find('.ctrl').html('▶︎');

  });  

  // main page (signups)
  $('#signup-submit').attr('disabled', 'disabled');

  $('#signup #username').on('keyup', function() {
    
    var uname = $(this).val();
    if (uname.length > 2) {
      $.ajax({
        type: 'POST',
        url: '/player/check',
        data: { type: 1, value: uname },
        beforeSend: function() {
          $('#username-not-valid').show().html('<img src="/img/ajax-loader.gif" alt="..." />');
        }
      }).done(function(res) {
        if (res === true) { // name is ok
          $('#username-not-valid')
            .removeClass('err')
            .addClass('success')
            .html('&#10003;')
            .show();
        } else {
          $('#username-not-valid')
            .addClass('err')
            .removeClass('success')
            .html('taken &#128542;')
            .show();
        }
        checkForm();
      });
    } else {
      $('#username-not-valid').hide();
    }
    checkForm();
      
  })

  $('#signup #email').on('keyup', function() {
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
          $('#email-not-valid')
            .removeClass('err')
            .addClass('success')
            .html('&#10003;')
            .show();
        } else {
          $('#email-not-valid')
            .addClass('err')
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

  $('#franchise').easyAutocomplete({
    url: function(phrase) {
      return '/player/franchise/' + phrase
    },
    getValue: 'franchise',
    adjustWidth: false
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

})