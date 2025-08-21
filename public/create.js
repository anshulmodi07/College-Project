let contract;
let userAccount;

const publicCategories = ['flood', 'earthquake', 'drought'];
const privateCategories = ['cancer', 'heart disease'];

function updateCategoryOptions(type) {
    const categorySelect = document.getElementById('category');
    categorySelect.innerHTML = ''; // Clear existing options
    const categories = type === 'public' ? publicCategories : privateCategories;

    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
        categorySelect.appendChild(option);
    });
}

window.addEventListener('load', async () => {
    if (window.ethereum) {
        try {
            window.web3 = new Web3(window.ethereum);
            const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
            userAccount = accounts[0];
            document.getElementById('walletStatus').textContent =
                `Connected: ${userAccount.substring(0, 6)}...${userAccount.substring(38)}`;

            const response = await fetch('fundraiserABI.json');
            if (!response.ok) throw new Error("Failed to load ABI");
            const abi = await response.json();

            const contractAddress = '0x5471A5deF4df9deD209Bd4f2001C438AEcFAfE96';
            contract = new web3.eth.Contract(abi, contractAddress);

            // Populate category options initially
            const typeSelect = document.getElementById('fundraiserType');
            updateCategoryOptions(typeSelect.value);

            // Listen for changes in fundraiser type
            typeSelect.addEventListener('change', () => {
                updateCategoryOptions(typeSelect.value);
            });

        } catch (error) {
            console.error("Wallet connection error:", error);
            alert("Error connecting wallet: " + error.message);
        }
    } else {
        alert('Please install MetaMask!');
    }
});

document.getElementById('fundraiser-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const description = document.getElementById('description').value;
    const fundraiserType = document.getElementById('fundraiserType').value;
    const category = document.getElementById('category').value;
    const peopleAffected = parseInt(document.getElementById('peopleAffected').value);

    if (!name || !description || !category || !peopleAffected) {
        alert("Please fill all required fields");
        return;
    }

    const submitBtn = document.querySelector('#fundraiser-form button[type="submit"]');

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating...';

        const receipt = await contract.methods.createFundraiser(
            name,
            description,
            fundraiserType,
            category,
            peopleAffected
        ).send({ from: userAccount });

        console.log("Transaction receipt:", receipt);
        alert("Fundraiser created successfully!");
        window.location.href = 'mypage.html';

    } catch (err) {
        console.error("Create fundraiser error:", err);
        let errorMsg = "Error creating fundraiser";
        if (err.message.includes("user rejected")) {
            errorMsg = "Transaction was canceled";
        } else if (err.message.includes("gas")) {
            errorMsg = "Transaction failed (gas issue)";
        }
        alert(errorMsg);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Fundraiser';
    }
});
