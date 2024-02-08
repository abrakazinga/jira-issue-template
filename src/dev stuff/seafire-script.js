// ==UserScript==
// @name         Jira Issue Template Seafire
// @namespace    http://tampermonkey.net/
// @version      2.2.0
// @description  create jira issues with the seafire template
// @author       raphael.imahorn
// @match        https://*.atlassian.net/jira/*
// @match        https://jiradg.atlassian.net/*
// ==/UserScript==

//
// Einstellungen
//

// Sollen issues automatisch einem Scrum Team zugewiesen werden? (true / false)
const autoAssignScrumTeam = true

// Welches Projekt ist der Default?
const project = 'Product Management Area (PMA)'

// Welchem Scrum Team sollen Issues automatisch zugewiesen werden?
const scrumTeam = 'SeaFire'

// Verzögerung für das Einfüllen der Issue Daten in Millisekunden (bei langsamen Computern / Laptops u.U. höher setzen, falls es nicht funktioniert)
const eventDelay = 250

// Anzahl der Versuche, um das Editor Fenster vorauszufüllen
const maxAttempts = 10

// Das Text Template für den Code-Editor
const textTemplate = `
<h1>Ausgangslage</h1>
<h1>Entscheidungsträger</h1>
<ul class="ak-ul" data-indent-level="1"><li><p>User</p></li></ul>
<hr>
<h1>Begriffe</h1>
<h1>Lösungsansatz</h1>
<h1>Akzeptanzkriterien</h1>
<ul class="ak-ul" data-indent-level="1"><li><p>AK1</p></li></ul>
<h1>Technische Hinweise</h1>
<h1>Offene Fragen</h1>
<ul class="ak-ul" data-indent-level="1"><li><p>Frage</p></li></ul>
<hr>
<h1>Betroffene Personen/Teams</h1>
<ul class="ak-ul" data-indent-level="1"><li><p>_Rolle User</p></li></ul>
<h1>Reproduktion</h1>
<h1>Go Live</h1>
<h1>Meme</h1>
<h1>Mockups</h1>
`

//
// -- Ab hier nichts mehr ändern
//

async function fillInDescription(editor) {
	const descriptionField = await awaitField(editor, '.ua-chrome.ProseMirror.pm-table-resizing-plugin')
	descriptionField.innerHTML = textTemplate
}

async function awaitField(parentContainer, querySelector, retries = maxAttempts) {
	if (!retries) {
		showToast(`"Could not find the ${querySelector}.`, 'warn')
		return
	}
	const field = parentContainer.querySelector(querySelector)
	if (!field) {
		await sleep(eventDelay)
		return awaitField(parentContainer, querySelector, retries - 1)
	}
	return field
}

async function fillInProjectWithRetry(editor) {
	const success = await executeCheckAndRetry(
		() => fillInProject(editor),
		() => checkProject(editor)
	)
	if (!success) {
		showToast('Could not set project. Please set the desired project by hand', 'warn')
	}
}

async function checkProject(editor) {
	const projectField = await awaitField(editor, '#project-field')
	return projectField.value.includes(project)
}

async function fillInProject(editor) {
	const projectField = await awaitField(editor, '#project-field')
	if (!projectField) return
	projectField.click()
	const ps = document.getElementById('project-suggestions')
	const projectToSelect = [...ps.querySelectorAll('a')].find((x) => x.innerText.includes(project))
	console.log(projectToSelect)
	projectToSelect.click()
}

async function setStoryWithRetry(editor) {
	const success = await executeCheckAndRetry(
		() => setStory(editor),
		() => checkIsIssueStory(editor)
	)
	if (!success) {
		showToast('Could not set issue type to story. Please set the desired issue type by hand', 'warn')
	}
}

async function checkIsIssueStory(editor) {
	const issueTypeField = await awaitField(editor, '#issuetype-field')
	return issueTypeField?.disabled !== true && issueTypeField?.value === 'Story'
}

async function setStory(editor) {
	const issueTypeField = await awaitField(editor, '#issuetype-field:enabled')
	issueTypeField?.click()
	;[...document.querySelector('#issuetype-suggestions').querySelectorAll('a')].find((x) => x.innerText === 'Story')?.click()
}

