/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { gql } = require("graphql-request");

const { REPOSITORIES } = require("../repositories");

const addonsPullRequests = gql`
query getPulLRequestBySearchQuery {
    search(type: ISSUE,
           query: "${REPOSITORIES.map((n) => `repo:${n}`).join("\n")}
                   type:pr is:merged sort:updated-desc",
           last: 100) {
        nodes {
            ... on PullRequest {
                number
                repository {
                    nameWithOwner
                }
                mergedAt
                author {
                    ... on User {
                        login
                        organization(login: "Mozilla") {
                            name
                        }
                    }
                }
            }
        }
    }
}
`;

module.exports = {
    addonsPullRequests
};