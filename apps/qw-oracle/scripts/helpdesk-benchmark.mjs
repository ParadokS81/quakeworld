import { readFileSync } from 'fs';

const data = JSON.parse(readFileSync('output/helpdesk-sample.json', 'utf8'));

// Pick 10 diverse sessions
const picks = [1, 3, 5, 7, 10, 14, 18, 22, 25, 28];
for (const i of picks) {
  if (!data[i]) continue;
  const s = data[i];
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`Session #${s.session_id} | ${s.date} | ${s.chat_messages} msgs | ${s.participants.join(', ')}`);
  console.log('Questions:');
  s.questions.slice(0, 5).forEach(q => console.log(`  Q: ${q.substring(0, 140)}`));
  console.log('────────────────────────────────────────────────────────────────');
  const lines = s.chat_log.split('\n').slice(0, 40);
  lines.forEach(l => console.log(`  ${l}`));
  if (s.chat_log.split('\n').length > 40) {
    console.log(`  ... (${s.chat_log.split('\n').length - 40} more lines)`);
  }
  console.log('');
}
