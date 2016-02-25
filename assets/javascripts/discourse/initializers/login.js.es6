import Login from 'discourse/controllers/login';
export default {
    name: 'discourse-customized-landing-page',
    initialize: function() {
        Login.reopen({
            actions: {
                login: function() {
                    const self = this;

                    if (Ember.isEmpty(this.get('loginName')) || Ember.isEmpty(this.get('loginPassword'))) {
                        self.flash(I18n.t('login.blank_username_or_password'), 'error');
                        return;
                    }

                    this.set('loggingIn', true);

                    Discourse.ajax("/session", {
                        data: { login: this.get('loginName'), password: this.get('loginPassword') },
                        type: 'POST'
                    }).then(function(result) {
                        // Successful login
                        if (result.error) {
                            self.set('loggingIn', false);
                            if (result.reason === 'not_activated') {
                                self.send('showNotActivated', {
                                    username: self.get('loginName'),
                                    sentTo: result.sent_to_email,
                                    currentEmail: result.current_email
                                });
                            } else {
                                self.flash(result.error, 'error');
                            }
                        } else {
                            Ember.debug("RESULT:" + JSON.stringify(result));
                            self.set('loggedIn', true);
                            // Trigger the browser's password manager using the hidden static login form:
                            const $hidden_login_form = $('#hidden-login-form');
                            const destinationUrl = $.cookie('destination_url');
                            const shouldRedirectToUrl = self.session.get("shouldRedirectToUrl");
                            const ssoDestinationUrl = $.cookie('sso_destination_url');
                            $hidden_login_form.find('input[name=username]').val(self.get('loginName'));
                            $hidden_login_form.find('input[name=password]').val(self.get('loginPassword'));

                            // Set URL based upon title
                            if (result.user.title == "Mentor") {
                                window.location.assign('/pages/mentor_landing');
                                return;
                            } else if (result.user.title == "Scholar") {
                                window.location.assign('/pages/scholar_landing');
                                return;
                            }
                            if (ssoDestinationUrl) {
                                $.cookie('sso_destination_url', null);
                                window.location.assign(ssoDestinationUrl);
                                return;
                            } else if (destinationUrl) {
                                // redirect client to the original URL
                                $.cookie('destination_url', null);
                                $hidden_login_form.find('input[name=redirect]').val(destinationUrl);
                            } else if (shouldRedirectToUrl) {
                                self.session.set("shouldRedirectToUrl", null);
                                $hidden_login_form.find('input[name=redirect]').val(shouldRedirectToUrl);
                            } else {
                                $hidden_login_form.find('input[name=redirect]').val(window.location.href);
                            }

                            if (navigator.userAgent.match(/(iPad|iPhone|iPod)/g) && navigator.userAgent.match(/Safari/g)) {
                                // In case of Safari on iOS do not submit hidden login form
                                window.location.href = $hidden_login_form.find('input[name=redirect]').val();
                            } else {
                                $hidden_login_form.submit();
                            }
                            return;
                        }

                    }, function(e) {
                        // Failed to login
                        if (e.jqXHR && e.jqXHR.status === 429) {
                            self.flash(I18n.t('login.rate_limit'), 'error');
                        } else {
                            self.flash(I18n.t('login.error'), 'error');
                        }
                        self.set('loggingIn', false);
                    });

                    return false;
                }
            }
        });
    }
};

