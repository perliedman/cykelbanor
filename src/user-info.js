var L = require('leaflet'),
    info = require('../messages/info1.hbs');

function showDialog() {
    var dialog = L.DomUtil.create('div', 'user-info', document.body),
        container = L.DomUtil.create('div', 'ui teal inverted segment', dialog),
        closeBtn;
    container.innerHTML = info();
    closeBtn = L.DomUtil.create('button', 'ui green button', container);
    closeBtn.setAttribute('type', 'button');
    closeBtn.innerText = 'Stäng';
    L.DomEvent.addListener(closeBtn, 'click', function() {
        dialog.parentNode.removeChild(dialog);
        document.cookie = 'userInfo=1';
    });
}

module.exports = function userInfo() {
    var cookie = parseInt(document.cookie.replace(/(?:(?:^|.*;\s*)userInfo\s*\=\s*([^;]*).*$)|^.*$/, '$1'), 10);
    if (!cookie) {
        showDialog();
    }
};
