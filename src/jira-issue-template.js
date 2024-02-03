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

// API DOCS: https://developer.atlassian.com/cloud/jira/platform/rest/v2/intro/#about
// TODO: Add conditional "platform" field for cm stories, e.g. https://jiradg.atlassian.net/browse/CM-4855
// TODO: Handle projects with no issue types, like "B2BPG"
// TODO: Check if saved state is still valid, e.g. if project or issue type is no longer available
// TODO: Fetch available teams via jira api

unsafeWindow.Vue = Vue
const { createApp, ref, watch, watchEffect } = Vue

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
    class="hidden fixed top-16 left-1/2 z-[100] bg-overlay-bg dark:bg-overlay-bg-dark border border-overlay-border dark:border-overlay-border-dark rounded-brand shadow-lg" >
    <div class="flex flex-col justify-between space-y-4 py-4">
        <h2 class="text-lg font-semibold uppercase text-xs px-4">Jira Issue Template</h2>
        
        <div class="flex items-center px-4">
            <img :src="userInfo.value?.avatarUrls['48x48']" class="w-8 h-8 rounded-full" />
            <div class="flex flex-col ml-2">    
                <span class="text-sm text-black dark:text-slate-200">{{userInfo.value?.displayName}}</span>
                <span class="text-xs text-slate-700 dark:text-slate-400">{{userInfo.value?.emailAddress}}</span>
                <span class="hidden text-xs text-slate-700 dark:text-slate-400">{{userInfo.value?.accountId}}</span>
            </div>
        </div>

        <div class="border-t-2 border-overlay-border dark:border-overlay-border-dark"></div>

        <div class="flex items-center px-4 space-x-2">

            <!-- Project Selector -->
            <div class="flex flex-col space-y-1">
                <div class="flex items-center space-x-1">
                    <label for="project" class="text-xs uppercase text-slate-700 dark:text-slate-400">Project</label>
                    <div role="status" v-show="!availableJiraProjects.value">
                        <svg aria-hidden="true" class="inline w-3 h-3 -mt-1 text-overlay-border dark:overlay-border-dark animate-spin dark:text-slate-600 fill-primary dark:fill-primary-dark" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                        </svg>
                        <span class="sr-only">Loading...</span>
                    </div>
                </div>
                <select id="project" v-model="selectedJiraProject" class="border border-overlay-border dark:border-overlay-border-dark rounded-brand px-3 py-2 ring-2 ring-transparent hover:ring-primary dark:hover:ring-primary-dark hover:cursor-pointer">
                    <option v-for="project in availableJiraProjects.value" :value="project.key">{{project.key}}</option>
                </select>
            </div>

            <!-- Issue Type Selector -->
            <div class="flex flex-col space-y-1">
                <div class="flex items-center space-x-1">
                    <label for="issueType" class="text-xs uppercase text-slate-700 dark:text-slate-400">Type</label>
                </div>
                <select id="issueType" v-model="selectedJiraIssueType" class="border border-overlay-border dark:border-overlay-border-dark rounded-brand px-3 py-2 ring-2 ring-transparent hover:ring-primary dark:hover:ring-primary-dark hover:cursor-pointer">
                    <option v-for="type in availableJiraIssueTypes?.issueTypes" :value="type.id">{{type.name}}</option>
                </select>
            </div>

            <!-- Team Selector -->
            <div class="flex flex-col space-y-1">
                <div class="flex items-center space-x-1">
                    <label for="team" class="text-xs uppercase text-slate-700 dark:text-slate-400">Team</label>
                </div>
                <select id="team" v-model="selectedTeam" class="border border-overlay-border dark:border-overlay-border-dark rounded-brand px-3 py-2 ring-2 ring-transparent hover:ring-primary dark:hover:ring-primary-dark hover:cursor-pointer">
                    <option v-for="team in availableTeams.value" :value="team.id">{{team.name}}</option>
                </select>
            </div>
        </div>
    </div>
