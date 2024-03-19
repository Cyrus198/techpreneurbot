

module.exports = function (client) {
const express = require('express');
const app = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { removeRoleFromUser, addRoleToUser, doesUserHaveRole, messageUserForUpdate } = require('../discord/utilities');
const { welcomeCustomer } = require('../discord/sellblue');


app.use(express.json());

app.post('/webhook', (request, response) => {

    const customerId = request.body.data.object.customer; 

    retrieveCustomer(customerId).then(customer => {
        const discordUserId = customer.metadata.discord; // Extract the Discord user ID from customer metadata
        if (discordUserId) {

            // if payment suceeded lets check if they have a role
            if (request.body.type === 'payment_intent.succeeded') {
                checkAndHandleRole(client, discordUserId)
                // Call your function to add role to user in Discord
            }

            // payment failed kick em out
            if (request.body.type === 'payment_intent.payment_failed') {
                removeRoleFromUser(client, discordUserId);
                messageUserForUpdate(client, discordUserId);
            }

            // damn they left for real...lets schedule a sell blue winback
            if (request.body.type === 'customer.subscription.deleted') {
                removeRoleFromUser(client, discordUserId);
               //lets also hit them up
            }

            // damn they left for real...lets schedule a sell blue winback
            if (request.body.type === 'customer.subscription.deleted') {
                welcomeCustomer(customer);
                //lets also hit them up
            }

        } else {
            console.log('Discord user ID not found in customer metadata');
        }
    }).catch(error => {
        console.error('Error retrieving customer:', error);
    });


    response.status(200).send('Event received');
});

function retrieveCustomer(customerId) {
    return stripe.customers.retrieve(customerId);
}

async function checkAndHandleRole(client, discordUserId) {
    try {
        // Await the result of doesUserHaveRole
        const hasRole = await doesUserHaveRole(client, discordUserId);
        if (hasRole) {
            return;
        } else {
            addRoleToUser(client, discordUserId);
        }
    } catch (error) {
        console.error('Error in checkAndHandleRole:', error);
    }
}


return app;
};