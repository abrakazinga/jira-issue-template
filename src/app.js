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

	let app = new Vue({
		data: {
			message: 'Hello world!',
			userInfo: { login: 'Unknown', public_repos: '...', public_gists: '...', followers: '...' },
		},
		methods: {
			getUserId(url) {
				let userId = ''
				let regex = /github.com\/([^\/]*).*/
				let found = url.match(regex)
				if (found && found.length > 1) {
					userId = found[1]
					this.getUserInfo(userId)
				}
			},
			getUserInfo(userId) {
				fetch('https://api.github.com/users/' + userId)
					.then((res) => {
						return res.json()
					})
					.then((json) => {
						this.userInfo = json
					})
			},
		},
		created: function () {
			this.getUserId(window.location.toString())
		},
	})

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
				app.$mount('#jira-issue-template-app')
			}, 3000)
		},
	}
})(window)
