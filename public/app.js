// ABI for your contract (provided by you)
const abi = [
    // Your ABI goes here
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "fundraiserId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "donor",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "DonationMade",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "fundraiserId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "recipient",
          "type": "address"
        }
      ],
      "name": "FundraiserCreated",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_name",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "_moto",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "_goalAmount",
          "type": "uint256"
        },
        {
          "internalType": "address payable",
          "name": "_recipient",
          "type": "address"
        }
      ],
      "name": "createFundraiser",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_fundraiserId",
          "type": "uint256"
        }
      ],
      "name": "donate",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "fundraiserCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "fundraisers",
      "outputs": [
        {
          "internalType": "string",
          "name": "name",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "moto",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "goalAmount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "amountRaised",
          "type": "uint256"
        },
        {
          "internalType": "address payable",
          "name": "recipient",
          "type": "address"
        },
        {
          "internalType": "bool",
          "name": "exists",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];
  
  // Contract address from the deployment
  const contractAddress = '0x9f4D4A6672772c4Ea24684814803203C74fb7f28';  // Your contract address
  
  let web3;
  let contract;
  let userAccount;
  
  // Initialize web3 and contract
  async function init() {
    if (window.ethereum) {
      web3 = new Web3(window.ethereum);
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const accounts = await web3.eth.getAccounts();
        userAccount = accounts[0];
        contract = new web3.eth.Contract(abi, contractAddress);
      } catch (error) {
        console.error("User denied account access");
      }
    } else {
      alert("Please install MetaMask!");
    }
  }
  
  window.onload = init;
  
  // Create fundraiser
  async function createFundraiser() {
    const name = document.getElementById("fundraiser-name").value;
    const moto = document.getElementById("fundraiser-moto").value;
    const goalAmount = web3.utils.toWei(document.getElementById("fundraiser-goal").value, 'ether');
    const recipient = document.getElementById("fundraiser-recipient").value;
  
    try {
      await contract.methods.createFundraiser(name, moto, goalAmount, recipient).send({ from: userAccount });
      alert("Fundraiser created successfully!");
    } catch (error) {
      console.error("Error creating fundraiser", error);
    }
  }
  
  // View fundraisers
  async function viewFundraisers() {
    const fundraiserCount = await contract.methods.fundraiserCount().call();
    let fundraisers = '';
    for (let i = 0; i <= fundraiserCount; i++) {
      const fundraiser = await contract.methods.fundraisers(i).call();
      fundraisers += `<p>Name: ${fundraiser.name} <br> Moto: ${fundraiser.moto} <br> Goal: ${web3.utils.fromWei(fundraiser.goalAmount, 'ether')} ETH <br> Raised: ${web3.utils.fromWei(fundraiser.amountRaised, 'ether')} ETH</p>`;
    }
    document.getElementById("fundraiser-list").innerHTML = fundraisers;
  }
  
  // Donate to a fundraiser
  async function donate() {
    const fundraiserId = document.getElementById("donation-id").value;
    const donationAmount = web3.utils.toWei(document.getElementById("donation-amount").value, 'ether');
    
    try {
      await contract.methods.donate(fundraiserId).send({ from: userAccount, value: donationAmount });
      alert("Donation successful!");
    } catch (error) {
      console.error("Error making donation", error);
    }
  }
  
  // Show transaction history
  async function showTransactions() {
    // This function can fetch transaction details from the smart contract and display them.
  }
  