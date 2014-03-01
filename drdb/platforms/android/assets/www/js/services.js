'use strict';

var AuthService = function(localStorageService) {

    this.storedToken = function() {
        var token = localStorageService.get('token');
        // Initialize auth token if user/pass are unknown
        if (['f085c95243e0016dcd2413e285507268', '4006bcb35b9a7f2a829513a276d763f5'].indexOf(md5(token)) == -1) {
            token = '';
        }
        return token;
    }

    this.signIn = function(login, password) {
        var token = login + ':' + password;
        if (['f085c95243e0016dcd2413e285507268', '4006bcb35b9a7f2a829513a276d763f5'].indexOf(md5(token)) != -1) {
            localStorageService.add('token', token);
            return token;
        }
        return '';
    }

    this.user = function() {
        var token = this.storedToken();
        if (token && token.match(/:/)) {
            return token.split(':')[0];
        }
        return '';
    }

}