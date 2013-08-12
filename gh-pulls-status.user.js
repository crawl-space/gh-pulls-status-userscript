/* vim: set ts=2 sw=2 expandtab: */
// ==UserScript==
// @name       GitHub Pulls Status
// @namespace  http://repl.ca
// @version    1.2.0
// @description Display build status on the 'pulls' page
// @match      https://github.com/*/pulls
// @copyright  2013+, James Bowes
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

/** @const */
var BASE_STATUS = 'build-status octicon status ';

function annotatePull(pull, info) {
  var pullId = pull.getElementsByClassName('list-group-item-number')[0].innerHTML.substring(1);
  var metaList = pull.getElementsByClassName('list-group-item-meta')[0];

  var statusItem = document.createElement('li');
  statusItem.setAttribute('class', BASE_STATUS + 'octicon-clock');
  metaList.insertBefore(statusItem);

  getStatus(pullId, statusItem, info);
}

function statusLoaded(responseText, pullId, statusItem) {
  var statuses = JSON.parse(responseText);
  var statusStr;

  // no build status. remove the icon
  if (statuses.length === 0) {
    statusItem.parentNode.removeChild(statusItem);
    return;
  }

  // only care about the most recent status
  var status = statuses[0];

  switch (status.state) {
    case 'success':
      statusStr = BASE_STATUS + 'octicon-check status-success';
      break;
    case 'failure':
      statusStr = BASE_STATUS + 'octicon-x status-failure';
      break;
    case 'pending':
      statusStr = BASE_STATUS + 'octicon-primitive-dot status-pending';
      break;
    default:
      // unknown? problem!
      statusStr = BASE_STATUS + 'octicon-stop';
      break;
  }

  statusItem.setAttribute('class', statusStr);
}

function pullLoaded(responseText, pullId, statusItem, info) {
  var pull = JSON.parse(responseText);
  var ref = pull.head.sha;
  var data = {};

  var req = new XMLHttpRequest();
  req.open('get', 'https://api.github.com/repos/' + info.owner + '/' + info.repo + '/statuses/' + ref);

  var cached = localStorage.getItem(cacheKey(pullId, info));
  if (cached) {
    data = JSON.parse(cached);
    if (data.etag) {
      req.setRequestHeader('If-None-Match', data.etag);
    }
  }

  req.setRequestHeader('Authorization', 'token ' + TOKEN);

  req.onload = function() {
    var responseText;
    if (this.status === 304) {
      responseText = data.data;
    } else  {
      var toCache = {
        etag: this.getResponseHeader('Etag'),
        lastModified: data.lastModified,
        data: this.responseText,
        sha: data.sha
      };
      localStorage.setItem(cacheKey(pullId, info), JSON.stringify(toCache));
      responseText = this.responseText;
    }
    statusLoaded(responseText, pullId, statusItem);
  };

  req.send();
}

function cacheKey(pullId, info) {
  return 'statuses:' + info.owner + ':' + info.repo + ':' + pullId;
}

function getStatus(pullId, statusItem, info) {
  var req = new XMLHttpRequest();
  var data = {};

  req.open('get', 'https://api.github.com/repos/' + info.owner + '/' + info.repo + '/pulls/' + pullId);

  var cached = localStorage.getItem(cacheKey(pullId, info));
  if (cached) {
    data = JSON.parse(cached);

    // set the status to the last value while checking
    if (data.data) {
      statusLoaded(data.data, pullId, statusItem);
    }

    req.setRequestHeader('If-Modified-Since', data.lastModified);
  }

  req.setRequestHeader('Authorization', 'token ' + TOKEN);

  req.onload = function() {
    var sha;
    if (this.status === 304) {
      sha = data.sha;
    } else {
      var toCache = {
        etag: data.etag || null,
        lastModified: this.getResponseHeader('Last-Modified'),
        data: data.data || null,
        sha: this.responseText
      };
      localStorage.setItem(cacheKey(pullId, info), JSON.stringify(toCache));

      sha = this.responseText;
    }
    pullLoaded(sha, pullId, statusItem, info);
  };

  req.send();
}

main();
