// ==UserScript==
// @name         DG Jira Issue Template
// @namespace    https://github.com/abrakazinga/
// @version      0.3
// @author       Alex Braisch
// @description  Create Jira issues using a predefined template
// @include      https://jiradg.atlassian.net/*
// @supportURL   https://github.com/abrakazinga/jira-issue-template/issues
// @updateURL    https://github.com/abrakazinga/jira-issue-template/raw/main/src/jira-issue-template.user.js
// @downloadURL  https://github.com/abrakazinga/jira-issue-template/raw/main/src/jira-issue-template.user.js
// @require      https://cdn.jsdelivr.net/npm/vue@3.2.20/dist/vue.global.js
// @require      https://cdn.tailwindcss.com
// @grant        unsafeWindow
// @run-at       document-body
// @noframes
// ==/UserScript==

// API DOCS: https://developer.atlassian.com/cloud/jira/platform/rest/v2/intro/#about
// TODO: Add conditional "platform" field for cm stories, e.g. https://jiradg.atlassian.net/browse/CM-4855
// TODO: Handle projects with no issue types, like "B2BPG"
// TODO: Fetch available teams via jira api
// TODO: "Use as Template" button on existing issues, in the "More" dropdown

// * Load story as template
// ? Add "Edit" button for Project, Issue Type, and Team -> Only load available options when clicked
// ? Add Components, only show if available
// ? Add Epic Key?
// ? Multiple Stories Support

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
				'input-bg-dark': '#22272b',
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
    class="hidden fixed top-16 left-1/2 transform -translate-x-1/2 z-[100] bg-overlay-bg dark:bg-overlay-bg-dark border border-overlay-border dark:border-overlay-border-dark rounded-brand shadow-lg" >
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

            <!-- Issue Template Key -->
            <div class="flex flex-col space-y-1 w-full">
                <div class="flex flex-col">
                    <div class="flex items-center">
                        <label for="project" class="text-xs uppercase text-slate-700 dark:text-slate-400">Issue Template Key</label>
                        <svg v-if="issueTemplate && Object.keys(issueTemplate).length > 0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 text-green-600 dark:text-green-400">
                            <path fill-rule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    <ul v-if="loadingIssueTemplateErrors.length" class="text-xs text-red-600 dark:text-red-400 m-0 p-0">
                        <li v-for="error in loadingIssueTemplateErrors">{{error}}</li>
                    </ul>
                </div>
                <div class="flex items-center space-x-1">
                    <input v-model="issueTemplateKey" type="text" class="dark:bg-input-bg-dark w-full border border-overlay-border dark:border-overlay-border-dark rounded-brand px-3 py-2 ring-2 ring-transparent hover:ring-primary dark:hover:ring-primary-dark hover:cursor-pointer">
                    <button @click="loadIssueTemplate" :disabled="loadingIssueTemplate" class="whitespace-nowrap px-3 py-2 font-medium bg-primary dark:bg-primary-dark text-white dark:text-slate-900 rounded-brand hover:bg-primary-hover dark:hover:bg-primary-dark-hover">
                        {{ loadingIssueTemplate ? 'Loading...' : 'Load Template' }}
                    </button>
                </div>
            </div>

        </div>

        <div class="flex items-center px-4 space-x-4" v-show="!editMode">
            <!-- Project -->
            <div class="flex flex-col space-y-1">
                <div class="flex items-center space-x-1">
                    <label for="project" class="text-xs uppercase text-slate-700 dark:text-slate-400">Project</label>
                </div>
                <div class="flex items-center space-x-1">
                    <img v-if="selectedProject?.avatarUrls" :src="selectedProject.avatarUrls['16x16']" class="w-4 h-4" />
                    <span>{{selectedProject.key ? selectedProject.key : 'n/A'}}</span>
                </div>
            </div>

            <!-- Issue Type -->
            <div class="flex flex-col space-y-1">
                <div class="flex items-center space-x-1">
                    <label for="issueType" class="text-xs uppercase text-slate-700 dark:text-slate-400">Type</label>
                </div>
                <div class="flex items-center space-x-1">
                    <img v-if="selectedIssueType?.iconUrl" :src="selectedIssueType.iconUrl" class="w-4 h-4" />
                    <span>{{selectedIssueType?.name ? selectedIssueType.name : 'n/A'}}</span>
                </div>
            </div>

            <!-- Team -->
            <div class="flex flex-col space-y-1">
                <div class="flex items-center space-x-1">
                    <label for="team" class="text-xs uppercase text-slate-700 dark:text-slate-400">Team</label>
                </div>
                <div class="flex items-center space-x-1">
                    <img v-if="selectedTeam?.avatarUrl" :src="selectedTeam.avatarUrl" class="w-4 h-4" />
                    <span>{{selectedTeam?.name ? selectedTeam.name : 'n/A'}}</span>
                </div>
            </div>

            <button @click.prevent="editMode = !editMode" class="flex px-3 py-2 ml-auto font-medium bg-primary dark:bg-primary-dark text-white dark:text-slate-900 rounded-brand hover:bg-primary-hover dark:hover:bg-primary-dark-hover">
                Edit
            </button>
        </div>
        
        <div class="flex items-center px-4 space-x-2" v-show="editMode">
            <!-- Project Selector -->
            <div class="flex flex-col space-y-1">
                <div class="flex items-center space-x-1">
                    <label for="project" class="text-xs uppercase text-slate-700 dark:text-slate-400">Project</label>
                    <div role="status" v-show="availableProjects.length === 0">
                        <svg aria-hidden="true" class="inline w-3 h-3 -mt-1 text-overlay-border dark:overlay-border-dark animate-spin dark:text-slate-600 fill-primary dark:fill-primary-dark" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                        </svg>
                        <span class="sr-only">Loading...</span>
                    </div>
                </div>
                <select id="project" v-model="selectedProject.key" class="dark:bg-input-bg-dark border border-overlay-border dark:border-overlay-border-dark rounded-brand px-3 py-2 ring-2 ring-transparent hover:ring-primary dark:hover:ring-primary-dark hover:cursor-pointer">
                    <option v-for="project in availableProjects" :value="project.key">{{project.key}}</option>
                </select>
            </div>

            <!-- Issue Type Selector -->
            <div class="flex flex-col space-y-1">
                <div class="flex items-center space-x-1">
                    <label for="issueType" class="text-xs uppercase text-slate-700 dark:text-slate-400">Type</label>
                    <div role="status" v-show="!availableIssueTypes?.issueTypes">
                        <svg aria-hidden="true" class="inline w-3 h-3 -mt-1 text-overlay-border dark:overlay-border-dark animate-spin dark:text-slate-600 fill-primary dark:fill-primary-dark" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                        </svg>
                        <span class="sr-only">Loading...</span>
                    </div>
                </div>
                <select id="issueType" v-model="selectedIssueType.id" class="dark:bg-input-bg-dark border border-overlay-border dark:border-overlay-border-dark rounded-brand px-3 py-2 ring-2 ring-transparent hover:ring-primary dark:hover:ring-primary-dark hover:cursor-pointer">
                    <option v-for="type in availableIssueTypes?.issueTypes" :value="type.id">{{type.name}} ({{type.id}})</option>
                </select>
            </div>

            <!-- Team Selector -->
            <div class="flex flex-col space-y-1">
                <div class="flex items-center space-x-1">
                    <label for="team" class="text-xs uppercase text-slate-700 dark:text-slate-400">Team</label>
                </div>
                <select id="team" v-model="selectedTeam.id" class="dark:bg-input-bg-dark border border-overlay-border dark:border-overlay-border-dark rounded-brand px-3 py-2 ring-2 ring-transparent hover:ring-primary dark:hover:ring-primary-dark hover:cursor-pointer">
                    <option v-for="team in availableTeams" :value="team.id">{{team.name}}</option>
                </select>
            </div>
        </div>

        <div class="flex items-center px-4 space-x-2">
            <!-- Components -->
            <div class="flex flex-col space-y-1">
                <div class="flex items-center space-x-1">
                    <label for="components" class="text-xs uppercase text-slate-700 dark:text-slate-400">Components</label>
                </div>
                <ul v-if="componentsErrors.length" class="text-xs text-red-600 dark:text-red-400 m-0 p-0">
                    <li v-for="error in componentsErrors">{{error}}</li>
                </ul>
                <div 
                    class="group inline-flex items-center w-fit gap-x-0.5 rounded-brand bg-blue-50 hover:text-red-50 hover:bg-red-600 dark:bg-slate-900/10 px-2 py-1 text-xs font-medium text-blue-700 dark:text-slate-400 ring-1 ring-inset ring-blue-700/10 dark:ring-slate-700 dark:hover:ring-red-700 hover:cursor-pointer"
                    v-for="component in selectedComponents"
                    @click="removeComponent(component.id)"
                    data-role="component"
                    >
                    {{component.name}}
                    <div type="button" class="relative -mr-1 h-3.5 w-3.5 rounded-sm">
                        <span class="sr-only">Remove</span>
                        <svg viewBox="0 0 14 14" class="h-3.5 w-3.5 stroke-slate-400/50 group-hover:stroke-red-50">
                            <path d="M4 4l6 6m0-6l-6 6" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>

        <div class="border-t-2 border-overlay-border dark:border-overlay-border-dark"></div>

        <div class="flex items-center px-4 space-x-2">

            <!-- Issue Summary -->
            <div class="flex flex-col space-y-1 w-full">
                <div class="flex items-center space-x-1">
                    <label for="issueSummary" class="text-xs uppercase text-slate-700 dark:text-slate-400">Summary*</label>
                </div>
                <ul v-if="issueSummaryErrors.length" class="text-xs text-red-600 dark:text-red-400 m-0 p-0">
                    <li v-for="error in issueSummaryErrors">{{error}}</li>
                </ul>
                <input id="issueSummary" v-model="issueSummary" type="text" class="dark:bg-input-bg-dark w-full min-w-96 border border-overlay-border dark:border-overlay-border-dark rounded-brand px-3 py-2 ring-2 ring-transparent hover:ring-primary dark:hover:ring-primary-dark">
            </div>

        </div>

        <div class="flex flex-col px-4 space-y-2">
            <button 
                @click="createNewIssue" 
                class="whitespace nowrap px-3 py-2 font-medium bg-primary dark:bg-primary-dark text-white dark:text-slate-900 rounded-brand hover:bg-primary-hover dark:hover:bg-primary-dark-hover">
                Create
            </button>
        </div>

    </div>
