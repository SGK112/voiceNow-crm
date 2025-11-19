import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

console.log('🗑️ DELETING Emma agent...\n');

try {
  await axios.delete(
    'https://api.elevenlabs.io/v1/convai/agents/agent_1401kadsbxczf28b34twm35wega7',
    { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY } }
  );
  console.log('✅ Emma deleted from ElevenLabs');
} catch (error) {
  console.log('Error deleting:', error.message);
}

// Unassign from phone
try {
  await axios.patch(
    'https://api.elevenlabs.io/v1/convai/phone-numbers/phnum_2701kacmjq23fzaacdgqwt0qty0b',
    { agent_id: null },
    { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' } }
  );
  console.log('✅ Phone number cleared');
} catch (error) {
  console.log('Error clearing phone:', error.message);
}

console.log('\n✅ Emma is GONE');
console.log('\nTell me EXACTLY what you want and I will build it from scratch.');
console.log('No more guessing. No more hallucinating.');
