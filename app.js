/**
 * This is the express app to handle API calls for the game.
 */
"use strict";

const express = require("express");
const fs = require("fs/promises");
const multer = require("multer");
// Ran into some issues with authentication using promise-mysql
const mysql = require("mysql2/promise");

const app = express();
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(multer().none());

const CLIENT_ERR_CODE = 400;
const CLIENT_ERROR = "Bad request";
const SERVER_ERR_CODE = 500;
const SERVER_ERR = "Server error";

const PORT = process.env.PORT || 8000;
app.listen(PORT);


/**
 * Get the database from the Azure server.
 * @returns {Object}
 */
async function getDB() {
    try {
        let db = await mysql.createConnection({
            host: "fish-to-fortunes-db.mysql.database.azure.com",
            port: "3306",
            user: "wcen",
            password: "P@O108140017",
            database: "game"
        });
        return db;
    } catch (err) {
        throw Error(SERVER_ERR);
    }
}

/**
 * Login with given credentials.
 */
app.post('/login', async (req, res) => {
    try {
        let db = await getDB();
        let username = req.body.username;
        let password = req.body.password;
        let getUserQuery = `SELECT * FROM auth WHERE `
            + `username = '${username}' AND password = '${password}';`;
        let user = await db.query(getUserQuery);
        
        res.send(
            JSON.stringify({
                id: user[0][0].id,
                username: user[0][0].username
            })
        );
    } catch (err) {
        
        let errCode = CLIENT_ERR_CODE;
        let msg;
        if (err.message == SERVER_ERR) {
            msg = "Sorry, there has been a error accessing the database.";
            errCode = SERVER_ERR_CODE;
        } else {
            msg = "Incorrect username or password.";
        }
        res.status(errCode).send(
            JSON.stringify({
                error: msg
            })
        );
    }
});

/**
 * Register with given credentials.
 */
app.post('/register', async (req, res) => {
    try {
        let db = await getDB();
        let username = req.body.username;
        let password = req.body.password;
        let regisQuery = `INSERT INTO auth (username, password) ` 
            + `VALUES ('${username}','${password}');`;
        let getUserQuery = `SELECT * FROM auth WHERE `
            + `username = '${username}' AND password = '${password}';`;
        
        await db.query(regisQuery);
        let user = await db.query(getUserQuery);
        let inventoryQuery = `INSERT INTO inventory `
            + `(user_id, shells, items) `
            + `VALUES (${user[0][0].id}, 0, '[]');`;

        await db.query(inventoryQuery);

        res.send(
            JSON.stringify({
                id: user[0][0].id,
                username: user[0][0].username
            })
        );
    } catch (err) {
        let errCode = CLIENT_ERR_CODE;
        let msg;
        if (err.message == SERVER_ERR) {
            msg = "Sorry, there has been a error accessing the database.";
            errCode = SERVER_ERR_CODE;
        } else {
            msg = "This username is already taken.";
        }
        res.status(errCode).send(
            JSON.stringify({
                error: msg
            })
        );
    }
});

/**
 * Get inventory of user with given userID.
 */
app.get('/inventory', async (req, res) => {
    try {
        let db = await getDB();
        let userID = req.query.userID;
        
        let getInventoryQuery = `SELECT * FROM inventory WHERE `
            + `user_id = ${userID}`;
        let inventory = await db.query(getInventoryQuery);

        res.send(
            JSON.stringify({
                shells: inventory[0][0].shells,
                items: inventory[0][0].items
            })
        );
    } catch (err) {
        let errCode = CLIENT_ERR_CODE;
        let msg;
        if (err.message == SERVER_ERR) {
            msg = "Sorry, there has been a error accessing the database.";
            errCode = SERVER_ERR_CODE;
        } else {
            msg = "Please give a valid user ID.";
        }
        res.status(errCode).send(
            JSON.stringify({
                error: msg
            })
        );
    }
});

/**
 * Update the user's inventory with new items/fish
 */
app.post('/fish', async (req, res) => {
    try {
        let db = await getDB();
        let userID = req.body.userID;
        let strength = req.body.strength;
        let item;

        if (Math.random() < 0.8) {
            item = randomFish(strength);
        } else {
            item = randomRod();
        }
        let query;

        if (item.is_fish) {
            query = `UPDATE inventory `
                + `SET shells = shells + ${item.fish_value} `
                + `WHERE user_id = ${userID};`;
        } else {
            query = `UPDATE inventory `
                + `SET items = JSON_ARRAY_APPEND `
                + `(items, '$', CAST('${JSON.stringify(item)}' as JSON)) `
                + `WHERE user_id = ${userID};`;
        }
        await db.query(query);

        res.send(item);
    } catch (err) {
        let errCode = CLIENT_ERR_CODE;
        let msg;
        if (err.message == SERVER_ERR) {
            msg = "Sorry, there has been a error accessing the database.";
            errCode = SERVER_ERR_CODE;
        } else {
            msg = "Please give a valid user ID.";
        }
        res.status(errCode).send(
            JSON.stringify({
                error: msg
            })
        );
    }
});

