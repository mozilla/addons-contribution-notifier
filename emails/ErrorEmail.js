/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
 
const { Email } = require("./email");

const RECIPIENTS = [
    "awagner@mozilla.com"
];


class ErrorEmail extends Email {
    constructor(err) {
        super();
        this.err = err;
    }

    async send() {
        await super.send(RECIPIENTS,
            "Add-ons Contribution Notifier Error",
            this.err.stack);
    }
}

module.exports = {
    ErrorEmail
};
