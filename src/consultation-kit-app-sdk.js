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

ConsultationKitSdk.prototype.findTime = function(args) {
  var addDay = function (date, amount) {
      return new Date(date.valueOf() + amount * (1000 * 60 * 60 * 24));
  };
  var toBeginningOfDay = function (date) {
      return date.setHours(0,0,0,0);
  };

  var toEndOfDay = function (date) {
    return date.setHours(23,59,59,99);
  }

  function addToTimes(availabilities, times) {
    for (var i = 0; i < availabilities.length; i++) {
      times.push({
        start: availabilities[i].start_datetime,
        end: availabilities[i].end_datetime
      })
    }
  }

  function getAvailabilities(days, times, baseUrl, apiToken) {
      var now = new Date();
      var start = toBeginningOfDay(now);
      var end = toEndOfDay(now);

      const availabiliyPromises = [];

      for (var i = 0; i < days; i++) {
        const start_datetime = RFC3339DateString(addDay(start, i));
        const end_datetime = RFC3339DateString(addDay(end, i));

        const url = baseUrl + 'calendars/' + args.calendarId + '/availabilities?start_datetime=' + start_datetime + '&end_datetime=' + end_datetime;
        availabiliyPromises.push(
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

      return availabiliyPromises;
  }

  var times = [];
  const availPromises = getAvailabilities(7, times, this.baseUrl, this.apiToken);

  // // jacked up query promise
  return $.when.apply($, availPromises).then(function() {
    return {data: times};
  });
}

ConsultationKitSdk.prototype.getUserTimezone = function(args) {
  console.log(args);
  $.ajax({
    url: this.baseUrl + 'users/' + this.userId + '/timezone',
    type: 'GET',
    success: function(result) {
      console.log("DONE BITCH");
      return result
    }});
}


module.exports = ConsultationKitSdk;

function RFC3339DateString(d){
  function pad(n){return n<10 ? '0'+n : n}
  return d.getUTCFullYear()+'-'
      + pad(d.getUTCMonth()+1)+'-'
      + pad(d.getUTCDate())+'T'
      + pad(d.getUTCHours())+':'
      + pad(d.getUTCMinutes())+':'
      + pad(d.getUTCSeconds())+'Z'
}
