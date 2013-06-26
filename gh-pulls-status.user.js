// ==UserScript==
// @name       GitHub Pulls Status
// @namespace  http://repl.ca
// @version    0.0.1
// @description Display build status on the 'pulls' page
// @match      https://github.com/*/pulls
// @copyright  2012+, James Bowes
// ==/UserScript==

var TOKEN = "FILL ME IN";


function main() {
    GM_addStyle("li.build-status {float: right}");

    var parts = document.URL.split('/');
    var owner = parts[parts.length - 3];
    var repo = parts[parts.length - 2];

    var pullList = document.getElementsByClassName('pulls-list')[0];
    var pulls = pullList.getElementsByClassName('list-group-item');

    for (var i = 0; i < pulls.length; i++) {
        annotatePull(pulls[i], {owner: owner, repo: repo});
    }
}

var baseStatus = 'build-status octicon status ';

function annotatePull(pull, info) {
    var pullId = pull.getElementsByClassName('list-group-item-number')[0].innerHTML.substring(1);
    var metaList = pull.getElementsByClassName('list-group-item-meta')[0];

    var statusItem = document.createElement('li');
    statusItem.setAttribute('class', baseStatus + 'octicon-clock');
    metaList.insertBefore(statusItem);

    getStatus(pullId, statusItem, info);
}

function statusLoaded(responseText, pullId, statusItem) {
    // only care about the most recent status
	var status = JSON.parse(responseText)[0];

    var statusStr;
    switch (status.state) {
        case 'success':
            statusStr = baseStatus + 'octicon-check status-success';
            break;
        case 'failure':
            statusStr = baseStatus + 'octicon-x status-failure';
            break;
        case 'pending':
            statusStr = baseStatus + 'octicon-primitive-dot status-pending';
            break;
        default:
            // unknown? problem!
            statusStr = baseStatus + 'octicon-stop';
            break;
    }

    statusItem.setAttribute('class', statusStr);
}

function pullLoaded(responseText, pullId, statusItem, info) {
    var pull = JSON.parse(responseText);
    var ref = pull.head.sha;

    var req = new XMLHttpRequest();
    req.onload = function() {
        statusLoaded(this.responseText, pullId, statusItem);
    }

    req.open('get', 'https://api.github.com/repos/' + info.owner + '/' + info.repo + '/statuses/' + ref);
    req.setRequestHeader('Authorization', 'token ' + TOKEN);
    req.send();
}

function getStatus(pullId, statusItem, info) {
    var req = new XMLHttpRequest();
    req.onload = function() {
        pullLoaded(this.responseText, pullId, statusItem, info);
    }

    req.open('get', 'https://api.github.com/repos/' + info.owner + '/' + info.repo + '/pulls/' + pullId);
    req.setRequestHeader('Authorization', 'token ' + TOKEN);
    req.send();
}

main();
