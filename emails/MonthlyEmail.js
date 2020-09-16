/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
 
const pug = require("pug");

const { MongoDbFactory } = require("../db");
const { Email } = require("./email");

const compileEmail = pug.compileFile("./emails/templates/monthly_report.pug");


class MonthlyEmail extends Email {
    constructor(month, contributions) {
        super();
        this.month = month;
        this.contributions = contributions;
    }

    async send() {
        const totalContributors = this.contributions.length;
        const totalContributions = this.contributions.reduce((acc, cur) => { return acc + cur.count; }, 0);

        const renderedEmail = compileEmail({
            month: this.month,
            totalContributors,
            totalContributions,
            contributions : this.contributions,
        });

        const db = await MongoDbFactory.create();
        const recipients = await db.getEmailRecipients();
    
        await super.send(recipients,
            `[Add-ons] Monthly Code Contributions Report ${this.month}`,
            renderedEmail
        );
    }
}

module.exports = {
    MonthlyEmail
};
