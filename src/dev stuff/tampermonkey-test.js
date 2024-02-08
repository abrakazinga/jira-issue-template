// ==UserScript==
// @name         Tell Jira I did a thing
// @namespace    http://demuyt.net/
// @version      0.1
// @description  try to take over the world!
// @author       Tom J Demuyt
// @include  https://jiradg.atlassian.net/*
// @grant        none
// ==/UserScript==

//Documentation
//https://docs.atlassian.com/software/jira/docs/api/REST/7.12.0/
//https://developer.atlassian.com/server/jira/platform/jira-rest-api-examples/

;(function () {
	'use strict'

	let userName = ''
	let projectCode = 'CF'
	let fixVersion = '15484'

	// The id of the create button is `create_link`, dont show up if that button is not there
	let createButton = document.getElementById('createGlobalItem')
	// Leave quietly if we cannot find that button
	if (!createButton) {
		return
	}

	createButton.firstChild.innerHTML = 'Create with template'

	//Add a button for the user
	var node = document.createElement('LI')
	node.innerHTML = '<li style="padding-left: 20px; text-decoration: underline; cursor: pointer;"><div id="idat">Log activity</div></li>'
	createButtonParent.appendChild(node)

	//Get a reference to the button
	let idat = document.getElementById('idat')

	//Make it listen to clicks;
	idat.addEventListener('click', recordTheThing)
	//Try and build a ticket
	function recordTheThing() {
		//Prep a call to Jira
		let xhr = new XMLHttpRequest(),
			url = '/rest/api/2/issue/'
		//Ask what the user did
		var thing = window.prompt('Describe the activity performed?', '')
		//Get out if the user got cold feet
		if (!thing) {
			return
		}
		//Start prepping the http request
		xhr.open('POST', url, true)
		//Use JSON since we will not fill in a form
		xhr.setRequestHeader('Content-Type', 'application/json')
		//Prep the navigation to the new issue
		xhr.onreadystatechange = function () {
			debugger
			//readyState:3
			//response: {"id":"125529","key":"CF-10282","self":"https://jira.it.aenetworks.com/rest/api/2/issue/125529"}
			//HTTP/REST return code 201 means created
			if (xhr.readyState === 4 && xhr.status === 201) {
				var json = JSON.parse(xhr.responseText)
				window.location.href = 'https://jira.it.aenetworks.com/browse/' + json.key
			}
		}
		//The heart of the thing
		var data = JSON.stringify({
			fields: {
				project: {
					key: projectCode,
				},
				summary: thing,
				description: thing,
				issuetype: {
					name: 'Task',
				},
				assignee: {
					name: userName,
				},
				//15484 -> Busines As Usual
				fixVersions: [{ id: fixVersion }],
			},
		})
		//Finalize the REST call
		xhr.send(data)
	} //Record the thing

	//Find from the load/start the user id
	let xhr = new XMLHttpRequest(),
		url = '/rest/api/2/mypermissions/'
	//Prep to extract the username from the call header
	//200 -> OK
	xhr.onreadystatechange = function () {
		if (xhr.readyState == 4 && xhr.status == 200) {
			userName = xhr.getResponseHeader('X-AUSERNAME')
		}
	}
	//Shoot and pray
	xhr.open('GET', url, true)
	xhr.send()
})()
