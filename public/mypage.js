let contract;
let userAccount;

async function init() {
    if (window.ethereum) {
        try {
            window.web3 = new Web3(window.ethereum); // Use directly
            await ethereum.request({ method: 'eth_requestAccounts' });

            const accounts = await web3.eth.getAccounts();
            userAccount = accounts[0];

            const walletDisplay = document.getElementById('walletAddress');
            if (walletDisplay) {
                walletDisplay.textContent = `${userAccount.substring(0, 6)}...${userAccount.substring(userAccount.length - 4)}`;
            }

            const abiResponse = await fetch('fundraiserABI.json');
            const abi = await abiResponse.json();
            const contractAddress = '0x5471A5deF4df9deD209Bd4f2001C438AEcFAfE96';
            contract = new web3.eth.Contract(abi, contractAddress.toLowerCase());

            await loadFundraisers();
        } catch (error) {
            console.error('Error:', error);
            alert('Error connecting to wallet');
        }
    } else {
        alert('Please install MetaMask!');
    }
}

async function loadFundraisers() {
    const activeContainer = document.getElementById('activeFundraisers');
    if (!activeContainer) return;

    activeContainer.innerHTML = '<p class="text-muted">Loading fundraisers...</p>';

    try {
        const response = await fetch(`http://localhost:5000/api/ngo-profile/${userAccount}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        displayFundraisers(data.fundraisers);
    } catch (error) {
        console.error('Error loading fundraisers:', error);
        activeContainer.innerHTML = `
            <div class="alert alert-danger">
                Failed to load fundraisers: ${error.message}
            </div>
        `;
    }
}

function displayFundraisers(fundraisers) {
    const activeContainer = document.getElementById('activeFundraisers');
    const completedContainer = document.getElementById('completedFundraisers');

    if (!activeContainer || !completedContainer) return;

    activeContainer.innerHTML = '';
    completedContainer.innerHTML = '';

    if (!fundraisers || fundraisers.length === 0) {
        activeContainer.innerHTML = '<p class="text-muted">No fundraisers found</p>';
        return;
    }

    fundraisers.forEach(fundraiser => {
        const raised = parseFloat(web3.utils.fromWei(fundraiser.amountRaised, 'ether'));
        const goal = parseFloat(web3.utils.fromWei(fundraiser.goal, 'ether'));
        const progress = goal > 0 ? (raised / goal) * 100 : 0;
        const isCompleted = raised >= goal;
        const isOwner = userAccount.toLowerCase() === fundraiser.owner.toLowerCase();
        const progressColor = progress >= 100 ? 'bg-success' : progress >= 50 ? 'bg-info' : 'bg-warning';

        const card = document.createElement('div');
        card.className = 'col-md-6';
        card.innerHTML = `
            <div class="card request-card">
                <div class="card-body">
                    <h5 class="card-title">${fundraiser.name}</h5>
                    <p class="card-text">${fundraiser.description}</p>
                    <div class="progress mb-3">
                        <div class="progress-bar ${progressColor}" role="progressbar" style="width: ${progress}%">
                            ${progress.toFixed(0)}%
                        </div>
                    </div>
                    <div class="d-flex justify-content-between mb-2">
                        <span>Raised: ${raised.toFixed(4)} ETH</span>
                        <span>Goal: ${goal.toFixed(4)} ETH</span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="badge bg-${fundraiser.fundraiserType === 'public' ? 'primary' : 'warning'}">
                            ${fundraiser.fundraiserType}
                        </span>
                        <div>
                                <button class="btn btn-sm btn-success upload-btn" data-id="${fundraiser.id}">
                                    Upload Expenses
                                </button>
                            ${isOwner ? `
                                <button class="btn btn-sm btn-danger delete-btn" data-id="${fundraiser.id}">
                                    Delete Fundraiser
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        (isCompleted ? completedContainer : activeContainer).appendChild(card);
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const fundraiserId = e.target.getAttribute('data-id');
            await deleteFundraiser(fundraiserId);
        });
    });

    document.querySelectorAll('.upload-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const fundraiserId = e.target.getAttribute('data-id');
            const idInput = document.getElementById('fundraiserId');
            if (idInput) idInput.value = fundraiserId;

            const modal = document.getElementById('csvModal');
            if (modal) new bootstrap.Modal(modal).show();
        });
    });
}

async function deleteFundraiser(fundraiserId) {
    try {
        await contract.methods.deleteFundraiser(fundraiserId).send({ from: userAccount });
        alert('Fundraiser deleted successfully!');
        await loadFundraisers();
    } catch (error) {
        console.error('Error deleting fundraiser:', error);
        alert('Error deleting fundraiser: ' + error.message);
    }
}

document.addEventListener('DOMContentLoaded', init);

const csvForm = document.getElementById('csvForm');
if (csvForm) {
    csvForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const file = document.getElementById('csvFile').files[0];
        const fundraiserId = document.getElementById('fundraiserId').value;

        if (!file) return alert('Please select a file');
        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            return alert('Only CSV files are allowed');
        }

        try {
            const expectedHeaders = ['name', 'total_received', 'relief_work', 'admin_expenses', 'fundraising', 'salaries'];
            const text = await file.text();
            const lines = text.trim().split('\n');
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

            const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
            if (missingHeaders.length > 0) {
                return alert(`Invalid CSV headers.\nMissing: ${missingHeaders.join(', ')}`);
            }

            const formData = new FormData();
            formData.append('csvFile', file);
            formData.append('fundraiserId', fundraiserId);
            formData.append('ngoAddress', userAccount);

            const response = await fetch('/api/upload-expense-report', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                alert('Expense report uploaded successfully!');
                bootstrap.Modal.getInstance(document.getElementById('csvModal')).hide();
                await loadFundraisers();
            } else {
                throw new Error(result.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Error uploading file: ' + error.message);
        }
    });
}
