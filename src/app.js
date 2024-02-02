;(function (window) {
	let appTemplate = `<div id="jira-issue-template-app" style="opacity: 1" >
                      <span>
                        <img id="peppa-img"  
                        src="https://raw.githubusercontent.com/tobyqin/tampermonkey_vue/master/github-info/peppa.png">
                        <div class="pig-say">
                            <div class="pig-info-arrow"></div>
                            <div class="pig-info">
                                <p><b>Peppa:</b> {{message}} <br/>
                                <span>User: {{userInfo.login}} / </span>
                                <span>Repos: {{userInfo.public_repos}}<br></span>
                                <span>Gists: {{userInfo.public_gists}} / </span>
                                <span>Followers: {{userInfo.followers}}<br></span>     
                                <div class="pig-info-more">
                                </div>              
                                <div class="action-footer"><p>Thanks <a href="https://github.com/tobyqin">Toby</a> bringing me here ^_^</p></div>
                            </div>
                        </div>
                    </span>
                    </div>`

	window.jiraIssueTemplate = {
		isReady(successCallBack) {
			jq(document).ready(function () {
				successCallBack()
			})
		},
		appendToBody() {
			jq('body').append(appTemplate)
		},
		addStyle() {
			jq('head').append(`<style type="text/css"></style>`)
		},
		startApp() {
			this.appendToBody()
			setTimeout(() => {
				githubApp.$mount('#jira-issue-template-app')
			}, 3000)
		},
	}
})(window)
