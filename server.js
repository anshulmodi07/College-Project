import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Web3 from "web3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { parse as csvParse } from "csv-parse/sync"; // ✅ Correct ESM path
// Ensure you install this with: npm install csv-parse


// Define file storage config
const upload = multer({
  dest: 'uploads/', // Folder to save files (make sure this folder exists or create it)
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file limit (optional)
});


dotenv.config();
const contractAddress = process.env.CONTRACT_ADDRESS;
const privateKey = process.env.PRIVATE_KEY;
const infuraUrl = process.env.INFURA_URL;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Load ABI and contract address
const abi = JSON.parse(fs.readFileSync("./FundraiserABI", "utf-8"));

const web3 = new Web3(new Web3.providers.HttpProvider(process.env.INFURA_URL));

const contract = new web3.eth.Contract(abi, contractAddress);



// ===== YOUR EXISTING ENDPOINTS (PRESERVED) =====
app.post("/create-fundraiser", async (req, res) => {
  const { name, description, goal, creator } = req.body;

  try {
    const serialNumber = Math.floor(1000000000 + Math.random() * 9000000000);
    const tx = await contract.methods.createFundraiser(
      name,
      description,
      web3.utils.toWei(goal, "ether"),
      serialNumber
    ).send({ from: creator });

    res.json({ message: "Fundraiser created", serialNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/donate", async (req, res) => {
  const { serialNumber, amount, donor } = req.body;

  try {
    const tx = await contract.methods.donateToFundraiser(serialNumber)
      .send({ from: donor, value: web3.utils.toWei(amount, "ether") });

    res.json({ message: "Donation successful" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/fundraisers', async (req, res) => {
  try {
    const fundraisers = await contract.methods.getAllFundraisers().call();
    
    const fundraiserList = fundraisers.map(f => ({
      name: f.name,
      description: f.description,
      goal: f.goal.toString(),
      owner: f.owner,
      amountRaised: f.amountRaised.toString(),
      serial: f.serial.toString(),
    }));

    res.json(fundraiserList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== ADDED TRANSACTION ENDPOINTS =====
app.get('/api/transactions/:address', async (req, res) => {
  try {
    const address = req.params.address;
    
    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ error: "Invalid address format" });
    }

    const events = await contract.getPastEvents('DonationReceived', {
      filter: { donor: address },
      fromBlock: 0,
      toBlock: 'latest'
    });

    // Process events with fundraiser details
    const transactions = await Promise.all(
      events.map(async (event) => {
        const fundraiser = await contract.methods.getFundraiser(event.returnValues.id).call();
        return {
          txHash: event.transactionHash,
          amount: web3.utils.fromWei(event.returnValues.amount, 'ether'),
          blockNumber: event.blockNumber,
          fundraiser: {
            id: event.returnValues.id,
            name: fundraiser.name,
            owner: fundraiser.owner
          }
        };
      })
    );

    res.json({ transactions });
  } catch (error) {
    console.error("Transaction error:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// ===== YOUR MY PAGE ENDPOINT =====
app.get('/api/ngo-profile/:address', async (req, res) => {
  try {
    const ngoAddress = req.params.address;
    const fundraisers = await contract.methods.getFundraisersByOwner(ngoAddress).call();
    
    const processed = fundraisers.map(f => ({
      id: f.id.toString(),
      name: f.name,
      description: f.description,
      goal: f.goal.toString(),
      amountRaised: f.amountRaised.toString(),
      fundraiserType: f.fundraiserType,
      category: f.category,
      peopleAffected: f.peopleAffected.toString(),
      owner: f.owner
    }));
    
    res.json({ fundraisers: processed });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload-expense-report', upload.single('csvFile'), (req, res) => {
  const { fundraiserId, ngoAddress } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ success: false, error: "No file uploaded" });
  }

  console.log(`Received expense report for fundraiser ID ${fundraiserId} from ${ngoAddress}`);
  console.log(`Stored at: ${file.path}`);

  // TODO: You can now parse the CSV or just store it for ranking logic later

  res.json({ success: true, message: "File uploaded successfully" });
});


app.get('/api/public-rankings', async (req, res) => {
  try {
    const allFundraisers = await contract.methods.getAllFundraisers().call();

    const publicRankings = [];

    for (const f of allFundraisers) {
      if (f.fundraiserType !== 'public') continue;

      const received = parseFloat(web3.utils.fromWei(f.amountRaised));
      const csvPath = path.join(__dirname, 'uploads', `${f.serial}.csv`);

      if (!fs.existsSync(csvPath)) continue;

      const fileContent = fs.readFileSync(csvPath, 'utf-8');
      const records = csvParse(fileContent, {
        columns: true,
        skip_empty_lines: true
      });

      let totalSpent = 0;
      records.forEach(record => {
        totalSpent += 
          (parseFloat(record.relief_work || 0) +
           parseFloat(record.admin_expenses || 0) +
           parseFloat(record.fundraising || 0) +
           parseFloat(record.salaries || 0));
      });

      const efficiency = received > 0 ? ((totalSpent / received) * 100).toFixed(2) : "0.00";

      publicRankings.push({
        name: f.name,
        totalReceived: received.toFixed(2),
        totalSpent: totalSpent.toFixed(2),
        efficiency
      });
    }

    publicRankings.sort((a, b) => b.efficiency - a.efficiency);
    res.json(publicRankings);
  } catch (err) {
    console.error("Ranking error:", err);
    res.status(500).json({ error: "Failed to generate rankings" });
  }
});


const PORT = 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);

});
