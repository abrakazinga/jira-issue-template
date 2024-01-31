// ==UserScript==
// @name     Jira Issue Template - Cloud Edition
// @version  1
// @include  https://jiradg.atlassian.net/*
// @grant        none
// ==/UserScript==

let jiraBaseUrl = 'https://jiradg.atlassian.net'
let scrumTeam = 'Skyfall'
let projectKey = 'OCA' // /rest/api/2/project
let issueTypeId = '7' // /rest/api/2/issue/createmeta/{projectKey}/issuetypes
let componentIds = ['29044', '29045'] // /rest/api/2/issue/createmeta/{projectKey}/issuetypes/{issueTypeId}
let teamId = 'c3db8dfc-c970-4639-8138-4ccdd1179649-10' // ???

// -- Ab hier nichts mehr ändern

let addNewIssueWithTemplateButton = (createButton) => {
	let createButtonParent = createButton.parentNode
	let createNewIssueWithTemplateButton = document.createElement('button')
	createNewIssueWithTemplateButton.innerHTML = 'Use Template'
	createButtonParent.appendChild(createNewIssueWithTemplateButton)

	return createNewIssueWithTemplateButton
}

let getUsername = async () => {
	return new Promise((resolve, reject) => {
		let xhr = new XMLHttpRequest()
		let url = '/rest/auth/latest/session'

		xhr.onreadystatechange = () => {
			if (xhr.readyState == 4) {
				if (xhr.status == 200) {
					try {
						const jsonResponse = JSON.parse(xhr.responseText)
						const username = jsonResponse.name
						resolve(username)
					} catch (error) {
						reject(new Error('Failed to parse JSON response.'))
					}
				} else {
					reject(new Error('Failed to fetch user account ID.'))
				}
			}
		}

		xhr.open('GET', url, true)
		xhr.send()
	})
}

let createNewIssue = async () => {
	let username = await getUsername()
	console.log('Username:', username)

	let xhr = new XMLHttpRequest()
	let url = '/rest/api/2/issue/'

	let issueSummary = window.prompt('Issue Summary', '')
	if (!issueSummary) return

	let issueData = JSON.stringify({
		fields: {
			project: {
				key: projectKey,
			},
			summary: issueSummary,
			description: '',
			issuetype: {
				id: issueTypeId,
			},
			assignee: {
				name: username,
			},
			components: componentIds.map((componentId) => {
				return {
					id: componentId,
				}
			}),
			customfield_17630: teamId,
		},
	})

	xhr.open('POST', url, true)
	xhr.setRequestHeader('Content-Type', 'application/json')

	xhr.onreadystatechange = () => {
		if (xhr.readyState == 4) {
			if (xhr.status == 200) {
				try {
					//resolve(JSON.parse(xhr.responseText))
					console.log(JSON.parse(xhr.responseText))
				} catch (error) {
					console.log(error)
					//reject(new Error('Failed to parse JSON response.'))
				}
			} else {
				//reject(new Error('Failed to create new story'))
				console.log(xhr.responseText)
			}
		}
	}

	xhr.send(issueData)
}

jQuery(document).ready(function () {
	// Prüfen ob der Button zum Erstellen eines neuen Tickets vorhanden ist
	let createButton = document.getElementById('createGlobalItem')
	// Wenn nicht, dann ciao
	if (!createButton) return

	// Neuen Button erstellen
	let createNewIssueWithTemplateButton = addNewIssueWithTemplateButton(createButton)

	// Add click listener to create button
	createNewIssueWithTemplateButton.addEventListener('click', async () => {
		console.log('✨ Template')
		await createNewIssue()
	})
})
