
async function welcomeCustomer(customer) {

    let fullName = customer['name']; // Assuming customer['name'] is a string like "John Doe"
    let firstName = fullName.split(' ')[0]; // Splits the string by space and takes the first part


    // Calculate the scheduled time (one hour from now)
    const scheduledTime = new Date(new Date().getTime() + 10 * 60 * 1000); // 10 minutes later
    const scheduledTimeISOString = scheduledTime.toISOString();


    // Construct the message
    const messageText = ``;

    // Construct the JSON object for the request
    const messageData = {
        text: messageText,
        recipient: customer['phone'],
        name: customer['name'],
        assistant: "64b31498e645e9f2ae7f25f8",
        sms: false,
        voice: false,
        scheduledAt: scheduledTimeISOString,
        customInstructions: `${firstName} just signed up to the rich by noon trial 10 minutes ago. You just checked and want to congratulate them and walk them through activating their account in the discord if they need any help`
    };
      
    

    // Send the request to the endpoint
    const response = await fetch('https://api.sellblue.ai/api/v1/message/outbound', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'c0a9b35b8e9d400bea0e1da502bed5ad',
            'userid': '64b646ad85120c084f2f1c38',
            'api-Key': '123'
        },
        body: JSON.stringify(messageData),
        mode: 'cors'  // Setting no-cors mode
    });

    return response.json();
}

module.exports = {
    welcomeCustomer
};
