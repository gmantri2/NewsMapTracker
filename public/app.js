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
    var coordinates = await fetch(currUrl + `coordinates`, {
        method: 'GET'
    })
    var urls = await fetch(currUrl + `urls`, {
        method: 'GET'
    })
    var titles = await fetch(currUrl + `titles`, {
        method: 'GET'
    })
    var images = await fetch(currUrl + `images`, {
        method: 'GET'
    })
    coordinates = await coordinates.json()
    urls = await urls.json()
    titles = await titles.json()
    images = await images.json()

    var layers = [];
    for (let i = 0; i < coordinates.length; i++) {
        const marker = create_marker(coordinates[i]);
        map.addLayer(marker);
        layers.push(marker);
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

            content.innerHTML = url_ref_new.replace("a target=", "a class=titles target=");
            if (image_url != "") {
                // var img = new Image();   
                // img.onload = function(){
                content.innerHTML += "<span class=break></span>"
                content.innerHTML += "<img src="+image_url+" width='255px' height='153px' onerror=\"this.onerror=null;this.src='image-not-found.png'\">"
                // };
                // img.src = image_url; 
            }
            overlay.setPosition(evt.coordinate);
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
    map.setTarget('map');
    await getDate();
    await updateTime();
}

run();