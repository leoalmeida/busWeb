(function(angular) {
    'use strict';

    var dependencyModules = [
        'ngMaterial',
        'ngRoute',
        'angular-web-notification',
        'ngMap'];
    var myAppComponents = [
        'app.core'
    ];

    angular
        .module('app', dependencyModules.concat(myAppComponents))
        .config(function($mdThemingProvider) {
            var customPaletteMap = $mdThemingProvider.extendPalette('blue-grey', {
                'contrastDefaultColor': 'light',
                'contrastDarkColors': ['50'],
                '50': 'ffffff'
            });
            $mdThemingProvider.definePalette('customPaletteMap', customPaletteMap);
            $mdThemingProvider.theme('default')
                .primaryPalette('customPaletteMap', {
                    'default': '500',
                    'hue-2': '300',
                    'hue-3': '100'
                })
                .accentPalette('light-blue');
            $mdThemingProvider.theme('input', 'default')
                .primaryPalette('grey');
        });

})(angular);
