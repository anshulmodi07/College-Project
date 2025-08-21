let contract;
let userAccount;

window.addEventListener('load', async () => {
    if (window.ethereum) {
        try {
            window.web3 = new Web3(window.ethereum);
            await ethereum.request({ method: 'eth_requestAccounts' });
            userAccount = (await web3.eth.getAccounts())[0];

            const contractAddress = '0x5471A5deF4df9deD209Bd4f2001C438AEcFAfE96';
            const response = await fetch('fundraiserABI.json');
            const abi = await response.json();
            contract = new web3.eth.Contract(abi, contractAddress);

            await loadFundraisers();
            setupFilterButtons();
            
        } catch (error) {
            console.error('Error:', error);
            document.getElementById('fundraiser-list').innerHTML = `
                <div class="error">Failed to connect: ${error.message}</div>
            `;
        }
    } else {
        alert('Please install MetaMask!');
    }
});

async function loadFundraisers() {
    const container = document.getElementById('fundraiser-list');
    container.innerHTML = '<div class="loading">Loading fundraisers...</div>';

    try {
        const fundraisers = await contract.methods.getAllFundraisers().call();
        container.innerHTML = '';

        fundraisers.forEach((fundraiser, index) => {
            const fundraiserDiv = document.createElement('div');
            fundraiserDiv.className = 'fundraiser';
            fundraiserDiv.dataset.type = fundraiser.fundraiserType;
            fundraiserDiv.dataset.id = fundraiser.id;  // Using actual fundraiser ID

            const raisedEth = web3.utils.fromWei(fundraiser.amountRaised, 'ether');
            const goalEth = web3.utils.fromWei(fundraiser.goal, 'ether');
            const progress = (raisedEth / goalEth * 100).toFixed(2);

            fundraiserDiv.innerHTML = `
                <h3>${fundraiser.name}</h3>
                <p>${fundraiser.description || ''}</p>
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${progress}%"></div>
                </div>
                <p>Raised: ${raisedEth} ETH / Goal: ${goalEth} ETH</p>
                <button class="donate-button" data-id="${fundraiser.id}">
                    Donate
                </button>
            `;
            container.appendChild(fundraiserDiv);
        });

        setupDonateButtons();

    } catch (error) {
        console.error('Error loading fundraisers:', error);
        container.innerHTML = `
            <div class="error">
                Failed to load fundraisers. 
                <button onclick="loadFundraisers()">Retry</button>
            </div>
        `;
    }
}

function setupFilterButtons() {
    document.getElementById('filter-all').addEventListener('click', () => {
        document.querySelectorAll('.fundraiser').forEach(el => {
            el.style.display = 'block';
        });
    });
    
    document.getElementById('filter-public').addEventListener('click', () => {
        filterFundraisers('public');
    });
    
    document.getElementById('filter-private').addEventListener('click', () => {
        filterFundraisers('private');
    });
}

function filterFundraisers(type) {
    document.querySelectorAll('.fundraiser').forEach(el => {
        el.style.display = el.dataset.type === type ? 'block' : 'none';
    });
}

function setupDonateButtons() {
    document.querySelectorAll('.donate-button').forEach(button => {
        button.addEventListener('click', async (e) => {
            const fundraiserId = e.target.dataset.id;
            const amount = prompt("Enter donation amount in ETH:");
            
            if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
                try {
                    const tx = await contract.methods.donate(fundraiserId).send({
                        from: userAccount,
                        value: web3.utils.toWei(amount, 'ether')
                    });
                    
                    alert(`Successfully donated ${amount} ETH!`);
                    await loadFundraisers(); // Refresh the list
                    
                } catch (error) {
                    console.error('Donation failed:', error);
                    alert(`Donation failed: ${error.message}`);
                }
            } else {
                alert('Please enter a valid amount');
            }
        });
    });
}

// Add this code to your existing JavaScript to handle the custom tab functionality
document.addEventListener('DOMContentLoaded', function() {
    // Handle tab navigation
    const tabLinks = document.querySelectorAll('.nav-tabs a');
    
    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all tabs
            tabLinks.forEach(el => el.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Hide all tab content
            const tabContents = document.querySelectorAll('.tab-pane');
            tabContents.forEach(tab => {
                tab.classList.remove('show');
                tab.classList.remove('active');
            });
            
            // Show the corresponding tab content
            const target = this.getAttribute('href').substring(1);
            const activeTabContent = document.getElementById(target);
            if (activeTabContent) {
                activeTabContent.classList.add('show');
                activeTabContent.classList.add('active');
            }
        });
    });
    
    // Apply custom styling to dynamically generated content
    const styleInterval = setInterval(() => {
        // Style the fundraiser cards once they're loaded
        const cards = document.querySelectorAll('.request-card');
        if (cards.length > 0) {
            cards.forEach(card => {
                // Make sure card has our styling
                if (!card.classList.contains('styled')) {
                    card.classList.add('styled');
                    
                    // Apply proper styling to buttons
                    const uploadBtn = card.querySelector('.upload-btn');
                    if (uploadBtn) {
                        uploadBtn.textContent = 'UPLOAD EXPENSES';
                        uploadBtn.classList.add('upload-expenses');
                    }
                    
                    const deleteBtn = card.querySelector('.delete-btn');
                    if (deleteBtn) {
                        deleteBtn.textContent = 'DELETE FUNDRAISER';
                        deleteBtn.classList.add('delete-fundraiser');
                    }
                    
                    // Style badges
                    const badges = card.querySelectorAll('.badge');
                    badges.forEach(badge => {
                        if (badge.textContent.trim().toLowerCase() === 'public') {
                            badge.classList.add('public');
                        }
                    });
                }
            });
            
            // If we found cards, we can stop checking
            if (cards.length > 0 && document.querySelector('.styled')) {
                clearInterval(styleInterval);
            }
        }
    }, 500); // Check every 500ms
    
    // Add animation effects
    document.querySelectorAll('.card').forEach(card => {
        card.classList.add('fade-in');
    });
});