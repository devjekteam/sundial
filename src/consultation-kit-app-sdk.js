function ConsultationKitSdk() {
    if (!(this instanceof ConsultationKitSdk)) {
        return new ConsultationKitSdk();
    }

    this.userId = null;
    this.apiToken = null;
    this.baseUrl = null;
    this.calendarId = null;
}

ConsultationKitSdk.prototype.setup = function(userId, apiToken, baseUrl, calendarId) {
    this.userId = userId;
    this.apiToken = apiToken;
    this.baseUrl = baseUrl;
    this.calendarId = calendarId;
};

ConsultationKitSdk.prototype.createPayment = function() {

    var url = this.baseUrl + '/payments';
    return $.ajax({'url': url, 'type':'POST',
            'headers': {
                "authorization": this.apiToken
            },
            data: JSON.stringify({
                calendar_id: this.calendarId
            }),
            contentType: "application/json"
        }
    );
};

ConsultationKitSdk.prototype.createBooking = function(args) {

    var url = this.baseUrl + '/bookings';
    return $.ajax({'url': url, 'type':'POST',
            'headers': {
                "authorization": this.apiToken
            },
            contentType: "application/json",
            data: JSON.stringify({
                start_datetime: args.start_datetime,
                end_datetime: args.end_datetime,
                calendar_id: this.calendarId,
                payment_id: args.payment_id,
                payer_id: args.payer_id,
                client: args.client
            })
        }
    );
};

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

    function getAvailabilities(times, baseUrl, apiToken, calendarId) {
        var start_of_week = args.start;
        var end_of_first_day = moment(start_of_week).endOf('day');

        var availabilityPromises = [];
        var shouldSkip = false;

        for (var i = 0; i < args.days; i++) {
            var start_of_day = moment(start_of_week).add(i, 'day');

            var start_datetime = RFC3339DateString(start_of_day);
            var end_datetime = RFC3339DateString(moment(end_of_first_day).add(i, 'day'));

            if (start_of_day.isBefore(moment()) && !args.editCalendar) {
                if (start_of_day.isSame(moment(), 'day'))
                    start_datetime = RFC3339DateString(moment());
                else
                    shouldSkip = true;
            }
            if (!shouldSkip) {
                var url;
                if (args.editCalendar) {
                    url = baseUrl + '/users/' + args.userId + '/availabilities?start_datetime=' + start_datetime + '&end_datetime=' + end_datetime;
                } else {
                    url = baseUrl + '/calendars/' + calendarId + '/availabilities?start_datetime=' + start_datetime + '&end_datetime=' + end_datetime;
                }
                availabilityPromises.push(
                    $.ajax({
                        'url': url, 'type': 'GET',
                        'headers': {
                            "authorization": apiToken
                        },
                        success: function (result) {
                            addToTimes(result.availabilities, times)
                        }
                    })
                );
            }
            shouldSkip = false;
        }
        return availabilityPromises;
    }

    var times = [];
    var availPromises = getAvailabilities(times, this.baseUrl, this.apiToken, this.calendarId);

    // // jacked up query promise
    return $.when.apply($, availPromises).then(function() {
    return {data: times};
    });
};

ConsultationKitSdk.prototype.getCalendarConfig = function(calendar) {
    var url = this.baseUrl + '/calendars/' + calendar + '/config';
    return $.ajax({'url': url, 'type':'GET',
            'headers': {
                "authorization": this.apiToken
            },
            contentType: "application/json"
        }
    );
};

ConsultationKitSdk.prototype.createAvailability = function(start, end) {
  // length in minutes
  var length = end.diff(start) / (60000);

  var payload = {
    start_datetime: RFC3339DateString(start),
    length_minutes: length,
    calendar_id: this.calendarId
  };

  return $.ajax({
    url: this.baseUrl + '/availabilities',
    type: 'POST',
    data: JSON.stringify(payload),
    contentType: 'application/json',
    dataType: "json",
    'headers': {
      "authorization": this.apiToken
    }
  })
};

ConsultationKitSdk.prototype.updateAvailability = function(availabilityId, startTime, endTime) {

    var start = $.extend(true, {}, startTime);
    var end = $.extend(true, {}, endTime);

    var payload = {
        user_id: this.userId,
        start_datetime: RFC3339DateString(start),
        end_datetime: RFC3339DateString(end)
    };

    $.ajax({
        url: this.baseUrl + '/availabilities/' + availabilityId,
        type: 'PUT',
        data: JSON.stringify(payload),
        contentType: 'application/json',
        dataType: "json",
        'headers': {
            "authorization": this.apiToken
        }
    })
};


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
