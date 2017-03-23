// idk if this is how its supposed to work or what

function ConsultationKitSdk() {
  if (!(this instanceof ConsultationKitSdk)) {
    return new ConsultationKitSdk();
  }

  this.userId;
  this.apiToken;
  this.baseUrl = 'http://localhost:5000/';
}

ConsultationKitSdk.prototype.setUser = function(userId, apiToken) {
  this.userId = userId;
  this.apiToken = apiToken;
}

ConsultationKitSdk.prototype.createPayment = function(calendarId) {

    var url = this.baseUrl + 'paypal/auth/payments';
    return $.ajax({'url': url, 'type':'POST',
            'headers': {
                "authorization": this.apiToken
            },
            data: JSON.stringify({
                calendar_id: calendarId
            }),
            contentType: "application/json"
        }
    );
}

ConsultationKitSdk.prototype.createBooking = function(args) {

    console.log('args: ', args);
    var url = this.baseUrl + 'auth/bookings';
    return $.ajax({'url': url, 'type':'POST',
            'headers': {
                "authorization": this.apiToken
            },
            contentType: "application/json",
            data: JSON.stringify({
                start_datetime: args.start_datetime,
                end_datetime: args.end_datetime,
                calendar_id: args.calendar_id,
                payment_id: args.payment_id,
                payer_id: args.payer_id,
                client: args.client
            })
        }
    );
}

ConsultationKitSdk.prototype.findTime = function(args) {
  function addToTimes(availabilities, times) {
    for (var i = 0; i < availabilities.length; i++) {
      times.push({
        start: availabilities[i].start_datetime,
        end: availabilities[i].end_datetime,
        availabilityId: availabilities[i].availability_id
      })
    }
  }

  function getAvailabilities(days, times, baseUrl, apiToken) {
      var now = moment();
      var end = moment(now).endOf('day');

      const availabilityPromises = [];

      for (var i = 0; i < days; i++) {
        var start_time;

        if (i != 0) {
          start_time = moment(now).startOf('day');
        } else {
          start_time = moment(now);
        }

        const start_datetime = RFC3339DateString(moment(start_time).add(i, 'day'));
        const end_datetime = RFC3339DateString(moment(end).add(i, 'day'));

        var url;
        if (args.editCalendar) {
          url = baseUrl + 'users/' + args.userId + '/availabilities?start_datetime=' + start_datetime + '&end_datetime=' + end_datetime;
        } else {
          url = baseUrl + 'calendars/' + args.calendarId + '/availabilities?start_datetime=' + start_datetime + '&end_datetime=' + end_datetime;
        }
        availabilityPromises.push(
          $.ajax({'url': url, 'type':'GET',
                  'headers': {
                    "authorization": apiToken
                  },
                  success: function(result) {
                    addToTimes(result.availabilities, times)
                  }
                }
              )
            );
      }

      return availabilityPromises;
  }

  var times = [];
  const availPromises = getAvailabilities(7, times, this.baseUrl, this.apiToken);

  // // jacked up query promise
  return $.when.apply($, availPromises).then(function() {
    return {data: times};
  });
}

ConsultationKitSdk.prototype.getUserTimezone = function(args) {
    return new Promise(function(resolve, reject) {
        resolve({data :{
            timezone: 'America/New_York',
            utc_offset: -4
        }})
    })
};


ConsultationKitSdk.prototype.createAvailability = function(args) {
  // length in minutes
  var length = args.end.diff(args.start) / (60000);

  var payload = {
    user_id: args.userId,
    start_datetime: RFC3339DateString(args.start),
    length_minutes: length
  }

  return $.ajax({
    url: this.baseUrl + 'availabilities',
    type: 'POST',
    data: JSON.stringify(payload),
    contentType: 'application/json',
    dataType: "json",
    'headers': {
      "authorization": args.apiToken
    }
  })
}


module.exports = ConsultationKitSdk;

// takes moment date
function RFC3339DateString(d){
  function pad(n){return n<10 ? '0'+n : n}
  return d.utc().year()+'-'
      + pad(d.utc().month()+1)+'-'
      + pad(d.utc().date())+'T'
      + pad(d.utc().hours())+':'
      + pad(d.utc().minutes())+':'
      + pad(d.utc().seconds())+'Z'
}
