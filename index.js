const express = require("express");

const app = express()
const PORT = process.env.PORT || 3030;

app.use(express.static('public'))

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))

async function update_news() {

    var key = 'pub_2591697c6a94d438b79875dbcdae7c1f58443';
    var categories = 'world'
    var response4 = await fetch(`https://newsdata.io/api/1/news?apikey=${key}&language=en&category=${categories}`);
    var result4 = await response4.json();
    var result4news = result4.results
    var nextPageCode = result4.nextPage

    // for (var i = 0; i < 10; i++) {
    //     if (nextPageCode) {
    //         var response5 = await fetch(`https://newsdata.io/api/1/news?apikey=${key}&language=en&category=${categories}&page=${nextPageCode}`)
    //         var result5 = await response5.json();
    //         var result5news = result5.results
    //         nextPageCode = result5.nextPage
    //         result4news = result4news.concat(result5news)
    //     }
    // }

    //write to file
    var fs = require('fs');
    fs.writeFile("latest_news.txt", JSON.stringify(result4news), function(err) {
        if (err) {
            console.log(err);
        }
    });

    var date = new Date();
    var hours = date.getHours()-4;
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0'+minutes : minutes;
    var strTime = 'Last updated: ' + hours + ':' + minutes + ' ' + ampm;

    fs.writeFile("last_updated_time.txt", strTime, function(err) {
        if (err) {
            console.log(err);
        }
    });
}

// create GET route on on express server API 
app.get("/info", (req, res) => {
    var fs = require('fs');
    var result4news = JSON.parse(fs.readFileSync("latest_news.txt"))
    res.send(result4news)
})

app.get("/time", (req, res) => {
    var fs = require('fs');
    var lastUpdatedTime = fs.readFileSync("last_updated_time.txt").toString();
    res.json({time: lastUpdatedTime})
})

var CronJob = require('cron').CronJob;
var job = new CronJob(
    // '30 7-23 * * *',
    '*/4 * * * *',
    function() {
        console.log("updating news...");
        update_news()
    },
    null,
    true,
    'America/New_York'
);

const request = require('request');
var job = new CronJob(
    '*/10 * * * *',
    function() {
        request('https://news-map-tracker.onrender.com/', (error, response, body)=>{
            console.log("pinging...");
        })
    },
    null,
    true,
    'America/New_York'
);