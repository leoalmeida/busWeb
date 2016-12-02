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
        .controller('LeafletController', LeafletController);

    LeafletController.$inject = ['$scope', "$compile", 'leafletData', '$mdDialog'];

    function LeafletController($scope, $compile, leafletData, $mdDialog) {
        var vm = this;

        vm.compiledTemplate = $compile(
            "<div ng-controller='PathPopupController'><h3>Route from London to Rome</h3><p>Distance: 1862km</p>" +
            "<button ng-click='clickFromPopup(\"europe\")'>click</button></div>")($scope.$new(true));

        leafletData.getMap('mymap').then(function(map) {
            L.GeoIP.centerMapOnPosition(map, 15);
        });

        vm.watchOptions = {
            paths: {
                individual: { type: 'watch'}, //this keeps infdigest errors from happening.... (deep by default)
                type: 'watchCollection'
            }
        },

        vm.center = {
            lat: -21.9810575,
            lng: -47.8792745,
            zoom: 11,
            message: 'london'
        };
        vm.paths = {
            p1: {
                color: '#008000',
                weight: 8,
                latlngs: [
                    { lat: -21.9810575, lng: -47.8792745  },
                    { lat: -21.9810464, lng: -47.8795119  },
                    { lat: -21.9810157, lng: -47.8803076  },
                    { lat: -21.9809879, lng: -47.8810303  },
                    { lat: -21.9809756, lng: -47.8817756 }
                ]
            },
            message: compiledTemplate[0]
        };

        vm.getRoutes = function (){
            if (vm.selectedLine) {
                vm.loadingDB+=3;
                getDBInfo("routes", loadRoutes, "route_id", vm.selectedLine.value);
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

                    addCheckOption(vm.routes[routeID-1].name);
                }

                vm.routes[routeID-1].push(marker);
            }
            vm.loadingDB--;
            $scope.$apply();

            getDBInfo("linestops", loadStops, "trip_id", vm.selectedLine.key);
            //getDBInfo("readings"+vm.selectedLine.line, loadReadings, "linha", vm.selectedLine.value);
            //getDBInfo("readings0000b", loadReadings, "codigo", vm.selectedLine.codigoLinha);
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
            addCheckOption("Paradas");
            $scope.$apply();
        };
        var loadReadings = function() {
            vm.readings = this.data;

            var readID = 0;
            var lastdir = -1;
            var readlist = [];

            for (var i = 0; i < vm.readings.length; i++) {
                var reading = vm.readings[i];
                if(lastdir != reading.Sentido)  {
                    lastdir = reading.Sentido;
                    readID = vm.readRoutes.push(new Reading(reading));
                }
                vm.allReadings.push(vm.routes[reading.Sentido-1].minPointDist(reading));
            }

            /*vm.allReadings = vm.allReadings.sort(function(a,b){
                if (a.direction==b.direction)
                    return a.pointId - b.pointId;
                else
                    return a.direction - b.direction;
            });*/

            if (vm.readings.length)
                var routeID = vm.routes.push(new Reading(vm.readings[0]));

            for (var i = 0; i < vm.allReadings.length; i++) vm.routes[routeID-1].push(vm.allReadings[i]);

            vm.loadingDB--;
            addCheckOption("Leituras");
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
        //getDBInfo("lines", loadAllLines, null, 0);

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

        function addCheckOption(name){
            vm.items.push(name);
            vm.selected.push(name);
        }
    }

})(angular);
