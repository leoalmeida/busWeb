//Global attributes
var colors = ["#36c100", "#0060aa", "#373f34", "#668ba8", "#e2d393","#50514f", "#000000"];
var defaultHoveredStroke = { strokeColor: '#d64f4f', strokeOpacity: 1.0, strokeWeight: 3 , zIndex: 5};
var defaultLineStroke = {strokeColor: colors[0], strokeOpacity: 0.6, strokeWeight: 3, zIndex: 1};
var url = "http://localhost:8080/";

// Marker constructor
function Marker(){
    this.values = [];
}
// Marker actions
Marker.prototype.push = function(a, b) {
    this.values.push([a,b]);
};

// Line constructor
function Line(pa, pb, direction){
    this.pa = pa;
    this.pb = pb;
    this.direction = direction;
}

// Point constructor
function Point(x, y){
    this.x = x;
    this.y = y;
}

// Route constructor
function Route(firstPoint) {
    this.route = [];
    this.path = [];
    this.points = [];
    this.direction = firstPoint.direction_id;
    this.info = firstPoint;
    this.name = firstPoint.linha + (firstPoint.direction_id?" (V)":" (I)");
    this.lineStroke = {
        strokeColor: colors[firstPoint.direction_id],
        strokeOpacity: defaultLineStroke.strokeColor,
        strokeWeight: defaultLineStroke.strokeWeight,
        zIndex: defaultLineStroke.zIndex
    };
    this.hoveredStroke = defaultHoveredStroke;
    this.options = this.lineStroke;
}
// Route actions
Route.prototype.push = function (point) {
    if (this.points.length) {
        var latest = this.points[this.points.length-1];

        var line = new Line(
            new Point(latest.shape_pt_lat, latest.shape_pt_lon),
            new Point(point.shape_pt_lat, point.shape_pt_lon));

        this.route.push(line);
    }

    this.path.push([point.shape_pt_lat, point.shape_pt_lon]);
    this.points.push(point);
};

Route.prototype.getShape = function (direction_id, name, item) {
    return {
        id: 'info',
        name: this.name,
        info: this,
        path: this.path,
        direction: this.direction,
        options: this.options,
        lineStroke: this.lineStroke,
        hoveredStroke: this.hoveredStroke
    };
};

Route.prototype.minPointDist = function (point){
    /*this.points.every(function (element, index, array) {
        var distance = Math.sqrt(Math.pow((element.shape_pt_lat - point.lat), 2) + Math.pow((element.shape_pt_lon - point.lon), 2));
        if (distance < min) {
            min = distance;
            indice = index;
        }
        return true;
    });*/

    return {
        direction: point.sentido,
        pointId: point.shape_idx,
        distance: point.shape_distance,
        closerPath: [point.shape_lat, point.shape_lon],
        lat: point.latitude,
        lon: point.longitude
    };
}

// Reading constructor
function Reading(firstPoint, name) {
    this.path = [];
    this.points = [];
    this.direction = firstPoint.sentido;
    this.name = name;
    this.info = firstPoint;
    this.lineStroke = {
        strokeColor: colors[firstPoint.sentido+1],
        strokeOpacity: defaultLineStroke.strokeOpacity,
        strokeWeight: defaultLineStroke.strokeWeight,
        zIndex: defaultLineStroke.zIndex
    };
    this.hoveredStroke = defaultHoveredStroke;
    this.options = this.lineStroke;
}
// Reading actions
Reading.prototype.push = function (point) {
    this.points.push(point);
    this.path.push([point.lat, point.lon]);
};

// Reading actions
Reading.prototype.pushcorrected = function (point) {
    this.points.push(point);
    this.path.push([point.closerPath[0], point.closerPath[1]]);
};



function DBInfo(key, keyval){
    this.retcode = 0;
    this.retmsg = "";
    this.key = key;
    this.keyval = keyval;
    this.data = [];
}
// DBInfo actions
DBInfo.prototype.process = function(callback, xhr) {
    var objSchema = {};
    var resp = JSON.parse(xhr.responseText);
    var keyid = null;

    for (column in resp.columns) {
        if (resp.columns[column].name == this.key) keyid = column;
        objSchema[resp.columns[column].name] = column;
    }

    if (this.key & !keyid) {
        this.retcode = -1;
        this.retmsg = "Chave inválida";
    }else {
        for (row in resp.rows) {
            if (this.keyval && (resp.rows[row][keyid] != this.keyval)) continue;

            var object = Object.assign({}, objSchema);
            for (keys in object) {
                object[keys] = resp.rows[row][object[keys]];
            }
            this.data.push(object);
        }
    }
    callback.call(this);
}


// global actions
function getDBInfo(storage, cb, key, keyval){
    var xhr = new XMLHttpRequest();
    var t = new DBInfo(key, keyval);

    xhr.open("GET", chrome.extension.getURL('/data/'+ storage + '.json'), true);
    xhr.onreadystatechange = function(){
        if (xhr.readyState == 4) {
            t.process(cb, xhr);
        }
    }

    xhr.send();
};

var re = new RegExp('^[{].*','g');

// DBInfo actions
DBInfo.prototype.HDFSprocess = function(callback, xhr) {
    var objSchema = {};
    var resp = xhr.responseText.split("\n");

    var keyid = null;

    if (this.key & !keyid) {
        this.retcode = -1;
        this.retmsg = "Chave inválida";
    }else {
        for (row in resp) {
            if (resp[row]) this.data.push(JSON.parse(resp[row]));
        }
    }
    callback.call(this);
}

// global actions
function getHDFSInfo(storage, cb, key, keyval){
    var xhr = new XMLHttpRequest();
    var t = new DBInfo(key, keyval);

    xhr.open("GET", url + storage, false);
    xhr.onreadystatechange = function(){
        if (xhr.readyState == 4) {
            t.HDFSprocess(cb, xhr);
        }
    }

    xhr.send();
};