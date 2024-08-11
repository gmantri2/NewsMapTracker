// ----------map stuff

// const PORT = process.env.PORT || 3030;

const container = document.getElementById('popup');
const content = document.getElementById('popup-content');
const closer = document.getElementById('popup-closer');

const key = 'FAvR4BNiT6kBQVkKBpE4';

const overlay = new ol.Overlay({
    element: container,
    autoPan: {
      animation: {
        duration: 250,
      },
    },
  });

closer.onclick = function () {
    overlay.setPosition(undefined);
    closer.blur();
    return false;
};

const attribution = new ol.control.Attribution({
    collapsible: false,
});

const source = new ol.source.TileJSON({
    url: `https://api.maptiler.com/maps/streets-v2/tiles.json?key=${key}`, // source URL
    tileSize: 512,
    crossOrigin: 'anonymous'
});

const map = new ol.Map({
    layers: [
        new ol.layer.Tile({
            source: source
        })
    ],
    controls: ol.control.defaults.defaults({attribution: false}).extend([attribution]),
        //target: 'map',
        view: new ol.View({
            constrainResolution: false,
            center: ol.proj.fromLonLat([10, 25]), // starting position [lng, lat]
        zoom: 1 // starting zoom
        }),
    overlays: [overlay],
});

var commonWords = new Set([
    "Police",
    "Best",
    "Sale",
    "Most",
    "Man",
    "Date",
    "Chelsea",
    "Opportunity",
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

function create_marker(coord) {
    const layer = new ol.layer.Vector({
        source: new ol.source.Vector({
            features: [
            new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat(coord)),
            })
            ]
        }),
        style: new ol.style.Style({
            image: new ol.style.Icon({
                anchor: [0.5, 1],
                crossOrigin: 'anonymous',
                src: 'https://raw.githubusercontent.com/maptiler/openlayers-samples/main/default-marker/marker-icon.png',
            })
        })
    });
    return layer;
}

async function getInfo() {
    var currUrl = window.location.href
    var res = await fetch(currUrl + `info`, {
        method: 'GET'
    })
    // const res = await fetch(`https://news-map-tracker.onrender.com/info`, {
    //     method: 'GET'
    // })
    // const res = await fetch('http://localhost:3030/info', {
    //     method: 'GET'
    // })
    const news = await res.json()
    console.log(news)

    var layers = [];
    var urls = [];
    var titles = [];
    var images = [];
    await import_geotext();
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

        //var result = await get_locations_list(text);

        result = filter_words(result);
        if (result.length == 1 || (new Set(result)).size == 1) { //can change result criteria
            console.log(text)
            console.log(result)
            var loc = result[0]
            console.log(loc, i)
            var query2 = "&limit=5"
            var response2 = await fetch(`https://api.maptiler.com/geocoding/` + loc + `.json?key=${key}` + query2);
            var result2 = await response2.json();

            var index = 0;
            if (loc == "Athens" && result2.features.length > 1) {
                index = 1;
            }
            var coord = result2.features[index].center
            console.log(coord)

            const marker = create_marker(coord);
            map.addLayer(marker);

            console.log(url)
            layers.push(marker);
            urls.push(url);
            titles.push(text);
            
            image_link = news[i].image_url
            if (image_link) {
                images.push(image_link)
            } else {
                images.push("")
            }
        }
    }

    map.on('singleclick', function (evt) {
        var rets = map.forEachFeatureAtPixel(evt.pixel, function(feature, clicked_layer) {
            for (var i = 0; i < layers.length; i++) {
              if (clicked_layer == layers[i]) {
                return [feature, i]
              }
            }
        });
        if (rets) {
            const url = urls[rets[1]];
            const title = titles[rets[1]]
            const image_url = images[rets[1]]
            var url_ref = title.link(url);

            var position = 3;
            var url_ref_new = [url_ref.slice(0, position), "target=\"_blank\" ", url_ref.slice(position)].join('');

            content.innerHTML = url_ref_new;
            // console.log("image link: " + image_url)
            if (image_url != "") {
                content.innerHTML += "<br>"
                content.innerHTML += "<img src="+image_url+" width='250px' height='150px' onerror=\"this.style.display='none'\">"
            }
            const coordinate = evt.coordinate;
            overlay.setPosition(coordinate);
        }
    });

    map.on("pointermove", function (evt) {
        var hit = this.forEachFeatureAtPixel(evt.pixel, function() {
            return true;
        }); 
        if (hit) {
            this.getTargetElement().style.cursor = 'pointer';
        } else {
            this.getTargetElement().style.cursor = '';
        }
    });
}

async function updateTime() {
    var currUrl = window.location.href
    var lastUpdatedTime = await fetch(currUrl + `time`, {
        method: 'GET'
    })
    // var lastUpdatedTime = await fetch(`https://news-map-tracker.onrender.com/time`, {
    //     method: 'GET'
    // })
    // const lastUpdatedTime = await fetch('http://localhost:3030/time', {
    //     method: 'GET'
    // })
    const updatedTime = await lastUpdatedTime.json()
    const time = updatedTime.time;

    const date = new Date(time);
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0'+minutes : minutes;
    var strTime = 'Last updated at: ' + hours + ':' + minutes + ' ' + ampm;

    document.getElementById("data").innerHTML += "<div class=\"time-text\">" + strTime + "</div>";
}

async function getDate() {
    const months = ["January", "February", "March", "April", "May", "June", "July", 
        "August", "September", "October", "November", "December"]

    var currDate = new Date();
    const currMonth = currDate.getMonth()
    const currDay = currDate.getDate()

    var dateElement = document.getElementById("data")
    dateElement.innerHTML = "<div class=\"date-text\">" + months[currMonth] + " " + currDay + "</div>";
    //dateElement.innerHTML += "<div class=\"time-text\">" + "Last updated at: 11:30 pm" + "</div>"
}

// function sleep(ms) {
//     return new Promise(resolve => setTimeout(resolve, ms));
// }

async function run() {
    await getInfo();
    document.getElementById("loader").style.display = "none";
    await getDate();
    await updateTime();
    map.setTarget('map');
}

run();