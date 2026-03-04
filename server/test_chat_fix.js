const fetch = require('node-fetch');

async function testChat() {
    console.log("Testing /api/chat with leading assistant message...");

    const payload = {
        message: "Dime algo sobre mi viaje",
        conversationHistory: [
            { role: 'assistant', content: '¡Hola! ¿En qué puedo ayudarte?' }, // Leading assistant message
            { role: 'user', content: '¿Qué tiempo hace en Tokyo?' },
            { role: 'assistant', content: 'Hace sol en Tokyo.' }
        ],
        tripContext: {
            destination: "Tokyo",
            startDate: "2026-01-25",
            endDate: "2026-01-30"
        }
    };

    try {
        const response = await fetch('http://localhost:5000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log("Response Status:", response.status);
        console.log("AI Response:", data.response);

        if (data.response && !data.response.includes("Error")) {
            console.log("SUCCESS: Chat fix verified.");
        } else {
            console.log("FAILURE: Chat fix not working or other error occurred.");
        }
    } catch (error) {
        console.error("Test Error:", error.message);
    }
}

testChat();
