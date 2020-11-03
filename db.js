/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EventEmitter = require("events");

const MongoClient = require("mongodb").MongoClient;

const dbEventEmitter = new EventEmitter();

class MongoDbFactory {
    static async create() {
        if (!this.db) {
            const db = new MongoDb();
            await db._connect();
            Object.freeze(db);
            this.db = db;

            dbEventEmitter.on("close", () => {
                this.destroy();
            });
        }

        return this.db;
    }

    static destroy() {
        delete this.db;
    }
}

class MongoDb {

    constructor() {
        this.client = new MongoClient(process.env.MONGODB_URI, { useUnifiedTopology: true });
    }

    async _connect() {
        this.client = await this.client.connect();
        this.db = this.client.db(new URL(process.env.MONGODB_URI).pathname.slice(1));
    }

    async close() {
        dbEventEmitter.emit("close");
        await this.client.close();
    }

    async getLastCheck() {
        const metaCollection = this.db.collection("metadata");
        const dbQuery = { lastCheck: { $exists : true } };
        const queryOptions = { projection : { lastCheck : 1} };

        const lastCheckDoc = await metaCollection.findOne(dbQuery, queryOptions);
        if (lastCheckDoc) {
            const lastCheck = lastCheckDoc.lastCheck;
            if (lastCheck) {
                return lastCheck;
            }
        }
        return 0;
    }

    async setLastCheck(timestamp) {
        const metaCollection = this.db.collection("metadata");
        const dbQuery = { lastCheck: { $exists : true } };
        const dbUpdate = { $set: { lastCheck: timestamp } };
        const updateOptions = { upsert: true };

        await metaCollection.updateOne(dbQuery, dbUpdate, updateOptions);
    }

    async getEmailRecipients() {
        const metaCollection = this.db.collection("metadata");
        const dbQuery = { recipients: { $exists : true } };
        const queryOptions = { projection : { recipients : 1} };

        const recipientsDoc = await metaCollection.findOne(dbQuery, queryOptions);
        if (recipientsDoc) {
            const recipients = recipientsDoc.recipients;
            if (recipients) {
                return recipients;
            }
            throw new Error("No recipients! Exiting.");
        }
    }

    async insert(entry) {
        const contributionsCollection = this.db.collection("contributions");
        await contributionsCollection.insertOne(entry);
    }

    async getMonthlyReportData() {
        const contributionsCollection = this.db.collection("contributions");

        const current = new Date();
        const firstDay = new Date(current.getUTCFullYear(), current.getUTCMonth() - 1, 1);
        const lastDay = new Date(current.getUTCFullYear(), current.getUTCMonth(), 1);
        const month = firstDay.toLocaleString("en-US", { month: "long", year: "numeric" });

        const result = contributionsCollection.aggregate([
            { $match: { "mergedAt":   {"$gte": firstDay.toISOString(), "$lt": lastDay.toISOString() }}},
            { "$group": {_id: "$author.login", count: { $sum: 1 }}},
            { $sort: { "count": -1 }}
        ]);
        const contributions = await result.toArray();

        return {
            month,
            contributions
        };
    }
}

module.exports = {
    MongoDbFactory
};