</div>
`

const app = createApp({
	setup() {
		const userInfo = ref({})
		const availableJiraProjects = ref([])
		const selectedJiraProject = ref()
		const availableJiraIssueTypes = ref([])
		const selectedJiraIssueType = ref()
		const availableTeams = ref([])
		const selectedTeam = ref()

		// Watch: availableJiraProjects
		watchEffect(async () => {
			// Set default project if not already set
			if (availableJiraProjects.value?.value?.length && !selectedJiraProject.value) {
				selectedJiraProject.value = availableJiraProjects.value.value[0].key
			}
		})

		// Watch: selectedJiraProject
		watch(selectedJiraProject, async () => {
			if (selectedJiraProject.value) {
				availableJiraIssueTypes.value = await getAvailableJiraIssueTypes(selectedJiraProject.value)
				// If issue type is not in the list of available issue types, reset it
				if (
					availableJiraIssueTypes.value?.issueTypes?.length > 0 &&
					!availableJiraIssueTypes.value?.issueTypes.find((type) => type.id === selectedJiraIssueType.value)
				) {
					selectedJiraIssueType.value = availableJiraIssueTypes.value?.issueTypes[0]?.id
				}

				// Set default issue type if not already set
				if (availableJiraIssueTypes.value?.issueTypes?.length > 0 && !selectedJiraIssueType.value) {
					selectedJiraIssueType.value = availableJiraIssueTypes.value?.issueTypes[0]?.id
				}
			}
		})

		// Watch: selectedTeam
		watch(selectedTeam, async () => {
			// Set default issue type if not already set
			if (availableTeams.value?.length > 0 && !selectedTeam.value) {
				selectedTeam.value = availableTeams.value[0].id
			}
		})

		// Save state to local storage on change
		watch([selectedJiraProject, selectedJiraIssueType, selectedTeam], (newValues, oldValues) => {
			saveState({
				selectedJiraProject: newValues[0],
				selectedJiraIssueType: newValues[1],
				selectedTeam: newValues[2],
			})
		})

		return {
			userInfo,
			availableJiraProjects,
			selectedJiraProject,
			availableJiraIssueTypes,
			selectedJiraIssueType,
			availableTeams,
			selectedTeam,
		}
	},
	async mounted() {
		console.log('App mounted')
		// Load state from local storage
		let state = loadState()
		if (state.selectedJiraProject) {
			this.selectedJiraProject = state.selectedJiraProject
		}
		if (state.selectedJiraIssueType) {
			this.selectedJiraIssueType = state.selectedJiraIssueType
		}
		if (state.selectedTeam) {
			this.selectedTeam = state.selectedTeam
		}

		// User Info
		this.userInfo.value = await getMyself()
		// Jira Projects
		this.availableJiraProjects.value = await getAvailableJiraProjects()
		// Teams
		this.availableTeams.value = getAvailableTeams()
	},
	template: appTemplate,
})

let getMyself = async () => {
	const res = await fetch('/rest/api/2/myself')
	return res.json()
}

let getAvailableJiraProjects = async () => {
	const res = await fetch('/rest/api/2/project')
	let data = await res.json()
	data.sort((a, b) => a.key.localeCompare(b.key))
	return data
}

let getAvailableJiraIssueTypes = async (projectKey) => {
	try {
		const res = await fetch(`/rest/api/2/issue/createmeta/${projectKey}/issuetypes`)
		return res.json()
	} catch (error) {
		console.error('Failed to fetch available issue types:', error)
	}
	return []
}

let getAvailableTeams = () => {
	let teams = [
		{ id: 'c3db8dfc-c970-4639-8138-4ccdd1179649-10', name: 'Skyfall' },
		{ id: 'c3db8dfc-c970-4639-8138-4ccdd1179649-1248', name: 'Ava' },
		{ id: 'c3db8dfc-c970-4639-8138-4ccdd1179649-9', name: 'Heisenberg' },
		{ id: 'c3db8dfc-c970-4639-8138-4ccdd1179649-109', name: 'Radio Belgrade' },
		{ id: 'c3db8dfc-c970-4639-8138-4ccdd1179649-11', name: 'Seafire' },
		{ id: 'c3db8dfc-c970-4639-8138-4ccdd1179649-14', name: 'Skynet' },
	]
	teams.sort((a, b) => a.name.localeCompare(b.name))
	return teams
}

let saveState = (state) => {
	console.log({ state })
	localStorage.setItem('jira-issue-template-state', JSON.stringify(state))
}

let loadState = () => {
	let state = localStorage.getItem('jira-issue-template-state')
	if (state) {
		return JSON.parse(state)
	}
	return {}
}

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
