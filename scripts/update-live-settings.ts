import { MongoClient } from 'mongodb';

const uri = 'mongodb+srv://Abubakar:fitthetic@cluster0.f4fpp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function updateLiveSettings() {
  console.log('Updating live settings in MongoDB Atlas...');
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('fit_thetic_gym');

  const settings = {
    id: 'sett-001',
    _id: 'sett-001',
    gym_name: 'Fit-thetic Fitness Club',
    owner_name: 'Dawood Janjua',
    phone: '03330538182',
    email: 'dawood@gmail.com',
    address: 'Royal Avenue, Meherban Colony, Chak Shahzad, Isb',
    receipt_footer: 'Fees is not refundable nor transferable.',
    whatsapp_reminders_enabled: true,
    reminder_settings: {
      d7: true,
      d3: true,
      d1: true,
      d0: true,
    },
    updated_at: new Date().toISOString(),
  };

  await db.collection('gym_settings').updateOne(
    { _id: 'sett-001' },
    { $set: settings },
    { upsert: true }
  );

  console.log('✅ Settings successfully updated in MongoDB Atlas:', settings);
  await client.close();
}

updateLiveSettings().catch(err => console.error(err));
