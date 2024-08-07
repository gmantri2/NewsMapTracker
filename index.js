const express = require("express");

const app = express()
const PORT = process.env.PORT || 3030;

app.use(express.static('public'))

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))

const fetch = require("node-fetch");

async function update_news() {

    var key = 'pub_2591697c6a94d438b79875dbcdae7c1f58443';
    var categories = 'world'
    var response4 = await fetch(`https://newsdata.io/api/1/news?apikey=${key}&language=en&category=${categories}`);
    var result4 = await response4.json();
    var result4news = result4.results
    var nextPageCode = result4.nextPage

    for (var i = 0; i < 2; i++) {
        if (nextPageCode) {
            var response5 = await fetch(`https://newsdata.io/api/1/news?apikey=${key}&language=en&category=${categories}&page=${nextPageCode}`)
            var result5 = await response5.json();
            var result5news = result5.results
            nextPageCode = result5.nextPage
            result4news = result4news.concat(result5news)
        }
    }

    //write to file
    var fs = require('fs');
    fs.writeFile("latest_news.txt", JSON.stringify(result4news), function(err) {
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
    '29 7-23 * * *',
    // '*/3 * * * *',
    function() {
        console.log("updating news...");
        update_news()
        
        var date = new Date();
        var strTime = date.toISOString();

        var fs = require('fs');
        fs.writeFile("last_updated_time.txt", strTime, function(err) {
            if (err) {
                console.log(err);
            }
        });
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