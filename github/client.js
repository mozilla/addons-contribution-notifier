/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { GraphQLClient } = require("graphql-request");

const { addonsPullRequests } = require("./queries/addonsPullRequests");

const ENDPOINT = "https://api.github.com/graphql";


class GithubClient {
    constructor() {
        this.client = new GraphQLClient(ENDPOINT, {
            headers: {
                authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            },
        });  
    }

    async getaddonsPullRequests() {
        return await this.client.rawRequest(addonsPullRequests);
    }
}

module.exports = {
    GithubClient
};