</div>
`

const app = createApp({
	setup() {
		// User
		const userInfo = ref({})
		// Template
		const issueTemplate = ref({})
		const issueTemplateKey = ref('')
		const loadingIssueTemplate = ref(false)
		const loadingIssueTemplateErrors = ref([])
		// Edit Mode
		const editMode = ref(false)
		// Project
		const availableProjects = ref([])
		const selectedProject = ref({})
		// Issue Type
		const availableIssueTypes = ref([])
		const selectedIssueType = ref({})
		// Team
		const availableTeams = ref([])
		const selectedTeam = ref({})
		// Components
		const availableComponents = ref([]) // TODO: Fetch available components
		const selectedComponents = ref([])
		const componentsErrors = ref([])
		// Summary
		const issueSummary = ref('')
		const issueSummaryErrors = ref([])

		// Save state to local storage on change
		watch([issueTemplateKey], (newValues) => {
			saveState({
				issueTemplateKey: newValues[0],
			})
		})

		// Edit mode watcher
		watch(editMode, async (newValue) => {
			if (newValue) {
				await loadAvailableOptions()
			}
		})

		// If the selected project changes during edit mode, update available issue types
		watch(
			selectedProject,
			async (newValue) => {
				if (editMode.value) {
					availableIssueTypes.value = await getAvailableIssueTypes(newValue.key)
					console.log(selectedIssueType.value)
					console.log(availableIssueTypes.value?.issueTypes[0])
					selectedIssueType.value = { ...(availableIssueTypes.value?.issueTypes[0] || {}) }
				}
			},
			{ deep: true }
		)

		const loadAvailableOptions = async () => {
			console.log('Loading available options...')
			// Load available options and set defaults if necessary
			// Projects
			availableProjects.value = await getAvailableProjects()
			if (!selectedProject.value.key) selectedProject.value = availableProjects.value[0]
			// Issue Types
			availableIssueTypes.value = await getAvailableIssueTypes(selectedProject.value.key)
			if (!selectedIssueType.value.id) selectedIssueType.value = availableIssueTypes.value[0]
			// Teams
			availableTeams.value = getAvailableTeams()
			if (!selectedTeam.value.id) selectedTeam.value = availableTeams.value[0]
		}

		const loadIssueTemplate = async () => {
			if (!issueTemplateKey.value) return
			loadingIssueTemplate.value = true
			editMode.value = false
			issueTemplate.value = {}
			loadingIssueTemplateErrors.value = []

			const res = await fetch(`/rest/api/2/issue/${issueTemplateKey.value}`)
			const data = await res.json()

			if (data.errorMessages) {
				loadingIssueTemplateErrors.value = data.errorMessages
			} else {
				issueTemplate.value = data
				setIssueTemplateValues()
			}

			loadingIssueTemplate.value = false
		}

		const setIssueTemplateValues = () => {
			// Project
			selectedProject.value = issueTemplate.value?.fields?.project ?? selectedProject.value
			// Issue Type
			selectedIssueType.value = issueTemplate.value?.fields?.issuetype ?? selectedIssueType.value
			// Team
			selectedTeam.value = issueTemplate.value?.fields?.customfield_17630 ?? selectedTeam.value
			// Components
			selectedComponents.value =
				issueTemplate.value?.fields?.components.map((component) => ({ id: component.id, name: component.name })) ??
				selectedComponents.value
		}

		const removeComponent = (componentId) => {
			selectedComponents.value = selectedComponents.value.filter((component) => component.id !== componentId)
		}

		const createNewIssue = async () => {
			console.log('Trying to create a new issue...')

			// Validate issue summary
			issueSummaryErrors.value = []
			if (!issueSummary.value) {
				issueSummaryErrors.value.push('Summary is required.')
			}

			// Validate components
			componentsErrors.value = []
			if (selectedComponents.length === 0) {
				componentsErrors.value.push('At least one component is required. Please re-load the template.')
			}

			if (issueSummaryErrors.value.length || componentsErrors.value.length) return

			let url = '/rest/api/2/issue/'
			let data = {
				fields: {
					project: {
						key: selectedProject.value.key,
					},
					summary: issueSummary.value,
					description: issueTemplate.value?.fields?.description ?? '',
					issuetype: {
						id: selectedIssueType.value?.id,
					},
					assignee: {
						id: userInfo.value?.accountId,
					},
					components: selectedComponents,
					customfield_17630: selectedTeam.value.id,
				},
			}

			const res = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			})

			const responseData = await res.json()

			console.log('Response:', responseData)

			if (res.status === 201) {
				alert('Issue created successfully.')
				issueSummary.value = ''
				toggleVisibility()
				window.open(`https://jiradg.atlassian.net/browse/${responseData.key}`, '_blank')
			}
		}

		return {
			userInfo,
			editMode,
			issueTemplateKey,
			issueSummary,
			selectedProject,
			selectedIssueType,
			selectedTeam,
			selectedComponents,
			availableProjects,
			availableIssueTypes,
			availableTeams,
			// availableComponents, // ! Not yet implemented
			issueTemplate,
			issueSummaryErrors,
			loadIssueTemplate,
			loadingIssueTemplate,
			loadingIssueTemplateErrors,
			createNewIssue,
			componentsErrors,
			removeComponent,
		}
	},
	async mounted() {
		console.log('App mounted')
		// Load state from local storage
		let state = loadState()
		if (state.issueTemplateKey) {
			this.issueTemplateKey = state.issueTemplateKey
		}

		// User Info
		this.userInfo.value = await getMyself()
		// Issue Template
		await this.loadIssueTemplate()
	},
	template: appTemplate,
})