async function setScrumTeam(editor) {
	if (!autoAssignScrumTeam) {
		return
	}

	const scrumTeamSelect = await await awaitScrumTeamSelect(editor)
	if (!scrumTeamSelect) return

	const teamOption = [...scrumTeamSelect.querySelectorAll('option')].find((x) => x.text.startsWith(scrumTeam))
	teamOption.selected = true
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

async function awaitScrumTeamSelect(editor, retries = maxAttempts) {
	if (!retries) {
		showToast('Could not find a scrum team selection. Please select scrum team by hand', 'warn')
		return
	}
	const scrumTeamSelect = [...editor.getElementsByTagName('label')].find((x) => x.innerText === 'Scrum Team')?.nextElementSibling
	if (!scrumTeamSelect) {
		await sleep(eventDelay)
		return awaitScrumTeamSelect(editor, retries - 1)
	}
	return scrumTeamSelect
}

async function awaitEditor(retries = maxAttempts) {
	if (!retries) {
		showToast('Could not fill in the desired information. Please use the other button', 'error')
		return
	}
	const editor = document.getElementById('issue-create.ui.modal.modal-body')
	if (!editor) {
		await sleep(eventDelay)
		return awaitEditor(retries - 1)
	}
	return editor
}

/**
 * @param func {function(): void}
 * @param check {function(): Promise<boolean>}
 * @param retries {number}
 * @returns {Promise<boolean>}
 */
async function executeCheckAndRetry(func, check, retries = maxAttempts) {
	if (!retries) return false

	if (!(await check())) {
		await func()
	}
	if (!(await check())) {
		await sleep(eventDelay)
		return executeCheckAndRetry(func, check, retries - 1)
	}

	return true
}

async function createIssueWithTemplate() {
	let editor = await awaitEditor()
	if (!editor) return
	await fillInDescription(editor)

	// currently not simply possible
	// await fillInProjectWithRetry(editor);
	// await setStoryWithRetry(editor);
	// await setScrumTeam(editor);

	editor.click() // close potentially opened dropdowns
}

function showToast(text, type = 'info', duration = 3000) {
	const toast = document.createElement('div')
	toast.appendChild(document.createTextNode(text))
	let color
	switch (type) {
		case 'warn':
			color = '#FF9800'
			break
		case 'error':
			color = '#D32F2F'
			break
		case 'success':
			color = '#4CAF50'
			break
		default:
			color = '#2196F3'
			break
	}

	toast.style = `
          position: fixed;
          z-index: 9999;
          left: 50%;
          bottom: 30px;
          background-color: ${color};
          padding: 16px;
          border-radius: 4px;
    `

	document.getElementsByTagName('body')[0].appendChild(toast)

	setTimeout((_) => toast.remove(), duration)
}

const debounce = (func, wait, immediate) => {
	let timeout

	return function executedFunction() {
		const context = this
		const args = arguments

		const later = function () {
			timeout = null
			if (!immediate) func.apply(context, args)
		}

		const callNow = immediate && !timeout

		clearTimeout(timeout)

		timeout = setTimeout(later, wait)

		if (callNow) func.apply(context, args)
	}
}

function getNewButtonTranslatedText(normalButtonText) {
	switch (normalButtonText) {
		case 'Erstellen':
			return 'Nach Vorlage erstellen'
		default:
			return 'Create with template'
	}
}

const buttonId = 'dg-jira-add-with-template-button'

function main() {
	if (!!document.getElementById(buttonId)) return

	const normalButton = document.getElementById('createGlobalItem')
	const elementToInsertLinks = normalButton.parentElement
	const createWithTemplate = document.createElement('button')
	createWithTemplate.id = buttonId
	elementToInsertLinks.appendChild(createWithTemplate)
	const linkText = document.createTextNode(getNewButtonTranslatedText(normalButton.innerText))
	createWithTemplate.appendChild(linkText)
	createWithTemplate.title = linkText.wholeText
	createWithTemplate.classList.add(normalButton.classList, 'create-issue')
	createWithTemplate.onclick = createIssueWithTemplate
	elementToInsertLinks.appendChild(createWithTemplate)
}

document.addEventListener('DOMNodeInserted', debounce(main, 100))
