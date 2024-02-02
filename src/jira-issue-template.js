// ==UserScript==
// @name         DG Jira Issue Template
// @namespace    https://github.com/abrakazinga/
// @version      0.1
// @description  A way to create a Jira issues using a predefined template
// @include      https://jiradg.atlassian.net/*
// @supportURL   https://github.com/abrakazinga/jira-issue-template/issues
// @updateURL    https://github.com/abrakazinga/jira-issue-template/raw/main/src/jira-issue-template.js
// @downloadURL  https://github.com/abrakazinga/jira-issue-template/raw/main/src/jira-issue-template.js
// @require      https://vuejs.org/js/vue.min.js
// @require      https://code.jquery.com/jquery-3.4.1.min.js
// @require      https://cdn.tailwindcss.com
// @require      https://github.com/abrakazinga/jira-issue-template/raw/main/src/app.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_setClipboard
// @run-at       document-body
// @noframes
// ==/UserScript==

window.jq = $.noConflict(true)
;(function () {
	'use strict'
	jiraIssueTemplate.isReady(function () {
		console.log('Jira Issue Template App is ready')
		jiraIssueTemplate.addStyle()
		jiraIssueTemplate.startApp()
	})
})()
