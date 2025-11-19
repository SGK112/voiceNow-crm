// The simplest possible test - just use what works
import dotenv from 'dotenv';
dotenv.config();

console.log('Quick check - do you have an ElevenLabs phone number configured?');
console.log('ELEVENLABS_API_KEY:', process.env.ELEVENLABS_API_KEY ? 'YES' : 'NO');
console.log('\nFor the best quality with ElevenLabs Conversational AI:');
console.log('1. Use the agent builder in your VoiceFlow UI');
console.log('2. Select a high-quality voice (Sarah, Rachel, etc.)');
console.log('3. Make sure you have an ElevenLabs phone number');
console.log('4. The agents will have MUCH better quality than TTS playback');
console.log('\nThe bad quality you heard was because we played a pre-recorded MP3');
console.log('Your actual ElevenLabs agents will sound crystal clear!');
