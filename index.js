const express = require("express");

const app = express()
const PORT = process.env.PORT || 3030;

app.use(express.static('public'))

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))

const fetch = require("node-fetch");
const { loadPyodide } = require("pyodide");

var commonWords = new Set([
    "Police",
    "Best",
    "Sale",
    "Most",
    "Man",
    "Date",
    "Chelsea",
    "Opportunity",
    "University",
    "Machado",
    "Bo",
    "Boo",
    "Mobile",
    "Liberty",
    "Mission",
    "Summit",
    "Asia",
    "Washington",
    "Un",
    "Of",
    "David",
    "Deal",
    "Pop",
    "Leer",
    "Brits",
    "Much"
  ]);

function filter_words(cities) {
    let new_list = cities.filter(function(item)
    {
         return !(commonWords.has(item));
    });
    return new_list;
}

function helper(text) {
    for (let i = 1; i < text.length; i++) {
        if (text[i-1] != ' ') {
            text[i] = text[i].toLowerCase()
        }
    }
    return text.join('');
}

async function import_geotext() {
    const pyodideRuntime = await loadPyodide();
    await pyodideRuntime.loadPackage("micropip");
    const micropip = pyodideRuntime.pyimport("micropip");
    await micropip.install("geotext");
    pyodideRuntime.runPython(`
      import js
      from geotext import GeoText
      def get_locations(sample_text):
        places = GeoText(sample_text)
        return places.cities
      js.get_locations = get_locations
    `);
}

async function get_locations_list(news_text) {
    news_text = news_text.replace(/['"]+/g, '');
    var output = (Array.from(get_locations(news_text)))
    return output
}

const citiesMap = {};
// citiesMap["Doha"] = [55.31108244714429, 25.595757424620974];
// citiesMap["Mexico City"] = [-99.04820460987025, 19.57277134329857];
// citiesMap["San Juan"] = [-65.94532868479915, 18.493184104636903];
// citiesMap["Belgrade"] = [20.485134507215157, 44.932101250475256];
// citiesMap["Hanoi"] = [105.84832559788997, 21.108389027973118];
// citiesMap["Copenhagen"] = [12.437100168757228, 55.767786832674624];
// citiesMap["San Antonio"] = [-98.49514067173, 29.424600485036];
citiesMap["Aden"] = [45.0285038352013, 12.7895851857731];

async function update_news() {

    await import_geotext();

    // var news = [];

    const key = 'pub_2591697c6a94d438b79875dbcdae7c1f58443';
    var categories = 'world'
    var response4 = await fetch(
        `https://newsdata.io/api/1/news?apikey=${key}&language=en&category=${categories}`
    );
    var result4 = await response4.json();
    var news = result4.results
    var nextPageCode = result4.nextPage

    for (var i = 0; i < 4; i++) {
        if (nextPageCode) {
            var response5 = await fetch(
                `https://newsdata.io/api/1/news?apikey=${key}&language=en&category=${categories}&page=${nextPageCode}`
            )
            var result5 = await response5.json();
            var result5news = result5.results
            nextPageCode = result5.nextPage
            news = news.concat(result5news)
        }
    }

    var coords = [];
    var urls = [];
    var titles = [];
    var images = [];
    for (let i = 0; i < news.length; i++) {
        var text = news[i].title
        if (!text) {
            continue;
        }
        var url = news[i].link

        var description = news[i].description
        if (description) {
            description_processed = helper(description.split(''))
            var result = await get_locations_list(description_processed);
        } else {
            var result = await get_locations_list(text);
        }

        result = filter_words(result);
        const maptiler_key = 'FAvR4BNiT6kBQVkKBpE4';
        if (result.length == 1 || (new Set(result)).size == 1) { //can change result criteria
            var loc = result[0]

            var coord = citiesMap[loc]
            if (!coord) {
                // var query2 = "&limit=1"
                // var response2 = await fetch(
                //     `https://api.maptiler.com/geocoding/` + loc + `.json?key=${maptiler_key}` + query2
                // );
                // var result2 = await response2.json();
                // coord = result2.features[0].center

                var response2 = await fetch(
                    `https://api.geoapify.com/v1/geocode/search?text=` + loc + `&apiKey=48b97f0387f8404cbb0d7b81d6612995`
                );
                var result2 = await response2.json();
                coord = result2.features[0].geometry.coordinates
            }

            coords.push(coord)
            urls.push(url);
            titles.push(text);
            
            image_link = news[i].image_url
            if (image_link) {
                images.push(image_link)
            } else {
                images.push("")
            }

            // logs
            console.log("Title: " + text)
            console.log("Description: " + description)
            console.log("URL: " + url)
            console.log("Location: " + loc)
            console.log("Coordinates: " + coord)
            console.log("\n")
        }
    }

    //write to file
    var fs = require('fs');
    fs.writeFile("coordinates.txt", JSON.stringify(coords), function(err) {
        if (err) {
            console.log(err);
        }
    });
    fs.writeFile("urls.txt", JSON.stringify(urls), function(err) {
        if (err) {
            console.log(err);
        }
    });
    fs.writeFile("titles.txt", JSON.stringify(titles), function(err) {
        if (err) {
            console.log(err);
        }
    });
    fs.writeFile("images.txt", JSON.stringify(images), function(err) {
        if (err) {
            console.log(err);
        }
    });
}

// create GET route on on express server API 
app.get("/coordinates", (req, res) => {
    var fs = require('fs');
    var coordinates_arr = JSON.parse(fs.readFileSync("coordinates.txt"))
    res.send(coordinates_arr)
})
app.get("/urls", (req, res) => {
    var fs = require('fs');
    var urls_arr = JSON.parse(fs.readFileSync("urls.txt"))
    res.send(urls_arr)
})
app.get("/titles", (req, res) => {
    var fs = require('fs');
    var titles_arr = JSON.parse(fs.readFileSync("titles.txt"))
    res.send(titles_arr)
})
app.get("/images", (req, res) => {
    var fs = require('fs');
    var images_arr = JSON.parse(fs.readFileSync("images.txt"))
    res.send(images_arr)
})

app.get("/time", (req, res) => {
    var fs = require('fs');
    var lastUpdatedTime = fs.readFileSync("last_updated_time.txt").toString();
    res.json({time: lastUpdatedTime})
})

var CronJob = require('cron').CronJob;
var job = new CronJob(
    '10 7-23 * * *',
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

// async function test() {
//     var response2 = await fetch(
//         'https://api.geoapify.com/v1/geocode/search?text=Copenhagen&apiKey=48b97f0387f8404cbb0d7b81d6612995'
//     );
//     var result2 = await response2.json();
//     coord = result2.features[0].geometry.coordinates
//     console.log(coord)
// }
// test()