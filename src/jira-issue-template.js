// ==UserScript==
// @name         DG Jira Issue Template
// @namespace    https://github.com/abrakazinga/
// @version      0.1
// @description  A way to create a Jira issues using a predefined template
// @include      https://jiradg.atlassian.net/*
// @supportURL   https://github.com/abrakazinga/jira-issue-template/issues
// @updateURL    https://github.com/abrakazinga/jira-issue-template/raw/main/src/jira-issue-template.js
// @downloadURL  https://github.com/abrakazinga/jira-issue-template/raw/main/src/jira-issue-template.js
// @require      https://cdn.jsdelivr.net/npm/vue@3.2.20/dist/vue.global.js
// @require      https://cdn.tailwindcss.com
// @grant        unsafeWindow
// @run-at       document-body
// @noframes
// ==/UserScript==

unsafeWindow.Vue = Vue
const { createApp, ref } = Vue

let appMounted = false // Flag to track whether the app has been mounted

tailwind.config = {
	theme: {
		extend: {
			colors: {
				primary: '#0c66e4',
				'primary-hover': '#0055cc',
				'primary-dark': '#579dff',
				'primary-dark-hover': '#85b8ff',
				'overlay-bg': '#fff',
				'overlay-bg-dark': '#282e33',
				'overlay-border': '#d7dae0',
				'overlay-border-dark': '#374048',
			},
			borderRadius: {
				brand: '3px',
			},
		},
	},
}

let appTemplate = `
<div 
    id="jira-issue-template" 
    class="hidden flex-col fixed w-64 h-64 top-16 left-1/2 z-[100] bg-overlay-bg dark:bg-overlay-bg-dark border border-overlay-border dark:border-overlay-border-dark rounded-brand shadow-lg" >
    {{message}}
    {{userInfo}}
    <button @click="count++">{{count}}</button>
</div>
`

const app = createApp({
	setup() {
		const message = ref('Hello vue!')
		const count = ref(0)
		const userInfo = ref({})

		return {
			message,
			count,
			userInfo,
		}
	},
	async mounted() {
		console.log('App mounted')
		const res = await fetch('https://api.github.com/users/tobyqin')
		//this.userInfo.value = await res.json()
	},
	template: appTemplate,
})

let mountApp = () => {
	let appContainer = document.createElement('div')
	appContainer.id = 'jira-issue-template-app'
	document.querySelector('body').appendChild(appContainer)
	app.mount('#jira-issue-template-app')
}

let toggleVisibility = () => {
	let templateDiv = document.getElementById('jira-issue-template')
	if (templateDiv) {
		templateDiv.classList.toggle('hidden')
		templateDiv.classList.toggle('flex')
	}
}

let addButtonClickHandler = () => {
	if (!appMounted) {
		mountApp()
		appMounted = true
	}
	toggleVisibility()
}

let addCloseOverlayListener = (toggleButton) => {
	document.addEventListener('click', (event) => {
		let templateDiv = document.getElementById('jira-issue-template')
		if (templateDiv && !templateDiv.contains(event.target) && event.target !== toggleButton) {
			templateDiv.classList.add('hidden')
			templateDiv.classList.remove('flex')
		}
	})
}

let createToggleButton = () => {
	let toggleButton = document.createElement('button')
	toggleButton.textContent = 'Template'
	let buttonClasses =
		'ml-1 px-2 py-1 font-medium bg-primary dark:bg-primary-dark text-white dark:text-slate-900 rounded-brand hover:bg-primary-hover dark:hover:bg-primary-dark-hover'
	toggleButton.classList.add(...buttonClasses.split(' '))
	toggleButton.addEventListener('click', addButtonClickHandler)
	return toggleButton
}

let appendToggleButton = (toggleButton) => {
	let wrapperElement = document.querySelector('*[data-testid="create-button-wrapper"]')
	if (!wrapperElement) {
		console.error('🔥 Wrapper element with data-testid="create-button-wrapper" not found.')
		return
	}
	wrapperElement.appendChild(toggleButton)
}

window.addEventListener('load', (event) => {
	console.log('Jira Issue Template App is ready. Starting app...')
	let toggleButton = createToggleButton()
	appendToggleButton(toggleButton)
	addCloseOverlayListener(toggleButton)
})
