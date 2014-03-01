'use strict';

// Declare app level module which depends on filters, and services
angular.module('myApp', ['googlechart', 'LocalStorageModule'])
.service('AuthService', AuthService)
.controller('CaloriesCtrl', CaloriesCtrl);
