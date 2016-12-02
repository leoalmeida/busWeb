(function(angular) {
    'use strict';

    angular
        .module('app.core')
        .config(config);

    config.$inject = ['$routeProvider'];

    function config($routeProvider) {
        $routeProvider
            .when('/', {
                templateUrl: 'app/core/map-details.html',
                controller: 'MapController',
                controllerAs: 'vm'
            });
    };

})(angular);
