'use strict';
// External depenencies
var $                   = require('jquery');
window.fullcalendar     = require('fullcalendar');
var moment              = window.moment = require('moment');
var consultationKitSkd  = require('./consultation-kit-app-sdk')();
require('moment-timezone/builds/moment-timezone-with-data-2012-2022.js');
var interpolate         = require('sprintf-js');

// Internal dependencies
var utils              = require('./utils');
var defaultConfig      = require('./defaults');

// Main library
function ConsultationKitBooking() {

  // Library config
  var config = {};

  // DOM nodes
  var rootTarget;
  var calendarTarget;
  var bookingPageTarget;
  var confirmDeleteTarget;

  var times_loaded = [];
  var shouldLoad = true;

  // Inject style dependencies
  var includeStyles = function() {
    require('../node_modules/fullcalendar/dist/fullcalendar.css');
    require('./styles/fullcalendar.scss');
    require('./styles/utils.scss');
    require('./styles/main.scss');
  };

  // Make sure DOM element is ready and clean it
  var prepareDOM = function() {

    rootTarget = $(config.targetEl);
    if (rootTarget.length === 0) rootTarget = $('#hourwidget'); // TODO temprorary fix for hour widget migrations
    if (rootTarget.length === 0) utils.logError('No target DOM element was found (' + config.targetEl + ')');
    rootTarget.addClass('bookingjs');
    rootTarget.children(':not(script)').remove();

  };


  // Setup the SDK with correct credentials
  var setupConfig = function() {
    consultationKitSkd.setup(config.userId, config.apiToken, config.baseUrl, config.calendarId);
  };

  // Fetch availabile time through Consultation Kit SDK
  var findTime = function(start, days, cb) {

    var args = {};
    args['start'] = start;
    args['days'] = days;
    args['editCalendar'] = config.editCalendar;
    args['userId'] = config.userId;

    utils.doCallback('findTimeStarted', config, args);

      shouldLoad = false;
      consultationKitSkd.findTime(args)
          .then(function (response) {
            shouldLoad = true;
            times_loaded.push(start.toISOString());

            utils.doCallback('findTimeSuccessful', config, response);

            // Render available timeslots in FullCalendar
            cb(response.data);

            // Go to first event if enabled
            if (config.goToFirstEvent && response.data.length > 0) {
              var firstEventStart = response.data[0].start;
              var firstEventStartHour = moment(firstEventStart).format('HH:00:00');
              scrollToTime(firstEventStartHour);
            }
          });

  };

  // Tells FullCalendar to go to a specifc date
  var goToDate = function(date) {

    calendarTarget.fullCalendar('gotoDate', date);

  };

  // Scrolls fullcalendar to the specified hour
  var scrollToTime = function(time) {
    var scroll_to_row = $("tr").find("[data-time='"+time+"']");

    // Only proceed for agendaWeek view
    if (calendarTarget.fullCalendar('getView').name !== 'agendaWeek'){
      return;
    }

    // Calculate scrolling location and container sizes
    var scrollTo = scroll_to_row.position().top;
    var scrollable = calendarTarget.find('.fc-scroller');
    var scrollableHeight = scrollable.height();
    var scrollableScrollTop = scrollable.scrollTop();
    var maximumHeight = scrollable.find('.fc-time-grid').height();

    // Only perform the scroll if the scrollTo is outside the current visible boundary
    if (scrollTo > scrollableScrollTop && scrollTo < scrollableScrollTop + scrollableHeight) {
      return;
    }

    // If scrollTo point is past the maximum height, then scroll to maximum possible while still animating
    if (scrollTo > maximumHeight - scrollableHeight) {
      scrollTo = maximumHeight - scrollableHeight;
    }
    // Perform the scrollTo animation
    scrollable.animate({scrollTop: scrollTo});

  };

  // Calculate and display timezone helper
  var renderTimezoneHelper = function() {

    var localTzOffset = (moment().utcOffset()/60);
    var timezoneIcon = require('!svg-inline!./assets/timezone-icon.svg');

    var template = require('./templates/timezone-helper.html');

    var timezoneHelperTarget = $(template.render({
      timezoneIcon: timezoneIcon,
      loadingText: config.localization.strings.timezoneHelperLoading,
      loading: true
    }));

    rootTarget.addClass('has-timezonehelper');
    rootTarget.append(timezoneHelperTarget);

    var hostTzOffset = (moment().tz(config.timezone).utcOffset()/60) || -7;

    var tzOffsetDiff = localTzOffset - hostTzOffset;
    var tzOffsetDiffAbs = Math.abs(localTzOffset - hostTzOffset);
    var tzDirection = (tzOffsetDiff > 0 ? 'ahead' : 'behind');

    var newTimezoneHelperTarget = $(template.render({
      timezoneIcon: timezoneIcon,
      timezoneDifference: (tzOffsetDiffAbs === 0 ? false : true),
      timezoneDifferent: interpolate.sprintf(config.localization.strings.timezoneHelperDifferent, tzOffsetDiffAbs, tzDirection, config.name),
      timezoneSame: interpolate.sprintf(config.localization.strings.timezoneHelperSame, config.name)
    }));

    timezoneHelperTarget.replaceWith(newTimezoneHelperTarget);

  };

  // Setup and render FullCalendar
  var initializeCalendar = function() {

    var sizing = decideCalendarSize();
    calendarTarget = $('<div class="bookingjs-calendar empty-calendar">');

    var fullCalendarArgs;
    if (config.editCalendar) {
      fullCalendarArgs = {
        defaultView: sizing.view,
        height: sizing.height,
        windowResize: function() {
          var sizing = decideCalendarSize();
          calendarTarget.fullCalendar('changeView', sizing.view);
          calendarTarget.fullCalendar('option', 'height', sizing.height);
        },
        selectable: true,
        selectHelper: true,
        editable: true,
        eventOverlap: false,
        eventDrop: function(event) {
          consultationKitSkd.updateAvailability(event.availabilityId, event.start, event.end);
        },
        eventResize: function(event) {
          consultationKitSkd.updateAvailability(event.availabilityId, event.start, event.end);
        },
        select: function(start, end) {
          consultationKitSkd.createAvailability(start, end)
              .done(function(availability) {
                calendarTarget.fullCalendar('renderEvent', { availabilityId: availability.id, start: start, end: end }, false);
                calendarTarget.fullCalendar('unselect');
              });
        },
        eventClick: showConfirmDeletePage,
        events: function( start, end, timezone, callback ) {
          var days = end.diff(start, 'days');
          findTime(start, days, callback);
        }
      };
    } else {
      fullCalendarArgs = {
        defaultView: sizing.view,
        height: sizing.height,
        eventClick: showBookingPage,
        lazyFetching: false,
        windowResize: function() {
          var sizing = decideCalendarSize();
          calendarTarget.fullCalendar('changeView', sizing.view);
          calendarTarget.fullCalendar('option', 'height', sizing.height);
        },
        events: function( start, end, timezone, callback ) {
          var days = end.diff(start, 'days');
          findTime(start, days, callback);
        }
      };
    }


    $.extend(true, fullCalendarArgs, config.fullCalendar);

    rootTarget.append(calendarTarget);

    calendarTarget.fullCalendar(fullCalendarArgs);
    rootTarget.addClass('show');

    utils.doCallback('fullCalendarInitialized', config);

  };

  // Fires when window is resized and calendar must adhere
  var decideCalendarSize = function() {

    var view = 'agendaWeek';
    var height = 480;
    var rootWidth = rootTarget.width();

    if (rootWidth < 480) {
      view = 'basicDay';
      height = 380;
      rootTarget.addClass('is-small');
      if (config.avatar) { height -= 15; }
    } else {
      rootTarget.removeClass('is-small');
    }

    if (config.bookingFields.comment.enabled) {  height += 84; }
    if (config.bookingFields.phone.enabled) {    height += 64; }
    if (config.bookingFields.skype.enabled) {     height += 64; }
    if (config.bookingFields.location.enabled) { height += 64; }

    return {
      height: height,
      view: view
    };

  };

  // Render the supplied calendar events in FullCalendar
  var renderCalendarEvents = function(eventData) {

    calendarTarget.fullCalendar('addEventSource', {
      events: eventData
    });

    calendarTarget.removeClass('empty-calendar');

  };

  // Render the avatar image
  var renderAvatarImage = function() {

    var template = require('./templates/user-avatar.html');
    var avatarTarget = $(template.render({
      image: config.avatar
    }));

    rootTarget.addClass('has-avatar');
    rootTarget.append(avatarTarget);

  };

  var renderDisplayName = function() {

    var template = require('./templates/calendar-displayname.html');
    var displayNameTarget = $(template.render({
      calendar_name: config.calendar_name
    }));

    rootTarget.addClass('has-displayname');
    rootTarget.append(displayNameTarget);

  };

  var loadPaypal= function(cb) {
    if (!window.paypal || !window.paypal.Button) {
      $.getScript("https://www.paypalobjects.com/api/checkout.js")
        .done(function (script, textStatus) {
          cb();
        })
        .fail(function (jqxhr, settings, exception) {
          console.log('Couldn\'t load PayPal library');
        });
    } else {
      cb();
    }
  };

  // Event handler when a timeslot is clicked in FullCalendar
  var showBookingPage = function(eventData) {

    utils.doCallback('showBookingPage', config, eventData);

        var fieldsTemplate = require('./templates/booking-fields.html');
        var template = require('./templates/booking-page.html');

        var dateFormat = config.localization.bookingDateFormat || moment.localeData().longDateFormat('LL');
        var timeFormat = config.localization.bookingTimeFormat || moment.localeData().longDateFormat('LT');

        bookingPageTarget = $(template.render({
          chosenDate:           moment(eventData.start).format(dateFormat),
          chosenTime:           moment(eventData.start).format(timeFormat) + ' - ' + moment(eventData.end).format(timeFormat),
          start:                moment(eventData.start).format(),
          end:                  moment(eventData.end).format(),
          closeIcon:            require('!svg-inline!./assets/close-icon.svg'),
          successMessageTitle:  config.localization.strings.successMessageTitle,
          successMessageBody:   interpolate.sprintf(config.localization.strings.successMessageBody, '<span class="booked-email"></span>'),
          fields:               config.bookingFields,
          pricePerMeeting:      config.pricePerMeeting
        }, {
          formFields: fieldsTemplate
        }));

        bookingPageTarget.children('.bookingjs-bookpage-close').click(function(e) {
          e.preventDefault();
          hideBookingPage();
        });

        $(document).on('keyup', function(e) {
          // escape key maps to keycode `27`
          if (e.keyCode === 27) { hideBookingPage(); }
        });

        rootTarget.append(bookingPageTarget);

        var form = $("#ck-form");
        loadPaypal(function() {
          console.log(config.paypalEnv);
          window.paypal.Button.render({
            env: config.paypalEnv, // Specify 'sandbox' for the test environment
            style: {
              size: 'medium',
              color: 'blue',
              shape: 'pill'
            },
            payment: function(resolve, reject) {
              var formDataArr = form.serializeArray();

              $('.bookingjs-form-input').removeClass('bookingjs-error');
              $('.bookingjs-error').text('');
              var client = {};
              var hasErrors = false;
              $.each(formDataArr, function(i, prop) {
                client[prop.name] = prop.value;
                if (prop.value === '') {
                  $('#'+prop.name + '-error').text('This field is required!');
                  $('#bookingjs-' + prop.name).addClass('bookingjs-error');
                  hasErrors = true;
                }
              });

              if (hasErrors) return reject('All fields are required');

              consultationKitSkd.createPayment()
                .done(function(data) {
                  resolve(data.payment_id);
                })
                .fail(function(err) {
                  reject(err.statusText);
                })
            },

            onAuthorize: function(data) {

              var formDataArr = form.serializeArray();
              var client = {};
              $.each(formDataArr, function(i, prop) {
                client[prop.name] = prop.value;
              });

              var bookingArgs = {
                start_datetime: moment(eventData.start).format(),
                end_datetime: moment(eventData.end).format(),
                payment_id: data.paymentID,
                payer_id: data.payerID,
                client: client
              };
              consultationKitSkd.createBooking(bookingArgs)
                .done(function() {
                  $("#paypal-button").hide();
                  $("#booking-page-title").text('Booking Complete!');
                  $(".bookingjs-form-fields").hide();
                  $(".bookingjs-form-success-message .booked-email").text(bookingArgs.client.email);
                  $(".bookingjs-form-success-message").show();
                  // remove event from the calendar so user isn't confused
                  calendarTarget.fullCalendar('removeEvents', eventData._id);
                })
                .fail(function(err) {
                  console.log('error: ', err)
                })
            }
          }, '#paypal-button');
        });

        setTimeout(function(){
          bookingPageTarget.addClass('show');
        }, 100);
  };

  // Remove the booking page DOM node
  var hideBookingPage = function() {

    utils.doCallback('closeBookingPage', config);

    bookingPageTarget.removeClass('show');

    setTimeout(function(){
      bookingPageTarget.remove();
    }, 200);

    $(document).off('keyup');

  };

  var showConfirmDeletePage = function(eventData) {

    var template = require('./templates/confirm-delete.html');
    var timeFormat = config.localization.bookingTimeFormat || moment.localeData().longDateFormat('LT');

    confirmDeleteTarget = $(template.render({
      chosenDate:           moment(eventData.start).format('dddd'),
      chosenTime:           moment(eventData.start).format(timeFormat) + ' - ' + moment(eventData.end).format(timeFormat),
      closeIcon:            require('!svg-inline!./assets/close-icon.svg'),

    }));

    confirmDeleteTarget.find('.bookingjs-confirm-delete-close').click(function(e) {
      e.preventDefault();
      hideConfirmDeletePage();
    });

    confirmDeleteTarget.find('.bookingjs-confirm-delete-container-button').click(function(e) {
      e.preventDefault();
      if($(this).hasClass('yes')) {
        consultationKitSkd.deleteAvailability(eventData.availabilityId)
          .done(function() {
            calendarTarget.fullCalendar('removeEvents', eventData._id);
          });
      }
      hideConfirmDeletePage();
    });

    $(document).on('keyup', function(e) {
      // escape key maps to keycode `27`
      if (e.keyCode === 27) { hideConfirmDeletePage(); }
    });

    rootTarget.append(confirmDeleteTarget);

    setTimeout(function(){
      confirmDeleteTarget.addClass('show');
    }, 100);

  };

  var hideConfirmDeletePage = function() {

    confirmDeleteTarget.removeClass('show');

    setTimeout(function(){
      confirmDeleteTarget.remove();
    }, 200);

    $(document).off('keyup');

  };

  // Set config defaults
  var setConfigDefaults = function(suppliedConfig) {
    return $.extend(true, {}, defaultConfig.primary, suppliedConfig);
  };

  // Setup config
  var setConfig = function(suppliedConfig) {
    // Check whether a config is supplied
    if(suppliedConfig === undefined || typeof suppliedConfig !== 'object' || $.isEmptyObject(suppliedConfig)) {
      utils.logError('No configuration was supplied or found. Please supply a config object upon library initialization');
    }

    // Extend the default config with supplied settings
    var newConfig = setConfigDefaults(suppliedConfig);

    // Apply timeDateFormat presets
    var presetsConfig = {};
    if(newConfig.localization.timeDateFormat === '24h-dmy-mon') {
      presetsConfig = defaultConfig.presets.timeDateFormat24hdmymon;
    } else if(newConfig.localization.timeDateFormat === '12h-mdy-sun') {
      presetsConfig = defaultConfig.presets.timeDateFormat12hmdysun;
    }
    var finalConfig = $.extend(true, {}, presetsConfig, newConfig);

    // Apply bookingGraph presets
    presetsConfig = {};
    if(newConfig.bookingGraph === 'instant') {
      presetsConfig = defaultConfig.presets.bookingInstant;
    } else if(newConfig.bookingGraph === 'confirm_decline') {
      presetsConfig = defaultConfig.presets.bookingConfirmDecline;
    }
    finalConfig = $.extend(true, {}, presetsConfig, finalConfig);

    // Check for required settings
    if(!finalConfig.calendar && !finalConfig.calendarId && !finalConfig.editCalendar) {
      utils.logError('A required config setting was missing ("calendar")');
    }

    // Set new config to instance config
    config = finalConfig;

    return config;

  };

  // Get library config
  var getConfig = function() {

    return config;

  };

  // Render method
  var render = function() {

    // Include library styles if enabled
    includeStyles();

    // Set rootTarget to the target element and clean before child nodes before continuing
    prepareDOM();

    // Setup the SDK config
    setupConfig();

    // Initialize FullCalendar
    initializeCalendar();

    // Show timezone helper if enabled
    if (config.localization.showTimezoneHelper) {
        renderTimezoneHelper();
    }

    // Show image avatar if set
    if (config.avatar) {
        renderAvatarImage();
    }

    // Print out display name
    if (config.calendar_name) {
        renderDisplayName();
    }

    utils.doCallback('renderCompleted', config);

    return this;

  };

  // Initilization method
  var init = function(suppliedConfig) {

        // Start from local config
        if (suppliedConfig.localConfig) {
          return start(suppliedConfig);
        }

        // Load remote config
        return loadRemoteConfig(suppliedConfig)
            .done(function (response) {
              var mergedConfig = $.extend(true, {}, response, suppliedConfig);
              start(mergedConfig);
            })
  };

  // Load config from remote (embed or hosted)
  var loadRemoteConfig = function(suppliedConfig) {
    config = setConfigDefaults(suppliedConfig);
    setupConfig();
    if (suppliedConfig.calendar) {
      return consultationKitSkd
      .getCalendarConfig(suppliedConfig.calendar)
      .fail(function () {
        utils.logError('The calendar could not be found, please double-check your calendar id');
      })
    }
    else {
      utils.logError('No widget configuration found');
    }

  };

  var start = function(suppliedConfig) {
    // Handle config and defaults
    setConfig(suppliedConfig);
    return render();

  };

  var destroy = function() {

    prepareDOM();
    config = {};
    return this;

  };

  // The fullCalendar object for advanced puppeting
  var fullCalendar = function() {

    if (calendarTarget.fullCalendar === undefined) { return undefined; }
    return calendarTarget.fullCalendar.apply(calendarTarget, arguments);

  };

  // Expose methods
  return {
    setConfig:    setConfig,
    getConfig:    getConfig,
    render:       render,
    init:         init,
    destroy:      destroy,
    fullCalendar: fullCalendar
  };

}

// Autoload if config is available on window, else export function
// TODO temprorary fix for hour widget migrations
var globalLibraryConfig = window.timekitBookingConfig;
if (window && globalLibraryConfig && globalLibraryConfig.autoload !== false) {
  $(window).load(function(){
    var instance = new ConsultationKitBooking();
    instance.init(globalLibraryConfig);
    module.exports = instance;
  });
} else {
  module.exports = ConsultationKitBooking;
}
