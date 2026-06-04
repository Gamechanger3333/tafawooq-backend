require('dotenv').config();
const mongoose = require('mongoose');
const Countries = require('./models/countriesModel');

const countries = [
  { name: "Afghanistan", code: "AF" },
  { name: "Albania", code: "AL" },
  { name: "Algeria", code: "DZ" },
  { name: "Argentina", code: "AR" },
  { name: "Australia", code: "AU" },
  { name: "Austria", code: "AT" },
  { name: "Bangladesh", code: "BD" },
  { name: "Belgium", code: "BE" },
  { name: "Brazil", code: "BR" },
  { name: "Canada", code: "CA" },
  { name: "China", code: "CN" },
  { name: "Denmark", code: "DK" },
  { name: "Egypt", code: "EG" },
  { name: "Finland", code: "FI" },
  { name: "France", code: "FR" },
  { name: "Germany", code: "DE" },
  { name: "Ghana", code: "GH" },
  { name: "Greece", code: "GR" },
  { name: "India", code: "IN" },
  { name: "Indonesia", code: "ID" },
  { name: "Iran", code: "IR" },
  { name: "Iraq", code: "IQ" },
  { name: "Ireland", code: "IE" },
  { name: "Italy", code: "IT" },
  { name: "Japan", code: "JP" },
  { name: "Jordan", code: "JO" },
  { name: "Kenya", code: "KE" },
  { name: "Kuwait", code: "KW" },
  { name: "Malaysia", code: "MY" },
  { name: "Mexico", code: "MX" },
  { name: "Morocco", code: "MA" },
  { name: "Netherlands", code: "NL" },
  { name: "New Zealand", code: "NZ" },
  { name: "Nigeria", code: "NG" },
  { name: "Norway", code: "NO" },
  { name: "Pakistan", code: "PK" },
  { name: "Philippines", code: "PH" },
  { name: "Poland", code: "PL" },
  { name: "Portugal", code: "PT" },
  { name: "Qatar", code: "QA" },
  { name: "Romania", code: "RO" },
  { name: "Russia", code: "RU" },
  { name: "Saudi Arabia", code: "SA" },
  { name: "Singapore", code: "SG" },
  { name: "South Africa", code: "ZA" },
  { name: "South Korea", code: "KR" },
  { name: "Spain", code: "ES" },
  { name: "Sri Lanka", code: "LK" },
  { name: "Sweden", code: "SE" },
  { name: "Switzerland", code: "CH" },
  { name: "Syria", code: "SY" },
  { name: "Thailand", code: "TH" },
  { name: "Tunisia", code: "TN" },
  { name: "Turkey", code: "TR" },
  { name: "UAE", code: "AE" },
  { name: "Uganda", code: "UG" },
  { name: "Ukraine", code: "UA" },
  { name: "United Kingdom", code: "GB" },
  { name: "United States", code: "US" },
  { name: "Vietnam", code: "VN" },
  { name: "Yemen", code: "YE" }
];

const seedCountries = async () => {
  try {
    await mongoose.connect(process.env.DATABASE);
    console.log('✅ Connected to MongoDB');

    let seeded = 0;
    let skipped = 0;

    for (const country of countries) {
      const exists = await Countries.findOne({ code: country.code.toUpperCase() });
      if (!exists) {
        await Countries.create({ name: country.name, code: country.code.toUpperCase() });
        seeded++;
        console.log(`  ➕ Added: ${country.name} (${country.code})`);
      } else {
        skipped++;
      }
    }

    console.log(`\n🚀 Seeding complete:`);
    console.log(`   ✅ Seeded : ${seeded}`);
    console.log(`   ⏭️  Skipped: ${skipped} (already existed)`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding countries:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

seedCountries();