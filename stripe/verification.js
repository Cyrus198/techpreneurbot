const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { addRoleToUser } = require('../discord/utilities.js');



async function checkforActiveSubscription(client, customerEmail, discordUserId) {
    customerEmail = customerEmail.toLowerCase();
    let customers = await stripe.customers.list({ email: customerEmail });
    if (customers.data.length === 0) {
        const newCustomers = await stripe.customers.list({
            limit: 100
          });
          const matchingCustomers = newCustomers.data.filter(newCustomer => newCustomer.email?.toLowerCase() === customerEmail);

          if (matchingCustomers.length > 0) {
            customers.data = matchingCustomers;
        } else {
            return 'No customer found with that email';
        } 
    }
    let duplicateTrialSubscription = false;
    let activeSubscriptionFound = false;
    let pastDueSubscriptionFound = false;
    let cancelledSubscriptionFound = false;
    let responseMessage = '';
    
    // catch duplicate trials
    let existingTrial = await findExistingTrialPeriod(customers);
    if(existingTrial && existingTrial.hasProduct) {
        return `Account requires manual activation due to existing past due invoice ${existingTrial.invoiceUrl}`;
    }
    

    // new customers
    for (const customer of customers.data) {
        const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'all',
            expand: ['data.latest_invoice']
        });
           
        for (const subscription of subscriptions.data) {
            console.log(subscription);
            if (subscription.status === 'active' || subscription.status === 'trialing') {
                await stripe.customers.update(customer.id, {
                    metadata: { discord: discordUserId }
                });
                addRoleToUser(client, discordUserId);
                return 'Their subscription has been confirmed as active. And we have unlocked the members only channels for this user.';
            } else if (subscription.status === 'past_due') {
                pastDueSubscriptionFound = true;
                responseMessage = `They have a subscription but it's past due. They need to complete payment at this link ${subscription.latest_invoice.hosted_invoice_url} and the members only channels will become available.`;
            } else if (subscription.status === 'canceled') {
                cancelledSubscriptionFound = true;
            }
        }
    }

    if (pastDueSubscriptionFound) {
        return responseMessage;
    } else if (cancelledSubscriptionFound) {
        return 'We found their account in Stripe, but their subscription is cancelled. They need to resign up at https://join.richbynoon.live/b/14kcOx7IG7T9gxy7st';
    } else {
        return 'We found their account in Stripe but they don’t have an active subscription. They need to resign up at https://join.richbynoon.live/b/14kcOx7IG7T9gxy7st';
    }
}

async function findExistingTrialPeriod(customers) {
    // stop scammers
    if (customers.data.length > 1) {
        for (const customer of customers.data) {
            // Retrieve subscriptions that are either past_due or canceled
            const subscriptions = await stripe.subscriptions.list({
                customer: customer.id,
                status: 'all', // We need to retrieve all and then filter in code because Stripe API does not support multiple statuses in a single request
                expand: ['data.items']
            });
        
            // Filter for past_due and canceled subscriptions
            const filteredSubscriptions = subscriptions.data.filter(sub => 
                sub.status === 'past_due' || sub.status === 'canceled'
            );
        
            for (const subscription of filteredSubscriptions) {
                // Check if any subscription items match the product ID
                const hasProduct = subscription.items.data.some(item => 
                    item.plan.product === 'prod_Ox8l41CouNym4X'
                );
            
                if (hasProduct) {
                    // Fetch the invoice details using the invoice ID
                    let invoiceUrl = '';
                    if (subscription.latest_invoice) {
                        try {
                            const invoice = await stripe.invoices.retrieve(subscription.latest_invoice);
                            if (invoice && invoice.hosted_invoice_url) {
                                invoiceUrl = invoice.hosted_invoice_url;
                            }
                        } catch (error) {
                            console.error("Error fetching invoice details:", error);
                            // Handle error (e.g., invoice not found or API error)
                        }
                    }
            
                    return { hasProduct: true, invoiceUrl: invoiceUrl };
                }
            }            
        }        
    }
}

module.exports = { checkforActiveSubscription };
