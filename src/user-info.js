var L = require('leaflet');

function showDialog() {
    var dialog = L.DomUtil.get('welcome-popup'),
        closeBtn = dialog.querySelector('.button'),
        closeFn = function() {
            dialog.parentNode.removeChild(dialog);
            document.cookie = 'userInfo=1';
            L.DomEvent.off(closeBtn, 'click', closeFn);
        };

    L.DomEvent.on(closeBtn, 'click', closeFn);
    L.DomUtil.removeClass(dialog, 'hide');
}

module.exports = function userInfo() {
    var cookie = parseInt(document.cookie.replace(/(?:(?:^|.*;\s*)userInfo\s*\=\s*([^;]*).*$)|^.*$/, '$1'), 10);
    if (!cookie) {
        showDialog();
    }
};
