/**
 * @author Weihong Cen
 * @date 05/23/2023
 * 
 * This contains all the interactivity scripting for the game.
 * I chose to not use util functions for more helpful autocomplete.
 */
(function() {
    "use strict";

    const BASE_URL = "http://localhost:8000";

    const LOGIN = 1;
    const MAIN = 2;

    let userID;
    let username;
    let shells;
    let items;

    let strength; //To be used when equipment saving is implemented
    let selectedStrength;
    let equippedStrength = 20;

    
    /**
     * Initialize the page.
     */
    function init() {
        initAuth();
    }

    /**
     * Initialize authentication procedures.
     */
    function initAuth() {
        let loginBtn = document.getElementById("login-btn");
        let signupBtn = document.getElementById("signup-btn");
        loginBtn.addEventListener("click", authenticate);
        signupBtn.addEventListener("click", register);
    }

    /**
     * Verify the username and password from a MySQL database.
     */
    async function authenticate() {
        let request = BASE_URL + "/login";
        let username = document.getElementById("username-input").value;
        let password = document.getElementById("password-input").value;
        let warningMsg = document.querySelector("#login-page .warning-msg");

        warningMsg.textContent = "";
        if (username != "" && password != "") {
            try {
                let resp = await fetch(request, {
                    method: 'POST',
                    headers: {
                        "Content-type": "application/json"
                    },
                    body: JSON.stringify({
                        username: username,
                        password: password
                    })
                });

                let data = await resp.json();

                if (!resp.ok) {
                    throw Error(data.error);
                }
                handleAuthSuccess(data);
            } catch (err) {
                handleAuthError(err);
            }
        } else {
            let msg = "Please enter a username and password.";
            handleAuthError(new Error(msg));
        }
    }

    /**
     * Add a new user to the database.
     */
    async function register() {
        let request = BASE_URL + "/register";
        let username = document.getElementById("username-input").value;
        let password = document.getElementById("password-input").value;
        let warningMsg = document.querySelector("#login-page .warning-msg");

        warningMsg.textContent = "";
        if (username != "" && password != "") {
            try {
                let resp = await fetch(request, {
                    method: 'POST',
                    headers: {
                        "Content-type": "application/json"
                    },
                    body: JSON.stringify({
                        username: username,
                        password: password
                    })
                });

                let data = await resp.json();

                if (!resp.ok) {
                    throw Error(data.error);
                }
                handleAuthSuccess(data);
            } catch (err) {
                handleAuthError(err);
            }
        } else {
            let msg = "Please enter a username and password.";
            handleAuthError(new Error(msg));
        }
    }

    /**
     * Handle successful authentication and update user variables.
     * @param {JSON} data
     */
    function handleAuthSuccess(data) {
        userID = data.id;
        username = data.username;
        initMainPage();
        changePageView(MAIN);
    }

    /**
     * Change the page's focus between sections.
     * @param {Number} page
     */
    function changePageView(page) {
        let loginPage = document.getElementById("login-page");
        let mainPage = document.getElementById("main-page");
        let waveBackground = document.getElementById("wave-background");
        let groundBackground = document.getElementById("ground-background");

        loginPage.className = "";
        mainPage.className = "";
        waveBackground.className = "";
        groundBackground.className = "";

        if (page == LOGIN) {
            loginPage.classList.add("login-page-login-state");
            mainPage.classList.add("main-page-login-state");
            waveBackground.classList.add("wave-login-state");
            groundBackground.classList.add("ground-login-state");
        } else {
            loginPage.classList.add("login-page-main-state");
            mainPage.classList.add("main-page-main-state");
            waveBackground.classList.add("wave-main-state");
            groundBackground.classList.add("ground-main-state");
        }
    }

    /**
     * Initialize the main view of the website.
     */
    function initMainPage() {
        let inventoryButton = document.getElementById("inventory-btn");
        let fishButton = document.getElementById("fish-btn");
        let signoutButton = document.getElementById("signout-btn");
        let shopButton = document.getElementById("shop-btn");
        let equpBtn = document.querySelectorAll("#item-actions button")[0];
        let sellBtn = document.querySelectorAll("#item-actions button")[1];

        signoutButton.addEventListener("click", ()=>{
            changePageView(LOGIN)
        });
        inventoryButton.addEventListener("click", openInventory);
        shopButton.addEventListener("click", openShop);
        fishButton.addEventListener("click", fish);
        equpBtn.addEventListener("click", equip);
        sellBtn.addEventListener("click", sell);
        updateProfile();
    }

    /**
     * Equip a fishing rod and update stats.
     */
    function equip() {
        let inventoryModal = document.getElementById("inventory");
        equippedStrength = selectedStrength;
        updateProfile();
        inventoryModal.close();
    }

    /**
     * Refresh profile/inventory information.
     */
    async function updateProfile() {
        let request = BASE_URL + `/inventory?userID=${userID}`;

        try {
            let resp = await fetch(request);

            let data = await resp.json();

            if (!resp.ok) {
                throw Error(data.error);
            }
            populateProfile(data);
        } catch (err) {
            handleMainError(err);
        }
    }

    /**
     * Populate the profile modal with data.
     * @param {JSON} data
     */
    function populateProfile(data) {
        let profile = document.getElementById("profile").querySelectorAll("p");
        shells = data.shells;
        items = data.items;
        profile[0].textContent = `Username: ${username}`;
        profile[1].textContent = `Shells: ${shells}`;
        profile[2].textContent = `Strength: ${equippedStrength}`;
        for (let i = 0; i < items.length; i++) {
            if (items[i].equipped) {
                strength = items[i].strength;
            }
        }
    }

    /**
     * Open the inventory modal.
     */
    async function openInventory() {
        let inventoryModal = document.getElementById("inventory");
        let itemDisplay = inventoryModal.querySelector("div");
        let infoSection = document.getElementById("details");
        let info = infoSection.querySelector("p");
        let itemActions = document.getElementById("item-actions");

        await updateProfile();
        itemActions.classList.add("hidden");
        itemDisplay.innerHTML = "";
        info.textContent = "";

        for (let i = 0; i < items.length; i++) {
            let newItem = document.createElement("div");
            let itemStrength = items[i].strength;
            newItem.addEventListener("click", ()=>{
                displayInfo(itemStrength)
            });
            itemDisplay.appendChild(newItem);
        }
        inventoryModal.showModal();
    }

    /**
     * Display the onformation of each item in the inventory.
     * @param {Number} itemStrength
     */
    function displayInfo(itemStrength) {
        let infoSection = document.getElementById("details");
        let info = infoSection.querySelector("p");
        let itemActions = document.getElementById("item-actions");
        
        info.textContent = `Strength: ${itemStrength}`;
        itemActions.classList.remove("hidden");
        selectedStrength = itemStrength;
    }

    /**
     * Sell an item in the inventory.
     */
    async function sell() {
        let request = BASE_URL + "/sell";
        let price = document.getElementById("sell-input").value;
        if (price == '') {
            price = 0;
        }
        
        try {
            let resp = await fetch(request, {
                method: 'POST',
                headers: {
                    "Content-type": "application/json"
                },
                body: JSON.stringify({
                    userID: userID,
                    itemStrength: selectedStrength,
                    price: price
                })
            });

            let data = await resp.json();

            if (!resp.ok) {
                throw Error(data.error);
            }
            handleSellSuccess(data);
        } catch (err) {
            handleMainError(err);
        }
    }

    /**
     * Handle a successful selling operation.
     * @param {JSON} data
     */
    function handleSellSuccess(data) {
        let inventoryModal = document.getElementById("inventory");
        inventoryModal.close();
    }

    /**
     * Open the shop modal.
     */
    async function openShop() {
        let shopModal = document.getElementById("shop");
        await getShop();
        shopModal.showModal();
    }

    /**
     * Get the shop information from the database.
     */
    async function getShop() {
        let request = BASE_URL + `/shop?userID=${userID}`;
        
        try {
            let resp = await fetch(request);
            let data = await resp.json();

            if (!resp.ok) {
                throw Error(data.error);
            }
            populateShop(data);
        } catch (err) {
            handleMainError(err);
        }
    }

    /**
     * Populate the shop with items from database.
     * @param {JSON} data
     */
    function populateShop(data) {
        let shopItems = document.getElementById("gallary");
        shopItems.innerHTML = "";
        for (let i = 0; i < data.length; i++) {
            let item = document.createElement("div");
            let description = document.createElement("p");
            let price = document.createElement("p");
            let button = document.createElement("button");

            item.classList.add("product");
            description.textContent = "Strength: " + data[i].item.strength;
            price.textContent = "Price: " + data[i].price;
            button.textContent = "Buy";
            button.addEventListener("click", ()=>{
                buyItem(data[i].id, data[i].user_id, 
                    data[i].price, data[i].item.strength);
            });
            button.disabled = data[i].price > shells;

            item.appendChild(description);
            item.appendChild(price);
            item.appendChild(button);
            shopItems.appendChild(item);
        }
    }

    /**
     * Buy an item from the shop.
     * @param {Number} itemID
     * @param {Number} sellerID
     * @param {Number} price
     * @param {Number} strength
     */
    async function buyItem(itemID, sellerID, price, strength) {
        let request = BASE_URL + "/buy";

        try {
            let resp = await fetch(request, {
                method: 'POST',
                headers: {
                    "Content-type": "application/json"
                },
                body: JSON.stringify({
                    itemID: itemID,
                    userID: userID,
                    sellerID: sellerID,
                    price: price,
                    strength: strength
                })
            });

            let data = await resp.json();

            if (!resp.ok) {
                throw Error(data.error);
            }
            handleBuySuccess(data);
        } catch (err) {
            handleMainError(err);
        }
    }

    /**
     * Handle a successful buying operation.
     * @param {JSON} data
     */
    function handleBuySuccess(data) {
        let shopModal = document.getElementById("shop");
        updateProfile();
        shopModal.close();
    }

    /**
     * Fish for a new fish/item with current stats and update inventory.
     */
    async function fish() {
        let request = BASE_URL + "/fish";

        try {
            let resp = await fetch(request, {
                method: 'POST',
                headers: {
                    "Content-type": "application/json"
                },
                body: JSON.stringify({
                    userID: userID,
                    strength: equippedStrength
                })
            });

            let data = await resp.json();

            if (!resp.ok) {
                throw Error(data.error);
            }
            handleFishSuccess(data);
        } catch (err) {
            handleMainError(err);
        }
    }

    /**
     * Handle successful authentication and update user variables.
     * @param {JSON} data
     */
    function handleFishSuccess(data) {
        let notifModal = document.getElementById("notification");
        let notifItemName = notifModal.querySelectorAll("p")[0];
        let notifSubMsg = notifModal.querySelectorAll("p")[1];

        updateProfile();
        if (data.is_fish) {
            notifItemName.textContent = `You caught a ${data.fish}!`;
            notifSubMsg.textContent = `Shells +${data.fish_value}`;
        } else {
            notifItemName.textContent = `You found a fishing rod!`;
            notifSubMsg.textContent = `Strength = ${data.strength}`;
        }
        notifModal.showModal();
    }

    /**
     * Handles error from authentication.
     * @param {Error} err
     */
    function handleAuthError(err) {
        let warningMsg = document.querySelector("#login-page .warning-msg");
        warningMsg.textContent = err.message;
    }

    /**
     * Handles error from main page.
     * @param {Error} err
     */
    function handleMainError(err) {
        let warningMsg = document.querySelector("#main-page .warning-msg");
        warningMsg.textContent = err.message;
    }
    
    init();
})();