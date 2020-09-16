/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
 
const pug = require("pug");

const { MongoDbFactory } = require("../db");
const { Email } = require("./email");

const compileEmail = pug.compileFile("./emails/templates/new_contribution.pug");

const ATTRIBUTES = [
    "fantastic",
    "great",
    "marvelous",
    "phenomenal",
    "terrific",
    "wonderful"
];


class ContributionEmail extends Email {
    constructor(pr) {
        super();
        this.pr = pr;
    }

    async send() {
        const renderedEmail = compileEmail({
            attribute: ATTRIBUTES[Math.floor(Math.random() * ATTRIBUTES.length)],
            repo: this.pr.repository.nameWithOwner,
            pr_number: this.pr.number,
            pr_committer: this.pr.author.login,
            date: new Date(this.pr.mergedAt).toUTCString()
        });

        const db = await MongoDbFactory.create();
        const recipients = await db.getEmailRecipients();

        await super.send(recipients,
            `[Add-ons] New Contribution by ${this.pr.author.login}`,
            renderedEmail
        );
    }
}

module.exports = {
    ContributionEmail
};
