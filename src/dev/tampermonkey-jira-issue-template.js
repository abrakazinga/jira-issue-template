// ==UserScript==
// @name     Jira Issue Template
// @version  2
// @include  https://jiradg.atlassian.net/*
// @require  https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js
// @grant unsafeWindow
// ==/UserScript==

// Von GreaseMonkey empfohlener Workaround, um zu verhindern das die jQuery-Version die via @require geladen wird die jQuery Version der aktuellen Seite 'überschreibt'.
this.$ = this.jQuery = jQuery.noConflict(true)

//
// Einstellungen
//

// Sollen issues automatisch einem Scrum Team zugewiesen werden? (true / false)
var autoAssignScrumTeam = true

// Welchem Scrum Team sollen Issues automatisch zugewiesen werden?
var scrumTeam = 'Skyfall'

// Verzögerung für das Einfüllen der Issue Daten in Millisekunden (bei langsamen Computern / Laptops u.U. höher setzen, falls es nicht funktioniert)
var eventDelay = 500

//
// -- Ab hier nichts mehr ändern
//
var visibilityCheckRequired = true
var intv = null

var awaitEditorAndFillIn = function () {
	console.log(jQuery('*[data-testid="issue-create.common.ui.fields.description-field.wrapper"]').is(':visible'))

	if ($('.wiki-editor-initialised').is(':visible') && !$('.wiki-editor-initialised').hasClass('richeditor-cover')) {
		$('.wiki-editor-initialised').html(textTemplate)
	} else if (typeof unsafeWindow.tinyMCE !== typeof undefined) {
		if (unsafeWindow.tinyMCE.editors[0].getContent() !== '') {
			return
		}

		unsafeWindow.tinyMCE.editors[0].setContent(htmlTemplate)
	}
}

// editor data-testid issue-create.common.ui.fields.description-field.wrapper
// #ak-editor-content-area #ak-editor-textarea

var setScrumTeam = function () {
	if (!autoAssignScrumTeam) {
		return
	}
	var teamSelectorId = $('label:contains(Scrum Team)').attr('for')
	$('#' + teamSelectorId)
		.find('option:contains(' + scrumTeam + ')')
		.attr('selected', 'selected')
}

jQuery(document).ready(function () {
	var SafeMutationObserver = window.MutationObserver || window.WebKitMutationObserver

	var observer = new SafeMutationObserver(function (mutations, observer) {
		if (visibilityCheckRequired && jQuery('.css-1j124qj').is(':visible')) {
			setTimeout(awaitEditorAndFillIn, eventDelay)
			setTimeout(setScrumTeam, eventDelay)
			visibilityCheckRequired = false

			let teamSelectorId = $('label:contains(Team)').attr('for')
			console.log('test', $('#' + teamSelectorId).find('option:contains(Skyfall)'))
		}

		if (!visibilityCheckRequired && !jQuery('.css-1j124qj').is(':visible')) {
			visibilityCheckRequired = true
		}
	})

	observer.observe(document, {
		subtree: true,
		attributes: true,
	})
})