let getMyself = async () => {
	const res = await fetch('/rest/api/2/myself')
	return res.json()
}

let getAvailableProjects = async () => {
	const res = await fetch('/rest/api/2/project')
	let data = await res.json()
	data.sort((a, b) => a.key.localeCompare(b.key))
	return data
}

let getAvailableIssueTypes = async (projectKey) => {
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
	let overlayEl = document.getElementById('jira-issue-template')
	if (overlayEl) {
		overlayEl.classList.toggle('hidden')
		overlayEl.classList.toggle('flex')
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
		let overlayEl = document.getElementById('jira-issue-template')
		if (overlayEl && !overlayEl.contains(event.target) && event.target !== toggleButton && event.target.dataset.role !== 'component') {
			overlayEl.classList.add('hidden')
			overlayEl.classList.remove('flex')
		}
	})
}

let createToggleButton = () => {
	let toggleButton = document.createElement('button')
	toggleButton.textContent = '📄'
	toggleButton.title = 'Jira Issue Template'
	let buttonClasses =
		'ml-1 px-3 py-[6px] focus:outline-none font-medium bg-primary dark:bg-primary-dark text-white dark:text-slate-900 rounded-brand hover:bg-primary-hover dark:hover:bg-primary-dark-hover'
	toggleButton.classList.add(...buttonClasses.split(' '))
	toggleButton.addEventListener('click', addButtonClickHandler)
	return toggleButton
}

let appendToggleButton = (toggleButton) => {
	let wrapperElement = document.querySelector('#createGlobalItem').parentElement
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
