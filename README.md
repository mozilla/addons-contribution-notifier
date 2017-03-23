# Add-on contribution notifier

We love contributions to the Mozilla add-ons ecosystem! And we have a lot of projects people can contribute to.

To make sure contributors are recognized for their efforts, we want to stay up to speed.

This script fetches GitHub pull requests from Mozilla add-ons repositories and sends an email notification whenever a pull request by a contributor gets merged.

### How do I get a notification?
There is no interface to do that yet, please open a new issue.

### How to add a repository?
Add your repository to the `repositories` array in [index.js](https://github.com/mozilla/addons-contribution-notifier/blob/master/index.js) and submit a pull request.

### Developer notes:
This script lives on _Heroku_, so it expects a couple of environment variables to work correctly (or at all):

* We use the [_Postmark_](https://postmarkapp.com/) service to send emails.

```
POSTMARK_API_KEY
POSTMARK_API_TOKEN
POSTMARK_INBOUND_ADDRESS
POSTMARK_SMTP_SERVER
```

* We store some data like the recipients in redis. The path to the redis instance is expected to be in:

```
REDIS_URL
```

* In order to check whether a contributor is a member of the _Mozilla_ organisation on GitHub, we need to do an API lookup from a user within that organisation. The token is stored in:
```
GITHUB_TOKEN
```
