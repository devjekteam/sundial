'use strict';

/*
 * Default configuration
 */

var primary = {

  targetEl: '#ck-widget',
  baseUrl: 'https://api.consultationkit.com',
  apiToken: null,
  name: '',
  calendar_name: '',
  avatar: '',
  pricePerMeeting: 50,
  userId: null,
  calendar: null, // calendar uuid
  calendarId: null,
  paypalEnv: 'production', // sandbox for test
  autoload: true,
  localConfig: false,
  includeStyles: true,
  showCredits: false,
  goToFirstEvent: true,
  bookingGraph: 'instant',
  possibleLengths: {
    'Normal': '1 hour',
    'Long': '2 hour'
  },
  timezone: 'America/New_York',
  bookingFields: {
    first_name: {
      placeholder: 'John',
      prefilled: false,
      locked: false,
      required: true
    },
    last_name: {
      placeholder: 'Doe',
      prefilled: false,
      locked: false,
      required: true
    },
    email: {
      placeholder: 'john.doe@gmail.com',
      prefilled: false,
      locked: false,
      required: true
    },
    comment: {
      enabled: true,
      placeholder: 'Additional Information',
      prefilled: false,
      required: false,
      locked: false
    },
    phone: {
      enabled: false,
      placeholder: 'Phone number',
      prefilled: false,
      required: true,
      locked: false
    },
    skype: {
      enabled: false,
      placeholder: 'Skype username',
      prefilled: false,
      required: true,
      locked: false
    },
    location: {
      enabled: false,
      placeholder: 'Location',
      prefilled: false,
      required: false,
      locked: false
    }
  },
  fullCalendar: {
    header: {
      left: '',
      center: '',
      right: 'today, prev, next'
    },
    views: {
      agenda: {
        displayEventEnd: false
      }
    },
    allDaySlot: false,
    scrollTime: '08:00:00',
    timezone: 'local',
    nowIndicator: true
  },
  localization: {
    showTimezoneHelper: true,
    timeDateFormat: '12h-mdy-sun',
    strings: {
      successMessageTitle: 'Your consultation has been booked!',
      timezoneHelperLoading: 'Loading..',
      timezoneHelperDifferent: 'Your timezone is %s hours %s of %s (calendar shown in your local time)',
      timezoneHelperSame: 'You are in the same timezone as %s'
    }
  },
  callbacks: {}

};

// Preset: bookingGraph = 'instant'
var bookingInstant = {

  timekitCreateBooking: {
    graph: 'instant',
    action: 'confirm',
    event: {
      invite: true,
      my_rsvp: 'accepted',
      sync_provider: true
    }
  },
  localization: {
    strings: {
      successMessageBody: '<p>A confirmation has been sent to: %s </p>' +
      '<p>Instructions on how to join the meeting will be sent to you before it starts.</p>'
    }
  }

};

// Preset: bookingGraph = 'confirm_decline'
var bookingConfirmDecline = {

  timekitCreateBooking: {
    graph: 'confirm_decline',
    action: 'create',
    event: {
      invite: true,
      my_rsvp: 'accepted',
      sync_provider: true
    }
  },
  localization: {
    strings: {
      successMessageBody: "We have received your request and we'll be in touch when we have reviewed it. <br /><br />Have a great day!"
    }
  }

};

// Preset: timeDateFormat = '24h-dmy-mon'
var timeDateFormat24hdmymon = {

  fullCalendar: {
    timeFormat: 'HH:mm',
    firstDay: 1,
    views: {
      basic: {
        columnFormat: 'dddd D/M'
      },
      agenda: {
        columnFormat: 'ddd\n D/M',
        slotLabelFormat: 'HH:mm'
      }
    }
  },
  localization: {
    bookingDateFormat: 'D. MMMM YYYY',
    bookingTimeFormat: 'HH:mm',
    emailTimeFormat: 'H:i'
  }

};

// Preset: timeDateFormat = '12h-mdy-sun'
var timeDateFormat12hmdysun = {

  fullCalendar: {
    timeFormat: 'h:mma',
    firstDay: 0,
    views: {
      basic: {
        columnFormat: 'dddd M/D',
      },
      agenda: {
        columnFormat: 'ddd\n M/D',
        slotLabelFormat: 'ha'
      }
    },
  },
  localization: {
    bookingDateFormat: 'MMMM D, YYYY',
    bookingTimeFormat: 'h:mma',
    emailTimeFormat: 'h:ia'
  }

};

// Export objects
module.exports = {
  primary: primary,
  presets: {
    timeDateFormat24hdmymon:  timeDateFormat24hdmymon,
    timeDateFormat12hmdysun:  timeDateFormat12hmdysun,
    bookingInstant: bookingInstant,
    bookingConfirmDecline: bookingConfirmDecline
  }
};