/**
 * Sell an item from the user's inventory.
 */
app.post('/sell', async (req, res) => {
    try {
        let db = await getDB();
        let userID = req.body.userID;
        let itemStrength = req.body.itemStrength;
        let price = req.body.price;
        let rod = JSON.stringify({
            is_fish: false,
            equipped: false,
            strength: itemStrength
        });

        let shopQuery = `INSERT INTO shop `
            + `(user_id, price, item) `
            + `VALUES (${userID}, ${price}, '${rod}');`;
        await db.query(shopQuery);

        let getInventoryQuery = `SELECT * FROM inventory WHERE `
            + `user_id = ${userID}`;
        let inventory = await db.query(getInventoryQuery);
        let newItems = inventory[0][0].items;
        let index = newItems.indexOf(JSON.parse(rod));
        newItems.splice(index, 1);

        let updateQuery = `UPDATE inventory `
            + `SET items = '${JSON.stringify(newItems)}' `
            + `WHERE user_id = ${userID};`;
        await db.query(updateQuery);

        res.send(JSON.stringify({
            filler: ""
        }));
    } catch (err) {
        
        let errCode = CLIENT_ERR_CODE;
        let msg;
        if (err.message == SERVER_ERR) {
            msg = "Sorry, there has been a error accessing the database.";
            errCode = SERVER_ERR_CODE;
        } else {
            msg = "Please give a valid user ID.";
        }
        res.status(errCode).send(
            JSON.stringify({
                error: msg
            })
        );
    }
});

/**
 * Get the list of items on the marketplace.
 */
app.get('/shop', async (req, res) => {
    try {
        let db = await getDB();
        let userID = req.query.userID;
        
        let query = `SELECT * FROM shop WHERE `
            + `user_id != ${userID}`;
        let shop = await db.query(query);

        res.send(JSON.stringify(shop[0]));
    } catch (err) {
        
        let errCode = CLIENT_ERR_CODE;
        let msg;
        if (err.message == SERVER_ERR) {
            msg = "Sorry, there has been a error accessing the database.";
            errCode = SERVER_ERR_CODE;
        } else {
            msg = "Please give a valid user ID.";
        }
        res.status(errCode).send(
            JSON.stringify({
                error: msg
            })
        );
    }
});

/**
 * Buy an item from the marketplace.
 */
app.post('/buy', async (req, res) => {
    try {
        let db = await getDB();
        let itemID = req.body.itemID;
        let userID = req.body.userID;
        let sellerID = req.body.sellerID;
        let strength = req.body.strength;
        let price = req.body.price;
        let newRod = JSON.stringify({
            is_fish: false,
            equipped: false,
            strength: strength
        });

        let buyQuery = `UPDATE inventory `
            + `SET items = JSON_ARRAY_APPEND `
            + `(items, '$', CAST('${newRod}' as JSON)), `
            + `shells = shells - ${price} `
            + `WHERE user_id = ${userID};`;
        await db.query(buyQuery);

        let payQuery = `UPDATE inventory `
            + `SET shells = shells + ${price} `
            + `WHERE user_id = ${sellerID};`;
        await db.query(payQuery);

        let deleteQuery = `DELETE FROM shop WHERE `
            + `id = ${itemID};`;
        await db.query(deleteQuery);


        res.send(JSON.stringify({
            filler: ""
        }));
    } catch (err) {
        
        let errCode = CLIENT_ERR_CODE;
        let msg;
        if (err.message == SERVER_ERR) {
            msg = "Sorry, there has been a error accessing the database.";
            errCode = SERVER_ERR_CODE;
        } else {
            msg = "Please give a valid user ID.";
        }
        res.status(errCode).send(
            JSON.stringify({
                error: msg
            })
        );
    }
});

/**
 * Return a random rod.
 * @returns {JSON}
 */
function randomRod() {
    let strength = Number((100*Math.random()).toFixed(0));
    return JSON.parse(JSON.stringify({
        is_fish: false,
        equipped: false,
        strength: strength
    }));
}

/**
 * Return a random fish based on strength.
 * @param {Number} strength
 * @returns {JSON}
 */
function randomFish(strength) {
    const DEFAULT_STR = 20;
    const STRENGTH_MULTIPLIER = 2;
    const FISH = ["sardine", "trout", "cod", "puffer", "bluefin"];
    const FISH_VALUE = [2, 10, 50, 200, 1000];
    const PROB = [0.6, 0.9, 0.96, 0.99, Infinity];
    
    if (strength == undefined) {
        strength = DEFAULT_STR;
    }
    let rand = Math.random() * STRENGTH_MULTIPLIER * (strength / 100);
    
    for (let i = 0; i < PROB.length; i++) {
        if (rand < PROB[i]) {
            return JSON.parse(JSON.stringify({
                is_fish: true,
                fish: FISH[i],
                fish_value: FISH_VALUE[i]
            }));
        }
    }
}