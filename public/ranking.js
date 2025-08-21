const express = require('express');
const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');
const Fundraiser = require('../models/Fundraiser');

const router = express.Router();

router.get('/rankings', async (req, res) => {
  try {
    const publicFundraisers = await Fundraiser.find({ isPublic: true });

    const ngoStats = {}; // { wallet: { totalEfficiency, count } }

    for (const fundraiser of publicFundraisers) {
      const fundraiserId = fundraiser._id.toString();
      const creator = fundraiser.creator;
      const csvFilePath = path.join(__dirname, '..', 'uploads', `${fundraiserId}.csv`);

      if (!fs.existsSync(csvFilePath)) continue;

      // Read CSV and calculate total expenses
      const totalExpenses = await new Promise((resolve, reject) => {
        let sum = 0;
        fs.createReadStream(csvFilePath)
          .pipe(csvParser())
          .on('data', (row) => {
            const amount = parseFloat(row.Amount || row.amount || 0);
            if (!isNaN(amount)) sum += amount;
          })
          .on('end', () => resolve(sum))
          .on('error', reject);
      });

      if (totalExpenses === 0) continue;

      const efficiency = fundraiser.donationReceived / totalExpenses;

      if (!ngoStats[creator]) {
        ngoStats[creator] = { totalEfficiency: 0, count: 0 };
      }

      ngoStats[creator].totalEfficiency += efficiency;
      ngoStats[creator].count += 1;
    }

    // Calculate average efficiencies and sort descending
    const rankings = Object.entries(ngoStats)
      .map(([creator, data]) => ({
        creator,
        averageEfficiency: data.totalEfficiency / data.count,
      }))
      .sort((a, b) => b.averageEfficiency - a.averageEfficiency);

    res.json(rankings);
  } catch (err) {
    console.error('Ranking Error:', err);
    res.status(500).json({ error: 'Failed to generate rankings' });
  }
});

module.exports = router;
