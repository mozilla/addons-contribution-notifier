const { URL } = require("url"); // Not needed in node10
const { promisify } = require("util");

const GitHub = require("github-api");
const MongoClient = require("mongodb").MongoClient;
const pug = require("pug");
const redis = require("redis");

const email = require("./email");

// We still need this for bots and yourself...
const developers = [
    "greenkeeper[bot]",
    "greenkeeperio-bot",
    "pyup-bot",
    "renovate",
    "snyk-bot",
    "wagnerand",
];

const repositories = [
    ["mozilla", "addons"],
    ["mozilla", "addons-contribution-notifier"],
    ["mozilla", "addons-frontend"],
    ["mozilla", "addons-linter"],
    ["mozilla", "addons-server"],
    ["mozilla", "dispensary"],
    ["mozilla", "sign-addon"],
    ["mozilla", "web-ext"],
    ["mozilla", "webextension-polyfill"],
];

const attributes = [
    "fantastic",
    "great",
    "marvelous",
    "phenomenal",
    "terrific",
    "wonderful"
];

const gh = new GitHub({token: process.env.GITHUB_TOKEN});
const compileEmail = pug.compileFile("new_contribution.pug");

async function checkRepo(orgname, repositoryname, lastCheck, recipients, dbCollection) {
    if (!lastCheck) {
        lastCheck = 0;
    }

    const repository = gh.getRepo(orgname, repositoryname);

    const pullRequests = await repository.listPullRequests({
        state: "closed",
        sort: "updated",
        direction: "desc"
    });

    await Promise.all(pullRequests.data.map(async pr => {
        if (!developers.includes(pr.user.login) && pr.merged_at) {
            const date = new Date(pr.merged_at);
            if (date.getTime() > lastCheck) {
                const contributor = pr.user.login;
                const isStaff = await gh.getOrganization("mozilla").isMember(contributor);
                if (!isStaff) {
                    console.log(`${orgname}/${repositoryname}: PR ${pr.number} by ${contributor} was merged on ${pr.merged_at}.`);
                    pr.created_at = new Date(pr.created_at);
                    pr.updated_at = new Date(pr.updated_at);
                    pr.closed_at = new Date(pr.closed_at);
                    pr.merged_at = date;
                    dbCollection.insert(pr);
                    const renderedEmail = compileEmail({
                        attribute: attributes[Math.floor(Math.random() * attributes.length)],
                        organization: orgname,
                        repo_name: repositoryname,
                        pr_number: pr.number,
                        pr_committer: contributor,
                        date: date.toUTCString()
                    });
                    await email.send(recipients,
                        `[Add-ons] New Contribution by ${contributor}`,
                        renderedEmail
                    );
                } else {
                    // Not great because parallelization can lead to
                    // duplicates, but good enough for now.
                    developers.push(pr.user.login);
                }
            }
        }
    }));
    return new Date(pullRequests.headers.date).getTime();
}

async function main() {
    const redisClient = redis.createClient({
        url: process.env.REDIS_URL
    });
    const dbGetAsync = promisify(redisClient.get).bind(redisClient);
    const dbSetAsync = promisify(redisClient.set).bind(redisClient);

    let lastCheck = await dbGetAsync("lastCheck");
    if (!lastCheck) {
        lastCheck = "{}";
    }
    try {
        lastCheck = JSON.parse(lastCheck);
    } catch (err) {
        throw new Error("Can't parse lastCheck! Exiting.");
    }

    let recipients = await dbGetAsync("recipients");
    if (!recipients) {
        throw new Error("No recipients! Exiting.");
    }
    try {
        recipients = JSON.parse(recipients);
    } catch (err) {
        throw new Error("Can't parse recipients! Exiting.");
    }

    const mongoClient = await MongoClient.connect(process.env.MONGODB_URI);
    const mongoDb = mongoClient.db(new URL(process.env.MONGODB_URI).pathname.slice(1));
    const mongoCollection = mongoDb.collection("contributions");

    await Promise.all(repositories.map(async repo => {
        const repoString = `${repo[0]}_${repo[1]}`;
        let lastCheckRepo = lastCheck[repoString];
        if (!lastCheckRepo) {
            lastCheckRepo = 0;
        }
        lastCheckRepo = await checkRepo(repo[0], repo[1], lastCheckRepo, recipients, mongoCollection);
        lastCheck[repoString] = lastCheckRepo;
    }));
    await dbSetAsync("lastCheck", JSON.stringify(lastCheck));

    redisClient.quit();
    mongoClient.close();
}

main().catch(async err => {
    console.dir(err);
    const errorRecipients = [{
        email: "awagner@mozilla.com"
    }];
    try {
        await email.send(errorRecipients, "Add-ons Contribution Notifier Error", err.stack);
    } catch (error) {
        console.error(`!!! Cannot send error email: ${error}`);
    } finally {
        process.exit(1);
    }
});
