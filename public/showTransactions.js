const web3 = new Web3(window.ethereum);

const contractAddress = '0x5471A5deF4df9deD209Bd4f2001C438AEcFAfE96'; 

let transactionFound = false;

async function loadABI() {
    const response = await fetch('/fundraiserABI.json');
    const contractABI = await response.json();
    return contractABI;
}

async function setupContract() {
    const contractABI = await loadABI();
    const contract = new web3.eth.Contract(contractABI, contractAddress);

    const accounts = await web3.eth.requestAccounts();
    const connectedWallet = accounts[0];

    console.log('Connected Wallet:', connectedWallet);

    contract.events.DonationReceived({
        fromBlock: 0
    }, (error, event) => {
        if (error) {
            console.error('Error in DonationReceived event:', error);
        } else {
            if (event.returnValues.donor.toLowerCase() === connectedWallet.toLowerCase()) {
                transactionFound = true;
                showEventDetails(event);
            }
        }
    });

    // ⏳ After 10 seconds, if no transactions, show fallback message
    setTimeout(() => {
        if (!transactionFound) {
            const transactionDetailsDiv = document.getElementById('transactionDetails');
            transactionDetailsDiv.innerHTML = 'No transactions found.';
        }
    }, 10000); // 10 seconds
}

function showEventDetails(event) {
    const transactionDetailsDiv = document.getElementById('transactionDetails');

    // ✅ Clear "Loading transactions..." on first event
    if (transactionDetailsDiv.innerHTML.trim() === 'Loading transactions...') {
        transactionDetailsDiv.innerHTML = '';
    }

    const eventDetails = document.createElement('div');
    eventDetails.innerHTML = `
        <strong>Donation Details:</strong>
        <p>Event ID: ${event.returnValues.id}</p>
        <p>Amount: ${web3.utils.fromWei(event.returnValues.amount, 'ether')} ETH</p>
        <p>Donor: ${event.returnValues.donor}</p>
        <p>Receiver: ${event.returnValues.receiver}</p>
        <hr />
    `;
    transactionDetailsDiv.appendChild(eventDetails);
}

window.onload = setupContract;
