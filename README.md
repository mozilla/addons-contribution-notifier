[![dependencies Status](https://david-dm.org/mozilla/addons-contribution-notifier/status.svg)](https://david-dm.org/mozilla/addons-contribution-notifier)

# Add-on contribution notifier

We love contributions to the Mozilla add-ons ecosystem! And we have a lot of projects people can contribute to.

To make sure contributors are recognized for their efforts, we want to stay up to speed.

# Entrypoints

## index.js
This script fetches GitHub pull requests from Mozilla add-ons repositories and sends an email notification whenever a pull request by a contributor gets merged. Contributions are stored in a mongoDB to create monthly report (see below).

## report.js
This script sends a summary of the contributions for the previous month. It is supposed to run at the beginning of each month.

### How do I get a notification?
There is no interface to do that yet, please open a new issue.

### How to add a repository?
Add your repository to the `REPOSITORIES` array in [repositories.js](https://github.com/mozilla/addons-contribution-notifier/blob/master/repositories.js) and submit a pull request.

### Developer notes:
This script lives on _Heroku_, so it expects a couple of environment variables to work correctly (or at all):


* We store contributions and some metadata like the email recipients in a mongoDB database. The connection URI is stored in:
```
MONGODB_URI
```

Email recipients are stored in the `metadata` collection. The scripts expects to find a document that has a `recipients` key, with it's value being a serialized array of email addresses.


* We use the [_SendGrid_](https://sendgrid.com/) service to send emails. The API key for SendGrid is stored in:

```
SENDGRID_API_KEY
```

* In order to dommunicate with the GitHub API, we need an API token. It is stored in:
```
GITHUB_TOKEN
```
