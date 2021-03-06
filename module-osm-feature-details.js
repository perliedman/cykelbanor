require=(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
// i18next, v1.11.1
// Copyright (c)2015 Jan Mühlemann (jamuhl).
// Distributed under MIT license
// http://i18next.com
(function(root) {

    // add indexOf to non ECMA-262 standard compliant browsers
    if (!Array.prototype.indexOf) {
        Array.prototype.indexOf = function (searchElement /*, fromIndex */ ) {
            "use strict";
            if (this == null) {
                throw new TypeError();
            }
            var t = Object(this);
            var len = t.length >>> 0;
            if (len === 0) {
                return -1;
            }
            var n = 0;
            if (arguments.length > 0) {
                n = Number(arguments[1]);
                if (n != n) { // shortcut for verifying if it's NaN
                    n = 0;
                } else if (n != 0 && n != Infinity && n != -Infinity) {
                    n = (n > 0 || -1) * Math.floor(Math.abs(n));
                }
            }
            if (n >= len) {
                return -1;
            }
            var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);
            for (; k < len; k++) {
                if (k in t && t[k] === searchElement) {
                    return k;
                }
            }
            return -1;
        }
    }
    
    // add lastIndexOf to non ECMA-262 standard compliant browsers
    if (!Array.prototype.lastIndexOf) {
        Array.prototype.lastIndexOf = function(searchElement /*, fromIndex*/) {
            "use strict";
            if (this == null) {
                throw new TypeError();
            }
            var t = Object(this);
            var len = t.length >>> 0;
            if (len === 0) {
                return -1;
            }
            var n = len;
            if (arguments.length > 1) {
                n = Number(arguments[1]);
                if (n != n) {
                    n = 0;
                } else if (n != 0 && n != (1 / 0) && n != -(1 / 0)) {
                    n = (n > 0 || -1) * Math.floor(Math.abs(n));
                }
            }
            var k = n >= 0 ? Math.min(n, len - 1) : len - Math.abs(n);
            for (; k >= 0; k--) {
                if (k in t && t[k] === searchElement) {
                    return k;
                }
            }
            return -1;
        };
    }
    
    // Add string trim for IE8.
    if (typeof String.prototype.trim !== 'function') {
        String.prototype.trim = function() {
            return this.replace(/^\s+|\s+$/g, ''); 
        }
    }

    var $ = root.jQuery || root.Zepto
      , i18n = {}
      , resStore = {}
      , currentLng
      , replacementCounter = 0
      , languages = []
      , initialized = false
      , sync = {}
      , conflictReference = null;



    // Export the i18next object for **CommonJS**. 
    // If we're not in CommonJS, add `i18n` to the
    // global object or to jquery.
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = i18n;
    } else {
        if ($) {
            $.i18n = $.i18n || i18n;
        }
        
        if (root.i18n) {
        	conflictReference = root.i18n;
        }
        root.i18n = i18n;
    }
    sync = {
    
        load: function(lngs, options, cb) {
            if (options.useLocalStorage) {
                sync._loadLocal(lngs, options, function(err, store) {
                    var missingLngs = [];
                    for (var i = 0, len = lngs.length; i < len; i++) {
                        if (!store[lngs[i]]) missingLngs.push(lngs[i]);
                    }
    
                    if (missingLngs.length > 0) {
                        sync._fetch(missingLngs, options, function(err, fetched) {
                            f.extend(store, fetched);
                            sync._storeLocal(fetched);
    
                            cb(err, store);
                        });
                    } else {
                        cb(err, store);
                    }
                });
            } else {
                sync._fetch(lngs, options, function(err, store){
                    cb(err, store);
                });
            }
        },
    
        _loadLocal: function(lngs, options, cb) {
            var store = {}
              , nowMS = new Date().getTime();
    
            if(window.localStorage) {
    
                var todo = lngs.length;
    
                f.each(lngs, function(key, lng) {
                    var local = f.localStorage.getItem('res_' + lng);
    
                    if (local) {
                        local = JSON.parse(local);
    
                        if (local.i18nStamp && local.i18nStamp + options.localStorageExpirationTime > nowMS) {
                            store[lng] = local;
                        }
                    }
    
                    todo--; // wait for all done befor callback
                    if (todo === 0) cb(null, store);
                });
            }
        },
    
        _storeLocal: function(store) {
            if(window.localStorage) {
                for (var m in store) {
                    store[m].i18nStamp = new Date().getTime();
                    f.localStorage.setItem('res_' + m, JSON.stringify(store[m]));
                }
            }
            return;
        },
    
        _fetch: function(lngs, options, cb) {
            var ns = options.ns
              , store = {};
            
            if (!options.dynamicLoad) {
                var todo = ns.namespaces.length * lngs.length
                  , errors;
    
                // load each file individual
                f.each(ns.namespaces, function(nsIndex, nsValue) {
                    f.each(lngs, function(lngIndex, lngValue) {
                        
                        // Call this once our translation has returned.
                        var loadComplete = function(err, data) {
                            if (err) {
                                errors = errors || [];
                                errors.push(err);
                            }
                            store[lngValue] = store[lngValue] || {};
                            store[lngValue][nsValue] = data;
    
                            todo--; // wait for all done befor callback
                            if (todo === 0) cb(errors, store);
                        };
                        
                        if(typeof options.customLoad == 'function'){
                            // Use the specified custom callback.
                            options.customLoad(lngValue, nsValue, options, loadComplete);
                        } else {
                            //~ // Use our inbuilt sync.
                            sync._fetchOne(lngValue, nsValue, options, loadComplete);
                        }
                    });
                });
            } else {
                // Call this once our translation has returned.
                var loadComplete = function(err, data) {
                    cb(err, data);
                };
    
                if(typeof options.customLoad == 'function'){
                    // Use the specified custom callback.
                    options.customLoad(lngs, ns.namespaces, options, loadComplete);
                } else {
                    var url = applyReplacement(options.resGetPath, { lng: lngs.join('+'), ns: ns.namespaces.join('+') });
                    // load all needed stuff once
                    f.ajax({
                        url: url,
                        cache: options.cache,
                        success: function(data, status, xhr) {
                            f.log('loaded: ' + url);
                            loadComplete(null, data);
                        },
                        error : function(xhr, status, error) {
                            f.log('failed loading: ' + url);
                            loadComplete('failed loading resource.json error: ' + error);
                        },
                        dataType: "json",
                        async : options.getAsync,
                        timeout: options.ajaxTimeout
                    });
                }    
            }
        },
    
        _fetchOne: function(lng, ns, options, done) {
            var url = applyReplacement(options.resGetPath, { lng: lng, ns: ns });
            f.ajax({
                url: url,
                cache: options.cache,
                success: function(data, status, xhr) {
                    f.log('loaded: ' + url);
                    done(null, data);
                },
                error : function(xhr, status, error) {
                    if ((status && status == 200) || (xhr && xhr.status && xhr.status == 200)) {
                        // file loaded but invalid json, stop waste time !
                        f.error('There is a typo in: ' + url);
                    } else if ((status && status == 404) || (xhr && xhr.status && xhr.status == 404)) {
                        f.log('Does not exist: ' + url);
                    } else {
                        var theStatus = status ? status : ((xhr && xhr.status) ? xhr.status : null);
                        f.log(theStatus + ' when loading ' + url);
                    }
                    
                    done(error, {});
                },
                dataType: "json",
                async : options.getAsync,
                timeout: options.ajaxTimeout,
                headers: options.headers
            });
        },
    
        postMissing: function(lng, ns, key, defaultValue, lngs) {
            var payload = {};
            payload[key] = defaultValue;
    
            var urls = [];
    
            if (o.sendMissingTo === 'fallback' && o.fallbackLng[0] !== false) {
                for (var i = 0; i < o.fallbackLng.length; i++) {
                    urls.push({lng: o.fallbackLng[i], url: applyReplacement(o.resPostPath, { lng: o.fallbackLng[i], ns: ns })});
                }
            } else if (o.sendMissingTo === 'current' || (o.sendMissingTo === 'fallback' && o.fallbackLng[0] === false) ) {
                urls.push({lng: lng, url: applyReplacement(o.resPostPath, { lng: lng, ns: ns })});
            } else if (o.sendMissingTo === 'all') {
                for (var i = 0, l = lngs.length; i < l; i++) {
                    urls.push({lng: lngs[i], url: applyReplacement(o.resPostPath, { lng: lngs[i], ns: ns })});
                }
            }
    
            for (var y = 0, len = urls.length; y < len; y++) {
                var item = urls[y];
                f.ajax({
                    url: item.url,
                    type: o.sendType,
                    data: payload,
                    success: function(data, status, xhr) {
                        f.log('posted missing key \'' + key + '\' to: ' + item.url);
    
                        // add key to resStore
                        var keys = key.split('.');
                        var x = 0;
                        var value = resStore[item.lng][ns];
                        while (keys[x]) {
                            if (x === keys.length - 1) {
                                value = value[keys[x]] = defaultValue;
                            } else {
                                value = value[keys[x]] = value[keys[x]] || {};
                            }
                            x++;
                        }
                    },
                    error : function(xhr, status, error) {
                        f.log('failed posting missing key \'' + key + '\' to: ' + item.url);
                    },
                    dataType: "json",
                    async : o.postAsync,
                    timeout: o.ajaxTimeout
                });
            }
        },
    
        reload: reload
    };
    // defaults
    var o = {
        lng: undefined,
        load: 'all',
        preload: [],
        lowerCaseLng: false,
        returnObjectTrees: false,
        fallbackLng: ['dev'],
        fallbackNS: [],
        detectLngQS: 'setLng',
        detectLngFromLocalStorage: false,
        ns: {
            namespaces: ['translation'],
            defaultNs: 'translation'
        },
        fallbackOnNull: true,
        fallbackOnEmpty: false,
        fallbackToDefaultNS: false,
        showKeyIfEmpty: false,
        nsseparator: ':',
        keyseparator: '.',
        selectorAttr: 'data-i18n',
        debug: false,
    
        resGetPath: 'locales/__lng__/__ns__.json',
        resPostPath: 'locales/add/__lng__/__ns__',
    
        getAsync: true,
        postAsync: true,
    
        resStore: undefined,
        useLocalStorage: false,
        localStorageExpirationTime: 7*24*60*60*1000,
    
        dynamicLoad: false,
        sendMissing: false,
        sendMissingTo: 'fallback', // current | all
        sendType: 'POST',
    
        interpolationPrefix: '__',
        interpolationSuffix: '__',
        defaultVariables: false,
        reusePrefix: '$t(',
        reuseSuffix: ')',
        pluralSuffix: '_plural',
        pluralNotFound: ['plural_not_found', Math.random()].join(''),
        contextNotFound: ['context_not_found', Math.random()].join(''),
        escapeInterpolation: false,
        indefiniteSuffix: '_indefinite',
        indefiniteNotFound: ['indefinite_not_found', Math.random()].join(''),
    
        setJqueryExt: true,
        defaultValueFromContent: true,
        useDataAttrOptions: false,
        cookieExpirationTime: undefined,
        useCookie: true,
        cookieName: 'i18next',
        cookieDomain: undefined,
    
        objectTreeKeyHandler: undefined,
        postProcess: undefined,
        parseMissingKey: undefined,
        missingKeyHandler: sync.postMissing,
        ajaxTimeout: 0,
    
        shortcutFunction: 'sprintf' // or: defaultValue
    };
    function _extend(target, source) {
        if (!source || typeof source === 'function') {
            return target;
        }
    
        for (var attr in source) { target[attr] = source[attr]; }
        return target;
    }
    
    function _deepExtend(target, source, overwrite) {
        for (var prop in source)
            if (prop in target) {
                // If we reached a leaf string in target or source then replace with source or skip depending on the 'overwrite' switch
                if (typeof target[prop] === 'string' || target[prop] instanceof String || typeof source[prop] === 'string' || source[prop] instanceof String) {
                    if (overwrite) {
                        target[prop] = source[prop];
                    }
                } else {
                    _deepExtend(target[prop], source[prop], overwrite);
                }
            } else {
                target[prop] = source[prop];
            }
        return target;
    }
    
    function _each(object, callback, args) {
        var name, i = 0,
            length = object.length,
            isObj = length === undefined || Object.prototype.toString.apply(object) !== '[object Array]' || typeof object === "function";
    
        if (args) {
            if (isObj) {
                for (name in object) {
                    if (callback.apply(object[name], args) === false) {
                        break;
                    }
                }
            } else {
                for ( ; i < length; ) {
                    if (callback.apply(object[i++], args) === false) {
                        break;
                    }
                }
            }
    
        // A special, fast, case for the most common use of each
        } else {
            if (isObj) {
                for (name in object) {
                    if (callback.call(object[name], name, object[name]) === false) {
                        break;
                    }
                }
            } else {
                for ( ; i < length; ) {
                    if (callback.call(object[i], i, object[i++]) === false) {
                        break;
                    }
                }
            }
        }
    
        return object;
    }
    
    var _entityMap = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': '&quot;',
        "'": '&#39;',
        "/": '&#x2F;'
    };
    
    function _escape(data) {
        if (typeof data === 'string') {
            return data.replace(/[&<>"'\/]/g, function (s) {
                return _entityMap[s];
            });
        }else{
            return data;
        }
    }
    
    function _ajax(options) {
    
        // v0.5.0 of https://github.com/goloroden/http.js
        var getXhr = function (callback) {
            // Use the native XHR object if the browser supports it.
            if (window.XMLHttpRequest) {
                return callback(null, new XMLHttpRequest());
            } else if (window.ActiveXObject) {
                // In Internet Explorer check for ActiveX versions of the XHR object.
                try {
                    return callback(null, new ActiveXObject("Msxml2.XMLHTTP"));
                } catch (e) {
                    return callback(null, new ActiveXObject("Microsoft.XMLHTTP"));
                }
            }
    
            // If no XHR support was found, throw an error.
            return callback(new Error());
        };
    
        var encodeUsingUrlEncoding = function (data) {
            if(typeof data === 'string') {
                return data;
            }
    
            var result = [];
            for(var dataItem in data) {
                if(data.hasOwnProperty(dataItem)) {
                    result.push(encodeURIComponent(dataItem) + '=' + encodeURIComponent(data[dataItem]));
                }
            }
    
            return result.join('&');
        };
    
        var utf8 = function (text) {
            text = text.replace(/\r\n/g, '\n');
            var result = '';
    
            for(var i = 0; i < text.length; i++) {
                var c = text.charCodeAt(i);
    
                if(c < 128) {
                        result += String.fromCharCode(c);
                } else if((c > 127) && (c < 2048)) {
                        result += String.fromCharCode((c >> 6) | 192);
                        result += String.fromCharCode((c & 63) | 128);
                } else {
                        result += String.fromCharCode((c >> 12) | 224);
                        result += String.fromCharCode(((c >> 6) & 63) | 128);
                        result += String.fromCharCode((c & 63) | 128);
                }
            }
    
            return result;
        };
    
        var base64 = function (text) {
            var keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    
            text = utf8(text);
            var result = '',
                    chr1, chr2, chr3,
                    enc1, enc2, enc3, enc4,
                    i = 0;
    
            do {
                chr1 = text.charCodeAt(i++);
                chr2 = text.charCodeAt(i++);
                chr3 = text.charCodeAt(i++);
    
                enc1 = chr1 >> 2;
                enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                enc4 = chr3 & 63;
    
                if(isNaN(chr2)) {
                    enc3 = enc4 = 64;
                } else if(isNaN(chr3)) {
                    enc4 = 64;
                }
    
                result +=
                    keyStr.charAt(enc1) +
                    keyStr.charAt(enc2) +
                    keyStr.charAt(enc3) +
                    keyStr.charAt(enc4);
                chr1 = chr2 = chr3 = '';
                enc1 = enc2 = enc3 = enc4 = '';
            } while(i < text.length);
    
            return result;
        };
    
        var mergeHeaders = function () {
            // Use the first header object as base.
            var result = arguments[0];
    
            // Iterate through the remaining header objects and add them.
            for(var i = 1; i < arguments.length; i++) {
                var currentHeaders = arguments[i];
                for(var header in currentHeaders) {
                    if(currentHeaders.hasOwnProperty(header)) {
                        result[header] = currentHeaders[header];
                    }
                }
            }
    
            // Return the merged headers.
            return result;
        };
    
        var ajax = function (method, url, options, callback) {
            // Adjust parameters.
            if(typeof options === 'function') {
                callback = options;
                options = {};
            }
    
            // Set default parameter values.
            options.cache = options.cache || false;
            options.data = options.data || {};
            options.headers = options.headers || {};
            options.jsonp = options.jsonp || false;
            options.async = options.async === undefined ? true : options.async;
    
            // Merge the various header objects.
            var headers = mergeHeaders({
                'accept': '*/*',
                'content-type': 'application/x-www-form-urlencoded;charset=UTF-8'
            }, ajax.headers, options.headers);
    
            // Encode the data according to the content-type.
            var payload;
            if (headers['content-type'] === 'application/json') {
                payload = JSON.stringify(options.data);
            } else {
                payload = encodeUsingUrlEncoding(options.data);
            }
    
            // Specially prepare GET requests: Setup the query string, handle caching and make a JSONP call
            // if neccessary.
            if(method === 'GET') {
                // Setup the query string.
                var queryString = [];
                if(payload) {
                    queryString.push(payload);
                    payload = null;
                }
    
                // Handle caching.
                if(!options.cache) {
                    queryString.push('_=' + (new Date()).getTime());
                }
    
                // If neccessary prepare the query string for a JSONP call.
                if(options.jsonp) {
                    queryString.push('callback=' + options.jsonp);
                    queryString.push('jsonp=' + options.jsonp);
                }
    
                // Merge the query string and attach it to the url.
                queryString = queryString.join('&');
                if (queryString.length > 1) {
                    if (url.indexOf('?') > -1) {
                        url += '&' + queryString;
                    } else {
                        url += '?' + queryString;
                    }
                }
    
                // Make a JSONP call if neccessary.
                if(options.jsonp) {
                    var head = document.getElementsByTagName('head')[0];
                    var script = document.createElement('script');
                    script.type = 'text/javascript';
                    script.src = url;
                    head.appendChild(script);
                    return;
                }
            }
    
            // Since we got here, it is no JSONP request, so make a normal XHR request.
            getXhr(function (err, xhr) {
                if(err) return callback(err);
    
                // Open the request.
                xhr.open(method, url, options.async);
    
                // Set the request headers.
                for(var header in headers) {
                    if(headers.hasOwnProperty(header)) {
                        xhr.setRequestHeader(header, headers[header]);
                    }
                }
    
                // Handle the request events.
                xhr.onreadystatechange = function () {
                    if(xhr.readyState === 4) {
                        var data = xhr.responseText || '';
    
                        // If no callback is given, return.
                        if(!callback) {
                            return;
                        }
    
                        // Return an object that provides access to the data as text and JSON.
                        callback(xhr.status, {
                            text: function () {
                                return data;
                            },
    
                            json: function () {
                                try {
                                    return JSON.parse(data)
                                } catch (e) {
                                    f.error('Can not parse JSON. URL: ' + url);
                                    return {};
                                }
                            }
                        });
                    }
                };
    
                // Actually send the XHR request.
                xhr.send(payload);
            });
        };
    
        // Define the external interface.
        var http = {
            authBasic: function (username, password) {
                ajax.headers['Authorization'] = 'Basic ' + base64(username + ':' + password);
            },
    
            connect: function (url, options, callback) {
                return ajax('CONNECT', url, options, callback);
            },
    
            del: function (url, options, callback) {
                return ajax('DELETE', url, options, callback);
            },
    
            get: function (url, options, callback) {
                return ajax('GET', url, options, callback);
            },
    
            head: function (url, options, callback) {
                return ajax('HEAD', url, options, callback);
            },
    
            headers: function (headers) {
                ajax.headers = headers || {};
            },
    
            isAllowed: function (url, verb, callback) {
                this.options(url, function (status, data) {
                    callback(data.text().indexOf(verb) !== -1);
                });
            },
    
            options: function (url, options, callback) {
                return ajax('OPTIONS', url, options, callback);
            },
    
            patch: function (url, options, callback) {
                return ajax('PATCH', url, options, callback);
            },
    
            post: function (url, options, callback) {
                return ajax('POST', url, options, callback);
            },
    
            put: function (url, options, callback) {
                return ajax('PUT', url, options, callback);
            },
    
            trace: function (url, options, callback) {
                return ajax('TRACE', url, options, callback);
            }
        };
    
    
        var methode = options.type ? options.type.toLowerCase() : 'get';
    
        http[methode](options.url, options, function (status, data) {
            // file: protocol always gives status code 0, so check for data
            if (status === 200 || (status === 0 && data.text())) {
                options.success(data.json(), status, null);
            } else {
                options.error(data.text(), status, null);
            }
        });
    }
    
    var _cookie = {
        create: function(name,value,minutes,domain) {
            var expires;
            if (minutes) {
                var date = new Date();
                date.setTime(date.getTime()+(minutes*60*1000));
                expires = "; expires="+date.toGMTString();
            }
            else expires = "";
            domain = (domain)? "domain="+domain+";" : "";
            document.cookie = name+"="+value+expires+";"+domain+"path=/";
        },
    
        read: function(name) {
            var nameEQ = name + "=";
            var ca = document.cookie.split(';');
            for(var i=0;i < ca.length;i++) {
                var c = ca[i];
                while (c.charAt(0)==' ') c = c.substring(1,c.length);
                if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length,c.length);
            }
            return null;
        },
    
        remove: function(name) {
            this.create(name,"",-1);
        }
    };
    
    var cookie_noop = {
        create: function(name,value,minutes,domain) {},
        read: function(name) { return null; },
        remove: function(name) {}
    };
    
    
    
    // move dependent functions to a container so that
    // they can be overriden easier in no jquery environment (node.js)
    var f = {
        extend: $ ? $.extend : _extend,
        deepExtend: _deepExtend,
        each: $ ? $.each : _each,
        ajax: $ ? $.ajax : (typeof document !== 'undefined' ? _ajax : function() {}),
        cookie: typeof document !== 'undefined' ? _cookie : cookie_noop,
        detectLanguage: detectLanguage,
        escape: _escape,
        log: function(str) {
            if (o.debug && typeof console !== "undefined") console.log(str);
        },
        error: function(str) {
            if (typeof console !== "undefined") console.error(str);
        },
        getCountyIndexOfLng: function(lng) {
            var lng_index = 0;
            if (lng === 'nb-NO' || lng === 'nn-NO' || lng === 'nb-no' || lng === 'nn-no') lng_index = 1;
            return lng_index;
        },
        toLanguages: function(lng, fallbackLng) {
            var log = this.log;
    
            fallbackLng = fallbackLng || o.fallbackLng;
            if (typeof fallbackLng === 'string')
                fallbackLng = [fallbackLng];
    
            function applyCase(l) {
                var ret = l;
    
                if (typeof l === 'string' && l.indexOf('-') > -1) {
                    var parts = l.split('-');
    
                    ret = o.lowerCaseLng ?
                        parts[0].toLowerCase() +  '-' + parts[1].toLowerCase() :
                        parts[0].toLowerCase() +  '-' + parts[1].toUpperCase();
                } else {
                    ret = o.lowerCaseLng ? l.toLowerCase() : l;
                }
    
                return ret;
            }
    
            var languages = [];
            var whitelist = o.lngWhitelist || false;
            var addLanguage = function(language){
              //reject langs not whitelisted
              if(!whitelist || whitelist.indexOf(language) > -1){
                languages.push(language);
              }else{
                log('rejecting non-whitelisted language: ' + language);
              }
            };
            if (typeof lng === 'string' && lng.indexOf('-') > -1) {
                var parts = lng.split('-');
    
                if (o.load !== 'unspecific') addLanguage(applyCase(lng));
                if (o.load !== 'current') addLanguage(applyCase(parts[this.getCountyIndexOfLng(lng)]));
            } else {
                addLanguage(applyCase(lng));
            }
    
            for (var i = 0; i < fallbackLng.length; i++) {
                if (languages.indexOf(fallbackLng[i]) === -1 && fallbackLng[i]) languages.push(applyCase(fallbackLng[i]));
            }
            return languages;
        },
        regexEscape: function(str) {
            return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
        },
        regexReplacementEscape: function(strOrFn) {
            if (typeof strOrFn === 'string') {
                return strOrFn.replace(/\$/g, "$$$$");
            } else {
                return strOrFn;
            }
        },
        localStorage: {
            setItem: function(key, value) {
                if (window.localStorage) {
                    try {
                        window.localStorage.setItem(key, value);
                    } catch (e) {
                        f.log('failed to set value for key "' + key + '" to localStorage.');
                    }
                }
            },
            getItem: function(key, value) {
                if (window.localStorage) {
                    try {
                        return window.localStorage.getItem(key, value);
                    } catch (e) {
                        f.log('failed to get value for key "' + key + '" from localStorage.');
                        return undefined;
                    }
                }
            }
        }
    };
    function init(options, cb) {
    
        if (typeof options === 'function') {
            cb = options;
            options = {};
        }
        options = options || {};
    
        // override defaults with passed in options
        f.extend(o, options);
        delete o.fixLng; /* passed in each time */
    
        // override functions: .log(), .detectLanguage(), etc
        if (o.functions) {
            delete o.functions;
            f.extend(f, options.functions);
        }
    
        // create namespace object if namespace is passed in as string
        if (typeof o.ns == 'string') {
            o.ns = { namespaces: [o.ns], defaultNs: o.ns};
        }
    
        // fallback namespaces
        if (typeof o.fallbackNS == 'string') {
            o.fallbackNS = [o.fallbackNS];
        }
    
        // fallback languages
        if (typeof o.fallbackLng == 'string' || typeof o.fallbackLng == 'boolean') {
            o.fallbackLng = [o.fallbackLng];
        }
    
        // escape prefix/suffix
        o.interpolationPrefixEscaped = f.regexEscape(o.interpolationPrefix);
        o.interpolationSuffixEscaped = f.regexEscape(o.interpolationSuffix);
    
        if (!o.lng) o.lng = f.detectLanguage();
    
        languages = f.toLanguages(o.lng);
        currentLng = languages[0];
        f.log('currentLng set to: ' + currentLng);
    
        if (o.useCookie && f.cookie.read(o.cookieName) !== currentLng){ //cookie is unset or invalid
            f.cookie.create(o.cookieName, currentLng, o.cookieExpirationTime, o.cookieDomain);
        }
        if (o.detectLngFromLocalStorage && typeof document !== 'undefined' && window.localStorage) {
            f.localStorage.setItem('i18next_lng', currentLng);
        }
    
        var lngTranslate = translate;
        if (options.fixLng) {
            lngTranslate = function(key, options) {
                options = options || {};
                options.lng = options.lng || lngTranslate.lng;
                return translate(key, options);
            };
            lngTranslate.lng = currentLng;
        }
    
        pluralExtensions.setCurrentLng(currentLng);
    
        // add JQuery extensions
        if ($ && o.setJqueryExt) {
            addJqueryFunct && addJqueryFunct();
        } else {
           addJqueryLikeFunctionality && addJqueryLikeFunctionality();
        }
    
        // jQuery deferred
        var deferred;
        if ($ && $.Deferred) {
            deferred = $.Deferred();
        }
    
        // return immidiatly if res are passed in
        if (o.resStore) {
            resStore = o.resStore;
            initialized = true;
            if (cb) cb(null, lngTranslate);
            if (deferred) deferred.resolve(lngTranslate);
            if (deferred) return deferred.promise();
            return;
        }
    
        // languages to load
        var lngsToLoad = f.toLanguages(o.lng);
        if (typeof o.preload === 'string') o.preload = [o.preload];
        for (var i = 0, l = o.preload.length; i < l; i++) {
            var pres = f.toLanguages(o.preload[i]);
            for (var y = 0, len = pres.length; y < len; y++) {
                if (lngsToLoad.indexOf(pres[y]) < 0) {
                    lngsToLoad.push(pres[y]);
                }
            }
        }
    
        // else load them
        i18n.sync.load(lngsToLoad, o, function(err, store) {
            resStore = store;
            initialized = true;
    
            if (cb) cb(err, lngTranslate);
            if (deferred) (!err ? deferred.resolve : deferred.reject)(err || lngTranslate);
        });
    
        if (deferred) return deferred.promise();
    }
    
    function isInitialized() {
        return initialized;
    }
    function preload(lngs, cb) {
        if (typeof lngs === 'string') lngs = [lngs];
        for (var i = 0, l = lngs.length; i < l; i++) {
            if (o.preload.indexOf(lngs[i]) < 0) {
                o.preload.push(lngs[i]);
            }
        }
        return init(cb);
    }
    
    function addResourceBundle(lng, ns, resources, deep, overwrite) {
        if (typeof ns !== 'string') {
            resources = ns;
            ns = o.ns.defaultNs;
        } else if (o.ns.namespaces.indexOf(ns) < 0) {
            o.ns.namespaces.push(ns);
        }
    
        resStore[lng] = resStore[lng] || {};
        resStore[lng][ns] = resStore[lng][ns] || {};
    
        if (deep) {
            f.deepExtend(resStore[lng][ns], resources, overwrite);
        } else {
            f.extend(resStore[lng][ns], resources);
        }
        if (o.useLocalStorage) {
            sync._storeLocal(resStore);
        }
    }
    
    function hasResourceBundle(lng, ns) {
        if (typeof ns !== 'string') {
            ns = o.ns.defaultNs;
        }
    
        resStore[lng] = resStore[lng] || {};
        var res = resStore[lng][ns] || {};
    
        var hasValues = false;
        for(var prop in res) {
            if (res.hasOwnProperty(prop)) {
                hasValues = true;
            }
        }
    
        return hasValues;
    }
    
    function getResourceBundle(lng, ns) {
        if (typeof ns !== 'string') {
            ns = o.ns.defaultNs;
        }
    
        resStore[lng] = resStore[lng] || {};
        return f.extend({}, resStore[lng][ns]);
    }
    
    function removeResourceBundle(lng, ns) {
        if (typeof ns !== 'string') {
            ns = o.ns.defaultNs;
        }
    
        resStore[lng] = resStore[lng] || {};
        resStore[lng][ns] = {};
        if (o.useLocalStorage) {
            sync._storeLocal(resStore);
        }
    }
    
    function addResource(lng, ns, key, value) {
        if (typeof ns !== 'string') {
            resource = ns;
            ns = o.ns.defaultNs;
        } else if (o.ns.namespaces.indexOf(ns) < 0) {
            o.ns.namespaces.push(ns);
        }
    
        resStore[lng] = resStore[lng] || {};
        resStore[lng][ns] = resStore[lng][ns] || {};
    
        var keys = key.split(o.keyseparator);
        var x = 0;
        var node = resStore[lng][ns];
        var origRef = node;
    
        while (keys[x]) {
            if (x == keys.length - 1)
                node[keys[x]] = value;
            else {
                if (node[keys[x]] == null)
                    node[keys[x]] = {};
    
                node = node[keys[x]];
            }
            x++;
        }
        if (o.useLocalStorage) {
            sync._storeLocal(resStore);
        }
    }
    
    function addResources(lng, ns, resources) {
        if (typeof ns !== 'string') {
            resources = ns;
            ns = o.ns.defaultNs;
        } else if (o.ns.namespaces.indexOf(ns) < 0) {
            o.ns.namespaces.push(ns);
        }
    
        for (var m in resources) {
            if (typeof resources[m] === 'string') addResource(lng, ns, m, resources[m]);
        }
    }
    
    function setDefaultNamespace(ns) {
        o.ns.defaultNs = ns;
    }
    
    function loadNamespace(namespace, cb) {
        loadNamespaces([namespace], cb);
    }
    
    function loadNamespaces(namespaces, cb) {
        var opts = {
            dynamicLoad: o.dynamicLoad,
            resGetPath: o.resGetPath,
            getAsync: o.getAsync,
            customLoad: o.customLoad,
            ns: { namespaces: namespaces, defaultNs: ''} /* new namespaces to load */
        };
    
        // languages to load
        var lngsToLoad = f.toLanguages(o.lng);
        if (typeof o.preload === 'string') o.preload = [o.preload];
        for (var i = 0, l = o.preload.length; i < l; i++) {
            var pres = f.toLanguages(o.preload[i]);
            for (var y = 0, len = pres.length; y < len; y++) {
                if (lngsToLoad.indexOf(pres[y]) < 0) {
                    lngsToLoad.push(pres[y]);
                }
            }
        }
    
        // check if we have to load
        var lngNeedLoad = [];
        for (var a = 0, lenA = lngsToLoad.length; a < lenA; a++) {
            var needLoad = false;
            var resSet = resStore[lngsToLoad[a]];
            if (resSet) {
                for (var b = 0, lenB = namespaces.length; b < lenB; b++) {
                    if (!resSet[namespaces[b]]) needLoad = true;
                }
            } else {
                needLoad = true;
            }
    
            if (needLoad) lngNeedLoad.push(lngsToLoad[a]);
        }
    
        if (lngNeedLoad.length) {
            i18n.sync._fetch(lngNeedLoad, opts, function(err, store) {
                var todo = namespaces.length * lngNeedLoad.length;
    
                // load each file individual
                f.each(namespaces, function(nsIndex, nsValue) {
    
                    // append namespace to namespace array
                    if (o.ns.namespaces.indexOf(nsValue) < 0) {
                        o.ns.namespaces.push(nsValue);
                    }
    
                    f.each(lngNeedLoad, function(lngIndex, lngValue) {
                        resStore[lngValue] = resStore[lngValue] || {};
                        resStore[lngValue][nsValue] = store[lngValue][nsValue];
    
                        todo--; // wait for all done befor callback
                        if (todo === 0 && cb) {
                            if (o.useLocalStorage) i18n.sync._storeLocal(resStore);
                            cb();
                        }
                    });
                });
            });
        } else {
            if (cb) cb();
        }
    }
    
    function setLng(lng, options, cb) {
        if (typeof options === 'function') {
            cb = options;
            options = {};
        } else if (!options) {
            options = {};
        }
    
        options.lng = lng;
        return init(options, cb);
    }
    
    function lng() {
        return currentLng;
    }
    
    function dir() {   
        var rtlLangs = [ "ar", "shu", "sqr", "ssh", "xaa", "yhd", "yud", "aao", "abh", "abv", "acm",
            "acq", "acw", "acx", "acy", "adf", "ads", "aeb", "aec", "afb", "ajp", "apc", "apd", "arb",
            "arq", "ars", "ary", "arz", "auz", "avl", "ayh", "ayl", "ayn", "ayp", "bbz", "pga", "he",
            "iw", "ps", "pbt", "pbu", "pst", "prp", "prd", "ur", "ydd", "yds", "yih", "ji", "yi", "hbo",
            "men", "xmn", "fa", "jpr", "peo", "pes", "prs", "dv", "sam"
        ];
    
        if ( rtlLangs.some( function( lang ) {
                return new RegExp( '^' + lang ).test( currentLng );
            } ) ) {
            return 'rtl';
        }
        return 'ltr';
    }
    
    function reload(cb) {
        resStore = {};
        setLng(currentLng, cb);
    }
    
    function noConflict() {
        
        window.i18next = window.i18n;
    
        if (conflictReference) {
            window.i18n = conflictReference;
        } else {
            delete window.i18n;
        }
    }
    function addJqueryFunct() {
        // $.t shortcut
        $.t = $.t || translate;
    
        function parse(ele, key, options) {
            if (key.length === 0) return;
    
            var attr = 'text';
    
            if (key.indexOf('[') === 0) {
                var parts = key.split(']');
                key = parts[1];
                attr = parts[0].substr(1, parts[0].length-1);
            }
    
            if (key.indexOf(';') === key.length-1) {
                key = key.substr(0, key.length-2);
            }
    
            var optionsToUse;
            if (attr === 'html') {
                optionsToUse = o.defaultValueFromContent ? $.extend({ defaultValue: ele.html() }, options) : options;
                ele.html($.t(key, optionsToUse));
            } else if (attr === 'text') {
                optionsToUse = o.defaultValueFromContent ? $.extend({ defaultValue: ele.text() }, options) : options;
                ele.text($.t(key, optionsToUse));
            } else if (attr === 'prepend') {
                optionsToUse = o.defaultValueFromContent ? $.extend({ defaultValue: ele.html() }, options) : options;
                ele.prepend($.t(key, optionsToUse));
            } else if (attr === 'append') {
                optionsToUse = o.defaultValueFromContent ? $.extend({ defaultValue: ele.html() }, options) : options;
                ele.append($.t(key, optionsToUse));
            } else if (attr.indexOf("data-") === 0) {
                var dataAttr = attr.substr(("data-").length);
                optionsToUse = o.defaultValueFromContent ? $.extend({ defaultValue: ele.data(dataAttr) }, options) : options;
                var translated = $.t(key, optionsToUse);
                //we change into the data cache
                ele.data(dataAttr, translated);
                //we change into the dom
                ele.attr(attr, translated);
            } else {
                optionsToUse = o.defaultValueFromContent ? $.extend({ defaultValue: ele.attr(attr) }, options) : options;
                ele.attr(attr, $.t(key, optionsToUse));
            }
        }
    
        function localize(ele, options) {
            var key = ele.attr(o.selectorAttr);
            if (!key && typeof key !== 'undefined' && key !== false) key = ele.text() || ele.val();
            if (!key) return;
    
            var target = ele
              , targetSelector = ele.data("i18n-target");
            if (targetSelector) {
                target = ele.find(targetSelector) || ele;
            }
    
            if (!options && o.useDataAttrOptions === true) {
                options = ele.data("i18n-options");
            }
            options = options || {};
    
            if (key.indexOf(';') >= 0) {
                var keys = key.split(';');
    
                $.each(keys, function(m, k) {
                    if (k !== '') parse(target, k, options);
                });
    
            } else {
                parse(target, key, options);
            }
    
            if (o.useDataAttrOptions === true) {
              var clone = $.extend({lng: 'non', lngs: [], _origLng: 'non'}, options);
              delete clone.lng;
              delete clone.lngs;
              delete clone._origLng;
              ele.data("i18n-options", clone);
            }
        }
    
        // fn
        $.fn.i18n = function (options) {
            return this.each(function() {
                // localize element itself
                localize($(this), options);
    
                // localize childs
                var elements =  $(this).find('[' + o.selectorAttr + ']');
                elements.each(function() {
                    localize($(this), options);
                });
            });
        };
    }
    function addJqueryLikeFunctionality() {
    
        function parse(ele, key, options) {
            if (key.length === 0) return;
    
            var attr = 'text';
    
            if (key.indexOf('[') === 0) {
                var parts = key.split(']');
                key = parts[1];
                attr = parts[0].substr(1, parts[0].length-1);
            }
    
            if (key.indexOf(';') === key.length-1) {
                key = key.substr(0, key.length-2);
            }
    
            if (attr === 'html') {
                ele.innerHTML = translate(key, options);
            } else if (attr === 'text') {
                ele.textContent = translate(key, options);
            } else if (attr === 'prepend') {
                ele.insertAdjacentHTML(translate(key, options), 'afterbegin');
            } else if (attr === 'append') {
                ele.insertAdjacentHTML(translate(key, options), 'beforeend');
            } else {
                ele.setAttribute(attr, translate(key, options));
            }
        }
    
        function localize(ele, options) {
            var key = ele.getAttribute(o.selectorAttr);
            if (!key && typeof key !== 'undefined' && key !== false) key = ele.textContent || ele.value;
            if (!key) return;
    
            var target = ele
              , targetSelector = ele.getAttribute("i18n-target");
            if (targetSelector) {
                target = ele.querySelector(targetSelector) || ele;
            }
            
            if (key.indexOf(';') >= 0) {
                var keys = key.split(';'), index = 0, length = keys.length;
                
                for ( ; index < length; index++) {
                    if (keys[index] !== '') parse(target, keys[index], options);
                }
    
            } else {
                parse(target, key, options);
            }
        }
    
        // fn
        i18n.translateObject = function (object, options) {
            // localize childs
            var elements =  object.querySelectorAll('[' + o.selectorAttr + ']');
            var index = 0, length = elements.length;
            for ( ; index < length; index++) {
                localize(elements[index], options);
            }
        };
    }
    function applyReplacement(str, replacementHash, nestedKey, options) {
        if (!str) return str;
    
        options = options || replacementHash; // first call uses replacement hash combined with options
        if (str.indexOf(options.interpolationPrefix || o.interpolationPrefix) < 0) return str;
    
        var prefix = options.interpolationPrefix ? f.regexEscape(options.interpolationPrefix) : o.interpolationPrefixEscaped
          , suffix = options.interpolationSuffix ? f.regexEscape(options.interpolationSuffix) : o.interpolationSuffixEscaped
          , keyseparator = options.keyseparator || o.keyseparator
          , unEscapingSuffix = 'HTML'+suffix;
    
        var hash = replacementHash.replace && typeof replacementHash.replace === 'object' ? replacementHash.replace : replacementHash;
        var replacementRegex = new RegExp([prefix, '(.+?)', '(HTML)?', suffix].join(''), 'g');
        var escapeInterpolation = options.escapeInterpolation || o.escapeInterpolation;
        return str.replace(replacementRegex, function (wholeMatch, keyMatch, htmlMatched) {
            // Check for recursive matches of object
            var objectMatching = hash;
            var keyLeaf = keyMatch;
            while (keyLeaf.indexOf(keyseparator) >= 0 && typeof objectMatching === 'object' && objectMatching) {
                var propName = keyLeaf.slice(0, keyLeaf.indexOf(keyseparator));
                keyLeaf = keyLeaf.slice(keyLeaf.indexOf(keyseparator) + 1);
                objectMatching = objectMatching[propName];
            }
            if (objectMatching && typeof objectMatching === 'object' && objectMatching.hasOwnProperty(keyLeaf)) {
                    var value = objectMatching[keyLeaf];
                if (escapeInterpolation && !htmlMatched) {
                    return f.escape(objectMatching[keyLeaf]);
                } else {
                    return objectMatching[keyLeaf];
                }
            } else {
                return wholeMatch;
            }
        });
    }
    
    // append it to functions
    f.applyReplacement = applyReplacement;
    
    function applyReuse(translated, options) {
        var comma = ',';
        var options_open = '{';
        var options_close = '}';
    
        var opts = f.extend({}, options);
        delete opts.postProcess;
        delete opts.isFallbackLookup;
    
        while (translated.indexOf(o.reusePrefix) != -1) {
            replacementCounter++;
            if (replacementCounter > o.maxRecursion) { break; } // safety net for too much recursion
            var index_of_opening = translated.lastIndexOf(o.reusePrefix);
            var index_of_end_of_closing = translated.indexOf(o.reuseSuffix, index_of_opening) + o.reuseSuffix.length;
            var token = translated.substring(index_of_opening, index_of_end_of_closing);
            var token_without_symbols = token.replace(o.reusePrefix, '').replace(o.reuseSuffix, '');
    
            if (index_of_end_of_closing <= index_of_opening) {
                f.error('there is an missing closing in following translation value', translated);
                return '';
            }
    
            if (token_without_symbols.indexOf(comma) != -1) {
                var index_of_token_end_of_closing = token_without_symbols.indexOf(comma);
                if (token_without_symbols.indexOf(options_open, index_of_token_end_of_closing) != -1 && token_without_symbols.indexOf(options_close, index_of_token_end_of_closing) != -1) {
                    var index_of_opts_opening = token_without_symbols.indexOf(options_open, index_of_token_end_of_closing);
                    var index_of_opts_end_of_closing = token_without_symbols.indexOf(options_close, index_of_opts_opening) + options_close.length;
                    try {
                        opts = f.extend(opts, JSON.parse(token_without_symbols.substring(index_of_opts_opening, index_of_opts_end_of_closing)));
                        token_without_symbols = token_without_symbols.substring(0, index_of_token_end_of_closing);
                    } catch (e) {
                    }
                }
            }
    
            var translated_token = _translate(token_without_symbols, opts);
            translated = translated.replace(token, f.regexReplacementEscape(translated_token));
        }
        return translated;
    }
    
    function hasContext(options) {
        return (options.context && (typeof options.context == 'string' || typeof options.context == 'number'));
    }
    
    function needsPlural(options, lng) {
        return (options.count !== undefined && typeof options.count != 'string'/* && pluralExtensions.needsPlural(lng, options.count)*/);
    }
    
    function needsIndefiniteArticle(options) {
        return (options.indefinite_article !== undefined && typeof options.indefinite_article != 'string' && options.indefinite_article);
    }
    
    function exists(key, options) {
        options = options || {};
    
        var notFound = _getDefaultValue(key, options)
            , found = _find(key, options);
    
        return found !== undefined || found === notFound;
    }
    
    function translate(key, options) {
        if (!initialized) {
            f.log('i18next not finished initialization. you might have called t function before loading resources finished.')
    
            if (options && options.defaultValue) {
                return options.detaultValue;
            } else {
                return '';
            }
        };
        replacementCounter = 0;
        return _translate.apply(null, arguments);
    }
    
    function _getDefaultValue(key, options) {
        return (options.defaultValue !== undefined) ? options.defaultValue : key;
    }
    
    function _injectSprintfProcessor() {
    
        var values = [];
    
        // mh: build array from second argument onwards
        for (var i = 1; i < arguments.length; i++) {
            values.push(arguments[i]);
        }
    
        return {
            postProcess: 'sprintf',
            sprintf:     values
        };
    }
    
    function _translate(potentialKeys, options) {
        if (typeof options !== 'undefined' && typeof options !== 'object') {
            if (o.shortcutFunction === 'sprintf') {
                // mh: gettext like sprintf syntax found, automatically create sprintf processor
                options = _injectSprintfProcessor.apply(null, arguments);
            } else if (o.shortcutFunction === 'defaultValue') {
                options = {
                    defaultValue: options
                }
            }
        } else {
            options = options || {};
        }
    
        if (typeof o.defaultVariables === 'object') {
            options = f.extend({}, o.defaultVariables, options);
        }
    
        if (potentialKeys === undefined || potentialKeys === null || potentialKeys === '') return '';
    
        if (typeof potentialKeys === 'number') {
            potentialKeys = String(potentialKeys);
        }
    
        if (typeof potentialKeys === 'string') {
            potentialKeys = [potentialKeys];
        }
    
        var key = potentialKeys[0];
    
        if (potentialKeys.length > 1) {
            for (var i = 0; i < potentialKeys.length; i++) {
                key = potentialKeys[i];
                if (exists(key, options)) {
                    break;
                }
            }
        }
    
        var notFound = _getDefaultValue(key, options)
            , found = _find(key, options)
            , nsseparator = options.nsseparator || o.nsseparator
            , lngs = options.lng ? f.toLanguages(options.lng, options.fallbackLng) : languages
            , ns = options.ns || o.ns.defaultNs
            , parts;
    
        // split ns and key
        if (key.indexOf(nsseparator) > -1) {
            parts = key.split(nsseparator);
            ns = parts[0];
            key = parts[1];
        }
    
        if (found === undefined && o.sendMissing && typeof o.missingKeyHandler === 'function') {
            if (options.lng) {
                o.missingKeyHandler(lngs[0], ns, key, notFound, lngs);
            } else {
                o.missingKeyHandler(o.lng, ns, key, notFound, lngs);
            }
        }
    
        var postProcessorsToApply;
        if (typeof o.postProcess === 'string' && o.postProcess !== '') {
            postProcessorsToApply = [o.postProcess];
        } else if (typeof o.postProcess === 'array' || typeof o.postProcess === 'object') {
            postProcessorsToApply = o.postProcess;
        } else {
            postProcessorsToApply = [];
        }
    
        if (typeof options.postProcess === 'string' && options.postProcess !== '') {
            postProcessorsToApply = postProcessorsToApply.concat([options.postProcess]);
        } else if (typeof options.postProcess === 'array' || typeof options.postProcess === 'object') {
            postProcessorsToApply = postProcessorsToApply.concat(options.postProcess);
        }
    
        if (found !== undefined && postProcessorsToApply.length) {
            postProcessorsToApply.forEach(function(postProcessor) {
                if (postProcessors[postProcessor]) {
                    found = postProcessors[postProcessor](found, key, options);
                }
            });
        }
    
        // process notFound if function exists
        var splitNotFound = notFound;
        if (notFound.indexOf(nsseparator) > -1) {
            parts = notFound.split(nsseparator);
            splitNotFound = parts[1];
        }
        if (splitNotFound === key && o.parseMissingKey) {
            notFound = o.parseMissingKey(notFound);
        }
    
        if (found === undefined) {
            notFound = applyReplacement(notFound, options);
            notFound = applyReuse(notFound, options);
    
            if (postProcessorsToApply.length) {
                found = _getDefaultValue(key, options);
                postProcessorsToApply.forEach(function(postProcessor) {
                    if (postProcessors[postProcessor]) {
                        found = postProcessors[postProcessor](found, key, options);
                    }
                });
            }
        }
    
        return (found !== undefined) ? found : notFound;
    }
    
    function _find(key, options) {
        options = options || {};
    
        var optionWithoutCount, translated
            , notFound = _getDefaultValue(key, options)
            , lngs = languages;
    
        if (!resStore) { return notFound; } // no resStore to translate from
    
        // CI mode
        if (lngs[0].toLowerCase() === 'cimode') return notFound;
    
        // passed in lng
        if (options.lngs) lngs = options.lngs;
        if (options.lng) {
            lngs = f.toLanguages(options.lng, options.fallbackLng);
    
            if (!resStore[lngs[0]]) {
                var oldAsync = o.getAsync;
                o.getAsync = false;
    
                i18n.sync.load(lngs, o, function(err, store) {
                    f.extend(resStore, store);
                    o.getAsync = oldAsync;
                });
            }
        }
    
        var ns = options.ns || o.ns.defaultNs;
        var nsseparator = options.nsseparator || o.nsseparator;
        if (key.indexOf(nsseparator) > -1) {
            var parts = key.split(nsseparator);
            ns = parts[0];
            key = parts[1];
        }
    
        if (hasContext(options)) {
            optionWithoutCount = f.extend({}, options);
            delete optionWithoutCount.context;
            optionWithoutCount.defaultValue = o.contextNotFound;
    
            var contextKey = ns + nsseparator + key + '_' + options.context;
    
            translated = translate(contextKey, optionWithoutCount);
            if (translated != o.contextNotFound) {
                return applyReplacement(translated, { context: options.context }); // apply replacement for context only
            } // else continue translation with original/nonContext key
        }
    
        if (needsPlural(options, lngs[0])) {
            optionWithoutCount = f.extend({ lngs: [lngs[0]]}, options);
            delete optionWithoutCount.count;
            optionWithoutCount._origLng = optionWithoutCount._origLng || optionWithoutCount.lng || lngs[0];
            delete optionWithoutCount.lng;
            optionWithoutCount.defaultValue = o.pluralNotFound;
    
            var pluralKey;
            if (!pluralExtensions.needsPlural(lngs[0], options.count)) {
                pluralKey = ns + nsseparator + key;
            } else {
                pluralKey = ns + nsseparator + key + o.pluralSuffix;
                var pluralExtension = pluralExtensions.get(lngs[0], options.count);
                if (pluralExtension >= 0) {
                    pluralKey = pluralKey + '_' + pluralExtension;
                } else if (pluralExtension === 1) {
                    pluralKey = ns + nsseparator + key; // singular
                }
            }
    
            translated = translate(pluralKey, optionWithoutCount);
    
            if (translated != o.pluralNotFound) {
                return applyReplacement(translated, {
                    count: options.count,
                    interpolationPrefix: options.interpolationPrefix,
                    interpolationSuffix: options.interpolationSuffix
                }); // apply replacement for count only
            } else if (lngs.length > 1) {
                // remove failed lng
                var clone = lngs.slice();
                clone.shift();
                options = f.extend(options, { lngs: clone });
                options._origLng = optionWithoutCount._origLng;
                delete options.lng;
                // retry with fallbacks
                translated = translate(ns + nsseparator + key, options);
                if (translated != o.pluralNotFound) return translated;
            } else {
                optionWithoutCount.lng = optionWithoutCount._origLng;
                delete optionWithoutCount._origLng;
                translated = translate(ns + nsseparator + key, optionWithoutCount);
    
                return applyReplacement(translated, {
                    count: options.count,
                    interpolationPrefix: options.interpolationPrefix,
                    interpolationSuffix: options.interpolationSuffix
                });
            }
        }
    
        if (needsIndefiniteArticle(options)) {
            var optionsWithoutIndef = f.extend({}, options);
            delete optionsWithoutIndef.indefinite_article;
            optionsWithoutIndef.defaultValue = o.indefiniteNotFound;
            // If we don't have a count, we want the indefinite, if we do have a count, and needsPlural is false
            var indefiniteKey = ns + nsseparator + key + (((options.count && !needsPlural(options, lngs[0])) || !options.count) ? o.indefiniteSuffix : "");
            translated = translate(indefiniteKey, optionsWithoutIndef);
            if (translated != o.indefiniteNotFound) {
                return translated;
            }
        }
    
        var found;
        var keyseparator = options.keyseparator || o.keyseparator;
        var keys = key.split(keyseparator);
        for (var i = 0, len = lngs.length; i < len; i++ ) {
            if (found !== undefined) break;
    
            var l = lngs[i];
    
            var x = 0;
            var value = resStore[l] && resStore[l][ns];
            while (keys[x]) {
                value = value && value[keys[x]];
                x++;
            }
            if (value !== undefined && (!o.showKeyIfEmpty || value !== '')) {
                var valueType = Object.prototype.toString.apply(value);
                if (typeof value === 'string') {
                    value = applyReplacement(value, options);
                    value = applyReuse(value, options);
                } else if (valueType === '[object Array]' && !o.returnObjectTrees && !options.returnObjectTrees) {
                    value = value.join('\n');
                    value = applyReplacement(value, options);
                    value = applyReuse(value, options);
                } else if (value === null && o.fallbackOnNull === true) {
                    value = undefined;
                } else if (value !== null) {
                    if (!o.returnObjectTrees && !options.returnObjectTrees) {
                        if (o.objectTreeKeyHandler && typeof o.objectTreeKeyHandler == 'function') {
                            value = o.objectTreeKeyHandler(key, value, l, ns, options);
                        } else {
                            value = 'key \'' + ns + ':' + key + ' (' + l + ')\' ' +
                                'returned an object instead of string.';
                            f.log(value);
                        }
                    } else if (valueType !== '[object Number]' && valueType !== '[object Function]' && valueType !== '[object RegExp]') {
                        var copy = (valueType === '[object Array]') ? [] : {}; // apply child translation on a copy
                        f.each(value, function(m) {
                            copy[m] = _translate(ns + nsseparator + key + keyseparator + m, options);
                        });
                        value = copy;
                    }
                }
    
                if (typeof value === 'string' && value.trim() === '' && o.fallbackOnEmpty === true)
                    value = undefined;
    
                found = value;
            }
        }
    
        if (found === undefined && !options.isFallbackLookup && (o.fallbackToDefaultNS === true || (o.fallbackNS && o.fallbackNS.length > 0))) {
            // set flag for fallback lookup - avoid recursion
            options.isFallbackLookup = true;
    
            if (o.fallbackNS.length) {
    
                for (var y = 0, lenY = o.fallbackNS.length; y < lenY; y++) {
                    found = _find(o.fallbackNS[y] + nsseparator + key, options);
    
                    if (found || (found==="" && o.fallbackOnEmpty === false)) {
                        /* compare value without namespace */
                        var foundValue = found.indexOf(nsseparator) > -1 ? found.split(nsseparator)[1] : found
                          , notFoundValue = notFound.indexOf(nsseparator) > -1 ? notFound.split(nsseparator)[1] : notFound;
    
                        if (foundValue !== notFoundValue) break;
                    }
                }
            } else {
                options.ns = o.ns.defaultNs;
                found = _find(key, options); // fallback to default NS
            }
            options.isFallbackLookup = false;
        }
    
        return found;
    }
    function detectLanguage() {
        var detectedLng;
        var whitelist = o.lngWhitelist || [];
        var userLngChoices = [];
    
        // get from qs
        var qsParm = [];
        if (typeof window !== 'undefined') {
            (function() {
                var query = window.location.search.substring(1);
                var params = query.split('&');
                for (var i=0; i<params.length; i++) {
                    var pos = params[i].indexOf('=');
                    if (pos > 0) {
                        var key = params[i].substring(0,pos);
                        if (key == o.detectLngQS) {
                            userLngChoices.push(params[i].substring(pos+1));
                        }
                    }
                }
            })();
        }
    
        // get from cookie
        if (o.useCookie && typeof document !== 'undefined') {
            var c = f.cookie.read(o.cookieName);
            if (c) userLngChoices.push(c);
        }
    
        // get from localStorage
        if (o.detectLngFromLocalStorage && typeof window !== 'undefined' && window.localStorage) {
            var lang = f.localStorage.getItem('i18next_lng');
            if (lang) {
                userLngChoices.push(lang);
            }
        }
    
        // get from navigator
        if (typeof navigator !== 'undefined') {
            if (navigator.languages) { // chrome only; not an array, so can't use .push.apply instead of iterating
                for (var i=0;i<navigator.languages.length;i++) {
                    userLngChoices.push(navigator.languages[i]);
                }
            }
            if (navigator.userLanguage) {
                userLngChoices.push(navigator.userLanguage);
            }
            if (navigator.language) {
                userLngChoices.push(navigator.language);
            }
        }
    
        (function() {
            for (var i=0;i<userLngChoices.length;i++) {
                var lng = userLngChoices[i];
    
                if (lng.indexOf('-') > -1) {
                    var parts = lng.split('-');
                    lng = o.lowerCaseLng ?
                        parts[0].toLowerCase() +  '-' + parts[1].toLowerCase() :
                        parts[0].toLowerCase() +  '-' + parts[1].toUpperCase();
                }
    
                if (whitelist.length === 0 || whitelist.indexOf(lng) > -1) {
                    detectedLng = lng;
                    break;
                }
            }
        })();
    
        //fallback
        if (!detectedLng){
          detectedLng = o.fallbackLng[0];
        }
        
        return detectedLng;
    }
    // definition http://translate.sourceforge.net/wiki/l10n/pluralforms
    
    /* [code, name, numbers, pluralsType] */
    var _rules = [
        ["ach", "Acholi", [1,2], 1],
        ["af", "Afrikaans",[1,2], 2],
        ["ak", "Akan", [1,2], 1],
        ["am", "Amharic", [1,2], 1],
        ["an", "Aragonese",[1,2], 2],
        ["ar", "Arabic", [0,1,2,3,11,100],5],
        ["arn", "Mapudungun",[1,2], 1],
        ["ast", "Asturian", [1,2], 2],
        ["ay", "Aymará", [1], 3],
        ["az", "Azerbaijani",[1,2],2],
        ["be", "Belarusian",[1,2,5],4],
        ["bg", "Bulgarian",[1,2], 2],
        ["bn", "Bengali", [1,2], 2],
        ["bo", "Tibetan", [1], 3],
        ["br", "Breton", [1,2], 1],
        ["bs", "Bosnian", [1,2,5],4],
        ["ca", "Catalan", [1,2], 2],
        ["cgg", "Chiga", [1], 3],
        ["cs", "Czech", [1,2,5],6],
        ["csb", "Kashubian",[1,2,5],7],
        ["cy", "Welsh", [1,2,3,8],8],
        ["da", "Danish", [1,2], 2],
        ["de", "German", [1,2], 2],
        ["dev", "Development Fallback", [1,2], 2],
        ["dz", "Dzongkha", [1], 3],
        ["el", "Greek", [1,2], 2],
        ["en", "English", [1,2], 2],
        ["eo", "Esperanto",[1,2], 2],
        ["es", "Spanish", [1,2], 2],
        ["es_ar","Argentinean Spanish", [1,2], 2],
        ["et", "Estonian", [1,2], 2],
        ["eu", "Basque", [1,2], 2],
        ["fa", "Persian", [1], 3],
        ["fi", "Finnish", [1,2], 2],
        ["fil", "Filipino", [1,2], 1],
        ["fo", "Faroese", [1,2], 2],
        ["fr", "French", [1,2], 9],
        ["fur", "Friulian", [1,2], 2],
        ["fy", "Frisian", [1,2], 2],
        ["ga", "Irish", [1,2,3,7,11],10],
        ["gd", "Scottish Gaelic",[1,2,3,20],11],
        ["gl", "Galician", [1,2], 2],
        ["gu", "Gujarati", [1,2], 2],
        ["gun", "Gun", [1,2], 1],
        ["ha", "Hausa", [1,2], 2],
        ["he", "Hebrew", [1,2], 2],
        ["hi", "Hindi", [1,2], 2],
        ["hr", "Croatian", [1,2,5],4],
        ["hu", "Hungarian",[1,2], 2],
        ["hy", "Armenian", [1,2], 2],
        ["ia", "Interlingua",[1,2],2],
        ["id", "Indonesian",[1], 3],
        ["is", "Icelandic",[1,2], 12],
        ["it", "Italian", [1,2], 2],
        ["ja", "Japanese", [1], 3],
        ["jbo", "Lojban", [1], 3],
        ["jv", "Javanese", [0,1], 13],
        ["ka", "Georgian", [1], 3],
        ["kk", "Kazakh", [1], 3],
        ["km", "Khmer", [1], 3],
        ["kn", "Kannada", [1,2], 2],
        ["ko", "Korean", [1], 3],
        ["ku", "Kurdish", [1,2], 2],
        ["kw", "Cornish", [1,2,3,4],14],
        ["ky", "Kyrgyz", [1], 3],
        ["lb", "Letzeburgesch",[1,2],2],
        ["ln", "Lingala", [1,2], 1],
        ["lo", "Lao", [1], 3],
        ["lt", "Lithuanian",[1,2,10],15],
        ["lv", "Latvian", [1,2,0],16],
        ["mai", "Maithili", [1,2], 2],
        ["mfe", "Mauritian Creole",[1,2],1],
        ["mg", "Malagasy", [1,2], 1],
        ["mi", "Maori", [1,2], 1],
        ["mk", "Macedonian",[1,2],17],
        ["ml", "Malayalam",[1,2], 2],
        ["mn", "Mongolian",[1,2], 2],
        ["mnk", "Mandinka", [0,1,2],18],
        ["mr", "Marathi", [1,2], 2],
        ["ms", "Malay", [1], 3],
        ["mt", "Maltese", [1,2,11,20],19],
        ["nah", "Nahuatl", [1,2], 2],
        ["nap", "Neapolitan",[1,2], 2],
        ["nb", "Norwegian Bokmal",[1,2],2],
        ["ne", "Nepali", [1,2], 2],
        ["nl", "Dutch", [1,2], 2],
        ["nn", "Norwegian Nynorsk",[1,2],2],
        ["no", "Norwegian",[1,2], 2],
        ["nso", "Northern Sotho",[1,2],2],
        ["oc", "Occitan", [1,2], 1],
        ["or", "Oriya", [2,1], 2],
        ["pa", "Punjabi", [1,2], 2],
        ["pap", "Papiamento",[1,2], 2],
        ["pl", "Polish", [1,2,5],7],
        ["pms", "Piemontese",[1,2], 2],
        ["ps", "Pashto", [1,2], 2],
        ["pt", "Portuguese",[1,2], 2],
        ["pt_br","Brazilian Portuguese",[1,2], 2],
        ["rm", "Romansh", [1,2], 2],
        ["ro", "Romanian", [1,2,20],20],
        ["ru", "Russian", [1,2,5],4],
        ["sah", "Yakut", [1], 3],
        ["sco", "Scots", [1,2], 2],
        ["se", "Northern Sami",[1,2], 2],
        ["si", "Sinhala", [1,2], 2],
        ["sk", "Slovak", [1,2,5],6],
        ["sl", "Slovenian",[5,1,2,3],21],
        ["so", "Somali", [1,2], 2],
        ["son", "Songhay", [1,2], 2],
        ["sq", "Albanian", [1,2], 2],
        ["sr", "Serbian", [1,2,5],4],
        ["su", "Sundanese",[1], 3],
        ["sv", "Swedish", [1,2], 2],
        ["sw", "Swahili", [1,2], 2],
        ["ta", "Tamil", [1,2], 2],
        ["te", "Telugu", [1,2], 2],
        ["tg", "Tajik", [1,2], 1],
        ["th", "Thai", [1], 3],
        ["ti", "Tigrinya", [1,2], 1],
        ["tk", "Turkmen", [1,2], 2],
        ["tr", "Turkish", [1,2], 1],
        ["tt", "Tatar", [1], 3],
        ["ug", "Uyghur", [1], 3],
        ["uk", "Ukrainian",[1,2,5],4],
        ["ur", "Urdu", [1,2], 2],
        ["uz", "Uzbek", [1,2], 1],
        ["vi", "Vietnamese",[1], 3],
        ["wa", "Walloon", [1,2], 1],
        ["wo", "Wolof", [1], 3],
        ["yo", "Yoruba", [1,2], 2],
        ["zh", "Chinese", [1], 3]
    ];
    
    var _rulesPluralsTypes = {
        1: function(n) {return Number(n > 1);},
        2: function(n) {return Number(n != 1);},
        3: function(n) {return 0;},
        4: function(n) {return Number(n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2);},
        5: function(n) {return Number(n===0 ? 0 : n==1 ? 1 : n==2 ? 2 : n%100>=3 && n%100<=10 ? 3 : n%100>=11 ? 4 : 5);},
        6: function(n) {return Number((n==1) ? 0 : (n>=2 && n<=4) ? 1 : 2);},
        7: function(n) {return Number(n==1 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2);},
        8: function(n) {return Number((n==1) ? 0 : (n==2) ? 1 : (n != 8 && n != 11) ? 2 : 3);},
        9: function(n) {return Number(n >= 2);},
        10: function(n) {return Number(n==1 ? 0 : n==2 ? 1 : n<7 ? 2 : n<11 ? 3 : 4) ;},
        11: function(n) {return Number((n==1 || n==11) ? 0 : (n==2 || n==12) ? 1 : (n > 2 && n < 20) ? 2 : 3);},
        12: function(n) {return Number(n%10!=1 || n%100==11);},
        13: function(n) {return Number(n !== 0);},
        14: function(n) {return Number((n==1) ? 0 : (n==2) ? 1 : (n == 3) ? 2 : 3);},
        15: function(n) {return Number(n%10==1 && n%100!=11 ? 0 : n%10>=2 && (n%100<10 || n%100>=20) ? 1 : 2);},
        16: function(n) {return Number(n%10==1 && n%100!=11 ? 0 : n !== 0 ? 1 : 2);},
        17: function(n) {return Number(n==1 || n%10==1 ? 0 : 1);},
        18: function(n) {return Number(n==0 ? 0 : n==1 ? 1 : 2);},
        19: function(n) {return Number(n==1 ? 0 : n===0 || ( n%100>1 && n%100<11) ? 1 : (n%100>10 && n%100<20 ) ? 2 : 3);},
        20: function(n) {return Number(n==1 ? 0 : (n===0 || (n%100 > 0 && n%100 < 20)) ? 1 : 2);},
        21: function(n) {return Number(n%100==1 ? 1 : n%100==2 ? 2 : n%100==3 || n%100==4 ? 3 : 0); }
    };
    
    var pluralExtensions = {
    
        rules: (function () {
            var l, rules = {};
            for (l=_rules.length; l-- ;) {
                rules[_rules[l][0]] = {
                    name: _rules[l][1],
                    numbers: _rules[l][2],
                    plurals: _rulesPluralsTypes[_rules[l][3]]
                }
            }
            return rules;
        }()),
    
        // you can add your own pluralExtensions
        addRule: function(lng, obj) {
            pluralExtensions.rules[lng] = obj;
        },
    
        setCurrentLng: function(lng) {
            if (!pluralExtensions.currentRule || pluralExtensions.currentRule.lng !== lng) {
                var parts = lng.split('-');
    
                pluralExtensions.currentRule = {
                    lng: lng,
                    rule: pluralExtensions.rules[parts[0]]
                };
            }
        },
    
        needsPlural: function(lng, count) {
            var parts = lng.split('-');
    
            var ext;
            if (pluralExtensions.currentRule && pluralExtensions.currentRule.lng === lng) {
                ext = pluralExtensions.currentRule.rule; 
            } else {
                ext = pluralExtensions.rules[parts[f.getCountyIndexOfLng(lng)]];
            }
    
            if (ext && ext.numbers.length <= 1) {
                return false;
            } else {
                return this.get(lng, count) !== 1;
            }
        },
    
        get: function(lng, count) {
            var parts = lng.split('-');
    
            function getResult(l, c) {
                var ext;
                if (pluralExtensions.currentRule && pluralExtensions.currentRule.lng === lng) {
                    ext = pluralExtensions.currentRule.rule; 
                } else {
                    ext = pluralExtensions.rules[l];
                }
                if (ext) {
                    var i;
                    if (ext.noAbs) {
                        i = ext.plurals(c);
                    } else {
                        i = ext.plurals(Math.abs(c));
                    }
                    
                    var number = ext.numbers[i];
                    if (ext.numbers.length === 2 && ext.numbers[0] === 1) {
                        if (number === 2) { 
                            number = -1; // regular plural
                        } else if (number === 1) {
                            number = 1; // singular
                        }
                    }//console.log(count + '-' + number);
                    return number;
                } else {
                    return c === 1 ? '1' : '-1';
                }
            }
                        
            return getResult(parts[f.getCountyIndexOfLng(lng)], count);
        }
    
    };
    var postProcessors = {};
    var addPostProcessor = function(name, fc) {
        postProcessors[name] = fc;
    };
    // sprintf support
    var sprintf = (function() {
        function get_type(variable) {
            return Object.prototype.toString.call(variable).slice(8, -1).toLowerCase();
        }
        function str_repeat(input, multiplier) {
            for (var output = []; multiplier > 0; output[--multiplier] = input) {/* do nothing */}
            return output.join('');
        }
    
        var str_format = function() {
            if (!str_format.cache.hasOwnProperty(arguments[0])) {
                str_format.cache[arguments[0]] = str_format.parse(arguments[0]);
            }
            return str_format.format.call(null, str_format.cache[arguments[0]], arguments);
        };
    
        str_format.format = function(parse_tree, argv) {
            var cursor = 1, tree_length = parse_tree.length, node_type = '', arg, output = [], i, k, match, pad, pad_character, pad_length;
            for (i = 0; i < tree_length; i++) {
                node_type = get_type(parse_tree[i]);
                if (node_type === 'string') {
                    output.push(parse_tree[i]);
                }
                else if (node_type === 'array') {
                    match = parse_tree[i]; // convenience purposes only
                    if (match[2]) { // keyword argument
                        arg = argv[cursor];
                        for (k = 0; k < match[2].length; k++) {
                            if (!arg.hasOwnProperty(match[2][k])) {
                                throw(sprintf('[sprintf] property "%s" does not exist', match[2][k]));
                            }
                            arg = arg[match[2][k]];
                        }
                    }
                    else if (match[1]) { // positional argument (explicit)
                        arg = argv[match[1]];
                    }
                    else { // positional argument (implicit)
                        arg = argv[cursor++];
                    }
    
                    if (/[^s]/.test(match[8]) && (get_type(arg) != 'number')) {
                        throw(sprintf('[sprintf] expecting number but found %s', get_type(arg)));
                    }
                    switch (match[8]) {
                        case 'b': arg = arg.toString(2); break;
                        case 'c': arg = String.fromCharCode(arg); break;
                        case 'd': arg = parseInt(arg, 10); break;
                        case 'e': arg = match[7] ? arg.toExponential(match[7]) : arg.toExponential(); break;
                        case 'f': arg = match[7] ? parseFloat(arg).toFixed(match[7]) : parseFloat(arg); break;
                        case 'o': arg = arg.toString(8); break;
                        case 's': arg = ((arg = String(arg)) && match[7] ? arg.substring(0, match[7]) : arg); break;
                        case 'u': arg = Math.abs(arg); break;
                        case 'x': arg = arg.toString(16); break;
                        case 'X': arg = arg.toString(16).toUpperCase(); break;
                    }
                    arg = (/[def]/.test(match[8]) && match[3] && arg >= 0 ? '+'+ arg : arg);
                    pad_character = match[4] ? match[4] == '0' ? '0' : match[4].charAt(1) : ' ';
                    pad_length = match[6] - String(arg).length;
                    pad = match[6] ? str_repeat(pad_character, pad_length) : '';
                    output.push(match[5] ? arg + pad : pad + arg);
                }
            }
            return output.join('');
        };
    
        str_format.cache = {};
    
        str_format.parse = function(fmt) {
            var _fmt = fmt, match = [], parse_tree = [], arg_names = 0;
            while (_fmt) {
                if ((match = /^[^\x25]+/.exec(_fmt)) !== null) {
                    parse_tree.push(match[0]);
                }
                else if ((match = /^\x25{2}/.exec(_fmt)) !== null) {
                    parse_tree.push('%');
                }
                else if ((match = /^\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/.exec(_fmt)) !== null) {
                    if (match[2]) {
                        arg_names |= 1;
                        var field_list = [], replacement_field = match[2], field_match = [];
                        if ((field_match = /^([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
                            field_list.push(field_match[1]);
                            while ((replacement_field = replacement_field.substring(field_match[0].length)) !== '') {
                                if ((field_match = /^\.([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
                                    field_list.push(field_match[1]);
                                }
                                else if ((field_match = /^\[(\d+)\]/.exec(replacement_field)) !== null) {
                                    field_list.push(field_match[1]);
                                }
                                else {
                                    throw('[sprintf] huh?');
                                }
                            }
                        }
                        else {
                            throw('[sprintf] huh?');
                        }
                        match[2] = field_list;
                    }
                    else {
                        arg_names |= 2;
                    }
                    if (arg_names === 3) {
                        throw('[sprintf] mixing positional and named placeholders is not (yet) supported');
                    }
                    parse_tree.push(match);
                }
                else {
                    throw('[sprintf] huh?');
                }
                _fmt = _fmt.substring(match[0].length);
            }
            return parse_tree;
        };
    
        return str_format;
    })();
    
    var vsprintf = function(fmt, argv) {
        argv.unshift(fmt);
        return sprintf.apply(null, argv);
    };
    
    addPostProcessor("sprintf", function(val, key, opts) {
        if (!opts.sprintf) return val;
    
        if (Object.prototype.toString.apply(opts.sprintf) === '[object Array]') {
            return vsprintf(val, opts.sprintf);
        } else if (typeof opts.sprintf === 'object') {
            return sprintf(val, opts.sprintf);
        }
    
        return val;
    });
    // public api interface
    i18n.init = init;
    i18n.isInitialized = isInitialized;
    i18n.setLng = setLng;
    i18n.preload = preload;
    i18n.addResourceBundle = addResourceBundle;
    i18n.hasResourceBundle = hasResourceBundle;
    i18n.getResourceBundle = getResourceBundle;
    i18n.addResource = addResource;
    i18n.addResources = addResources;
    i18n.removeResourceBundle = removeResourceBundle;
    i18n.loadNamespace = loadNamespace;
    i18n.loadNamespaces = loadNamespaces;
    i18n.setDefaultNamespace = setDefaultNamespace;
    i18n.t = translate;
    i18n.translate = translate;
    i18n.exists = exists;
    i18n.detectLanguage = f.detectLanguage;
    i18n.pluralExtensions = pluralExtensions;
    i18n.sync = sync;
    i18n.functions = f;
    i18n.lng = lng;
    i18n.dir = dir;
    i18n.addPostProcessor = addPostProcessor;
    i18n.applyReplacement = f.applyReplacement;
    i18n.options = o;
    i18n.noConflict = noConflict;

})(typeof exports === 'undefined' ? window : exports);
},{}],2:[function(require,module,exports){
if (typeof require === 'function' && module) {
    var i18n = require('i18next-client');
    module.exports = i18n;
}

var opening_hours_resources = { // English is fallback language.
    en: { /* {{{ */
        opening_hours: {
            // Dear Translator,
            // the original English texts are bundled with the lib, search for "var lang =" in opening_hours.js
            "pretty": {
                "off": "closed",
                "SH": "school holidays",
                "PH": 'public holidays',
            },
        },
    }, /* }}} */
    de: { /* {{{ */
        opening_hours: {
            "texts": {
                'unexpected token': 'Unerwartetes Zeichen: "__token__" Das bedeutet, dass die Syntax an dieser Stelle nicht erkannt werden konnte.',
                'no string': 'Der Wert (erster Parameter) ist kein String',
                'nothing': 'Der Wert enthält nichts, was ausgewertet werden könnte.',
                'nothing useful': 'Diese Regel enthält nichts nützliches. Bitte entferne diese leere Regel.',
                'programmers joke': 'Kann es sein, dass du ein Programmierer bist und das Hinzufügen eines Semikolons nach jedem Statement ist zwanghaft ;) ?'
                    + ' Es ist so, dass das Semikolon in der opening_hours Syntax als Trenner für Regeln definiert ist.'
                    + ' Bitte verzichte an dieser Stelle auf ein Semikolon.',
                'interpreted as year': 'Die Zahl __number__ wird als Jahr interpretiert.'
                    + ' Vermutlich ist das nicht beabsichtigt. Uhrzeiten werden als "12:00" angegeben.',
                'rule before fallback empty': 'Die Regel vor der Fallback-Regel enthält nichts nützliches',
                'hour min separator': 'Bitte benutze ":" als Stunden/Minuten Trenner',
                'warnings severity': 'Der Parameter optional_conf_parm["warnings_severity"] muss eine ganze Zahl zwischen (einschließlich) 0 und (einschließlich) 7 sein.'
                    + ' Gegeben: __severity__ '
                    + ', erwartet: Eine der Zahlen: __allowed__.',
                'optional conf parm type': 'Der optional_conf_parm Parameter hat einen unbekannten Typ.'
                    + ' Gegeben: __given__',
                'conf param tag key missing': 'Der optional_conf_parm["tag_key"] fehlt, ist aber notwendig wegen optional_conf_parm["map_value"].',
                'conf param mode invalid': 'Der optional_conf_parm["mode"] Parameter ist eine ungültige Zahl.'
                    + ' Gegeben: __given__'
                    + ', erwartet: Eine der Zahlen: __allowed__.',
                'conf param unkown type': 'Der optional_conf_parm["__key__"] Parameter hat einen unbekannten Typ.'
                    + ' Gegeben: __given__, erwartet: __expected__.',
                'library bug': 'Bei der Auswertung des Wertes "__value__" ist ein Fehler aufgetreten.'
                    + ' Bitte melde diesen Fehler oder korrigiere diesen mittels eines Pull Requests oder Patches: __url__.__message__',
                'library bug PR only': 'Bei der Auswertung des Wertes "__value__" ist ein Fehler aufgetreten.'
                    + ' Du kannst dies korrigieren, indem du das Problem löst und in Form eines Pull Requests oder Patches zum Projekt beiträgst: __url__.__message__',
                'use multi': 'Du hast __count__ __part2__ Einzelne Regeln können mit ";" getrennt werden.',
                'selector multi 2a': '__what__ in einer Regel benutzt. Du kannst nur einen davon je Regel verwenden',
                'selector multi 2b': 'nicht verbundene __what__ in einer Regel benutzt. Das ist vermutlich ein Fehler.'
                    + ' Gleiche Selektoren können (und sollten) immer zusammen und durch Kommas getrennt geschrieben werden.'
                    + ' Beispiel für Zeitspannen "12:00-13:00,15:00-18:00".'
                    + ' Beispiel für Wochentage "Mo-We,Fr".',
                'selector state': 'Status-Schlüsselwörter (offen, geschlossen)',
                'comments': 'Kommentare',
                'months': 'Monate',
                'weekdays': 'Wochentage',
                'ranges': 'Zeitspannen',
                'default state': "Diese Regel, welche den Standard Status (d.h. geschlossen) für alle folgenden Regeln ändert, ist nicht die erste Regel."
                    + " Diese Regel überschreibt alle vorherigen Regeln."
                    + " Es kann legitim sein, den Standard Status z.B. auf geöffnet festzulegen"
                    + " und dann nur die Zeiten, zu denen geschlossen ist, anzugeben.",
                'vague': "Diese Regel ist nicht sehr aussagekräftig, da keine Zeit angegeben wurde."
                    + " Bitte füge eine Zeitangabe oder einen Kommentar hinzu, um dies zu verbessern.",
                'empty comment': "Du hast einen leeren Kommentar verwendet."
                    + '" Bitte schreibe entweder einen Kommentar-Text oder benutze stattdessen das Schlüsselwort "unknown".',
                'separator_for_readability': "Du hast das optionale Symbol <separator_for_readability> an der falschen Stelle benutzt."
                    + " Bitte lies die Syntax Spezifikation um zu sehen wo es verwendet werden kann oder entferne es.",
                'strange 24/7': 'Du hast 24/7 in einer Art verwendet, welche wahrscheinlich nicht als "24 Stunden, 7 Tage die Woche" interpretiert wird.'
                    + ' Der Richtigkeit halber solltest du "open" oder "closed"'
                    + ' für diese Regel verwenden und dann die Ausnahmen angeben um das selbe Ziel zu erreichen. So ist es klarer –'
                    + ' zum Beispiel "open; Mo 12:00-14:00 off".',
                'public holiday': 'Es wurde keine Regel für "PH" (feiertags) angegeben. Dies ist nicht sehr Aussagekräftig.__part2__'
                    + ' Bitte füge die Regel "PH off" an, wenn die Einrichtung an allen Feiertagen geschlossen ist'
                    + ' oder schreibe "Sa,Su,PH 12:00-16:00" um auszudrücken, dass Samstags, Sonntags und feiertags von 12:00-16:00 geöffnet ist.'
                    + ' Falls die Einrichtung täglich und an Feiertagen geöffnet ist, kann dies explizit mittels "Mo-Su,PH" ausgedrückt werden.'
                    + ' Wenn du dir im Unklaren bist, versuche die Öffnungszeit zu klären. Falls das nicht möglich ist, lass die Angabe weg und ignoriere diese Warnung.',
                'public holiday part2': ' Leider ist der "tag key" (beispielsweise "opening_hours", or "lit") in opening_hours.js nicht bekannt.'
                    + ' Diese Warnung betrifft nur die Keys: __keys__. Falls deine Angabe nicht für einen dieser ist, ignoriere bitte folgenden Hinweis:',
                'switched': 'Der Selektor "__first__" wurde für eine bessere Lesbarkeit und der Vollständigkeit halber mit '
                    + ' "__second__" getauscht.',
                'no colon after': 'Bitte Benutze kein ":" nach dem Token __token__.',
                'number -5 to 5': 'Zahl zwischen -5 und 5 (außer 0) erwartet.',
                'one weekday constraint': 'Du kannst höchstens einen beschränkten Wochentag in einer Monats-Spanne verwenden',
                'range constrained weekdays': 'Du kannst keine Wochentags-Spanne als Beschränkung in einer Monats-Spanne verwenden',
                'expected': '"__symbol__" erwartet.',
                'range zero': 'Du kannst keine __type__-Spanne mit Periode "0" verwenden.',
                'period one year+': 'Bitte verwende keine __type__-Spannen mit Periode "1".'
                    + ' Wenn du ausdrücken willst, das eine Einrichtung ab einem bestimmten Jahr immer offen ist, benutze bitte "<year>+".',
                'period one': 'Bitte verwende keine __type__-Spannen mit Periode "1".',
                'month 31': "Die Tagangabe für __month__ muss zwischen 1 und 31 liegen.",
                'month 30': "Der Monat __month__ hat keine 31 Tage. Der letzte Tag von __month__ ist Tag 30.",
                'month feb': '"Der Monat __month__ hat entweder 28 oder 29 Tage (Schaltjahre)."',
                'point in time': 'Erwarte Bindestrich (-) oder offenes Ende (+) in der Zeitspanne __calc__.'
                    + ' Um mit Zeitpunkten zu arbeiten, muss der Modus für  __libraryname__ umgestellt werden.'
                    + ' Vielleicht falscher OSM tag verwendet?',
                'calculation': 'Berechnung',
                'time range continue': 'Die Zeitspanne geht nicht wie erwartet weiter',
                'period continue': 'Die Zeitspannen-Periode geht nicht wie erwartet weiter. Beispiel "/01:30".',
                'time range mode': '__libraryname__ wurde im "Zeitspannen-Modus" aufgerufen. Zeitpunkt gefunden.',
                'point in time mode': '__libraryname__ wurde im "Zeitpunkt-Modus" aufgerufen. Zeitspanne gefunden.',
                'outside current day': 'Zeitspanne beginnt außerhalb des aktuellen Tages',
                'two midnights': 'Zeitspanne welche mehrmals Mitternacht beinhaltet wird nicht unterstützt',
                'without minutes': 'Zeitspanne ohne Minutenangabe angegeben. Das ist nicht sehr eindeutig!'
                    + ' Bitte verwende stattdessen folgende Syntax "__syntax__".',
                'outside day': 'Die Zeitspanne beginnt außerhalb des aktuellen Tages',
                'zero calculation': 'Das Hinzufügen von 0 in einer variablen Zeitberechnung ändert die variable Zeit nicht.'
                    + ' Bitte entferne die Zeitberechnung (Beispiel: "sunrise-(sunset-00:00)").',
                'calculation syntax': 'Berechnung mit variabler Zeit hat nicht die korrekte Syntax',
                'missing': 'Fehlendes "__symbol__"',
                '(time)': '(Zeit)',
                'bad range': 'Ungültige Zeitspanne: __from__-__to__',
                '] or more numbers': '"]" oder weitere Zahlen erwartet.',
                'additional rule no sense': 'Eine weitere Regel an dieser Stelle ergibt keinen Sinn. Benutze einfach ";" als Trenner für Regeln.'
                    + ' Siehe https://wiki.openstreetmap.org/wiki/Key:opening_hours/specification#explain:additional_rule_separator',
                'unexpected token weekday range': 'Unerwartes Token in Tages-Spanne: __token__',
                'max differ': 'Es sollte keinen Grund geben, mehr als __maxdiffer__ Tage von einem __name__ abzuweichen. Wenn nötig, teile uns dies bitte mit …',
                'adding 0': 'Addition von 0 verändert das Datum nicht. Bitte weglassen.',
                'unexpected token holiday': 'Unerwartet Token (in Feiertags-Auswertung): __token__',
                'no holiday defintion': '__name__ ist für das Land __cc__ nicht definiert.',
                'no holiday defintion state': '__name__ ist für das Land __cc__ und Bundesland __state__ nicht definiert.',
                'no country code': 'Der Ländercode fehlt. Dieser wird benötigt um die korrekten Feiertage zu bestimmen (siehe in der README wie dieser anzugeben ist)',
                'movable no formular': 'Der bewegliche Feiertag __name__ kann nicht berechnet werden.'
                    + ' Bitte füge eine entsprechende Formel hinzu.',
                'movable not in year': 'Der bewegliche Feiertag __name__ plus __days__'
                    + ' Tage befindet sich nicht mehr im selben Jahr. Aktuell nicht unterstützt.',
                'year range one year': 'Eine Jahres-Spanne mit gleichem Jahr als Beginn und Ende ergibt keinen Sinn.'
                    + ' Bitte entferne das Ende-Jahr. zum Beispiel: "__year__ May 23"',
                'year range reverse': 'Eine Jahres-Spanne mit Beginn größer als Ende ergibt keinen Sinn.'
                    + ' Bitte umdrehen.',
                'year past': 'Das Jahr liegt in der Vergangenheit.',
                'unexpected token year range': 'Unerwartetes Token in der Jahres-Spanne: __token__',
                'week range reverse': 'Du hast eine Wochen-Spanne in umgekehrter Reihenfolge oder mehrere Jahr umfassende angegeben. Dies ist aktuell nicht unterstützt.',
                'week negative': 'Du hast eine Kalenderwoche kleiner 1 angegeben. Korrekte Angaben sind 1-53.',
                'week exceed': 'Du hast eine Kalenderwoche größer als 53 angegeben. Korrekte Angaben sind 1-53.',
                'week period less than 2': 'Du hast eine Wochenperiode kleiner 2 angegeben.'
                    + ' Wenn du die gesamte Spanne von __weekfrom__ bis __weekto__ angeben will, lasse "/__period__" einfach weg.',
                'week period greater than 26': 'Du hast eine Wochen-Periode größer als 26 angegeben.'
                    + ' 26.5 ist die Hälfte des Maximums von 53 Wochen pro Jahr. Damit würde eine Periode größer als 26 nur einmal pro Jahr auftreten.'
                + ' Bitte gibt den Wochen-Selektor als "week __weekfrom__" an, wenn es das ist, was du ausdrücken möchtest.',
                'unexpected token week range': 'Unerwartetes Token in Wochen-Spanne: __token__',
                'unexpected token month range': 'Unerwartetes Token in Monats-Spanne: __token__',
                'day range reverse': 'Zeitspanne in falscher Reihenfolge. Begin ist größer als Ende.',
                'open end': 'Angegeben als "open end". Schließzeit wurde geraten.',
                'date parameter needed': 'Datumsparameter nötig.',
            },
            "pretty": {
                "off": "geschlossen",
                "SH": "Schulferien",
                "PH": "Feiertags",
            },
        },
    }, /* }}} */
};

if (!i18n.isInitialized()) {
    i18n.init({
        fallbackLng: 'en',
        // lngWhitelist: ['en', 'de'],
        resStore: opening_hours_resources,
        getAsync: true,
        useCookie: true,
        // debug: true,
    });
} else {
    // compat with an app that already initializes i18n
    for (lang in opening_hours_resources) {
        i18n.addResourceBundle(lang, 'opening_hours', opening_hours_resources[lang]['opening_hours'], true);

    }
}

},{"i18next-client":1}],3:[function(require,module,exports){
/*
 (c) 2011-2015, Vladimir Agafonkin
 SunCalc is a JavaScript library for calculating sun/moon position and light phases.
 https://github.com/mourner/suncalc
*/

(function () { 'use strict';

// shortcuts for easier to read formulas

var PI   = Math.PI,
    sin  = Math.sin,
    cos  = Math.cos,
    tan  = Math.tan,
    asin = Math.asin,
    atan = Math.atan2,
    acos = Math.acos,
    rad  = PI / 180;

// sun calculations are based on http://aa.quae.nl/en/reken/zonpositie.html formulas


// date/time constants and conversions

var dayMs = 1000 * 60 * 60 * 24,
    J1970 = 2440588,
    J2000 = 2451545;

function toJulian(date) { return date.valueOf() / dayMs - 0.5 + J1970; }
function fromJulian(j)  { return new Date((j + 0.5 - J1970) * dayMs); }
function toDays(date)   { return toJulian(date) - J2000; }


// general calculations for position

var e = rad * 23.4397; // obliquity of the Earth

function rightAscension(l, b) { return atan(sin(l) * cos(e) - tan(b) * sin(e), cos(l)); }
function declination(l, b)    { return asin(sin(b) * cos(e) + cos(b) * sin(e) * sin(l)); }

function azimuth(H, phi, dec)  { return atan(sin(H), cos(H) * sin(phi) - tan(dec) * cos(phi)); }
function altitude(H, phi, dec) { return asin(sin(phi) * sin(dec) + cos(phi) * cos(dec) * cos(H)); }

function siderealTime(d, lw) { return rad * (280.16 + 360.9856235 * d) - lw; }


// general sun calculations

function solarMeanAnomaly(d) { return rad * (357.5291 + 0.98560028 * d); }

function eclipticLongitude(M) {

    var C = rad * (1.9148 * sin(M) + 0.02 * sin(2 * M) + 0.0003 * sin(3 * M)), // equation of center
        P = rad * 102.9372; // perihelion of the Earth

    return M + C + P + PI;
}

function sunCoords(d) {

    var M = solarMeanAnomaly(d),
        L = eclipticLongitude(M);

    return {
        dec: declination(L, 0),
        ra: rightAscension(L, 0)
    };
}


var SunCalc = {};


// calculates sun position for a given date and latitude/longitude

SunCalc.getPosition = function (date, lat, lng) {

    var lw  = rad * -lng,
        phi = rad * lat,
        d   = toDays(date),

        c  = sunCoords(d),
        H  = siderealTime(d, lw) - c.ra;

    return {
        azimuth: azimuth(H, phi, c.dec),
        altitude: altitude(H, phi, c.dec)
    };
};


// sun times configuration (angle, morning name, evening name)

var times = SunCalc.times = [
    [-0.833, 'sunrise',       'sunset'      ],
    [  -0.3, 'sunriseEnd',    'sunsetStart' ],
    [    -6, 'dawn',          'dusk'        ],
    [   -12, 'nauticalDawn',  'nauticalDusk'],
    [   -18, 'nightEnd',      'night'       ],
    [     6, 'goldenHourEnd', 'goldenHour'  ]
];

// adds a custom time to the times config

SunCalc.addTime = function (angle, riseName, setName) {
    times.push([angle, riseName, setName]);
};


// calculations for sun times

var J0 = 0.0009;

function julianCycle(d, lw) { return Math.round(d - J0 - lw / (2 * PI)); }

function approxTransit(Ht, lw, n) { return J0 + (Ht + lw) / (2 * PI) + n; }
function solarTransitJ(ds, M, L)  { return J2000 + ds + 0.0053 * sin(M) - 0.0069 * sin(2 * L); }

function hourAngle(h, phi, d) { return acos((sin(h) - sin(phi) * sin(d)) / (cos(phi) * cos(d))); }

// returns set time for the given sun altitude
function getSetJ(h, lw, phi, dec, n, M, L) {

    var w = hourAngle(h, phi, dec),
        a = approxTransit(w, lw, n);
    return solarTransitJ(a, M, L);
}


// calculates sun times for a given date and latitude/longitude

SunCalc.getTimes = function (date, lat, lng) {

    var lw = rad * -lng,
        phi = rad * lat,

        d = toDays(date),
        n = julianCycle(d, lw),
        ds = approxTransit(0, lw, n),

        M = solarMeanAnomaly(ds),
        L = eclipticLongitude(M),
        dec = declination(L, 0),

        Jnoon = solarTransitJ(ds, M, L),

        i, len, time, Jset, Jrise;


    var result = {
        solarNoon: fromJulian(Jnoon),
        nadir: fromJulian(Jnoon - 0.5)
    };

    for (i = 0, len = times.length; i < len; i += 1) {
        time = times[i];

        Jset = getSetJ(time[0] * rad, lw, phi, dec, n, M, L);
        Jrise = Jnoon - (Jset - Jnoon);

        result[time[1]] = fromJulian(Jrise);
        result[time[2]] = fromJulian(Jset);
    }

    return result;
};


// moon calculations, based on http://aa.quae.nl/en/reken/hemelpositie.html formulas

function moonCoords(d) { // geocentric ecliptic coordinates of the moon

    var L = rad * (218.316 + 13.176396 * d), // ecliptic longitude
        M = rad * (134.963 + 13.064993 * d), // mean anomaly
        F = rad * (93.272 + 13.229350 * d),  // mean distance

        l  = L + rad * 6.289 * sin(M), // longitude
        b  = rad * 5.128 * sin(F),     // latitude
        dt = 385001 - 20905 * cos(M);  // distance to the moon in km

    return {
        ra: rightAscension(l, b),
        dec: declination(l, b),
        dist: dt
    };
}

SunCalc.getMoonPosition = function (date, lat, lng) {

    var lw  = rad * -lng,
        phi = rad * lat,
        d   = toDays(date),

        c = moonCoords(d),
        H = siderealTime(d, lw) - c.ra,
        h = altitude(H, phi, c.dec);

    // altitude correction for refraction
    h = h + rad * 0.017 / tan(h + rad * 10.26 / (h + rad * 5.10));

    return {
        azimuth: azimuth(H, phi, c.dec),
        altitude: h,
        distance: c.dist
    };
};


// calculations for illumination parameters of the moon,
// based on http://idlastro.gsfc.nasa.gov/ftp/pro/astro/mphase.pro formulas and
// Chapter 48 of "Astronomical Algorithms" 2nd edition by Jean Meeus (Willmann-Bell, Richmond) 1998.

SunCalc.getMoonIllumination = function (date) {

    var d = toDays(date),
        s = sunCoords(d),
        m = moonCoords(d),

        sdist = 149598000, // distance from Earth to Sun in km

        phi = acos(sin(s.dec) * sin(m.dec) + cos(s.dec) * cos(m.dec) * cos(s.ra - m.ra)),
        inc = atan(sdist * sin(phi), m.dist - sdist * cos(phi)),
        angle = atan(cos(s.dec) * sin(s.ra - m.ra), sin(s.dec) * cos(m.dec) -
                cos(s.dec) * sin(m.dec) * cos(s.ra - m.ra));

    return {
        fraction: (1 + cos(inc)) / 2,
        phase: 0.5 + 0.5 * inc * (angle < 0 ? -1 : 1) / Math.PI,
        angle: angle
    };
};


function hoursLater(date, h) {
    return new Date(date.valueOf() + h * dayMs / 24);
}

// calculations for moon rise/set times are based on http://www.stargazing.net/kepler/moonrise.html article

SunCalc.getMoonTimes = function (date, lat, lng, inUTC) {
    var t = new Date(date);
    if (inUTC) t.setUTCHours(0, 0, 0, 0);
    else t.setHours(0, 0, 0, 0);

    var hc = 0.133 * rad,
        h0 = SunCalc.getMoonPosition(t, lat, lng).altitude - hc,
        h1, h2, rise, set, a, b, xe, ye, d, roots, x1, x2, dx;

    // go in 2-hour chunks, each time seeing if a 3-point quadratic curve crosses zero (which means rise or set)
    for (var i = 1; i <= 24; i += 2) {
        h1 = SunCalc.getMoonPosition(hoursLater(t, i), lat, lng).altitude - hc;
        h2 = SunCalc.getMoonPosition(hoursLater(t, i + 1), lat, lng).altitude - hc;

        a = (h0 + h2) / 2 - h1;
        b = (h2 - h0) / 2;
        xe = -b / (2 * a);
        ye = (a * xe + b) * xe + h1;
        d = b * b - 4 * a * h1;
        roots = 0;

        if (d >= 0) {
            dx = Math.sqrt(d) / (Math.abs(a) * 2);
            x1 = xe - dx;
            x2 = xe + dx;
            if (Math.abs(x1) <= 1) roots++;
            if (Math.abs(x2) <= 1) roots++;
            if (x1 < -1) x1 = x2;
        }

        if (roots === 1) {
            if (h0 < 0) rise = i + x1;
            else set = i + x1;

        } else if (roots === 2) {
            rise = i + (ye < 0 ? x2 : x1);
            set = i + (ye < 0 ? x1 : x2);
        }

        if (rise && set) break;

        h0 = h2;
    }

    var result = {};

    if (rise) result.rise = hoursLater(t, rise);
    if (set) result.set = hoursLater(t, set);

    if (!rise && !set) result[ye > 0 ? 'alwaysUp' : 'alwaysDown'] = true;

    return result;
};


// export as AMD module / Node module / browser variable
if (typeof define === 'function' && define.amd) define(SunCalc);
else if (typeof module !== 'undefined') module.exports = SunCalc;
else window.SunCalc = SunCalc;

}());

},{}],"moment/locale/sv":[function(require,module,exports){
//! moment.js locale configuration

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';


    var sv = moment.defineLocale('sv', {
        months : 'januari_februari_mars_april_maj_juni_juli_augusti_september_oktober_november_december'.split('_'),
        monthsShort : 'jan_feb_mar_apr_maj_jun_jul_aug_sep_okt_nov_dec'.split('_'),
        weekdays : 'söndag_måndag_tisdag_onsdag_torsdag_fredag_lördag'.split('_'),
        weekdaysShort : 'sön_mån_tis_ons_tor_fre_lör'.split('_'),
        weekdaysMin : 'sö_må_ti_on_to_fr_lö'.split('_'),
        longDateFormat : {
            LT : 'HH:mm',
            LTS : 'HH:mm:ss',
            L : 'YYYY-MM-DD',
            LL : 'D MMMM YYYY',
            LLL : 'D MMMM YYYY [kl.] HH:mm',
            LLLL : 'dddd D MMMM YYYY [kl.] HH:mm',
            lll : 'D MMM YYYY HH:mm',
            llll : 'ddd D MMM YYYY HH:mm'
        },
        calendar : {
            sameDay: '[Idag] LT',
            nextDay: '[Imorgon] LT',
            lastDay: '[Igår] LT',
            nextWeek: '[På] dddd LT',
            lastWeek: '[I] dddd[s] LT',
            sameElse: 'L'
        },
        relativeTime : {
            future : 'om %s',
            past : 'för %s sedan',
            s : 'några sekunder',
            ss : '%d sekunder',
            m : 'en minut',
            mm : '%d minuter',
            h : 'en timme',
            hh : '%d timmar',
            d : 'en dag',
            dd : '%d dagar',
            M : 'en månad',
            MM : '%d månader',
            y : 'ett år',
            yy : '%d år'
        },
        dayOfMonthOrdinalParse: /\d{1,2}(e|a)/,
        ordinal : function (number) {
            var b = number % 10,
                output = (~~(number % 100 / 10) === 1) ? 'e' :
                (b === 1) ? 'a' :
                (b === 2) ? 'a' :
                (b === 3) ? 'e' : 'e';
            return number + output;
        },
        week : {
            dow : 1, // Monday is the first day of the week.
            doy : 4  // The week that contains Jan 4th is the first week of the year.
        }
    });

    return sv;

})));

},{"../moment":"moment"}],"moment":[function(require,module,exports){
//! moment.js

;(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    global.moment = factory()
}(this, (function () { 'use strict';

    var hookCallback;

    function hooks () {
        return hookCallback.apply(null, arguments);
    }

    // This is done to register the method called with moment()
    // without creating circular dependencies.
    function setHookCallback (callback) {
        hookCallback = callback;
    }

    function isArray(input) {
        return input instanceof Array || Object.prototype.toString.call(input) === '[object Array]';
    }

    function isObject(input) {
        // IE8 will treat undefined and null as object if it wasn't for
        // input != null
        return input != null && Object.prototype.toString.call(input) === '[object Object]';
    }

    function isObjectEmpty(obj) {
        if (Object.getOwnPropertyNames) {
            return (Object.getOwnPropertyNames(obj).length === 0);
        } else {
            var k;
            for (k in obj) {
                if (obj.hasOwnProperty(k)) {
                    return false;
                }
            }
            return true;
        }
    }

    function isUndefined(input) {
        return input === void 0;
    }

    function isNumber(input) {
        return typeof input === 'number' || Object.prototype.toString.call(input) === '[object Number]';
    }

    function isDate(input) {
        return input instanceof Date || Object.prototype.toString.call(input) === '[object Date]';
    }

    function map(arr, fn) {
        var res = [], i;
        for (i = 0; i < arr.length; ++i) {
            res.push(fn(arr[i], i));
        }
        return res;
    }

    function hasOwnProp(a, b) {
        return Object.prototype.hasOwnProperty.call(a, b);
    }

    function extend(a, b) {
        for (var i in b) {
            if (hasOwnProp(b, i)) {
                a[i] = b[i];
            }
        }

        if (hasOwnProp(b, 'toString')) {
            a.toString = b.toString;
        }

        if (hasOwnProp(b, 'valueOf')) {
            a.valueOf = b.valueOf;
        }

        return a;
    }

    function createUTC (input, format, locale, strict) {
        return createLocalOrUTC(input, format, locale, strict, true).utc();
    }

    function defaultParsingFlags() {
        // We need to deep clone this object.
        return {
            empty           : false,
            unusedTokens    : [],
            unusedInput     : [],
            overflow        : -2,
            charsLeftOver   : 0,
            nullInput       : false,
            invalidMonth    : null,
            invalidFormat   : false,
            userInvalidated : false,
            iso             : false,
            parsedDateParts : [],
            meridiem        : null,
            rfc2822         : false,
            weekdayMismatch : false
        };
    }

    function getParsingFlags(m) {
        if (m._pf == null) {
            m._pf = defaultParsingFlags();
        }
        return m._pf;
    }

    var some;
    if (Array.prototype.some) {
        some = Array.prototype.some;
    } else {
        some = function (fun) {
            var t = Object(this);
            var len = t.length >>> 0;

            for (var i = 0; i < len; i++) {
                if (i in t && fun.call(this, t[i], i, t)) {
                    return true;
                }
            }

            return false;
        };
    }

    function isValid(m) {
        if (m._isValid == null) {
            var flags = getParsingFlags(m);
            var parsedParts = some.call(flags.parsedDateParts, function (i) {
                return i != null;
            });
            var isNowValid = !isNaN(m._d.getTime()) &&
                flags.overflow < 0 &&
                !flags.empty &&
                !flags.invalidMonth &&
                !flags.invalidWeekday &&
                !flags.weekdayMismatch &&
                !flags.nullInput &&
                !flags.invalidFormat &&
                !flags.userInvalidated &&
                (!flags.meridiem || (flags.meridiem && parsedParts));

            if (m._strict) {
                isNowValid = isNowValid &&
                    flags.charsLeftOver === 0 &&
                    flags.unusedTokens.length === 0 &&
                    flags.bigHour === undefined;
            }

            if (Object.isFrozen == null || !Object.isFrozen(m)) {
                m._isValid = isNowValid;
            }
            else {
                return isNowValid;
            }
        }
        return m._isValid;
    }

    function createInvalid (flags) {
        var m = createUTC(NaN);
        if (flags != null) {
            extend(getParsingFlags(m), flags);
        }
        else {
            getParsingFlags(m).userInvalidated = true;
        }

        return m;
    }

    // Plugins that add properties should also add the key here (null value),
    // so we can properly clone ourselves.
    var momentProperties = hooks.momentProperties = [];

    function copyConfig(to, from) {
        var i, prop, val;

        if (!isUndefined(from._isAMomentObject)) {
            to._isAMomentObject = from._isAMomentObject;
        }
        if (!isUndefined(from._i)) {
            to._i = from._i;
        }
        if (!isUndefined(from._f)) {
            to._f = from._f;
        }
        if (!isUndefined(from._l)) {
            to._l = from._l;
        }
        if (!isUndefined(from._strict)) {
            to._strict = from._strict;
        }
        if (!isUndefined(from._tzm)) {
            to._tzm = from._tzm;
        }
        if (!isUndefined(from._isUTC)) {
            to._isUTC = from._isUTC;
        }
        if (!isUndefined(from._offset)) {
            to._offset = from._offset;
        }
        if (!isUndefined(from._pf)) {
            to._pf = getParsingFlags(from);
        }
        if (!isUndefined(from._locale)) {
            to._locale = from._locale;
        }

        if (momentProperties.length > 0) {
            for (i = 0; i < momentProperties.length; i++) {
                prop = momentProperties[i];
                val = from[prop];
                if (!isUndefined(val)) {
                    to[prop] = val;
                }
            }
        }

        return to;
    }

    var updateInProgress = false;

    // Moment prototype object
    function Moment(config) {
        copyConfig(this, config);
        this._d = new Date(config._d != null ? config._d.getTime() : NaN);
        if (!this.isValid()) {
            this._d = new Date(NaN);
        }
        // Prevent infinite loop in case updateOffset creates new moment
        // objects.
        if (updateInProgress === false) {
            updateInProgress = true;
            hooks.updateOffset(this);
            updateInProgress = false;
        }
    }

    function isMoment (obj) {
        return obj instanceof Moment || (obj != null && obj._isAMomentObject != null);
    }

    function absFloor (number) {
        if (number < 0) {
            // -0 -> 0
            return Math.ceil(number) || 0;
        } else {
            return Math.floor(number);
        }
    }

    function toInt(argumentForCoercion) {
        var coercedNumber = +argumentForCoercion,
            value = 0;

        if (coercedNumber !== 0 && isFinite(coercedNumber)) {
            value = absFloor(coercedNumber);
        }

        return value;
    }

    // compare two arrays, return the number of differences
    function compareArrays(array1, array2, dontConvert) {
        var len = Math.min(array1.length, array2.length),
            lengthDiff = Math.abs(array1.length - array2.length),
            diffs = 0,
            i;
        for (i = 0; i < len; i++) {
            if ((dontConvert && array1[i] !== array2[i]) ||
                (!dontConvert && toInt(array1[i]) !== toInt(array2[i]))) {
                diffs++;
            }
        }
        return diffs + lengthDiff;
    }

    function warn(msg) {
        if (hooks.suppressDeprecationWarnings === false &&
                (typeof console !==  'undefined') && console.warn) {
            console.warn('Deprecation warning: ' + msg);
        }
    }

    function deprecate(msg, fn) {
        var firstTime = true;

        return extend(function () {
            if (hooks.deprecationHandler != null) {
                hooks.deprecationHandler(null, msg);
            }
            if (firstTime) {
                var args = [];
                var arg;
                for (var i = 0; i < arguments.length; i++) {
                    arg = '';
                    if (typeof arguments[i] === 'object') {
                        arg += '\n[' + i + '] ';
                        for (var key in arguments[0]) {
                            arg += key + ': ' + arguments[0][key] + ', ';
                        }
                        arg = arg.slice(0, -2); // Remove trailing comma and space
                    } else {
                        arg = arguments[i];
                    }
                    args.push(arg);
                }
                warn(msg + '\nArguments: ' + Array.prototype.slice.call(args).join('') + '\n' + (new Error()).stack);
                firstTime = false;
            }
            return fn.apply(this, arguments);
        }, fn);
    }

    var deprecations = {};

    function deprecateSimple(name, msg) {
        if (hooks.deprecationHandler != null) {
            hooks.deprecationHandler(name, msg);
        }
        if (!deprecations[name]) {
            warn(msg);
            deprecations[name] = true;
        }
    }

    hooks.suppressDeprecationWarnings = false;
    hooks.deprecationHandler = null;

    function isFunction(input) {
        return input instanceof Function || Object.prototype.toString.call(input) === '[object Function]';
    }

    function set (config) {
        var prop, i;
        for (i in config) {
            prop = config[i];
            if (isFunction(prop)) {
                this[i] = prop;
            } else {
                this['_' + i] = prop;
            }
        }
        this._config = config;
        // Lenient ordinal parsing accepts just a number in addition to
        // number + (possibly) stuff coming from _dayOfMonthOrdinalParse.
        // TODO: Remove "ordinalParse" fallback in next major release.
        this._dayOfMonthOrdinalParseLenient = new RegExp(
            (this._dayOfMonthOrdinalParse.source || this._ordinalParse.source) +
                '|' + (/\d{1,2}/).source);
    }

    function mergeConfigs(parentConfig, childConfig) {
        var res = extend({}, parentConfig), prop;
        for (prop in childConfig) {
            if (hasOwnProp(childConfig, prop)) {
                if (isObject(parentConfig[prop]) && isObject(childConfig[prop])) {
                    res[prop] = {};
                    extend(res[prop], parentConfig[prop]);
                    extend(res[prop], childConfig[prop]);
                } else if (childConfig[prop] != null) {
                    res[prop] = childConfig[prop];
                } else {
                    delete res[prop];
                }
            }
        }
        for (prop in parentConfig) {
            if (hasOwnProp(parentConfig, prop) &&
                    !hasOwnProp(childConfig, prop) &&
                    isObject(parentConfig[prop])) {
                // make sure changes to properties don't modify parent config
                res[prop] = extend({}, res[prop]);
            }
        }
        return res;
    }

    function Locale(config) {
        if (config != null) {
            this.set(config);
        }
    }

    var keys;

    if (Object.keys) {
        keys = Object.keys;
    } else {
        keys = function (obj) {
            var i, res = [];
            for (i in obj) {
                if (hasOwnProp(obj, i)) {
                    res.push(i);
                }
            }
            return res;
        };
    }

    var defaultCalendar = {
        sameDay : '[Today at] LT',
        nextDay : '[Tomorrow at] LT',
        nextWeek : 'dddd [at] LT',
        lastDay : '[Yesterday at] LT',
        lastWeek : '[Last] dddd [at] LT',
        sameElse : 'L'
    };

    function calendar (key, mom, now) {
        var output = this._calendar[key] || this._calendar['sameElse'];
        return isFunction(output) ? output.call(mom, now) : output;
    }

    var defaultLongDateFormat = {
        LTS  : 'h:mm:ss A',
        LT   : 'h:mm A',
        L    : 'MM/DD/YYYY',
        LL   : 'MMMM D, YYYY',
        LLL  : 'MMMM D, YYYY h:mm A',
        LLLL : 'dddd, MMMM D, YYYY h:mm A'
    };

    function longDateFormat (key) {
        var format = this._longDateFormat[key],
            formatUpper = this._longDateFormat[key.toUpperCase()];

        if (format || !formatUpper) {
            return format;
        }

        this._longDateFormat[key] = formatUpper.replace(/MMMM|MM|DD|dddd/g, function (val) {
            return val.slice(1);
        });

        return this._longDateFormat[key];
    }

    var defaultInvalidDate = 'Invalid date';

    function invalidDate () {
        return this._invalidDate;
    }

    var defaultOrdinal = '%d';
    var defaultDayOfMonthOrdinalParse = /\d{1,2}/;

    function ordinal (number) {
        return this._ordinal.replace('%d', number);
    }

    var defaultRelativeTime = {
        future : 'in %s',
        past   : '%s ago',
        s  : 'a few seconds',
        ss : '%d seconds',
        m  : 'a minute',
        mm : '%d minutes',
        h  : 'an hour',
        hh : '%d hours',
        d  : 'a day',
        dd : '%d days',
        M  : 'a month',
        MM : '%d months',
        y  : 'a year',
        yy : '%d years'
    };

    function relativeTime (number, withoutSuffix, string, isFuture) {
        var output = this._relativeTime[string];
        return (isFunction(output)) ?
            output(number, withoutSuffix, string, isFuture) :
            output.replace(/%d/i, number);
    }

    function pastFuture (diff, output) {
        var format = this._relativeTime[diff > 0 ? 'future' : 'past'];
        return isFunction(format) ? format(output) : format.replace(/%s/i, output);
    }

    var aliases = {};

    function addUnitAlias (unit, shorthand) {
        var lowerCase = unit.toLowerCase();
        aliases[lowerCase] = aliases[lowerCase + 's'] = aliases[shorthand] = unit;
    }

    function normalizeUnits(units) {
        return typeof units === 'string' ? aliases[units] || aliases[units.toLowerCase()] : undefined;
    }

    function normalizeObjectUnits(inputObject) {
        var normalizedInput = {},
            normalizedProp,
            prop;

        for (prop in inputObject) {
            if (hasOwnProp(inputObject, prop)) {
                normalizedProp = normalizeUnits(prop);
                if (normalizedProp) {
                    normalizedInput[normalizedProp] = inputObject[prop];
                }
            }
        }

        return normalizedInput;
    }

    var priorities = {};

    function addUnitPriority(unit, priority) {
        priorities[unit] = priority;
    }

    function getPrioritizedUnits(unitsObj) {
        var units = [];
        for (var u in unitsObj) {
            units.push({unit: u, priority: priorities[u]});
        }
        units.sort(function (a, b) {
            return a.priority - b.priority;
        });
        return units;
    }

    function zeroFill(number, targetLength, forceSign) {
        var absNumber = '' + Math.abs(number),
            zerosToFill = targetLength - absNumber.length,
            sign = number >= 0;
        return (sign ? (forceSign ? '+' : '') : '-') +
            Math.pow(10, Math.max(0, zerosToFill)).toString().substr(1) + absNumber;
    }

    var formattingTokens = /(\[[^\[]*\])|(\\)?([Hh]mm(ss)?|Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Qo?|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|kk?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g;

    var localFormattingTokens = /(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g;

    var formatFunctions = {};

    var formatTokenFunctions = {};

    // token:    'M'
    // padded:   ['MM', 2]
    // ordinal:  'Mo'
    // callback: function () { this.month() + 1 }
    function addFormatToken (token, padded, ordinal, callback) {
        var func = callback;
        if (typeof callback === 'string') {
            func = function () {
                return this[callback]();
            };
        }
        if (token) {
            formatTokenFunctions[token] = func;
        }
        if (padded) {
            formatTokenFunctions[padded[0]] = function () {
                return zeroFill(func.apply(this, arguments), padded[1], padded[2]);
            };
        }
        if (ordinal) {
            formatTokenFunctions[ordinal] = function () {
                return this.localeData().ordinal(func.apply(this, arguments), token);
            };
        }
    }

    function removeFormattingTokens(input) {
        if (input.match(/\[[\s\S]/)) {
            return input.replace(/^\[|\]$/g, '');
        }
        return input.replace(/\\/g, '');
    }

    function makeFormatFunction(format) {
        var array = format.match(formattingTokens), i, length;

        for (i = 0, length = array.length; i < length; i++) {
            if (formatTokenFunctions[array[i]]) {
                array[i] = formatTokenFunctions[array[i]];
            } else {
                array[i] = removeFormattingTokens(array[i]);
            }
        }

        return function (mom) {
            var output = '', i;
            for (i = 0; i < length; i++) {
                output += isFunction(array[i]) ? array[i].call(mom, format) : array[i];
            }
            return output;
        };
    }

    // format date using native date object
    function formatMoment(m, format) {
        if (!m.isValid()) {
            return m.localeData().invalidDate();
        }

        format = expandFormat(format, m.localeData());
        formatFunctions[format] = formatFunctions[format] || makeFormatFunction(format);

        return formatFunctions[format](m);
    }

    function expandFormat(format, locale) {
        var i = 5;

        function replaceLongDateFormatTokens(input) {
            return locale.longDateFormat(input) || input;
        }

        localFormattingTokens.lastIndex = 0;
        while (i >= 0 && localFormattingTokens.test(format)) {
            format = format.replace(localFormattingTokens, replaceLongDateFormatTokens);
            localFormattingTokens.lastIndex = 0;
            i -= 1;
        }

        return format;
    }

    var match1         = /\d/;            //       0 - 9
    var match2         = /\d\d/;          //      00 - 99
    var match3         = /\d{3}/;         //     000 - 999
    var match4         = /\d{4}/;         //    0000 - 9999
    var match6         = /[+-]?\d{6}/;    // -999999 - 999999
    var match1to2      = /\d\d?/;         //       0 - 99
    var match3to4      = /\d\d\d\d?/;     //     999 - 9999
    var match5to6      = /\d\d\d\d\d\d?/; //   99999 - 999999
    var match1to3      = /\d{1,3}/;       //       0 - 999
    var match1to4      = /\d{1,4}/;       //       0 - 9999
    var match1to6      = /[+-]?\d{1,6}/;  // -999999 - 999999

    var matchUnsigned  = /\d+/;           //       0 - inf
    var matchSigned    = /[+-]?\d+/;      //    -inf - inf

    var matchOffset    = /Z|[+-]\d\d:?\d\d/gi; // +00:00 -00:00 +0000 -0000 or Z
    var matchShortOffset = /Z|[+-]\d\d(?::?\d\d)?/gi; // +00 -00 +00:00 -00:00 +0000 -0000 or Z

    var matchTimestamp = /[+-]?\d+(\.\d{1,3})?/; // 123456789 123456789.123

    // any word (or two) characters or numbers including two/three word month in arabic.
    // includes scottish gaelic two word and hyphenated months
    var matchWord = /[0-9]{0,256}['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFF07\uFF10-\uFFEF]{1,256}|[\u0600-\u06FF\/]{1,256}(\s*?[\u0600-\u06FF]{1,256}){1,2}/i;

    var regexes = {};

    function addRegexToken (token, regex, strictRegex) {
        regexes[token] = isFunction(regex) ? regex : function (isStrict, localeData) {
            return (isStrict && strictRegex) ? strictRegex : regex;
        };
    }

    function getParseRegexForToken (token, config) {
        if (!hasOwnProp(regexes, token)) {
            return new RegExp(unescapeFormat(token));
        }

        return regexes[token](config._strict, config._locale);
    }

    // Code from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
    function unescapeFormat(s) {
        return regexEscape(s.replace('\\', '').replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function (matched, p1, p2, p3, p4) {
            return p1 || p2 || p3 || p4;
        }));
    }

    function regexEscape(s) {
        return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    var tokens = {};

    function addParseToken (token, callback) {
        var i, func = callback;
        if (typeof token === 'string') {
            token = [token];
        }
        if (isNumber(callback)) {
            func = function (input, array) {
                array[callback] = toInt(input);
            };
        }
        for (i = 0; i < token.length; i++) {
            tokens[token[i]] = func;
        }
    }

    function addWeekParseToken (token, callback) {
        addParseToken(token, function (input, array, config, token) {
            config._w = config._w || {};
            callback(input, config._w, config, token);
        });
    }

    function addTimeToArrayFromToken(token, input, config) {
        if (input != null && hasOwnProp(tokens, token)) {
            tokens[token](input, config._a, config, token);
        }
    }

    var YEAR = 0;
    var MONTH = 1;
    var DATE = 2;
    var HOUR = 3;
    var MINUTE = 4;
    var SECOND = 5;
    var MILLISECOND = 6;
    var WEEK = 7;
    var WEEKDAY = 8;

    // FORMATTING

    addFormatToken('Y', 0, 0, function () {
        var y = this.year();
        return y <= 9999 ? '' + y : '+' + y;
    });

    addFormatToken(0, ['YY', 2], 0, function () {
        return this.year() % 100;
    });

    addFormatToken(0, ['YYYY',   4],       0, 'year');
    addFormatToken(0, ['YYYYY',  5],       0, 'year');
    addFormatToken(0, ['YYYYYY', 6, true], 0, 'year');

    // ALIASES

    addUnitAlias('year', 'y');

    // PRIORITIES

    addUnitPriority('year', 1);

    // PARSING

    addRegexToken('Y',      matchSigned);
    addRegexToken('YY',     match1to2, match2);
    addRegexToken('YYYY',   match1to4, match4);
    addRegexToken('YYYYY',  match1to6, match6);
    addRegexToken('YYYYYY', match1to6, match6);

    addParseToken(['YYYYY', 'YYYYYY'], YEAR);
    addParseToken('YYYY', function (input, array) {
        array[YEAR] = input.length === 2 ? hooks.parseTwoDigitYear(input) : toInt(input);
    });
    addParseToken('YY', function (input, array) {
        array[YEAR] = hooks.parseTwoDigitYear(input);
    });
    addParseToken('Y', function (input, array) {
        array[YEAR] = parseInt(input, 10);
    });

    // HELPERS

    function daysInYear(year) {
        return isLeapYear(year) ? 366 : 365;
    }

    function isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    }

    // HOOKS

    hooks.parseTwoDigitYear = function (input) {
        return toInt(input) + (toInt(input) > 68 ? 1900 : 2000);
    };

    // MOMENTS

    var getSetYear = makeGetSet('FullYear', true);

    function getIsLeapYear () {
        return isLeapYear(this.year());
    }

    function makeGetSet (unit, keepTime) {
        return function (value) {
            if (value != null) {
                set$1(this, unit, value);
                hooks.updateOffset(this, keepTime);
                return this;
            } else {
                return get(this, unit);
            }
        };
    }

    function get (mom, unit) {
        return mom.isValid() ?
            mom._d['get' + (mom._isUTC ? 'UTC' : '') + unit]() : NaN;
    }

    function set$1 (mom, unit, value) {
        if (mom.isValid() && !isNaN(value)) {
            if (unit === 'FullYear' && isLeapYear(mom.year()) && mom.month() === 1 && mom.date() === 29) {
                mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value, mom.month(), daysInMonth(value, mom.month()));
            }
            else {
                mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value);
            }
        }
    }

    // MOMENTS

    function stringGet (units) {
        units = normalizeUnits(units);
        if (isFunction(this[units])) {
            return this[units]();
        }
        return this;
    }


    function stringSet (units, value) {
        if (typeof units === 'object') {
            units = normalizeObjectUnits(units);
            var prioritized = getPrioritizedUnits(units);
            for (var i = 0; i < prioritized.length; i++) {
                this[prioritized[i].unit](units[prioritized[i].unit]);
            }
        } else {
            units = normalizeUnits(units);
            if (isFunction(this[units])) {
                return this[units](value);
            }
        }
        return this;
    }

    function mod(n, x) {
        return ((n % x) + x) % x;
    }

    var indexOf;

    if (Array.prototype.indexOf) {
        indexOf = Array.prototype.indexOf;
    } else {
        indexOf = function (o) {
            // I know
            var i;
            for (i = 0; i < this.length; ++i) {
                if (this[i] === o) {
                    return i;
                }
            }
            return -1;
        };
    }

    function daysInMonth(year, month) {
        if (isNaN(year) || isNaN(month)) {
            return NaN;
        }
        var modMonth = mod(month, 12);
        year += (month - modMonth) / 12;
        return modMonth === 1 ? (isLeapYear(year) ? 29 : 28) : (31 - modMonth % 7 % 2);
    }

    // FORMATTING

    addFormatToken('M', ['MM', 2], 'Mo', function () {
        return this.month() + 1;
    });

    addFormatToken('MMM', 0, 0, function (format) {
        return this.localeData().monthsShort(this, format);
    });

    addFormatToken('MMMM', 0, 0, function (format) {
        return this.localeData().months(this, format);
    });

    // ALIASES

    addUnitAlias('month', 'M');

    // PRIORITY

    addUnitPriority('month', 8);

    // PARSING

    addRegexToken('M',    match1to2);
    addRegexToken('MM',   match1to2, match2);
    addRegexToken('MMM',  function (isStrict, locale) {
        return locale.monthsShortRegex(isStrict);
    });
    addRegexToken('MMMM', function (isStrict, locale) {
        return locale.monthsRegex(isStrict);
    });

    addParseToken(['M', 'MM'], function (input, array) {
        array[MONTH] = toInt(input) - 1;
    });

    addParseToken(['MMM', 'MMMM'], function (input, array, config, token) {
        var month = config._locale.monthsParse(input, token, config._strict);
        // if we didn't find a month name, mark the date as invalid.
        if (month != null) {
            array[MONTH] = month;
        } else {
            getParsingFlags(config).invalidMonth = input;
        }
    });

    // LOCALES

    var MONTHS_IN_FORMAT = /D[oD]?(\[[^\[\]]*\]|\s)+MMMM?/;
    var defaultLocaleMonths = 'January_February_March_April_May_June_July_August_September_October_November_December'.split('_');
    function localeMonths (m, format) {
        if (!m) {
            return isArray(this._months) ? this._months :
                this._months['standalone'];
        }
        return isArray(this._months) ? this._months[m.month()] :
            this._months[(this._months.isFormat || MONTHS_IN_FORMAT).test(format) ? 'format' : 'standalone'][m.month()];
    }

    var defaultLocaleMonthsShort = 'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split('_');
    function localeMonthsShort (m, format) {
        if (!m) {
            return isArray(this._monthsShort) ? this._monthsShort :
                this._monthsShort['standalone'];
        }
        return isArray(this._monthsShort) ? this._monthsShort[m.month()] :
            this._monthsShort[MONTHS_IN_FORMAT.test(format) ? 'format' : 'standalone'][m.month()];
    }

    function handleStrictParse(monthName, format, strict) {
        var i, ii, mom, llc = monthName.toLocaleLowerCase();
        if (!this._monthsParse) {
            // this is not used
            this._monthsParse = [];
            this._longMonthsParse = [];
            this._shortMonthsParse = [];
            for (i = 0; i < 12; ++i) {
                mom = createUTC([2000, i]);
                this._shortMonthsParse[i] = this.monthsShort(mom, '').toLocaleLowerCase();
                this._longMonthsParse[i] = this.months(mom, '').toLocaleLowerCase();
            }
        }

        if (strict) {
            if (format === 'MMM') {
                ii = indexOf.call(this._shortMonthsParse, llc);
                return ii !== -1 ? ii : null;
            } else {
                ii = indexOf.call(this._longMonthsParse, llc);
                return ii !== -1 ? ii : null;
            }
        } else {
            if (format === 'MMM') {
                ii = indexOf.call(this._shortMonthsParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._longMonthsParse, llc);
                return ii !== -1 ? ii : null;
            } else {
                ii = indexOf.call(this._longMonthsParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._shortMonthsParse, llc);
                return ii !== -1 ? ii : null;
            }
        }
    }

    function localeMonthsParse (monthName, format, strict) {
        var i, mom, regex;

        if (this._monthsParseExact) {
            return handleStrictParse.call(this, monthName, format, strict);
        }

        if (!this._monthsParse) {
            this._monthsParse = [];
            this._longMonthsParse = [];
            this._shortMonthsParse = [];
        }

        // TODO: add sorting
        // Sorting makes sure if one month (or abbr) is a prefix of another
        // see sorting in computeMonthsParse
        for (i = 0; i < 12; i++) {
            // make the regex if we don't have it already
            mom = createUTC([2000, i]);
            if (strict && !this._longMonthsParse[i]) {
                this._longMonthsParse[i] = new RegExp('^' + this.months(mom, '').replace('.', '') + '$', 'i');
                this._shortMonthsParse[i] = new RegExp('^' + this.monthsShort(mom, '').replace('.', '') + '$', 'i');
            }
            if (!strict && !this._monthsParse[i]) {
                regex = '^' + this.months(mom, '') + '|^' + this.monthsShort(mom, '');
                this._monthsParse[i] = new RegExp(regex.replace('.', ''), 'i');
            }
            // test the regex
            if (strict && format === 'MMMM' && this._longMonthsParse[i].test(monthName)) {
                return i;
            } else if (strict && format === 'MMM' && this._shortMonthsParse[i].test(monthName)) {
                return i;
            } else if (!strict && this._monthsParse[i].test(monthName)) {
                return i;
            }
        }
    }

    // MOMENTS

    function setMonth (mom, value) {
        var dayOfMonth;

        if (!mom.isValid()) {
            // No op
            return mom;
        }

        if (typeof value === 'string') {
            if (/^\d+$/.test(value)) {
                value = toInt(value);
            } else {
                value = mom.localeData().monthsParse(value);
                // TODO: Another silent failure?
                if (!isNumber(value)) {
                    return mom;
                }
            }
        }

        dayOfMonth = Math.min(mom.date(), daysInMonth(mom.year(), value));
        mom._d['set' + (mom._isUTC ? 'UTC' : '') + 'Month'](value, dayOfMonth);
        return mom;
    }

    function getSetMonth (value) {
        if (value != null) {
            setMonth(this, value);
            hooks.updateOffset(this, true);
            return this;
        } else {
            return get(this, 'Month');
        }
    }

    function getDaysInMonth () {
        return daysInMonth(this.year(), this.month());
    }

    var defaultMonthsShortRegex = matchWord;
    function monthsShortRegex (isStrict) {
        if (this._monthsParseExact) {
            if (!hasOwnProp(this, '_monthsRegex')) {
                computeMonthsParse.call(this);
            }
            if (isStrict) {
                return this._monthsShortStrictRegex;
            } else {
                return this._monthsShortRegex;
            }
        } else {
            if (!hasOwnProp(this, '_monthsShortRegex')) {
                this._monthsShortRegex = defaultMonthsShortRegex;
            }
            return this._monthsShortStrictRegex && isStrict ?
                this._monthsShortStrictRegex : this._monthsShortRegex;
        }
    }

    var defaultMonthsRegex = matchWord;
    function monthsRegex (isStrict) {
        if (this._monthsParseExact) {
            if (!hasOwnProp(this, '_monthsRegex')) {
                computeMonthsParse.call(this);
            }
            if (isStrict) {
                return this._monthsStrictRegex;
            } else {
                return this._monthsRegex;
            }
        } else {
            if (!hasOwnProp(this, '_monthsRegex')) {
                this._monthsRegex = defaultMonthsRegex;
            }
            return this._monthsStrictRegex && isStrict ?
                this._monthsStrictRegex : this._monthsRegex;
        }
    }

    function computeMonthsParse () {
        function cmpLenRev(a, b) {
            return b.length - a.length;
        }

        var shortPieces = [], longPieces = [], mixedPieces = [],
            i, mom;
        for (i = 0; i < 12; i++) {
            // make the regex if we don't have it already
            mom = createUTC([2000, i]);
            shortPieces.push(this.monthsShort(mom, ''));
            longPieces.push(this.months(mom, ''));
            mixedPieces.push(this.months(mom, ''));
            mixedPieces.push(this.monthsShort(mom, ''));
        }
        // Sorting makes sure if one month (or abbr) is a prefix of another it
        // will match the longer piece.
        shortPieces.sort(cmpLenRev);
        longPieces.sort(cmpLenRev);
        mixedPieces.sort(cmpLenRev);
        for (i = 0; i < 12; i++) {
            shortPieces[i] = regexEscape(shortPieces[i]);
            longPieces[i] = regexEscape(longPieces[i]);
        }
        for (i = 0; i < 24; i++) {
            mixedPieces[i] = regexEscape(mixedPieces[i]);
        }

        this._monthsRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
        this._monthsShortRegex = this._monthsRegex;
        this._monthsStrictRegex = new RegExp('^(' + longPieces.join('|') + ')', 'i');
        this._monthsShortStrictRegex = new RegExp('^(' + shortPieces.join('|') + ')', 'i');
    }

    function createDate (y, m, d, h, M, s, ms) {
        // can't just apply() to create a date:
        // https://stackoverflow.com/q/181348
        var date;
        // the date constructor remaps years 0-99 to 1900-1999
        if (y < 100 && y >= 0) {
            // preserve leap years using a full 400 year cycle, then reset
            date = new Date(y + 400, m, d, h, M, s, ms);
            if (isFinite(date.getFullYear())) {
                date.setFullYear(y);
            }
        } else {
            date = new Date(y, m, d, h, M, s, ms);
        }

        return date;
    }

    function createUTCDate (y) {
        var date;
        // the Date.UTC function remaps years 0-99 to 1900-1999
        if (y < 100 && y >= 0) {
            var args = Array.prototype.slice.call(arguments);
            // preserve leap years using a full 400 year cycle, then reset
            args[0] = y + 400;
            date = new Date(Date.UTC.apply(null, args));
            if (isFinite(date.getUTCFullYear())) {
                date.setUTCFullYear(y);
            }
        } else {
            date = new Date(Date.UTC.apply(null, arguments));
        }

        return date;
    }

    // start-of-first-week - start-of-year
    function firstWeekOffset(year, dow, doy) {
        var // first-week day -- which january is always in the first week (4 for iso, 1 for other)
            fwd = 7 + dow - doy,
            // first-week day local weekday -- which local weekday is fwd
            fwdlw = (7 + createUTCDate(year, 0, fwd).getUTCDay() - dow) % 7;

        return -fwdlw + fwd - 1;
    }

    // https://en.wikipedia.org/wiki/ISO_week_date#Calculating_a_date_given_the_year.2C_week_number_and_weekday
    function dayOfYearFromWeeks(year, week, weekday, dow, doy) {
        var localWeekday = (7 + weekday - dow) % 7,
            weekOffset = firstWeekOffset(year, dow, doy),
            dayOfYear = 1 + 7 * (week - 1) + localWeekday + weekOffset,
            resYear, resDayOfYear;

        if (dayOfYear <= 0) {
            resYear = year - 1;
            resDayOfYear = daysInYear(resYear) + dayOfYear;
        } else if (dayOfYear > daysInYear(year)) {
            resYear = year + 1;
            resDayOfYear = dayOfYear - daysInYear(year);
        } else {
            resYear = year;
            resDayOfYear = dayOfYear;
        }

        return {
            year: resYear,
            dayOfYear: resDayOfYear
        };
    }

    function weekOfYear(mom, dow, doy) {
        var weekOffset = firstWeekOffset(mom.year(), dow, doy),
            week = Math.floor((mom.dayOfYear() - weekOffset - 1) / 7) + 1,
            resWeek, resYear;

        if (week < 1) {
            resYear = mom.year() - 1;
            resWeek = week + weeksInYear(resYear, dow, doy);
        } else if (week > weeksInYear(mom.year(), dow, doy)) {
            resWeek = week - weeksInYear(mom.year(), dow, doy);
            resYear = mom.year() + 1;
        } else {
            resYear = mom.year();
            resWeek = week;
        }

        return {
            week: resWeek,
            year: resYear
        };
    }

    function weeksInYear(year, dow, doy) {
        var weekOffset = firstWeekOffset(year, dow, doy),
            weekOffsetNext = firstWeekOffset(year + 1, dow, doy);
        return (daysInYear(year) - weekOffset + weekOffsetNext) / 7;
    }

    // FORMATTING

    addFormatToken('w', ['ww', 2], 'wo', 'week');
    addFormatToken('W', ['WW', 2], 'Wo', 'isoWeek');

    // ALIASES

    addUnitAlias('week', 'w');
    addUnitAlias('isoWeek', 'W');

    // PRIORITIES

    addUnitPriority('week', 5);
    addUnitPriority('isoWeek', 5);

    // PARSING

    addRegexToken('w',  match1to2);
    addRegexToken('ww', match1to2, match2);
    addRegexToken('W',  match1to2);
    addRegexToken('WW', match1to2, match2);

    addWeekParseToken(['w', 'ww', 'W', 'WW'], function (input, week, config, token) {
        week[token.substr(0, 1)] = toInt(input);
    });

    // HELPERS

    // LOCALES

    function localeWeek (mom) {
        return weekOfYear(mom, this._week.dow, this._week.doy).week;
    }

    var defaultLocaleWeek = {
        dow : 0, // Sunday is the first day of the week.
        doy : 6  // The week that contains Jan 6th is the first week of the year.
    };

    function localeFirstDayOfWeek () {
        return this._week.dow;
    }

    function localeFirstDayOfYear () {
        return this._week.doy;
    }

    // MOMENTS

    function getSetWeek (input) {
        var week = this.localeData().week(this);
        return input == null ? week : this.add((input - week) * 7, 'd');
    }

    function getSetISOWeek (input) {
        var week = weekOfYear(this, 1, 4).week;
        return input == null ? week : this.add((input - week) * 7, 'd');
    }

    // FORMATTING

    addFormatToken('d', 0, 'do', 'day');

    addFormatToken('dd', 0, 0, function (format) {
        return this.localeData().weekdaysMin(this, format);
    });

    addFormatToken('ddd', 0, 0, function (format) {
        return this.localeData().weekdaysShort(this, format);
    });

    addFormatToken('dddd', 0, 0, function (format) {
        return this.localeData().weekdays(this, format);
    });

    addFormatToken('e', 0, 0, 'weekday');
    addFormatToken('E', 0, 0, 'isoWeekday');

    // ALIASES

    addUnitAlias('day', 'd');
    addUnitAlias('weekday', 'e');
    addUnitAlias('isoWeekday', 'E');

    // PRIORITY
    addUnitPriority('day', 11);
    addUnitPriority('weekday', 11);
    addUnitPriority('isoWeekday', 11);

    // PARSING

    addRegexToken('d',    match1to2);
    addRegexToken('e',    match1to2);
    addRegexToken('E',    match1to2);
    addRegexToken('dd',   function (isStrict, locale) {
        return locale.weekdaysMinRegex(isStrict);
    });
    addRegexToken('ddd',   function (isStrict, locale) {
        return locale.weekdaysShortRegex(isStrict);
    });
    addRegexToken('dddd',   function (isStrict, locale) {
        return locale.weekdaysRegex(isStrict);
    });

    addWeekParseToken(['dd', 'ddd', 'dddd'], function (input, week, config, token) {
        var weekday = config._locale.weekdaysParse(input, token, config._strict);
        // if we didn't get a weekday name, mark the date as invalid
        if (weekday != null) {
            week.d = weekday;
        } else {
            getParsingFlags(config).invalidWeekday = input;
        }
    });

    addWeekParseToken(['d', 'e', 'E'], function (input, week, config, token) {
        week[token] = toInt(input);
    });

    // HELPERS

    function parseWeekday(input, locale) {
        if (typeof input !== 'string') {
            return input;
        }

        if (!isNaN(input)) {
            return parseInt(input, 10);
        }

        input = locale.weekdaysParse(input);
        if (typeof input === 'number') {
            return input;
        }

        return null;
    }

    function parseIsoWeekday(input, locale) {
        if (typeof input === 'string') {
            return locale.weekdaysParse(input) % 7 || 7;
        }
        return isNaN(input) ? null : input;
    }

    // LOCALES
    function shiftWeekdays (ws, n) {
        return ws.slice(n, 7).concat(ws.slice(0, n));
    }

    var defaultLocaleWeekdays = 'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_');
    function localeWeekdays (m, format) {
        var weekdays = isArray(this._weekdays) ? this._weekdays :
            this._weekdays[(m && m !== true && this._weekdays.isFormat.test(format)) ? 'format' : 'standalone'];
        return (m === true) ? shiftWeekdays(weekdays, this._week.dow)
            : (m) ? weekdays[m.day()] : weekdays;
    }

    var defaultLocaleWeekdaysShort = 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_');
    function localeWeekdaysShort (m) {
        return (m === true) ? shiftWeekdays(this._weekdaysShort, this._week.dow)
            : (m) ? this._weekdaysShort[m.day()] : this._weekdaysShort;
    }

    var defaultLocaleWeekdaysMin = 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_');
    function localeWeekdaysMin (m) {
        return (m === true) ? shiftWeekdays(this._weekdaysMin, this._week.dow)
            : (m) ? this._weekdaysMin[m.day()] : this._weekdaysMin;
    }

    function handleStrictParse$1(weekdayName, format, strict) {
        var i, ii, mom, llc = weekdayName.toLocaleLowerCase();
        if (!this._weekdaysParse) {
            this._weekdaysParse = [];
            this._shortWeekdaysParse = [];
            this._minWeekdaysParse = [];

            for (i = 0; i < 7; ++i) {
                mom = createUTC([2000, 1]).day(i);
                this._minWeekdaysParse[i] = this.weekdaysMin(mom, '').toLocaleLowerCase();
                this._shortWeekdaysParse[i] = this.weekdaysShort(mom, '').toLocaleLowerCase();
                this._weekdaysParse[i] = this.weekdays(mom, '').toLocaleLowerCase();
            }
        }

        if (strict) {
            if (format === 'dddd') {
                ii = indexOf.call(this._weekdaysParse, llc);
                return ii !== -1 ? ii : null;
            } else if (format === 'ddd') {
                ii = indexOf.call(this._shortWeekdaysParse, llc);
                return ii !== -1 ? ii : null;
            } else {
                ii = indexOf.call(this._minWeekdaysParse, llc);
                return ii !== -1 ? ii : null;
            }
        } else {
            if (format === 'dddd') {
                ii = indexOf.call(this._weekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._shortWeekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._minWeekdaysParse, llc);
                return ii !== -1 ? ii : null;
            } else if (format === 'ddd') {
                ii = indexOf.call(this._shortWeekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._weekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._minWeekdaysParse, llc);
                return ii !== -1 ? ii : null;
            } else {
                ii = indexOf.call(this._minWeekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._weekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._shortWeekdaysParse, llc);
                return ii !== -1 ? ii : null;
            }
        }
    }

    function localeWeekdaysParse (weekdayName, format, strict) {
        var i, mom, regex;

        if (this._weekdaysParseExact) {
            return handleStrictParse$1.call(this, weekdayName, format, strict);
        }

        if (!this._weekdaysParse) {
            this._weekdaysParse = [];
            this._minWeekdaysParse = [];
            this._shortWeekdaysParse = [];
            this._fullWeekdaysParse = [];
        }

        for (i = 0; i < 7; i++) {
            // make the regex if we don't have it already

            mom = createUTC([2000, 1]).day(i);
            if (strict && !this._fullWeekdaysParse[i]) {
                this._fullWeekdaysParse[i] = new RegExp('^' + this.weekdays(mom, '').replace('.', '\\.?') + '$', 'i');
                this._shortWeekdaysParse[i] = new RegExp('^' + this.weekdaysShort(mom, '').replace('.', '\\.?') + '$', 'i');
                this._minWeekdaysParse[i] = new RegExp('^' + this.weekdaysMin(mom, '').replace('.', '\\.?') + '$', 'i');
            }
            if (!this._weekdaysParse[i]) {
                regex = '^' + this.weekdays(mom, '') + '|^' + this.weekdaysShort(mom, '') + '|^' + this.weekdaysMin(mom, '');
                this._weekdaysParse[i] = new RegExp(regex.replace('.', ''), 'i');
            }
            // test the regex
            if (strict && format === 'dddd' && this._fullWeekdaysParse[i].test(weekdayName)) {
                return i;
            } else if (strict && format === 'ddd' && this._shortWeekdaysParse[i].test(weekdayName)) {
                return i;
            } else if (strict && format === 'dd' && this._minWeekdaysParse[i].test(weekdayName)) {
                return i;
            } else if (!strict && this._weekdaysParse[i].test(weekdayName)) {
                return i;
            }
        }
    }

    // MOMENTS

    function getSetDayOfWeek (input) {
        if (!this.isValid()) {
            return input != null ? this : NaN;
        }
        var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
        if (input != null) {
            input = parseWeekday(input, this.localeData());
            return this.add(input - day, 'd');
        } else {
            return day;
        }
    }

    function getSetLocaleDayOfWeek (input) {
        if (!this.isValid()) {
            return input != null ? this : NaN;
        }
        var weekday = (this.day() + 7 - this.localeData()._week.dow) % 7;
        return input == null ? weekday : this.add(input - weekday, 'd');
    }

    function getSetISODayOfWeek (input) {
        if (!this.isValid()) {
            return input != null ? this : NaN;
        }

        // behaves the same as moment#day except
        // as a getter, returns 7 instead of 0 (1-7 range instead of 0-6)
        // as a setter, sunday should belong to the previous week.

        if (input != null) {
            var weekday = parseIsoWeekday(input, this.localeData());
            return this.day(this.day() % 7 ? weekday : weekday - 7);
        } else {
            return this.day() || 7;
        }
    }

    var defaultWeekdaysRegex = matchWord;
    function weekdaysRegex (isStrict) {
        if (this._weekdaysParseExact) {
            if (!hasOwnProp(this, '_weekdaysRegex')) {
                computeWeekdaysParse.call(this);
            }
            if (isStrict) {
                return this._weekdaysStrictRegex;
            } else {
                return this._weekdaysRegex;
            }
        } else {
            if (!hasOwnProp(this, '_weekdaysRegex')) {
                this._weekdaysRegex = defaultWeekdaysRegex;
            }
            return this._weekdaysStrictRegex && isStrict ?
                this._weekdaysStrictRegex : this._weekdaysRegex;
        }
    }

    var defaultWeekdaysShortRegex = matchWord;
    function weekdaysShortRegex (isStrict) {
        if (this._weekdaysParseExact) {
            if (!hasOwnProp(this, '_weekdaysRegex')) {
                computeWeekdaysParse.call(this);
            }
            if (isStrict) {
                return this._weekdaysShortStrictRegex;
            } else {
                return this._weekdaysShortRegex;
            }
        } else {
            if (!hasOwnProp(this, '_weekdaysShortRegex')) {
                this._weekdaysShortRegex = defaultWeekdaysShortRegex;
            }
            return this._weekdaysShortStrictRegex && isStrict ?
                this._weekdaysShortStrictRegex : this._weekdaysShortRegex;
        }
    }

    var defaultWeekdaysMinRegex = matchWord;
    function weekdaysMinRegex (isStrict) {
        if (this._weekdaysParseExact) {
            if (!hasOwnProp(this, '_weekdaysRegex')) {
                computeWeekdaysParse.call(this);
            }
            if (isStrict) {
                return this._weekdaysMinStrictRegex;
            } else {
                return this._weekdaysMinRegex;
            }
        } else {
            if (!hasOwnProp(this, '_weekdaysMinRegex')) {
                this._weekdaysMinRegex = defaultWeekdaysMinRegex;
            }
            return this._weekdaysMinStrictRegex && isStrict ?
                this._weekdaysMinStrictRegex : this._weekdaysMinRegex;
        }
    }


    function computeWeekdaysParse () {
        function cmpLenRev(a, b) {
            return b.length - a.length;
        }

        var minPieces = [], shortPieces = [], longPieces = [], mixedPieces = [],
            i, mom, minp, shortp, longp;
        for (i = 0; i < 7; i++) {
            // make the regex if we don't have it already
            mom = createUTC([2000, 1]).day(i);
            minp = this.weekdaysMin(mom, '');
            shortp = this.weekdaysShort(mom, '');
            longp = this.weekdays(mom, '');
            minPieces.push(minp);
            shortPieces.push(shortp);
            longPieces.push(longp);
            mixedPieces.push(minp);
            mixedPieces.push(shortp);
            mixedPieces.push(longp);
        }
        // Sorting makes sure if one weekday (or abbr) is a prefix of another it
        // will match the longer piece.
        minPieces.sort(cmpLenRev);
        shortPieces.sort(cmpLenRev);
        longPieces.sort(cmpLenRev);
        mixedPieces.sort(cmpLenRev);
        for (i = 0; i < 7; i++) {
            shortPieces[i] = regexEscape(shortPieces[i]);
            longPieces[i] = regexEscape(longPieces[i]);
            mixedPieces[i] = regexEscape(mixedPieces[i]);
        }

        this._weekdaysRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
        this._weekdaysShortRegex = this._weekdaysRegex;
        this._weekdaysMinRegex = this._weekdaysRegex;

        this._weekdaysStrictRegex = new RegExp('^(' + longPieces.join('|') + ')', 'i');
        this._weekdaysShortStrictRegex = new RegExp('^(' + shortPieces.join('|') + ')', 'i');
        this._weekdaysMinStrictRegex = new RegExp('^(' + minPieces.join('|') + ')', 'i');
    }

    // FORMATTING

    function hFormat() {
        return this.hours() % 12 || 12;
    }

    function kFormat() {
        return this.hours() || 24;
    }

    addFormatToken('H', ['HH', 2], 0, 'hour');
    addFormatToken('h', ['hh', 2], 0, hFormat);
    addFormatToken('k', ['kk', 2], 0, kFormat);

    addFormatToken('hmm', 0, 0, function () {
        return '' + hFormat.apply(this) + zeroFill(this.minutes(), 2);
    });

    addFormatToken('hmmss', 0, 0, function () {
        return '' + hFormat.apply(this) + zeroFill(this.minutes(), 2) +
            zeroFill(this.seconds(), 2);
    });

    addFormatToken('Hmm', 0, 0, function () {
        return '' + this.hours() + zeroFill(this.minutes(), 2);
    });

    addFormatToken('Hmmss', 0, 0, function () {
        return '' + this.hours() + zeroFill(this.minutes(), 2) +
            zeroFill(this.seconds(), 2);
    });

    function meridiem (token, lowercase) {
        addFormatToken(token, 0, 0, function () {
            return this.localeData().meridiem(this.hours(), this.minutes(), lowercase);
        });
    }

    meridiem('a', true);
    meridiem('A', false);

    // ALIASES

    addUnitAlias('hour', 'h');

    // PRIORITY
    addUnitPriority('hour', 13);

    // PARSING

    function matchMeridiem (isStrict, locale) {
        return locale._meridiemParse;
    }

    addRegexToken('a',  matchMeridiem);
    addRegexToken('A',  matchMeridiem);
    addRegexToken('H',  match1to2);
    addRegexToken('h',  match1to2);
    addRegexToken('k',  match1to2);
    addRegexToken('HH', match1to2, match2);
    addRegexToken('hh', match1to2, match2);
    addRegexToken('kk', match1to2, match2);

    addRegexToken('hmm', match3to4);
    addRegexToken('hmmss', match5to6);
    addRegexToken('Hmm', match3to4);
    addRegexToken('Hmmss', match5to6);

    addParseToken(['H', 'HH'], HOUR);
    addParseToken(['k', 'kk'], function (input, array, config) {
        var kInput = toInt(input);
        array[HOUR] = kInput === 24 ? 0 : kInput;
    });
    addParseToken(['a', 'A'], function (input, array, config) {
        config._isPm = config._locale.isPM(input);
        config._meridiem = input;
    });
    addParseToken(['h', 'hh'], function (input, array, config) {
        array[HOUR] = toInt(input);
        getParsingFlags(config).bigHour = true;
    });
    addParseToken('hmm', function (input, array, config) {
        var pos = input.length - 2;
        array[HOUR] = toInt(input.substr(0, pos));
        array[MINUTE] = toInt(input.substr(pos));
        getParsingFlags(config).bigHour = true;
    });
    addParseToken('hmmss', function (input, array, config) {
        var pos1 = input.length - 4;
        var pos2 = input.length - 2;
        array[HOUR] = toInt(input.substr(0, pos1));
        array[MINUTE] = toInt(input.substr(pos1, 2));
        array[SECOND] = toInt(input.substr(pos2));
        getParsingFlags(config).bigHour = true;
    });
    addParseToken('Hmm', function (input, array, config) {
        var pos = input.length - 2;
        array[HOUR] = toInt(input.substr(0, pos));
        array[MINUTE] = toInt(input.substr(pos));
    });
    addParseToken('Hmmss', function (input, array, config) {
        var pos1 = input.length - 4;
        var pos2 = input.length - 2;
        array[HOUR] = toInt(input.substr(0, pos1));
        array[MINUTE] = toInt(input.substr(pos1, 2));
        array[SECOND] = toInt(input.substr(pos2));
    });

    // LOCALES

    function localeIsPM (input) {
        // IE8 Quirks Mode & IE7 Standards Mode do not allow accessing strings like arrays
        // Using charAt should be more compatible.
        return ((input + '').toLowerCase().charAt(0) === 'p');
    }

    var defaultLocaleMeridiemParse = /[ap]\.?m?\.?/i;
    function localeMeridiem (hours, minutes, isLower) {
        if (hours > 11) {
            return isLower ? 'pm' : 'PM';
        } else {
            return isLower ? 'am' : 'AM';
        }
    }


    // MOMENTS

    // Setting the hour should keep the time, because the user explicitly
    // specified which hour they want. So trying to maintain the same hour (in
    // a new timezone) makes sense. Adding/subtracting hours does not follow
    // this rule.
    var getSetHour = makeGetSet('Hours', true);

    var baseConfig = {
        calendar: defaultCalendar,
        longDateFormat: defaultLongDateFormat,
        invalidDate: defaultInvalidDate,
        ordinal: defaultOrdinal,
        dayOfMonthOrdinalParse: defaultDayOfMonthOrdinalParse,
        relativeTime: defaultRelativeTime,

        months: defaultLocaleMonths,
        monthsShort: defaultLocaleMonthsShort,

        week: defaultLocaleWeek,

        weekdays: defaultLocaleWeekdays,
        weekdaysMin: defaultLocaleWeekdaysMin,
        weekdaysShort: defaultLocaleWeekdaysShort,

        meridiemParse: defaultLocaleMeridiemParse
    };

    // internal storage for locale config files
    var locales = {};
    var localeFamilies = {};
    var globalLocale;

    function normalizeLocale(key) {
        return key ? key.toLowerCase().replace('_', '-') : key;
    }

    // pick the locale from the array
    // try ['en-au', 'en-gb'] as 'en-au', 'en-gb', 'en', as in move through the list trying each
    // substring from most specific to least, but move to the next array item if it's a more specific variant than the current root
    function chooseLocale(names) {
        var i = 0, j, next, locale, split;

        while (i < names.length) {
            split = normalizeLocale(names[i]).split('-');
            j = split.length;
            next = normalizeLocale(names[i + 1]);
            next = next ? next.split('-') : null;
            while (j > 0) {
                locale = loadLocale(split.slice(0, j).join('-'));
                if (locale) {
                    return locale;
                }
                if (next && next.length >= j && compareArrays(split, next, true) >= j - 1) {
                    //the next array item is better than a shallower substring of this one
                    break;
                }
                j--;
            }
            i++;
        }
        return globalLocale;
    }

    function loadLocale(name) {
        var oldLocale = null;
        // TODO: Find a better way to register and load all the locales in Node
        if (!locales[name] && (typeof module !== 'undefined') &&
                module && module.exports) {
            try {
                oldLocale = globalLocale._abbr;
                var aliasedRequire = require;
                aliasedRequire('./locale/' + name);
                getSetGlobalLocale(oldLocale);
            } catch (e) {}
        }
        return locales[name];
    }

    // This function will load locale and then set the global locale.  If
    // no arguments are passed in, it will simply return the current global
    // locale key.
    function getSetGlobalLocale (key, values) {
        var data;
        if (key) {
            if (isUndefined(values)) {
                data = getLocale(key);
            }
            else {
                data = defineLocale(key, values);
            }

            if (data) {
                // moment.duration._locale = moment._locale = data;
                globalLocale = data;
            }
            else {
                if ((typeof console !==  'undefined') && console.warn) {
                    //warn user if arguments are passed but the locale could not be set
                    console.warn('Locale ' + key +  ' not found. Did you forget to load it?');
                }
            }
        }

        return globalLocale._abbr;
    }

    function defineLocale (name, config) {
        if (config !== null) {
            var locale, parentConfig = baseConfig;
            config.abbr = name;
            if (locales[name] != null) {
                deprecateSimple('defineLocaleOverride',
                        'use moment.updateLocale(localeName, config) to change ' +
                        'an existing locale. moment.defineLocale(localeName, ' +
                        'config) should only be used for creating a new locale ' +
                        'See http://momentjs.com/guides/#/warnings/define-locale/ for more info.');
                parentConfig = locales[name]._config;
            } else if (config.parentLocale != null) {
                if (locales[config.parentLocale] != null) {
                    parentConfig = locales[config.parentLocale]._config;
                } else {
                    locale = loadLocale(config.parentLocale);
                    if (locale != null) {
                        parentConfig = locale._config;
                    } else {
                        if (!localeFamilies[config.parentLocale]) {
                            localeFamilies[config.parentLocale] = [];
                        }
                        localeFamilies[config.parentLocale].push({
                            name: name,
                            config: config
                        });
                        return null;
                    }
                }
            }
            locales[name] = new Locale(mergeConfigs(parentConfig, config));

            if (localeFamilies[name]) {
                localeFamilies[name].forEach(function (x) {
                    defineLocale(x.name, x.config);
                });
            }

            // backwards compat for now: also set the locale
            // make sure we set the locale AFTER all child locales have been
            // created, so we won't end up with the child locale set.
            getSetGlobalLocale(name);


            return locales[name];
        } else {
            // useful for testing
            delete locales[name];
            return null;
        }
    }

    function updateLocale(name, config) {
        if (config != null) {
            var locale, tmpLocale, parentConfig = baseConfig;
            // MERGE
            tmpLocale = loadLocale(name);
            if (tmpLocale != null) {
                parentConfig = tmpLocale._config;
            }
            config = mergeConfigs(parentConfig, config);
            locale = new Locale(config);
            locale.parentLocale = locales[name];
            locales[name] = locale;

            // backwards compat for now: also set the locale
            getSetGlobalLocale(name);
        } else {
            // pass null for config to unupdate, useful for tests
            if (locales[name] != null) {
                if (locales[name].parentLocale != null) {
                    locales[name] = locales[name].parentLocale;
                } else if (locales[name] != null) {
                    delete locales[name];
                }
            }
        }
        return locales[name];
    }

    // returns locale data
    function getLocale (key) {
        var locale;

        if (key && key._locale && key._locale._abbr) {
            key = key._locale._abbr;
        }

        if (!key) {
            return globalLocale;
        }

        if (!isArray(key)) {
            //short-circuit everything else
            locale = loadLocale(key);
            if (locale) {
                return locale;
            }
            key = [key];
        }

        return chooseLocale(key);
    }

    function listLocales() {
        return keys(locales);
    }

    function checkOverflow (m) {
        var overflow;
        var a = m._a;

        if (a && getParsingFlags(m).overflow === -2) {
            overflow =
                a[MONTH]       < 0 || a[MONTH]       > 11  ? MONTH :
                a[DATE]        < 1 || a[DATE]        > daysInMonth(a[YEAR], a[MONTH]) ? DATE :
                a[HOUR]        < 0 || a[HOUR]        > 24 || (a[HOUR] === 24 && (a[MINUTE] !== 0 || a[SECOND] !== 0 || a[MILLISECOND] !== 0)) ? HOUR :
                a[MINUTE]      < 0 || a[MINUTE]      > 59  ? MINUTE :
                a[SECOND]      < 0 || a[SECOND]      > 59  ? SECOND :
                a[MILLISECOND] < 0 || a[MILLISECOND] > 999 ? MILLISECOND :
                -1;

            if (getParsingFlags(m)._overflowDayOfYear && (overflow < YEAR || overflow > DATE)) {
                overflow = DATE;
            }
            if (getParsingFlags(m)._overflowWeeks && overflow === -1) {
                overflow = WEEK;
            }
            if (getParsingFlags(m)._overflowWeekday && overflow === -1) {
                overflow = WEEKDAY;
            }

            getParsingFlags(m).overflow = overflow;
        }

        return m;
    }

    // Pick the first defined of two or three arguments.
    function defaults(a, b, c) {
        if (a != null) {
            return a;
        }
        if (b != null) {
            return b;
        }
        return c;
    }

    function currentDateArray(config) {
        // hooks is actually the exported moment object
        var nowValue = new Date(hooks.now());
        if (config._useUTC) {
            return [nowValue.getUTCFullYear(), nowValue.getUTCMonth(), nowValue.getUTCDate()];
        }
        return [nowValue.getFullYear(), nowValue.getMonth(), nowValue.getDate()];
    }

    // convert an array to a date.
    // the array should mirror the parameters below
    // note: all values past the year are optional and will default to the lowest possible value.
    // [year, month, day , hour, minute, second, millisecond]
    function configFromArray (config) {
        var i, date, input = [], currentDate, expectedWeekday, yearToUse;

        if (config._d) {
            return;
        }

        currentDate = currentDateArray(config);

        //compute day of the year from weeks and weekdays
        if (config._w && config._a[DATE] == null && config._a[MONTH] == null) {
            dayOfYearFromWeekInfo(config);
        }

        //if the day of the year is set, figure out what it is
        if (config._dayOfYear != null) {
            yearToUse = defaults(config._a[YEAR], currentDate[YEAR]);

            if (config._dayOfYear > daysInYear(yearToUse) || config._dayOfYear === 0) {
                getParsingFlags(config)._overflowDayOfYear = true;
            }

            date = createUTCDate(yearToUse, 0, config._dayOfYear);
            config._a[MONTH] = date.getUTCMonth();
            config._a[DATE] = date.getUTCDate();
        }

        // Default to current date.
        // * if no year, month, day of month are given, default to today
        // * if day of month is given, default month and year
        // * if month is given, default only year
        // * if year is given, don't default anything
        for (i = 0; i < 3 && config._a[i] == null; ++i) {
            config._a[i] = input[i] = currentDate[i];
        }

        // Zero out whatever was not defaulted, including time
        for (; i < 7; i++) {
            config._a[i] = input[i] = (config._a[i] == null) ? (i === 2 ? 1 : 0) : config._a[i];
        }

        // Check for 24:00:00.000
        if (config._a[HOUR] === 24 &&
                config._a[MINUTE] === 0 &&
                config._a[SECOND] === 0 &&
                config._a[MILLISECOND] === 0) {
            config._nextDay = true;
            config._a[HOUR] = 0;
        }

        config._d = (config._useUTC ? createUTCDate : createDate).apply(null, input);
        expectedWeekday = config._useUTC ? config._d.getUTCDay() : config._d.getDay();

        // Apply timezone offset from input. The actual utcOffset can be changed
        // with parseZone.
        if (config._tzm != null) {
            config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);
        }

        if (config._nextDay) {
            config._a[HOUR] = 24;
        }

        // check for mismatching day of week
        if (config._w && typeof config._w.d !== 'undefined' && config._w.d !== expectedWeekday) {
            getParsingFlags(config).weekdayMismatch = true;
        }
    }

    function dayOfYearFromWeekInfo(config) {
        var w, weekYear, week, weekday, dow, doy, temp, weekdayOverflow;

        w = config._w;
        if (w.GG != null || w.W != null || w.E != null) {
            dow = 1;
            doy = 4;

            // TODO: We need to take the current isoWeekYear, but that depends on
            // how we interpret now (local, utc, fixed offset). So create
            // a now version of current config (take local/utc/offset flags, and
            // create now).
            weekYear = defaults(w.GG, config._a[YEAR], weekOfYear(createLocal(), 1, 4).year);
            week = defaults(w.W, 1);
            weekday = defaults(w.E, 1);
            if (weekday < 1 || weekday > 7) {
                weekdayOverflow = true;
            }
        } else {
            dow = config._locale._week.dow;
            doy = config._locale._week.doy;

            var curWeek = weekOfYear(createLocal(), dow, doy);

            weekYear = defaults(w.gg, config._a[YEAR], curWeek.year);

            // Default to current week.
            week = defaults(w.w, curWeek.week);

            if (w.d != null) {
                // weekday -- low day numbers are considered next week
                weekday = w.d;
                if (weekday < 0 || weekday > 6) {
                    weekdayOverflow = true;
                }
            } else if (w.e != null) {
                // local weekday -- counting starts from beginning of week
                weekday = w.e + dow;
                if (w.e < 0 || w.e > 6) {
                    weekdayOverflow = true;
                }
            } else {
                // default to beginning of week
                weekday = dow;
            }
        }
        if (week < 1 || week > weeksInYear(weekYear, dow, doy)) {
            getParsingFlags(config)._overflowWeeks = true;
        } else if (weekdayOverflow != null) {
            getParsingFlags(config)._overflowWeekday = true;
        } else {
            temp = dayOfYearFromWeeks(weekYear, week, weekday, dow, doy);
            config._a[YEAR] = temp.year;
            config._dayOfYear = temp.dayOfYear;
        }
    }

    // iso 8601 regex
    // 0000-00-00 0000-W00 or 0000-W00-0 + T + 00 or 00:00 or 00:00:00 or 00:00:00.000 + +00:00 or +0000 or +00)
    var extendedIsoRegex = /^\s*((?:[+-]\d{6}|\d{4})-(?:\d\d-\d\d|W\d\d-\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?::\d\d(?::\d\d(?:[.,]\d+)?)?)?)([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/;
    var basicIsoRegex = /^\s*((?:[+-]\d{6}|\d{4})(?:\d\d\d\d|W\d\d\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?:\d\d(?:\d\d(?:[.,]\d+)?)?)?)([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/;

    var tzRegex = /Z|[+-]\d\d(?::?\d\d)?/;

    var isoDates = [
        ['YYYYYY-MM-DD', /[+-]\d{6}-\d\d-\d\d/],
        ['YYYY-MM-DD', /\d{4}-\d\d-\d\d/],
        ['GGGG-[W]WW-E', /\d{4}-W\d\d-\d/],
        ['GGGG-[W]WW', /\d{4}-W\d\d/, false],
        ['YYYY-DDD', /\d{4}-\d{3}/],
        ['YYYY-MM', /\d{4}-\d\d/, false],
        ['YYYYYYMMDD', /[+-]\d{10}/],
        ['YYYYMMDD', /\d{8}/],
        // YYYYMM is NOT allowed by the standard
        ['GGGG[W]WWE', /\d{4}W\d{3}/],
        ['GGGG[W]WW', /\d{4}W\d{2}/, false],
        ['YYYYDDD', /\d{7}/]
    ];

    // iso time formats and regexes
    var isoTimes = [
        ['HH:mm:ss.SSSS', /\d\d:\d\d:\d\d\.\d+/],
        ['HH:mm:ss,SSSS', /\d\d:\d\d:\d\d,\d+/],
        ['HH:mm:ss', /\d\d:\d\d:\d\d/],
        ['HH:mm', /\d\d:\d\d/],
        ['HHmmss.SSSS', /\d\d\d\d\d\d\.\d+/],
        ['HHmmss,SSSS', /\d\d\d\d\d\d,\d+/],
        ['HHmmss', /\d\d\d\d\d\d/],
        ['HHmm', /\d\d\d\d/],
        ['HH', /\d\d/]
    ];

    var aspNetJsonRegex = /^\/?Date\((\-?\d+)/i;

    // date from iso format
    function configFromISO(config) {
        var i, l,
            string = config._i,
            match = extendedIsoRegex.exec(string) || basicIsoRegex.exec(string),
            allowTime, dateFormat, timeFormat, tzFormat;

        if (match) {
            getParsingFlags(config).iso = true;

            for (i = 0, l = isoDates.length; i < l; i++) {
                if (isoDates[i][1].exec(match[1])) {
                    dateFormat = isoDates[i][0];
                    allowTime = isoDates[i][2] !== false;
                    break;
                }
            }
            if (dateFormat == null) {
                config._isValid = false;
                return;
            }
            if (match[3]) {
                for (i = 0, l = isoTimes.length; i < l; i++) {
                    if (isoTimes[i][1].exec(match[3])) {
                        // match[2] should be 'T' or space
                        timeFormat = (match[2] || ' ') + isoTimes[i][0];
                        break;
                    }
                }
                if (timeFormat == null) {
                    config._isValid = false;
                    return;
                }
            }
            if (!allowTime && timeFormat != null) {
                config._isValid = false;
                return;
            }
            if (match[4]) {
                if (tzRegex.exec(match[4])) {
                    tzFormat = 'Z';
                } else {
                    config._isValid = false;
                    return;
                }
            }
            config._f = dateFormat + (timeFormat || '') + (tzFormat || '');
            configFromStringAndFormat(config);
        } else {
            config._isValid = false;
        }
    }

    // RFC 2822 regex: For details see https://tools.ietf.org/html/rfc2822#section-3.3
    var rfc2822 = /^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})\s(\d\d):(\d\d)(?::(\d\d))?\s(?:(UT|GMT|[ECMP][SD]T)|([Zz])|([+-]\d{4}))$/;

    function extractFromRFC2822Strings(yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr) {
        var result = [
            untruncateYear(yearStr),
            defaultLocaleMonthsShort.indexOf(monthStr),
            parseInt(dayStr, 10),
            parseInt(hourStr, 10),
            parseInt(minuteStr, 10)
        ];

        if (secondStr) {
            result.push(parseInt(secondStr, 10));
        }

        return result;
    }

    function untruncateYear(yearStr) {
        var year = parseInt(yearStr, 10);
        if (year <= 49) {
            return 2000 + year;
        } else if (year <= 999) {
            return 1900 + year;
        }
        return year;
    }

    function preprocessRFC2822(s) {
        // Remove comments and folding whitespace and replace multiple-spaces with a single space
        return s.replace(/\([^)]*\)|[\n\t]/g, ' ').replace(/(\s\s+)/g, ' ').replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    }

    function checkWeekday(weekdayStr, parsedInput, config) {
        if (weekdayStr) {
            // TODO: Replace the vanilla JS Date object with an indepentent day-of-week check.
            var weekdayProvided = defaultLocaleWeekdaysShort.indexOf(weekdayStr),
                weekdayActual = new Date(parsedInput[0], parsedInput[1], parsedInput[2]).getDay();
            if (weekdayProvided !== weekdayActual) {
                getParsingFlags(config).weekdayMismatch = true;
                config._isValid = false;
                return false;
            }
        }
        return true;
    }

    var obsOffsets = {
        UT: 0,
        GMT: 0,
        EDT: -4 * 60,
        EST: -5 * 60,
        CDT: -5 * 60,
        CST: -6 * 60,
        MDT: -6 * 60,
        MST: -7 * 60,
        PDT: -7 * 60,
        PST: -8 * 60
    };

    function calculateOffset(obsOffset, militaryOffset, numOffset) {
        if (obsOffset) {
            return obsOffsets[obsOffset];
        } else if (militaryOffset) {
            // the only allowed military tz is Z
            return 0;
        } else {
            var hm = parseInt(numOffset, 10);
            var m = hm % 100, h = (hm - m) / 100;
            return h * 60 + m;
        }
    }

    // date and time from ref 2822 format
    function configFromRFC2822(config) {
        var match = rfc2822.exec(preprocessRFC2822(config._i));
        if (match) {
            var parsedArray = extractFromRFC2822Strings(match[4], match[3], match[2], match[5], match[6], match[7]);
            if (!checkWeekday(match[1], parsedArray, config)) {
                return;
            }

            config._a = parsedArray;
            config._tzm = calculateOffset(match[8], match[9], match[10]);

            config._d = createUTCDate.apply(null, config._a);
            config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);

            getParsingFlags(config).rfc2822 = true;
        } else {
            config._isValid = false;
        }
    }

    // date from iso format or fallback
    function configFromString(config) {
        var matched = aspNetJsonRegex.exec(config._i);

        if (matched !== null) {
            config._d = new Date(+matched[1]);
            return;
        }

        configFromISO(config);
        if (config._isValid === false) {
            delete config._isValid;
        } else {
            return;
        }

        configFromRFC2822(config);
        if (config._isValid === false) {
            delete config._isValid;
        } else {
            return;
        }

        // Final attempt, use Input Fallback
        hooks.createFromInputFallback(config);
    }

    hooks.createFromInputFallback = deprecate(
        'value provided is not in a recognized RFC2822 or ISO format. moment construction falls back to js Date(), ' +
        'which is not reliable across all browsers and versions. Non RFC2822/ISO date formats are ' +
        'discouraged and will be removed in an upcoming major release. Please refer to ' +
        'http://momentjs.com/guides/#/warnings/js-date/ for more info.',
        function (config) {
            config._d = new Date(config._i + (config._useUTC ? ' UTC' : ''));
        }
    );

    // constant that refers to the ISO standard
    hooks.ISO_8601 = function () {};

    // constant that refers to the RFC 2822 form
    hooks.RFC_2822 = function () {};

    // date from string and format string
    function configFromStringAndFormat(config) {
        // TODO: Move this to another part of the creation flow to prevent circular deps
        if (config._f === hooks.ISO_8601) {
            configFromISO(config);
            return;
        }
        if (config._f === hooks.RFC_2822) {
            configFromRFC2822(config);
            return;
        }
        config._a = [];
        getParsingFlags(config).empty = true;

        // This array is used to make a Date, either with `new Date` or `Date.UTC`
        var string = '' + config._i,
            i, parsedInput, tokens, token, skipped,
            stringLength = string.length,
            totalParsedInputLength = 0;

        tokens = expandFormat(config._f, config._locale).match(formattingTokens) || [];

        for (i = 0; i < tokens.length; i++) {
            token = tokens[i];
            parsedInput = (string.match(getParseRegexForToken(token, config)) || [])[0];
            // console.log('token', token, 'parsedInput', parsedInput,
            //         'regex', getParseRegexForToken(token, config));
            if (parsedInput) {
                skipped = string.substr(0, string.indexOf(parsedInput));
                if (skipped.length > 0) {
                    getParsingFlags(config).unusedInput.push(skipped);
                }
                string = string.slice(string.indexOf(parsedInput) + parsedInput.length);
                totalParsedInputLength += parsedInput.length;
            }
            // don't parse if it's not a known token
            if (formatTokenFunctions[token]) {
                if (parsedInput) {
                    getParsingFlags(config).empty = false;
                }
                else {
                    getParsingFlags(config).unusedTokens.push(token);
                }
                addTimeToArrayFromToken(token, parsedInput, config);
            }
            else if (config._strict && !parsedInput) {
                getParsingFlags(config).unusedTokens.push(token);
            }
        }

        // add remaining unparsed input length to the string
        getParsingFlags(config).charsLeftOver = stringLength - totalParsedInputLength;
        if (string.length > 0) {
            getParsingFlags(config).unusedInput.push(string);
        }

        // clear _12h flag if hour is <= 12
        if (config._a[HOUR] <= 12 &&
            getParsingFlags(config).bigHour === true &&
            config._a[HOUR] > 0) {
            getParsingFlags(config).bigHour = undefined;
        }

        getParsingFlags(config).parsedDateParts = config._a.slice(0);
        getParsingFlags(config).meridiem = config._meridiem;
        // handle meridiem
        config._a[HOUR] = meridiemFixWrap(config._locale, config._a[HOUR], config._meridiem);

        configFromArray(config);
        checkOverflow(config);
    }


    function meridiemFixWrap (locale, hour, meridiem) {
        var isPm;

        if (meridiem == null) {
            // nothing to do
            return hour;
        }
        if (locale.meridiemHour != null) {
            return locale.meridiemHour(hour, meridiem);
        } else if (locale.isPM != null) {
            // Fallback
            isPm = locale.isPM(meridiem);
            if (isPm && hour < 12) {
                hour += 12;
            }
            if (!isPm && hour === 12) {
                hour = 0;
            }
            return hour;
        } else {
            // this is not supposed to happen
            return hour;
        }
    }

    // date from string and array of format strings
    function configFromStringAndArray(config) {
        var tempConfig,
            bestMoment,

            scoreToBeat,
            i,
            currentScore;

        if (config._f.length === 0) {
            getParsingFlags(config).invalidFormat = true;
            config._d = new Date(NaN);
            return;
        }

        for (i = 0; i < config._f.length; i++) {
            currentScore = 0;
            tempConfig = copyConfig({}, config);
            if (config._useUTC != null) {
                tempConfig._useUTC = config._useUTC;
            }
            tempConfig._f = config._f[i];
            configFromStringAndFormat(tempConfig);

            if (!isValid(tempConfig)) {
                continue;
            }

            // if there is any input that was not parsed add a penalty for that format
            currentScore += getParsingFlags(tempConfig).charsLeftOver;

            //or tokens
            currentScore += getParsingFlags(tempConfig).unusedTokens.length * 10;

            getParsingFlags(tempConfig).score = currentScore;

            if (scoreToBeat == null || currentScore < scoreToBeat) {
                scoreToBeat = currentScore;
                bestMoment = tempConfig;
            }
        }

        extend(config, bestMoment || tempConfig);
    }

    function configFromObject(config) {
        if (config._d) {
            return;
        }

        var i = normalizeObjectUnits(config._i);
        config._a = map([i.year, i.month, i.day || i.date, i.hour, i.minute, i.second, i.millisecond], function (obj) {
            return obj && parseInt(obj, 10);
        });

        configFromArray(config);
    }

    function createFromConfig (config) {
        var res = new Moment(checkOverflow(prepareConfig(config)));
        if (res._nextDay) {
            // Adding is smart enough around DST
            res.add(1, 'd');
            res._nextDay = undefined;
        }

        return res;
    }

    function prepareConfig (config) {
        var input = config._i,
            format = config._f;

        config._locale = config._locale || getLocale(config._l);

        if (input === null || (format === undefined && input === '')) {
            return createInvalid({nullInput: true});
        }

        if (typeof input === 'string') {
            config._i = input = config._locale.preparse(input);
        }

        if (isMoment(input)) {
            return new Moment(checkOverflow(input));
        } else if (isDate(input)) {
            config._d = input;
        } else if (isArray(format)) {
            configFromStringAndArray(config);
        } else if (format) {
            configFromStringAndFormat(config);
        }  else {
            configFromInput(config);
        }

        if (!isValid(config)) {
            config._d = null;
        }

        return config;
    }

    function configFromInput(config) {
        var input = config._i;
        if (isUndefined(input)) {
            config._d = new Date(hooks.now());
        } else if (isDate(input)) {
            config._d = new Date(input.valueOf());
        } else if (typeof input === 'string') {
            configFromString(config);
        } else if (isArray(input)) {
            config._a = map(input.slice(0), function (obj) {
                return parseInt(obj, 10);
            });
            configFromArray(config);
        } else if (isObject(input)) {
            configFromObject(config);
        } else if (isNumber(input)) {
            // from milliseconds
            config._d = new Date(input);
        } else {
            hooks.createFromInputFallback(config);
        }
    }

    function createLocalOrUTC (input, format, locale, strict, isUTC) {
        var c = {};

        if (locale === true || locale === false) {
            strict = locale;
            locale = undefined;
        }

        if ((isObject(input) && isObjectEmpty(input)) ||
                (isArray(input) && input.length === 0)) {
            input = undefined;
        }
        // object construction must be done this way.
        // https://github.com/moment/moment/issues/1423
        c._isAMomentObject = true;
        c._useUTC = c._isUTC = isUTC;
        c._l = locale;
        c._i = input;
        c._f = format;
        c._strict = strict;

        return createFromConfig(c);
    }

    function createLocal (input, format, locale, strict) {
        return createLocalOrUTC(input, format, locale, strict, false);
    }

    var prototypeMin = deprecate(
        'moment().min is deprecated, use moment.max instead. http://momentjs.com/guides/#/warnings/min-max/',
        function () {
            var other = createLocal.apply(null, arguments);
            if (this.isValid() && other.isValid()) {
                return other < this ? this : other;
            } else {
                return createInvalid();
            }
        }
    );

    var prototypeMax = deprecate(
        'moment().max is deprecated, use moment.min instead. http://momentjs.com/guides/#/warnings/min-max/',
        function () {
            var other = createLocal.apply(null, arguments);
            if (this.isValid() && other.isValid()) {
                return other > this ? this : other;
            } else {
                return createInvalid();
            }
        }
    );

    // Pick a moment m from moments so that m[fn](other) is true for all
    // other. This relies on the function fn to be transitive.
    //
    // moments should either be an array of moment objects or an array, whose
    // first element is an array of moment objects.
    function pickBy(fn, moments) {
        var res, i;
        if (moments.length === 1 && isArray(moments[0])) {
            moments = moments[0];
        }
        if (!moments.length) {
            return createLocal();
        }
        res = moments[0];
        for (i = 1; i < moments.length; ++i) {
            if (!moments[i].isValid() || moments[i][fn](res)) {
                res = moments[i];
            }
        }
        return res;
    }

    // TODO: Use [].sort instead?
    function min () {
        var args = [].slice.call(arguments, 0);

        return pickBy('isBefore', args);
    }

    function max () {
        var args = [].slice.call(arguments, 0);

        return pickBy('isAfter', args);
    }

    var now = function () {
        return Date.now ? Date.now() : +(new Date());
    };

    var ordering = ['year', 'quarter', 'month', 'week', 'day', 'hour', 'minute', 'second', 'millisecond'];

    function isDurationValid(m) {
        for (var key in m) {
            if (!(indexOf.call(ordering, key) !== -1 && (m[key] == null || !isNaN(m[key])))) {
                return false;
            }
        }

        var unitHasDecimal = false;
        for (var i = 0; i < ordering.length; ++i) {
            if (m[ordering[i]]) {
                if (unitHasDecimal) {
                    return false; // only allow non-integers for smallest unit
                }
                if (parseFloat(m[ordering[i]]) !== toInt(m[ordering[i]])) {
                    unitHasDecimal = true;
                }
            }
        }

        return true;
    }

    function isValid$1() {
        return this._isValid;
    }

    function createInvalid$1() {
        return createDuration(NaN);
    }

    function Duration (duration) {
        var normalizedInput = normalizeObjectUnits(duration),
            years = normalizedInput.year || 0,
            quarters = normalizedInput.quarter || 0,
            months = normalizedInput.month || 0,
            weeks = normalizedInput.week || normalizedInput.isoWeek || 0,
            days = normalizedInput.day || 0,
            hours = normalizedInput.hour || 0,
            minutes = normalizedInput.minute || 0,
            seconds = normalizedInput.second || 0,
            milliseconds = normalizedInput.millisecond || 0;

        this._isValid = isDurationValid(normalizedInput);

        // representation for dateAddRemove
        this._milliseconds = +milliseconds +
            seconds * 1e3 + // 1000
            minutes * 6e4 + // 1000 * 60
            hours * 1000 * 60 * 60; //using 1000 * 60 * 60 instead of 36e5 to avoid floating point rounding errors https://github.com/moment/moment/issues/2978
        // Because of dateAddRemove treats 24 hours as different from a
        // day when working around DST, we need to store them separately
        this._days = +days +
            weeks * 7;
        // It is impossible to translate months into days without knowing
        // which months you are are talking about, so we have to store
        // it separately.
        this._months = +months +
            quarters * 3 +
            years * 12;

        this._data = {};

        this._locale = getLocale();

        this._bubble();
    }

    function isDuration (obj) {
        return obj instanceof Duration;
    }

    function absRound (number) {
        if (number < 0) {
            return Math.round(-1 * number) * -1;
        } else {
            return Math.round(number);
        }
    }

    // FORMATTING

    function offset (token, separator) {
        addFormatToken(token, 0, 0, function () {
            var offset = this.utcOffset();
            var sign = '+';
            if (offset < 0) {
                offset = -offset;
                sign = '-';
            }
            return sign + zeroFill(~~(offset / 60), 2) + separator + zeroFill(~~(offset) % 60, 2);
        });
    }

    offset('Z', ':');
    offset('ZZ', '');

    // PARSING

    addRegexToken('Z',  matchShortOffset);
    addRegexToken('ZZ', matchShortOffset);
    addParseToken(['Z', 'ZZ'], function (input, array, config) {
        config._useUTC = true;
        config._tzm = offsetFromString(matchShortOffset, input);
    });

    // HELPERS

    // timezone chunker
    // '+10:00' > ['10',  '00']
    // '-1530'  > ['-15', '30']
    var chunkOffset = /([\+\-]|\d\d)/gi;

    function offsetFromString(matcher, string) {
        var matches = (string || '').match(matcher);

        if (matches === null) {
            return null;
        }

        var chunk   = matches[matches.length - 1] || [];
        var parts   = (chunk + '').match(chunkOffset) || ['-', 0, 0];
        var minutes = +(parts[1] * 60) + toInt(parts[2]);

        return minutes === 0 ?
          0 :
          parts[0] === '+' ? minutes : -minutes;
    }

    // Return a moment from input, that is local/utc/zone equivalent to model.
    function cloneWithOffset(input, model) {
        var res, diff;
        if (model._isUTC) {
            res = model.clone();
            diff = (isMoment(input) || isDate(input) ? input.valueOf() : createLocal(input).valueOf()) - res.valueOf();
            // Use low-level api, because this fn is low-level api.
            res._d.setTime(res._d.valueOf() + diff);
            hooks.updateOffset(res, false);
            return res;
        } else {
            return createLocal(input).local();
        }
    }

    function getDateOffset (m) {
        // On Firefox.24 Date#getTimezoneOffset returns a floating point.
        // https://github.com/moment/moment/pull/1871
        return -Math.round(m._d.getTimezoneOffset() / 15) * 15;
    }

    // HOOKS

    // This function will be called whenever a moment is mutated.
    // It is intended to keep the offset in sync with the timezone.
    hooks.updateOffset = function () {};

    // MOMENTS

    // keepLocalTime = true means only change the timezone, without
    // affecting the local hour. So 5:31:26 +0300 --[utcOffset(2, true)]-->
    // 5:31:26 +0200 It is possible that 5:31:26 doesn't exist with offset
    // +0200, so we adjust the time as needed, to be valid.
    //
    // Keeping the time actually adds/subtracts (one hour)
    // from the actual represented time. That is why we call updateOffset
    // a second time. In case it wants us to change the offset again
    // _changeInProgress == true case, then we have to adjust, because
    // there is no such time in the given timezone.
    function getSetOffset (input, keepLocalTime, keepMinutes) {
        var offset = this._offset || 0,
            localAdjust;
        if (!this.isValid()) {
            return input != null ? this : NaN;
        }
        if (input != null) {
            if (typeof input === 'string') {
                input = offsetFromString(matchShortOffset, input);
                if (input === null) {
                    return this;
                }
            } else if (Math.abs(input) < 16 && !keepMinutes) {
                input = input * 60;
            }
            if (!this._isUTC && keepLocalTime) {
                localAdjust = getDateOffset(this);
            }
            this._offset = input;
            this._isUTC = true;
            if (localAdjust != null) {
                this.add(localAdjust, 'm');
            }
            if (offset !== input) {
                if (!keepLocalTime || this._changeInProgress) {
                    addSubtract(this, createDuration(input - offset, 'm'), 1, false);
                } else if (!this._changeInProgress) {
                    this._changeInProgress = true;
                    hooks.updateOffset(this, true);
                    this._changeInProgress = null;
                }
            }
            return this;
        } else {
            return this._isUTC ? offset : getDateOffset(this);
        }
    }

    function getSetZone (input, keepLocalTime) {
        if (input != null) {
            if (typeof input !== 'string') {
                input = -input;
            }

            this.utcOffset(input, keepLocalTime);

            return this;
        } else {
            return -this.utcOffset();
        }
    }

    function setOffsetToUTC (keepLocalTime) {
        return this.utcOffset(0, keepLocalTime);
    }

    function setOffsetToLocal (keepLocalTime) {
        if (this._isUTC) {
            this.utcOffset(0, keepLocalTime);
            this._isUTC = false;

            if (keepLocalTime) {
                this.subtract(getDateOffset(this), 'm');
            }
        }
        return this;
    }

    function setOffsetToParsedOffset () {
        if (this._tzm != null) {
            this.utcOffset(this._tzm, false, true);
        } else if (typeof this._i === 'string') {
            var tZone = offsetFromString(matchOffset, this._i);
            if (tZone != null) {
                this.utcOffset(tZone);
            }
            else {
                this.utcOffset(0, true);
            }
        }
        return this;
    }

    function hasAlignedHourOffset (input) {
        if (!this.isValid()) {
            return false;
        }
        input = input ? createLocal(input).utcOffset() : 0;

        return (this.utcOffset() - input) % 60 === 0;
    }

    function isDaylightSavingTime () {
        return (
            this.utcOffset() > this.clone().month(0).utcOffset() ||
            this.utcOffset() > this.clone().month(5).utcOffset()
        );
    }

    function isDaylightSavingTimeShifted () {
        if (!isUndefined(this._isDSTShifted)) {
            return this._isDSTShifted;
        }

        var c = {};

        copyConfig(c, this);
        c = prepareConfig(c);

        if (c._a) {
            var other = c._isUTC ? createUTC(c._a) : createLocal(c._a);
            this._isDSTShifted = this.isValid() &&
                compareArrays(c._a, other.toArray()) > 0;
        } else {
            this._isDSTShifted = false;
        }

        return this._isDSTShifted;
    }

    function isLocal () {
        return this.isValid() ? !this._isUTC : false;
    }

    function isUtcOffset () {
        return this.isValid() ? this._isUTC : false;
    }

    function isUtc () {
        return this.isValid() ? this._isUTC && this._offset === 0 : false;
    }

    // ASP.NET json date format regex
    var aspNetRegex = /^(\-|\+)?(?:(\d*)[. ])?(\d+)\:(\d+)(?:\:(\d+)(\.\d*)?)?$/;

    // from http://docs.closure-library.googlecode.com/git/closure_goog_date_date.js.source.html
    // somewhat more in line with 4.4.3.2 2004 spec, but allows decimal anywhere
    // and further modified to allow for strings containing both week and day
    var isoRegex = /^(-|\+)?P(?:([-+]?[0-9,.]*)Y)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)W)?(?:([-+]?[0-9,.]*)D)?(?:T(?:([-+]?[0-9,.]*)H)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)S)?)?$/;

    function createDuration (input, key) {
        var duration = input,
            // matching against regexp is expensive, do it on demand
            match = null,
            sign,
            ret,
            diffRes;

        if (isDuration(input)) {
            duration = {
                ms : input._milliseconds,
                d  : input._days,
                M  : input._months
            };
        } else if (isNumber(input)) {
            duration = {};
            if (key) {
                duration[key] = input;
            } else {
                duration.milliseconds = input;
            }
        } else if (!!(match = aspNetRegex.exec(input))) {
            sign = (match[1] === '-') ? -1 : 1;
            duration = {
                y  : 0,
                d  : toInt(match[DATE])                         * sign,
                h  : toInt(match[HOUR])                         * sign,
                m  : toInt(match[MINUTE])                       * sign,
                s  : toInt(match[SECOND])                       * sign,
                ms : toInt(absRound(match[MILLISECOND] * 1000)) * sign // the millisecond decimal point is included in the match
            };
        } else if (!!(match = isoRegex.exec(input))) {
            sign = (match[1] === '-') ? -1 : 1;
            duration = {
                y : parseIso(match[2], sign),
                M : parseIso(match[3], sign),
                w : parseIso(match[4], sign),
                d : parseIso(match[5], sign),
                h : parseIso(match[6], sign),
                m : parseIso(match[7], sign),
                s : parseIso(match[8], sign)
            };
        } else if (duration == null) {// checks for null or undefined
            duration = {};
        } else if (typeof duration === 'object' && ('from' in duration || 'to' in duration)) {
            diffRes = momentsDifference(createLocal(duration.from), createLocal(duration.to));

            duration = {};
            duration.ms = diffRes.milliseconds;
            duration.M = diffRes.months;
        }

        ret = new Duration(duration);

        if (isDuration(input) && hasOwnProp(input, '_locale')) {
            ret._locale = input._locale;
        }

        return ret;
    }

    createDuration.fn = Duration.prototype;
    createDuration.invalid = createInvalid$1;

    function parseIso (inp, sign) {
        // We'd normally use ~~inp for this, but unfortunately it also
        // converts floats to ints.
        // inp may be undefined, so careful calling replace on it.
        var res = inp && parseFloat(inp.replace(',', '.'));
        // apply sign while we're at it
        return (isNaN(res) ? 0 : res) * sign;
    }

    function positiveMomentsDifference(base, other) {
        var res = {};

        res.months = other.month() - base.month() +
            (other.year() - base.year()) * 12;
        if (base.clone().add(res.months, 'M').isAfter(other)) {
            --res.months;
        }

        res.milliseconds = +other - +(base.clone().add(res.months, 'M'));

        return res;
    }

    function momentsDifference(base, other) {
        var res;
        if (!(base.isValid() && other.isValid())) {
            return {milliseconds: 0, months: 0};
        }

        other = cloneWithOffset(other, base);
        if (base.isBefore(other)) {
            res = positiveMomentsDifference(base, other);
        } else {
            res = positiveMomentsDifference(other, base);
            res.milliseconds = -res.milliseconds;
            res.months = -res.months;
        }

        return res;
    }

    // TODO: remove 'name' arg after deprecation is removed
    function createAdder(direction, name) {
        return function (val, period) {
            var dur, tmp;
            //invert the arguments, but complain about it
            if (period !== null && !isNaN(+period)) {
                deprecateSimple(name, 'moment().' + name  + '(period, number) is deprecated. Please use moment().' + name + '(number, period). ' +
                'See http://momentjs.com/guides/#/warnings/add-inverted-param/ for more info.');
                tmp = val; val = period; period = tmp;
            }

            val = typeof val === 'string' ? +val : val;
            dur = createDuration(val, period);
            addSubtract(this, dur, direction);
            return this;
        };
    }

    function addSubtract (mom, duration, isAdding, updateOffset) {
        var milliseconds = duration._milliseconds,
            days = absRound(duration._days),
            months = absRound(duration._months);

        if (!mom.isValid()) {
            // No op
            return;
        }

        updateOffset = updateOffset == null ? true : updateOffset;

        if (months) {
            setMonth(mom, get(mom, 'Month') + months * isAdding);
        }
        if (days) {
            set$1(mom, 'Date', get(mom, 'Date') + days * isAdding);
        }
        if (milliseconds) {
            mom._d.setTime(mom._d.valueOf() + milliseconds * isAdding);
        }
        if (updateOffset) {
            hooks.updateOffset(mom, days || months);
        }
    }

    var add      = createAdder(1, 'add');
    var subtract = createAdder(-1, 'subtract');

    function getCalendarFormat(myMoment, now) {
        var diff = myMoment.diff(now, 'days', true);
        return diff < -6 ? 'sameElse' :
                diff < -1 ? 'lastWeek' :
                diff < 0 ? 'lastDay' :
                diff < 1 ? 'sameDay' :
                diff < 2 ? 'nextDay' :
                diff < 7 ? 'nextWeek' : 'sameElse';
    }

    function calendar$1 (time, formats) {
        // We want to compare the start of today, vs this.
        // Getting start-of-today depends on whether we're local/utc/offset or not.
        var now = time || createLocal(),
            sod = cloneWithOffset(now, this).startOf('day'),
            format = hooks.calendarFormat(this, sod) || 'sameElse';

        var output = formats && (isFunction(formats[format]) ? formats[format].call(this, now) : formats[format]);

        return this.format(output || this.localeData().calendar(format, this, createLocal(now)));
    }

    function clone () {
        return new Moment(this);
    }

    function isAfter (input, units) {
        var localInput = isMoment(input) ? input : createLocal(input);
        if (!(this.isValid() && localInput.isValid())) {
            return false;
        }
        units = normalizeUnits(units) || 'millisecond';
        if (units === 'millisecond') {
            return this.valueOf() > localInput.valueOf();
        } else {
            return localInput.valueOf() < this.clone().startOf(units).valueOf();
        }
    }

    function isBefore (input, units) {
        var localInput = isMoment(input) ? input : createLocal(input);
        if (!(this.isValid() && localInput.isValid())) {
            return false;
        }
        units = normalizeUnits(units) || 'millisecond';
        if (units === 'millisecond') {
            return this.valueOf() < localInput.valueOf();
        } else {
            return this.clone().endOf(units).valueOf() < localInput.valueOf();
        }
    }

    function isBetween (from, to, units, inclusivity) {
        var localFrom = isMoment(from) ? from : createLocal(from),
            localTo = isMoment(to) ? to : createLocal(to);
        if (!(this.isValid() && localFrom.isValid() && localTo.isValid())) {
            return false;
        }
        inclusivity = inclusivity || '()';
        return (inclusivity[0] === '(' ? this.isAfter(localFrom, units) : !this.isBefore(localFrom, units)) &&
            (inclusivity[1] === ')' ? this.isBefore(localTo, units) : !this.isAfter(localTo, units));
    }

    function isSame (input, units) {
        var localInput = isMoment(input) ? input : createLocal(input),
            inputMs;
        if (!(this.isValid() && localInput.isValid())) {
            return false;
        }
        units = normalizeUnits(units) || 'millisecond';
        if (units === 'millisecond') {
            return this.valueOf() === localInput.valueOf();
        } else {
            inputMs = localInput.valueOf();
            return this.clone().startOf(units).valueOf() <= inputMs && inputMs <= this.clone().endOf(units).valueOf();
        }
    }

    function isSameOrAfter (input, units) {
        return this.isSame(input, units) || this.isAfter(input, units);
    }

    function isSameOrBefore (input, units) {
        return this.isSame(input, units) || this.isBefore(input, units);
    }

    function diff (input, units, asFloat) {
        var that,
            zoneDelta,
            output;

        if (!this.isValid()) {
            return NaN;
        }

        that = cloneWithOffset(input, this);

        if (!that.isValid()) {
            return NaN;
        }

        zoneDelta = (that.utcOffset() - this.utcOffset()) * 6e4;

        units = normalizeUnits(units);

        switch (units) {
            case 'year': output = monthDiff(this, that) / 12; break;
            case 'month': output = monthDiff(this, that); break;
            case 'quarter': output = monthDiff(this, that) / 3; break;
            case 'second': output = (this - that) / 1e3; break; // 1000
            case 'minute': output = (this - that) / 6e4; break; // 1000 * 60
            case 'hour': output = (this - that) / 36e5; break; // 1000 * 60 * 60
            case 'day': output = (this - that - zoneDelta) / 864e5; break; // 1000 * 60 * 60 * 24, negate dst
            case 'week': output = (this - that - zoneDelta) / 6048e5; break; // 1000 * 60 * 60 * 24 * 7, negate dst
            default: output = this - that;
        }

        return asFloat ? output : absFloor(output);
    }

    function monthDiff (a, b) {
        // difference in months
        var wholeMonthDiff = ((b.year() - a.year()) * 12) + (b.month() - a.month()),
            // b is in (anchor - 1 month, anchor + 1 month)
            anchor = a.clone().add(wholeMonthDiff, 'months'),
            anchor2, adjust;

        if (b - anchor < 0) {
            anchor2 = a.clone().add(wholeMonthDiff - 1, 'months');
            // linear across the month
            adjust = (b - anchor) / (anchor - anchor2);
        } else {
            anchor2 = a.clone().add(wholeMonthDiff + 1, 'months');
            // linear across the month
            adjust = (b - anchor) / (anchor2 - anchor);
        }

        //check for negative zero, return zero if negative zero
        return -(wholeMonthDiff + adjust) || 0;
    }

    hooks.defaultFormat = 'YYYY-MM-DDTHH:mm:ssZ';
    hooks.defaultFormatUtc = 'YYYY-MM-DDTHH:mm:ss[Z]';

    function toString () {
        return this.clone().locale('en').format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ');
    }

    function toISOString(keepOffset) {
        if (!this.isValid()) {
            return null;
        }
        var utc = keepOffset !== true;
        var m = utc ? this.clone().utc() : this;
        if (m.year() < 0 || m.year() > 9999) {
            return formatMoment(m, utc ? 'YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]' : 'YYYYYY-MM-DD[T]HH:mm:ss.SSSZ');
        }
        if (isFunction(Date.prototype.toISOString)) {
            // native implementation is ~50x faster, use it when we can
            if (utc) {
                return this.toDate().toISOString();
            } else {
                return new Date(this.valueOf() + this.utcOffset() * 60 * 1000).toISOString().replace('Z', formatMoment(m, 'Z'));
            }
        }
        return formatMoment(m, utc ? 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]' : 'YYYY-MM-DD[T]HH:mm:ss.SSSZ');
    }

    /**
     * Return a human readable representation of a moment that can
     * also be evaluated to get a new moment which is the same
     *
     * @link https://nodejs.org/dist/latest/docs/api/util.html#util_custom_inspect_function_on_objects
     */
    function inspect () {
        if (!this.isValid()) {
            return 'moment.invalid(/* ' + this._i + ' */)';
        }
        var func = 'moment';
        var zone = '';
        if (!this.isLocal()) {
            func = this.utcOffset() === 0 ? 'moment.utc' : 'moment.parseZone';
            zone = 'Z';
        }
        var prefix = '[' + func + '("]';
        var year = (0 <= this.year() && this.year() <= 9999) ? 'YYYY' : 'YYYYYY';
        var datetime = '-MM-DD[T]HH:mm:ss.SSS';
        var suffix = zone + '[")]';

        return this.format(prefix + year + datetime + suffix);
    }

    function format (inputString) {
        if (!inputString) {
            inputString = this.isUtc() ? hooks.defaultFormatUtc : hooks.defaultFormat;
        }
        var output = formatMoment(this, inputString);
        return this.localeData().postformat(output);
    }

    function from (time, withoutSuffix) {
        if (this.isValid() &&
                ((isMoment(time) && time.isValid()) ||
                 createLocal(time).isValid())) {
            return createDuration({to: this, from: time}).locale(this.locale()).humanize(!withoutSuffix);
        } else {
            return this.localeData().invalidDate();
        }
    }

    function fromNow (withoutSuffix) {
        return this.from(createLocal(), withoutSuffix);
    }

    function to (time, withoutSuffix) {
        if (this.isValid() &&
                ((isMoment(time) && time.isValid()) ||
                 createLocal(time).isValid())) {
            return createDuration({from: this, to: time}).locale(this.locale()).humanize(!withoutSuffix);
        } else {
            return this.localeData().invalidDate();
        }
    }

    function toNow (withoutSuffix) {
        return this.to(createLocal(), withoutSuffix);
    }

    // If passed a locale key, it will set the locale for this
    // instance.  Otherwise, it will return the locale configuration
    // variables for this instance.
    function locale (key) {
        var newLocaleData;

        if (key === undefined) {
            return this._locale._abbr;
        } else {
            newLocaleData = getLocale(key);
            if (newLocaleData != null) {
                this._locale = newLocaleData;
            }
            return this;
        }
    }

    var lang = deprecate(
        'moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.',
        function (key) {
            if (key === undefined) {
                return this.localeData();
            } else {
                return this.locale(key);
            }
        }
    );

    function localeData () {
        return this._locale;
    }

    var MS_PER_SECOND = 1000;
    var MS_PER_MINUTE = 60 * MS_PER_SECOND;
    var MS_PER_HOUR = 60 * MS_PER_MINUTE;
    var MS_PER_400_YEARS = (365 * 400 + 97) * 24 * MS_PER_HOUR;

    // actual modulo - handles negative numbers (for dates before 1970):
    function mod$1(dividend, divisor) {
        return (dividend % divisor + divisor) % divisor;
    }

    function localStartOfDate(y, m, d) {
        // the date constructor remaps years 0-99 to 1900-1999
        if (y < 100 && y >= 0) {
            // preserve leap years using a full 400 year cycle, then reset
            return new Date(y + 400, m, d) - MS_PER_400_YEARS;
        } else {
            return new Date(y, m, d).valueOf();
        }
    }

    function utcStartOfDate(y, m, d) {
        // Date.UTC remaps years 0-99 to 1900-1999
        if (y < 100 && y >= 0) {
            // preserve leap years using a full 400 year cycle, then reset
            return Date.UTC(y + 400, m, d) - MS_PER_400_YEARS;
        } else {
            return Date.UTC(y, m, d);
        }
    }

    function startOf (units) {
        var time;
        units = normalizeUnits(units);
        if (units === undefined || units === 'millisecond' || !this.isValid()) {
            return this;
        }

        var startOfDate = this._isUTC ? utcStartOfDate : localStartOfDate;

        switch (units) {
            case 'year':
                time = startOfDate(this.year(), 0, 1);
                break;
            case 'quarter':
                time = startOfDate(this.year(), this.month() - this.month() % 3, 1);
                break;
            case 'month':
                time = startOfDate(this.year(), this.month(), 1);
                break;
            case 'week':
                time = startOfDate(this.year(), this.month(), this.date() - this.weekday());
                break;
            case 'isoWeek':
                time = startOfDate(this.year(), this.month(), this.date() - (this.isoWeekday() - 1));
                break;
            case 'day':
            case 'date':
                time = startOfDate(this.year(), this.month(), this.date());
                break;
            case 'hour':
                time = this._d.valueOf();
                time -= mod$1(time + (this._isUTC ? 0 : this.utcOffset() * MS_PER_MINUTE), MS_PER_HOUR);
                break;
            case 'minute':
                time = this._d.valueOf();
                time -= mod$1(time, MS_PER_MINUTE);
                break;
            case 'second':
                time = this._d.valueOf();
                time -= mod$1(time, MS_PER_SECOND);
                break;
        }

        this._d.setTime(time);
        hooks.updateOffset(this, true);
        return this;
    }

    function endOf (units) {
        var time;
        units = normalizeUnits(units);
        if (units === undefined || units === 'millisecond' || !this.isValid()) {
            return this;
        }

        var startOfDate = this._isUTC ? utcStartOfDate : localStartOfDate;

        switch (units) {
            case 'year':
                time = startOfDate(this.year() + 1, 0, 1) - 1;
                break;
            case 'quarter':
                time = startOfDate(this.year(), this.month() - this.month() % 3 + 3, 1) - 1;
                break;
            case 'month':
                time = startOfDate(this.year(), this.month() + 1, 1) - 1;
                break;
            case 'week':
                time = startOfDate(this.year(), this.month(), this.date() - this.weekday() + 7) - 1;
                break;
            case 'isoWeek':
                time = startOfDate(this.year(), this.month(), this.date() - (this.isoWeekday() - 1) + 7) - 1;
                break;
            case 'day':
            case 'date':
                time = startOfDate(this.year(), this.month(), this.date() + 1) - 1;
                break;
            case 'hour':
                time = this._d.valueOf();
                time += MS_PER_HOUR - mod$1(time + (this._isUTC ? 0 : this.utcOffset() * MS_PER_MINUTE), MS_PER_HOUR) - 1;
                break;
            case 'minute':
                time = this._d.valueOf();
                time += MS_PER_MINUTE - mod$1(time, MS_PER_MINUTE) - 1;
                break;
            case 'second':
                time = this._d.valueOf();
                time += MS_PER_SECOND - mod$1(time, MS_PER_SECOND) - 1;
                break;
        }

        this._d.setTime(time);
        hooks.updateOffset(this, true);
        return this;
    }

    function valueOf () {
        return this._d.valueOf() - ((this._offset || 0) * 60000);
    }

    function unix () {
        return Math.floor(this.valueOf() / 1000);
    }

    function toDate () {
        return new Date(this.valueOf());
    }

    function toArray () {
        var m = this;
        return [m.year(), m.month(), m.date(), m.hour(), m.minute(), m.second(), m.millisecond()];
    }

    function toObject () {
        var m = this;
        return {
            years: m.year(),
            months: m.month(),
            date: m.date(),
            hours: m.hours(),
            minutes: m.minutes(),
            seconds: m.seconds(),
            milliseconds: m.milliseconds()
        };
    }

    function toJSON () {
        // new Date(NaN).toJSON() === null
        return this.isValid() ? this.toISOString() : null;
    }

    function isValid$2 () {
        return isValid(this);
    }

    function parsingFlags () {
        return extend({}, getParsingFlags(this));
    }

    function invalidAt () {
        return getParsingFlags(this).overflow;
    }

    function creationData() {
        return {
            input: this._i,
            format: this._f,
            locale: this._locale,
            isUTC: this._isUTC,
            strict: this._strict
        };
    }

    // FORMATTING

    addFormatToken(0, ['gg', 2], 0, function () {
        return this.weekYear() % 100;
    });

    addFormatToken(0, ['GG', 2], 0, function () {
        return this.isoWeekYear() % 100;
    });

    function addWeekYearFormatToken (token, getter) {
        addFormatToken(0, [token, token.length], 0, getter);
    }

    addWeekYearFormatToken('gggg',     'weekYear');
    addWeekYearFormatToken('ggggg',    'weekYear');
    addWeekYearFormatToken('GGGG',  'isoWeekYear');
    addWeekYearFormatToken('GGGGG', 'isoWeekYear');

    // ALIASES

    addUnitAlias('weekYear', 'gg');
    addUnitAlias('isoWeekYear', 'GG');

    // PRIORITY

    addUnitPriority('weekYear', 1);
    addUnitPriority('isoWeekYear', 1);


    // PARSING

    addRegexToken('G',      matchSigned);
    addRegexToken('g',      matchSigned);
    addRegexToken('GG',     match1to2, match2);
    addRegexToken('gg',     match1to2, match2);
    addRegexToken('GGGG',   match1to4, match4);
    addRegexToken('gggg',   match1to4, match4);
    addRegexToken('GGGGG',  match1to6, match6);
    addRegexToken('ggggg',  match1to6, match6);

    addWeekParseToken(['gggg', 'ggggg', 'GGGG', 'GGGGG'], function (input, week, config, token) {
        week[token.substr(0, 2)] = toInt(input);
    });

    addWeekParseToken(['gg', 'GG'], function (input, week, config, token) {
        week[token] = hooks.parseTwoDigitYear(input);
    });

    // MOMENTS

    function getSetWeekYear (input) {
        return getSetWeekYearHelper.call(this,
                input,
                this.week(),
                this.weekday(),
                this.localeData()._week.dow,
                this.localeData()._week.doy);
    }

    function getSetISOWeekYear (input) {
        return getSetWeekYearHelper.call(this,
                input, this.isoWeek(), this.isoWeekday(), 1, 4);
    }

    function getISOWeeksInYear () {
        return weeksInYear(this.year(), 1, 4);
    }

    function getWeeksInYear () {
        var weekInfo = this.localeData()._week;
        return weeksInYear(this.year(), weekInfo.dow, weekInfo.doy);
    }

    function getSetWeekYearHelper(input, week, weekday, dow, doy) {
        var weeksTarget;
        if (input == null) {
            return weekOfYear(this, dow, doy).year;
        } else {
            weeksTarget = weeksInYear(input, dow, doy);
            if (week > weeksTarget) {
                week = weeksTarget;
            }
            return setWeekAll.call(this, input, week, weekday, dow, doy);
        }
    }

    function setWeekAll(weekYear, week, weekday, dow, doy) {
        var dayOfYearData = dayOfYearFromWeeks(weekYear, week, weekday, dow, doy),
            date = createUTCDate(dayOfYearData.year, 0, dayOfYearData.dayOfYear);

        this.year(date.getUTCFullYear());
        this.month(date.getUTCMonth());
        this.date(date.getUTCDate());
        return this;
    }

    // FORMATTING

    addFormatToken('Q', 0, 'Qo', 'quarter');

    // ALIASES

    addUnitAlias('quarter', 'Q');

    // PRIORITY

    addUnitPriority('quarter', 7);

    // PARSING

    addRegexToken('Q', match1);
    addParseToken('Q', function (input, array) {
        array[MONTH] = (toInt(input) - 1) * 3;
    });

    // MOMENTS

    function getSetQuarter (input) {
        return input == null ? Math.ceil((this.month() + 1) / 3) : this.month((input - 1) * 3 + this.month() % 3);
    }

    // FORMATTING

    addFormatToken('D', ['DD', 2], 'Do', 'date');

    // ALIASES

    addUnitAlias('date', 'D');

    // PRIORITY
    addUnitPriority('date', 9);

    // PARSING

    addRegexToken('D',  match1to2);
    addRegexToken('DD', match1to2, match2);
    addRegexToken('Do', function (isStrict, locale) {
        // TODO: Remove "ordinalParse" fallback in next major release.
        return isStrict ?
          (locale._dayOfMonthOrdinalParse || locale._ordinalParse) :
          locale._dayOfMonthOrdinalParseLenient;
    });

    addParseToken(['D', 'DD'], DATE);
    addParseToken('Do', function (input, array) {
        array[DATE] = toInt(input.match(match1to2)[0]);
    });

    // MOMENTS

    var getSetDayOfMonth = makeGetSet('Date', true);

    // FORMATTING

    addFormatToken('DDD', ['DDDD', 3], 'DDDo', 'dayOfYear');

    // ALIASES

    addUnitAlias('dayOfYear', 'DDD');

    // PRIORITY
    addUnitPriority('dayOfYear', 4);

    // PARSING

    addRegexToken('DDD',  match1to3);
    addRegexToken('DDDD', match3);
    addParseToken(['DDD', 'DDDD'], function (input, array, config) {
        config._dayOfYear = toInt(input);
    });

    // HELPERS

    // MOMENTS

    function getSetDayOfYear (input) {
        var dayOfYear = Math.round((this.clone().startOf('day') - this.clone().startOf('year')) / 864e5) + 1;
        return input == null ? dayOfYear : this.add((input - dayOfYear), 'd');
    }

    // FORMATTING

    addFormatToken('m', ['mm', 2], 0, 'minute');

    // ALIASES

    addUnitAlias('minute', 'm');

    // PRIORITY

    addUnitPriority('minute', 14);

    // PARSING

    addRegexToken('m',  match1to2);
    addRegexToken('mm', match1to2, match2);
    addParseToken(['m', 'mm'], MINUTE);

    // MOMENTS

    var getSetMinute = makeGetSet('Minutes', false);

    // FORMATTING

    addFormatToken('s', ['ss', 2], 0, 'second');

    // ALIASES

    addUnitAlias('second', 's');

    // PRIORITY

    addUnitPriority('second', 15);

    // PARSING

    addRegexToken('s',  match1to2);
    addRegexToken('ss', match1to2, match2);
    addParseToken(['s', 'ss'], SECOND);

    // MOMENTS

    var getSetSecond = makeGetSet('Seconds', false);

    // FORMATTING

    addFormatToken('S', 0, 0, function () {
        return ~~(this.millisecond() / 100);
    });

    addFormatToken(0, ['SS', 2], 0, function () {
        return ~~(this.millisecond() / 10);
    });

    addFormatToken(0, ['SSS', 3], 0, 'millisecond');
    addFormatToken(0, ['SSSS', 4], 0, function () {
        return this.millisecond() * 10;
    });
    addFormatToken(0, ['SSSSS', 5], 0, function () {
        return this.millisecond() * 100;
    });
    addFormatToken(0, ['SSSSSS', 6], 0, function () {
        return this.millisecond() * 1000;
    });
    addFormatToken(0, ['SSSSSSS', 7], 0, function () {
        return this.millisecond() * 10000;
    });
    addFormatToken(0, ['SSSSSSSS', 8], 0, function () {
        return this.millisecond() * 100000;
    });
    addFormatToken(0, ['SSSSSSSSS', 9], 0, function () {
        return this.millisecond() * 1000000;
    });


    // ALIASES

    addUnitAlias('millisecond', 'ms');

    // PRIORITY

    addUnitPriority('millisecond', 16);

    // PARSING

    addRegexToken('S',    match1to3, match1);
    addRegexToken('SS',   match1to3, match2);
    addRegexToken('SSS',  match1to3, match3);

    var token;
    for (token = 'SSSS'; token.length <= 9; token += 'S') {
        addRegexToken(token, matchUnsigned);
    }

    function parseMs(input, array) {
        array[MILLISECOND] = toInt(('0.' + input) * 1000);
    }

    for (token = 'S'; token.length <= 9; token += 'S') {
        addParseToken(token, parseMs);
    }
    // MOMENTS

    var getSetMillisecond = makeGetSet('Milliseconds', false);

    // FORMATTING

    addFormatToken('z',  0, 0, 'zoneAbbr');
    addFormatToken('zz', 0, 0, 'zoneName');

    // MOMENTS

    function getZoneAbbr () {
        return this._isUTC ? 'UTC' : '';
    }

    function getZoneName () {
        return this._isUTC ? 'Coordinated Universal Time' : '';
    }

    var proto = Moment.prototype;

    proto.add               = add;
    proto.calendar          = calendar$1;
    proto.clone             = clone;
    proto.diff              = diff;
    proto.endOf             = endOf;
    proto.format            = format;
    proto.from              = from;
    proto.fromNow           = fromNow;
    proto.to                = to;
    proto.toNow             = toNow;
    proto.get               = stringGet;
    proto.invalidAt         = invalidAt;
    proto.isAfter           = isAfter;
    proto.isBefore          = isBefore;
    proto.isBetween         = isBetween;
    proto.isSame            = isSame;
    proto.isSameOrAfter     = isSameOrAfter;
    proto.isSameOrBefore    = isSameOrBefore;
    proto.isValid           = isValid$2;
    proto.lang              = lang;
    proto.locale            = locale;
    proto.localeData        = localeData;
    proto.max               = prototypeMax;
    proto.min               = prototypeMin;
    proto.parsingFlags      = parsingFlags;
    proto.set               = stringSet;
    proto.startOf           = startOf;
    proto.subtract          = subtract;
    proto.toArray           = toArray;
    proto.toObject          = toObject;
    proto.toDate            = toDate;
    proto.toISOString       = toISOString;
    proto.inspect           = inspect;
    proto.toJSON            = toJSON;
    proto.toString          = toString;
    proto.unix              = unix;
    proto.valueOf           = valueOf;
    proto.creationData      = creationData;
    proto.year       = getSetYear;
    proto.isLeapYear = getIsLeapYear;
    proto.weekYear    = getSetWeekYear;
    proto.isoWeekYear = getSetISOWeekYear;
    proto.quarter = proto.quarters = getSetQuarter;
    proto.month       = getSetMonth;
    proto.daysInMonth = getDaysInMonth;
    proto.week           = proto.weeks        = getSetWeek;
    proto.isoWeek        = proto.isoWeeks     = getSetISOWeek;
    proto.weeksInYear    = getWeeksInYear;
    proto.isoWeeksInYear = getISOWeeksInYear;
    proto.date       = getSetDayOfMonth;
    proto.day        = proto.days             = getSetDayOfWeek;
    proto.weekday    = getSetLocaleDayOfWeek;
    proto.isoWeekday = getSetISODayOfWeek;
    proto.dayOfYear  = getSetDayOfYear;
    proto.hour = proto.hours = getSetHour;
    proto.minute = proto.minutes = getSetMinute;
    proto.second = proto.seconds = getSetSecond;
    proto.millisecond = proto.milliseconds = getSetMillisecond;
    proto.utcOffset            = getSetOffset;
    proto.utc                  = setOffsetToUTC;
    proto.local                = setOffsetToLocal;
    proto.parseZone            = setOffsetToParsedOffset;
    proto.hasAlignedHourOffset = hasAlignedHourOffset;
    proto.isDST                = isDaylightSavingTime;
    proto.isLocal              = isLocal;
    proto.isUtcOffset          = isUtcOffset;
    proto.isUtc                = isUtc;
    proto.isUTC                = isUtc;
    proto.zoneAbbr = getZoneAbbr;
    proto.zoneName = getZoneName;
    proto.dates  = deprecate('dates accessor is deprecated. Use date instead.', getSetDayOfMonth);
    proto.months = deprecate('months accessor is deprecated. Use month instead', getSetMonth);
    proto.years  = deprecate('years accessor is deprecated. Use year instead', getSetYear);
    proto.zone   = deprecate('moment().zone is deprecated, use moment().utcOffset instead. http://momentjs.com/guides/#/warnings/zone/', getSetZone);
    proto.isDSTShifted = deprecate('isDSTShifted is deprecated. See http://momentjs.com/guides/#/warnings/dst-shifted/ for more information', isDaylightSavingTimeShifted);

    function createUnix (input) {
        return createLocal(input * 1000);
    }

    function createInZone () {
        return createLocal.apply(null, arguments).parseZone();
    }

    function preParsePostFormat (string) {
        return string;
    }

    var proto$1 = Locale.prototype;

    proto$1.calendar        = calendar;
    proto$1.longDateFormat  = longDateFormat;
    proto$1.invalidDate     = invalidDate;
    proto$1.ordinal         = ordinal;
    proto$1.preparse        = preParsePostFormat;
    proto$1.postformat      = preParsePostFormat;
    proto$1.relativeTime    = relativeTime;
    proto$1.pastFuture      = pastFuture;
    proto$1.set             = set;

    proto$1.months            =        localeMonths;
    proto$1.monthsShort       =        localeMonthsShort;
    proto$1.monthsParse       =        localeMonthsParse;
    proto$1.monthsRegex       = monthsRegex;
    proto$1.monthsShortRegex  = monthsShortRegex;
    proto$1.week = localeWeek;
    proto$1.firstDayOfYear = localeFirstDayOfYear;
    proto$1.firstDayOfWeek = localeFirstDayOfWeek;

    proto$1.weekdays       =        localeWeekdays;
    proto$1.weekdaysMin    =        localeWeekdaysMin;
    proto$1.weekdaysShort  =        localeWeekdaysShort;
    proto$1.weekdaysParse  =        localeWeekdaysParse;

    proto$1.weekdaysRegex       =        weekdaysRegex;
    proto$1.weekdaysShortRegex  =        weekdaysShortRegex;
    proto$1.weekdaysMinRegex    =        weekdaysMinRegex;

    proto$1.isPM = localeIsPM;
    proto$1.meridiem = localeMeridiem;

    function get$1 (format, index, field, setter) {
        var locale = getLocale();
        var utc = createUTC().set(setter, index);
        return locale[field](utc, format);
    }

    function listMonthsImpl (format, index, field) {
        if (isNumber(format)) {
            index = format;
            format = undefined;
        }

        format = format || '';

        if (index != null) {
            return get$1(format, index, field, 'month');
        }

        var i;
        var out = [];
        for (i = 0; i < 12; i++) {
            out[i] = get$1(format, i, field, 'month');
        }
        return out;
    }

    // ()
    // (5)
    // (fmt, 5)
    // (fmt)
    // (true)
    // (true, 5)
    // (true, fmt, 5)
    // (true, fmt)
    function listWeekdaysImpl (localeSorted, format, index, field) {
        if (typeof localeSorted === 'boolean') {
            if (isNumber(format)) {
                index = format;
                format = undefined;
            }

            format = format || '';
        } else {
            format = localeSorted;
            index = format;
            localeSorted = false;

            if (isNumber(format)) {
                index = format;
                format = undefined;
            }

            format = format || '';
        }

        var locale = getLocale(),
            shift = localeSorted ? locale._week.dow : 0;

        if (index != null) {
            return get$1(format, (index + shift) % 7, field, 'day');
        }

        var i;
        var out = [];
        for (i = 0; i < 7; i++) {
            out[i] = get$1(format, (i + shift) % 7, field, 'day');
        }
        return out;
    }

    function listMonths (format, index) {
        return listMonthsImpl(format, index, 'months');
    }

    function listMonthsShort (format, index) {
        return listMonthsImpl(format, index, 'monthsShort');
    }

    function listWeekdays (localeSorted, format, index) {
        return listWeekdaysImpl(localeSorted, format, index, 'weekdays');
    }

    function listWeekdaysShort (localeSorted, format, index) {
        return listWeekdaysImpl(localeSorted, format, index, 'weekdaysShort');
    }

    function listWeekdaysMin (localeSorted, format, index) {
        return listWeekdaysImpl(localeSorted, format, index, 'weekdaysMin');
    }

    getSetGlobalLocale('en', {
        dayOfMonthOrdinalParse: /\d{1,2}(th|st|nd|rd)/,
        ordinal : function (number) {
            var b = number % 10,
                output = (toInt(number % 100 / 10) === 1) ? 'th' :
                (b === 1) ? 'st' :
                (b === 2) ? 'nd' :
                (b === 3) ? 'rd' : 'th';
            return number + output;
        }
    });

    // Side effect imports

    hooks.lang = deprecate('moment.lang is deprecated. Use moment.locale instead.', getSetGlobalLocale);
    hooks.langData = deprecate('moment.langData is deprecated. Use moment.localeData instead.', getLocale);

    var mathAbs = Math.abs;

    function abs () {
        var data           = this._data;

        this._milliseconds = mathAbs(this._milliseconds);
        this._days         = mathAbs(this._days);
        this._months       = mathAbs(this._months);

        data.milliseconds  = mathAbs(data.milliseconds);
        data.seconds       = mathAbs(data.seconds);
        data.minutes       = mathAbs(data.minutes);
        data.hours         = mathAbs(data.hours);
        data.months        = mathAbs(data.months);
        data.years         = mathAbs(data.years);

        return this;
    }

    function addSubtract$1 (duration, input, value, direction) {
        var other = createDuration(input, value);

        duration._milliseconds += direction * other._milliseconds;
        duration._days         += direction * other._days;
        duration._months       += direction * other._months;

        return duration._bubble();
    }

    // supports only 2.0-style add(1, 's') or add(duration)
    function add$1 (input, value) {
        return addSubtract$1(this, input, value, 1);
    }

    // supports only 2.0-style subtract(1, 's') or subtract(duration)
    function subtract$1 (input, value) {
        return addSubtract$1(this, input, value, -1);
    }

    function absCeil (number) {
        if (number < 0) {
            return Math.floor(number);
        } else {
            return Math.ceil(number);
        }
    }

    function bubble () {
        var milliseconds = this._milliseconds;
        var days         = this._days;
        var months       = this._months;
        var data         = this._data;
        var seconds, minutes, hours, years, monthsFromDays;

        // if we have a mix of positive and negative values, bubble down first
        // check: https://github.com/moment/moment/issues/2166
        if (!((milliseconds >= 0 && days >= 0 && months >= 0) ||
                (milliseconds <= 0 && days <= 0 && months <= 0))) {
            milliseconds += absCeil(monthsToDays(months) + days) * 864e5;
            days = 0;
            months = 0;
        }

        // The following code bubbles up values, see the tests for
        // examples of what that means.
        data.milliseconds = milliseconds % 1000;

        seconds           = absFloor(milliseconds / 1000);
        data.seconds      = seconds % 60;

        minutes           = absFloor(seconds / 60);
        data.minutes      = minutes % 60;

        hours             = absFloor(minutes / 60);
        data.hours        = hours % 24;

        days += absFloor(hours / 24);

        // convert days to months
        monthsFromDays = absFloor(daysToMonths(days));
        months += monthsFromDays;
        days -= absCeil(monthsToDays(monthsFromDays));

        // 12 months -> 1 year
        years = absFloor(months / 12);
        months %= 12;

        data.days   = days;
        data.months = months;
        data.years  = years;

        return this;
    }

    function daysToMonths (days) {
        // 400 years have 146097 days (taking into account leap year rules)
        // 400 years have 12 months === 4800
        return days * 4800 / 146097;
    }

    function monthsToDays (months) {
        // the reverse of daysToMonths
        return months * 146097 / 4800;
    }

    function as (units) {
        if (!this.isValid()) {
            return NaN;
        }
        var days;
        var months;
        var milliseconds = this._milliseconds;

        units = normalizeUnits(units);

        if (units === 'month' || units === 'quarter' || units === 'year') {
            days = this._days + milliseconds / 864e5;
            months = this._months + daysToMonths(days);
            switch (units) {
                case 'month':   return months;
                case 'quarter': return months / 3;
                case 'year':    return months / 12;
            }
        } else {
            // handle milliseconds separately because of floating point math errors (issue #1867)
            days = this._days + Math.round(monthsToDays(this._months));
            switch (units) {
                case 'week'   : return days / 7     + milliseconds / 6048e5;
                case 'day'    : return days         + milliseconds / 864e5;
                case 'hour'   : return days * 24    + milliseconds / 36e5;
                case 'minute' : return days * 1440  + milliseconds / 6e4;
                case 'second' : return days * 86400 + milliseconds / 1000;
                // Math.floor prevents floating point math errors here
                case 'millisecond': return Math.floor(days * 864e5) + milliseconds;
                default: throw new Error('Unknown unit ' + units);
            }
        }
    }

    // TODO: Use this.as('ms')?
    function valueOf$1 () {
        if (!this.isValid()) {
            return NaN;
        }
        return (
            this._milliseconds +
            this._days * 864e5 +
            (this._months % 12) * 2592e6 +
            toInt(this._months / 12) * 31536e6
        );
    }

    function makeAs (alias) {
        return function () {
            return this.as(alias);
        };
    }

    var asMilliseconds = makeAs('ms');
    var asSeconds      = makeAs('s');
    var asMinutes      = makeAs('m');
    var asHours        = makeAs('h');
    var asDays         = makeAs('d');
    var asWeeks        = makeAs('w');
    var asMonths       = makeAs('M');
    var asQuarters     = makeAs('Q');
    var asYears        = makeAs('y');

    function clone$1 () {
        return createDuration(this);
    }

    function get$2 (units) {
        units = normalizeUnits(units);
        return this.isValid() ? this[units + 's']() : NaN;
    }

    function makeGetter(name) {
        return function () {
            return this.isValid() ? this._data[name] : NaN;
        };
    }

    var milliseconds = makeGetter('milliseconds');
    var seconds      = makeGetter('seconds');
    var minutes      = makeGetter('minutes');
    var hours        = makeGetter('hours');
    var days         = makeGetter('days');
    var months       = makeGetter('months');
    var years        = makeGetter('years');

    function weeks () {
        return absFloor(this.days() / 7);
    }

    var round = Math.round;
    var thresholds = {
        ss: 44,         // a few seconds to seconds
        s : 45,         // seconds to minute
        m : 45,         // minutes to hour
        h : 22,         // hours to day
        d : 26,         // days to month
        M : 11          // months to year
    };

    // helper function for moment.fn.from, moment.fn.fromNow, and moment.duration.fn.humanize
    function substituteTimeAgo(string, number, withoutSuffix, isFuture, locale) {
        return locale.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
    }

    function relativeTime$1 (posNegDuration, withoutSuffix, locale) {
        var duration = createDuration(posNegDuration).abs();
        var seconds  = round(duration.as('s'));
        var minutes  = round(duration.as('m'));
        var hours    = round(duration.as('h'));
        var days     = round(duration.as('d'));
        var months   = round(duration.as('M'));
        var years    = round(duration.as('y'));

        var a = seconds <= thresholds.ss && ['s', seconds]  ||
                seconds < thresholds.s   && ['ss', seconds] ||
                minutes <= 1             && ['m']           ||
                minutes < thresholds.m   && ['mm', minutes] ||
                hours   <= 1             && ['h']           ||
                hours   < thresholds.h   && ['hh', hours]   ||
                days    <= 1             && ['d']           ||
                days    < thresholds.d   && ['dd', days]    ||
                months  <= 1             && ['M']           ||
                months  < thresholds.M   && ['MM', months]  ||
                years   <= 1             && ['y']           || ['yy', years];

        a[2] = withoutSuffix;
        a[3] = +posNegDuration > 0;
        a[4] = locale;
        return substituteTimeAgo.apply(null, a);
    }

    // This function allows you to set the rounding function for relative time strings
    function getSetRelativeTimeRounding (roundingFunction) {
        if (roundingFunction === undefined) {
            return round;
        }
        if (typeof(roundingFunction) === 'function') {
            round = roundingFunction;
            return true;
        }
        return false;
    }

    // This function allows you to set a threshold for relative time strings
    function getSetRelativeTimeThreshold (threshold, limit) {
        if (thresholds[threshold] === undefined) {
            return false;
        }
        if (limit === undefined) {
            return thresholds[threshold];
        }
        thresholds[threshold] = limit;
        if (threshold === 's') {
            thresholds.ss = limit - 1;
        }
        return true;
    }

    function humanize (withSuffix) {
        if (!this.isValid()) {
            return this.localeData().invalidDate();
        }

        var locale = this.localeData();
        var output = relativeTime$1(this, !withSuffix, locale);

        if (withSuffix) {
            output = locale.pastFuture(+this, output);
        }

        return locale.postformat(output);
    }

    var abs$1 = Math.abs;

    function sign(x) {
        return ((x > 0) - (x < 0)) || +x;
    }

    function toISOString$1() {
        // for ISO strings we do not use the normal bubbling rules:
        //  * milliseconds bubble up until they become hours
        //  * days do not bubble at all
        //  * months bubble up until they become years
        // This is because there is no context-free conversion between hours and days
        // (think of clock changes)
        // and also not between days and months (28-31 days per month)
        if (!this.isValid()) {
            return this.localeData().invalidDate();
        }

        var seconds = abs$1(this._milliseconds) / 1000;
        var days         = abs$1(this._days);
        var months       = abs$1(this._months);
        var minutes, hours, years;

        // 3600 seconds -> 60 minutes -> 1 hour
        minutes           = absFloor(seconds / 60);
        hours             = absFloor(minutes / 60);
        seconds %= 60;
        minutes %= 60;

        // 12 months -> 1 year
        years  = absFloor(months / 12);
        months %= 12;


        // inspired by https://github.com/dordille/moment-isoduration/blob/master/moment.isoduration.js
        var Y = years;
        var M = months;
        var D = days;
        var h = hours;
        var m = minutes;
        var s = seconds ? seconds.toFixed(3).replace(/\.?0+$/, '') : '';
        var total = this.asSeconds();

        if (!total) {
            // this is the same as C#'s (Noda) and python (isodate)...
            // but not other JS (goog.date)
            return 'P0D';
        }

        var totalSign = total < 0 ? '-' : '';
        var ymSign = sign(this._months) !== sign(total) ? '-' : '';
        var daysSign = sign(this._days) !== sign(total) ? '-' : '';
        var hmsSign = sign(this._milliseconds) !== sign(total) ? '-' : '';

        return totalSign + 'P' +
            (Y ? ymSign + Y + 'Y' : '') +
            (M ? ymSign + M + 'M' : '') +
            (D ? daysSign + D + 'D' : '') +
            ((h || m || s) ? 'T' : '') +
            (h ? hmsSign + h + 'H' : '') +
            (m ? hmsSign + m + 'M' : '') +
            (s ? hmsSign + s + 'S' : '');
    }

    var proto$2 = Duration.prototype;

    proto$2.isValid        = isValid$1;
    proto$2.abs            = abs;
    proto$2.add            = add$1;
    proto$2.subtract       = subtract$1;
    proto$2.as             = as;
    proto$2.asMilliseconds = asMilliseconds;
    proto$2.asSeconds      = asSeconds;
    proto$2.asMinutes      = asMinutes;
    proto$2.asHours        = asHours;
    proto$2.asDays         = asDays;
    proto$2.asWeeks        = asWeeks;
    proto$2.asMonths       = asMonths;
    proto$2.asQuarters     = asQuarters;
    proto$2.asYears        = asYears;
    proto$2.valueOf        = valueOf$1;
    proto$2._bubble        = bubble;
    proto$2.clone          = clone$1;
    proto$2.get            = get$2;
    proto$2.milliseconds   = milliseconds;
    proto$2.seconds        = seconds;
    proto$2.minutes        = minutes;
    proto$2.hours          = hours;
    proto$2.days           = days;
    proto$2.weeks          = weeks;
    proto$2.months         = months;
    proto$2.years          = years;
    proto$2.humanize       = humanize;
    proto$2.toISOString    = toISOString$1;
    proto$2.toString       = toISOString$1;
    proto$2.toJSON         = toISOString$1;
    proto$2.locale         = locale;
    proto$2.localeData     = localeData;

    proto$2.toIsoString = deprecate('toIsoString() is deprecated. Please use toISOString() instead (notice the capitals)', toISOString$1);
    proto$2.lang = lang;

    // Side effect imports

    // FORMATTING

    addFormatToken('X', 0, 0, 'unix');
    addFormatToken('x', 0, 0, 'valueOf');

    // PARSING

    addRegexToken('x', matchSigned);
    addRegexToken('X', matchTimestamp);
    addParseToken('X', function (input, array, config) {
        config._d = new Date(parseFloat(input, 10) * 1000);
    });
    addParseToken('x', function (input, array, config) {
        config._d = new Date(toInt(input));
    });

    // Side effect imports


    hooks.version = '2.24.0';

    setHookCallback(createLocal);

    hooks.fn                    = proto;
    hooks.min                   = min;
    hooks.max                   = max;
    hooks.now                   = now;
    hooks.utc                   = createUTC;
    hooks.unix                  = createUnix;
    hooks.months                = listMonths;
    hooks.isDate                = isDate;
    hooks.locale                = getSetGlobalLocale;
    hooks.invalid               = createInvalid;
    hooks.duration              = createDuration;
    hooks.isMoment              = isMoment;
    hooks.weekdays              = listWeekdays;
    hooks.parseZone             = createInZone;
    hooks.localeData            = getLocale;
    hooks.isDuration            = isDuration;
    hooks.monthsShort           = listMonthsShort;
    hooks.weekdaysMin           = listWeekdaysMin;
    hooks.defineLocale          = defineLocale;
    hooks.updateLocale          = updateLocale;
    hooks.locales               = listLocales;
    hooks.weekdaysShort         = listWeekdaysShort;
    hooks.normalizeUnits        = normalizeUnits;
    hooks.relativeTimeRounding  = getSetRelativeTimeRounding;
    hooks.relativeTimeThreshold = getSetRelativeTimeThreshold;
    hooks.calendarFormat        = getCalendarFormat;
    hooks.prototype             = proto;

    // currently HTML5 input type only supports 24-hour formats
    hooks.HTML5_FMT = {
        DATETIME_LOCAL: 'YYYY-MM-DDTHH:mm',             // <input type="datetime-local" />
        DATETIME_LOCAL_SECONDS: 'YYYY-MM-DDTHH:mm:ss',  // <input type="datetime-local" step="1" />
        DATETIME_LOCAL_MS: 'YYYY-MM-DDTHH:mm:ss.SSS',   // <input type="datetime-local" step="0.001" />
        DATE: 'YYYY-MM-DD',                             // <input type="date" />
        TIME: 'HH:mm',                                  // <input type="time" />
        TIME_SECONDS: 'HH:mm:ss',                       // <input type="time" step="1" />
        TIME_MS: 'HH:mm:ss.SSS',                        // <input type="time" step="0.001" />
        WEEK: 'GGGG-[W]WW',                             // <input type="week" />
        MONTH: 'YYYY-MM'                                // <input type="month" />
    };

    return hooks;

})));

},{}],"opening_hours":[function(require,module,exports){
/*
 * @source: https://github.com/opening-hours/opening_hours.js/blob/master/opening_hours.js
 * @source: ./opening_hours.js
 * @license: LGPL-3.0
 *
 * Copyright (C) 2012-2013 Dmitry Marakasov
 * Copyright (C) 2013-2016 Robin `ypid` Schneider
 *
 * opening_hours.js is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by the
 * Free Software Foundation, version 3 of the License.
 *
 * opening_hours.js is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with opening_hours.js; if not, see
 * <https://www.gnu.org/licenses/>.
 * For information see https://github.com/opening-hours/opening_hours.js
 * and the docs directory which contains internal documentation and design.
 *
 * ---------------
 * Copyright (C) 2012-2013 Dmitry Marakasov
 *
 * All work done by Dmitry Marakasov is additionally published under the New (2-clause) BSD license.
 * Refer to the README.md and the reversion control history for more details.
 */
/* jshint laxbreak: true */
/* jshint boss: true */
/* jshint loopfunc: true */

(function (root, factory) { 'use strict';
    /* constants (holiday_definitions, error correction, lang) {{{ */
    /* holiday_definitions {{{ */
    /*
     * The country code keys and the PH, SH keys are surrounded by '':
     * :%s/^\s\+\zs"\([^"]\+\)"\(: {\)/'\1'\2/
     * Fixed the indention with Vim Marco:
     * /'PH'<cr>f{jVk%k,a:
     * Fixed spacing in parenthesis:
     * :%s/\[\zs\([^ ]\)/ \1/e | %s/\([^ ]\)\]/\1 \]/e | %s/,\([^ ]\)/, \1/e
     */
    var holiday_definitions = {
        'nl': { /* {{{ */
            'PH': { // https://nl.wikipedia.org/wiki/Feestdagen_in_Nederland
                "Nieuwjaarsdag"         : [ 1, 1 ],
                "Goede vrijdag"         : [ 'easter', -2 ],
                "Tweede Paasdag"        : [ 'easter', 1 ],
                "Koningsdag"            : [ 4, 27 ],
                "Bevreidingsdag"        : [ 5, 5 ],
                "Hemelvaartsdag"        : [ 'easter', 39 ],
                "Tweede Pinksterdag"    : [ 'easter', 50 ],
                "Eerste Kerstdag"       : [ 12, 25 ],
                "Tweede Kerstdag"       : [ 12, 26 ],
            }
        }, /* }}} */
        'be': { /* {{{ */
            'PH': { // https://nl.wikipedia.org/wiki/Feestdagen_in_Belgi%C3%AB
                "Nieuwjaar - Jour de l'an"                                 : [ 1, 1 ],
                "Paasmaandag - Lundi de Pâques"                            : [ 'easter', 1 ],
                "Dag van de Arbeid - Fête du Travail"                      : [ 5, 1 ],
                "Onze-Lieve-Heer-Hemelvaart - Jeudi de l'Ascensionn"       : [ 'easter', 39 ],
                "Pinkstermaandag - Lundi de Pentecôte"                     : [ 'easter', 50 ],
                "Nationale feestdag van België - Fête nationale"           : [ 7, 21 ],
                "Onze-Lieve-Vrouw-Hemelvaart - Assomption"                 : [ 8, 15 ],
                "Allerheiligen - Toussaint"                                : [ 11, 1 ],
                "Wapenstilstand - Armistice"                               : [ 11, 11 ],
                "Kerstmis - Noël"                                          : [ 12, 25 ]
            }
        }, /* }}} */
        'fr': { /* {{{ */
            'PH': { // https://fr.wikipedia.org/wiki/F%C3%AAtes_et_jours_f%C3%A9ri%C3%A9s_en_France
                "Jour de l'an"                          : [  1,  1 ],
                "Vendredi saint"                        : [  'easter', -2, [ 'Moselle', 'Bas-Rhin', 'Haut-Rhin', 'Guadeloupe', 'Martinique', 'Polynésie française' ] ],
                "Lundi de Pâques"                       : [  'easter', 1 ],
                "Saint-Pierre-Chanel"                   : [  4, 28, [ 'Wallis-et-Futuna' ] ],
                "Fête du Travail"                       : [  5,  1 ],
                "Fête de la Victoire"                   : [  5,  8 ],
                "Abolition de l'esclavage (Martinique)" : [  5, 22, [ 'Martinique' ] ],
                "Abolition de l'esclavage (Guadeloupe)" : [  5, 27, [ 'Guadeloupe' ] ],
                "Jeudi de l'Ascension"                  : [  'easter', 39 ],
                "Lundi de Pentecôte"                    : [  'easter', 50 ],
                "Abolition de l'esclavage (Guyane)"     : [  6, 10, [ 'Guyane' ] ],
                "Fête de l'autonomie"                   : [  6, 29, [ 'Polynésie française' ] ],
                "Fête nationale"                        : [  7, 14 ],
                "Fête Victor Schoelcher"                : [  7, 21, [ 'Guadeloupe', 'Martinique' ] ],
                "Fête du Territoire"                    : [  7, 29, [ 'Wallis-et-Futuna' ] ],
                "Assomption"                            : [  8, 15 ],
                "Fête de la citoyenneté"                : [  9, 24, [ 'Nouvelle-Calédonie' ] ],
                "Toussaint"                             : [ 11,  1 ],
                "Armistice"                             : [ 11, 11 ],
                "Abolition de l'esclavage (Réunion)"    : [ 12, 20, [ 'Réunion' ] ],
                "Noël"                                  : [ 12, 25 ],
                "Saint-Étienne "                        : [ 12, 26, [ 'Moselle', 'Bas-Rhin', 'Haut-Rhin' ] ]
            },
        }, /* }}} */
        'de': { /* {{{ */
            'PH': { // https://de.wikipedia.org/wiki/Feiertage_in_Deutschland
                'Neujahrstag'               : [  1,  1 ], // month 1, day 1, whole Germany
                'Heilige Drei Könige'       : [  1,  6, [ 'Baden-Württemberg', 'Bayern', 'Sachsen-Anhalt'] ], // only in the specified states
                'Tag der Arbeit'            : [  5,  1 ], // whole Germany
                'Karfreitag'                : [ 'easter', -2 ], // two days before easter
                'Ostersonntag'              : [ 'easter',  0, [ 'Brandenburg'] ],
                'Ostermontag'               : [ 'easter',  1 ],
                'Christi Himmelfahrt'       : [ 'easter', 39 ],
                'Pfingstsonntag'            : [ 'easter', 49, [ 'Brandenburg'] ],
                'Pfingstmontag'             : [ 'easter', 50 ],
                'Fronleichnam'              : [ 'easter', 60, [ 'Baden-Württemberg', 'Bayern', 'Hessen', 'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland' ] ],
                'Mariä Himmelfahrt'         : [  8, 15, [ 'Saarland'] ],
                'Tag der Deutschen Einheit' : [ 10,  3 ],
                'Reformationstag'           : [ 10, 31, [ 'Brandenburg', 'Mecklenburg-Vorpommern', 'Sachsen', 'Sachsen-Anhalt', 'Thüringen'] ],
                'Allerheiligen'             : [ 11,  1, [ 'Baden-Württemberg', 'Bayern', 'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland' ] ],
                '1. Weihnachtstag'          : [ 12, 25 ],
                '2. Weihnachtstag'          : [ 12, 26 ],
                // 'Silvester'              : [ 12, 31 ], // for testing
            },
            'Baden-Württemberg': { // does only apply in Baden-Württemberg
                // This more specific rule set overwrites the country wide one (they are just ignored).
                // You may use this instead of the country wide with some
                // additional holidays for some states, if one state
                // totally disagrees about how to do holidays …
                // 'PH': {
                //     '2. Weihnachtstag'          : [ 12, 26 ],
                // },

                // school holiday normally variate between states
                'SH': [ // generated by convert_ical_to_json
                        // You may can adjust this script to use other resources (for other countries) too.
                    {
                        name: 'Osterferien',
                        2005: [  3, 24, /* to */  3, 24,   3, 29, /* to */  4,  2 ],
                        2006: [  4, 18, /* to */  4, 22 ],
                        2007: [  4,  2, /* to */  4, 14 ],
                        2008: [  3, 17, /* to */  3, 28 ],
                        2009: [  4,  9, /* to */  4,  9,   4, 14, /* to */  4, 17 ],
                        2010: [  4,  1, /* to */  4,  1,   4,  6, /* to */  4, 10 ],
                        2011: [  4, 21, /* to */  4, 21,   4, 26, /* to */  4, 30 ],
                        2012: [  4,  2, /* to */  4, 13 ],
                        2013: [  3, 25, /* to */  4,  5 ],
                        2014: [  4, 14, /* to */  4, 25 ],
                        2015: [  3, 30, /* to */  4, 10 ],
                        2016: [  3, 29, /* to */  4,  2 ],
                        2017: [  4, 10, /* to */  4, 21 ],
                    },
                    {
                        name: 'Pfingstferien',
                        2005: [  5, 17, /* to */  5, 28 ],
                        2006: [  5, 29, /* to */  6, 10 ],
                        2007: [  5, 29, /* to */  6,  9 ],
                        2008: [  5, 13, /* to */  5, 23 ],
                        2009: [  5, 25, /* to */  6,  6 ],
                        2010: [  5, 25, /* to */  6,  5 ],
                        2011: [  6, 14, /* to */  6, 25 ],
                        2012: [  5, 29, /* to */  6,  9 ],
                        2013: [  5, 21, /* to */  6,  1 ],
                        2014: [  6, 10, /* to */  6, 21 ],
                        2015: [  5, 26, /* to */  6,  6 ],
                        2016: [  5, 17, /* to */  5, 28 ],
                        2017: [  6,  6, /* to */  6, 16 ],
                    },
                    {
                        name: 'Sommerferien',
                        2005: [  7, 28, /* to */  9, 10 ],
                        2006: [  8,  3, /* to */  9, 16 ],
                        2007: [  7, 26, /* to */  9,  8 ],
                        2008: [  7, 24, /* to */  9,  6 ],
                        2009: [  7, 30, /* to */  9, 12 ],
                        2010: [  7, 29, /* to */  9, 11 ],
                        2011: [  7, 28, /* to */  9, 10 ],
                        2012: [  7, 26, /* to */  9,  8 ],
                        2013: [  7, 25, /* to */  9,  7 ],
                        2014: [  7, 31, /* to */  9, 13 ],
                        2015: [  7, 30, /* to */  9, 12 ],
                        2016: [  7, 28, /* to */  9, 10 ],
                        2017: [  7, 27, /* to */  9,  9 ],
                    },
                    {
                        name: 'Herbstferien',
                        2005: [ 11,  2, /* to */ 11,  4 ],
                        2006: [ 10, 30, /* to */ 11,  3 ],
                        2007: [ 10, 29, /* to */ 11,  3 ],
                        2008: [ 10, 27, /* to */ 10, 31 ],
                        2009: [ 10, 26, /* to */ 10, 31 ],
                        2010: [ 11,  2, /* to */ 11,  6 ],
                        2011: [ 10, 31, /* to */ 10, 31,  11,  2, /* to */ 11,  4 ],
                        2012: [ 10, 29, /* to */ 11,  2 ],
                        2013: [ 10, 28, /* to */ 10, 30 ],
                        2014: [ 10, 27, /* to */ 10, 30 ],
                        2015: [ 11,  2, /* to */ 11,  6 ],
                        2016: [ 11,  2, /* to */ 11,  4 ],
                    },
                    {
                        name: 'Weihnachtsferien',
                        2005: [ 12, 22, /* to */  1,  5 ],
                        2006: [ 12, 27, /* to */  1,  5 ],
                        2007: [ 12, 24, /* to */  1,  5 ],
                        2008: [ 12, 22, /* to */  1, 10 ],
                        2009: [ 12, 23, /* to */  1,  9 ],
                        2010: [ 12, 23, /* to */  1,  8 ],
                        2011: [ 12, 23, /* to */  1,  5 ],
                        2012: [ 12, 24, /* to */  1,  5 ],
                        2013: [ 12, 23, /* to */  1,  4 ],
                        2014: [ 12, 22, /* to */  1,  5 ],
                        2015: [ 12, 23, /* to */  1,  9 ],
                        2016: [ 12, 23, /* to */  1,  7 ],
                    },
                ],
            },
            'Mecklenburg-Vorpommern': {
                'SH': [
                    {
                        name: 'Winterferien',
                        2010: [  2,  6, /* to */  2, 20 ],
                        2011: [  2,  7, /* to */  2, 19 ],
                        2012: [  2,  6, /* to */  2, 17 ],
                        2013: [  2,  4, /* to */  2, 15 ],
                        2014: [  2,  3, /* to */  2, 15 ],
                        2015: [  2,  2, /* to */  2, 14 ],
                        2016: [  2,  1, /* to */  2, 13 ],
                        2017: [  2,  6, /* to */  2, 18 ],
                    },
                    {
                        name: 'Osterferien',
                        2010: [  3, 29, /* to */  4,  7 ],
                        2011: [  4, 16, /* to */  4, 27 ],
                        2012: [  4,  2, /* to */  4, 11 ],
                        2013: [  3, 25, /* to */  4,  3 ],
                        2014: [  4, 14, /* to */  4, 23 ],
                        2015: [  3, 30, /* to */  4,  8 ],
                        2016: [  3, 21, /* to */  3, 30 ],
                        2017: [  4, 10, /* to */  4, 19 ],
                    },
                    {
                        name: 'Pfingstferien',
                        2010: [  5, 21, /* to */  5, 22 ],
                        2011: [  6, 10, /* to */  6, 14 ],
                        2012: [  5, 25, /* to */  5, 29 ],
                        2013: [  5, 17, /* to */  5, 21 ],
                        2014: [  6,  6, /* to */  6, 10 ],
                        2015: [  5, 22, /* to */  5, 26 ],
                        2016: [  5, 14, /* to */  5, 17 ],
                        2017: [  6,  2, /* to */  6,  6 ],
                    },
                    {
                        name: 'Sommerferien',
                        2010: [  7, 12, /* to */  8, 21 ],
                        2011: [  7,  4, /* to */  8, 13 ],
                        2012: [  6, 23, /* to */  8,  4 ],
                        2013: [  6, 22, /* to */  8,  3 ],
                        2014: [  7, 14, /* to */  8, 23 ],
                        2015: [  7, 20, /* to */  8, 29 ],
                        2016: [  7, 25, /* to */  9,  3 ],
                        2017: [  7, 24, /* to */  9,  2 ],
                    },
                    {
                        name: 'Herbstferien',
                        2010: [ 10, 18, /* to */ 10, 23 ],
                        2011: [ 10, 17, /* to */ 10, 21 ],
                        2012: [ 10,  1, /* to */ 10,  5 ],
                        2013: [ 10, 14, /* to */ 10, 19 ],
                        2014: [ 10, 20, /* to */ 10, 25 ],
                        2015: [ 10, 24, /* to */ 10, 30 ],
                        2016: [ 10, 24, /* to */ 10, 28 ],
                    },
                    {
                        name: 'Weihnachtsferien',
                        2010: [ 12, 23, /* to */ 12, 31 ],
                        2011: [ 12, 23, /* to */  1,  3 ],
                        2012: [ 12, 21, /* to */  1,  4 ],
                        2013: [ 12, 23, /* to */  1,  3 ],
                        2014: [ 12, 22, /* to */  1,  2 ],
                        2015: [ 12, 21, /* to */  1,  2 ],
                        2016: [ 12, 22, /* to */  1,  2 ],
                    },
                ],
            },
            'Hessen': {
                'SH': [
                    {
                        name: 'Osterferien',
                        2010: [  3, 29, /* to */  4, 10 ],
                        2011: [  4, 18, /* to */  4, 30 ],
                        2012: [  4,  2, /* to */  4, 14 ],
                        2013: [  3, 25, /* to */  4,  6 ],
                        2014: [  4, 14, /* to */  4, 26 ],
                        2015: [  3, 30, /* to */  4, 11 ],
                        2016: [  3, 29, /* to */  4,  9 ],
                        2017: [  4,  3, /* to */  4, 15 ],
                        2018: [  3, 26, /* to */  4,  7 ],
                    },
                    {
                        name: 'Sommerferien',
                        2010: [  7,  5, /* to */  8, 14 ],
                        2011: [  6, 27, /* to */  8,  5 ],
                        2012: [  7,  2, /* to */  8, 10 ],
                        2013: [  7,  8, /* to */  8, 16 ],
                        2014: [  7, 28, /* to */  9,  5 ],
                        2015: [  7, 27, /* to */  9,  5 ],
                        2016: [  7, 18, /* to */  8, 26 ],
                        2017: [  7,  3, /* to */  8, 11 ],
                    },
                    {
                        name: 'Herbstferien',
                        2010: [ 10, 11, /* to */ 10, 22 ],
                        2011: [ 10, 10, /* to */ 10, 22 ],
                        2012: [ 10, 15, /* to */ 10, 27 ],
                        2013: [ 10, 14, /* to */ 10, 26 ],
                        2014: [ 10, 20, /* to */ 11,  1 ],
                        2015: [ 10, 19, /* to */ 10, 31 ],
                        2016: [ 10, 17, /* to */ 10, 29 ],
                        2017: [ 10,  9, /* to */ 10, 21 ],
                    },
                    {
                        name: 'Weihnachtsferien',
                        2010: [ 12, 20, /* to */  1,  7 ],
                        2011: [ 12, 21, /* to */  1,  6 ],
                        2012: [ 12, 24, /* to */  1, 12 ],
                        2013: [ 12, 23, /* to */  1, 11 ],
                        2014: [ 12, 22, /* to */  1, 10 ],
                        2015: [ 12, 23, /* to */  1,  9 ],
                        2016: [ 12, 22, /* to */  1,  7 ],
                        2017: [ 12, 24, /* to */  1, 13 ],
                    },
                ],
            },
            'Schleswig-Holstein': {
                'SH': [
                    {
                        name: 'Osterferien',
                        2010: [  4,  3, /* to */  4, 17 ],
                        2011: [  4, 15, /* to */  4, 30 ],
                        2012: [  3, 30, /* to */  4, 13 ],
                        2013: [  3, 25, /* to */  4,  9 ],
                        2014: [  4, 16, /* to */  5,  2 ],
                        2015: [  4,  1, /* to */  4, 17 ],
                        2016: [  3, 24, /* to */  4,  9 ],
                        2017: [  4,  7, /* to */  4, 21 ],
                    },
                    {
                        name: 'Sommerferien',
                        2010: [  7, 12, /* to */  8, 21 ],
                        2011: [  7,  4, /* to */  8, 13 ],
                        2012: [  6, 25, /* to */  8,  4 ],
                        2013: [  6, 24, /* to */  8,  3 ],
                        2014: [  7, 14, /* to */  8, 23 ],
                        2015: [  7, 20, /* to */  8, 29 ],
                        2016: [  7, 25, /* to */  9,  3 ],
                        2017: [  7, 24, /* to */  9,  2 ],
                    },
                    {
                        name: 'Pfingstferien',
                        2011: [  6,  3, /* to */  6,  4 ],
                        2012: [  5, 18, /* to */  5, 18 ],
                        2013: [  5, 10, /* to */  5, 10 ],
                        2014: [  5, 30, /* to */  5, 30 ],
                        2015: [  5, 15, /* to */  5, 15 ],
                        2016: [  5,  6, /* to */  5,  6 ],
                        2017: [  5, 26, /* to */  5, 26 ],
                    },
                    {
                        name: 'Herbstferien',
                        2010: [ 10, 11, /* to */ 10, 23 ],
                        2011: [ 10, 10, /* to */ 10, 22 ],
                        2012: [ 10,  4, /* to */ 10, 19 ],
                        2013: [ 10,  4, /* to */ 10, 18 ],
                        2014: [ 10, 13, /* to */ 10, 25 ],
                        2015: [ 10, 19, /* to */ 10, 31 ],
                        2016: [ 10, 17, /* to */ 10, 29 ],
                    },
                    {
                        name: 'Weihnachtsferien',
                        2010: [ 12, 23, /* to */  1,  7 ],
                        2011: [ 12, 23, /* to */  1,  6 ],
                        2012: [ 12, 24, /* to */  1,  5 ],
                        2013: [ 12, 23, /* to */  1,  6 ],
                        2014: [ 12, 22, /* to */  1,  6 ],
                        2015: [ 12, 21, /* to */  1,  6 ],
                        2016: [ 12, 23, /* to */  1,  6 ],
                    },
                ],
            },
            'Berlin': {
                'SH': [
                    {
                        name: 'Winterferien',
                        2010: [  2,  1, /* to */  2,  6 ],
                        2011: [  1, 31, /* to */  2,  5 ],
                        2012: [  1, 30, /* to */  2,  4 ],
                        2013: [  2,  4, /* to */  2,  9 ],
                        2014: [  2,  3, /* to */  2,  8 ],
                        2015: [  2,  2, /* to */  2,  7 ],
                        2016: [  2,  1, /* to */  2,  6 ],
                        2017: [  1, 30, /* to */  2,  4 ],
                    },
                    {
                        name: 'Osterferien',
                        2010: [  3, 31, /* to */  4, 10 ],
                        2011: [  4, 18, /* to */  4, 30 ],
                        2012: [  4,  2, /* to */  4, 14,   4, 30, /* to */  4, 30 ],
                        2013: [  3, 25, /* to */  4,  6 ],
                        2014: [  4, 14, /* to */  4, 26,   5,  2, /* to */  5,  2 ],
                        2015: [  3, 30, /* to */  4, 11 ],
                        2016: [  3, 21, /* to */  4,  2 ],
                        2017: [  4, 10, /* to */  4, 22 ],
                    },
                    {
                        name: 'Pfingstferien',
                        2010: [  5, 14, /* to */  5, 14,   5, 25, /* to */  5, 25 ],
                        2011: [  6,  3, /* to */  6,  3 ],
                        2012: [  5, 18, /* to */  5, 18 ],
                        2013: [  5, 10, /* to */  5, 10,   5, 21, /* to */  5, 21 ],
                        2014: [  5, 30, /* to */  5, 30 ],
                        2015: [  5, 15, /* to */  5, 15 ],
                        2016: [  5,  6, /* to */  5,  6,   5, 17, /* to */  5, 17 ],
                        2017: [  5, 26, /* to */  5, 26 ],
                    },
                    {
                        name: 'Sommerferien',
                        2010: [  7,  7, /* to */  8, 21 ],
                        2011: [  6, 29, /* to */  8, 12 ],
                        2012: [  6, 20, /* to */  8,  3 ],
                        2013: [  6, 19, /* to */  8,  2 ],
                        2014: [  7,  9, /* to */  8, 22 ],
                        2015: [  7, 15, /* to */  8, 28 ],
                        2016: [  7, 20, /* to */  9,  2 ],
                        2017: [  7, 19, /* to */  9,  1 ],
                    },
                    {
                        name: 'Herbstferien',
                        2010: [ 10, 11, /* to */ 10, 23 ],
                        2011: [ 10,  4, /* to */ 10, 14 ],
                        2012: [ 10,  1, /* to */ 10, 13 ],
                        2013: [  9, 30, /* to */ 10, 12 ],
                        2014: [ 10, 20, /* to */ 11,  1 ],
                        2015: [ 10, 19, /* to */ 10, 31 ],
                        2016: [ 10, 17, /* to */ 10, 28 ],
                    },
                    {
                        name: 'Weihnachtsferien',
                        2010: [ 12, 23, /* to */  1,  1 ],
                        2011: [ 12, 23, /* to */  1,  3 ],
                        2012: [ 12, 24, /* to */  1,  4 ],
                        2013: [ 12, 23, /* to */  1,  3 ],
                        2014: [ 12, 22, /* to */  1,  2 ],
                        2015: [ 12, 23, /* to */  1,  2 ],
                        2016: [ 12, 23, /* to */  1,  3 ],
                    },
                ],
            },
            'Saarland': {
                'SH': [
                    {
                        name: 'Winterferien',
                        2010: [  2, 15, /* to */  2, 20 ],
                        2011: [  3,  7, /* to */  3, 12 ],
                        2012: [  2, 20, /* to */  2, 25 ],
                        2013: [  2, 11, /* to */  2, 16 ],
                        2014: [  3,  3, /* to */  3,  8 ],
                        2015: [  2, 16, /* to */  2, 21 ],
                    },
                    {
                        name: 'Osterferien',
                        2010: [  3, 29, /* to */  4, 10 ],
                        2011: [  4, 18, /* to */  4, 30 ],
                        2012: [  4,  2, /* to */  4, 14 ],
                        2013: [  3, 25, /* to */  4,  6 ],
                        2014: [  4, 14, /* to */  4, 26 ],
                        2015: [  3, 30, /* to */  4, 11 ],
                    },
                    {
                        name: 'Sommerferien',
                        2010: [  7,  5, /* to */  8, 14 ],
                        2011: [  6, 24, /* to */  8,  6 ],
                        2012: [  7,  2, /* to */  8, 14 ],
                        2013: [  7,  8, /* to */  8, 17 ],
                        2014: [  7, 28, /* to */  9,  6 ],
                        2015: [  7, 27, /* to */  9,  4 ],
                        2016: [  7, 18, /* to */  8, 26 ],
                        2017: [  7,  3, /* to */  8, 14 ],
                    },
                    {
                        name: 'Herbstferien',
                        2010: [ 10, 11, /* to */ 10, 23 ],
                        2011: [ 10,  4, /* to */ 10, 15 ],
                        2012: [ 10, 22, /* to */ 11,  3 ],
                        2013: [ 10, 21, /* to */ 11,  2 ],
                        2014: [ 10, 20, /* to */ 10, 31 ],
                    },
                    {
                        name: 'Weihnachtsferien',
                        2010: [ 12, 20, /* to */  1,  1 ],
                        2011: [ 12, 23, /* to */  1,  4 ],
                        2012: [ 12, 24, /* to */  1,  5 ],
                        2013: [ 12, 20, /* to */  1,  4 ],
                        2014: [ 12, 22, /* to */  1,  7 ],
                    },
                ],
            },
            'Bremen': {
                'SH': [
                    {
                        name: 'Winterferien',
                        2010: [  2,  1, /* to */  2,  2 ],
                        2011: [  1, 31, /* to */  2,  1 ],
                        2012: [  1, 30, /* to */  1, 31 ],
                        2013: [  1, 31, /* to */  2,  1 ],
                        2014: [  1, 30, /* to */  1, 31 ],
                        2015: [  2,  2, /* to */  2,  3 ],
                        2016: [  1, 28, /* to */  1, 29 ],
                        2017: [  1, 30, /* to */  1, 31 ],
                    },
                    {
                        name: 'Osterferien',
                        2010: [  3, 19, /* to */  4,  6 ],
                        2011: [  4, 16, /* to */  4, 30 ],
                        2012: [  3, 26, /* to */  4, 11,   4, 30, /* to */  4, 30 ],
                        2013: [  3, 16, /* to */  4,  2 ],
                        2014: [  4,  3, /* to */  4, 22,   5,  2, /* to */  5,  2 ],
                        2015: [  3, 25, /* to */  4, 10 ],
                        2016: [  3, 18, /* to */  4,  2 ],
                        2017: [  4, 10, /* to */  4, 22 ],
                    },
                    {
                        name: 'Pfingstferien',
                        2010: [  5, 14, /* to */  5, 14,   5, 25, /* to */  5, 25 ],
                        2011: [  6,  3, /* to */  6,  3,   6, 14, /* to */  6, 14 ],
                        2012: [  5, 18, /* to */  5, 18,   5, 29, /* to */  5, 29 ],
                        2013: [  5, 10, /* to */  5, 10,   5, 21, /* to */  5, 21 ],
                        2014: [  5, 30, /* to */  5, 30,   6, 10, /* to */  6, 10 ],
                        2015: [  5, 15, /* to */  5, 15,   5, 26, /* to */  5, 26 ],
                        2016: [  5,  6, /* to */  5,  6,   5, 17, /* to */  5, 17 ],
                        2017: [  5, 26, /* to */  5, 26,   6,  6, /* to */  6,  6 ],
                    },
                    {
                        name: 'Sommerferien',
                        2010: [  6, 24, /* to */  8,  4 ],
                        2011: [  7,  7, /* to */  8, 17 ],
                        2012: [  7, 23, /* to */  8, 31 ],
                        2013: [  6, 27, /* to */  8,  7 ],
                        2014: [  7, 31, /* to */  9, 10 ],
                        2015: [  7, 23, /* to */  9,  2 ],
                        2016: [  6, 23, /* to */  8,  3 ],
                        2017: [  6, 22, /* to */  8,  2 ],
                    },
                    {
                        name: 'Herbstferien',
                        2010: [ 10,  9, /* to */ 10, 23 ],
                        2011: [ 10, 17, /* to */ 10, 29 ],
                        2012: [ 10, 22, /* to */ 11,  3 ],
                        2013: [ 10,  4, /* to */ 10, 18 ],
                        2014: [ 10, 27, /* to */ 11,  8 ],
                        2015: [ 10, 19, /* to */ 10, 31 ],
                        2016: [ 10,  4, /* to */ 10, 15 ],
                    },
                    {
                        name: 'Weihnachtsferien',
                        2010: [ 12, 22, /* to */  1,  5 ],
                        2011: [ 12, 23, /* to */  1,  4 ],
                        2012: [ 12, 24, /* to */  1,  5 ],
                        2013: [ 12, 23, /* to */  1,  3 ],
                        2014: [ 12, 22, /* to */  1,  5 ],
                        2015: [ 12, 23, /* to */  1,  6 ],
                        2016: [ 12, 21, /* to */  1,  6 ],
                    },
                ],
            },
            'Bayern': {
                'SH': [
                    {
                        name: 'Winterferien',
                        2010: [  2, 15, /* to */  2, 20 ],
                        2011: [  3,  7, /* to */  3, 11 ],
                        2012: [  2, 20, /* to */  2, 24 ],
                        2013: [  2, 11, /* to */  2, 15 ],
                        2014: [  3,  3, /* to */  3,  7 ],
                        2015: [  2, 16, /* to */  2, 20 ],
                        2016: [  2,  8, /* to */  2, 12 ],
                        2017: [  2, 27, /* to */  3,  3 ],
                    },
                    {
                        name: 'Osterferien',
                        2010: [  3, 29, /* to */  4, 10 ],
                        2011: [  4, 18, /* to */  4, 30 ],
                        2012: [  4,  2, /* to */  4, 14 ],
                        2013: [  3, 25, /* to */  4,  6 ],
                        2014: [  4, 14, /* to */  4, 26 ],
                        2015: [  3, 30, /* to */  4, 11 ],
                        2016: [  3, 21, /* to */  4,  1 ],
                        2017: [  4, 10, /* to */  4, 22 ],
                    },
                    {
                        name: 'Pfingstferien',
                        2010: [  5, 25, /* to */  6,  5 ],
                        2011: [  6, 14, /* to */  6, 25 ],
                        2012: [  5, 29, /* to */  6,  9 ],
                        2013: [  5, 21, /* to */  5, 31 ],
                        2014: [  6, 10, /* to */  6, 21 ],
                        2015: [  5, 26, /* to */  6,  5 ],
                        2016: [  5, 17, /* to */  5, 28 ],
                        2017: [  6,  6, /* to */  6, 16 ],
                    },
                    {
                        name: 'Sommerferien',
                        2010: [  8,  2, /* to */  9, 13 ],
                        2011: [  7, 30, /* to */  9, 12 ],
                        2012: [  8,  1, /* to */  9, 12 ],
                        2013: [  7, 31, /* to */  9, 11 ],
                        2014: [  7, 30, /* to */  9, 15 ],
                        2015: [  8,  1, /* to */  9, 14 ],
                        2016: [  7, 30, /* to */  9, 12 ],
                        2017: [  7, 29, /* to */  9, 11 ],
                    },
                    {
                        name: 'Herbstferien',
                        2010: [ 11,  2, /* to */ 11,  5 ],
                        2011: [ 10, 31, /* to */ 11,  5 ],
                        2012: [ 10, 29, /* to */ 11,  3 ],
                        2013: [ 10, 28, /* to */ 10, 31 ],
                        2014: [ 10, 27, /* to */ 10, 31 ],
                        2015: [ 11,  2, /* to */ 11,  7 ],
                        2016: [ 10, 31, /* to */ 11,  4 ],
                    },
                    {
                        name: 'Weihnachtsferien',
                        2010: [ 12, 24, /* to */  1,  7 ],
                        2011: [ 12, 27, /* to */  1,  5 ],
                        2012: [ 12, 24, /* to */  1,  5 ],
                        2013: [ 12, 23, /* to */  1,  4 ],
                        2014: [ 12, 24, /* to */  1,  5 ],
                        2015: [ 12, 24, /* to */  1,  5 ],
                        2016: [ 12, 24, /* to */  1,  5 ],
                    },
                ],
            },
            'Niedersachsen': {
                'SH': [
                    {
                        name: 'Winterferien',
                        2010: [  2,  1, /* to */  2,  2 ],
                        2011: [  1, 31, /* to */  2,  1 ],
                        2012: [  1, 30, /* to */  1, 31 ],
                        2013: [  1, 31, /* to */  2,  1 ],
                        2014: [  1, 30, /* to */  1, 31 ],
                        2015: [  2,  2, /* to */  2,  3 ],
                        2016: [  1, 28, /* to */  1, 29 ],
                        2017: [  1, 30, /* to */  1, 31 ],
                    },
                    {
                        name: 'Osterferien',
                        2010: [  3, 19, /* to */  4,  6 ],
                        2011: [  4, 16, /* to */  4, 30 ],
                        2012: [  3, 26, /* to */  4, 11,   4, 30, /* to */  4, 30 ],
                        2013: [  3, 16, /* to */  4,  2 ],
                        2014: [  4,  3, /* to */  4, 22,   5,  2, /* to */  5,  2 ],
                        2015: [  3, 25, /* to */  4, 10 ],
                        2016: [  3, 18, /* to */  4,  2 ],
                        2017: [  4, 10, /* to */  4, 22 ],
                    },
                    {
                        name: 'Pfingstferien',
                        2010: [  5, 14, /* to */  5, 14,   5, 25, /* to */  5, 25 ],
                        2011: [  6,  3, /* to */  6,  3,   6, 14, /* to */  6, 14 ],
                        2012: [  5, 18, /* to */  5, 18,   5, 29, /* to */  5, 29 ],
                        2013: [  5, 10, /* to */  5, 10,   5, 21, /* to */  5, 21 ],
                        2014: [  5, 30, /* to */  5, 30,   6, 10, /* to */  6, 10 ],
                        2015: [  5, 15, /* to */  5, 15,   5, 26, /* to */  5, 26 ],
                        2016: [  5,  6, /* to */  5,  6,   5, 17, /* to */  5, 17 ],
                        2017: [  5, 26, /* to */  5, 26,   6,  6, /* to */  6,  6 ],
                    },
                    {
                        name: 'Sommerferien',
                        2010: [  6, 24, /* to */  8,  4 ],
                        2011: [  7,  7, /* to */  8, 17 ],
                        2012: [  7, 23, /* to */  8, 31 ],
                        2013: [  6, 27, /* to */  8,  7 ],
                        2014: [  7, 31, /* to */  9, 10 ],
                        2015: [  7, 23, /* to */  9,  2 ],
                        2016: [  6, 23, /* to */  8,  3 ],
                        2017: [  6, 22, /* to */  8,  2 ],
                    },
                    {
                        name: 'Herbstferien',
                        2010: [ 10,  9, /* to */ 10, 23 ],
                        2011: [ 10, 17, /* to */ 10, 29 ],
                        2012: [ 10, 22, /* to */ 11,  3 ],
                        2013: [ 10,  4, /* to */ 10, 18 ],
                        2014: [ 10, 27, /* to */ 11,  8 ],
                        2015: [ 10, 19, /* to */ 10, 31 ],
                        2016: [ 10,  4, /* to */ 10, 15 ],
                    },
                    {
                        name: 'Weihnachtsferien',
                        2010: [ 12, 22, /* to */  1,  5 ],
                        2011: [ 12, 23, /* to */  1,  4 ],
                        2012: [ 12, 24, /* to */  1,  5 ],
                        2013: [ 12, 23, /* to */  1,  3 ],
                        2014: [ 12, 22, /* to */  1,  5 ],
                        2015: [ 12, 23, /* to */  1,  6 ],
                        2016: [ 12, 21, /* to */  1,  6 ],
                    },
                ],
            },
            'Nordrhein-Westfalen': {
                'SH': [
                    {
                        name: 'Osterferien',
                        2010: [  3, 27, /* to */  4, 10 ],
                        2011: [  4, 18, /* to */  4, 30 ],
                        2012: [  4,  2, /* to */  4, 14 ],
                        2013: [  3, 25, /* to */  4,  6 ],
                        2014: [  4, 14, /* to */  4, 26 ],
                        2015: [  3, 30, /* to */  4, 11 ],
                        2016: [  3, 21, /* to */  4,  2 ],
                        2017: [  4, 10, /* to */  4, 22 ],
                    },
                    {
                        name: 'Pfingstferien',
                        2010: [  5, 25, /* to */  5, 25 ],
                        2012: [  5, 29, /* to */  5, 29 ],
                        2013: [  5, 21, /* to */  5, 21 ],
                        2014: [  6, 10, /* to */  6, 10 ],
                        2015: [  5, 26, /* to */  5, 26 ],
                        2016: [  5, 17, /* to */  5, 17 ],
                        2017: [  6,  6, /* to */  6,  6 ],
                    },
                    {
                        name: 'Sommerferien',
                        2010: [  7, 15, /* to */  8, 27 ],
                        2011: [  7, 25, /* to */  9,  6 ],
                        2012: [  7,  9, /* to */  8, 21 ],
                        2013: [  7, 22, /* to */  9,  3 ],
                        2014: [  7,  7, /* to */  8, 19 ],
                        2015: [  6, 29, /* to */  8, 11 ],
                        2016: [  7, 11, /* to */  8, 23 ],
                        2017: [  7, 17, /* to */  8, 29 ],
                    },
                    {
                        name: 'Herbstferien',
                        2010: [ 10, 11, /* to */ 10, 23 ],
                        2011: [ 10, 24, /* to */ 11,  5 ],
                        2012: [ 10,  8, /* to */ 10, 20 ],
                        2013: [ 10, 21, /* to */ 11,  2 ],
                        2014: [ 10,  6, /* to */ 10, 18 ],
                        2015: [ 10,  5, /* to */ 10, 17 ],
                        2016: [ 10, 10, /* to */ 10, 21 ],
                    },
                    {
                        name: 'Weihnachtsferien',
                        2010: [ 12, 24, /* to */  1,  8 ],
                        2011: [ 12, 23, /* to */  1,  6 ],
                        2012: [ 12, 21, /* to */  1,  4 ],
                        2013: [ 12, 23, /* to */  1,  7 ],
                        2014: [ 12, 22, /* to */  1,  6 ],
                        2015: [ 12, 23, /* to */  1,  6 ],
                        2016: [ 12, 23, /* to */  1,  6 ],
                    },
                ],
            },
            'Sachsen': {
                'SH': [
                    {
                        name: 'Winterferien',
                        2010: [  2,  8, /* to */  2, 20 ],
                        2011: [  2, 12, /* to */  2, 26 ],
                        2012: [  2, 13, /* to */  2, 25 ],
                        2013: [  2,  4, /* to */  2, 15 ],
                        2014: [  2, 17, /* to */  3,  1 ],
                        2015: [  2,  9, /* to */  2, 21 ],
                        2016: [  2,  8, /* to */  2, 20 ],
                        2017: [  2, 13, /* to */  2, 24 ],
                    },
                    {
                        name: 'Osterferien',
                        2010: [  4,  1, /* to */  4, 10 ],
                        2011: [  4, 22, /* to */  4, 30 ],
                        2012: [  4,  6, /* to */  4, 14 ],
                        2013: [  3, 29, /* to */  4,  6 ],
                        2014: [  4, 18, /* to */  4, 26 ],
                        2015: [  4,  2, /* to */  4, 11 ],
                        2016: [  3, 25, /* to */  4,  2 ],
                        2017: [  4, 13, /* to */  4, 22 ],
                    },
                    {
                        name: 'Pfingstferien',
                        2010: [  5, 14, /* to */  5, 14 ],
                        2011: [  6,  3, /* to */  6,  3 ],
                        2012: [  5, 18, /* to */  5, 18 ],
                        2013: [  5, 10, /* to */  5, 10,   5, 18, /* to */  5, 22 ],
                        2014: [  5, 30, /* to */  5, 30 ],
                        2015: [  5, 15, /* to */  5, 15 ],
                        2016: [  5,  6, /* to */  5,  6 ],
                        2017: [  5, 26, /* to */  5, 26 ],
                    },
                    {
                        name: 'Sommerferien',
                        2010: [  6, 28, /* to */  8,  6 ],
                        2011: [  7, 11, /* to */  8, 19 ],
                        2012: [  7, 23, /* to */  8, 31 ],
                        2013: [  7, 15, /* to */  8, 23 ],
                        2014: [  7, 21, /* to */  8, 29 ],
                        2015: [  7, 13, /* to */  8, 21 ],
                        2016: [  6, 27, /* to */  8,  5 ],
                        2017: [  6, 26, /* to */  8,  4 ],
                    },
                    {
                        name: 'Herbstferien',
                        2010: [ 10,  4, /* to */ 10, 16 ],
                        2011: [ 10, 17, /* to */ 10, 28 ],
                        2012: [ 10, 22, /* to */ 11,  2 ],
                        2013: [ 10, 21, /* to */ 11,  1 ],
                        2014: [ 10, 20, /* to */ 10, 31 ],
                        2015: [ 10, 12, /* to */ 10, 24 ],
                        2016: [ 10,  3, /* to */ 10, 15 ],
                    },
                    {
                        name: 'Weihnachtsferien',
                        2010: [ 12, 23, /* to */  1,  1 ],
                        2011: [ 12, 23, /* to */  1,  2 ],
                        2012: [ 12, 22, /* to */  1,  2 ],
                        2013: [ 12, 21, /* to */  1,  3 ],
                        2014: [ 12, 22, /* to */  1,  3 ],
                        2015: [ 12, 21, /* to */  1,  2 ],
                        2016: [ 12, 23, /* to */  1,  2 ],
                    },
                ],
            },
            'Thüringen': {
                'SH': [
                    {
                        name: 'Winterferien',
                        2010: [  2,  1, /* to */  2,  6 ],
                        2011: [  1, 31, /* to */  2,  5 ],
                        2012: [  2,  6, /* to */  2, 11 ],
                        2013: [  2, 18, /* to */  2, 23 ],
                        2014: [  2, 17, /* to */  2, 22 ],
                        2015: [  2,  2, /* to */  2,  7 ],
                        2016: [  2,  1, /* to */  2,  6 ],
                        2017: [  2,  6, /* to */  2, 11 ],
                    },
                    {
                        name: 'Osterferien',
                        2010: [  3, 29, /* to */  4,  9 ],
                        2011: [  4, 18, /* to */  4, 30 ],
                        2012: [  4,  2, /* to */  4, 13 ],
                        2013: [  3, 25, /* to */  4,  6 ],
                        2014: [  4, 19, /* to */  5,  2 ],
                        2015: [  3, 30, /* to */  4, 11 ],
                        2016: [  3, 24, /* to */  4,  2 ],
                        2017: [  4, 10, /* to */  4, 21 ],
                    },
                    {
                        name: 'Sommerferien',
                        2010: [  6, 24, /* to */  8,  4 ],
                        2011: [  7, 11, /* to */  8, 19 ],
                        2012: [  7, 23, /* to */  8, 31 ],
                        2013: [  7, 15, /* to */  8, 23 ],
                        2014: [  7, 21, /* to */  8, 29 ],
                        2015: [  7, 13, /* to */  8, 21 ],
                        2016: [  6, 27, /* to */  8, 10 ],
                        2017: [  6, 26, /* to */  8,  9 ],
                    },
                    {
                        name: 'Pfingstferien',
                        2011: [  6, 11, /* to */  6, 14 ],
                        2012: [  5, 25, /* to */  5, 29 ],
                        2013: [  5, 10, /* to */  5, 10 ],
                        2014: [  5, 30, /* to */  5, 30 ],
                        2015: [  5, 15, /* to */  5, 15 ],
                        2016: [  5,  6, /* to */  5,  6 ],
                        2017: [  5, 26, /* to */  5, 26 ],
                    },
                    {
                        name: 'Herbstferien',
                        2010: [ 10,  9, /* to */ 10, 23 ],
                        2011: [ 10, 17, /* to */ 10, 28 ],
                        2012: [ 10, 22, /* to */ 11,  3 ],
                        2013: [ 10, 21, /* to */ 11,  2 ],
                        2014: [ 10,  6, /* to */ 10, 18 ],
                        2015: [ 10,  5, /* to */ 10, 17 ],
                        2016: [ 10, 10, /* to */ 10, 22 ],
                    },
                    {
                        name: 'Weihnachtsferien',
                        2010: [ 12, 23, /* to */  1,  1 ],
                        2011: [ 12, 23, /* to */  1,  1 ],
                        2012: [ 12, 24, /* to */  1,  5 ],
                        2013: [ 12, 23, /* to */  1,  4 ],
                        2014: [ 12, 22, /* to */  1,  3 ],
                        2015: [ 12, 23, /* to */  1,  2 ],
                        2016: [ 12, 23, /* to */ 12, 31 ],
                    },
                ],
            },
            'Hamburg': {
                'SH': [
                    {
                        name: 'Winterferien',
                        2010: [  1, 29, /* to */  1, 29 ],
                        2011: [  1, 31, /* to */  1, 31 ],
                        2012: [  1, 30, /* to */  1, 30 ],
                        2013: [  2,  1, /* to */  2,  1 ],
                        2014: [  1, 31, /* to */  1, 31 ],
                        2015: [  1, 30, /* to */  1, 30 ],
                        2016: [  1, 29, /* to */  1, 29 ],
                        2017: [  1, 30, /* to */  1, 30 ],
                    },
                    {
                        name: 'Osterferien',
                        2010: [  3,  8, /* to */  3, 20 ],
                        2011: [  3,  7, /* to */  3, 18 ],
                        2012: [  3,  5, /* to */  3, 16 ],
                        2013: [  3,  4, /* to */  3, 15 ],
                        2014: [  3,  3, /* to */  3, 14 ],
                        2015: [  3,  2, /* to */  3, 13 ],
                        2016: [  3,  7, /* to */  3, 18 ],
                        2017: [  3,  6, /* to */  3, 17 ],
                    },
                    {
                        name: 'Pfingstferien',
                        2010: [  5, 14, /* to */  5, 22 ],
                        2011: [  4, 26, /* to */  4, 29,   6,  3, /* to */  6,  3 ],
                        2012: [  4, 30, /* to */  5,  4,   5, 18, /* to */  5, 18 ],
                        2013: [  5,  2, /* to */  5, 10 ],
                        2014: [  4, 28, /* to */  5,  2,   5, 30, /* to */  5, 30 ],
                        2015: [  5, 11, /* to */  5, 15 ],
                        2016: [  5,  6, /* to */  5,  6,   5, 17, /* to */  5, 20 ],
                        2017: [  5, 22, /* to */  5, 26 ],
                    },
                    {
                        name: 'Sommerferien',
                        2010: [  7,  8, /* to */  8, 18 ],
                        2011: [  6, 30, /* to */  8, 10 ],
                        2012: [  6, 21, /* to */  8,  1 ],
                        2013: [  6, 20, /* to */  7, 31 ],
                        2014: [  7, 10, /* to */  8, 20 ],
                        2015: [  7, 16, /* to */  8, 26 ],
                        2016: [  7, 21, /* to */  8, 31 ],
                        2017: [  7, 20, /* to */  8, 30 ],
                    },
                    {
                        name: 'Herbstferien',
                        2010: [ 10,  4, /* to */ 10, 15 ],
                        2011: [ 10,  4, /* to */ 10, 14 ],
                        2012: [ 10,  1, /* to */ 10, 12 ],
                        2013: [  9, 30, /* to */ 10, 11 ],
                        2014: [ 10, 13, /* to */ 10, 24 ],
                        2015: [ 10, 19, /* to */ 10, 30 ],
                        2016: [ 10, 17, /* to */ 10, 28 ],
                    },
                    {
                        name: 'Weihnachtsferien',
                        2010: [ 12, 23, /* to */  1,  3 ],
                        2011: [ 12, 27, /* to */  1,  6 ],
                        2012: [ 12, 21, /* to */  1,  4 ],
                        2013: [ 12, 19, /* to */  1,  3 ],
                        2014: [ 12, 22, /* to */  1,  6 ],
                        2015: [ 12, 21, /* to */  1,  1 ],
                        2016: [ 12, 27, /* to */  1,  6 ],
                    },
                ],
            },
            'Sachsen-Anhalt': {
                'SH': [
                    {
                        name: 'Winterferien',
                        2010: [  2,  8, /* to */  2, 13 ],
                        2011: [  2,  5, /* to */  2, 12 ],
                        2012: [  2,  4, /* to */  2, 11 ],
                        2013: [  2,  1, /* to */  2,  8 ],
                        2014: [  2,  1, /* to */  2, 12 ],
                        2015: [  2,  2, /* to */  2, 14 ],
                        2016: [  2,  1, /* to */  2, 10 ],
                        2017: [  2,  4, /* to */  2, 11 ],
                    },
                    {
                        name: 'Osterferien',
                        2010: [  3, 29, /* to */  4,  9 ],
                        2011: [  4, 18, /* to */  4, 27 ],
                        2012: [  4,  2, /* to */  4,  7 ],
                        2013: [  3, 25, /* to */  3, 30 ],
                        2014: [  4, 14, /* to */  4, 17 ],
                        2015: [  4,  2, /* to */  4,  2 ],
                        2016: [  3, 24, /* to */  3, 24 ],
                        2017: [  4, 10, /* to */  4, 13 ],
                    },
                    {
                        name: 'Pfingstferien',
                        2010: [  5, 14, /* to */  5, 22 ],
                        2011: [  6, 14, /* to */  6, 18 ],
                        2012: [  5, 18, /* to */  5, 25 ],
                        2013: [  5, 10, /* to */  5, 18 ],
                        2014: [  5, 30, /* to */  6,  7 ],
                        2015: [  5, 15, /* to */  5, 23 ],
                        2016: [  5,  6, /* to */  5, 14 ],
                        2017: [  5, 26, /* to */  5, 26 ],
                    },
                    {
                        name: 'Sommerferien',
                        2010: [  6, 24, /* to */  8,  4 ],
                        2011: [  7, 11, /* to */  8, 24 ],
                        2012: [  7, 23, /* to */  9,  5 ],
                        2013: [  7, 15, /* to */  8, 28 ],
                        2014: [  7, 21, /* to */  9,  3 ],
                        2015: [  7, 13, /* to */  8, 26 ],
                        2016: [  6, 27, /* to */  8, 10 ],
                        2017: [  6, 26, /* to */  8,  9 ],
                    },
                    {
                        name: 'Herbstferien',
                        2010: [ 10, 18, /* to */ 10, 23 ],
                        2011: [ 10, 17, /* to */ 10, 22 ],
                        2012: [ 10, 29, /* to */ 11,  2 ],
                        2013: [ 10, 21, /* to */ 10, 25 ],
                        2014: [ 10, 27, /* to */ 10, 30 ],
                        2015: [ 10, 17, /* to */ 10, 24 ],
                        2016: [ 10,  4, /* to */ 10, 15 ],
                    },
                    {
                        name: 'Weihnachtsferien',
                        2010: [ 12, 22, /* to */  1,  5 ],
                        2011: [ 12, 22, /* to */  1,  7 ],
                        2012: [ 12, 19, /* to */  1,  4 ],
                        2013: [ 12, 21, /* to */  1,  3 ],
                        2014: [ 12, 22, /* to */  1,  5 ],
                        2015: [ 12, 21, /* to */  1,  5 ],
                        2016: [ 12, 19, /* to */  1,  2 ],
                    },
                ],
            },
            'Rheinland-Pfalz': {
                'SH': [
                    {
                        name: 'Osterferien',
                        2010: [  3, 26, /* to */  4,  9 ],
                        2011: [  4, 18, /* to */  4, 29 ],
                        2012: [  3, 29, /* to */  4, 13 ],
                        2013: [  3, 20, /* to */  4,  5 ],
                        2014: [  4, 11, /* to */  4, 25 ],
                        2015: [  3, 26, /* to */  4, 10 ],
                        2016: [  3, 18, /* to */  4,  1 ],
                        2017: [  4, 10, /* to */  4, 21 ],
                    },
                    {
                        name: 'Sommerferien',
                        2010: [  7,  5, /* to */  8, 13 ],
                        2011: [  6, 27, /* to */  8,  5 ],
                        2012: [  7,  2, /* to */  8, 10 ],
                        2013: [  7,  8, /* to */  8, 16 ],
                        2014: [  7, 28, /* to */  9,  5 ],
                        2015: [  7, 27, /* to */  9,  4 ],
                        2016: [  7, 18, /* to */  8, 26 ],
                        2017: [  7,  3, /* to */  8, 11 ],
                    },
                    {
                        name: 'Herbstferien',
                        2010: [ 10, 11, /* to */ 10, 22 ],
                        2011: [ 10,  4, /* to */ 10, 14 ],
                        2012: [ 10,  1, /* to */ 10, 12 ],
                        2013: [ 10,  4, /* to */ 10, 18 ],
                        2014: [ 10, 20, /* to */ 10, 31 ],
                        2015: [ 10, 19, /* to */ 10, 30 ],
                        2016: [ 10, 10, /* to */ 10, 21 ],
                    },
                    {
                        name: 'Weihnachtsferien',
                        2010: [ 12, 23, /* to */  1,  7 ],
                        2011: [ 12, 22, /* to */  1,  6 ],
                        2012: [ 12, 20, /* to */  1,  4 ],
                        2013: [ 12, 23, /* to */  1,  7 ],
                        2014: [ 12, 22, /* to */  1,  7 ],
                        2015: [ 12, 23, /* to */  1,  8 ],
                        2016: [ 12, 22, /* to */  1,  6 ],
                    },
                ],
            },
            'Brandenburg': {
                'SH': [
                    {
                        name: 'Winterferien',
                        2010: [  2,  1, /* to */  2,  6 ],
                        2011: [  1, 31, /* to */  2,  5 ],
                        2012: [  1, 30, /* to */  2,  4 ],
                        2013: [  2,  4, /* to */  2,  9 ],
                        2014: [  2,  3, /* to */  2,  8 ],
                        2015: [  2,  2, /* to */  2,  7 ],
                        2016: [  2,  1, /* to */  2,  6 ],
                        2017: [  1, 30, /* to */  2,  4 ],
                    },
                    {
                        name: 'Osterferien',
                        2010: [  3, 31, /* to */  4, 10 ],
                        2011: [  4, 20, /* to */  4, 30 ],
                        2012: [  4,  4, /* to */  4, 14,   4, 30, /* to */  4, 30 ],
                        2013: [  3, 27, /* to */  4,  6 ],
                        2014: [  4, 16, /* to */  4, 26,   5,  2, /* to */  5,  2 ],
                        2015: [  4,  1, /* to */  4, 11 ],
                        2016: [  3, 23, /* to */  4,  2 ],
                        2017: [  4, 12, /* to */  4, 22 ],
                    },
                    {
                        name: 'Pfingstferien',
                        2010: [  5, 14, /* to */  5, 14 ],
                        2011: [  6,  3, /* to */  6,  3 ],
                        2012: [  5, 18, /* to */  5, 18 ],
                        2013: [  5, 10, /* to */  5, 10 ],
                        2014: [  5, 30, /* to */  5, 30 ],
                        2015: [  5, 15, /* to */  5, 15 ],
                        2016: [  5,  6, /* to */  5,  6,   5, 17, /* to */  5, 17 ],
                        2017: [  5, 26, /* to */  5, 26 ],
                    },
                    {
                        name: 'Sommerferien',
                        2010: [  7,  8, /* to */  8, 21 ],
                        2011: [  6, 30, /* to */  8, 13 ],
                        2012: [  6, 21, /* to */  8,  3 ],
                        2013: [  6, 20, /* to */  8,  2 ],
                        2014: [  7, 10, /* to */  8, 22 ],
                        2015: [  7, 16, /* to */  8, 28 ],
                        2016: [  7, 21, /* to */  9,  3 ],
                        2017: [  7, 20, /* to */  9,  1 ],
                    },
                    {
                        name: 'Herbstferien',
                        2010: [ 10, 11, /* to */ 10, 23 ],
                        2011: [ 10,  4, /* to */ 10, 14 ],
                        2012: [ 10,  1, /* to */ 10, 13 ],
                        2013: [  9, 30, /* to */ 10, 12,  11,  1, /* to */ 11,  1 ],
                        2014: [ 10, 20, /* to */ 11,  1 ],
                        2015: [ 10, 19, /* to */ 10, 30 ],
                        2016: [ 10, 17, /* to */ 10, 28 ],
                    },
                    {
                        name: 'Weihnachtsferien',
                        2010: [ 12, 23, /* to */  1,  1 ],
                        2011: [ 12, 23, /* to */  1,  3 ],
                        2012: [ 12, 24, /* to */  1,  4 ],
                        2013: [ 12, 23, /* to */  1,  3 ],
                        2014: [ 12, 22, /* to */  1,  2 ],
                        2015: [ 12, 23, /* to */  1,  2 ],
                        2016: [ 12, 23, /* to */  1,  3 ],
                    },
                ],
            },
        }, /* }}} */
        'at': { /* {{{ */
            'PH': { // https://de.wikipedia.org/wiki/Feiertage_in_%C3%96sterreich
                'Neujahrstag'                : [  1,  1 ],
                'Heilige Drei Könige'        : [  1,  6 ],
                // 'Josef'                   : [  3, 19, [ 'Kärnten', 'Steiermark', 'Tirol', 'Vorarlberg' ] ],
                // 'Karfreitag'              : [ 'easter', -2 ],
                'Ostermontag'                : [ 'easter',  1 ],
                'Staatsfeiertag'             : [  5,  1 ],
                // 'Florian'                 : [  5,  4, [ 'Oberösterreich' ] ],
                'Christi Himmelfahrt'        : [ 'easter', 39 ],
                'Pfingstmontag'              : [ 'easter', 50 ],
                'Fronleichnam'               : [ 'easter', 60 ],
                'Mariä Himmelfahrt'          : [  8, 15 ],
                // 'Rupert'                  : [  9, 24, [ 'Salzburg' ] ],
                // 'Tag der Volksabstimmung' : [ 10, 10, [ 'Kärnten' ] ],
                'Nationalfeiertag'           : [ 10, 26 ],
                'Allerheiligen'              : [ 11,  1 ],
                // 'Martin'                  : [ 11, 11, [ 'Burgenland' ] ],
                // 'Leopold'                 : [ 11, 15, [ 'Niederösterreich', 'Wien' ] ],
                'Mariä Empfängnis'           : [ 12,  8 ],
                // 'Heiliger Abend'          : [ 12, 24 ],
                'Christtag'                  : [ 12, 25 ],
                'Stefanitag'                 : [ 12, 26 ],
                // 'Silvester'               : [ 12, 31 ],
            },
        }, /* }}} */
        'dk': { /* {{{ */
            'PH': { // https://en.wikipedia.org/wiki/Public_holidays_in_Denmark
                'Nytårsdag'                  : [  1,  1 ],
                'Skærtorsdag'                : [ 'easter', -3 ],
                'Langfredag'                 : [ 'easter', -2 ],
                'Påskedag'                   : [ 'easter',  0 ],
                '2. Påskedag'                : [ 'easter',  1 ],
                'Store Bededag'              : [ 'easter', 26 ],
                'Kristi Himmelfartsdag'      : [ 'easter', 39 ],
                'Pinsedag'                   : [ 'easter', 49 ],
                '2. Pinsedag'                : [ 'easter', 50 ],
                'Grundlovsdag'               : [  6,  5 ],  // constituion day, Not a church holiday, most treated almost but not quite as such
                'Juleaftensdag'              : [ 12, 24 ],  // Not an official church holiday, but by law, stores are closed
                'Juledag'                    : [ 12, 25 ],
                '2. Juledag'                 : [ 12, 26 ],
            },
        }, /* }}} */
        'ca': { /* {{{ */
            'PH': { // https://en.wikipedia.org/wiki/Public_holidays_in_Canada
                "New Year's Day" : [  1,  1 ],
                "Good Friday"    : [  'easter', -2 ],
                "Canada Day"     : [  'canadaDay', 0 ],
                "Labour Day"     : [  'firstSeptemberMonday', 0 ],
                "Christmas Day"  : [ 12, 25 ]
            },
            'Alberta': {
                'PH': {
                    "New Year's Day"     : [  1,  1 ],
                    "Alberta Family Day" : [  'firstFebruaryMonday', 14 ],
                    "Good Friday"        : [  'easter', -2 ],
                    "Easter Monday"      : [  'easter', 1 ],
                    "Victoria Day"       : [  'victoriaDay', 0 ],
                    "Canada Day"         : [  'canadaDay', 0 ],
                    "Heritage Day"       : [  'firstAugustMonday', 0 ],
                    "Labour Day"         : [  'firstSeptemberMonday', 0 ],
                    "Thanksgiving"       : [  'firstOctoberMonday', 7 ],
                    "Remembrance Day"    : [ 11, 11 ],
                    "Christmas Day"      : [ 12, 25 ],
                    "Boxing Day"         : [ 12, 26 ]
                },
            },
            'British Columbia': {
                'PH': {
                    "New Year's Day"       : [  1,  1 ],
                    "Family Day"           : [  'firstFebruaryMonday', 7 ],
                    "Good Friday"          : [  'easter', -2 ],
                    "Victoria Day"         : [  'victoriaDay', 0 ],
                    "Canada Day"           : [  'canadaDay', 0 ],
                    "British Columbia Day" : [  'firstAugustMonday', 0 ],
                    "Labour Day"           : [  'firstSeptemberMonday', 0 ],
                    "Thanksgiving"         : [  'firstOctoberMonday', 7 ],
                    "Remembrance Day"      : [ 11, 11 ],
                    "Christmas Day"        : [ 12, 25 ]
                },
            },
            'Manitoba': {
                'PH': {
                    "New Year's Day"  : [  1,  1 ],
                    "Louis Riel Day"  : [  'firstFebruaryMonday', 14 ],
                    "Good Friday"     : [  'easter', -2 ],
                    "Victoria Day"    : [  'victoriaDay', 0 ],
                    "Canada Day"      : [  'canadaDay', 0 ],
                    "Civic Holiday"   : [  'firstAugustMonday', 0 ],
                    "Labour Day"      : [  'firstSeptemberMonday', 0 ],
                    "Thanksgiving"    : [  'firstOctoberMonday', 7 ],
                    "Remembrance Day" : [ 11, 11 ],
                    "Christmas Day"   : [ 12, 25 ]
                },
            },
            'New Brunswick': {
                'PH': {
                    "New Year's Day"    : [  1,  1 ],
                    "Good Friday"       : [  'easter', -2 ],
                    "Victoria Day"      : [  'victoriaDay', 0 ],
                    "Canada Day"        : [  'canadaDay', 0 ],
                    "New Brunswick Day" : [  'firstAugustMonday', 0 ],
                    "Labour Day"        : [  'firstSeptemberMonday', 0 ],
                    "Thanksgiving"      : [  'firstOctoberMonday', 7 ],
                    "Remembrance Day"   : [ 11, 11 ],
                    "Christmas Day"     : [ 12, 25 ],
                    "Boxing Day"        : [ 12, 26 ]
                },
            },
            'Newfoundland and Labrador': {
                'PH': {
                    "New Year's Day"      : [  1,  1 ],
                    "Saint Patrick's Day" : [  3, 17 ],
                    "Good Friday"         : [  'easter', -2 ],
                    "Saint George's Day"  : [  4, 23 ],
                    "Discovery Day"       : [  6, 24 ],
                    "Memorial Day"        : [  7, 1 ],
                    "Orangemen's Day"     : [  7, 12 ],
                    "Labour Day"          : [  'firstSeptemberMonday', 0 ],
                    "Armistice Day"       : [ 11, 11 ],
                    "Christmas Day"       : [ 12, 25 ]
                },
            },
            'Northwest Territories': {
                'PH': {
                    "New Year's Day"          : [  1,  1 ],
                    "Good Friday"             : [  'easter', -2 ],
                    "Victoria Day"            : [  'victoriaDay', 0 ],
                    "National Aboriginal Day" : [  6, 21 ],
                    "Canada Day"              : [  'canadaDay', 0 ],
                    "Civic Holiday"           : [  'firstAugustMonday', 0 ],
                    "Labour Day"              : [  'firstSeptemberMonday', 0 ],
                    "Thanksgiving"            : [  'firstOctoberMonday', 7 ],
                    "Remembrance Day"         : [ 11, 11 ],
                    "Christmas Day"           : [ 12, 25 ]
                },
            },
            'Nova Scotia': {
                'PH': {
                    "New Year's Day"  : [  1,  1 ],
                    "Good Friday"     : [  'easter', -2 ],
                    "Victoria Day"    : [  'victoriaDay', 0 ],
                    "Canada Day"      : [  'canadaDay', 0 ],
                    "Natal Day"       : [  'firstAugustMonday', 0 ],
                    "Labour Day"      : [  'firstSeptemberMonday', 0 ],
                    "Thanksgiving"    : [  'firstOctoberMonday', 7 ],
                    "Remembrance Day" : [ 11, 11 ],
                    "Christmas Day"   : [ 12, 25 ],
                    "Boxing Day"      : [ 12, 26 ]
                },
            },
            'Nunavut': {
                'PH': {
                    "New Year's Day"  : [  1,  1 ],
                    "Good Friday"     : [  'easter', -2 ],
                    "Victoria Day"    : [  'victoriaDay', 0 ],
                    "Canada Day"      : [  'canadaDay', 0 ],
                    "Nunavut Day"     : [  7, 9 ],
                    "Civic Holiday"   : [  'firstAugustMonday', 0 ],
                    "Labour Day"      : [  'firstSeptemberMonday', 0 ],
                    "Thanksgiving"    : [  'firstOctoberMonday', 7 ],
                    "Remembrance Day" : [ 11, 11 ],
                    "Christmas Day"   : [ 12, 25 ]
                },
            },
            'Ontario': {
                'PH': {
                    "New Year's Day"              : [  1,  1 ],
                    "Family Day"                  : [  'firstFebruaryMonday', 14 ],
                    "Good Friday"                 : [  'easter', -2 ],
                    "Victoria Day"                : [  'victoriaDay', 0 ],
                    "Canada Day"                  : [  'canadaDay', 0 ],
                    "August Civic Public Holiday" : [  'firstAugustMonday', 0 ],
                    "Labour Day"                  : [  'firstSeptemberMonday', 0 ],
                    "Thanksgiving"                : [  'firstOctoberMonday', 7 ],
                    "Remembrance Day"             : [ 11, 11 ],
                    "Christmas Day"               : [ 12, 25 ],
                    "Boxing Day"                  : [ 12, 26 ]
                },
            },
            'Prince Edward Island': {
                'PH': {
                    "New Year's Day"      : [  1,  1 ],
                    "Islander Day"        : [  'firstFebruaryMonday', 14 ],
                    "Good Friday"         : [  'easter', -2 ],
                    "Easter Monday"       : [  'easter', 1 ],
                    "Victoria Day"        : [  'victoriaDay', 0 ],
                    "Canada Day"          : [  'canadaDay', 0 ],
                    "Civic Holiday"       : [  'firstAugustMonday', 0 ],
                    "Gold Cup Parade Day" : [  'firstAugustMonday', 18 ],
                    "Labour Day"          : [  'firstSeptemberMonday', 0 ],
                    "Thanksgiving"        : [  'firstOctoberMonday', 7 ],
                    "Remembrance Day"     : [ 11, 11 ],
                    "Christmas Day"       : [ 12, 25 ],
                    "Boxing Day"          : [ 12, 26 ]
                },
            },
            'Quebec': {
                'PH': {
                    "Jour de l'an"                    : [  1,  1 ],
                    "Vendredi saint"                  : [  'easter', -2 ],
                    "Lundi de Pâques"                 : [  'easter', 1 ],
                    "Journée nationale des patriotes" : [  'victoriaDay', 0 ],
                    "Fête nationale du Québec"        : [  6, 24 ],
                    "Fête du Canada"                  : [  'canadaDay', 0 ],
                    "Fête du Travail"                 : [  'firstSeptemberMonday', 0 ],
                    "Jour de l'Action de grâce"       : [  'firstOctoberMonday', 7 ],
                    "Noël"                            : [ 12, 25 ]
                },
            },
            'Saskatchewan': {
                'PH': {
                    "New Year's Day"   : [  1,  1 ],
                    "Family Day"       : [  'firstFebruaryMonday', 14 ],
                    "Good Friday"      : [  'easter', -2 ],
                    "Victoria Day"     : [  'victoriaDay', 0 ],
                    "Canada Day"       : [  'canadaDay', 0 ],
                    "Saskatchewan Day" : [  'firstAugustMonday', 0 ],
                    "Labour Day"       : [  'firstSeptemberMonday', 0 ],
                    "Thanksgiving"     : [  'firstOctoberMonday', 7 ],
                    "Remembrance Day"  : [ 11, 11 ],
                    "Christmas Day"    : [ 12, 25 ]
                },
            },
            'Yukon': {
                'PH': {
                    "New Year's Day"  : [  1,  1 ],
                    "Heritage Day"    : [  'lastFebruarySunday',  -2 ],
                    "Good Friday"     : [  'easter', -2 ],
                    "Easter Monday"   : [  'easter', 1 ],
                    "Victoria Day"    : [  'victoriaDay', 0 ],
                    "Canada Day"      : [  'canadaDay', 0 ],
                    "Discovery Day"   : [  'firstAugustMonday', 14 ],
                    "Labour Day"      : [  'firstSeptemberMonday', 0 ],
                    "Thanksgiving"    : [  'firstOctoberMonday', 7 ],
                    "Remembrance Day" : [ 11, 11 ],
                    "Christmas Day"   : [ 12, 25 ],
                    "Boxing Day"      : [ 12, 26 ]
                },
            },
        }, /* }}} */
        'ru': { /* {{{ */
            'PH': { // https://ru.wikipedia.org/wiki/%D0%9F%D1%80%D0%B0%D0%B7%D0%B4%D0%BD%D0%B8%D0%BA%D0%B8_%D0%A0%D0%BE%D1%81%D1%81%D0%B8%D0%B8
                "1. Новогодние каникулы":     [ 1, 1 ],
                "2. Новогодние каникулы":     [ 1, 2 ],
                "3. Новогодние каникулы":     [ 1, 3 ],
                "4. Новогодние каникулы":     [ 1, 4 ],
                "5. Новогодние каникулы":     [ 1, 5 ],
                "6. Новогодние каникулы":     [ 1, 6 ],
                "Рождество Христово":         [ 1, 7 ],
                "8. Новогодние каникулы":     [ 1, 8 ],
                "День защитника Отечества":   [ 2, 23 ],
                "Международный женский день": [ 3, 8 ],
                "День Победы":                [ 5, 9 ],
                "Праздник Весны и Труда":     [ 5, 1 ],
                "День народного единства":    [ 11, 4 ],
                "День России":                [ 6, 12 ],
            },
            'Tatarstan': { // https://ru.wikipedia.org/wiki/%D0%9F%D1%80%D0%B0%D0%B7%D0%B4%D0%BD%D0%B8%D0%BA%D0%B8_%D0%A2%D0%B0%D1%82%D0%B0%D1%80%D1%81%D1%82%D0%B0%D0%BD%D0%B0
                'PH': {
                    "1. Новогодние каникулы":                [ 1, 1 ],
                    "2. Новогодние каникулы":                [ 1, 2 ],
                    "3. Новогодние каникулы":                [ 1, 3 ],
                    "4. Новогодние каникулы":                [ 1, 4 ],
                    "5. Новогодние каникулы":                [ 1, 5 ],
                    "6. Новогодние каникулы":                [ 1, 6 ],
                    "Рождество Христово":                    [ 1, 7 ],
                    "8. Новогодние каникулы":                [ 1, 8 ],
                    "День защитника Отечества":              [ 2, 23 ],
                    "Международный женский день":            [ 3, 8 ],
                    "День Победы":                           [ 5, 9 ],
                    "Праздник Весны и Труда":                [ 5, 1 ],
                    "День народного единства":               [ 11, 4 ],
                    "День России":                           [ 6, 12 ],
                    // local
                    "Ураза-байрам":                          [ 7, 28 ],
                    "День Республики Татарстан":             [ 8, 30 ],
                    "Курбан-байрам":                         [ 10, 4 ],
                    "День Конституции Республики Татарстан": [ 11, 6 ],
                },
            },
            'Bashkortostan': { // https://ru.wikipedia.org/wiki/%D0%9F%D1%80%D0%B0%D0%B7%D0%B4%D0%BD%D0%B8%D0%BA%D0%B8_%D0%91%D0%B0%D1%88%D0%BA%D0%BE%D1%80%D1%82%D0%BE%D1%81%D1%82%D0%B0%D0%BD%D0%B0
                'PH': {
                    "1. Новогодние каникулы":               [ 1, 1 ],
                    "2. Новогодние каникулы":           [ 1, 2 ],
                    "3. Новогодние каникулы":           [ 1, 3 ],
                    "4. Новогодние каникулы":           [ 1, 4 ],
                    "5. Новогодние каникулы":           [ 1, 5 ],
                    "6. Новогодние каникулы":           [ 1, 6 ],
                    "Рождество Христово":               [ 1, 7 ],
                    "8. Новогодние каникулы":           [ 1, 8 ],
                    "День защитника Отечества":         [ 2, 23 ],
                    "Международный женский день":       [ 3, 8 ],
                    "День Победы":                      [ 5, 9 ],
                    "Праздник Весны и Труда":           [ 5, 1 ],
                    "День народного единства":          [ 11, 4 ],
                    "День России":                      [ 6, 12 ],
                    // local
                    "Ураза-байрам":                     [ 7, 28 ],
                    "Курбан-байрам":                    [ 10, 4 ],
                    "День Республики Башкирии":         [ 10, 11 ],
                    "День Конституции Башкортостана":   [ 12, 24 ],
                },
            },
            'Chuvashia': {
                'PH': {
                    "1. Новогодние каникулы":           [ 1, 1 ],
                    "2. Новогодние каникулы":           [ 1, 2 ],
                    "3. Новогодние каникулы":           [ 1, 3 ],
                    "4. Новогодние каникулы":           [ 1, 4 ],
                    "5. Новогодние каникулы":           [ 1, 5 ],
                    "6. Новогодние каникулы":           [ 1, 6 ],
                    "Рождество Христово":               [ 1, 7 ],
                    "8. Новогодние каникулы":           [ 1, 8 ],
                    "День защитника Отечества":         [ 2, 23 ],
                    "Международный женский день":       [ 3, 8 ],
                    "День Победы":                      [ 5, 9 ],
                    "Праздник Весны и Труда":           [ 5, 1 ],
                    "День народного единства":          [ 11, 4 ],
                    "День России":                      [ 6, 12 ],
                    // local
                    "День Чувашской республики":        [ 6, 24 ],
                },
            },
            'Sakha Republic': { // https://ru.wikipedia.org/wiki/%D0%AF%D0%BA%D1%83%D1%82%D0%B8%D1%8F#.D0.9F.D1.80.D0.B0.D0.B7.D0.B4.D0.BD.D0.B8.D0.BA.D0.B8_.D0.AF.D0.BA.D1.83.D1.82.D0.B8.D0.B8
                'PH': {
                    "1. Новогодние каникулы":                 [ 1, 1 ],
                    "2. Новогодние каникулы":                 [ 1, 2 ],
                    "3. Новогодние каникулы":                 [ 1, 3 ],
                    "4. Новогодние каникулы":                 [ 1, 4 ],
                    "5. Новогодние каникулы":                 [ 1, 5 ],
                    "6. Новогодние каникулы":                 [ 1, 6 ],
                    "Рождество Христово":                     [ 1, 7 ],
                    "8. Новогодние каникулы":                 [ 1, 8 ],
                    "День защитника Отечества":               [ 2, 23 ],
                    "Международный женский день":             [ 3, 8 ],
                    "День Победы":                            [ 5, 9 ],
                    "Праздник Весны и Труда":                 [ 5, 1 ],
                    "День народного единства":                [ 11, 4 ],
                    "День России":                            [ 6, 12 ],
                    // local
                    "День Республики Саха":                   [ 4, 27 ],
                    "Ысыах":                                  [ 6, 23 ],
                    "День государственности Республики Саха": [ 9, 27 ],
                },
            },
            'Republic of Kalmykia': { // https://ru.wikipedia.org/wiki/%D0%9F%D1%80%D0%B0%D0%B7%D0%B4%D0%BD%D0%B8%D0%BA%D0%B8_%D0%B8_%D0%BF%D0%B0%D0%BC%D1%8F%D1%82%D0%BD%D1%8B%D0%B5_%D0%B4%D0%B0%D1%82%D1%8B_%D0%9A%D0%B0%D0%BB%D0%BC%D1%8B%D0%BA%D0%B8%D0%B8
                'PH': {
                    "1. Новогодние каникулы":                                            [ 1, 1 ],
                    "2. Новогодние каникулы":                                            [ 1, 2 ],
                    "3. Новогодние каникулы":                                            [ 1, 3 ],
                    "4. Новогодние каникулы":                                            [ 1, 4 ],
                    "5. Новогодние каникулы":                                            [ 1, 5 ],
                    "6. Новогодние каникулы":                                            [ 1, 6 ],
                    "Рождество Христово":                                                [ 1, 7 ],
                    "8. Новогодние каникулы":                                            [ 1, 8 ],
                    "День защитника Отечества":                                          [ 2, 23 ],
                    "Международный женский день":                                        [ 3, 8 ],
                    "День Победы":                                                       [ 5, 9 ],
                    "Праздник Весны и Труда":                                            [ 5, 1 ],
                    "День народного единства":                                           [ 11, 4 ],
                    "День России":                                                       [ 6, 12 ],
                    // local
                    "Цаган Сар":                                                         [ 1, 14 ],
                    "День принятия Степного Уложения (Конституции) Республики Калмыкия": [ 4, 5 ],
                    "День рождения Будды Шакьямун":                                       [ 6, 6 ],
                    "Зул":                                                               [ 12, 15 ],
                    "День памяти жертв депортации калмыцкого народа":                    [ 12, 28 ],
                },
            },
            'Buryatia': { // https://ru.wikipedia.org/wiki/%D0%9F%D1%80%D0%B0%D0%B7%D0%B4%D0%BD%D0%B8%D0%BA%D0%B8_%D0%91%D1%83%D1%80%D1%8F%D1%82%D0%B8%D0%B8
                'PH': {
                    "1. Новогодние каникулы":     [ 1, 1 ],
                    "2. Новогодние каникулы":     [ 1, 2 ],
                    "3. Новогодние каникулы":     [ 1, 3 ],
                    "4. Новогодние каникулы":     [ 1, 4 ],
                    "5. Новогодние каникулы":     [ 1, 5 ],
                    "6. Новогодние каникулы":     [ 1, 6 ],
                    "Рождество Христово":         [ 1, 7 ],
                    "8. Новогодние каникулы":     [ 1, 8 ],
                    "День защитника Отечества":   [ 2, 23 ],
                    "Международный женский день": [ 3, 8 ],
                    "День Победы":                [ 5, 9 ],
                    "Праздник Весны и Труда":     [ 5, 1 ],
                    "День народного единства":    [ 11, 4 ],
                    "День России":                [ 6, 12 ],
                    //
                    "Сагаалган":                  [ 1, 14 ],
                },
            },
            'Republic of Karelia': { // https://ru.wikipedia.org/wiki/%D0%9F%D1%80%D0%B0%D0%B7%D0%B4%D0%BD%D0%B8%D0%BA%D0%B8_%D0%A0%D0%B5%D1%81%D0%BF%D1%83%D0%B1%D0%BB%D0%B8%D0%BA%D0%B8_%D0%9A%D0%B0%D1%80%D0%B5%D0%BB%D0%B8%D1%8F
                'PH': {
                    "1. Новогодние каникулы":                              [ 1, 1 ],
                    "2. Новогодние каникулы":                              [ 1, 2 ],
                    "3. Новогодние каникулы":                              [ 1, 3 ],
                    "4. Новогодние каникулы":                              [ 1, 4 ],
                    "5. Новогодние каникулы":                              [ 1, 5 ],
                    "6. Новогодние каникулы":                              [ 1, 6 ],
                    "Рождество Христово":                                  [ 1, 7 ],
                    "8. Новогодние каникулы":                              [ 1, 8 ],
                    "День защитника Отечества":                            [ 2, 23 ],
                    "Международный женский день":                          [ 3, 8 ],
                    "День Победы":                                         [ 5, 9 ],
                    "Праздник Весны и Труда":                              [ 5, 1 ],
                    "День народного единства":                             [ 11, 4 ],
                    "День России":                                         [ 6, 12 ],
                    // local
                    "День Республики Карелия":                             [ 6, 8 ],
                    "День освобождения Карелии от фашистских захватчиков": [ 9, 30 ],
                },
            },
            'Удмуртская республика': {
                'PH': {
                    "1. Новогодние каникулы":                       [ 1, 1 ],
                    "2. Новогодние каникулы":                       [ 1, 2 ],
                    "3. Новогодние каникулы":                       [ 1, 3 ],
                    "4. Новогодние каникулы":                       [ 1, 4 ],
                    "5. Новогодние каникулы":                       [ 1, 5 ],
                    "6. Новогодние каникулы":                       [ 1, 6 ],
                    "Рождество Христово":                           [ 1, 7 ],
                    "8. Новогодние каникулы":                       [ 1, 8 ],
                    "День защитника Отечества":                     [ 2, 23 ],
                    "Международный женский день":                   [ 3, 8 ],
                    "День Победы":                                  [ 5, 9 ],
                    "Праздник Весны и Труда":                       [ 5, 1 ],
                    "День народного единства":                      [ 11, 4 ],
                    "День России":                                  [ 6, 12 ],
                    // local
                    "День Государственности Удмуртской Республики": [ 5, 31 ],
                },
            },
            'Adygea': {
                'PH': {
                    "1. Новогодние каникулы":             [ 1, 1 ],
                    "2. Новогодние каникулы":             [ 1, 2 ],
                    "3. Новогодние каникулы":             [ 1, 3 ],
                    "4. Новогодние каникулы":             [ 1, 4 ],
                    "5. Новогодние каникулы":             [ 1, 5 ],
                    "6. Новогодние каникулы":             [ 1, 6 ],
                    "Рождество Христово":                 [ 1, 7 ],
                    "8. Новогодние каникулы":             [ 1, 8 ],
                    "День защитника Отечества":           [ 2, 23 ],
                    "Международный женский день":         [ 3, 8 ],
                    "День Победы":                        [ 5, 9 ],
                    "Праздник Весны и Труда":             [ 5, 1 ],
                    "День народного единства":            [ 11, 4 ],
                    "День России":                        [ 6, 12 ],
                    // local
                    "Ураза-байрам":                       [ 7, 28 ],
                    "Курбан-байрам":                      [ 10, 4 ],
                    "День образования Республики Адыгея": [ 10, 5 ],
                },
            },
            'Republic of Dagestan': { // https://ru.wikipedia.org/wiki/%D0%9F%D1%80%D0%B0%D0%B7%D0%B4%D0%BD%D0%B8%D0%BA%D0%B8_%D0%94%D0%B0%D0%B3%D0%B5%D1%81%D1%82%D0%B0%D0%BD%D0%B0
                'PH': {
                    "1. Новогодние каникулы":               [ 1, 1 ],
                    "2. Новогодние каникулы":               [ 1, 2 ],
                    "3. Новогодние каникулы":               [ 1, 3 ],
                    "4. Новогодние каникулы":               [ 1, 4 ],
                    "5. Новогодние каникулы":               [ 1, 5 ],
                    "6. Новогодние каникулы":               [ 1, 6 ],
                    "Рождество Христово":                   [ 1, 7 ],
                    "8. Новогодние каникулы":               [ 1, 8 ],
                    "День защитника Отечества":             [ 2, 23 ],
                    "Международный женский день":           [ 3, 8 ],
                    "День Победы":                          [ 5, 9 ],
                    "Праздник Весны и Труда":               [ 5, 1 ],
                    "День народного единства":              [ 11, 4 ],
                    "День России":                          [ 6, 12 ],
                    // local
                    "День Конституции Республики Дагестан": [ 7, 26 ],
                    "Ураза-байрам":                         [ 7, 28 ],
                    "День единства народов Дагестана":      [ 9, 15 ],
                    "Курбан-байрам":                        [ 10, 4 ],
                },
            },
            'Ingushetia': { // https://ru.wikipedia.org/wiki/%D0%9F%D1%80%D0%B0%D0%B7%D0%B4%D0%BD%D0%B8%D0%BA%D0%B8_%D0%98%D0%BD%D0%B3%D1%83%D1%88%D0%B5%D1%82%D0%B8%D0%B8
                'PH': {
                    "1. Новогодние каникулы":                [ 1, 1 ],
                    "2. Новогодние каникулы":                [ 1, 2 ],
                    "3. Новогодние каникулы":                [ 1, 3 ],
                    "4. Новогодние каникулы":                [ 1, 4 ],
                    "5. Новогодние каникулы":                [ 1, 5 ],
                    "6. Новогодние каникулы":                [ 1, 6 ],
                    "Рождество Христово":                    [ 1, 7 ],
                    "8. Новогодние каникулы":                [ 1, 8 ],
                    "День защитника Отечества":              [ 2, 23 ],
                    "Международный женский день":            [ 3, 8 ],
                    "День Победы":                           [ 5, 9 ],
                    "Праздник Весны и Труда":                [ 5, 1 ],
                    "День народного единства":               [ 11, 4 ],
                    "День России":                           [ 6, 12 ],
                    // local
                    "День образования Республики Ингушетия": [ 6, 4 ],
                    "Ураза-байрам":                          [ 7, 28 ],
                    "Курбан-байрам":                         [ 10, 4 ],
                },
            },
            'Карачаево-Черкесская республика': {
                'PH': {
                    "1. Новогодние каникулы":                [ 1, 1 ],
                    "2. Новогодние каникулы":                [ 1, 2 ],
                    "3. Новогодние каникулы":                [ 1, 3 ],
                    "4. Новогодние каникулы":                [ 1, 4 ],
                    "5. Новогодние каникулы":                [ 1, 5 ],
                    "6. Новогодние каникулы":                [ 1, 6 ],
                    "Рождество Христово":                    [ 1, 7 ],
                    "8. Новогодние каникулы":                [ 1, 8 ],
                    "День защитника Отечества":              [ 2, 23 ],
                    "Международный женский день":            [ 3, 8 ],
                    "День Победы":                           [ 5, 9 ],
                    "Праздник Весны и Труда":                [ 5, 1 ],
                    "День народного единства":               [ 11, 4 ],
                    "День России":                           [ 6, 12 ],
                    // local
                    "День возрождения карачаевского народа": [ 5, 3 ],
                    "Ураза-байрам":                          [ 7, 28 ],
                    "Курбан-байрам":                         [ 10, 4 ],
                },
            },
            'Chechen Republic': { // https://ru.wikipedia.org/wiki/%D0%9F%D1%80%D0%B0%D0%B7%D0%B4%D0%BD%D0%B8%D0%BA%D0%B8_%D0%A7%D0%B5%D1%87%D0%BD%D0%B8
                'PH': {
                    "1. Новогодние каникулы":           [ 1, 1 ],
                    "2. Новогодние каникулы":           [ 1, 2 ],
                    "3. Новогодние каникулы":           [ 1, 3 ],
                    "4. Новогодние каникулы":           [ 1, 4 ],
                    "5. Новогодние каникулы":           [ 1, 5 ],
                    "6. Новогодние каникулы":           [ 1, 6 ],
                    "Рождество Христово":               [ 1, 7 ],
                    "8. Новогодние каникулы":           [ 1, 8 ],
                    "День защитника Отечества":         [ 2, 23 ],
                    "Международный женский день":       [ 3, 8 ],
                    "День Победы":                      [ 5, 9 ],
                    "Праздник Весны и Труда":           [ 5, 1 ],
                    "День народного единства":          [ 11, 4 ],
                    "День России":                      [ 6, 12 ],
                    // local
                    "День мира в Чеченской Республике": [ 4, 16 ],
                    "Ураза-байрам":                     [ 7, 28 ],
                    "Курбан-байрам":                    [ 10, 4 ],
                },
            },
            'Кабардино-Балкарская республика': {
                'PH': {
                    "1. Новогодние каникулы":                                 [ 1, 1 ],
                    "2. Новогодние каникулы":                                 [ 1, 2 ],
                    "3. Новогодние каникулы":                                 [ 1, 3 ],
                    "4. Новогодние каникулы":                                 [ 1, 4 ],
                    "5. Новогодние каникулы":                                 [ 1, 5 ],
                    "6. Новогодние каникулы":                                 [ 1, 6 ],
                    "Рождество Христово":                                     [ 1, 7 ],
                    "8. Новогодние каникулы":                                 [ 1, 8 ],
                    "День защитника Отечества":                               [ 2, 23 ],
                    "Международный женский день":                             [ 3, 8 ],
                    "День Победы":                                            [ 5, 9 ],
                    "Праздник Весны и Труда":                                 [ 5, 1 ],
                    "День народного единства":                                [ 11, 4 ],
                    "День России":                                            [ 6, 12 ],
                    // local
                    "День возрождения балкарского народа":                    [ 3, 28 ],
                    "Черкесский день траура":                                 [ 5, 21 ],
                    "Ураза-байрам":                                           [ 7, 28 ],
                    "День государственности Кабардино-Балкарской Республики": [ 9, 1 ],
                    "Курбан-байрам":                                          [ 10, 4 ],
                },
            },
            'Altai Republic': {
                'PH': {
                    "1. Новогодние каникулы":           [ 1, 1 ],
                    "2. Новогодние каникулы":           [ 1, 2 ],
                    "3. Новогодние каникулы":           [ 1, 3 ],
                    "4. Новогодние каникулы":           [ 1, 4 ],
                    "5. Новогодние каникулы":           [ 1, 5 ],
                    "6. Новогодние каникулы":           [ 1, 6 ],
                    "Рождество Христово":               [ 1, 7 ],
                    "8. Новогодние каникулы":           [ 1, 8 ],
                    "День защитника Отечества":         [ 2, 23 ],
                    "Международный женский день":       [ 3, 8 ],
                    "День Победы":                      [ 5, 9 ],
                    "Праздник Весны и Труда":           [ 5, 1 ],
                    "День народного единства":          [ 11, 4 ],
                    "День России":                      [ 6, 12 ],
                    // local
                    "Чага-Байрам":                      [ 1, 14 ],
                },
            },
            'Tuva': {
                'PH': {
                    "1. Новогодние каникулы":           [ 1, 1 ],
                    "2. Новогодние каникулы":           [ 1, 2 ],
                    "3. Новогодние каникулы":           [ 1, 3 ],
                    "4. Новогодние каникулы":           [ 1, 4 ],
                    "5. Новогодние каникулы":           [ 1, 5 ],
                    "6. Новогодние каникулы":           [ 1, 6 ],
                    "Рождество Христово":               [ 1, 7 ],
                    "8. Новогодние каникулы":           [ 1, 8 ],
                    "День защитника Отечества":         [ 2, 23 ],
                    "Международный женский день":       [ 3, 8 ],
                    "День Победы":                      [ 5, 9 ],
                    "Праздник Весны и Труда":           [ 5, 1 ],
                    "День народного единства":          [ 11, 4 ],
                    "День России":                      [ 6, 12 ],
                    // local
                    "Народный праздник Шагаа":          [ 1, 14 ],
                    "День Республики Тыва":             [ 8, 15 ],
                },
            },
            'Saratov Oblast': {
                'PH': {
                    "1. Новогодние каникулы":           [ 1, 1 ],
                    "2. Новогодние каникулы":           [ 1, 2 ],
                    "3. Новогодние каникулы":           [ 1, 3 ],
                    "4. Новогодние каникулы":           [ 1, 4 ],
                    "5. Новогодние каникулы":           [ 1, 5 ],
                    "6. Новогодние каникулы":           [ 1, 6 ],
                    "Рождество Христово":               [ 1, 7 ],
                    "8. Новогодние каникулы":           [ 1, 8 ],
                    "День защитника Отечества":         [ 2, 23 ],
                    "Международный женский день":       [ 3, 8 ],
                    "День Победы":                      [ 5, 9 ],
                    "Праздник Весны и Труда":           [ 5, 1 ],
                    "День народного единства":          [ 11, 4 ],
                    "День России":                      [ 6, 12 ],
                    // local
                    "Радоница":                         [ 4, 29 ],
                },
            },
            'Bryansk Oblast': {
                'PH': {
                    "1. Новогодние каникулы":           [ 1, 1 ],
                    "2. Новогодние каникулы":           [ 1, 2 ],
                    "3. Новогодние каникулы":           [ 1, 3 ],
                    "4. Новогодние каникулы":           [ 1, 4 ],
                    "5. Новогодние каникулы":           [ 1, 5 ],
                    "6. Новогодние каникулы":           [ 1, 6 ],
                    "Рождество Христово":               [ 1, 7 ],
                    "8. Новогодние каникулы":           [ 1, 8 ],
                    "День защитника Отечества":         [ 2, 23 ],
                    "Международный женский день":       [ 3, 8 ],
                    "День Победы":                      [ 5, 9 ],
                    "Праздник Весны и Труда":           [ 5, 1 ],
                    "День народного единства":          [ 11, 4 ],
                    "День России":                      [ 6, 12 ],
                    // local
                    "Радоница":                         [ 4, 29 ],
                    "День освобождения города Брянска": [ 9, 17 ],
                },
            },
            'Komi Republic': {
                'PH': {
                    "1. Новогодние каникулы":     [ 1, 1 ],
                    "2. Новогодние каникулы":     [ 1, 2 ],
                    "3. Новогодние каникулы":     [ 1, 3 ],
                    "4. Новогодние каникулы":     [ 1, 4 ],
                    "5. Новогодние каникулы":     [ 1, 5 ],
                    "6. Новогодние каникулы":     [ 1, 6 ],
                    "Рождество Христово":         [ 1, 7 ],
                    "8. Новогодние каникулы":     [ 1, 8 ],
                    "День защитника Отечества":   [ 2, 23 ],
                    "Международный женский день": [ 3, 8 ],
                    "День Победы":                [ 5, 9 ],
                    "Праздник Весны и Труда":     [ 5, 1 ],
                    "День народного единства":    [ 11, 4 ],
                    "День России":                [ 6, 12 ],
                    // local
                    "День Республики Коми":       [ 8, 22 ],
                },
            },
        }, /* }}} */
        'ua': { /* {{{ */
            'PH': { // https://uk.wikipedia.org/wiki/%D0%A1%D0%B2%D1%8F%D1%82%D0%B0_%D1%82%D0%B0_%D0%BF%D0%B0%D0%BC%27%D1%8F%D1%82%D0%BD%D1%96_%D0%B4%D0%BD%D1%96_%D0%B2_%D0%A3%D0%BA%D1%80%D0%B0%D1%97%D0%BD%D1%96
                "Новий рік"                 : [  1,  1 ],
                "Різдво"                    : [  1,  7 ],
                "Міжнародний жіночий день"  : [  3,  8 ],
                "Великдень"                 : [ 'orthodox easter',  1 ],
                "День Праці 1"              : [  5,  1 ],
                "День Праці 2"              : [  5,  2 ],
                "День Перемоги"             : [  5,  9 ],
                "День Конституції України"  : [  6, 28 ],
                "День Незалежності України" : [  8, 24 ],
            }
        }, /* }}} */
        'us': { /* {{{ */
            'PH': { // https://en.wikipedia.org/wiki/Public_holidays_in_the_United_States
                "New Year's Day"   : [ 1, 1 ],
                "Memorial Day"     : [ "lastMayMonday", 0 ],
                "Independence Day" : [ 7, 4 ],
                "Labor Day"        : [ "firstSeptemberMonday", 0 ],
                "Veterans Day"     : [ 11, 11 ],
                "Thanksgiving"     : [ "firstNovemberThursday", 21 ],
                "Christmas Day"    : [ 12, 25 ]
            },
            'Alabama': { /* {{{ */
                'PH': { // http://www.archives.alabama.gov/intro/holidays.html
                    "New Year's Day"                              : [ 1, 1 ],
                    "Robert E. Lee/Martin Luther King Birthday"   : [ "firstJanuaryMonday", 14 ],
                    "George Washington/Thomas Jefferson Birthday" : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                                : [ "lastMayMonday", 0 ],
                    "Independence Day"                            : [ 7, 4 ],
                    "Labor Day"                                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                                : [ 11, 11 ],
                    "Thanksgiving"                                : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"                               : [ 12, 25 ],
                    "Confederate Memorial Day"                    : [ "firstAprilMonday", 21 ],
                    "Jefferson Davis' Birthday"                   : [ "firstJuneMonday", 0 ]
                }
            }, /* }}} */
            'Alaska': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"               : [ 12, 25 ],
                    "Seward's Day"                : [ "lastMarchMonday", 0 ],
                    "Alaska Day"                  : [ 10, 18 ]
                }
            }, /* }}} */
            'Arizona': { /* {{{ */
                'PH': {
                    "New Year's Day"                              : [ 1, 1 ],
                    "Dr. Martin Luther King Jr./Civil Rights Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"                       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                                : [ "lastMayMonday", 0 ],
                    "Independence Day"                            : [ 7, 4 ],
                    "Labor Day"                                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                                : [ 11, 11 ],
                    "Thanksgiving"                                : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"                               : [ 12, 25 ]
                }
            }, /* }}} */
            'Arkansas': { /* {{{ */
                'PH': {
                    "New Year's Day"                                           : [ 1, 1 ],
                    "Dr. Martin Luther King Jr. and Robert E. Lee's Birthdays" : [ "firstJanuaryMonday", 14 ],
                    "George Washington's Birthday and Daisy Gatson Bates Day"  : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                                             : [ "lastMayMonday", 0 ],
                    "Independence Day"                                         : [ 7, 4 ],
                    "Labor Day"                                                : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                                             : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                                             : [ 11, 11 ],
                    "Thanksgiving"                                             : [ "firstNovemberThursday", 21 ],
                    "Christmas Eve"                                            : [ 12, 24 ],
                    "Christmas Day"                                            : [ 12, 25 ]
                }
            }, /* }}} */
            'California': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"               : [ 12, 25 ],
                    "César Chávez Day"            : [ 3, 31 ]
                }
            }, /* }}} */
            'Colorado': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"               : [ 12, 25 ]
                }
            }, /* }}} */
            'Connecticut': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"               : [ 12, 25 ],
                    "Lincoln's Birthday"          : [ 2, 12 ],
                    "Good Friday"                 : [ "easter", -2 ]
                }
            }, /* }}} */
            'Delaware': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Day After Thanksgiving"      : [ "firstNovemberThursday", 22 ],
                    "Christmas Day"               : [ 12, 25 ],
                    "Good Friday"                 : [ "easter", -2 ]
                }
            }, /* }}} */
            'District of Columbia': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"               : [ 12, 25 ],
                    "Emancipation Day"            : [ 4, 16 ]
                }
            }, /* }}} */
            'Florida': { /* {{{ */
                'PH': { // http://www.leg.state.fl.us/Statutes/index.cfm?App_mode=Display_Statute&Search_String=&URL=0100-0199/0110/Sections/0110.117.html
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Friday after Thanksgiving"   : [ "firstNovemberThursday", 22 ],
                    "Christmas Day"               : [ 12, 25 ]
                }
            }, /* }}} */
            'Georgia': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Robert E. Lee's Birthday"    : [ "firstNovemberThursday", 22 ],
                    "Washington's Birthday"       : [ 12, 24 ],
                    "Christmas Day"               : [ 12, 25 ],
                    "Confederate Memorial Day"    : [ "lastAprilMonday", 0 ]
                }
            }, /* }}} */
            'Guam': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Guam Discovery Day"          : [ 3, 5 ],
                    "Good Friday"                 : [ "easter", -2 ],
                    "Liberation Day"              : [ 7, 21 ],
                    "All Souls' Day"              : [ 11, 2 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Lady of Camarin Day"         : [ 12, 8 ],
                    "Christmas Day"               : [ 12, 25 ],
                }
            }, /* }}} */
            'Hawaii': { /* {{{ */
                'PH': {
                    "New Year's Day"                      : [ 1, 1 ],
                    "Martin Luther King, Jr. Day"         : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"               : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                        : [ "lastMayMonday", 0 ],
                    "Independence Day"                    : [ 7, 4 ],
                    "Labor Day"                           : [ "firstSeptemberMonday", 0 ],
                    "Veterans Day"                        : [ 11, 11 ],
                    "Thanksgiving"                        : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"                       : [ 12, 25 ],
                    "Prince Jonah Kuhio Kalanianaole Day" : [ 3, 26 ],
                    "Kamehameha Day"                      : [ 6, 11 ],
                    "Statehood Day"                       : [ "firstAugustFriday", 14 ],
                    "Election Day"                        : [ "firstNovemberMonday", 1 ]
                }
            }, /* }}} */
            'Idaho': { /* {{{ */
                'PH': {
                    "New Year's Day"                                 : [ 1, 1 ],
                    "Martin Luther King, Jr.-Idaho Human Rights Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"                          : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                                   : [ "lastMayMonday", 0 ],
                    "Independence Day"                               : [ 7, 4 ],
                    "Labor Day"                                      : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                                   : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                                   : [ 11, 11 ],
                    "Thanksgiving"                                   : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"                                  : [ 12, 25 ]
                }
            }, /* }}} */
            'Illinois': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"               : [ 12, 25 ],
                    "Lincoln's Birthday"          : [ 2, 12 ],
                    "Casimir Pulaski Day"         : [ "firstMarchMonday", 0 ],
                    "Election Day"                : [ "firstNovemberMonday", 1 ]
                }
            }, /* }}} */
            'Indiana': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Lincoln's Birthday"          : [ "firstNovemberThursday", 22 ],
                    "Christmas Day"               : [ 12, 25 ],
                    "Good Friday"                 : [ "easter", -2 ],
                    "Primary Election Day"        : [ "firstMayMonday", 1 ],
                    "Election Day"                : [ "firstNovemberMonday", 1 ]
                }
            }, /* }}} */
            'Iowa': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"               : [ 12, 25 ],
                    "Lincoln's Birthday"          : [ 2, 12 ]
                }
            }, /* }}} */
            'Kansas': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"               : [ 12, 25 ]
                }
            }, /* }}} */
            'Kentucky': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Eve"               : [ 12, 24 ],
                    "Christmas Day"               : [ 12, 25 ],
                    "New Year's Eve"              : [ 12, 31 ],
                    "Good Friday"                 : [ "easter", -2 ]
                }
            }, /* }}} */
            'Louisiana': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"               : [ 12, 25 ],
                    "Mardi Gras"                  : [ "easter", -47 ],
                    "Good Friday"                 : [ "easter", -2 ],
                    "Election Day"                : [ "firstNovemberMonday", 1 ]
                }
            }, /* }}} */
            'Maine': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"               : [ 12, 25 ],
                    "Patriots' Day"               : [ "firstAprilMonday", 14 ]
                }
            }, /* }}} */
            'Maryland': { /* {{{ */
                'PH': {
                    "New Year's Day"               : [ 1, 1 ],
                    "Martin Luther King, Jr. Day"  : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"        : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                 : [ "lastMayMonday", 0 ],
                    "Independence Day"             : [ 7, 4 ],
                    "Labor Day"                    : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                 : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                 : [ 11, 11 ],
                    "Thanksgiving"                 : [ "firstNovemberThursday", 21 ],
                    "Native American Heritage Day" : [ "firstNovemberThursday", 22 ],
                    "Christmas Day"                : [ 12, 25 ]
                }
            }, /* }}} */
            'Massachusetts': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"               : [ 12, 25 ],
                    "Patriots' Day"               : [ "firstAprilMonday", 14 ]
                }
            }, /* }}} */
            'Michigan': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Eve"               : [ 12, 24 ],
                    "Christmas Day"               : [ 12, 25 ],
                    "New Year's Eve"              : [ 12, 31 ]
                }
            }, /* }}} */
            'Minnesota': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"               : [ 12, 25 ]
                }
            }, /* }}} */
            'Mississippi': { /* {{{ */
                'PH': {
                    "New Year's Day"                                     : [ 1, 1 ],
                    "Martin Luther King's and Robert E. Lee's Birthdays" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"                              : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                                       : [ "lastMayMonday", 0 ],
                    "Independence Day"                                   : [ 7, 4 ],
                    "Labor Day"                                          : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                                       : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                                       : [ 11, 11 ],
                    "Thanksgiving"                                       : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"                                      : [ 12, 25 ],
                    "Confederate Memorial Day"                           : [ "lastAprilMonday", 0 ]
                }
            }, /* }}} */
            'Missouri': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"               : [ 12, 25 ],
                    "Truman Day"                  : [ 5, 8 ]
                }
            }, /* }}} */
            'Montana': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"               : [ 12, 25 ],
                    "Election Day"                : [ "firstNovemberMonday", 1 ],
                    "Christmas Eve"               : [ 12, 24 ],
                    "New Year's Eve"              : [ 12, 31 ]
                }
            }, /* }}} */
            'Nebraska': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"               : [ 12, 25 ],
                    "Arbor Day"                   : [ "lastAprilFriday", 0 ]
                }
            }, /* }}} */
            'Nevada': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"               : [ 12, 25 ],
                    "Nevada Day"                  : [ "lastOctoberFriday", 0 ],
                    "Family Day"                  : [ "firstNovemberThursday", 22 ]
                }
            }, /* }}} */
            'New Hampshire': { /* {{{ */
                'PH': {
                    "New Year's Day"                           : [ 1, 1 ],
                    "Martin Luther King, Jr. Civil Rights Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"                    : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                             : [ "lastMayMonday", 0 ],
                    "Independence Day"                         : [ 7, 4 ],
                    "Labor Day"                                : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                             : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                             : [ 11, 11 ],
                    "Thanksgiving"                             : [ "firstNovemberThursday", 21 ],
                    "Day after Thanksgiving"                   : [ "firstNovemberThursday", 22 ],
                    "Christmas Day"                            : [ 12, 25 ],
                    "Election Day"                             : [ "firstNovemberMonday", 1 ]
                }
            }, /* }}} */
            'New Jersey': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"               : [ 12, 25 ],
                    "Lincoln's Birthday"          : [ 2, 12 ],
                    "Good Friday"                 : [ "easter", -2 ],
                    "Election Day"                : [ "firstNovemberMonday", 1 ]
                }
            }, /* }}} */
            'New Mexico': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Day after Thanksgiving"      : [ "firstNovemberThursday", 22 ],
                    "Christmas Day"               : [ 12, 25 ]
                }
            }, /* }}} */
            'New York': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"               : [ 12, 25 ],
                    "Lincoln's Birthday"          : [ 2, 12 ],
                    "Election Day"                : [ "firstNovemberMonday", 1 ]
                }
            }, /* }}} */
            'North Carolina': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Day after Thanksgiving"      : [ "firstNovemberThursday", 22 ],
                    "Christmas Eve"               : [ 12, 24 ],
                    "Christmas Day"               : [ 12, 25 ],
                    "Day after Christmas"         : [ 12, 26 ],
                    "Good Friday"                 : [ "easter", -2 ]
                }
            }, /* }}} */
            'North Dakota': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"               : [ 12, 25 ]
                }
            }, /* }}} */
            'Ohio': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"               : [ 12, 25 ]
                }
            }, /* }}} */
            'Oklahoma': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Day after Thanksgiving"      : [ "firstNovemberThursday", 22 ],
                    "Christmas Day"               : [ 12, 25 ]
                }
            }, /* }}} */
            'Oregon': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"               : [ 12, 25 ]
                }
            }, /* }}} */
            'Pennsylvania': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"               : [ 12, 25 ],
                    "Flag Day"                    : [ 6, 14 ]
                }
            }, /* }}} */
            'Puerto Rico': { /* {{{ */
                'PH': {
                    "Día de Año Nuevo"                         : [ 1, 1 ],
                    "Día de Reyes"                             : [ 1, 6 ],
                    "Natalicio de Eugenio María de Hostos"     : [ "firstJanuaryMonday", 7 ],
                    "Natalicio de Martin Luther King, Jr."     : [ "firstJanuaryMonday", 14 ],
                    "Día de los Presidentes"                   : [ "firstFebruaryMonday", 14 ],
                    "Día de la Abolición de Esclavitud"        : [ 3, 22 ],
                    "Viernes Santo"                            : [ "easter", -2 ],
                    "Natalicio de José de Diego"               : [ "firstAprilMonday", 14 ],
                    "Recordación de los Muertos de la Guerra"  : [ "lastMayMonday", 0 ],
                    "Día de la Independencia"                  : [ 7, 4 ],
                    "Constitución de Puerto Rico"              : [ 7, 25 ],
                    "Natalicio de Dr. José Celso Barbosa"      : [ 7, 27 ],
                    "Día del Trabajo"                          : [ "firstSeptemberMonday", 0 ],
                    "Día de la Raza Descubrimiento de América" : [ "firstOctoberMonday", 7 ],
                    "Día del Veterano"                         : [ 11, 11 ],
                    "Día del Descubrimiento de Puerto Rico"    : [ 11, 19 ],
                    "Día de Acción de Gracias"                 : [ "firstNovemberThursday", 21 ],
                    "Noche Buena"                              : [ 12, 24 ],
                    "Día de Navidad"                           : [ 12, 25 ]
                }
            }, /* }}} */
            'Rhode Island': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"               : [ 12, 25 ],
                    "Victory Day"                 : [ "firstAugustMonday", 7 ]
                }
            }, /* }}} */
            'South Carolina': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"               : [ 12, 25 ],
                    "Confederate Memorial Day"    : [ 5, 10 ]
                }
            }, /* }}} */
            'South Dakota': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Native American Day"         : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"               : [ 12, 25 ]
                }
            }, /* }}} */
            'Tennessee': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Eve"               : [ 12, 24 ],
                    "Christmas Day"               : [ 12, 25 ],
                    "Good Friday"                 : [ "easter", -2 ]
                }
            }, /* }}} */
            'Texas': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Friday after Thanksgiving"   : [ "firstNovemberThursday", 22 ],
                    "Christmas Eve"               : [ 12, 24 ],
                    "Christmas Day"               : [ 12, 25 ],
                    "Day after Christmas"         : [ 12, 26 ]
                }
            }, /* }}} */
            'United States Virgin Islands': { /* {{{ */
                'PH': {
                    "New Year's Day"                            : [ 1, 1 ],
                    "Martin Luther King, Jr. Day"               : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"                     : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                              : [ "lastMayMonday", 0 ],
                    "Independence Day"                          : [ 7, 4 ],
                    "Labor Day"                                 : [ "firstSeptemberMonday", 0 ],
                    "Virgin Islands-Puerto Rico Friendship Day" : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                              : [ 11, 11 ],
                    "Thanksgiving"                              : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"                             : [ 12, 25 ],
                    "Three Kings Day"                           : [ 1, 6 ],
                    "Transfer Day"                              : [ 3, 31 ],
                    "Holy Thursday"                             : [ "easter", -3 ],
                    "Good Friday"                               : [ "easter", -2 ],
                    "Easter Monday"                             : [ "easter", 1 ],
                    "Emancipation Day"                          : [ 7, 3 ],
                    "Hurricane Supplication Day"                : [ "firstJulyMonday", 21 ],
                    "Hurricane Thanksgiving"                    : [ 10, 25 ],
                    "Liberty Day"                               : [ 11, 1 ],
                    "Christmas Second Day"                      : [ 12, 26 ],
                    "New Year's Eve"                            : [ 12, 31 ]
                }
            }, /* }}} */
            'Utah': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"               : [ 12, 25 ],
                    "Pioneer Day"                 : [ 7, 24 ]
                }
            }, /* }}} */
            'Vermont': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"               : [ 12, 25 ],
                    "Town Meeting Day"            : [ "firstMarchTuesday", 0 ],
                    "Battle of Bennington"        : [ "firstAugustMonday", 14 ]
                }
            }, /* }}} */
            'Virginia': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Lee-Jackson Day"             : [ "firstJanuaryMonday", 11 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"               : [ 12, 25 ]
                }
            }, /* }}} */
            'Washington': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"               : [ 12, 25 ]
                }
            }, /* }}} */
            'West Virginia': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"               : [ 12, 25 ],
                    "West Virginia Day"           : [ 6, 20 ],
                    "Lincoln's Day"               : [ "firstNovemberThursday", 22 ]
                }
            }, /* }}} */
            'Wisconsin': { /* {{{ */
                'PH': { // http://docs.legis.wisconsin.gov/statutes/statutes/995/20
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"               : [ 12, 25 ],
                    "Primary Election Day"        : [ "firstAugustTuesday", 7 ],
                    "Election Day"                : [ "firstNovemberMonday", 1 ]
                }
            }, /* }}} */
            'Wyoming': { /* {{{ */
                'PH': {
                    "New Year's Day"              : [ 1, 1 ],
                    "Martin Luther King, Jr. Day" : [ "firstJanuaryMonday", 14 ],
                    "Washington's Birthday"       : [ "firstFebruaryMonday", 14 ],
                    "Memorial Day"                : [ "lastMayMonday", 0 ],
                    "Independence Day"            : [ 7, 4 ],
                    "Labor Day"                   : [ "firstSeptemberMonday", 0 ],
                    "Columbus Day"                : [ "firstOctoberMonday", 7 ],
                    "Veterans Day"                : [ 11, 11 ],
                    "Thanksgiving"                : [ "firstNovemberThursday", 21 ],
                    "Christmas Day"               : [ 12, 25 ]
                }
            } /* }}} */
        }, /* }}} */
        'si': { /* {{{ */
            'PH': { // http://www.vlada.si/o_sloveniji/politicni_sistem/prazniki/
                'novo leto'                                 : [  1,  1 ],
                'Prešernov dan, slovenski kulturni praznik' : [  2,  8 ],
                'velikonočna nedelja'                       : [ 'easter',  0 ],
                'velikonočni ponedeljek'                    : [ 'easter',  1 ],
                'dan upora proti okupatorju'                : [  4,  27 ],
                'praznik dela 1'                            : [  5, 1 ],
                'praznik dela 2'                            : [  5, 2 ],
                'binkoštna nedelja - binkošti'              : [ 'easter',  49 ],
                'dan državnosti'                            : [  6, 25 ],
                'Marijino vnebovzetje'                      : [  8, 15 ],
                'dan reformacije'                           : [ 10, 31 ],
                'dan spomina na mrtve'                      : [ 11,  1 ],
                'božič'                                     : [ 12, 25 ],
                'dan samostojnosti in enotnosti'            : [ 12, 26 ]
            }
        }, /* }}} */
        'it': { /* {{{ */
            'PH': { // http://www.governo.it/Presidenza/ufficio_cerimoniale/cerimoniale/giornate.html
                'Capodanno'                                 : [  1,  1 ],
                'Epifania'                                  : [  1,  6 ],
                'Liberazione dal nazifascismo (1945)'       : [  4, 25 ],
                'Pasqua'                                    : [ 'easter',  0 ],
                'Lunedì di Pasqua'                          : [ 'easter',  1 ],
                'Festa del lavoro'                          : [  5, 1 ],
                'Festa della Repubblica'                    : [  6, 2 ],
                'Assunzione di Maria'                       : [  8, 15 ],
                'Ognissanti'                                : [ 11,  1 ],
                'Festa dell’unità nazionale'                : [ 'firstSeptemberSunday', 0 ],
                'Immacolata Concezione'                     : [ 12,  8 ],
                'Natale di Gesù'                            : [ 12, 25 ],
                'Santo Stefano'                             : [ 12, 26 ],
            },
        }, /* }}} */
        'cz': { /* {{{ */
            'PH': { // http://www.mpsv.cz/cs/74 or english: https://en.wikipedia.org/wiki/Public_holidays_in_the_Czech_Republic
                'Den obnovy samostatného českého státu'          : [  1,  1 ],
                'Velikonoční pondělí'                            : [ 'easter',  1 ],
                'Svátek práce'                                   : [  5,  1 ],
                'Den vítězství'                                  : [  5,  8 ],
                'Den slovanských věrozvěstů Cyrila a Metoděje'   : [  7,  5 ],
                'Den upálení mistra Jana Husa'                   : [  7,  6 ],
                'Den české státnosti'                            : [  9, 28 ],
                'Den vzniku samostatného československého státu' : [ 10, 28 ],
                'Den boje za svobodu a demokracii'               : [ 11, 17 ],
                'Štědrý den'                                     : [ 12, 24 ],
                '1. svátek vánoční'                              : [ 12, 25 ],
                '2. svátek vánoční'                              : [ 12, 26 ],
            },
        }, /* }}} */
        'ro': { /* {{{ */
            'PH': { // https://ro.wikipedia.org/wiki/S%C4%83rb%C4%83tori_publice_%C3%AEn_Rom%C3%A2nia#Zile_oficiale_de_s.C4.83rb.C4.83toare_.C3.AEn_care_nu_se_lucreaz.C4.83
                'Anul Nou'                                       : [  1,  1 ],
                'A doua zi de Anul Nou'                          : [  1,  2 ],
                'Ziua Unirii Principatelor Române (Ziua Unirii)' : [  1,  24 ],
                'Paștele ortodox'                                : [ 'orthodox easter',  0 ],
                'A doua zi de Paște ortodox'                     : [ 'orthodox easter',  1 ],
                'Ziua Muncii'                                    : [  5, 1 ],
                'Rusaliile'                                      : [ 'orthodox easter', 50 ],
                'A doua zi de Rusalii'                           : [ 'orthodox easter', 51 ],
                'Adormirea Maicii Domnului'                      : [  8, 15 ],
                'Sfântul Apostol Andrei'                         : [ 11, 30 ],
                'Ziua Națională (Ziua Marii Uniri)'              : [ 12,  1 ],
                'Crăciunul'                                      : [ 12, 25 ],
                'A doua zi de Crăciun'                           : [ 12, 26 ],
            },
            'SH': [
                {
                    name: 'Vacanţa intersemestrială',
                    2015: [  1, 31, /* to */  2,  8 ],
                    2016: [  1, 30, /* to */  2,  7 ],
                },
                {
                    name: 'Vacanța de primăvară',
                    2015: [  4, 11, /* to */  4, 19 ],
                    2016: [  4, 23, /* to */  5,  3 ],
                },
                {
                    name: 'Vacanța de vară',
                    2015: [  6, 20, /* to */  9, 13 ],
                    2016: [  6, 18, /* to */  9,  4 ],
                },
                {
                    name: 'Vacanța de iarnă',
                    2014: [ 12, 20, /* to */  1,  4 ],
                    2015: [ 12, 19, /* to */  1,  3 ],
                },
            ],
        }, /* }}} */
    };
    /* }}} */

    // error correction {{{
    // Initially taken form http://www.netzwolf.info/j/osm/time_domain.js
    // Credits go to Netzwolf.
    //
    // Key to word_error_correction is the token name except wrong_words
    var word_error_correction = {
        wrong_words: { /* {{{ */
            'Assuming "<ok>" for "<ko>".': {
                'daytime': 'sunrise-sunset',
                'spring':  'Mar-May',
                'summer':  'Jun-Aug',
                'autumn':  'Sep-Nov',
                'winter':  'Dec-Feb',
                '_': '-',
                '=': '-',
            }, '"<ko>" wird als "<ok>" interpertiert.': {
                'frühling': 'Mar-May',
                'frühjahr': 'Mar-May',
                'sommer':   'Jun-Aug',
                'herbst':   'Sep-Nov',
                // 'winter':  'Dec-Feb', // Same as in English.
                // 'morning': '08:00-12:00',
                // 'evening': '13:00-18:00',
            }, 'Bitte benutze die englische Schreibweise "<ok>" für "<ko>".': {
                'werktags?': 'Mo-Fr',
            }, 'Bitte benutze "<ok>" für "<ko>". Beispiel: "Mo-Fr 08:00-12:00; Tu off".': {
                'ruhetage?':   'off',
                'geschlossen': 'off',
                'geschl':      'off',
                // 'ausser':      'off',
                // 'außer':       'off',
            }, 'Neem de engelse afkorting "<ok>" voor "<ko>" alstublieft.': {
                'gesloten':   'off',
                'feestdag':   'PH',
                'feestdagen': 'PH',
            }, 'Assuming "<ok>" for "<ko>". Please avoid using "workday": https://wiki.openstreetmap.org/wiki/Talk:Key:opening_hours#need_syntax_for_holidays_and_workingdays': {
                // Used around 260 times but the problem is, that work day might be different in other countries.
                'wd':            'Mo-Fr',
                'on work days?': 'Mo-Fr',
                'weekdays?':     'Mo-Fr',
                'vardagar':      'Mo-Fr',
            }, 'Please use something like "Mo off" instead "<ko>".': {
                'except': 'off',
            }, 'Please omit "<ko>" or use a colon instead: "12:00-14:00".': {
                'h': '',
            }, 'Please omit "<ko>".': {
                'season': '',
                'hs':     '',
                'hrs':    '',
                'hours':  '',
                // '·':      '', // Sometimes used to separate opening hours (on websites).
            }, 'Please omit "<ko>". The key must not be in the value.': {
                'opening_hours\\s*=': '',
            }, 'Please omit "<ko>". You might want to express open end which can be specified as "12:00+" for example.': {
                'from': '',
            }, 'You can use notation "<ok>" for "<ko>" in the case that you want to express open end times. Example: "12:00+".': {
                '(:?bis|till?|-|–)? ?(?:open ?end|late)': '+',
            }, 'Please use notation "<ok>" for "<ko>". If the times are unsure or vary consider a comment e.g. 12:00-14:00 "only on sunshine".': {
                '~':  '-',
                '～': '-',
            }, 'Please use notation "<ok>" for "<ko>". Fallback rule: 12:00-14:00 || "call us"': {
                'otherwise':  '||',
            }, 'You can use notation "<ok>" for "?" temporally if the syntax will still be valid.': {
                '\\?':  'unknown "please add this if known"',
            }, 'Please use notation "<ok>" for "<ko>". Although using "–" is typographical correct, the opening_hours syntax is defined with the normal hyphen. Correct typography should be done on application level …': {
                '–':  '-',
            }, 'Please use notation "<ok>" for "<ko>".': {
                '→':               '-',
                '−':               '-',
                '—':               '-',
                'ー':              '-',
                'to':              '-',
                'до':              '-',
                'a':               '-', // language unknown
                'as':              '-', // language unknown
                'á':               '-', // language unknown
                'ás':              '-', // language unknown
                'às':              '-', // language unknown
                'ate':             '-', // language unknown
                'till?':           '-',
                'until':           '-',
                'through':         '-',
                'and':             ',',
                '&':               ',',
                // '/':               ',', // Can not be corrected as / is a valid token
                '：':              ':',
                '°°':              ':00',
                'always':          '24/7',
                'always open':     '24/7',
                'always closed':   'closed',
                'nonstop':         '24/7',
                '24x7':            '24/7',
                'anytime':         '24/7',
                'all day':         '24/7',
                'daily':           'Mo-Su',
                'everyday':        'Mo-Su',
                'every day':       'Mo-Su',
                'all days':        'Mo-Su',
                '7j/7':            'Mo-Su', // I guess that it means that
                '7/7':             'Mo-Su', // I guess that it means that
                /* {{{
                 * Fixing this causes to ignore the following warning: "There should be no
                 * reason to differ more than 6 days from a constrained
                 * weekdays. If so tell us …".
                 * The following mistake is expected to occur more often.
                 */
                '7days':           'Mo-Su',
                '7 days':          'Mo-Su',
                /* }}} */
                '7 days a week':   'Mo-Su',
                '7 days/week':       'Mo-Su',
                '24 hours 7 days a week':   '24/7',
                '24 hours':            '00:00-24:00',
                'midday':           '12:00',
                'midnight':         '00:00',
                '(?:public )?holidays?': 'PH',
                '(?:one )?day after public holiday':  'PH +1 day',
                '(?:one )?day before public holiday': 'PH -1 day',
                'school ?holidays?': 'SH',
                /* Not implemented {{{ */
                // 'day after school holiday':      'SH +1 day',
                // 'one day after school holiday':  'SH +1 day',
                // 'day before school holiday':     'SH -1 day',
                // 'one day before school holiday': 'SH -1 day',
                /* }}} */
                'weekends?':       'Sa,Su',
                'daylight':        'sunrise-sunset',
                '(?:on|by)?(?:_| )?appointments?':  '"on appointment"',
            }, 'Please use notation "<ok>" for "<ko>". Those characters look very similar but are not the same!': {
                'оff':             'off', // Russian o
            }, 'Please use time format in 24 hours notation ("<ko>"). If PM is used you might have to convert the hours to the 24 hours notation.': {
                'pm': '',
                'рм': '',
                'am': '',
                'ам': '',
            }, 'Bitte verzichte auf "<ko>".': {
                'uhr': '',
                'geöffnet': '',
                'zwischen': '',
                'ist': '',
                'durchgehend': '',
                'öffnungszeit(?:en)?:?': '',
            }, 'Bitte verzichte auf "<ko>". Sie möchten eventuell eine Öffnungszeit ohne vorgegebenes Ende (Open End) angeben. Beispiel: "12:00+"': {
                'ab':  '',
                'von': '',
            }, 'Es sieht so aus also möchten Sie zusätzliche Einschränkungen für eine Öffnungszeit geben. Falls sich dies nicht mit der Syntax ausdrücken lässt können Kommentare verwendet werden. Zusätzlich sollte eventuell das Schlüsselwort `open` benutzt werden. Bitte probiere "<ok>" für "<ko>".': {
                'damen':  'open "Damen"',
                'herren': 'open "Herren"',
            }, 'Bitte benutze die Schreibweise "<ok>" für "<ko>".': {
                'bis':         '-',
                'täglich':     'Mo-Su',
                '(?:schul)?ferien': 'SH',
                '(?:an|nur)? ?sonn-?(?: und |/)feiertag(?:s|en?)?': 'PH,Su',
                'nach(?: |_)vereinbarung':   '"Nach Vereinbarung"',
                'nach(?: |_)absprache':      '"Nach Absprache"',
            }, 'Bitte benutze die Schreibweise "<ok>" für "<ko>". Es ist war typografisch korrekt aber laut der Spezifikation für opening_hours nicht erlaubt. Siehe auch: https://wiki.openstreetmap.org/wiki/DE:Key:opening_hours/specification.': {
                '„': '"',
                '“': '"',
                '”': '"',
            }, 'Please use notation "<ok>" for "<ko>". The used quote signs might be typographically correct but are not defined in the specification. See https://wiki.openstreetmap.org/wiki/Key:opening_hours/specification.': {
                '«': '"',
                '»': '"',
                '‚': '"',
                '‘': '"',
                '’': '"',
                '「': '"',
                '」': '"',
                '『': '"',
                '』': '"',
            }, 'Please use notation "<ok>" for "<ko>". The used quote signs are not defined in the specification. See https://wiki.openstreetmap.org/wiki/Key:opening_hours/specification.': {
                "'": '"',
            }, 'You might want to use comments instead of brackets (which are not valid in this context). If you do, replace "<ok>" with "<ko>".': {
                // '（': '"',
                // '）': '"',
            }, 'Bitte benutze die Schreibweise "<ok>" als Ersatz für "<ko>".': {
                'und':  ',',
                'u':    ',',
                'auch': ',',
            }, 'Bitte benutze die englische Abkürzung "<ok>" für "<ko>".': {
                '(?:an )?feiertag(?:s|en?)?': 'PH',
            }, 'S\'il vous plaît utiliser "<ok>" pour "<ko>".': {
                'fermé':        'off',
                'et':           ',',
                'à':            '-',
                'jours fériés': 'PH',
            }
        }, /* }}} */

        month: { /* {{{ */
            'default': {
                'jan':  0,
                'feb':  1,
                'mar':  2,
                'apr':  3,
                'may':  4,
                'jun':  5,
                'jul':  6,
                'aug':  7,
                'sep':  8,
                'oct':  9,
                'nov': 10,
                'dec': 11,
            }, 'Please use the English abbreviation "<ok>" for "<ko>".': {
                'jänner':     0, // Austria
                'january':    0,
                'february':   1,
                'march':      2,
                'april':      3,
                // 'may':     4,
                'june?':       5,
                'july?':       6,
                'august':     7,
                'september':  8,
                'sept':       8,
                'october':    9,
                'november':  10,
                'december':  11,
            }, 'Bitte benutze die englische Abkürzung "<ok>" für "<ko>".': {
                'januar':    0,
                'februar':   1,
                'märz?':     2,
                'maerz':     2,
                'mai':       4,
                'juni':      5,
                'juli':      6,
                'okt':       9,
                'oktober':   9,
                'dez':      11,
                'dezember': 11,
            }, 'S\'il vous plaît utiliser l\'abréviation "<ok>" pour "<ko>".': {
                'janvier':    0,
                'février':    1,
                'fév':        1,
                'mars':       2,
                'avril':      3,
                'avr':        3,
                'mai':        4,
                'juin':       5,
                'juillet':    6,
                'août':       7,
                'aoû':        7,
                'septembre':  8,
                'octobre':    9,
                'novembre':  10,
                'décembre':  11,
            }, 'Neem de engelse afkorting "<ok>" voor "<ko>" alstublieft.': {
                'januari':  0,
                'februari': 1,
                'maart':    2,
                'mei':      4,
                'augustus': 7,
            }
        }, /* }}} */

        calcday: {
            'default': {
                'day':  'day',
                'days': 'days',
            },
        },

        weekday: { /* {{{ Good source: http://www.omniglot.com/language/time/days.htm */
            'default': {
                'su': 0,
                'mo': 1,
                'tu': 2,
                'we': 3,
                'th': 4,
                'fr': 5,
                'sa': 6,
            }, 'Assuming "<ok>" for "<ko>"': {
                'm':          1,
                'w':          3,
                'f':          5,
            }, 'Please use the abbreviation "<ok>" for "<ko>".': {
                'sun':         0,
                'sundays?':    0,
                'mon':         1,
                'mondays?':    1,
                'tues?':       2, // Used here:  http://www.westerhambeauty.co.uk/contact.php
                'tuesdays?':   2,
                'weds?':       3,
                'wednesdays?': 3,
                'thu':         4,
                'thurs?':      4,
                'thursdays?':  4,
                'fri':         5,
                'fridays?':    5,
                'sat':         6,
                'saturdays?':  6,
            }, 'Bitte benutze die englische Abkürzung "<ok>" für "<ko>". Could also mean Saturday in Polish …': {
                'so':         0,
            }, 'Bitte benutze die englische Abkürzung "<ok>" für "<ko>".': {
                'son':          0,
                'sonn-':        0,
                'sonntags?':    0,
                'montags?':     1,
                'di':           2,
                'die?':         2,
                'dienstags?':   2,
                'mi':           3,
                'mit?':         3,
                'mittwochs?':   3,
                'don?':         4,
                'donnerstags?': 4,
                'fre':          5,
                'freitags?':    5,
                'sam':          6,
                'samstags?':    6,
            }, 'S\'il vous plaît utiliser l\'abréviation "<ok>" pour "<ko>".': {
                'dim':       0,
                'dimanche':  0,
                'lun?':      1,
                'lundi':     1,
                'mardi':     2,
                'mer':       3,
                'mercredi':  3,
                'jeu?':      4,
                'jeudi':     4,
                'ven?':      5,
                'vendredi':  5,
                'samedi':    6,
            }, 'Neem de engelse afkorting "<ok>" voor "<ko>" alstublieft.': {
                'zon?':      0,
                'zontag':    0, // correct?
                'zondag':    0,
                'maandag':   1,
                'din':       2,
                'dinsdag':   2,
                'woe?':      3,
                'woensdag':  3,
                'donderdag': 4,
                'vri?':      5,
                'vrijdag':   5,
                'zat?':      6,
                'zaterdag':  6,
            }, 'Please use the English abbreviation "<ok>" for "<ko>".': { // FIXME: Translate to Czech.
                'neděle':  0,
                'ne':      0,
                'pondělí': 1,
                'po':      1,
                'úterý':   2,
                'út':      2,
                'středa':  3,
                'st':      3,
                'čtvrtek': 4,
                'čt':      4,
                'pátek':   5,
                'pá':      5,
                'sobota':  6,
            }, 'Please use the English abbreviation "<ok>" (Spanish) for "<ko>".': {
                'martes':    0,
                'miércoles': 1,
                'jueves':    2,
                'viernes':   3,
                'sábado':    4,
                'domingo':   5,
                'lunes':     6,
            }, 'Please use the English abbreviation "<ok>" (Indonesian) for "<ko>".': {
                'selasa': 0,
                'rabu':   1,
                'kami':   2,
                'jumat':  3,
                'sabtu':  4,
                'minggu': 5,
                'senin':  6,
            }, 'Please use the English abbreviation "<ok>" (Swedish) for "<ko>".': {
                'söndag':   0,
                'söndagar': 0,
                'måndag':   1,
                'ma':       1,
                'tisdag':   2,
                'onsdag':   3, // Same in Danish
                'torsdag':  4,
                'fredag':   5,
                'lördag':   6,
                'lördagar': 6,
            }, 'Please use the English abbreviation "<ok>" (Polish) for "<ko>".': {
                'niedziela':     0,
                'niedz':         0,
                'n':             0,
                'ndz':           0,
                'poniedziałek':  1,
                'poniedzialek':  1,
                'pon':           1,
                'pn':            1,
                'wtorek':        2,
                'wt':            2,
                'środa':         3,
                'sroda':         3,
                'śr':            3,
                'sr':            3,
                'czwartek':      4,
                'czw':           4,
                'cz':            4,
                'piątek':        5,
                'piatek':        5,
                'pt':            5,
                'sobota':        6,
                'sob':           6,
                // 'so':         6 // abbreviation also used in German
            }, 'Please use the English abbreviation "<ok>" (Russian) for "<ko>".': {
                'воскресенье' : 0,
                'Вс'          : 0,
                "voskresen'ye": 0,
                'понедельник' : 1,
                'Пн'          : 1,
                "ponedel'nik" : 1,
                'вторник'     : 2,
                'vtornik'     : 2,
                'среда'       : 3,
                'sreda'       : 3,
                'четверг'     : 4,
                'chetverk'    : 4,
                'пятница'     : 5,
                'pyatnitsa'   : 5,
                'суббота'     : 6,
                'subbota'     : 6,
            }, 'Please use the English abbreviation "<ok>" (Danish) for "<ko>".': {
                'søndag' : 0,
                'mandag' : 1,
                'tirsdag': 2,
                'onsdag' : 3, // Same in Swedish
                'torsdag': 4,
                'fredag' : 5,
                'lørdag' : 6,
            },
        }, /* }}} */

        timevar: { /* {{{ Special time variables which actual value depends on the date and the position of the facility. */
            'default': {
                'sunrise': 'sunrise',
                'sunset':  'sunset',
                'dawn':    'dawn',
                'dusk':    'dusk',
            }, 'Please use notation "<ok>" for "<ko>".': {
                'sundown':  'sunset',
            }, 'Bitte benutze die Schreibweise "<ok>" für "<ko>".': {
                'morgendämmerung': 'dawn',
                'abenddämmerung':  'dusk',
                'sonnenaufgang':   'sunrise',
                'sonnenuntergang': 'sunset',
            },
        }, /* }}} */

        'event': { // variable events
            'default': {
                'easter': 'easter',
            }, 'Bitte benutze die Schreibweise "<ok>" für "<ko>".': {
                'ostern': 'easter',
            },
        },
    };
    /* }}} */

    /* error and warning messages {{{ */
    var lang = {
        'unexpected token': 'Unexpected token: "__token__" This means that the syntax is not valid at that point or it is currently not supported.',
        'no string': 'The value (first parameter) is not a string.',
        'nothing': 'The value contains nothing meaningful which can be parsed.',
        'nothing useful': 'This rule does not contain anything useful. Please remove this empty rule.',
        'programmers joke': 'Might it be possible that you are a programmer and adding a semicolon after each statement is hardwired in your muscle memory ;) ?'
            + ' The thing is that the semicolon in the opening_hours syntax is defined as rule separator.'
            + ' So for compatibility reasons you should omit this last semicolon.',
        'interpreted as year': 'The number __number__ will be interpreted as year.'
            + ' This is probably not intended. Times can be specified as "12:00".',
        'rule before fallback empty': 'Rule before fallback rule does not contain anything useful',
        'hour min separator': 'Please use ":" as hour/minute-separator',
        'warnings severity': 'The parameter optional_conf_parm["warnings_severity"] must be an integer number between 0 and 7 (inclusive).'
            + ' Given __severity__'
            + ', expected one of the following numbers: __allowed__.',
        'optional conf parm type': 'The optional_conf_parm parameter is of unknown type.'
            + ' Given __given__',
        'conf param tag key missing': 'The optional_conf_parm["tag_key"] is missing, required by optional_conf_parm["map_value"].',
        'conf param mode invalid': 'The optional_conf_parm["mode"] parameter is a invalid number.'
            + ' Gave __given__'
            + ', expected one of the following numbers: __allowed__.',
        'conf param unkown type': 'The optional_conf_parm["__key__"] parameter is of unknown type.'
            + ' Given __given__'
            + ', expected __expected__.',
        'library bug': 'An error occurred during evaluation of the value "__value__".'
            + ' Please file a bug report or pull request: __url__.__message__',
        'library bug PR only': 'An error occurred during evaluation of the value "__value__".'
            + ' Please submit a pull request: __url__.__message__',
        'use multi': 'You have used __count__ __part2__ Rules can be separated by ";".',
        'selector multi 2a': '__what__ in one rule. You may only use one in one rule.',
        'selector multi 2b': 'not connected __what__ in one rule. This is probably an error.'
            + ' Equal selector types can (and should) always be written in conjunction separated by comma.'
            + ' Example for time ranges "12:00-13:00,15:00-18:00".'
            + ' Example for weekdays "Mo-We,Fr".',
        'selector state': 'state keywords',
        'comments': 'comments',
        'holiday ranges': 'holiday ranges',
        'months': 'months',
        'weekdays': 'weekdays',
        'ranges': 'ranges',
        'default state': "This rule which changes the default state (which is closed) for all following rules is not the first rule."
            + " The rule will overwrite all previous rules."
            + " It can be legitimate to change the default state to open for example"
            + " and then only specify for which times the facility is closed.",
        'vague': "This rule is not very explicit because there is no time selector being used."
            + " Please add a time selector to this rule or use a comment to make it more explicit.",
        'empty comment': "You have used an empty comment."
            + " Please either write something in the comment or use the keyword unknown instead.",
        'separator_for_readability': "You have used the optional symbol <separator_for_readability> in the wrong place."
            + " Please check the syntax specification to see where it could be used or remove it.",
        'strange 24/7': 'You used 24/7 in a way that is probably not interpreted as "24 hours 7 days a week".'
            + ' For correctness you might want to use "open" or "closed"'
            + ' for this rule and then write your exceptions which should achieve the same goal and is more clear'
            + ' e.g. "open; Mo 12:00-14:00 off".',
        'public holiday': 'There was no PH (public holiday) specified. This is not very explicit.__part2__'
            + ' Please either append a "PH off" rule if the amenity is closed on all public holidays'
            + ' or use something like "Sa,Su,PH 12:00-16:00" to say that on Saturdays, Sundays and on public holidays the amenity is open 12:00-16:00.'
            + ' If the amenity is open everyday including public holidays then you can make this explicit by writing "Mo-Su,PH".'
            + ' If you are not certain try to find it out. If you can’t then do not add PH to the value and ignore this warning.',
        'public holiday part2': ' Unfortunately the tag key (e.g. "opening_hours", or "lit") is unknown to opening_hours.js. '
            + 'This warning only applies to the key __keys__. If your value is for that key than read on. If not you can ignore the following.',
        'switched': 'The selector "__first__" was switched with'
            + ' the selector "__second__"'
            + ' for readablitity and compatibiltity reasons.',
        'no colon after': 'Please don’t use ":" after __token__.',
        'number -5 to 5': 'Number between -5 and 5 (except 0) expected.',
        'one weekday constraint': 'You can not use more than one constrained weekday in a month range',
        'range constrained weekdays': 'You can not use a range of constrained weekdays in a month range',
        'expected': '"__symbol__" expected.',
        'range zero': 'You can not use __type__ ranges with period equals zero.',
        'period one year+': 'Please don’t use __type__ ranges with period equals one.'
            + ' If you want to express that a facility is open starting from a year without limit use "<year>+".',
        'period one': 'Please don’t use __type__ ranges with period equals one.',
        'month 31': "The day for __month__ must be between 1 and 31.",
        'month 30': "Month __month__ doesn't have 31 days. The last day of __month__ is day 30.",
        'month feb': 'Month __month__ either has 28 or 29 days (leap years).',
        'point in time': 'hyphen (-) or open end (+) in time range __calc__expected.'
            + ' For working with points in time, the mode for __libraryname__ has to be altered.'
            + ' Maybe wrong tag?',
        'calculation': 'calculation',
        'time range continue': 'Time range does not continue as expected',
        'period continue': 'Time period does not continue as expected. Example "/01:30".',
        'time range mode': '__libraryname__ is running in "time range mode". Found point in time.',
        'point in time mode': '__libraryname__ is running in "points in time mode". Found time range.',
        'outside current day': 'Time range starts outside of the current day',
        'two midnights': 'Time spanning more than two midnights not supported',
        'without minutes': 'Time range without minutes specified. Not very explicit!'
            + ' Please use this syntax instead "__syntax__".',
        'outside day': 'Time range starts outside of the current day',
        'zero calculation': 'Adding zero in a variable time calculation does not change the variable time.'
            + ' Please omit the calculation (example: "sunrise-(sunset-00:00)").',
        'calculation syntax': 'Calculation with variable time is not in the right syntax',
        'missing': 'Missing "__symbol__"',
        '(time)': '(time)',
        'bad range': 'Bad range: __from__-__to__',
        '] or more numbers': '"]" or more numbers expected.',
        'additional rule no sense': 'An additional rule does not make sense here. Just use a ";" as rule separator.'
            + ' See https://wiki.openstreetmap.org/wiki/Key:opening_hours/specification#explain:additional_rule_separator',
        'unexpected token weekday range': 'Unexpected token in weekday range: __token__',
        'max differ': 'There should be no reason to differ more than __maxdiffer__ days from a __name__. If so tell us …',
        'adding 0': 'Adding 0 does not change the date. Please omit this.',
        'unexpected token holiday': 'Unexpected token (holiday parser): __token__',
        'no holiday defintion': 'There are no holidays (__name__) defined for country __cc__.',
        'no holiday defintion state': 'There are no holidays (__name__) defined for country __cc__ and state __state__.',
        'no country code': 'Country code missing which is needed to select the correct holidays (see README how to provide it)',
        'movable no formular': 'Movable day __name__ can not not be calculated.'
            + ' Please add the formula how to calculate it.',
        'movable not in year': 'The movable day __name__ plus __days__'
            + ' days is not in the year of the movable day anymore. Currently not supported.',
        'year range one year': 'A year range in which the start year is equal to the end year does not make sense.'
            + ' Please remove the end year. E.g. "__year__ May 23"',
        'year range reverse': 'A year range in which the start year is greater than the end year does not make sense.'
            + ' Please turn it over.',
        'year past': 'The year is in the past.',
        'unexpected token year range': 'Unexpected token in year range: __token__',
        'week range reverse': 'You have specified a week range in reverse order or leaping over a year. This is (currently) not supported.',
        'week negative': 'You have specified a week date less then one. A valid week date range is 1-53.',
        'week exceed': 'You have specified a week date greater then 53. A valid week date range is 1-53.',
        'week period less than 2': 'You have specified a week period which is less than two.'
            + ' If you want to select the whole range from week __weekfrom__ to week __weekto__ then just omit the "/__period__".',
        'week period greater than 26': 'You have specified a week period which is greater than 26.'
            + ' 26.5 is the half of the maximum 53 week dates per year so a week date period greater than 26 would only apply once per year.'
            + ' Please specify the week selector as "week __weekfrom__" if that is what you want to express.',
        'unexpected token week range': 'Unexpected token in week range: __token__',
        'unexpected token month range': 'Unexpected token in month range: __token__',
        'day range reverse': 'Range in wrong order. From day is greater than to day.',
        'open end': 'Specified as open end. Closing time was guessed.',
        'date parameter needed': 'Date parameter needed.',
    }
    /* }}} */
    /* }}} */

    // make the library accessible for the outside world {{{
    if (typeof exports === 'object') {
        var moment, SunCalc, i18n;
        // For Node.js.
        SunCalc = root.SunCalc || require('suncalc');
        try { // as long as it is an optional dependency
            moment = root.moment || require('moment');
        } catch (error_pass) { error_pass }
        try { // as long as it is an optional dependency
            i18n = require('./locales/core');
        } catch (error_pass) { error_pass }
        module.exports = factory(SunCalc, moment, i18n, holiday_definitions, word_error_correction, lang);
    } else {
        // For browsers.
        root.opening_hours = factory(root.SunCalc, root.moment, root.i18n, holiday_definitions, word_error_correction, lang);
    }
    //* }}} */
}(this, function (SunCalc, moment, i18n, holiday_definitions, word_error_correction, lang) {

    return function(value, nominatim_object, optional_conf_parm) {
        // short constants {{{
        var word_value_replacement = { // If the correct values can not be calculated.
            dawn    : 60 * 5 + 30,
            sunrise : 60 * 6,
            sunset  : 60 * 18,
            dusk    : 60 * 18 + 30,
        };
        var months   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var weekdays = ['Su','Mo','Tu','We','Th','Fr','Sa'];
        var default_prettify_conf = {
            // Update README.md if changed.
            'zero_pad_hour': true,           // enforce ("%02d", hour)
            'one_zero_if_hour_zero': false,  // only one zero "0" if hour is zero "0"
            'leave_off_closed': true,        // leave keywords "off" and "closed" as is
            'keyword_for_off_closed': 'off', // use given keyword instead of "off" or "closed"
            'rule_sep_string': ' ',          // separate rules by string
            'print_semicolon': true,         // print token which separates normal rules
            'leave_weekday_sep_one_day_betw': true, // use the separator (either "," or "-" which is used to separate days which follow to each other like Sa,Su or Su-Mo
            'sep_one_day_between': ',',      // separator which should be used
            'zero_pad_month_and_week_numbers': false, // Format week (e.g. `week 01`) and month day numbers (e.g. `Jan 01`) with "%02d".
            'locale': 'en',                  // use local language (needs moment.js / i18n.js)
        };

        var osm_tag_defaults = {
            'opening_hours'       :  { 'mode' :  0, 'warn_for_PH_missing' :  true, },
            'collection_times'    :  { 'mode' :  2, },
            /* oh_mode 2: "including the hyphen because there are post boxes which are
             * emptied several (undefined) times or one (undefined) time in a certain time
             * frame. This shall be covered also.".
             * Ref: https://wiki.openstreetmap.org/wiki/Key:collection_times */
            'opening_hours:.+'    :  { 'mode' :  0, },
            '.+:opening_hours'    :  { 'mode' :  0, },
            '.+:opening_hours:.+' :  { 'mode' :  0, },
            'smoking_hours'       :  { 'mode' :  0, },
            'service_times'       :  { 'mode' :  2, },
            'happy_hours'         :  { 'mode' :  0, },
            'lit'                 :  { 'mode' :  0,
                map: {
                    'yes'      : 'sunset-sunrise open "specified as yes: At night (unknown time schedule or daylight detection)"',
                    'automatic': 'unknown "specified as automatic: When someone enters the way the lights are turned on."',
                    'no'       : 'off "specified as no: There are no lights installed."',
                    'interval' : 'unknown "specified as interval"',
                    'limited'  : 'unknown "specified as limited"',
                }
            },
        };

        var minutes_in_day = 60 * 24;
        var msec_in_day    = 1000 * 60 * minutes_in_day;
        // var msec_in_week   = msec_in_day * 7;

        var library_name   = 'opening_hours.js';
        var repository_url = 'https://github.com/ypid/' + library_name;
        // var issues_url     = repository_url + '/issues?state=open';
        /* }}} */

        /* translation function {{{ */
        /* Roughly compatibly to i18next so we can replace everything by i18next include later
         * sprintf support
         */
        var locale = 'en'; // Default locale
        if (typeof i18n === 'object') {
            locale = i18n.lng();
        }

        var t = function(str, variables) {
            if (
                    typeof i18n === 'object'
                    && typeof i18n.t === 'function'
                    && typeof locale === 'string'
                    && ['de'].indexOf(locale) !== -1
                ) {

                var global_locale = i18n.lng();

                if (global_locale !== locale) {
                    i18n.setLng(locale);
                }
                var text = i18n.t('opening_hours:texts.' + str, variables);
                if (global_locale !== locale) {
                    i18n.setLng(global_locale);
                }
                return text;
            }
            var text = lang[str];
            if (typeof text === 'undefined') {
                text = str;
            }
            return text.replace(/__([^_]*)__/g, function (match, c) {
                return typeof variables[c] !== 'undefined'
                    ? variables[c]
                    : match
                    ;
                }
            );
        };
        /* }}} */

        /* Optional constructor parameters {{{ */

        /* nominatim_object {{{
         *
         * Required to reasonably calculate 'sunrise' and holidays.
         */
        var location_cc, location_state, lat, lon;
        if (typeof nominatim_object === 'object' && nominatim_object !== null) {
            if (typeof nominatim_object.address === 'object') {
                if (typeof nominatim_object.address.country_code === 'string') {
                    location_cc = nominatim_object.address.country_code;
                }
                if (typeof nominatim_object.address.state === 'string') {
                    location_state = nominatim_object.address.state;
                } else if (typeof nominatim_object.address.county === 'string') {
                    location_state = nominatim_object.address.county;
                }
            }

            if (typeof nominatim_object.lon === 'string' && typeof nominatim_object.lat === 'string') {
                lat = nominatim_object.lat;
                lon = nominatim_object.lon;
            }
        } else if (nominatim_object === null) {
            /* Set the location to some random value. This can be used if you don’t
             * care about correct opening hours for more complex opening_hours
             * values.
             */
            location_cc = 'de';
            location_state = 'Baden-W\u00fcrttemberg';
            lat = '49.5400039';
            lon = '9.7937133';
        } else if (typeof nominatim_object !== 'undefined') {
            throw 'The nominatim_object parameter is of unknown type.'
                + ' Given ' + typeof(nominatim_object)
                + ', expected object.';
        }
        /* }}} */

        /* mode, locale, warnings_severity, tag_key, map_value {{{
         *
         * 0: time ranges (default), tags: opening_hours, lit, …
         * 1: points in time
         * 2: both (time ranges and points in time), tags: collection_times, service_times
         */

        var warnings_severity = 4;
        /* Default, currently the highest severity supported.
         * This number is expected to be >= 4. This is not explicitly checked.
         */

        var oh_mode;
        var oh_map_value = false;
        var oh_key, oh_regex_key;

        if (typeof optional_conf_parm === 'number') {
            oh_mode = optional_conf_parm;
        } else if (typeof optional_conf_parm === 'object') {
            locale = optional_conf_parm['locale'];
            if (checkOptionalConfParm('mode', 'number')) {
                oh_mode = optional_conf_parm['mode'];
            }
            if (checkOptionalConfParm('warnings_severity', 'number')) {
                warnings_severity = optional_conf_parm['warnings_severity'];
                if ([ 0, 1, 2, 3, 4, 5, 6, 7 ].indexOf(warnings_severity) === -1) {
                    throw t('warnings severity', { 'severity': warnings_severity, 'allowed': '[ 0, 1, 2, 3, 4, 5, 6, 7 ]' });
                }
            }
            if (checkOptionalConfParm('tag_key', 'string')) {
                oh_key = optional_conf_parm['tag_key'];
            }
            if (checkOptionalConfParm('map_value', 'boolean')) {
                oh_map_value = optional_conf_parm.map_value;
            }
        } else if (typeof optional_conf_parm !== 'undefined') {
            throw t('optional conf parm type', { 'given': typeof(optional_conf_parm) });
        }

        if (typeof oh_key === 'string') {
            oh_regex_key = getRegexKeyForKeyFromOsmDefaults(oh_key)

            if (oh_map_value
                && typeof osm_tag_defaults[oh_regex_key] === 'object'
                && typeof osm_tag_defaults[oh_regex_key]['map'] === 'object'
                && typeof osm_tag_defaults[oh_regex_key]['map'][value] === 'string'
                ) {

                value = osm_tag_defaults[oh_regex_key]['map'][value];
            }
        } else if (oh_map_value) {
            throw t('conf param tag key missing');
        }

        if (typeof oh_mode === 'undefined') {
            if (typeof oh_key === 'string') {
                if (typeof osm_tag_defaults[oh_regex_key]['mode'] === 'number') {
                    oh_mode = osm_tag_defaults[oh_regex_key]['mode'];
                } else {
                    oh_mode = 0;
                }
            } else {
                oh_mode = 0;
            }
        } else if ([ 0, 1, 2 ].indexOf(oh_mode) === -1) {
            throw t('conf param mode invalid', { 'given': oh_mode, 'allowed': '[ 0, 1, 2 ]' });
        }

        /* }}} */
        /* }}} */

        // Tokenize value and generate selector functions. {{{
        if (typeof value !== 'string') {
            throw t('no string');
        }
        if (value.match(/^(?:\s*;?\s*)+$/)) {
            throw t('nothing');
        }

        var parsing_warnings = []; // Elements are fed into function formatWarnErrorMessage(nrule, at, message)
        var done_with_warnings = false; // The functions which throw warnings can be called multiple times.
        var done_with_selector_reordering = false;
        var done_with_selector_reordering_warnings = false;
        var tokens = tokenize(value);
        // console.log(JSON.stringify(tokens, null, '    '));
        var prettified_value = '';
        var week_stable = true;

        var rules = [];
        var new_tokens = [];

        for (var nrule = 0; nrule < tokens.length; nrule++) {
            if (tokens[nrule][0].length === 0) {
                // Rule does contain nothing useful e.g. second rule of '10:00-12:00;' (empty) which needs to be handled.
                parsing_warnings.push([nrule, -1,
                    t('nothing useful')
                    + (nrule === tokens.length - 1 && nrule > 0 && !tokens[nrule][1] ?
                        ' ' + t('programmers joke') : '')
                    ]);
                continue;
            }

            var continue_at = 0;
            var next_rule_is_additional = false;
            do {
                if (continue_at === tokens[nrule][0].length) break;
                // Additional rule does contain nothing useful e.g. second rule of '10:00-12:00,' (empty) which needs to be handled.

                var selectors = {
                    // Time selectors
                    time: [],

                    // Temporary array of selectors from time wrapped to the next day
                    wraptime: [],

                    // Date selectors
                    weekday: [],
                    holiday: [],
                    week: [],
                    month: [],
                    monthday: [],
                    year: [],

                    // Array with non-empty date selector types, with most optimal ordering
                    date: [],

                    fallback: tokens[nrule][1],
                    additional: continue_at ? true : false,
                    meaning: true,
                    unknown: false,
                    comment: undefined,
                    build_from_token_rule: undefined,
                };

                selectors.build_from_token_rule = [ nrule, continue_at, new_tokens.length ];
                continue_at = parseGroup(tokens[nrule][0], continue_at, selectors, nrule);
                if (typeof continue_at === 'object') {
                    continue_at = continue_at[0];
                } else {
                    continue_at = 0;
                }

                // console.log('Current tokens: ' + JSON.stringify(tokens[nrule], null, '    '));

                new_tokens.push(
                    [
                        tokens[nrule][0].slice(
                            selectors.build_from_token_rule[1],
                            continue_at === 0
                                ? tokens[nrule][0].length
                                : continue_at
                        ),
                        tokens[nrule][1],
                        tokens[nrule][2],
                    ]
                );

                if (next_rule_is_additional && new_tokens.length > 1) {
                    // Move 'rule separator' from last token of last rule to first token of this rule.
                    new_tokens[new_tokens.length - 1][0].unshift(new_tokens[new_tokens.length - 2][0].pop());
                }

                next_rule_is_additional = continue_at === 0 ? false : true;

                /* Optimal order of selectors for checking. */
                var selector_elements = ['year', 'holiday', 'month', 'monthday', 'week', 'weekday'];
                for (var selector_ind in selector_elements) {
                    if (selectors[selector_elements[selector_ind]].length > 0) {
                        selectors.date.push(selectors[selector_elements[selector_ind]]);
                        selectors[selector_elements[selector_ind]] = [];
                    }
                }

                // console.log('weekday: ' + JSON.stringify(selectors.weekday, null, '\t'));
                rules.push(selectors);

                /* This handles selectors with time ranges wrapping over midnight (e.g. 10:00-02:00).
                 * It generates wrappers for all selectors and creates a new rule.
                 */
                if (selectors.wraptime.length > 0) {
                    var wrapselectors = {
                        time: selectors.wraptime,
                        date: [],

                        meaning: selectors.meaning,
                        unknown: selectors.unknown,
                        comment: selectors.comment,

                        wrapped: true,
                        build_from_token_rule: selectors.build_from_token_rule,
                    };

                    for (var dselg = 0; dselg < selectors.date.length; dselg++) {
                        wrapselectors.date.push([]);
                        for (var dsel = 0; dsel < selectors.date[dselg].length; dsel++) {
                            wrapselectors.date[wrapselectors.date.length-1].push(
                                    generateDateShifter(selectors.date[dselg][dsel], -msec_in_day)
                                );
                        }
                    }

                    rules.push(wrapselectors);
                }
            } while (continue_at);
        }
        // console.log(JSON.stringify(tokens, null, '    '));
        // console.log(JSON.stringify(new_tokens, null, '    '));
        /* }}} */

        /* Helper functions {{{ */
        /* Get regex string key from key osm_tag_defaults. {{{
         *
         * :param key: Tag key e.g. opening_hours:kitchen.
         * :returns: Regex key from osm_tag_defaults e.g. opening_hours:.*
         */
        function getRegexKeyForKeyFromOsmDefaults(key) {
            var regex_key;

            for (var osm_key in osm_tag_defaults) {
                if (key === osm_key) { // Exact match.
                    regex_key = osm_key;
                    break;
                } else if (key.match(osm_key)) {
                    regex_key = osm_key;
                }
            }
            return regex_key;
        }
        /* }}} */

        /* Check given element in optional_conf_parm. {{{
         *
         * :param key: Key of optional_conf_parm.
         * :param expected_type: Expected `typeof()` the parameter.
         * :returns: True if the expected type matches the given type.
         */
        function checkOptionalConfParm(key, expected_type) {
            if (typeof optional_conf_parm[key] === expected_type) {
                return true;
            } else if (typeof optional_conf_parm[key] !== 'undefined') {
                throw t('conf param unkown type', { 'key': key, 'given': typeof(optional_conf_parm[key]), 'expected': expected_type });
            }
            return false;
        }
        /* }}} */
        /* }}} */

        /* Format warning or error message for the user. {{{
         *
         * :param nrule: Rule number starting with zero.
         * :param at: Token position at which the issue occurred.
         * :param message: Human readable string with the message.
         * :returns: String with position of the warning or error marked for the user.
         */
        function formatWarnErrorMessage(nrule, at, message) {
            // FIXME: Change to new_tokens.
            if (typeof nrule === 'number') {
                var pos = 0;
                if (nrule === -1) { // Usage of rule index not required because we do have access to value.length.
                    pos = value.length - at;
                } else { // Issue accrued at a later time, position in string needs to be reconstructed.
                    if (typeof tokens[nrule][0][at] === 'undefined') {
                        if (typeof tokens[nrule][0] && at === -1) {
                            pos = value.length;
                            if (typeof tokens[nrule+1] === 'object' && typeof tokens[nrule+1][2] === 'number') {
                                pos -= tokens[nrule+1][2];
                            } else if (typeof tokens[nrule][2] === 'number') {
                                pos -= tokens[nrule][2];
                            }
                        } else {
                            // Given position is invalid.
                            //
                            formatLibraryBugMessage('Bug in warning generation code which could not determine the exact position of the warning or error in value.');
                            pos = value.length;
                            if (typeof tokens[nrule][2] === 'number') {
                                // Fallback: Point to last token in the rule which caused the problem.
                                // Run real_test regularly to fix the problem before a user is confronted with it.
                                pos -= tokens[nrule][2];
                                console.warn('Last token for rule: ' + tokens[nrule]);
                                console.log(value.substring(0, pos) + ' <--- (' + message + ')');
                                console.log('\n');
                            } {
                                console.warn('tokens[nrule][2] is undefined. This is ok if nrule is the last rule.');
                            }
                        }
                    } else {
                        pos = value.length;
                        if (typeof tokens[nrule][0][at+1] === 'object') {
                            pos -= tokens[nrule][0][at+1][2];
                        } else if (typeof tokens[nrule][2] === 'number') {
                            pos -= tokens[nrule][2];
                        }
                    }
                }
                return value.substring(0, pos) + ' <--- (' + message + ')';
            } else if (typeof nrule === 'string') {
                return nrule.substring(0, at) + ' <--- (' + message + ')';
            }
        }
        /* }}} */

        /* Format internal library error message. {{{
         *
         * :param message: Human readable string with the error message.
         * :param text_template: Message template defined in the `lang` variable to use for the error message. Defaults to 'library bug'.
         * :returns: Error message for the user.
         */
        function formatLibraryBugMessage(message, text_template) {
            if (typeof message === 'undefined') {
                message = '';
            } else {
                message = ' ' + message;
            }
            if (typeof text_template !== 'string') {
                text_template = 'library bug';
            }

            message = t(text_template, { 'value': value, 'url': repository_url, 'message': message });
            console.error(message);
            return message;
        } /* }}} */

        /* Tokenize input stream. {{{
         *
         * :param value: Raw opening_hours value.
         * :returns: Tokenized list object. Complex structure. Check the
         *        internal documentation in the docs/ directory for details.
         */
        function tokenize(value) {
            var all_tokens       = [];
            var curr_rule_tokens = [];

            var last_rule_fallback_terminated = false;

            while (value !== '') {
                // console.log("Parsing value: " + value);
                var tmp;
                if (tmp = value.match(/^week\b/i)) {
                    // Reserved keywords.
                    curr_rule_tokens.push([tmp[0].toLowerCase(), tmp[0].toLowerCase(), value.length ]);
                    value = value.substr(tmp[0].length);
                } else if (tmp = value.match(/^(?:off|closed|open|unknown)\b/i)) {
                    // Reserved keywords.
                    curr_rule_tokens.push([tmp[0].toLowerCase(), 'state', value.length ]);
                    value = value.substr(tmp[0].length);
                } else if (tmp = value.match(/^24\/7/i)) {
                    // Reserved keyword.
                    curr_rule_tokens.push([tmp[0], tmp[0], value.length ]);
                    value = value.substr(tmp[0].length);
                } else if (tmp = value.match(/^(?:PH|SH)/i)) {
                    // special day name (holidays)
                    curr_rule_tokens.push([tmp[0].toUpperCase(), 'holiday', value.length ]);
                    value = value.substr(2);
                } else if (tmp = value.match(/^(&|_|→|–|−|—|ー|=|·|öffnungszeit(?:en)?:?|opening_hours\s*=|\?|~|～|：|°°|always (?:open|closed)|24x7|24 hours 7 days a week|24 hours|7 ?days(?:(?: a |\/)week)?|7j?\/7|all days?|every day|(:?bis|till?|-|–)? ?(?:open ?end|late)|(?:(?:one )?day (?:before|after) )?(?:school|public) holidays?|days?\b|до|рм|ам|jours fériés|on work days?|sonntags?|(?:nur |an )?sonn-?(?:(?: und |\/)feiertag(?:s|en?)?)?|(?:an )?feiertag(?:s|en?)?|(?:nach|on|by) (?:appointments?|vereinbarung|absprache)|[_a-zäößàáéøčěíúýřПнВсо]+\b|à|á|mo|tu|we|th|fr|sa|su|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.?/i)) {
                    /* Handle all remaining words and specific other characters with error tolerance.
                     *
                     * à|á: Word boundary does not work with unicode chars: 'test à test'.match(/\bà\b/i)
                     * https://stackoverflow.com/questions/10590098/javascript-regexp-word-boundaries-unicode-characters
                     * Order in the regular expression capturing group is important in some cases.
                     *
                     * mo|tu|we|th|fr|sa|su|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec: Prefer defended keywords
                     * if used in cases like 'mo12:00-14:00' (when keyword is followed by number).
                     */
                    var correct_val = returnCorrectWordOrToken(tmp[1].toLowerCase(), value.length);
                    // console.log('Error tolerance for string "' + tmp[1] + '" returned "' + correct_val + '".');
                    if (typeof correct_val === 'object') {
                        curr_rule_tokens.push([ correct_val[0], correct_val[1], value.length ]);
                        value = value.substr(tmp[0].length);
                    } else if (typeof correct_val === 'string') {
                        if (tmp[1].toLowerCase() === 'pm') {
                            var hours_token_at = curr_rule_tokens.length - 1;
                            var hours_token;
                            if (hours_token_at >= 0) {
                                if (hours_token_at -2 >= 0 &&
                                        matchTokens(
                                            curr_rule_tokens, hours_token_at - 2,
                                            'number', 'timesep', 'number'
                                        )
                                    ) {
                                    hours_token_at -= 2;
                                    hours_token = curr_rule_tokens[hours_token_at];
                                } else if (matchTokens(curr_rule_tokens, hours_token_at, 'number')) {
                                    hours_token = curr_rule_tokens[hours_token_at];
                                }

                                if (typeof hours_token === 'object' && hours_token[0] <= 12) {
                                    hours_token[0] += 12;
                                    curr_rule_tokens[hours_token_at] = hours_token;
                                }
                            }
                        }
                        var correct_tokens = tokenize(correct_val)[0];
                        if (correct_tokens[1] === true) { // last_rule_fallback_terminated
                            throw formatLibraryBugMessage();
                        }
                        for (var i = 0; i < correct_tokens[0].length; i++) {
                            curr_rule_tokens.push([correct_tokens[0][i][0], correct_tokens[0][i][1], value.length]);
                            // value.length - tmp[0].length does not have the desired effect for all test cases.
                        }

                        value = value.substr(tmp[0].length);
                        // value = correct_val + value.substr(tmp[0].length);
                        // Does not work because it would generate the wrong length for formatWarnErrorMessage.
                    } else {
                        // other single-character tokens
                        curr_rule_tokens.push([value[0].toLowerCase(), value[0].toLowerCase(), value.length - 1 ]);
                        value = value.substr(1);
                    }
                } else if (tmp = value.match(/^\d+/)) {
                    // number
                    if (Number(tmp[0]) > 1900) { // Assumed to be a year number.
                        curr_rule_tokens.push([Number(tmp[0]), 'year', value.length ]);
                        if (Number(tmp[0]) >= 2100) // Probably an error
                            parsing_warnings.push([ -1, value.length - 1,
                                    t('interpreted as year', {number:  Number(tmp[0])})
                            ]);
                    } else {
                        curr_rule_tokens.push([Number(tmp[0]), 'number', value.length ]);
                    }

                    value = value.substr(tmp[0].length);
                } else if (tmp = value.match(/^"([^"]+)"/)) {
                    // Comment following the specification.
                    // Any character is allowed inside the comment except " itself.
                    curr_rule_tokens.push([tmp[1], 'comment', value.length ]);
                    value = value.substr(tmp[0].length);
                } else if (tmp = value.match(/^(["'„“‚‘’«「『])([^"'“”‘’»」』;|]*)(["'”“‘’»」』])/)) {
                    // Comments with error tolerance.
                    // The comments still have to be somewhat correct meaning
                    // the start and end quote signs used have to be
                    // appropriate. So “testing„ will not match as it is not a
                    // quote but rather something unknown which the user should
                    // fix first.
                    // console.log('Matched: ' + JSON.stringify(tmp));
                    for (var pos = 1; pos <= 3; pos += 2) {
                        // console.log('Pos: ' + pos + ', substring: ' + tmp[pos]);
                        var correct_val = returnCorrectWordOrToken(tmp[pos],
                            value.length - (pos === 3 ? tmp[1].length + tmp[2].length : 0)
                        );
                        if (typeof correct_val !== 'string' && tmp[pos] !== '"') {
                            throw formatLibraryBugMessage(
                                'A character for error tolerance was allowed in the regular expression'
                                + ' but is not covered by word_error_correction'
                                + ' which is needed to format a proper message for the user.'
                            );
                        }
                    }
                    curr_rule_tokens.push([tmp[2], 'comment', value.length ]);
                    value = value.substr(tmp[0].length);
                } else if (value.match(/^;/)) {
                    // semicolon terminates rule.
                    // Next token belong to a new rule.
                    all_tokens.push([ curr_rule_tokens, last_rule_fallback_terminated, value.length ]);
                    value = value.substr(1);

                    curr_rule_tokens = [];
                    last_rule_fallback_terminated = false;
                } else if (value.match(/^\|\|/)) {
                    // || terminates rule.
                    // Next token belong to a fallback rule.
                    if (curr_rule_tokens.length === 0) {
                        throw formatWarnErrorMessage(-1, value.length - 2, t('rule before fallback empty'));
                    }

                    all_tokens.push([ curr_rule_tokens, last_rule_fallback_terminated, value.length ]);
                    curr_rule_tokens = [];
                    // curr_rule_tokens = [ [ '||', 'rule separator', value.length  ] ];
                    // FIXME: Use this. Unknown bug needs to be solved in the process.
                    value = value.substr(2);

                    last_rule_fallback_terminated = true;
                } else if (value.match(/^(?:␣|\s)/)) {
                    // Using "␣" as space is not expected to be a normal
                    // mistake. Just ignore it to make using taginfo easier.
                    value = value.substr(1);
                } else if (tmp = value.match(/^\s+/)) {
                    // whitespace is ignored
                    value = value.substr(tmp[0].length);
                } else if (value.match(/^[:.]/)) {
                    // Time separator (timesep).
                    if (value[0] === '.' && !done_with_warnings) {
                        parsing_warnings.push([ -1, value.length - 1, t('hour min separator')]);
                    }
                    curr_rule_tokens.push([ ':', 'timesep', value.length ]);
                    value = value.substr(1);
                } else {
                    // other single-character tokens
                    curr_rule_tokens.push([value[0].toLowerCase(), value[0].toLowerCase(), value.length ]);
                    value = value.substr(1);
                }
            }

            all_tokens.push([ curr_rule_tokens, last_rule_fallback_terminated ]);

            return all_tokens;
        }
        /* }}} */

        /* error correction/tolerance function {{{
         * Go through word_error_correction hash and get correct value back.
         *
         * :param word: Wrong Word or character.
         * :param value_length: Current value_length (used for warnings).
         * :returns:
         *        * (valid) opening_hours sub string.
         *        * object with [ internal_value, token_name ] if value is correct.
         *        * undefined if word could not be found (and thus is not be corrected).
         */
        function returnCorrectWordOrToken(word, value_length) {
            for (var token_name in word_error_correction) {
                for (var comment in word_error_correction[token_name]) {
                    for (var old_val in word_error_correction[token_name][comment]) {
                        if (word.match(new RegExp('^' + old_val + '$'))) {
                            var val = word_error_correction[token_name][comment][old_val];
                            if (comment === 'default') {
                                // Return internal representation of word.
                                return [ val, token_name ];
                            } else if (token_name === 'wrong_words' && !done_with_warnings) {
                                // Replace wrong words or characters with correct ones.
                                // This will return a string which is then being tokenized.
                                parsing_warnings.push([ -1, value_length - word.length,
                                    comment.replace(/<ko>/, word).replace(/<ok>/, val) ]);
                                return val;
                            } else {
                                // Get correct string value from the 'default' hash and generate warning.
                                var correct_abbr;
                                for (correct_abbr in word_error_correction[token_name]['default']) {
                                    if (word_error_correction[token_name]['default'][correct_abbr] === val)
                                        break;
                                }
                                if (typeof correct_abbr === 'undefined') {
                                    throw formatLibraryBugMessage('Please also include the stacktrace.');
                                }
                                if (token_name !== 'timevar') {
                                    // Everything else than timevar:
                                    // E.g. 'Mo' start with a upper case letter.
                                    // It just looks better.
                                    correct_abbr = correct_abbr.charAt(0).toUpperCase()
                                        + correct_abbr.slice(1);
                                }
                                if (!done_with_warnings)
                                    parsing_warnings.push([ -1, value_length - word.length,
                                        comment.replace(/<ko>/, word).replace(/<ok>/, correct_abbr) ]);
                                return [ val, token_name ];
                            }
                        }
                    }
                }
            }
            return undefined;
        }
        /* }}} */

        /* return warnings as list {{{
         *
         * :param it: Iterator object if available (optional).
         * :returns: Warnings as list with one warning per element.
         */
        function getWarnings(it) {
            if (warnings_severity < 4) {
                return [];
            }

            if (!done_with_warnings && typeof it === 'object') {
                /* getWarnings was called in a state without critical errors.
                 * We can do extended tests.
                 */

                /* Place all tests in this function if an additional (high
                 * level) test is added and this does not require to rewrite
                 * big parts of (sub) selector parsers only to get the
                 * position. If that is the case, then rather place the test
                 * code in the (sub) selector parser function directly.
                 */

                var wide_range_selector_order = [ 'year', 'month', 'week', 'holiday' ];
                var small_range_selector_order = [ 'weekday', 'time', '24/7', 'state', 'comment'];

                // How many times was a selector_type used per rule? {{{
                var used_selectors = [];
                var used_selectors_types_array = [];
                var has_token = {};

                for (var nrule = 0; nrule < new_tokens.length; nrule++) {
                    if (new_tokens[nrule][0].length === 0) continue;
                    // Rule does contain nothing useful e.g. second rule of '10:00-12:00;' (empty) which needs to be handled.

                    var selector_start_end_type = [ 0, 0, undefined ];
                    // console.log(new_tokens[nrule][0]);

                    used_selectors[nrule] = {};
                    used_selectors_types_array[nrule] = [];

                    do {
                        selector_start_end_type = getSelectorRange(new_tokens[nrule][0], selector_start_end_type[1]);
                        // console.log(selector_start_end_type, new_tokens[nrule][0].length);

                        for (var token_pos = 0; token_pos <= selector_start_end_type[1]; token_pos++) {
                            if (typeof new_tokens[nrule][0][token_pos] === 'object' && new_tokens[nrule][0][token_pos][0] === 'PH') {
                                has_token['PH'] = true;
                            }
                        }

                        if (selector_start_end_type[0] === selector_start_end_type[1] &&
                            new_tokens[nrule][0][selector_start_end_type[0]][0] === '24/7'
                            ) {
                                has_token['24/7'] = true;
                        }

                        if (typeof used_selectors[nrule][selector_start_end_type[2]] !== 'object') {
                            used_selectors[nrule][selector_start_end_type[2]] = [ selector_start_end_type[1] ];
                        } else {
                            used_selectors[nrule][selector_start_end_type[2]].push(selector_start_end_type[1]);
                        }
                        used_selectors_types_array[nrule].push(selector_start_end_type[2]);

                        selector_start_end_type[1]++;
                    } while (selector_start_end_type[1] < new_tokens[nrule][0].length);
                }
                // console.log('used_selectors: ' + JSON.stringify(used_selectors, null, '    '));
                /* }}} */

                for (var nrule = 0; nrule < used_selectors.length; nrule++) {

                    /* Check if more than one not connected selector of the same type is used in one rule {{{ */
                    for (var selector_type in used_selectors[nrule]) {
                        // console.log(selector_type + ' use at: ' + used_selectors[nrule][selector_type].length);
                        if (used_selectors[nrule][selector_type].length > 1) {
                            parsing_warnings.push([nrule, used_selectors[nrule][selector_type][used_selectors[nrule][selector_type].length - 1],
                                t('use multi', {
                                    'count': used_selectors[nrule][selector_type].length,
                                    'part2': (
                                        selector_type.match(/^(?:comment|state)/) ?
                                            t('selector multi 2a', {'what': (selector_type === 'state' ? t('selector state'): t('comments'))})
                                            :
                                            t('selector multi 2b', {'what': t(selector_type + (selector_type.match(/^(?:month|weekday)$/) ? 's' : ' ranges'))})
                                    )
                                })]
                            );
                            done_with_selector_reordering = true; // Correcting the selector order makes no sense if this kind of issue exists.
                        }
                    }
                    /* }}} */
                    /* Check if change default state rule is not the first rule {{{ */
                    if (   typeof used_selectors[nrule].state === 'object'
                        && Object.keys(used_selectors[nrule]).length === 1
                    ) {

                        if (nrule !== 0) {
                            parsing_warnings.push([nrule, new_tokens[nrule][0].length - 1, t('default state')]);
                        }
                    /* }}} */
                    /* Check if a rule (with state open) has no time selector {{{ */
                    } else if (typeof used_selectors[nrule].time === 'undefined') {
                        if (    (       typeof used_selectors[nrule].state === 'object'
                                    && new_tokens[nrule][0][used_selectors[nrule].state[0]][0] === 'open'
                                    && typeof used_selectors[nrule].comment === 'undefined'
                                ) || ( typeof used_selectors[nrule].comment === 'undefined'
                                    && typeof used_selectors[nrule].state === 'undefined'
                                ) &&
                                typeof used_selectors[nrule]['24/7'] === 'undefined'
                        ) {

                            parsing_warnings.push([nrule, new_tokens[nrule][0].length - 1, t('vague')]);
                        }
                    }
                    /* }}} */
                    /* Check if empty comment was given {{{ */
                    if (typeof used_selectors[nrule].comment === 'object'
                        && new_tokens[nrule][0][used_selectors[nrule].comment[0]][0].length === 0
                    ) {

                        parsing_warnings.push([nrule, used_selectors[nrule].comment[0], t('empty comment')]);
                    }
                    /* }}} */
                    /* Check for valid use of <separator_for_readability> {{{ */
                    for (var i = 0; i < used_selectors_types_array[nrule].length - 1; i++) {
                        var selector_type = used_selectors_types_array[nrule][i];
                        var next_selector_type = used_selectors_types_array[nrule][i+1];
                        if (   (   wide_range_selector_order.indexOf(selector_type)       !== -1
                                && wide_range_selector_order.indexOf(next_selector_type)  !== -1
                            ) || ( small_range_selector_order.indexOf(selector_type)      !== -1
                                && small_range_selector_order.indexOf(next_selector_type) !== -1)
                            ) {

                            if (new_tokens[nrule][0][used_selectors[nrule][selector_type][0]][0] === ':') {
                                parsing_warnings.push([nrule, used_selectors[nrule][selector_type][0],
                                    t('separator_for_readability')
                                ]);
                            }
                        }
                    }
                    /* }}} */

                    /* FIXME: Enable (currently disabled): Check if rule with closed|off modifier is additional {{{ */
                    if (typeof new_tokens[nrule][0][0] === 'object'
                            && new_tokens[nrule][0][0][0] === ','
                            && new_tokens[nrule][0][0][1] === 'rule separator'
                            && typeof used_selectors[nrule].state === 'object'
                            && (
                                   new_tokens[nrule][0][used_selectors[nrule].state[0]][0] === 'closed'
                                || new_tokens[nrule][0][used_selectors[nrule].state[0]][0] === 'off'
                               )
                    ) {

                        // parsing_warnings.push([nrule, new_tokens[nrule][0].length - 1,
                            // "This rule will be evaluated as closed but it was specified as additional rule."
                            // + " It is enough to specify this rule as normal rule using the \";\" character."
                            // + " See https://wiki.openstreetmap.org/wiki/Key:opening_hours/specification#explain:rule_modifier:closed."
                        // ]);
                    }
                    /* }}} */

                }

                /* Check if 24/7 is used and it does not mean 24/7 because there are other rules {{{ */
                var has_advanced = it.advance();

                if (has_advanced === true && has_token['24/7'] && !done_with_warnings) {
                    parsing_warnings.push([ -1, 0,
                        // Probably because of: "24/7; 12:00-14:00 open", ". Needs extra testing.
                        t('strange 24/7')
                    ]);
                }
                /* }}} */

                /* Check for missing PH. {{{ */
                if (    warnings_severity >= 5
                    && !has_token['PH']
                    && !has_token['24/7']
                    && !done_with_warnings
                    && (
                            (
                                typeof oh_key === 'string'
                                && osm_tag_defaults[oh_regex_key]['warn_for_PH_missing']
                            )
                            || (typeof oh_key !== 'string')
                       )
                    ) {

                    var keys_with_warn_for_PH_missing = [];
                    for (var key in osm_tag_defaults) {
                        if (osm_tag_defaults[key]['warn_for_PH_missing']) {
                            keys_with_warn_for_PH_missing.push(key);
                        }
                    }
                    parsing_warnings.push([ -1, 0,
                        t('public holiday', { 'part2': (typeof oh_key !== 'string'
                            ? t('public holiday part2', {'keys': keys_with_warn_for_PH_missing.join(', ')}) : '')})
                            // + '(see README how to provide it)' // UI of the evaluation tool does not allow to provide it (currently).
                    ]);
                }
                /* }}} */

                prettifyValue();
            }
            done_with_warnings = true;

            var warnings = [];
            // FIXME: Sort based on parsing_warnings[1], tricky …
            for (var i = 0; i < parsing_warnings.length; i++) {
                warnings.push( formatWarnErrorMessage(parsing_warnings[i][0], parsing_warnings[i][1], parsing_warnings[i][2]) );
            }
            return warnings;
        }

        /* Helpers for getWarnings {{{ */

        /* Check if token is the begin of a selector and why. {{{
         *
         * :param tokens: List of token objects.
         * :param at: Position where to start.
         * :returns:
         *        * false the current token is not the begin of a selector.
         *        * Position in token array from where the decision was made that
         *          the token is the start of a selector.
         */
        function tokenIsTheBeginOfSelector(tokens, at) {
            if (typeof tokens[at][3] === 'string') {
                return 3;
            } else if (tokens[at][1] === 'comment'
                    || tokens[at][1] === 'state'
                    || tokens[at][1] === '24/7'
                    || tokens[at][1] === 'rule separator'
                ){

                return 1;
            } else {
                return false;
            }
        }
        /* }}} */

        /* Get start and end position of a selector. {{{
         * For example this value 'Mo-We,Fr' will return the position of the
         * token lexeme 'Mo' and 'Fr' e.g. there indexes [ 0, 4 ] in the
         * selector array of tokens.
         *
         * :param tokens: List of token objects.
         * :param at: Position where to start.
         * :returns: Array:
         *            0. Index of first token in selector array of tokens.
         *            1. Index of last token in selector array of tokens.
         *            2. Selector type.
         */
        function getSelectorRange(tokens, at) {
            var selector_start = at,
                selector_end,
                pos_in_token_array;

            for (; selector_start >= 0; selector_start--) {
                pos_in_token_array = tokenIsTheBeginOfSelector(tokens, selector_start);
                if (pos_in_token_array)
                    break;
            }
            selector_end = selector_start;

            if (pos_in_token_array === 1) {
                // Selector consists of a single token.

                // Include tailing colon.
                if (selector_end + 1 < tokens.length && tokens[selector_end + 1][0] === ':')
                    selector_end++;

                return [ selector_start, selector_end, tokens[selector_start][pos_in_token_array] ];
            }

            for (selector_end++; selector_end < tokens.length ; selector_end++) {
                if (tokenIsTheBeginOfSelector(tokens, selector_end))
                    return [ selector_start, selector_end - 1, tokens[selector_start][pos_in_token_array] ];
            }

            return [ selector_start, selector_end - 1, tokens[selector_start][pos_in_token_array] ];
        }
        /* }}} */
        /* }}} */
        /* }}} */

        /* Prettify raw value from user. {{{
         * The value is generated by putting the tokens back together to a string.
         *
         * :param argument_hash: Hash which can contain:
         *        'conf': Configuration hash.
         *        'get_internals: If true export internal data structures.
         *        'rule_index: Only prettify the rule with this index.
         * :returns: Prettified value string or object if get_internals is true.
         */
        function prettifyValue(argument_hash) {
            var user_conf = {};
            var get_internals = false;
            var rule_index;

            prettified_value = '';
            var prettified_value_array = [];

            if (typeof argument_hash === 'object') {
                if (typeof argument_hash.conf === 'object') {
                    user_conf = argument_hash.conf;
                }

                if (typeof argument_hash.rule_index === 'number') {
                    rule_index = argument_hash.rule_index;
                }

                if (argument_hash.get_internals === true) {
                    get_internals = true;
                }

            }

            for (var key in default_prettify_conf) {
                if (typeof user_conf[key] === 'undefined') {
                    user_conf[key] = default_prettify_conf[key];
                }
            }

            if (typeof moment !== 'undefined' && typeof user_conf['locale'] === 'string' && user_conf['locale'] !== 'en') {
                // FIXME: Does not work?
                // var moment_localized = moment();
                // moment_localized.locale('en');

                var global_locale = moment.locale();
                // build translation arrays from moment
                moment.locale('en');
                var weekdays_en = moment.weekdaysMin();
                // monthShort would not return what we like
                var months_en = moment.months().map(function (month) {
                    return month.substr(0,3);
                });
                // FIXME: Does not work in Firefox?
                moment.locale(user_conf['locale']);
                var weekdays_local = moment.weekdaysMin();
                var months_local = moment.months().map(function (month) {
                    return month.substr(0,3);
                });
                // console.log(months_local);
                moment.locale(global_locale);
            }

            for (var nrule = 0; nrule < new_tokens.length; nrule++) {
                if (new_tokens[nrule][0].length === 0) continue;
                // Rule does contain nothing useful e.g. second rule of '10:00-12:00;' (empty) which needs to be handled.

                if (typeof rule_index === 'number') {
                    if (rule_index !== nrule) continue;
                } else {
                    if (nrule !== 0)
                        prettified_value += (
                            new_tokens[nrule][1]
                                ? user_conf.rule_sep_string + '|| '
                                : (
                                    new_tokens[nrule][0][0][1] === 'rule separator'
                                    ? ','
                                    : (
                                        user_conf.print_semicolon
                                        ? ';'
                                        : ''
                                    )
                                ) +
                            user_conf.rule_sep_string);
                }

                var selector_start_end_type = [ 0, 0, undefined ];
                var prettified_group_value = [];
                var count = 0;
                // console.log(new_tokens[nrule][0]);

                do {
                    selector_start_end_type = getSelectorRange(new_tokens[nrule][0], selector_start_end_type[1]);
                    // console.log(selector_start_end_type, new_tokens[nrule][0].length, count);

                    if (count > 50) {
                        throw formatLibraryBugMessage('Infinite loop.');
                    }

                    if (selector_start_end_type[2] !== 'rule separator') {
                        prettified_group_value.push(
                            [
                                selector_start_end_type,
                                prettifySelector(
                                    new_tokens[nrule][0],
                                    selector_start_end_type[0],
                                    selector_start_end_type[1],
                                    selector_start_end_type[2],
                                    user_conf
                                ),
                            ]
                        );
                    }

                    selector_start_end_type[1]++;
                    count++;
                    // console.log(selector_start_end_type, new_tokens[nrule][0].length, count);
                } while (selector_start_end_type[1] < new_tokens[nrule][0].length);
                // console.log('Prettified value: ' + JSON.stringify(prettified_group_value, null, '    '));
                var not_sorted_prettified_group_value = prettified_group_value.slice();

                if (!done_with_selector_reordering) {
                    prettified_group_value.sort(
                        function (a, b) {
                            var selector_order = [ 'year', 'month', 'week', 'holiday', 'weekday', 'time', '24/7', 'state', 'comment'];
                            return selector_order.indexOf(a[0][2]) - selector_order.indexOf(b[0][2]);
                        }
                    );
                }
                var old_prettified_value_length = prettified_value.length;

                if (typeof user_conf['locale'] === 'string' && user_conf['locale'] !== 'en') {
                    var global_locale = i18n.lng();
                    if (global_locale !== user_conf['locale']) {
                        i18n.setLng(user_conf['locale']);
                    }
                    for (var i = 0; i < prettified_group_value.length; i++) {
                        var type = prettified_group_value[i][0][2];
                        if (type === 'weekday') {
                            for(var key in weekdays_en) {
                                prettified_group_value[i][1] = prettified_group_value[i][1].replace(new RegExp(weekdays_en[key], 'g'), weekdays_local[key]);
                            }
                        } else if (type === 'month') {
                            for(var key in months_en) {
                                prettified_group_value[i][1] = prettified_group_value[i][1].replace(new RegExp(months_en[key], 'g'), months_local[key]);
                            }
                        } else {
                            prettified_group_value[i][1] = i18n.t(['opening_hours:pretty.' + prettified_group_value[i][1], prettified_group_value[i][1]]);
                        }
                    }
                    if (global_locale !== locale) {
                        i18n.setLng(global_locale);
                    }
                }

                prettified_value += prettified_group_value.map(
                    function (array) {
                        return array[1];
                    }
                ).join(' ');

                prettified_value_array.push( prettified_group_value );

                if (!done_with_selector_reordering_warnings) {
                    for (var i = 0, l = not_sorted_prettified_group_value.length; i < l; i++) {
                        if (not_sorted_prettified_group_value[i] !== prettified_group_value[i]) {
                            // console.log(i + ': ' + prettified_group_value[i][0][2]);
                            var length = i + old_prettified_value_length; // i: Number of spaces in string.
                            for (var x = 0; x <= i; x++) {
                                length += prettified_group_value[x][1].length;
                                // console.log('Length: ' + length + ' ' + prettified_group_value[x][1]);
                            }
                            // console.log(length);
                            parsing_warnings.push([ prettified_value, length, t('switched', {
                                'first': prettified_group_value[i][0][2],
                                'second': not_sorted_prettified_group_value[i][0][2]
                            })
                            ]);
                        }
                    }
                }
            }

            done_with_selector_reordering_warnings = true;
            // console.log(JSON.stringify(prettified_value_array, null, '    '));

            if (get_internals) {
                return [ prettified_value_array, new_tokens ];
            } else {
                return prettified_value;
            }
        }
        /* }}} */

        /* Check selector array of tokens for specific token name pattern. {{{
         *
         * :param tokens: List of token objects.
         * :param at: Position at which the matching should begin.
         * :param token_name(s): One or many token_name strings which have to match in that order.
         * :returns: true if token_name(s) match in order false otherwise.
         */
        function matchTokens(tokens, at /*, matches... */) {
            if (at + arguments.length - 2 > tokens.length)
                return false;
            for (var i = 0; i < arguments.length - 2; i++) {
                if (tokens[at + i][1] !== arguments[i + 2])
                    return false;
            }

            return true;
        }
        /* }}} */

        /* Generate selector wrapper with time offset {{{
         *
         * :param func: Generated selector code function.
         * :param shirt: Time to shift in milliseconds.
         * :param token_name(s): One or many token_name strings which have to match in that order.
         * :returns: See selector code.
         */
        function generateDateShifter(func, shift) {
            return function(date) {
                var res = func(new Date(date.getTime() + shift));

                if (typeof res[1] === 'undefined')
                    return res;
                return [ res[0], new Date(res[1].getTime() - shift) ];
            };
        }
        /* }}} */

        /* Top-level parser {{{
         *
         * :param tokens: List of token objects.
         * :param at: Position where to start.
         * :param selectors: Reference to selector object.
         * :param nrule: Rule number starting with 0.
         * :returns: See selector code.
         */
        function parseGroup(tokens, at, selectors, nrule) {
            var rule_modifier_specified = false;

            // console.log(tokens); // useful for debugging of tokenize
            var last_selector = [];
            while (at < tokens.length) {
                // console.log('Parsing at position', at +':', tokens[at]);
                if (matchTokens(tokens, at, 'weekday')) {
                    at = parseWeekdayRange(tokens, at, selectors);
                } else if (matchTokens(tokens, at, '24/7')) {
                    selectors.time.push(function() { return [true]; });
                    // Not needed. If there is no selector it automatically matches everything.
                    // WRONG: This only works if there is no other selector in this selector group ...
                    at++;
                } else if (matchTokens(tokens, at, 'holiday')) {
                    if (matchTokens(tokens, at+1, ',')) {
                        at = parseHoliday(tokens, at, selectors, true);
                    } else {
                        at = parseHoliday(tokens, at, selectors, false);
                    }
                    week_stable = false;
                } else if (matchTokens(tokens, at, 'month', 'number')
                        || matchTokens(tokens, at, 'month', 'weekday')
                        || matchTokens(tokens, at, 'year', 'month', 'number')
                        || matchTokens(tokens, at, 'year', 'event')
                        || matchTokens(tokens, at, 'event')) {

                    at = parseMonthdayRange(tokens, at, nrule);
                    week_stable = false;
                } else if (matchTokens(tokens, at, 'year')) {
                    at = parseYearRange(tokens, at);
                    week_stable = false;
                } else if (matchTokens(tokens, at, 'month')) {
                    at = parseMonthRange(tokens, at);
                    // week_stable = false; // Decided based on the actual value/tokens.
                } else if (matchTokens(tokens, at, 'week')) {
                    tokens[at][3] = 'week';
                    at = parseWeekRange(tokens, at);

                } else if (at !== 0 && at !== tokens.length - 1 && tokens[at][0] === ':'
                    && !(typeof last_selector[1] === 'string' && last_selector[1] === 'time')) {
                    /* Ignore colon if they appear somewhere else than as time separator.
                     * Except the start or end of the value.
                     * This provides compatibility with the syntax proposed by Netzwolf:
                     * https://wiki.openstreetmap.org/wiki/Key:opening_hours/specification#separator_for_readability
                     * Check for valid use of <separator_for_readability> is implemented in function getWarnings().
                     */

                    if (!done_with_warnings && matchTokens(tokens, at-1, 'holiday')) {
                        parsing_warnings.push([nrule, at, t('no colon after', { 'token': tokens[at-1][1] })]);
                    }

                    at++;
                } else if (matchTokens(tokens, at, 'number', 'timesep')
                        || matchTokens(tokens, at, 'timevar')
                        || matchTokens(tokens, at, '(', 'timevar')
                        || matchTokens(tokens, at, 'number', '-')) {

                    at = parseTimeRange(tokens, at, selectors, false);
                    last_selector = [at , 'time'];

                } else if (matchTokens(tokens, at, 'state')) {

                    if (tokens[at][0] === 'open') {
                        selectors.meaning = true;
                    } else if (tokens[at][0] === 'closed' || tokens[at][0] === 'off') {
                        selectors.meaning = false;
                    } else {
                        selectors.meaning = false;
                        selectors.unknown = true;
                    }

                    rule_modifier_specified = true;
                    at++;
                    if (typeof tokens[at] === 'object' && tokens[at][0] === ',') // additional rule
                        at = [ at + 1 ];

                } else if (matchTokens(tokens, at, 'comment')) {
                    selectors.comment = tokens[at][0];
                    if (!rule_modifier_specified) {
                        // Then it is unknown. Either with unknown explicitly
                        // specified or just a comment.
                        selectors.meaning = false;
                        selectors.unknown = true;
                    }

                    rule_modifier_specified = true;
                    at++;
                    if (typeof tokens[at] === 'object' && tokens[at][0] === ',') { // additional rule
                        at = [ at + 1 ];
                    }
                } else if ((at === 0 || at === tokens.length - 1) && matchTokens(tokens, at, 'rule separator')) {
                    at++;
                    // console.log("value: " + nrule);
                    // throw formatLibraryBugMessage('Not implemented yet.');
                } else {
                    var warnings = getWarnings();
                    throw formatWarnErrorMessage(nrule, at, t('unexpected token', {token: tokens[at][1] })) + (warnings ? (' ' + warnings.join('; ')) : '');
                }

                if (typeof at === 'object') { // additional rule
                    tokens[at[0] - 1][1] = 'rule separator';
                    break;
                }
                if (typeof last_selector[0] === 'number' && last_selector[0] !== at) {
                    last_selector = [];
                }
            }

            return at;
        }

        /* Not used
        function get_last_token_pos_in_token_group(tokens, at, last_at) {
            for (at++; at < last_at; at++) {
                if (typeof tokens[at] === 'object') {
                    if (typeof tokens[at][3] === 'string'
                            || tokens[at][1] === 'comment'
                            || tokens[at][1] === 'state'){

                            return at - 1;
                    }
                }
            }
            return last_at;
        }
        */

        /* }}} */

        // helper functions for sub parser {{{

        /* For given date, returns date moved to the start of the day with an offset specified in minutes. {{{
         * For example, if date is 2014-05-19_18:17:12, dateAtDayMinutes would
         * return 2014-05-19_02:00:00 for minutes=120.
         *
         * :param date: Date object.
         * :param minutes: Minutes used as offset starting from midnight of current day.
         * :returns: Moved date object.
         */
        function dateAtDayMinutes(date, minutes) {
            return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, minutes);
        }
        /* }}} */

        /* For given date, returns date moved to the specific day of week {{{
         *
         * :param date: Date object.
         * :param weekday: Integer number for day of week. Starting with zero (Sunday).
         * :returns: Moved date object.
         */
        function dateAtNextWeekday(date, weekday) {
            var delta = weekday - date.getDay();
            return new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta + (delta < 0 ? 7 : 0));
        }
        /* }}} */

        /* Function to determine whether an array contains a value {{{
         * Source: https://stackoverflow.com/a/1181586
         *
         * :param needle: Element to find.
         * :returns: Index of element if present, if not present returns -1.
         */
        function indexOf(needle) {
            if(typeof Array.prototype.indexOf === 'function') {
                indexOf = Array.prototype.indexOf;
            } else {
                indexOf = function(needle) {
                    var i = -1, index = -1;
                    for(i = 0; i < this.length; i++) {
                        if(this[i] === needle) {
                            index = i;
                            break;
                        }
                    }
                    return index;
                };
            }
            return indexOf.call(this, needle);
        } /* }}} */

        /* Numeric list parser (1,2,3-4,-1) {{{
         * Used in weekday parser above.
         *
         * :param tokens: List of token objects.
         * :param at: Position where to start.
         * :param func: Function func(from, to, at).
         * :returns: Position at which the token does not belong to the list any more.
         */
        function parseNumRange(tokens, at, func) {
            for (; at < tokens.length; at++) {
                if (matchTokens(tokens, at, 'number', '-', 'number')) {
                    // Number range
                    func(tokens[at][0], tokens[at+2][0], at);
                    at += 3;
                } else if (matchTokens(tokens, at, '-', 'number')) {
                    // Negative number
                    func(-tokens[at+1][0], -tokens[at+1][0], at);
                    at += 2;
                } else if (matchTokens(tokens, at, 'number')) {
                    // Single number
                    func(tokens[at][0], tokens[at][0], at);
                    at++;
                } else {
                    throw formatWarnErrorMessage(nrule, at + matchTokens(tokens, at, '-'),
                        'Unexpected token in number range: ' + tokens[at][1]);
                }

                if (!matchTokens(tokens, at, ','))
                    break;
            }

            return at;
        }
        /* }}} */

        /* List parser for constrained weekdays in month range {{{
         * e.g. Su[-1] which selects the last Sunday of the month.
         *
         * :param tokens: List of token objects.
         * :param at: Position where to start.
         * :returns: Array:
         *            0. Constrained weekday number.
         *            1. Position at which the token does not belong to the list any more (after ']' token).
         */
        function getConstrainedWeekday(tokens, at) {
            var number = 0;
            var endat = parseNumRange(tokens, at, function(from, to, at) {

                // bad number
                if (from === 0 || from < -5 || from > 5)
                    throw formatWarnErrorMessage(nrule, at,
                        t('number -5 to 5'));

                if (from === to) {
                    if (number !== 0)
                        throw formatWarnErrorMessage(nrule, at,
                            t('one weekday constraint'));
                    number = from;
                } else {
                    throw formatWarnErrorMessage(nrule, at+2,
                        t('range constrained weekdays'));
                }
            });

            if (!matchTokens(tokens, endat, ']'))
                throw formatWarnErrorMessage(nrule, endat, t('expected', {symbol: ']'}));

            return [ number, endat + 1 ];
        }
        /* }}} */

        // Check if period is ok. Period 0 or 1 don’t make much sense.
        function checkPeriod(at, period, period_type, parm_string) {
            if (done_with_warnings)
                return;

            if (period === 0) {
                throw formatWarnErrorMessage(nrule, at,
                    t('range zero', { 'type': period_type }));
            } else if (period === 1) {
                if (typeof parm_string === 'string' && parm_string === 'no_end_year')
                    parsing_warnings.push([nrule, at, t('period one year+', {'type': period_type})]);
                else
                    parsing_warnings.push([nrule, at, t('period one', {'type': period_type})]);
            }
        }

        /* Get date moved to constrained weekday (and moved for add_days. {{{
         * E.g. used for 'Aug Su[-1] -1 day'.
         *
         * :param year: Year as integer.
         * :param month: Month as integer starting with zero.
         * :param weekday: Integer number for day of week. Starting with zero (Sunday).
         * :param constrained_weekday: Position where to start.
         * :returns: Date object.
         */
        function getDateForConstrainedWeekday(year, month, weekday, constrained_weekday, add_days) {
            var tmp_date = dateAtNextWeekday(
                new Date(year, month + (constrained_weekday[0] > 0 ? 0 : 1), 1), weekday);

            tmp_date.setDate(tmp_date.getDate() + (constrained_weekday[0] + (constrained_weekday[0] > 0 ? -1 : 0)) * 7);

            if (typeof add_days === 'object' && add_days[1])
                tmp_date.setDate(tmp_date.getDate() + add_days[0]);

            return tmp_date;
        }
        /* }}} */

        /* Check if date is valid. {{{
         *
         * :param month: Month as integer starting with zero.
         * :param date: Day of month as integer.
         * :returns: undefined. There is no real return value. This function just throws an exception if something is wrong.
         */
        function checkIfDateIsValid(month, day, nrule, at) {
            // May use this instead. The problem is that this does not give feedback as precise as the code which is used in this function.
            // var testDate = new Date(year, month, day);
            // if (testDate.getDate() !== day || testDate.getMonth() !== month || testDate.getFullYear() !== year) {
            //     console.error('date not valid');
            // }

            // https://en.wikipedia.org/wiki/Month#Julian_and_Gregorian_calendars
            if (day < 1 || day > 31) {
                throw formatWarnErrorMessage(nrule, at, t('month 31', {'month': months[month]}));
            } else if ((month === 3 || month === 5 || month === 8 || month === 10) && day === 31) {
                throw formatWarnErrorMessage(nrule, at, t('month 30', {'month': months[month]}));
            } else if (month === 1 && day === 30) {
                throw formatWarnErrorMessage(nrule, at, t('month feb', {'month': months[month]}));
            }
        }
        /* }}} */
        /* }}} */

        /* Time range parser (10:00-12:00,14:00-16:00) {{{
         *
         * :param tokens: List of token objects.
         * :param at: Position where to start.
         * :param selectors: Reference to selector object.
         * :param extended_open_end: Used for combined time range with open end.
         * extended_open_end: <time> - <time> +
         *        parameter at is here A (if extended_open_end is true)
         * :returns: Position at which the token does not belong to the selector anymore.
         */
        function parseTimeRange(tokens, at, selectors, extended_open_end) {
            if (!extended_open_end)
                tokens[at][3] = 'time';

            for (; at < tokens.length; at++) {
                var has_time_var_calc = [], has_normal_time = []; // element 0: start time, 1: end time
                    has_normal_time[0]   = matchTokens(tokens, at, 'number', 'timesep', 'number');
                    has_time_var_calc[0] = matchTokens(tokens, at, '(', 'timevar');
                var minutes_from,
                    minutes_to;
                if (has_normal_time[0] || matchTokens(tokens, at, 'timevar') || has_time_var_calc[0]) {
                    // relying on the fact that always *one* of them is true

                    var is_point_in_time = false; // default no time range
                    var has_open_end     = false; // default no open end
                    var timevar_add      = [ 0, 0 ];
                    var timevar_string   = [];    // capture timevar string like 'sunrise' to calculate it for the current date.
                    var point_in_time_period;

                    // minutes_from
                    if (has_normal_time[0]) {
                        minutes_from = getMinutesByHoursMinutes(tokens, nrule, at+has_time_var_calc[0]);
                    } else {
                        timevar_string[0] = tokens[at+has_time_var_calc[0]][0];
                        minutes_from = word_value_replacement[timevar_string[0]];

                        if (has_time_var_calc[0]) {
                            timevar_add[0] = parseTimevarCalc(tokens, at);
                            minutes_from += timevar_add[0];
                        }
                    }

                    var at_end_time = at+(has_normal_time[0] ? 3 : (has_time_var_calc[0] ? 7 : 1))+1; // after '-'
                    if (!matchTokens(tokens, at_end_time - 1, '-')) { // not time range
                        if (matchTokens(tokens, at_end_time - 1, '+')) {
                            has_open_end = true;
                        } else {
                            if (oh_mode === 0) {
                                throw formatWarnErrorMessage(nrule,
                                    at+(
                                        has_normal_time[0] ? (
                                            typeof tokens[at+3] === 'object' ? 3 : 2
                                        ) : (
                                            has_time_var_calc[0] ? 2 : (
                                                    typeof tokens[at+1] === 'object' ? 1 : 0
                                                )
                                        )
                                    ),
                                    t('point in time', {
                                        'calc': (has_time_var_calc[0] ? t('calculation') + ' ' : ''),
                                        'libraryname': library_name
                                    }));
                            } else {
                                minutes_to = minutes_from + 1;
                                is_point_in_time = true;
                            }
                        }
                    }

                    // minutes_to
                    if (has_open_end) {
                        if (extended_open_end === 1) {
                            minutes_from += minutes_in_day;
                        }
                        if (minutes_from >= 22 * 60) {

                            minutes_to = minutes_from +  8 * 60;
                        } else if (minutes_from >= 17 * 60) {
                            minutes_to = minutes_from + 10 * 60;
                        } else {
                            minutes_to = minutes_in_day;
                        }
                    } else if (!is_point_in_time) {
                        has_normal_time[1] = matchTokens(tokens, at_end_time, 'number', 'timesep', 'number');
                        has_time_var_calc[1]      = matchTokens(tokens, at_end_time, '(', 'timevar');
                        if (!has_normal_time[1] && !matchTokens(tokens, at_end_time, 'timevar') && !has_time_var_calc[1]) {
                            throw formatWarnErrorMessage(nrule, at_end_time - (typeof tokens[at_end_time] === 'object' ? 0 : 1),
                                    t('time range continue'));
                        } else {
                            if (has_normal_time[1]) {
                                minutes_to = getMinutesByHoursMinutes(tokens, nrule, at_end_time);
                            } else {
                                timevar_string[1] = tokens[at_end_time+has_time_var_calc[1]][0];
                                minutes_to = word_value_replacement[timevar_string[1]];
                            }

                            if (has_time_var_calc[1]) {
                                timevar_add[1] = parseTimevarCalc(tokens, at_end_time);
                                minutes_to += timevar_add[1];
                            }
                        }
                    }

                    at = at_end_time + (is_point_in_time ? -1 :
                            (has_normal_time[1] ? 3 : (has_time_var_calc[1] ? 7 : !has_open_end))
                        );

                    if (matchTokens(tokens, at, '/', 'number')) {
                        if (matchTokens(tokens, at + 2, 'timesep', 'number')) { // /hours:minutes
                            point_in_time_period = getMinutesByHoursMinutes(tokens, nrule, at + 1);
                            at += 4;
                        } else { // /minutes
                            point_in_time_period = tokens[at + 1][0];
                            at += 2;
                            if (matchTokens(tokens, at, 'timesep'))
                                throw formatWarnErrorMessage(nrule, at,
                                    t('period continue'));
                        }

                        // Check at this later state in the if condition to get the correct position.
                        if (oh_mode === 0) {
                            throw formatWarnErrorMessage(nrule, at - 1,
                                t('time range mode', {'libraryname': library_name}));
                        }

                        is_point_in_time = true;
                    } else if (matchTokens(tokens, at, '+')) {
                        parseTimeRange(tokens, at_end_time, selectors, minutes_to < minutes_from ? 1 : true);
                        at++;
                    } else if (oh_mode === 1 && !is_point_in_time) {
                        throw formatWarnErrorMessage(nrule, at_end_time,
                            t('point in time mode', {'libraryname': library_name}));
                    }

                    if (typeof lat === 'string') { // lon will also be defined (see above)
                        if (!has_normal_time[0] || !(has_normal_time[1] || has_open_end || is_point_in_time) ) {
                            week_stable = false;
                        }
                    } else { // we can not calculate exact times so we use the already applied constants (word_value_replacement).
                        timevar_string = [];
                    }

                    // Normalize minutes into range.
                    if (!extended_open_end && minutes_from >= minutes_in_day) {
                        throw formatWarnErrorMessage(nrule, at_end_time - 2,
                            t('outside current day'));
                    }
                    if (minutes_to < minutes_from || ((has_normal_time[0] && has_normal_time[1]) && minutes_from === minutes_to)) {
                        minutes_to += minutes_in_day;
                    }
                    if (minutes_to > minutes_in_day * 2) {
                        throw formatWarnErrorMessage(nrule, at_end_time + (has_normal_time[1] ? 4 : (has_time_var_calc[1] ? 7 : 1)) - 2,
                            t('two midnights'));
                    }

                    // This shortcut makes always-open range check faster.
                    if (minutes_from === 0 && minutes_to === minutes_in_day) {
                        selectors.time.push(function() { return [true]; });
                    } else {
                        if (minutes_to > minutes_in_day) { // has_normal_time[1] must be true
                            selectors.time.push(function(minutes_from, minutes_to, timevar_string, timevar_add, has_open_end, is_point_in_time, point_in_time_period, extended_open_end) { return function(date) {
                                var ourminutes = date.getHours() * 60 + date.getMinutes();

                                if (timevar_string[0]) {
                                    var date_from = SunCalc.getTimes(date, lat, lon)[timevar_string[0]];
                                    minutes_from  = date_from.getHours() * 60 + date_from.getMinutes() + timevar_add[0];
                                }
                                if (timevar_string[1]) {
                                    var date_to = SunCalc.getTimes(date, lat, lon)[timevar_string[1]];
                                    minutes_to  = date_to.getHours() * 60 + date_to.getMinutes() + timevar_add[1];
                                    minutes_to += minutes_in_day;
                                    // Needs to be added because it was added by
                                    // normal times: if (minutes_to < minutes_from)
                                    // above the selector construction.
                                } else if (is_point_in_time && typeof point_in_time_period !== 'number') {
                                    minutes_to = minutes_from + 1;
                                }

                                if (typeof point_in_time_period === 'number') {
                                    if (ourminutes < minutes_from) {
                                        return [false, dateAtDayMinutes(date, minutes_from)];
                                    } else if (ourminutes <= minutes_to) {
                                        for (var cur_min = minutes_from; ourminutes + point_in_time_period >= cur_min; cur_min += point_in_time_period) {
                                            if (cur_min === ourminutes) {
                                                return [true, dateAtDayMinutes(date, ourminutes + 1)];
                                            } else if (ourminutes < cur_min) {
                                                return [false, dateAtDayMinutes(date, cur_min)];
                                            }
                                        }
                                    }
                                    return [false, dateAtDayMinutes(date, minutes_in_day)];
                                } else {
                                    if (ourminutes < minutes_from)
                                        return [false, dateAtDayMinutes(date, minutes_from)];
                                    else
                                        return [true, dateAtDayMinutes(date, minutes_to), has_open_end, extended_open_end];
                                }
                            }}(minutes_from, minutes_to, timevar_string, timevar_add, has_open_end, is_point_in_time, point_in_time_period, extended_open_end));

                            selectors.wraptime.push(function(minutes_from, minutes_to, timevar_string, timevar_add, has_open_end, point_in_time_period, extended_open_end) { return function(date) {
                                var ourminutes = date.getHours() * 60 + date.getMinutes();

                                if (timevar_string[0]) {
                                    var date_from = SunCalc.getTimes(date, lat, lon)[timevar_string[0]];
                                    minutes_from  = date_from.getHours() * 60 + date_from.getMinutes() + timevar_add[0];
                                }
                                if (timevar_string[1]) {
                                    var date_to = SunCalc.getTimes(date, lat, lon)[timevar_string[1]];
                                    minutes_to  = date_to.getHours() * 60 + date_to.getMinutes() + timevar_add[1];
                                    // minutes_in_day does not need to be added.
                                    // For normal times in it was added in: if (minutes_to < // minutes_from)
                                    // above the selector construction and
                                    // subtracted in the selector construction call
                                    // which returns the selector function.
                                }

                                if (typeof point_in_time_period === 'number') {
                                    if (ourminutes <= minutes_to) {
                                        for (var cur_min = 0; ourminutes + point_in_time_period >= cur_min; cur_min += point_in_time_period) {
                                            if (cur_min === ourminutes) {
                                                return [true, dateAtDayMinutes(date, ourminutes + 1)];
                                            } else if (ourminutes < cur_min) {
                                                return [false, dateAtDayMinutes(date, cur_min)];
                                            }
                                        }
                                    }
                                } else {
                                    if (ourminutes < minutes_to)
                                        return [true, dateAtDayMinutes(date, minutes_to), has_open_end, extended_open_end];
                                }
                                return [false, undefined];
                            }}(minutes_from, minutes_to - minutes_in_day, timevar_string, timevar_add, has_open_end, point_in_time_period, extended_open_end));
                        } else {
                            selectors.time.push(function(minutes_from, minutes_to, timevar_string, timevar_add, has_open_end, is_point_in_time, point_in_time_period) { return function(date) {
                                var ourminutes = date.getHours() * 60 + date.getMinutes();

                                if (timevar_string[0]) {
                                    var date_from = SunCalc.getTimes(date, lat, lon)[timevar_string[0]];
                                    minutes_from  = date_from.getHours() * 60 + date_from.getMinutes() + timevar_add[0];
                                }
                                if (timevar_string[1]) {
                                    var date_to = SunCalc.getTimes(date, lat, lon)[timevar_string[1]];
                                    minutes_to  = date_to.getHours() * 60 + date_to.getMinutes() + timevar_add[1];
                                } else if (is_point_in_time && typeof point_in_time_period !== 'number') {
                                    minutes_to = minutes_from + 1;
                                }

                                if (typeof point_in_time_period === 'number') {
                                    if (ourminutes < minutes_from) {
                                        return [false, dateAtDayMinutes(date, minutes_from)];
                                    } else if (ourminutes <= minutes_to) {
                                        for (var cur_min = minutes_from; ourminutes + point_in_time_period >= cur_min; cur_min += point_in_time_period) {
                                            if (cur_min === ourminutes) {
                                                return [true, dateAtDayMinutes(date, ourminutes + 1)];
                                            } else if (ourminutes < cur_min) {
                                                return [false, dateAtDayMinutes(date, cur_min)];
                                            }
                                        }
                                    }
                                    return [false, dateAtDayMinutes(date, minutes_in_day)];
                                } else {
                                    if (ourminutes < minutes_from)
                                        return [false, dateAtDayMinutes(date, minutes_from)];
                                    else if (ourminutes < minutes_to)
                                        return [true, dateAtDayMinutes(date, minutes_to), has_open_end];
                                    else
                                        return [false, dateAtDayMinutes(date, minutes_from + minutes_in_day)];
                                }
                            }}(minutes_from, minutes_to, timevar_string, timevar_add, has_open_end, is_point_in_time, point_in_time_period));
                        }
                    }

                } else if (matchTokens(tokens, at, 'number', '-', 'number')) { // "Mo 09-18" (Please don’t use this) -> "Mo 09:00-18:00".
                    minutes_from = tokens[at][0]   * 60;
                    minutes_to   = tokens[at+2][0] * 60;
                    if (!done_with_warnings)
                        parsing_warnings.push([nrule, at + 2, t('without minutes', {
                            'syntax': (tokens[at][0]   < 10 ? '0' : '') + tokens[at][0]   + ':00-'
                                + (tokens[at+2][0] < 10 ? '0' : '') + tokens[at+2][0] + ':00'
                        })]);

                    if (minutes_from >= minutes_in_day)
                        throw formatWarnErrorMessage(nrule, at, t('outside day'));
                    if (minutes_to < minutes_from)
                        minutes_to += minutes_in_day;
                    if (minutes_to > minutes_in_day * 2)
                        throw formatWarnErrorMessage(nrule, at + 2, t('two midnights'));

                    if (minutes_to > minutes_in_day) {
                        selectors.time.push(function(minutes_from, minutes_to) { return function(date) {
                            var ourminutes = date.getHours() * 60 + date.getMinutes();

                            if (ourminutes < minutes_from)
                                return [false, dateAtDayMinutes(date, minutes_from)];
                            else
                                return [true, dateAtDayMinutes(date, minutes_to)];
                        }}(minutes_from, minutes_to));

                        selectors.wraptime.push(function(minutes_to) { return function(date) {
                            var ourminutes = date.getHours() * 60 + date.getMinutes();

                            if (ourminutes < minutes_to) {
                                return [true, dateAtDayMinutes(date, minutes_to)];
                            } else {
                                return [false, undefined];
                            }
                        }}(minutes_to - minutes_in_day));
                    } else {
                        selectors.time.push(function(minutes_from, minutes_to) { return function(date) {
                            var ourminutes = date.getHours() * 60 + date.getMinutes();

                            if (ourminutes < minutes_from)
                                return [false, dateAtDayMinutes(date, minutes_from)];
                            else if (ourminutes < minutes_to)
                                return [true, dateAtDayMinutes(date, minutes_to), has_open_end];
                            else
                                return [false, dateAtDayMinutes(date, minutes_from + minutes_in_day)];
                        }}(minutes_from, minutes_to));
                    }

                    at += 3;
                } else { // additional rule
                    if (matchTokens(tokens, at, '('))
                        throw formatWarnErrorMessage(nrule, at, 'Missing variable time (e.g. sunrise) after: "' + tokens[at][1] + '"');
                    if (matchTokens(tokens, at, 'number', 'timesep'))
                        throw formatWarnErrorMessage(nrule, at+1, 'Missing minutes in time range after: "' + tokens[at+1][1] + '"');
                    if (matchTokens(tokens, at, 'number'))
                        throw formatWarnErrorMessage(nrule, at + (typeof tokens[at+1] === 'object' ? 1 : 0),
                                'Missing time separator in time range after: "' + tokens[at][1] + '"');
                    return [ at ];
                }

                if (!matchTokens(tokens, at, ','))
                    break;
            }

            return at;
        }
        /* }}} */

        /* Helpers for time range parser {{{ */

        /* Get time in minutes from <hour>:<minute> (tokens). {{{
         * Only used if throwing an error is wanted.
         *
         * :param tokens: List of token objects.
         * :param nrule: Rule number starting with 0.
         * :param at: Position at which the time begins.
         * :returns: Time in minutes.
         */
        function getMinutesByHoursMinutes(tokens, nrule, at) {
            if (tokens[at+2][0] > 59)
                throw formatWarnErrorMessage(nrule, at+2,
                        'Minutes are greater than 59.');
            return tokens[at][0] * 60 + tokens[at+2][0];
        }
        /* }}} */

        /* Get time in minutes from "(sunrise-01:30)" {{{
         * Extract the added or subtracted time from "(sunrise-01:30)"
         * returns time in minutes e.g. -90.
         *
         * :param tokens: List of token objects.
         * :param at: Position where the specification for the point in time could be.
         * :returns: Time in minutes on suggest, throws an exception otherwise.
        */
        function parseTimevarCalc(tokens, at) {
            var error;
            if (matchTokens(tokens, at+2, '+') || matchTokens(tokens, at+2, '-')) {
                if (matchTokens(tokens, at+3, 'number', 'timesep', 'number')) {
                    if (matchTokens(tokens, at+6, ')')) {
                        var add_or_subtract = tokens[at+2][0] === '+' ? '1' : '-1';
                        var minutes = getMinutesByHoursMinutes(tokens, nrule, at+3) * add_or_subtract;
                        if (minutes === 0)
                            parsing_warnings.push([ nrule, at+5, t('zero calculation') ]
                                );
                        return minutes;
                    } else {
                        error = [ at+6, '. ' + t('missing', {'symbol': ")"}) + '.'];
                    }
                } else {
                    error = [ at+5, ' ' + t('(time)') + '.'];
                }
            } else {
                error = [ at+2, '. ' + t('expected', {'symbol': '+" or "-'})];
            }

            if (error)
                throw formatWarnErrorMessage(nrule, error[0],
                     t('calculation syntax')+ error[1]);
        }
        /* }}} */
        /* }}} */

        /* Weekday range parser (Mo,We-Fr,Sa[1-2,-1],PH). {{{
         *
         * :param tokens: List of token objects.
         * :param at: Position where the weekday tokens could be.
         * :param selectors: Reference to selector object.
         * :returns: Position at which the token does not belong to the selector anymore.
         */
        function parseWeekdayRange(tokens, at, selectors, in_holiday_selector) {
            if (!in_holiday_selector) {
                in_holiday_selector = true;
                tokens[at][3] = 'weekday';
            }

            for (; at < tokens.length; at++) {
                if (matchTokens(tokens, at, 'weekday', '[')) {
                    // Conditional weekday (Mo[3])
                    var numbers = [];

                    // Get list of constraints
                    var endat = parseNumRange(tokens, at+2, function(from, to, at) {

                        // bad number
                        if (from === 0 || from < -5 || from > 5)
                            throw formatWarnErrorMessage(nrule, at,
                                t('number -5 to 5'));

                        if (from === to) {
                            numbers.push(from);
                        } else if (from < to) {
                            for (var i = from; i <= to; i++) {
                                // bad number
                                if (i === 0 || i < -5 || i > 5)
                                    throw formatWarnErrorMessage(nrule, at+2,
                                        t('number -5 to 5'));

                                numbers.push(i);
                            }
                        } else {
                            throw formatWarnErrorMessage(nrule, at+2,
                                t('bad range',{'from': from, 'to': to}));
                        }
                    });

                    if (!matchTokens(tokens, endat, ']'))
                        throw formatWarnErrorMessage(nrule, endat, t('] or more numbers'));

                    var add_days = getMoveDays(tokens, endat+1, 6, 'constrained weekdays');
                    week_stable = false;

                    // Create selector for each list element.
                    for (var nnumber = 0; nnumber < numbers.length; nnumber++) {

                        selectors.weekday.push(function(weekday, number, add_days) { return function(date) {
                            var date_num = getValueForDate(date, false); // Year not needed to distinguish.
                            var start_of_this_month = new Date(date.getFullYear(), date.getMonth(), 1);
                            var start_of_next_month = new Date(date.getFullYear(), date.getMonth() + 1, 1);

                            var target_day_this_month;

                            target_day_this_month = getDateForConstrainedWeekday(date.getFullYear(), date.getMonth(), weekday, [ number ]);

                            var target_day_with_added_days_this_month = new Date(target_day_this_month.getFullYear(),
                                target_day_this_month.getMonth(), target_day_this_month.getDate() + add_days);

                            // The target day with added days can be before this month
                            if (target_day_with_added_days_this_month.getTime() < start_of_this_month.getTime()) {
                                // but in this case, the target day without the days added needs to be in this month
                                if (target_day_this_month.getTime() >= start_of_this_month.getTime()) {
                                    // so we calculate it for the month
                                    // following this month and hope that the
                                    // target day will actually be this month.

                                    target_day_with_added_days_this_month = dateAtNextWeekday(
                                        new Date(date.getFullYear(), date.getMonth() + (number > 0 ? 0 : 1) + 1, 1), weekday);
                                    target_day_this_month.setDate(target_day_with_added_days_this_month.getDate()
                                        + (number + (number > 0 ? -1 : 0)) * 7 + add_days);
                                } else {
                                    // Calculated target day is not inside this month
                                    // therefore the specified weekday (e.g. fifth Sunday)
                                    // does not exist this month. Try it next month.
                                    return [false, start_of_next_month];
                                }
                            } else if (target_day_with_added_days_this_month.getTime() >= start_of_next_month.getTime()) {
                                // The target day is in the next month. If the target day without the added days is not in this month
                                if (target_day_this_month.getTime() >= start_of_next_month.getTime())
                                    return [false, start_of_next_month];
                            }

                            var target_day_with_added_moved_days_this_month;
                            if (add_days > 0) {
                                target_day_with_added_moved_days_this_month = dateAtNextWeekday(
                                    new Date(date.getFullYear(), date.getMonth() + (number > 0 ? 0 : 1) -1, 1), weekday);
                                target_day_with_added_moved_days_this_month.setDate(target_day_with_added_moved_days_this_month.getDate()
                                    + (number + (number > 0 ? -1 : 0)) * 7 + add_days);

                                if (date_num === getValueForDate(target_day_with_added_moved_days_this_month, false))
                                    return [true, dateAtDayMinutes(date, minutes_in_day)];
                            } else if (add_days < 0) {
                                target_day_with_added_moved_days_this_month = dateAtNextWeekday(
                                    new Date(date.getFullYear(), date.getMonth() + (number > 0 ? 0 : 1) + 1, 1), weekday);
                                target_day_with_added_moved_days_this_month.setDate(target_day_with_added_moved_days_this_month.getDate()
                                    + (number + (number > 0 ? -1 : 0)) * 7 + add_days);

                                if (target_day_with_added_moved_days_this_month.getTime() >= start_of_next_month.getTime()) {
                                    if (target_day_with_added_days_this_month.getTime() >= start_of_next_month.getTime())
                                        return [false, target_day_with_added_moved_days_this_month];
                                } else {
                                    if (target_day_with_added_days_this_month.getTime() < start_of_next_month.getTime()
                                        && getValueForDate(target_day_with_added_days_this_month, false) === date_num)
                                        return [true, dateAtDayMinutes(date, minutes_in_day)];

                                    target_day_with_added_days_this_month = target_day_with_added_moved_days_this_month;
                                }
                            }

                            // we hit the target day
                            if (date.getDate() === target_day_with_added_days_this_month.getDate()) {
                                return [true, dateAtDayMinutes(date, minutes_in_day)];
                            }

                            // we're before target day
                            if (date.getDate() < target_day_with_added_days_this_month.getDate()) {
                                return [false, target_day_with_added_days_this_month];
                            }

                            // we're after target day, set check date to next month
                            return [false, start_of_next_month];
                        }}(tokens[at][0], numbers[nnumber], add_days[0]));
                    }

                    at = endat + 1 + add_days[1];
                } else if (matchTokens(tokens, at, 'weekday')) {
                    // Single weekday (Mo) or weekday range (Mo-Fr)
                    var is_range = matchTokens(tokens, at+1, '-', 'weekday');

                    var weekday_from = tokens[at][0];
                    var weekday_to = is_range ? tokens[at+2][0] : weekday_from;

                    var inside = true;

                    // handle reversed range
                    if (weekday_to < weekday_from) {
                        var tmp = weekday_to;
                        weekday_to = weekday_from - 1;
                        weekday_from = tmp + 1;
                        inside = false;
                    }

                    if (weekday_to < weekday_from) { // handle full range
                        selectors.weekday.push(function() { return [true]; });
                        // Not needed. If there is no selector it automatically matches everything.
                        // WRONG: This only works if there is no other selector in this selector group ...
                    } else {
                        selectors.weekday.push(function(weekday_from, weekday_to, inside) { return function(date) {
                            var ourweekday = date.getDay();

                            if (ourweekday < weekday_from || ourweekday > weekday_to) {
                                return [!inside, dateAtNextWeekday(date, weekday_from)];
                            } else {
                                return [inside, dateAtNextWeekday(date, weekday_to + 1)];
                            }
                        }}(weekday_from, weekday_to, inside));
                    }

                    at += is_range ? 3 : 1;
                } else if (matchTokens(tokens, at, 'holiday')) {
                    week_stable = false;
                    return parseHoliday(tokens, at, selectors, true, in_holiday_selector);
                } else if (matchTokens(tokens, at - 1, ',')) { // additional rule
                    throw formatWarnErrorMessage(
                        nrule,
                        at - 1,
                        t('additional rule no sense'));
                } else {
                    throw formatWarnErrorMessage(nrule, at, t('unexpected token weekday range', {'token': tokens[at][1]}));
                }

                if (!matchTokens(tokens, at, ','))
                    break;
            }

            return at;
        }
        /* }}} */

        /* Get the number of days a date should be moved (if any). {{{
         *
         * :param tokens: List of token objects.
         * :param at: Position where the date moving tokens could be.
         * :param max_differ: Maximal number of days to move (could also be zero if there are no day move tokens).
         * :returns: Array:
         *            0. Days to add.
         *            1. How many tokens.
         */
        function getMoveDays(tokens, at, max_differ, name) {
            var add_days = [ 0, 0 ]; // [ 'days to add', 'how many tokens' ]
            add_days[0] = matchTokens(tokens, at, '+') || (matchTokens(tokens, at, '-') ? -1 : 0);
            if (add_days[0] !== 0 && matchTokens(tokens, at+1, 'number', 'calcday')) {
                // continues with '+ 5 days' or something like that
                if (tokens[at+1][0] > max_differ)
                    throw formatWarnErrorMessage(nrule, at+2,
                        t('max differ',{'maxdiffer': max_differ, 'name': name}));
                add_days[0] *= tokens[at+1][0];
                if (add_days[0] === 0 && !done_with_warnings)
                    parsing_warnings.push([ nrule, at+2, t('adding 0') ]);
                add_days[1] = 3;
            } else {
                add_days[0] = 0;
            }
            return add_days;
        }
        /* }}} */

        /* Holiday parser for public and school holidays (PH,SH) {{{
         *
         * :param tokens: List of token objects.
         * :param at: Position where to start.
         * :param selectors: Reference to selector object.
         * :param push_to_weekday: Will push the selector into the weekday selector array which has the desired side effect of working in conjunction with the weekday selectors (either the holiday match or the weekday), which is the normal and expected behavior.
         * :returns: Position at which the token does not belong to the selector anymore.
         */
        function parseHoliday(tokens, at, selectors, push_to_weekday, in_holiday_selector) {
            if (!in_holiday_selector) {

                if (push_to_weekday)
                    tokens[at][3] = 'weekday';
                else
                    tokens[at][3] = 'holiday'; // Could also be holiday but this is not important here.
            }

            for (; at < tokens.length; at++) {
                if (matchTokens(tokens, at, 'holiday')) {
                    if (tokens[at][0] === 'PH') {
                        var applying_holidays = getMatchingHoliday(tokens[at][0]);

                        // Only allow moving one day in the past or in the future.
                        // This makes implementation easier because only one holiday is assumed to be moved to the next year.
                        var add_days = getMoveDays(tokens, at+1, 1, 'public holiday');

                        var selector = function(applying_holidays, add_days) { return function(date) {

                            var holidays = getApplyingHolidaysForYear(applying_holidays, date.getFullYear(), add_days);
                            // Needs to be calculated each time because of movable days.

                            var date_num = getValueForDate(date, true);

                            for (var i = 0; i < holidays.length; i++) {
                                var next_holiday_date_num = getValueForDate(holidays[i][0], true);

                                if (date_num < next_holiday_date_num) {

                                    if (add_days[0] > 0) {
                                        // Calculate the last holiday from previous year to tested against it.
                                        var holidays_last_year = getApplyingHolidaysForYear(applying_holidays, date.getFullYear() - 1, add_days);
                                        var last_holiday_last_year = holidays_last_year[holidays_last_year.length - 1];
                                        var last_holiday_last_year_num = getValueForDate(last_holiday_last_year[0], true);

                                        if (date_num < last_holiday_last_year_num ) {
                                            return [ false, last_holiday_last_year[0] ];
                                        } else if (date_num === last_holiday_last_year_num) {
                                            return [true, dateAtDayMinutes(last_holiday_last_year[0], minutes_in_day),
                                                'Day after ' +last_holiday_last_year[1] ];
                                        }
                                    }

                                    return [ false, holidays[i][0] ];
                                } else if (date_num === next_holiday_date_num) {
                                    return [true, new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
                                        (add_days[0] > 0 ? 'Day after ' : (add_days[0] < 0 ? 'Day before ' : '')) + holidays[i][1] ];
                                }
                            }

                            if (add_days[0] < 0) {
                                // Calculate the first holiday from next year to tested against it.
                                var holidays_next_year = getApplyingHolidaysForYear(applying_holidays, date.getFullYear() + 1, add_days);
                                var first_holidays_next_year = holidays_next_year[0];
                                var first_holidays_next_year_num = getValueForDate(first_holidays_next_year[0], true);
                                if (date_num === first_holidays_next_year_num) {
                                    return [true, dateAtDayMinutes(first_holidays_next_year[0], minutes_in_day),
                                        'Day before ' + first_holidays_next_year[1] ];
                                }
                            }

                            // continue next year
                            return [ false, new Date(holidays[0][0].getFullYear() + 1,
                                    holidays[0][0].getMonth(),
                                    holidays[0][0].getDate()) ];

                        }}(applying_holidays, add_days);

                        if (push_to_weekday)
                            selectors.weekday.push(selector);
                        else
                            selectors.holiday.push(selector);

                        at += 1 + add_days[1];
                    } else if (tokens[at][0] === 'SH') {
                        var applying_holidays = getMatchingHoliday(tokens[at][0]);

                        var selector = function(applying_holidays) { return function(date) {
                            var date_num = getValueForDate(date);

                            // Iterate over holiday array containing the different holiday ranges.
                            for (var i = 0; i < applying_holidays.length; i++) {

                                var holiday = getSHForYear(applying_holidays[i], date.getFullYear());

                                for (var h = 0; h < holiday.length; h+=4) {
                                    var holiday_to_plus = new Date(date.getFullYear(), holiday[2+h] - 1, holiday[3+h] + 1);
                                    var holiday_from = (holiday[0+h] - 1) * 100 + holiday[1+h];
                                    var holiday_to   = (holiday[2+h] - 1) * 100 + holiday[3+h];
                                    holiday_to_plus  = getValueForDate(holiday_to_plus);

                                    var holiday_ends_next_year = holiday_to < holiday_from;

                                    if (date_num < holiday_from) { // date is before selected holiday

                                        // check if we are in the holidays from the last year spanning into this year
                                        var last_year_holiday = getSHForYear(applying_holidays[applying_holidays.length - 1], date.getFullYear() - 1, false);
                                        if (typeof last_year_holiday === 'object') {
                                            var last_year_holiday_from = (last_year_holiday[last_year_holiday.length - 4] - 1) * 100
                                                + last_year_holiday[last_year_holiday.length - 3]; // e.g. 1125
                                            var last_year_holiday_to   = (last_year_holiday[last_year_holiday.length - 2] - 1) * 100
                                                + last_year_holiday[last_year_holiday.length - 1]; // e.g. 0005
                                            // console.log(last_year_holiday_from, last_year_holiday_to);

                                            if (last_year_holiday_from > last_year_holiday_to && date_num <= last_year_holiday_to)
                                                return [ true, new Date(date.getFullYear(),
                                                    last_year_holiday[last_year_holiday.length - 2] - 1,
                                                    last_year_holiday[last_year_holiday.length - 1] + 1),
                                                    applying_holidays[applying_holidays.length - 1].name ];
                                            else
                                                return [ false, new Date(date.getFullYear(), holiday[0+h] - 1, holiday[1+h]) ];
                                        } else { // school holidays for last year are not defined.
                                            return [ false, new Date(date.getFullYear(), holiday[0+h] - 1, holiday[1+h]) ];
                                        }
                                    } else if (holiday_from <= date_num && (date_num < holiday_to_plus || holiday_ends_next_year)) {
                                        return [ true, new Date(date.getFullYear() + holiday_ends_next_year, holiday[2+h] - 1, holiday[3+h] + 1),
                                            applying_holidays[i].name ];
                                    } else if (holiday_to_plus === date_num) { // selected holiday end is equal to month and day
                                        if (h + 4 < holiday.length) { // next holiday is next date range of the same holidays
                                            h += 4;
                                            return [ false, new Date(date.getFullYear(), holiday[0+h] - 1, holiday[1+h]) ];
                                        } else {
                                            if (i + 1 === applying_holidays.length) { // last holidays are handled, continue all over again
                                                var holiday = getSHForYear(applying_holidays[0], date.getFullYear() + 1);
                                                return [ false, new Date(date.getFullYear() + !holiday_ends_next_year, holiday[0+h] - 1, holiday[1+h]) ];
                                            } else { // return the start of the next holidays
                                                    var holiday = getSHForYear(applying_holidays[i+1], date.getFullYear());
                                                    return [ false, new Date(date.getFullYear(), holiday[0] - 1, holiday[1]) ];
                                            }
                                        }
                                    }
                                }
                            }
                            return [ false ];
                        }}(applying_holidays);

                        if (push_to_weekday)
                            selectors.weekday.push(selector);
                        else
                            selectors.holiday.push(selector);
                        at += 1; // FIXME: test
                    }
                } else if (matchTokens(tokens, at, 'weekday')) {
                    return parseWeekdayRange(tokens, at, selectors, true);
                } else if (matchTokens(tokens, at - 1, ',')) { // additional rule
                    throw formatWarnErrorMessage(
                        nrule,
                        at - 1,
                        t('additional rule no sense'));
                } else {
                    throw formatWarnErrorMessage(nrule, at, t('unexpected token holiday', {'token': tokens[at][1]}));
                }

                if (!matchTokens(tokens, at, ','))
                    break;
            }

            return at;
        }

        // Helpers for holiday parsers {{{

        /* Returns a number for a date which can then be used to compare just the dates (without the time). {{{
         *
         * This is necessary because a selector could be called for the middle of the day and we need to tell if it matches that day.
         * Example: Returns 20150015 for Jan 15 2015.
         *
         * :param date: Date object.
         * :param include_year: Boolean. If true include the year.
         * :returns: Number for the date.
         */
        function getValueForDate(date, include_year) {
            // Implicit because undefined evaluates to false.
            // include_year = typeof include_year !== 'undefined' ? include_year : false;

            return (include_year ? date.getFullYear() * 10000 : 0) + date.getMonth() * 100 + date.getDate();
        }
        /* }}} */

        /* Return the school holiday definition e.g. [ 5, 25, to 6, 5 ], for the specified year {{{
         *
         * :param SH_hash:
         * :param year: Year as integer.
         * :param fatal: Defines the behavior in case no definition is find. Throw an error if set to true. Return return undefined.
         * :returns: school holidays for the given year.
         */
        function getSHForYear(SH_hash, year, fatal) {
            if (typeof fatal !== 'boolean') {
                fatal = true;
            }

            var holiday = SH_hash[year];
            if (typeof holiday === 'undefined') {
                holiday = SH_hash['default']; // applies for any year without explicit definition
                if (typeof holiday === 'undefined') {
                    if (fatal) {
                        throw formatLibraryBugMessage(t('no SH definition', {
                            'name': SH_hash.name,
                            'year': year,
                            'repository_url': repository_url,
                        }), 'library bug PR only');
                    } else {
                        return undefined;
                    }
                }
            }
            return holiday;
        }
        /* }}} */

        /* Return closest holiday definition available. {{{
         *
         * First try to get the state, if missing get the country wide holidays
         * (which can on it’s own be limited to some states).
         *
         * :param type_of_holidays: Choices: PH, SH.
         * :returns: Public or school holiday list.
         */
        function getMatchingHoliday(type_of_holidays) {
            if (typeof location_cc === 'string') {
                if (holiday_definitions.hasOwnProperty(location_cc)) {
                    if (typeof location_state === 'string'
                        && typeof holiday_definitions[location_cc][location_state] === 'object'
                        && typeof holiday_definitions[location_cc][location_state][type_of_holidays] === 'object') {

                        /* If holiday_definitions for the state are specified,
                         * use it and ignore lesser specific ones (for the
                         * country)
                         */
                        return holiday_definitions[location_cc][location_state][type_of_holidays];

                    } else if (holiday_definitions[location_cc][type_of_holidays]) {
                        /* Holidays are defined country wide. Some
                         * countries only have country-wide holiday definitions
                         * so that is ok too.
                         */
                        var applying_holidays_for_country = holiday_definitions[location_cc][type_of_holidays];

                        var matching_holiday = {}; /* Holidays in the country-wide scope can be limited to certain states. */
                        switch (type_of_holidays) {
                            case 'PH':
                                for (var holiday_name in applying_holidays_for_country) {
                                    if (typeof applying_holidays_for_country[holiday_name][2] === 'object') {
                                        if (-1 !== applying_holidays_for_country[holiday_name][2].indexOf(location_state)) {
                                            matching_holiday[holiday_name] = applying_holidays_for_country[holiday_name];
                                        }
                                    } else {
                                        matching_holiday[holiday_name] = applying_holidays_for_country[holiday_name];
                                    }
                                }
                                break;
                            case 'SH':
                                matching_holiday = applying_holidays_for_country;
                                break;
                        }
                        if (Object.keys(matching_holiday).length === 0) {
                            throw formatLibraryBugMessage(t('no holiday defintion', {
                                'name': type_of_holidays,
                                'cc': location_cc,
                            }), 'library bug PR only');
                        }
                        return matching_holiday;
                    } else {
                        throw formatLibraryBugMessage(t('no holiday defintion state', {
                            'name': type_of_holidays,
                            'cc': location_cc,
                            'state': location_state,
                        }), 'library bug PR only');
                    }
                } else {
                    throw formatLibraryBugMessage(t('no holiday defintion', {
                        'name': type_of_holidays,
                        'cc': location_cc,
                    }), 'library bug PR only');
                }
            } else { /* We have no idea which holidays do apply because the country code was not provided. */
                throw t('no country code');
            }
        }
        /* }}} */

        /* Return variable dates used for holiday calculation. {{{
         *
         * :param year: Year as integer.
         * :returns: Hash of variables dates. Key is the name of the variable date. Value is the variable date date object.
         */
        function getMovableEventsForYear(year) {
            // calculate easter
            var C = Math.floor(year/100);
            var N = year - 19*Math.floor(year/19);
            var K = Math.floor((C - 17)/25);
            var I = C - Math.floor(C/4) - Math.floor((C - K)/3) + 19*N + 15;
            I = I - 30*Math.floor((I/30));
            I = I - Math.floor(I/28)*(1 - Math.floor(I/28)*Math.floor(29/(I + 1))*Math.floor((21 - N)/11));
            var J = year + Math.floor(year/4) + I + 2 - C + Math.floor(C/4);
            J = J - 7*Math.floor(J/7);
            var L = I - J;
            var M = 3 + Math.floor((L + 40)/44);
            var D = L + 28 - 31*Math.floor(M/4);

            // calculate orthodox easter
            var oA = year % 4;
            var oB = year % 7;
            var oC = year % 19;
            var oD = (19*oC + 15) % 30;
            var oE = (2*oA+4*oB - oD + 34) % 7;
            var oF = oD+oE;

            var oDate;
            if (oF < 9) {
                oDate = new Date(year, 4-1, oF+4);
            } else {
                if ((oF+4)<31) {
                    oDate = new Date(year, 4-1, oF+4);
                } else {
                    oDate = new Date(year, 5-1, oF-26);
                }
            }

            // calculate last Sunday in February
            var lastFebruaryDay = new Date(year, 2, 0);
            var lastFebruarySunday = lastFebruaryDay.getDate() - lastFebruaryDay.getDay();

            // calculate Victoria Day. last Monday before or on May 24
            var may_24 = new Date(year, 4, 24);
            var victoriaDay = 24  - ((6 + may_24.getDay()) % 7);

            // calculate Canada Day. July 1st unless 1st is on Sunday, then July 2.
            var july_1 = new Date(year, 6, 1);
            var canadaDay = july_1.getDay() === 0 ? 2 : 1;

            function firstWeekdayOfMonth(month, weekday){
                var first = new Date(year, month, 1);
                return 1 + ((7 + weekday - first.getDay()) % 7);
            }

            function lastWeekdayOfMonth(month, weekday){
                var last = new Date(year, month+1, 0);
                var offset=((7 + last.getDay() - weekday) % 7);
                return last.getDate() - offset;
            }

            return {
                'easter'                :  new Date(year, M - 1, D),
                'orthodox easter'       :  oDate,
                'victoriaDay'           :  new Date(year,  4, victoriaDay),
                'canadaDay'             :  new Date(year,  6, canadaDay),
                'firstJanuaryMonday'    :  new Date(year,  0, firstWeekdayOfMonth(0, 1)),
                'firstFebruaryMonday'   :  new Date(year,  1, firstWeekdayOfMonth(1, 1)),
                'lastFebruarySunday'    :  new Date(year,  1, lastFebruarySunday),
                'firstMarchMonday'      :  new Date(year,  2, firstWeekdayOfMonth(2, 1)),
                'firstAprilMonday'      :  new Date(year,  3, firstWeekdayOfMonth(3, 1)),
                'firstMayMonday'        :  new Date(year,  4, firstWeekdayOfMonth(4, 1)),
                'firstJuneMonday'       :  new Date(year,  5, firstWeekdayOfMonth(5, 1)),
                'firstJulyMonday'       :  new Date(year,  6, firstWeekdayOfMonth(6, 1)),
                'firstAugustMonday'     :  new Date(year,  7, firstWeekdayOfMonth(7, 1)),
                'firstSeptemberMonday'  :  new Date(year,  8, firstWeekdayOfMonth(8, 1)),
                'firstSeptemberSunday'  :  new Date(year,  8, firstWeekdayOfMonth(8, 0)),
                'firstOctoberMonday'    :  new Date(year,  9, firstWeekdayOfMonth(9, 1)),
                'firstNovemberMonday'   :  new Date(year, 10, firstWeekdayOfMonth(10, 1)),
                'firstMarchTuesday'     :  new Date(year,  2, firstWeekdayOfMonth(2, 2)),
                'firstAugustTuesday'    :  new Date(year,  7, firstWeekdayOfMonth(7, 2)),
                'firstAugustFriday'     :  new Date(year,  7, firstWeekdayOfMonth(7, 5)),
                'firstNovemberThursday' :  new Date(year, 10, firstWeekdayOfMonth(10, 4)),
                'lastMayMonday'         :  new Date(year,  4, lastWeekdayOfMonth(4, 1)),
                'lastMarchMonday'       :  new Date(year,  2, lastWeekdayOfMonth(2, 1)),
                'lastAprilMonday'       :  new Date(year,  3, lastWeekdayOfMonth(3, 1)),
                'lastAprilFriday'       :  new Date(year,  3, lastWeekdayOfMonth(3, 5)),
                'lastOctoberFriday'     :  new Date(year,  9, lastWeekdayOfMonth(9, 5)),
            };
        }
        /* }}} */

        function getApplyingHolidaysForYear(applying_holidays, year, add_days) {
            var movableDays = getMovableEventsForYear(year);

            var sorted_holidays = [];
            var next_holiday;

            for (var holiday_name in applying_holidays) {
                if (typeof applying_holidays[holiday_name][0] === 'string') {
                    var selected_movableDay = movableDays[applying_holidays[holiday_name][0]];
                    if (!selected_movableDay)
                        throw t('movable no formular', {'name': applying_holidays[holiday_name][0]});
                    next_holiday = new Date(selected_movableDay.getFullYear(),
                            selected_movableDay.getMonth(),
                            selected_movableDay.getDate()
                            + applying_holidays[holiday_name][1]
                        );
                    if (year !== next_holiday.getFullYear())
                        throw t('movable not in year', {
                            'name': applying_holidays[holiday_name][0], 'days': applying_holidays[holiday_name][1]});
                } else {
                    next_holiday = new Date(year,
                            applying_holidays[holiday_name][0] - 1,
                            applying_holidays[holiday_name][1]
                        );
                }
                if (add_days[0])
                    next_holiday.setDate(next_holiday.getDate() + add_days[0]);

                sorted_holidays.push([ next_holiday, holiday_name ]);
            }

            sorted_holidays = sorted_holidays.sort(function(a,b){
                if (a[0].getTime() < b[0].getTime()) return -1;
                if (a[0].getTime() > b[0].getTime()) return 1;
                return 0;
            });

            return sorted_holidays;
        }
        /* }}} */
        /* }}} */

        /* Year range parser (2013,2016-2018,2020/2). {{{
         *
         * :param tokens: List of token objects.
         * :param at: Position where to start.
         * :returns: Position at which the token does not belong to the selector anymore.
         */
        function parseYearRange(tokens, at) {
            tokens[at][3] = 'year';
            for (; at < tokens.length; at++) {
                if (matchTokens(tokens, at, 'year')) {
                    var is_range   = false,
                        has_period,
                        period;
                    if (matchTokens(tokens, at+1, '-', 'year', '/', 'number')) {
                        is_range   = true;
                        has_period = true;
                        period = parseInt(tokens[at+4][0]);
                        checkPeriod(at+4, period, 'year');
                    } else {
                        is_range   = matchTokens(tokens, at+1, '-', 'year');
                        has_period = matchTokens(tokens, at+1, '/', 'number');
                        if (has_period) {
                            period = parseInt(tokens[at+2][0]);
                            checkPeriod(at+2, period, 'year', 'no_end_year');
                        } else if (matchTokens(tokens, at+1, '+')) {
                            period = 1;
                            has_period = 2;
                        }
                    }

                    var year_from = parseInt(tokens[at][0]);
                    // error checking {{{
                        if (is_range && tokens[at+2][0] <= year_from) {
                            // handle reversed range
                            if (tokens[at+2][0] === year_from) {
                                throw formatWarnErrorMessage(nrule, at, t('year range one year', {'year': year_from }));
                            } else {
                                throw formatWarnErrorMessage(nrule, at, t('year range reverse'));
                            }
                        }
                        if (!is_range && year_from < new Date().getFullYear()) {
                            parsing_warnings.push([ nrule, at, t('year past') ]);
                        }
                        if (is_range && tokens[at+2][0] < new Date().getFullYear()) {
                            parsing_warnings.push([ nrule, at+2, t('year past') ]);
                        }
                    /* }}} */

                    selectors.year.push(function(tokens, at, year_from, is_range, has_period, period) { return function(date) {
                        var ouryear = date.getFullYear();
                        var year_to = is_range ? parseInt(tokens[at+2][0]) : year_from;

                        if (ouryear < year_from ){
                            return [false, new Date(year_from, 0, 1)];
                        } else if (has_period) {
                            if (year_from <= ouryear) {
                                if (is_range && ouryear > year_to)
                                    return [false];
                                if (period > 0) {
                                    if ((ouryear - year_from) % period === 0) {
                                        return [true, new Date(ouryear + 1, 0, 1)];
                                    } else {
                                        return [false, new Date(ouryear + period - 1, 0, 1)];
                                    }
                                }
                            }
                        } else if (is_range) {
                            if (ouryear <= year_to)
                                return [true, new Date(year_to + 1, 0, 1)];
                        } else if (ouryear === year_from) {
                            return [true];
                        }

                        return [false];

                    }}(tokens, at, year_from, is_range, has_period, period));

                    at += 1 + (is_range ? 2 : 0) + (has_period ? (has_period === 2 ? 1 : 2) : 0);
                } else if (matchTokens(tokens, at - 1, ',')) { // additional rule
                    throw formatWarnErrorMessage(nrule, at - 1, t('additional rule no sense'));
                } else {
                    throw formatWarnErrorMessage(nrule, at, t('unexpected token year range', {'token': tokens[at][1]}));
                }

                if (!matchTokens(tokens, at, ','))
                    break;
            }

            return at;
        }
        /* }}} */

        /* Week range parser (week 11-20, week 1-53/2). {{{
         *
         * :param tokens: List of token objects.
         * :param at: Position where to start.
         * :returns: Position at which the token does not belong to the selector anymore.
         */
        function parseWeekRange(tokens, at) {
            for (; at < tokens.length; at++) {
                if (matchTokens(tokens, at, 'week')) {
                    at++;
                }
                if (matchTokens(tokens, at, 'number')) {
                    var is_range = matchTokens(tokens, at+1, '-', 'number'), period = 0;
                    var week_from = tokens[at][0];
                    var week_to   = is_range ? tokens[at+2][0] : week_from;
                    if (week_from > week_to) {
                        throw formatWarnErrorMessage(nrule, at+2, t('week range reverse'));
                    }
                    if (week_from < 1) {
                        throw formatWarnErrorMessage(nrule, at, t('week negative'));
                    }
                    if (week_to > 53) {
                        throw formatWarnErrorMessage(nrule, is_range ? at+2 : at, t('week exceed'));
                    }
                    if (is_range) {
                        period = matchTokens(tokens, at+3, '/', 'number');
                        if (period) {
                            period = tokens[at+4][0];
                            if (period < 2) {
                                throw formatWarnErrorMessage(nrule, at+4, t('week period less than 2', {
                                    'weekfrom': week_from, 'weekto': week_to, 'period': period}));
                            } else if (period > 26) {
                                throw formatWarnErrorMessage(nrule, at+4, t('week period greater than 26', {
                                    'weekfrom': week_from
                                }));
                            }
                        }
                    }

                    if (week_stable && (!(week_from <= 1 && week_to >= 53) || period)) {
                        week_stable = false;
                    }

                    if (!period && week_from === 1 && week_to === 53) {
                        /* Shortcut and work around bug. */
                        selectors.week.push(function() { return [true]; });
                    } else {

                        selectors.week.push(function(week_from, week_to, period) { return function(date) {
                            var ourweek = getWeekNumber(date);

                            // console.log("week_from: %s, week_to: %s", week_from, week_to);
                            // console.log("ourweek: %s, date: %s", ourweek, date);

                            // before range
                            if (ourweek < week_from) {
                                // console.log("Before: " + getNextDateOfISOWeek(week_from, date));
                                return [false, getNextDateOfISOWeek(week_from, date)];
                            }

                            // we're after range, set check date to next year
                            if (ourweek > week_to) {
                                // console.log("After");
                                return [false, getNextDateOfISOWeek(week_from, date)];
                            }

                            // we're in range
                            if (period) {
                                var in_period = (ourweek - week_from) % period === 0;
                                if (in_period) {
                                    return [true, getNextDateOfISOWeek(ourweek + 1, date)];
                                } else {
                                    return [false, getNextDateOfISOWeek(ourweek + period - 1, date)];
                                }
                            }

                            // console.log("Match");
                            return [true, getNextDateOfISOWeek(week_to === 53 ? 1 : week_to + 1, date)];
                        }}(week_from, week_to, period));
                    }

                    at += 1 + (is_range ? 2 : 0) + (period ? 2 : 0);
                } else if (matchTokens(tokens, at - 1, ',')) { // additional rule
                    throw formatWarnErrorMessage(nrule, at - 1, t('additional rule no sense'));
                } else {
                    throw formatWarnErrorMessage(nrule, at, t('unexpected token week range', {'token': tokens[at][1]}));
                }

                if (!matchTokens(tokens, at, ','))
                    break;
            }

            return at;
        }

        // https://stackoverflow.com/a/6117889
        /* For a given date, get the ISO week number
         *
         * Based on information at:
         *
         *    http://www.merlyn.demon.co.uk/weekcalc.htm#WNR
         *
         * Algorithm is to find nearest thursday, it's year
         * is the year of the week number. Then get weeks
         * between that date and the first day of that year.
         *
         * Note that dates in one year can be weeks of previous
         * or next year, overlap is up to 3 days.
         *
         * e.g. 2014/12/29 is Monday in week  1 of 2015
         *      2012/1/1   is Sunday in week 52 of 2011
         */
        function getWeekNumber(d) {
            // Copy date so don't modify original
            d = new Date(+d);
            d.setHours(0,0,0);
            // Set to nearest Thursday: current date + 4 - current day number
            // Make Sunday's day number 7
            d.setDate(d.getDate() + 4 - (d.getDay()||7));
            // Get first day of year
            var yearStart = new Date(d.getFullYear(),0,1);
            // Calculate full weeks to nearest Thursday
            return Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7)
        }
        // https://stackoverflow.com/a/16591175
        function getDateOfISOWeek(w, year) {
            var simple = new Date(year, 0, 1 + (w - 1) * 7);
            var dow = simple.getDay();
            var ISOweekStart = simple;
            if (dow <= 4)
                ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
            else
                ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
            return ISOweekStart;
        }
        function getNextDateOfISOWeek(week, date) {
            var next_date;
            for (var i = -1; i <= 1; i++) {
                next_date = getDateOfISOWeek(week, date.getFullYear() + i);
                if (next_date.getTime() > date.getTime()) {
                    return next_date;
                }
            }
            throw formatLibraryBugMessage();
        }
        /* }}} */

        /* Month range parser (Jan,Feb-Mar). {{{
         *
         * :param tokens: List of token objects.
         * :param at: Position where to start.
         * :param push_to_monthday: Will push the selector into the monthday selector array which has the desired side effect of working in conjunction with the monthday selectors (either the month match or the monthday).
         * :returns: Position at which the token does not belong to the selector anymore.
         */
        function parseMonthRange(tokens, at, push_to_monthday, in_selector) {
            if (!in_selector)
                tokens[at][3] = 'month';

            for (; at < tokens.length; at++) {
                // Use parseMonthdayRange if '<month> <daynum>' and not '<month> <hour>:<minute>'
                if (matchTokens(tokens, at, 'month', 'number') && !matchTokens(tokens, at+2, 'timesep', 'number')) {
                    return parseMonthdayRange(tokens, at, nrule, true);
                } else if (matchTokens(tokens, at, 'month')) {
                    // Single month (Jan) or month range (Feb-Mar)
                    var is_range = matchTokens(tokens, at+1, '-', 'month');

                    var month_from = tokens[at][0];
                    var month_to = is_range ? tokens[at+2][0] : month_from;

                    if (is_range && week_stable) {
                        if (month_from !== (month_to + 1) % 12)
                            week_stable = false;
                    } else {
                        week_stable = false;
                    }

                    var inside = true;

                    // handle reversed range
                    if (month_to < month_from) {
                        var tmp = month_to;
                        month_to = month_from - 1;
                        month_from = tmp + 1;
                        inside = false;
                    }

                    var selector = function(month_from, month_to, inside) { return function(date) {
                        var ourmonth = date.getMonth();

                        if (month_to < month_from) {
                            /* Handle full range. */
                            return [!inside];
                        }

                        if (ourmonth < month_from || ourmonth > month_to) {
                            return [!inside, dateAtNextMonth(date, month_from)];
                        } else {
                            return [inside, dateAtNextMonth(date, month_to + 1)];
                        }
                    }}(month_from, month_to, inside);

                    if (push_to_monthday === true)
                        selectors.monthday.push(selector);
                    else
                        selectors.month.push(selector);

                    at += is_range ? 3 : 1;
                } else {
                    throw formatWarnErrorMessage(nrule, at, t('unexpected token month range', {'token': tokens[at][1]}));
                }

                if (!matchTokens(tokens, at, ','))
                    break;
            }

            return at;
        }

        function dateAtNextMonth(date, month) {
            return new Date(date.getFullYear(), month < date.getMonth() ? month + 12 : month);
        }
        /* }}} */

        /* Month day range parser (Jan 26-31; Jan 26-Feb 26). {{{
         *
         * :param tokens: List of token objects.
         * :param at: Position where to start.
         * :param nrule: Rule number starting with 0.
         * :param push_to_month: Will push the selector into the month selector array which has the desired side effect of working in conjunction with the month selectors (either the month match or the monthday).
         * :returns: Position at which the token does not belong to the selector anymore.
         */
        function parseMonthdayRange(tokens, at, nrule, push_to_month) {
            if (!push_to_month)
                tokens[at][3] = 'month';

            for (; at < tokens.length; at++) {
                var has_year = [], has_month = [], has_event = [], has_calc = [], has_constrained_weekday = [];
                has_year[0]  = matchTokens(tokens, at, 'year');
                has_month[0] = matchTokens(tokens, at+has_year[0], 'month', 'number');
                has_event[0] = matchTokens(tokens, at+has_year[0], 'event');

                if (has_event[0])
                    has_calc[0] = getMoveDays(tokens, at+has_year[0]+1, 200, 'event like easter');

                var at_range_sep;
                if (matchTokens(tokens, at+has_year[0], 'month', 'weekday', '[')) {
                    has_constrained_weekday[0] = getConstrainedWeekday(tokens, at+has_year[0]+3);
                    has_calc[0] = getMoveDays(tokens, has_constrained_weekday[0][1], 6, 'constrained weekdays');
                    at_range_sep = has_constrained_weekday[0][1] + (typeof has_calc[0] === 'object' && has_calc[0][1] ? 3 : 0);
                } else {
                    at_range_sep = at+has_year[0]
                        + (has_event[0]
                            ? (typeof has_calc[0] === 'object' && has_calc[0][1] ? 4 : 1)
                            : 2);
                }

                var at_sec_event_or_month;
                if ((has_month[0] || has_event[0] || has_constrained_weekday[0]) && matchTokens(tokens, at_range_sep, '-')) {
                    has_year[1] = matchTokens(tokens, at_range_sep+1, 'year');
                    at_sec_event_or_month = at_range_sep+1+has_year[1];
                    has_month[1] = matchTokens(tokens, at_sec_event_or_month, 'month', 'number');
                    if (!has_month[1]) {
                        has_event[1] = matchTokens(tokens, at_sec_event_or_month, 'event');
                        if (has_event[1]) {
                            has_calc[1] = getMoveDays(tokens, at_sec_event_or_month+1, 366, 'event like easter');
                        } else if (matchTokens(tokens, at_sec_event_or_month, 'month', 'weekday', '[')) {
                            has_constrained_weekday[1] = getConstrainedWeekday(tokens, at_sec_event_or_month+3);
                            has_calc[1] = getMoveDays(tokens, has_constrained_weekday[1][1], 6, 'constrained weekdays');
                        }
                    }
                }

                // monthday range like Jan 26-Feb 26 {{{
                if (has_year[0] === has_year[1] && (has_month[1] || has_event[1] || has_constrained_weekday[1])) {

                    if (has_month[0])
                        checkIfDateIsValid(tokens[at+has_year[0]][0], tokens[at+has_year[0]+1][0], nrule, at+has_year[0]+1);
                    if (has_month[1])
                        checkIfDateIsValid(tokens[at_sec_event_or_month][0], tokens[at_sec_event_or_month+1][0], nrule, at_sec_event_or_month+1);

                    var selector = function(tokens, at, nrule, has_year, has_event, has_calc, at_sec_event_or_month, has_constrained_weekday) { return function(date) {
                        var start_of_next_year = new Date(date.getFullYear() + 1, 0, 1);

                        var movableDays, from_date;
                        if (has_event[0]) {
                            movableDays = getMovableEventsForYear(has_year[0] ? parseInt(tokens[at][0]) : date.getFullYear());
                            from_date = movableDays[tokens[at+has_year[0]][0]];

                            if (typeof has_calc[0] === 'object' && has_calc[0][1]) {
                                var from_year_before_calc = from_date.getFullYear();
                                from_date.setDate(from_date.getDate() + has_calc[0][0]);
                                if (from_year_before_calc !== from_date.getFullYear())
                                    throw formatWarnErrorMessage(nrule, at+has_year[0]+has_calc[0][1]*3,
                                        t('movable not in year', {'name': tokens[at+has_year[0]][0], 'days': has_calc[0][0]}));
                            }
                        } else if (has_constrained_weekday[0]) {
                            from_date = getDateForConstrainedWeekday((has_year[0] ? tokens[at][0] : date.getFullYear()), // year
                                tokens[at+has_year[0]][0], // month
                                tokens[at+has_year[0]+1][0], // weekday
                                has_constrained_weekday[0],
                                has_calc[0]);
                        } else {
                            from_date = new Date((has_year[0] ? tokens[at][0] : date.getFullYear()),
                                tokens[at+has_year[0]][0], tokens[at+has_year[0]+1][0]);
                        }

                        var to_date;
                        if (has_event[1]) {
                            movableDays = getMovableEventsForYear(has_year[1]
                                        ? parseInt(tokens[at_sec_event_or_month-1][0])
                                        : date.getFullYear());
                            to_date = movableDays[tokens[at_sec_event_or_month][0]];

                            if (typeof has_calc[1] === 'object' && has_calc[1][1]) {
                                var to_year_before_calc = to_date.getFullYear();
                                to_date.setDate(to_date.getDate() + has_calc[1][0]);
                                if (to_year_before_calc !== to_date.getFullYear()) {
                                    throw formatWarnErrorMessage(nrule, at_sec_event_or_month+has_calc[1][1],
                                        t('movable not in year', {'name': tokens[at_sec_event_or_month][0], 'days':  has_calc[1][0] }));
                                }
                            }
                        } else if (has_constrained_weekday[1]) {
                            to_date = getDateForConstrainedWeekday((has_year[1] ? tokens[at_sec_event_or_month-1][0] : date.getFullYear()), // year
                                tokens[at_sec_event_or_month][0],   // month
                                tokens[at_sec_event_or_month+1][0], // weekday
                                has_constrained_weekday[1],
                                has_calc[1]);
                        } else {
                            to_date = new Date((has_year[1] ? tokens[at_sec_event_or_month-1][0] : date.getFullYear()),
                                tokens[at_sec_event_or_month][0], tokens[at_sec_event_or_month+1][0] + 1);
                        }

                        var inside = true;

                        if (to_date < from_date) {
                            var tmp = to_date;
                            to_date = from_date;
                            from_date = tmp;
                            inside = false;
                        }

                        if (date.getTime() < from_date.getTime()) {
                            return [!inside, from_date];
                        } else if (date.getTime() < to_date.getTime()) {
                            return [inside, to_date];
                        } else {
                            if (has_year[0]) {
                                return [!inside];
                            } else {
                                return [!inside, start_of_next_year];
                            }
                        }
                    }}(tokens, at, nrule, has_year, has_event, has_calc, at_sec_event_or_month, has_constrained_weekday);

                    if (push_to_month === true)
                        selectors.month.push(selector);
                    else
                        selectors.monthday.push(selector);

                    at = (has_constrained_weekday[1]
                            ? has_constrained_weekday[1][1]
                            : at_sec_event_or_month + (has_event[1] ? 1 : 2))
                        + (typeof has_calc[1] === 'object' ? has_calc[1][1] : 0);

                    /* }}} */
                    // Monthday range like Jan 26-31 {{{
                } else if (has_month[0]) {

                    has_year = has_year[0];
                    var year = tokens[at][0]; // Could be month if has no year. Tested later.
                    var month = tokens[at+has_year][0];

                    var first_round = true;

                    do {
                        var range_from = tokens[at+1 + has_year][0];
                        var is_range = matchTokens(tokens, at+2+has_year, '-', 'number');
                        var period = undefined;
                        var range_to = tokens[at+has_year+(is_range ? 3 : 1)][0] + 1;
                        if (is_range && matchTokens(tokens, at+has_year+4, '/', 'number')) {
                            period = tokens[at+has_year+5][0];
                            checkPeriod(at+has_year+5, period, 'day');
                        }

                        if (first_round) {
                            var at_timesep_if_monthRange = at + has_year + 1 // at month number
                                + (is_range ? 2 : 0) + (period ? 2 : 0)
                                + !(is_range || period); // if not range nor has period, add one

                            // Check for '<month> <timespan>'
                            if (matchTokens(tokens, at_timesep_if_monthRange, 'timesep', 'number')
                                    && (matchTokens(tokens, at_timesep_if_monthRange+2, '+')
                                        || matchTokens(tokens, at_timesep_if_monthRange+2, '-')
                                        || oh_mode !== 0)
                                ) {
                                    return parseMonthRange(tokens, at, true, true);
                            }
                        }

                        // error checking {{{
                        if (range_to < range_from)
                            throw formatWarnErrorMessage(nrule, at+has_year+3, t('day range reverse'));

                        checkIfDateIsValid(month, range_from, nrule, at+1 + has_year);
                        checkIfDateIsValid(month, range_to - 1 /* added previously */,
                            nrule, at+has_year+(is_range ? 3 : 1));
                        /* }}} */

                        var selector = function(year, has_year, month, range_from, range_to, period) { return function(date) {
                            var start_of_next_year = new Date(date.getFullYear() + 1, 0, 1);

                            var from_date = new Date(has_year ? year : date.getFullYear(),
                                month, range_from);
                            if (month === 1 && range_from !== from_date.getDate()) // Only on leap years does this day exist.
                                return [false]; // If day 29 does not exist,
                                                // then the date object adds one day to date
                                                // and this selector should not match.
                            var to_date   = new Date(from_date.getFullYear(),
                                month, range_to);
                            if (month === 1 && is_range && range_to !== to_date.getDate()) // Only on leap years does this day exist.
                                return [false];

                            if (date.getTime() < from_date.getTime())
                                return [false, from_date];
                            else if (date.getTime() >= to_date.getTime())
                                return [false, start_of_next_year];
                            else if (!period)
                                return [true, to_date];

                            var nday = Math.floor((date.getTime() - from_date.getTime()) / msec_in_day);
                            var in_period = nday % period;

                            if (in_period === 0)
                                return [true, new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)];
                            else
                                return [false, new Date(date.getFullYear(), date.getMonth(), date.getDate() + period - in_period)];

                        }}(year, has_year, month, range_from, range_to, period);

                        if (push_to_month === true)
                            selectors.month.push(selector);
                        else
                            selectors.monthday.push(selector);

                        at += 2 + has_year + (is_range ? 2 : 0) + (period ? 2 : 0);

                        first_round = false;
                    }
                    while (matchTokens(tokens, at, ',', 'number'))


                    /* }}} */
                    // Only event like easter {{{
                } else if (has_event[0]) {

                    var selector = function(tokens, at, nrule, has_year, add_days) { return function(date) {

                        // console.log('enter selector with date: ' + date);
                        var movableDays = getMovableEventsForYear((has_year ? tokens[at][0] : date.getFullYear()));
                        var event_date = movableDays[tokens[at+has_year][0]];
                        if (!event_date)
                            throw t('movable no formular', {'name': tokens[at+has_year][0]});

                        if (add_days[0]) {
                            event_date.setDate(event_date.getDate() + add_days[0]);
                            if (date.getFullYear() !== event_date.getFullYear())
                                throw formatWarnErrorMessage(nrule, at+has_year+add_days[1], t('movable not in year', {
                                    'name': tokens[at+has_year][0], 'days': add_days[0]}));
                        }

                        if (date.getTime() < event_date.getTime())
                            return [false, event_date];
                        // else if (date.getTime() < event_date.getTime() + msec_in_day) // does not work because of daylight saving times
                        else if (event_date.getMonth() * 100 + event_date.getDate() === date.getMonth() * 100 + date.getDate())
                            return [true, new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)];
                        else
                            return [false, new Date(date.getFullYear() + 1, 0, 1)];

                    }}(tokens, at, nrule, has_year[0], has_calc[0]);

                    if (push_to_month === true)
                        selectors.month.push(selector);
                    else
                        selectors.monthday.push(selector);

                    at += has_year[0] + has_event[0] + (typeof has_calc[0][1] === 'number' && has_calc[0][1] ? 3 : 0);
                    /* }}} */
                } else if (has_constrained_weekday[0]) {
                    at = parseMonthRange(tokens, at);
                } else if (matchTokens(tokens, at, 'month')) {
                    return parseMonthRange(tokens, at, true, true);
                } else {
                    // throw 'Unexpected token in monthday range: "' + tokens[at] + '"';
                    return at;
                }

                if (!matchTokens(tokens, at, ','))
                    break;
            }

            return at;
        }
        /* }}} */

        /* Main selector traversal function (return state array for date). {{{
         * Checks for given date which rule and those which state and comment applies.
         *
         * :param date: Date object.
         * :returns: Array:
         *            0. resultstate: State: true for 'open', false for 'closed'.
         *            1. changedate: Next change as date object.
         *            2. unknown: true if state open is not sure.
         *            3. comment: Comment which applies for this time range (from date to changedate).
         *            4. match_rule: Rule number starting with 0 (nrule).
         */
        this.getStatePair = function(date) {
            var resultstate = false;
            var changedate;
            var unknown = false;
            var comment;
            var match_rule;

            var date_matching_rules = [];

            /* Go though all date selectors and check if they return something
             * else than closed for the given date.
             */
            for (var nrule = 0; nrule < rules.length; nrule++) {
                var matching_date_rule = true;
                // console.log(nrule, 'length',  rules[nrule].date.length);

                /* Try each date selector type. */
                for (var ndateselector = 0; ndateselector < rules[nrule].date.length; ndateselector++) {
                    var dateselectors = rules[nrule].date[ndateselector];
                    // console.log(nrule, ndateselector);

                    var has_matching_selector = false;
                    for (var datesel = 0; datesel < dateselectors.length; datesel++) {
                        var res = dateselectors[datesel](date);
                        if (res[0]) {
                            has_matching_selector = true;

                            if (typeof res[2] === 'string') { // holiday name
                                comment = [ res[2], nrule ];
                            }

                        }
                        if (typeof changedate === 'undefined' || (typeof res[1] === 'object' && res[1].getTime() < changedate.getTime()))
                            changedate = res[1];
                    }

                    if (!has_matching_selector) {
                        matching_date_rule = false;
                        // We can ignore other date selectors, as the state won't change
                        // anyway until THIS selector matches (due to conjunction of date
                        // selectors of different types).
                        // This is also an optimization, if widest date selector types
                        // are checked first.
                        break;
                    }
                }

                if (matching_date_rule) {
                    /* The following lines implement date overwriting logic (e.g. for
                     * "Mo-Fr 10:00-20:00; We 10:00-16:00", We rule overrides Mo-Fr rule partly (We).
                     *
                     * This is the only way to be consistent. I thought about ("22:00-02:00; Tu 12:00-14:00") letting Th override 22:00-02:00 partly:
                     * Like: Th 00:00-02:00,12:00-14:00 but this would result in including 22:00-00:00 for Th which is probably not what you want.
                     */
                    if ((rules[nrule].date.length > 0 || nrule > 0 && rules[nrule].meaning && rules[nrule-1].date.length === 0)
                            && (rules[nrule].meaning || rules[nrule].unknown)
                            && !rules[nrule].wrapped && !rules[nrule].additional && !rules[nrule].fallback
                        ) {

                        // var old_date_matching_rules = date_matching_rules;
                        date_matching_rules = [];
                        // for (var nrule = 0; nrule < old_date_matching_rules.length; nrule++) {
                        //     if (!rules[old_date_matching_rules[nrule]].wrapped)
                        //         date_matching_rules.push(nrule);
                        // }
                    }
                    date_matching_rules.push(nrule);
                }
            }

            // console.log(date_matching_rules);
            for (var nrule = 0; nrule < date_matching_rules.length; nrule++) {
                var rule = date_matching_rules[nrule];

                // console.log('Processing rule ' + rule + ': with date ' + date
                    // + ' and ' + rules[rule].time.length + ' time selectors (comment: "' + rules[rule].comment + '").');

                /* There is no time specified, state applies to the whole day. */
                if (rules[rule].time.length === 0) {
                    // console.log('there is no time', date);
                    if (!rules[rule].fallback || (rules[rule].fallback && !(resultstate || unknown))) {
                        resultstate = rules[rule].meaning;
                        unknown     = rules[rule].unknown;
                        match_rule  = rule;

                        // if (rules[rule].fallback)
                            // break rule; // fallback rule matched, no need for checking the rest
                        // WRONG: What if closing rules follow?
                    }
                }

                for (var timesel = 0; timesel < rules[rule].time.length; timesel++) {
                    var res = rules[rule].time[timesel](date);

                    // console.log('res:', res);
                    if (res[0]) {
                        if (!rules[rule].fallback || (rules[rule].fallback && !(resultstate || unknown))) {
                            resultstate = rules[rule].meaning;
                            unknown     = rules[rule].unknown;
                            match_rule  = rule;

                            /* Reset open end comment */
                            if (typeof comment === 'object' && comment[0] === t('open end'))
                                comment = undefined;

                            // open end
                            if (res[2] === true && (resultstate || unknown)) {
                                comment = [ t('open end'), match_rule ];

                                resultstate = false;
                                unknown     = true;

                                /* Hack to make second rule in '07:00+,12:00-16:00; 16:00-24:00 closed "needed because of open end"' obsolete {{{ */
                                if (typeof rules[rule].time[timesel+1] === 'function') {

                                    var next_res = rules[rule].time[timesel+1](date);
                                    if (  !next_res[0]
                                        // && next_res[2]
                                        && typeof next_res[1] === 'object'
                                        // && getValueForDate(next_res[1], true) !== getValueForDate(date, true) // Just to be sure.
                                        && rules[rule].time[timesel](new Date(date.getTime() - 1))[0]
                                        /* To distinguish the following two values:
                                         *     'sunrise-14:00,14:00+',
                                         *   '07:00+,12:00-16:00',
                                         */
                                        ) {

                                        // console.log("07:00+,12:00-16:00 matched.");

                                        resultstate = false;
                                        unknown     = false;
                                    }
                                }

                                /* Hack to handle '17:00+,13:00-02:00' {{{ */
                                /* Not enabled. To complicated, just don‘t use them …
                                 * It gets even crazier …
                                 * Time wrapping over midnight is
                                 * stored in the next internal rule:
                                 * '17:00-00:00 unknown "Specified as open end. Closing time was guessed.", 13:00-00:00 open' // First internal rule.
                                 * + ', ' overwritten part: 00:00-03:00 open + '00:00-02:00 open', // Second internal rule.
                                 */
                                if (    false
                                        && typeof rules[rule-1] === 'object'
                                        && rules[rule].build_from_token_rule.toString() === rules[rule-1].build_from_token_rule.toString()
                                        && typeof rules[rule] === 'object'
                                        && rules[rule].build_from_token_rule.toString() === rules[rule].build_from_token_rule.toString()
                                        ) {

                                    var last_wrapping_time_selector = rules[rule].time[rules[rule].time.length - 1];
                                    var last_w_res = last_wrapping_time_selector(new Date(date.getTime() - 1));
                                    // console.log(last_w_res);

                                    if (    last_w_res[0]
                                            &&  typeof last_w_res[2] === 'undefined'
                                            && (typeof last_w_res[2] === 'undefined' || last_w_res[2] === false) // Do not match for 'Tu 23:59-40:00+'
                                            &&  typeof last_w_res[1] === 'object'
                                            && date.getTime() === last_w_res[1].getTime()
                                        ) {

                                        // '05:00-06:00,17:00+,13:00-02:00',

                                        // console.log("17:00+,13:00-02:00 matched.");
                                        // console.log(JSON.stringify(rules, null, '    '));

                                        resultstate = false;
                                        unknown     = false;
                                    }
                                /* }}} */
                                }
                                /* }}} */
                            }

                            if (rules[rule].fallback) {
                                if (typeof changedate === 'undefined' || (typeof res[1] !== 'undefined' && res[1] < changedate)) {
                                    // FIXME: Changing undefined does not break the test framework.
                                    changedate = res[1];
                                }

                                // break rule; // Fallback rule matched, no need for checking the rest.
                                // WRONG: What if 'off' is used after fallback rule.
                            }
                        }
                    }
                    if (typeof changedate === 'undefined' || (typeof res[1] === 'object' && res[1] < changedate))
                        changedate = res[1];
                }
            }

            if (typeof rules[match_rule] === 'object' && typeof rules[match_rule].comment === 'string') {
                /* Only use comment if one is explicitly specified. */
                comment = rules[match_rule].comment;
            } else if (typeof comment === 'object') {
                if (comment[1] === match_rule) {
                    comment = comment[0];
                } else {
                    comment = undefined;
                }
            }

            // console.log('changedate', changedate, resultstate, comment, match_rule);
            return [ resultstate, changedate, unknown, comment, match_rule ];
        };
        /* }}} */

        /* Generate prettified value for selector based on tokens. {{{
         *
         * :param tokens: List of token objects.
         * :param at: Position where to start.
         * :param last_at: Position where to stop.
         * :param conf: Configuration options.
         * :returns: Prettified value.
         */
        function prettifySelector(tokens, selector_start, selector_end, selector_type, conf) {

            var prettified_value = '';
            var at = selector_start;
            while (at <= selector_end) {
                // console.log('At: ' + at + ', token: ' + tokens[at]);
                if (matchTokens(tokens, at, 'weekday')) {
                    if (!conf.leave_weekday_sep_one_day_betw
                        && at - selector_start > 1 && (matchTokens(tokens, at-1, ',') || matchTokens(tokens, at-1, '-'))
                        && matchTokens(tokens, at-2, 'weekday')
                        && tokens[at][0] === (tokens[at-2][0] + 1) % 7) {
                            prettified_value = prettified_value.substring(0, prettified_value.length - 1) + conf.sep_one_day_between;
                    }
                    prettified_value += weekdays[tokens[at][0]];
                } else if (at - selector_start > 0 // e.g. '09:0' -> '09:00'
                        && selector_type === 'time'
                        && matchTokens(tokens, at-1, 'timesep')
                        && matchTokens(tokens, at, 'number')) {
                    prettified_value += (tokens[at][0] < 10 ? '0' : '') + tokens[at][0].toString();
                } else if (selector_type === 'time' // e.g. '9:00' -> ' 09:00'
                        && conf.zero_pad_hour
                        && at !== tokens.length
                        && matchTokens(tokens, at, 'number')
                        && matchTokens(tokens, at+1, 'timesep')) {
                    prettified_value += (
                            tokens[at][0] < 10 ?
                                (tokens[at][0] === 0 && conf.one_zero_if_hour_zero ?
                                 '' : '0') :
                                '') + tokens[at][0].toString();
                } else if (selector_type === 'time' // e.g. '9-18' -> '09:00-18:00'
                        && at + 2 <= selector_end
                        && matchTokens(tokens, at, 'number')
                        && matchTokens(tokens, at+1, '-')
                        && matchTokens(tokens, at+2, 'number')) {
                    prettified_value += (tokens[at][0] < 10 ?
                            (tokens[at][0] === 0 && conf.one_zero_if_hour_zero ? '' : '0')
                            : '') + tokens[at][0].toString();
                    prettified_value += ':00-'
                        + (tokens[at+2][0] < 10 ? '0' : '') + tokens[at+2][0].toString()
                        + ':00';
                    at += 2;
                } else if (matchTokens(tokens, at, 'comment')) {
                    prettified_value += '"' + tokens[at][0].toString() + '"';
                } else if (matchTokens(tokens, at, 'closed')) {
                    prettified_value += (conf.leave_off_closed ? tokens[at][0] : conf.keyword_for_off_closed);
                } else if (at - selector_start > 0 && matchTokens(tokens, at, 'number')
                        && (matchTokens(tokens, at-1, 'month') && selector_type === 'month'
                        ||  matchTokens(tokens, at-1, 'week')  && selector_type === 'week'
                        )) {
                    prettified_value += ' '
                        + (conf.zero_pad_month_and_week_numbers && tokens[at][0] < 10 ? '0' : '')
                        + tokens[at][0];
                } else if (at - selector_start > 0 && matchTokens(tokens, at, 'month')
                        && matchTokens(tokens, at-1, 'year')) {
                    prettified_value += ' ' + months[[tokens[at][0]]];
                } else if (at - selector_start > 0 && matchTokens(tokens, at, 'event')
                        && matchTokens(tokens, at-1, 'year')) {
                    prettified_value += ' ' + tokens[at][0];
                } else if (matchTokens(tokens, at, 'month')) {
                    prettified_value += months[[tokens[at][0]]];
                    if (at + 1 <= selector_end && matchTokens(tokens, at+1, 'weekday'))
                        prettified_value += ' ';
                } else if (at + 2 <= selector_end
                        && (matchTokens(tokens, at, '-') || matchTokens(tokens, at, '+'))
                        && matchTokens(tokens, at+1, 'number', 'calcday')) {
                    prettified_value += ' ' + tokens[at][0] + tokens[at+1][0] + ' day' + (Math.abs(tokens[at+1][0]) === 1 ? '' : 's');
                    at += 2;
                } else if (at === selector_end
                        && selector_type === 'weekday'
                        && tokens[at][0] === ':') {
                    // Do nothing.
                } else {
                    prettified_value += tokens[at][0].toString();
                }
                at++;
            }
            return prettified_value;
        }
        /* }}} */

        //======================================================================
        // Public interface {{{
        // All functions below are considered public.
        //======================================================================

        // Simple API {{{

        this.getState = function(date) {
            var it = this.getIterator(date);
            return it.getState();
        };

        this.getUnknown = function(date) {
            var it = this.getIterator(date);
            return it.getUnknown();
        };

        this.getStateString = function(date, past) {
            var it = this.getIterator(date);
            return it.getStateString(past);
        };

        this.getComment = function(date) {
            var it = this.getIterator(date);
            return it.getComment();
        };

        this.getMatchingRule = function(date) {
            var it = this.getIterator(date);
            return it.getMatchingRule();
        };

        /* Not available for iterator API {{{ */
        /* getWarnings: Get warnings, empty list if none {{{ */
        this.getWarnings = function() {
            var it = this.getIterator();
            return getWarnings(it);
        };
        /* }}} */

        /* prettifyValue: Get a nicely formated value {{{ */
        this.prettifyValue = function(argument_hash) {
            this.getWarnings();
            /* getWarnings has to be run before prettifyValue because some
             * decisions if certain aspects makes sense to prettify or not
             * are influenced by warnings.
             * Basically, both functions depend on each other in some way :(
             * See done_with_selector_reordering.
             */
            return prettifyValue(argument_hash);
        };
        /* }}} */

        /* getNextChange: Get time of next status change {{{ */
        this.getNextChange = function(date, maxdate) {
            var it = this.getIterator(date);
            if (!it.advance(maxdate))
                return undefined;
            return it.getDate();
        };
        /* }}} */

        /* isWeekStable: Checks whether open intervals are same for every week. {{{ */
        this.isWeekStable = function() {
            return week_stable;
        };
        /* }}} */

        /* isEqualTo: Check if this opening_hours object has the same meaning as the given opening_hours object. {{{ */
        this.isEqualTo = function(second_oh_object, start_date) {
            if (typeof start_date === 'undefined') {
                var start_date = new Date();
            }
            var datelimit;

            if (this.isWeekStable() && second_oh_object.isWeekStable()) {
                datelimit = new Date(start_date.getTime() + msec_in_day * 10);
            // } else if (this.isWeekStable() !== second_oh_object.isWeekStable()) {
            //     return [ false,
            //         {
            //             'reason': 'isWeekStable do not match',
            //         }
            //     ];
            } else {
                datelimit = new Date(start_date.getTime() + msec_in_day * 366 * 5);
            }

            var first_it = this.getIterator(start_date);
            var second_it = second_oh_object.getIterator(start_date);

            while (first_it.advance(datelimit)) {
                second_it.advance(datelimit);

                var not_equal = [];

                if (first_it.getDate().getTime() !== second_it.getDate().getTime()) {
                    not_equal.push('getDate');
                }

                if (first_it.getState() !== second_it.getState()) {
                    not_equal.push('getState');
                }

                if (first_it.getUnknown() !== second_it.getUnknown()) {
                    not_equal.push('getUnknown');
                }

                if (first_it.getComment() !== second_it.getComment()) {
                    not_equal.push('getComment');
                }

                if (not_equal.length) {
                    var deviation_for_time = {};
                    deviation_for_time[first_it.getDate().getTime()] = not_equal;
                    return [ false,
                        {
                            'matching_rule': first_it.getMatchingRule(),
                            'matching_rule_other': second_it.getMatchingRule(),
                            'deviation_for_time': deviation_for_time,
                        }
                    ];
                }
            }

            return [ true ];
        };
        /* }}} */
        /* }}} */
        /* }}} */

        // High-level API {{{
        /* getOpenIntervals: Get array of open intervals between two dates {{{ */
        this.getOpenIntervals = function(from, to) {
            var res = [];

            var it = this.getIterator(from);

            if (it.getState() || it.getUnknown()) {
                res.push([from, undefined, it.getUnknown(), it.getComment()]);
            }

            while (it.advance(to)) {
                if (it.getState() || it.getUnknown()) {
                    if (res.length !== 0 && typeof res[res.length - 1][1] === 'undefined') {
                        // last state was also open or unknown
                        res[res.length - 1][1] = it.getDate();
                    }
                    res.push([it.getDate(), undefined, it.getUnknown(), it.getComment()]);
                } else {
                    if (res.length !== 0 && typeof res[res.length - 1][1] === 'undefined') {
                        // only use the first time as closing/change time and ignore closing times which might follow
                        res[res.length - 1][1] = it.getDate();
                    }
                }
            }

            if (res.length > 0 && typeof res[res.length - 1][1] === 'undefined') {
                res[res.length - 1][1] = to;
            }

            return res;
        };
        /* }}} */

        /* getOpenDuration: Get total number of milliseconds a facility is open,unknown within a given date range {{{ */
        this.getOpenDuration = function(from, to) {
        // console.log('-----------');

            var open    = 0;
            var unknown = 0;

            var it = this.getIterator(from);
            var prevdate    = (it.getState() || it.getUnknown()) ? from : undefined;
            var prevstate   = it.getState();
            var prevunknown = it.getUnknown();

            while (it.advance(to)) {
                if (it.getState() || it.getUnknown()) {

                    if (typeof prevdate === 'object') {
                        // last state was also open or unknown
                        if (prevunknown) //
                            unknown += it.getDate().getTime() - prevdate.getTime();
                        else if (prevstate)
                            open    += it.getDate().getTime() - prevdate.getTime();
                    }

                    prevdate    = it.getDate();
                    prevstate   = it.getState();
                    prevunknown = it.getUnknown();
                    // console.log('if', prevdate, open / (1000 * 60 * 60), unknown / (1000 * 60 * 60));
                } else {
                    // console.log('else', prevdate);
                    if (typeof prevdate === 'object') {
                        if (prevunknown)
                            unknown += it.getDate().getTime() - prevdate.getTime();
                        else
                            open    += it.getDate().getTime() - prevdate.getTime();
                        prevdate = undefined;
                    }
                }
            }

            if (typeof prevdate === 'object') {
                if (prevunknown)
                    unknown += to.getTime() - prevdate.getTime();
                else
                    open    += to.getTime() - prevdate.getTime();
            }

            return [ open, unknown ];
        };
        /* }}} */
        /* }}} */

        // Iterator API {{{
        this.getIterator = function(date) {
            return new function(oh) {
                if (typeof date === 'undefined')
                    date = new Date();

                var prevstate = [ undefined, date, undefined, undefined, undefined ];
                var state = oh.getStatePair(date);

                /* getDate {{{ */
                this.getDate = function() {
                    return prevstate[1];
                };
                /* }}} */

                /* setDate {{{ */
                this.setDate = function(date) {
                    if (typeof date !== 'object')
                        throw t('date parameter needed');

                    prevstate = [ undefined, date, undefined, undefined, undefined ];
                    state     = oh.getStatePair(date);
                };
                /* }}} */

                /* getState: Check whether facility is `open' {{{ */
                this.getState = function() {
                    return state[0];
                };
                /* }}} */

                /* getUnknown: Checks whether the opening state is conditional or unknown {{{ */
                this.getUnknown = function() {
                    return state[2];
                };
                /* }}} */

                /* getStateString: Get state string. Either 'open', 'unknown' or 'closed' {{{ */
                this.getStateString = function(past) {
                    return (state[0] ? 'open' : (state[2] ? 'unknown' : (past ? 'closed' : 'close')));
                };
                /* }}} */

                /* getComment: Get the comment, undefined in none {{{ */
                this.getComment = function() {
                    return state[3];
                };
                /* }}} */

                /* getMatchingRule: Get the rule which matched thus deterrents the current state {{{ */
                this.getMatchingRule = function() {
                    if (typeof state[4] === 'undefined')
                        return undefined;

                    return rules[state[4]].build_from_token_rule[2];
                };
                /* }}} */

                /* advance: Advances to the next position {{{ */
                this.advance = function(datelimit) {
                    if (typeof datelimit === 'undefined') {
                        datelimit = new Date(prevstate[1].getTime() + msec_in_day * 366 * 5);
                    } else if (datelimit.getTime() <= prevstate[1].getTime()) {
                        return false; /* The limit for advance needs to be after the current time. */
                    }

                    do {
                        if (typeof state[1] === 'undefined') {
                            return false; /* open range, we won't be able to advance */
                        }

                        // console.log('\n' + 'previous check time:', prevstate[1]
                            // + ', current check time:',
                            // // (state[1].getHours() < 10 ? '0' : '') + state[1].getHours() +
                            // // ':'+(state[1].getMinutes() < 10 ? '0' : '')+ state[1].getMinutes(), state[1].getDate(),
                            // state[1],
                            // (state[0] ? 'open' : (state[2] ? 'unknown' : 'closed')) + ', comment:', state[3]);

                        if (state[1].getTime() <= prevstate[1].getTime()) {
                            /* We're going backwards or staying at the same time.
                             * This most likely indicates an error in a selector code.
                             */
                            throw 'Fatal: infinite loop in nextChange';
                        }

                        if (state[1].getTime() >= datelimit.getTime()) {
                            /* Don't advance beyond limits (same as open range) */
                            return false;
                        }

                        // do advance
                        prevstate = state;
                        state = oh.getStatePair(prevstate[1]);
                    } while (state[0] === prevstate[0] && state[2] === prevstate[2] && state[3] === prevstate[3]);
                    return true;
                };
                /* }}} */
            }(this);
        };
        /* }}} */

        /* }}} */
    };

}));
/* vim: set ts=4 sw=4 tw=0 et foldmarker={{{,}}} foldlevel=0 foldmethod=marker : */

},{"./locales/core":2,"moment":"moment","suncalc":3}]},{},[]);
