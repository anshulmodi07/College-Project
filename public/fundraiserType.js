// Toggles the visibility of the form fields based on the fundraiser type
function toggleFields() {
    const type = document.getElementById("fundraiserType").value;
    const publicFields = document.getElementById("publicFields");
    const privateFields = document.getElementById("privateFields");
  
    // Display fields based on selection
    if (type === "public") {
        publicFields.style.display = "block";
        privateFields.style.display = "none";
    } else if (type === "private") {
        privateFields.style.display = "block";
        publicFields.style.display = "none";
    } else {
        publicFields.style.display = "none";
        privateFields.style.display = "none";
    }
  }
  
  // Handles the form submission logic
  function processForm() {
    const type = document.getElementById("fundraiserType").value;
    let estimatedBudget = 0;
  
    // Public fundraiser processing
    if (type === "public") {
        const disaster = document.getElementById("disaster").value;
        const peopleAffected = document.getElementById("peopleAffected").value;
  
        // Validate fields
        if (!disaster || !peopleAffected) {
            alert("Please fill all the fields.");
            return;
        }
  
        // Estimate budget based on number of people affected
        estimatedBudget = peopleAffected * 100; // Example budget calculation
  
    } else if (type === "private") {
        const disease = document.getElementById("disease").value;
        const severity = document.getElementById("severity").value;
  
        // Validate fields
        if (!disease || !severity) {
            alert("Please fill all the fields.");
            return;
        }
  
        // Estimate budget based on severity of disease
        switch (severity) {
            case "mild":
                estimatedBudget = 1000;
                break;
            case "moderate":
                estimatedBudget = 5000;
                break;
            case "severe":
                estimatedBudget = 10000;
                break;
            default:
                alert("Invalid severity.");
                return;
        }
    } else {
        alert("Please select Public or Private.");
        return;
    }
  
    // Proceed to connect to MetaMask and create the fundraiser
    connectToMetaMask(estimatedBudget);
  }
  
  // Connect to MetaMask and create the fundraiser
  async function connectToMetaMask(estimatedBudget) {
    if (typeof window.ethereum !== "undefined") {
        // Request account access from MetaMask
        const accounts = await ethereum.request({ method: "eth_requestAccounts" });
        const account = accounts[0];
        console.log(`Connected to MetaMask account: ${account}`);
  
        // Example: Create fundraiser with the estimated budget
        console.log(`Creating fundraiser with estimated budget: ${estimatedBudget}`);
  
        // Logic for interacting with the smart contract to create the fundraiser
        // Example contract interaction code (you need to adjust this based on your contract)
        // const contract = new web3.eth.Contract(abi, contractAddress);
        // contract.methods.createFundraiser(account, estimatedBudget).send({ from: account });
    } else {
        alert("Please install MetaMask.");
    }
  }