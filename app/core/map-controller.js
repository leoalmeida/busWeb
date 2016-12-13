(function(angular) {
    'use strict';

    var icons = {
        bus: {
            url: "img/ic_directions_bus_24px.svg",
            size: [24, 24],
            origin: [0,0],
            anchor: [12,12]
        },
        stop: {
            url: "img/fun-Bus.svg",
            size: [32, 32],
            origin: [0,0],
            anchor: [0,32]
        },
        point: {
            url: "img/ic_lens_24px.svg",
            size: [32, 32],
            origin: [0,0],
            anchor: [0,32]
        }
    };

    var shape = {
        coords: [1, 1, 1, 20, 18, 20, 18 , 1],
        type: 'poly'
    };
    var shapeStop = {
        coords: [1, 1, 1, 32, 28, 32, 28 , 1],
        type: 'poly'
    };


    angular
        .module('app.core')
        .controller('MapController', MapController);

    MapController.$inject = ['$scope', 'NgMap', '$mdDialog'];

    function MapController($scope, NgMap, $mdDialog) {
        var vm = this;
        var infoWindow = new google.maps.InfoWindow();

        vm.mapZoom=11;
        vm.mapCenter = "São Paulo-SP";
        vm.bus = icons.bus;
        vm.stop = icons.stop;
        vm.point = icons.point;
        vm.shape = shape;
        vm.shapeStop = shapeStop;
        vm.routes = vm.allPoints = [];
        vm.readRoutes = [];
        vm.allMarkers = [];
        vm.allReadings = [];
        vm.readlist = [];
        vm.lines        = '';
        vm.selectedLine  = null;
        vm.searchText    = null;
        vm.loadingDB = 0;
        vm.items = [];
        vm.selected = [];

        NgMap.getMap().then(function(map) {
            vm.map = map;
            vm.getRoutes();
        });

        vm.toggleBounce = function() {
            if (this.getAnimation() != null) {
                this.setAnimation(null);
            } else {
                this.setAnimation(google.maps.Animation.BOUNCE);
            }
        };

        vm.showDetail = function(event, item, marker) {
            vm.item = item;
            vm.mapCenter = event.latLng;
            vm.infopos = vm.mapCenter;
            // vm.map.showInfoWindow(item.id, vm.infopos);
            var direcao = (vm.item.info.direction_id)?"Volta": "Ida";

            var dtavl = new Date(vm.item.info.dtavl);

            var type = (vm.item.name=="Leituras GPS")? "Rota de GPS" : "Rota Padrão";
            var contentString = '<h3>' + type;
            contentString += '</h3><br/> Linha (id): '+ vm.item.info.linha + ' (' + vm.item.info.idlinha + ')';
            contentString += '<br/> Direção: '+ direcao;
            contentString +='<br/> Nome: '+ vm.item.info.linha;
            contentString +='<br/> Indice: '+ vm.item.info.shape_idx;
            contentString +='<br/> Latitude: ' + vm.item.info.latitude;
            contentString +='<br/> Longitude: '+ vm.item.info.longitude;
            contentString +='<br/> Distancia Shape: '+ vm.item.info.shape_distance;
            contentString +='<br/> Ponto: '+ vm.item.info.idponto;
            contentString +='<br/> Data: '+ dtavl.getDate()  + "/" + (dtavl.getMonth()+1) + "/" + dtavl.getFullYear() + " " +
                dtavl.getHours() + ":" + dtavl.getMinutes();

            infoWindow.setContent(contentString);
            if (marker) infoWindow.open(vm.map, marker);
            else {
                infoWindow.setPosition(event.latLng);
                infoWindow.open(vm.map);
            }

        };

        vm.showStopDetail = function(event, item) {
            vm.mapCenter = [item.lat,item.lng];

            var contentString = '<h2>Parada: '+ item.display;
            contentString += '</h2><br/>('+ item.sequence +') Altura: '+ item.ref;
            contentString += '<br/> <strong>Linha:</strong>'+ item.route;
            contentString += '<br/> Latitude: ' + item.lat;
            contentString += '<br/> Longitude: '+ item.lng;

            infoWindow.setContent(contentString);
            infoWindow.setPosition(event.latLng);
            infoWindow.open(vm.map);
        };

        function clearmap(){
            vm.routes = [];
            vm.readRoutes = [];
            vm.allReadings = [];
            vm.allMarkers = [];
            vm.allStops = [];
            vm.items = [];
            vm.selected = [];
        }

        vm.getRoutes = function (){
            if (vm.selectedLine) {
                vm.loadingDB+=3;
                clearmap();
                getDBInfo("routes", loadRoutes, "line_id", vm.selectedLine.codigoLinha);
            }
        };

        vm.onLineEnter = function (event, shape) {
            if (shape) shape.options = shape.hoveredStroke;
            $scope.$apply();
        };

        vm.onLineLeave = function (event, shape) {
            if (shape) shape.options = shape.lineStroke;
            $scope.$apply();
        };

        vm.onLineClick = function (event, shape) {
            vm.showDetail(event, shape)
        };

        var loadRoutes = function(){
            vm.markers = this.data;
            var routeID = 0;
            var lastdir = -1;

            for (var i = 0; i < vm.markers.length; i++) {
                var marker = vm.markers[i];

                if (i==0) vm.mapCenter = [marker.shape_pt_lat,marker.shape_pt_lon];

                if(lastdir != marker.direction_id)  {
                    lastdir = marker.direction_id;
                    routeID = vm.routes.push(new Route(marker));
                    vm.allMarkers.push(marker.shape_pt_lat, marker.shape_pt_lon);

                    addCheckOption(vm.routes[routeID-1].name, true);
                }

                vm.routes[routeID-1].push(marker);
            }
            vm.loadingDB--;
            $scope.$apply();

            getDBInfo("linestops", loadStops, "trip_id", vm.selectedLine.key);
            //getDBInfo("readings"+vm.selectedLine.codigoLinha, loadReadings, "idlinha", vm.selectedLine.codigoLinha);
            getHDFSInfo("sparkstream"+vm.selectedLine.codigoLinha, loadReadings, "linha", vm.selectedLine.value);
        };
        var loadAllLines = function() {
            vm.lines = this.data.map(function (line) {
                return {
                    line: line.Letreiro,
                    value: line.Letreiro + '-' + line.Tipo,
                    display: line.DenominacaoTPTS + '-' + line.DenominacaoTSTP,
                    key: line.Letreiro + '-' + line.Tipo + '-' + line.Sentido,
                    sentido: line.Sentido,
                    codigoLinha: line.CodigoLinha,
                    circular: (line.Circular)?true:false
                };
            });
            vm.selectedLine = vm.lines[0];
            vm.loadingDB--;
            $scope.$apply();
        };
        var loadStops = function() {
            vm.allStops = this.data.map(function (stop) {
                return {
                    value: stop.stop_id,
                    display: stop.stop_name,
                    sequence: stop.stop_sequence,
                    route: stop.trip_id,
                    ref: stop.stop_desc,
                    lat: stop.stop_lat,
                    lng: stop.stop_lon
                };
            });
            vm.loadingDB--;
            addCheckOption("Paradas", false);
            $scope.$apply();
        };
        var loadReadings = function() {
            vm.readings = this.data;

            var readID = 0;
            var lastdir = -1;
            var readlist = [];

            for (var i = 0; i < vm.readings.length; i++) {
                var reading = vm.readings[i];
                if(lastdir != reading.sentido)  {
                    lastdir = reading.sentido;
                    readID = vm.readRoutes.push(new Reading(reading));
                }
                vm.allReadings.push(vm.routes[reading.sentido].minPointDist(reading));
            }

            vm.allReadings = vm.allReadings.sort(function(a,b){
                if (a.direction==b.direction)
                    return a.pointId - b.pointId;
                else
                    return a.direction - b.direction;
            });

            if (vm.readings.length){
                var routeID = vm.routes.push(new Reading(vm.readings[0], "Clean"));
                addCheckOption("Clean", true);
                var routeIDcorrected = vm.routes.push(new Reading(vm.readings[0], "Corrigido"));
                addCheckOption("Corrigido", true);
                var routeIDFull = vm.routes.push(new Reading(vm.readings[0], "Full"));
                addCheckOption("Full", true);
            }

            for (var i = 0; i < vm.allReadings.length; i++) {
                var point = vm.allReadings[i];
                if ((point.distance * 10000) < 1 ) {
                    vm.routes[routeID-1].push(point);
                }
                vm.routes[routeIDcorrected-1].pushcorrected(point);
                vm.routes[routeIDFull-1].push(point);
            }

            vm.loadingDB--;
            $scope.$apply();
        };

        vm.querySearch = function(query) {
            return query ? vm.lines.filter( createFilterFor(query) ) : vm.lines;
        }

        var createFilterFor = function(query) {
            var lowercaseQuery = angular.lowercase(query);

            return function filterFn(line) {
                return (line.value.indexOf(lowercaseQuery) === 0);
            };

        }

        var loadingBox = function(){
            if (!vm.loadingDB) {
                $mdDialog.hide();
                vm.loading = false;
            }else if (!vm.loading){
                /*$mdDialog.show({
                    templateUrl: 'app/core/wait.html',
                    parent: angular.element(document.body),
                    clickOutsideToClose:false
                });*/
                vm.loading = true;
            }

        }

        vm.loadingDB++;
        getDBInfo("lines", loadAllLines, null, 0);

        $scope.$watch('vm.loadingDB', loadingBox);

        vm.toggle = function (item, list) {
            var idx = list.indexOf(item);
            if (idx > -1) {
                list.splice(idx, 1);
            }
            else {
                list.push(item);
            }
        };

        vm.exists = function (item, list) {
            return list.indexOf(item) > -1;
        };

        vm.isIndeterminate = function() {
            return (vm.selected.length !== 0 &&
            vm.selected.length !== vm.items.length);
        };

        vm.isChecked = function() {
            return vm.selected.length === vm.items.length;
        };

        vm.toggleAll = function() {
            if (vm.selected.length === vm.items.length) {
                vm.selected = [];
            } else if (vm.selected.length === 0 || vm.selected.length > 0) {
                vm.selected = vm.items.slice(0);
            }
        };

        function addCheckOption(name, selected){
            vm.items.push(name);
            vm.selected.push(name);
        }

        var minPointDist = function (routes, point){
            var indice = 0, min = 360;
            routes.every(function(element, index, array) {
                routes[index].points.every(function (element, index, array) {
                    var distance = Math.sqrt(Math.pow((element.shape_pt_lat - point.lat), 2) + Math.pow((element.shape_pt_lon - point.lon), 2));
                    if (distance < min) {
                        min = distance;
                        indice = index;
                    }
                    return true;
                });
            });

            var closer = {
                direction: point.Sentido,
                pointId: indice,
                distance: min,
                closerPath: [routes.points[indice].shape_pt_lat, routes.points[indice].shape_pt_lon],
                lat: point.lat,
                lon: point.lon
            };

            return closer;
        }
    }

})(angular);
